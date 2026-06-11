package com.connectit.core.service;

import com.connectit.core.model.*;
import com.connectit.core.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.mail.internet.MimeMessage;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final NotificationQueueRepository queueRepo;
    private final EmailLogRepository          emailLogRepo;
    private final CompanyEmailConfigRepository configRepo;
    private final JavaMailSender              mailSender;
    private final com.connectit.core.repository.UserRepository userRepo;

    @Value("${app.mail.from:support@technosprint.net}")
    private String defaultFrom;

    @Value("${app.mail.from-name:Technosprint Support}")
    private String defaultFromName;

    private static final int[] RETRY_DELAYS_SECONDS = {60, 300, 900, 1800, 3600};

    // ── Enqueue ────────────────────────────────────────────────────────────────
    @Transactional
    public void enqueue(String eventType, Long ticketId, String ticketNumber,
                        String recipient, String subject, String bodyHtml) {
        queueRepo.save(NotificationQueue.builder()
            .eventType(eventType).ticketId(ticketId).ticketNumber(ticketNumber)
            .recipient(recipient).subject(subject).bodyHtml(bodyHtml)
            .status("pending").priority(3).retryCount(0).maxRetries(5)
            .build());
    }

    // ── Process queue (called by scheduler every 30s) ──────────────────────────
    @Transactional
    public void processQueue() {
        List<NotificationQueue> pending = queueRepo.findPendingToProcess(LocalDateTime.now());
        if (pending.isEmpty()) return;
        log.info("[EmailQueue] Processing {} queued emails...", pending.size());

        for (NotificationQueue job : pending) {
            job.setStatus("processing");
            queueRepo.save(job);
            try {
                sendMail(job.getRecipient(), job.getSubject(), job.getBodyHtml(), job.getTicketNumber());
                job.setStatus("sent");
                job.setProcessedAt(LocalDateTime.now());
                queueRepo.save(job);
                logEmail("outbound", job.getRecipient(), defaultFrom, job.getSubject(),
                    job.getTicketNumber(), job.getTicketId(), "sent", null, job.getEventType());
                log.info("[EmailQueue] ✓ Sent to {}", job.getRecipient());
            } catch (Exception e) {
                int retries = (job.getRetryCount() == null ? 0 : job.getRetryCount()) + 1;
                int delaySeconds = RETRY_DELAYS_SECONDS[Math.min(retries - 1, RETRY_DELAYS_SECONDS.length - 1)];
                job.setRetryCount(retries);
                job.setErrorMessage(e.getMessage());
                if (retries >= (job.getMaxRetries() == null ? 5 : job.getMaxRetries())) {
                    job.setStatus("failed");
                    logEmail("outbound", job.getRecipient(), defaultFrom, job.getSubject(),
                        job.getTicketNumber(), job.getTicketId(), "failed", e.getMessage(), job.getEventType());
                } else {
                    job.setStatus("retry");
                    job.setNextRetryAt(LocalDateTime.now().plusSeconds(delaySeconds));
                }
                queueRepo.save(job);
                log.error("[EmailQueue] ✗ Failed for {}: {} (retry {})", job.getRecipient(), e.getMessage(), retries);
            }
        }
    }

    // ── Direct send (for immediate notifications) ──────────────────────────────
    @Async
    public void sendAsync(String to, String subject, String html) {
        try { sendMail(to, subject, html, null); }
        catch (Exception e) { log.error("[Email] Async send failed: {}", e.getMessage()); }
    }

    // ── Ticket event templates ─────────────────────────────────────────────────
    public void notifyTicketCreated(Ticket t) {
        if (t.getCallerEmail() == null && !isEmail(t.getCaller())) return;
        String to = t.getCallerEmail() != null ? t.getCallerEmail() : t.getCaller();
        enqueue("ticket_created", t.getId(), t.getTicketNumber(), to,
            "[" + t.getTicketNumber() + "] Ticket Created Successfully",
            buildTemplate("Ticket Created", t.getTicketNumber(),
                "<p>Hello,</p><p>Your support ticket has been created successfully.</p>" + ticketTable(t) +
                "<p>Our team will review your request shortly.</p>", t.getTicketNumber()));
    }

    public void notifyStatusChanged(Ticket t, String oldStatus, String newStatus) {
        String to = t.getCallerEmail() != null ? t.getCallerEmail() : t.getCaller();
        if (!isEmail(to)) return;
        enqueue("status_changed", t.getId(), t.getTicketNumber(), to,
            "[" + t.getTicketNumber() + "] Status Updated: " + oldStatus + " → " + newStatus,
            buildTemplate("Ticket Status Updated", t.getTicketNumber(),
                "<p>Hello,</p><p>Your ticket status has been updated from <strong>" + oldStatus +
                "</strong> to <strong>" + newStatus + "</strong>.</p>" + ticketTable(t), t.getTicketNumber()));
    }

    public void notifyAssigned(Ticket t, String agentEmail, String agentName) {
        if (!isEmail(agentEmail)) return;
        enqueue("ticket_assigned", t.getId(), t.getTicketNumber(), agentEmail,
            "[" + t.getTicketNumber() + "] Ticket Assigned to " + agentName,
            buildTemplate("New Ticket Assigned", t.getTicketNumber(),
                "<p>Hello <strong>" + agentName + "</strong>,</p>" +
                "<p>A new ticket has been assigned to you.</p>" + ticketTable(t), t.getTicketNumber()));
    }

    public void notifyResolved(Ticket t) {
        String to = t.getCallerEmail() != null ? t.getCallerEmail() : t.getCaller();
        if (!isEmail(to)) return;
        enqueue("ticket_resolved", t.getId(), t.getTicketNumber(), to,
            "[" + t.getTicketNumber() + "] Ticket Resolved",
            buildTemplate("Ticket Resolved", t.getTicketNumber(),
                "<p>Hello,</p><p>Your ticket has been <strong style='color:#16a34a'>resolved</strong>.</p>" +
                ticketTable(t) + "<p>Reply to this email if you need further assistance.</p>", t.getTicketNumber()));
    }

    public void notifySlaWarning(Ticket t, int pct, String slaType) {
        if (t.getAssignedTo() == null) return;
        enqueue("sla_warning", t.getId(), t.getTicketNumber(), resolveAgentEmail(t),
            "⚠️ SLA Warning (" + pct + "%): [" + t.getTicketNumber() + "]",
            buildTemplate("SLA Warning", t.getTicketNumber(),
                "<div style='background:#fffbeb;border-left:4px solid #f59e0b;padding:12px;margin:16px 0'>" +
                "<strong>⚠️ SLA " + slaType + " is at " + pct + "% utilization. Action required.</strong></div>" +
                ticketTable(t), t.getTicketNumber()));
    }

    public void notifySlaBreached(Ticket t, String slaType) {
        String agentEmail = resolveAgentEmail(t);
        if (isEmail(agentEmail)) {
            enqueue("sla_breached", t.getId(), t.getTicketNumber(), agentEmail,
                "🚨 SLA BREACHED: [" + t.getTicketNumber() + "]",
                buildTemplate("SLA Breached", t.getTicketNumber(),
                    "<div style='background:#fee2e2;border-left:4px solid #dc2626;padding:12px;margin:16px 0'>" +
                    "<strong>🚨 SLA " + slaType + " has been BREACHED. Immediate escalation required.</strong></div>" +
                    ticketTable(t), t.getTicketNumber()));
        }
    }

    // ── Core send ──────────────────────────────────────────────────────────────
    private void sendMail(String to, String subject, String html, String ticketNumber) throws Exception {
        MimeMessage msg = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
        helper.setFrom(defaultFrom, defaultFromName);
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(html, true);
        if (ticketNumber != null) {
            msg.addHeader("X-Ticket-Number", ticketNumber);
        }
        mailSender.send(msg);
    }

    // ── Health ────────────────────────────────────────────────────────────────
    public Map<String,Object> getHealth() {
        List<CompanyEmailConfig> configs = configRepo.findByIsActiveTrueOrderByIsDefaultDescCompanyNameAsc();
        List<Object[]> stats = queueRepo.countByStatus();
        Map<String,Long> queueStats = new HashMap<>();
        stats.forEach(r -> queueStats.put((String)r[0], (Long)r[1]));
        return Map.of(
            "status",           "configured",
            "configurations",   configs.size(),
            "activeMailbox",    defaultFrom,
            "queue",            Map.of(
                "pending", queueStats.getOrDefault("pending",0L),
                "failed",  queueStats.getOrDefault("failed",0L),
                "sent",    queueStats.getOrDefault("sent",0L)
            )
        );
    }

    private void logEmail(String direction, String recipient, String sender, String subject,
                          String ticketNumber, Long ticketId, String status, String errorMsg, String emailType) {
        emailLogRepo.save(EmailLog.builder()
            .direction(direction).recipient(recipient).sender(sender).subject(subject)
            .ticketNumber(ticketNumber).ticketId(ticketId).status(status)
            .errorMessage(errorMsg).emailType(emailType)
            .sentAt("outbound".equals(direction) ? LocalDateTime.now() : null)
            .build());
    }

    private boolean isEmail(String s) { return s != null && s.contains("@"); }

    private String resolveAgentEmail(Ticket t) {
        if (t.getAssignedTo() == null) return "";
        // Look up the user's actual email from the database using their UID
        return userRepo.findByUid(t.getAssignedTo())
            .map(com.connectit.core.model.User::getEmail)
            .orElse(t.getAssignedTo()); // Fall back to assignedTo if user not found (might already be an email)
    }

    private String ticketTable(Ticket t) {
        return "<table style='width:100%;border-collapse:collapse;font-size:13px;margin:16px 0'>" +
            row("Ticket #",    t.getTicketNumber()) +
            row("Title",       t.getTitle()) +
            row("Status",      t.getStatus()) +
            row("Priority",    t.getPriority()) +
            row("Assigned To", t.getAssignedToName() != null ? t.getAssignedToName() : "Unassigned") +
            row("Category",    t.getCategory() != null ? t.getCategory() : "—") +
            "</table>";
    }

    private String row(String label, String value) {
        return "<tr><td style='padding:6px 12px;color:#555;font-weight:600;width:35%'>" + label +
               "</td><td style='padding:6px 12px'>" + (value != null ? value : "—") + "</td></tr>";
    }

    private String buildTemplate(String title, String ticketNumber, String body, String tn) {
        String footer = tn != null ? "Reply with [" + tn + "] in the subject to update your ticket." :
            "This is an automated message from Ticklora ITSM.";
        return "<!DOCTYPE html><html><body style='margin:0;padding:0;font-family:Segoe UI,Arial,sans-serif;background:#f4f6f9'>" +
            "<div style='max-width:640px;margin:20px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)'>" +
            "<div style='background:linear-gradient(135deg,#1a1a2e,#16213e);padding:28px 32px;color:#fff'>" +
            "<h1 style='margin:0;font-size:20px'>🎫 " + title + "</h1>" +
            "<div style='color:#94a3b8;font-size:13px;margin-top:4px'>Ticklora ITSM Platform</div></div>" +
            "<div style='padding:32px'>" + body + "</div>" +
            "<div style='padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center'>" +
            footer + "</div></div></body></html>";
    }
}
