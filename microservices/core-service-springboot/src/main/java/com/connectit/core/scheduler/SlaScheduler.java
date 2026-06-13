package com.connectit.core.scheduler;

import com.connectit.core.model.*;
import com.connectit.core.repository.*;
import com.connectit.core.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class SlaScheduler {

    private final TicketRepository        ticketRepo;
    private final TicketActivityRepository activityRepo;
    private final SLABreachRepository     breachRepo;
    private final EmailService            emailService;

    /** Process email queue every 30 seconds */
    @Scheduled(fixedDelay = 30_000)
    public void processEmailQueue() {
        try { emailService.processQueue(); }
        catch (Exception e) { log.error("[EmailQueue] Error: {}", e.getMessage()); }
    }

    /** Escalate stale tickets every 15 minutes */
    @Scheduled(cron = "${sla.escalation.cron:0 */15 * * * *}")
    @Transactional
    public void escalateStaleTickets() {
        log.info("[SLA] Escalation check running...");
        LocalDateTime now = LocalDateTime.now();
        List<Ticket> tickets = ticketRepo.findAllNonClosed();

        for (Ticket t : tickets) {
            // Safety guard: skip any resolved/closed/canceled tickets
            if (List.of("Resolved","Closed","Canceled").contains(t.getStatus())) continue;
            if (List.of("On Hold","Waiting for Customer").contains(t.getStatus())) continue;

            boolean changed = false;

            // Response SLA
            if (t.getResponseDeadline() != null
                && !"Breached".equals(t.getResponseSlaStatus())
                && !"Completed".equals(t.getResponseSlaStatus())) {

                // If first response already given, mark Completed and move on
                if (t.getFirstResponseAt() != null) {
                    t.setResponseSlaStatus("Completed");
                    changed = true;
                } else {
                    long deadline  = toEpoch(t.getResponseDeadline());
                    long createdAt = toEpoch(t.getCreatedAt());
                    long diff      = deadline - now.toEpochSecond(java.time.ZoneOffset.UTC) * 1000;
                    long totalWin  = deadline - createdAt;

                    if (diff <= 0) {
                        t.setResponseSlaStatus("Breached");
                        changed = true;
                        log("sla_triggered","Response SLA BREACHED", t);
                        emailService.notifySlaBreached(t, "Response");
                        recordBreach(t, "Response SLA");
                    } else if (totalWin > 0 && diff < totalWin * 0.2 && !"At Risk".equals(t.getResponseSlaStatus())) {
                        t.setResponseSlaStatus("At Risk");
                        changed = true;
                        int pct = (int) Math.round(((double)(totalWin - diff) / totalWin) * 100);
                        emailService.notifySlaWarning(t, pct, "Response");
                    }
                }
            }

            // Resolution SLA
            if (t.getResolutionDeadline() != null && t.getResolvedAt() == null
                && !"Breached".equals(t.getResolutionSlaStatus())
                && !"Completed".equals(t.getResolutionSlaStatus())) {

                long deadline  = toEpoch(t.getResolutionDeadline());
                long createdAt = toEpoch(t.getCreatedAt());
                long diff      = deadline - now.toEpochSecond(java.time.ZoneOffset.UTC) * 1000;
                long totalWin  = deadline - createdAt;

                if (diff <= 0) {
                    t.setResolutionSlaStatus("Breached");
                    t.setPriority("1 - Critical");
                    changed = true;
                    log("sla_triggered","Resolution SLA BREACHED: Ticket escalated to Critical", t);
                    emailService.notifySlaBreached(t, "Resolution");
                    recordBreach(t, "Resolution SLA");
                } else if (totalWin > 0 && diff < totalWin * 0.2 && !"At Risk".equals(t.getResolutionSlaStatus())) {
                    t.setResolutionSlaStatus("At Risk");
                    changed = true;
                    int pct = (int) Math.round(((double)(totalWin - diff) / totalWin) * 100);
                    emailService.notifySlaWarning(t, pct, "Resolution");
                }
            }

            if (changed) ticketRepo.save(t);
        }
    }

    /** Full breach monitor every hour */
    @Scheduled(cron = "${sla.breach.monitor.cron:0 0 * * * *}")
    @Transactional
    public void monitorBreaches() {
        log.info("[SLA] Breach monitor running...");
        LocalDateTime now = LocalDateTime.now();
        // Additional monitoring logic beyond the 15-minute escalation
        ticketRepo.findAllNonClosed().stream()
            .filter(t -> !List.of("Resolved","Closed","Canceled").contains(t.getStatus()))
            .filter(t -> t.getResolutionDeadline() != null && now.isAfter(t.getResolutionDeadline())
                && !"Breached".equals(t.getResolutionSlaStatus()))
            .forEach(t -> {
                t.setResolutionSlaStatus("Breached");
                ticketRepo.save(t);
                recordBreach(t, "Resolution SLA");
            });
    }

    private void log(String type, String msg, Ticket t) {
        activityRepo.save(TicketActivity.builder()
            .ticketId(t.getId()).activityType(type).visibilityType("internal")
            .createdBy("SLA Engine").createdByName("SLA Engine")
            .message(msg).channel("system").build());
    }

    private void recordBreach(Ticket t, String slaName) {
        boolean exists = breachRepo.existsByRecordIdAndSlaName(String.valueOf(t.getId()), slaName);
        if (!exists) {
            breachRepo.save(SLABreach.builder()
                .recordId(String.valueOf(t.getId()))
                .recordType("Ticket")
                .assignedUser(t.getAssignedTo() != null ? t.getAssignedTo() : "unassigned")
                .assignedUserName(t.getAssignedToName() != null ? t.getAssignedToName() : "Unassigned")
                .slaName(slaName)
                .status("active")
                .breachTimestamp(LocalDateTime.now().toString())
                .build());
        }
    }

    private long toEpoch(LocalDateTime dt) {
        return dt.toEpochSecond(java.time.ZoneOffset.UTC) * 1000;
    }
}
