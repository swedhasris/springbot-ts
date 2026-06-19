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
import org.springframework.jdbc.core.JdbcTemplate;
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
    private final JdbcTemplate                 jdbcTemplate;

    @Value("${app.mail.from:info@technosprint.net}")
    private String defaultFrom;

    @Value("${app.mail.from-name:Manage My Desk Support}")
    private String defaultFromName;

    @Value("${spring.mail.host:smtp.office365.com}")
    private String smtpHost;

    @Value("${spring.mail.port:587}")
    private Integer smtpPort;

    @Value("${app.imap.host:outlook.office365.com}")
    private String imapHost;

    @Value("${app.imap.port:993}")
    private Integer imapPort;

    @Value("${spring.mail.username:info@technosprint.net}")
    private String smtpUser;

    @Value("${spring.mail.password:}")
    private String smtpPassword;

    private static final int[] RETRY_DELAYS_SECONDS = {60, 300, 900, 1800, 3600};

    // ── Enqueue ────────────────────────────────────────────────────────────────
    @Transactional
    public void enqueue(String eventType, Long ticketId, String ticketNumber,
                        String recipient, String subject, String bodyHtml, String metadataJson) {
        queueRepo.save(NotificationQueue.builder()
            .eventType(eventType).ticketId(ticketId).ticketNumber(ticketNumber)
            .recipient(recipient).subject(subject).bodyHtml(bodyHtml)
            .status("pending").priority(3).retryCount(0).maxRetries(3)
            .metadataJson(metadataJson)
            .build());

        // Track pending email log immediately
        logEmail("outbound", recipient, defaultFrom, subject,
            ticketNumber, ticketId, "pending", null, eventType, null, null, null);
    }

    @Transactional
    public void enqueue(String eventType, Long ticketId, String ticketNumber,
                        String recipient, String subject, String bodyHtml) {
        enqueue(eventType, ticketId, ticketNumber, recipient, subject, bodyHtml, null);
    }

    private void updateEmailLog(String direction, String recipient, String sender, String subject,
                                String ticketNumber, Long ticketId, String status, String errorMsg, String emailType,
                                String messageId, String inReplyTo, String referencesHeader) {
        List<EmailLog> pendingLogs = emailLogRepo.findByTicketIdAndRecipientAndEmailTypeAndStatus(
            ticketId, recipient, emailType, "pending"
        );
        if (!pendingLogs.isEmpty()) {
            EmailLog logEntry = pendingLogs.get(0);
            logEntry.setSender(sender);
            logEntry.setSubject(subject);
            logEntry.setStatus(status);
            logEntry.setErrorMessage(errorMsg);
            logEntry.setMessageId(messageId);
            logEntry.setInReplyTo(inReplyTo);
            logEntry.setReferencesHeader(referencesHeader);
            if ("sent".equals(status)) {
                logEntry.setSentAt(LocalDateTime.now());
            }
            emailLogRepo.save(logEntry);
        } else {
            logEmail(direction, recipient, sender, subject, ticketNumber, ticketId, status, errorMsg, emailType, messageId, inReplyTo, referencesHeader);
        }
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
            
            CompanyEmailConfig cfg = getConfigForTicket(job.getTicketId());
            // All outbound emails are sent from the centralized company email (info@technosprint.net)
            String fromAddress = defaultFrom;
            
            try {
                String inReplyTo = null;
                String references = null;
                if (job.getMetadataJson() != null && !job.getMetadataJson().isBlank()) {
                    try {
                        var map = new com.fasterxml.jackson.databind.ObjectMapper().readValue(job.getMetadataJson(), Map.class);
                        inReplyTo = (String) map.get("inReplyTo");
                        references = (String) map.get("references");
                    } catch (Exception ignored) {}
                }

                String sentMessageId = sendMail(cfg, job.getRecipient(), job.getSubject(), job.getBodyHtml(), job.getTicketNumber(), inReplyTo, references);
                job.setStatus("sent");
                job.setProcessedAt(LocalDateTime.now());
                queueRepo.save(job);
                updateEmailLog("outbound", job.getRecipient(), fromAddress, job.getSubject(),
                    job.getTicketNumber(), job.getTicketId(), "sent", null, job.getEventType(), sentMessageId, inReplyTo, references);
                log.info("[EmailQueue] ✓ Sent to {}", job.getRecipient());
            } catch (Exception e) {
                int retries = (job.getRetryCount() == null ? 0 : job.getRetryCount()) + 1;
                int delaySeconds = RETRY_DELAYS_SECONDS[Math.min(retries - 1, RETRY_DELAYS_SECONDS.length - 1)];
                job.setRetryCount(retries);
                job.setErrorMessage(e.getMessage());
                if (retries >= (job.getMaxRetries() == null ? 3 : job.getMaxRetries())) {
                    job.setStatus("failed");
                    updateEmailLog("outbound", job.getRecipient(), fromAddress, job.getSubject(),
                        job.getTicketNumber(), job.getTicketId(), "failed", e.getMessage(), job.getEventType(), null, null, null);
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

    // ── Recipient Resolution & Formatting Helpers ─────────────────────────────
    public String formatTicketNumber(String num) {
        if (num == null) return "";
        if (num.startsWith("INC") && num.length() > 3 && num.charAt(3) != '-') {
            return "INC-" + num.substring(3);
        }
        return num;
    }

    public Set<String> resolveRecipients(Ticket t, List<String> targetRoles, boolean includeAgent, boolean includeCreator, boolean includeGroupMembers) {
        Set<String> emails = new HashSet<>();

        // 1. Admin roles
        if (targetRoles != null && !targetRoles.isEmpty()) {
            List<User> admins = userRepo.findByRoleInAndIsActiveTrue(targetRoles);
            for (User u : admins) {
                if (isEmail(u.getEmail())) {
                    emails.add(u.getEmail().trim().toLowerCase());
                }
            }
        }

        // 2. Assigned Agent
        if (includeAgent && t.getAssignedTo() != null) {
            String agentEmail = resolveAgentEmail(t);
            if (isEmail(agentEmail)) {
                emails.add(agentEmail.trim().toLowerCase());
            }
        }

        // 3. Ticket Creator / Caller
        if (includeCreator) {
            String caller = t.getCallerEmail() != null ? t.getCallerEmail() : t.getCaller();
            if (isEmail(caller)) {
                emails.add(caller.trim().toLowerCase());
            }
            if (t.getCreatedBy() != null) {
                String creatorEmail = t.getCreatedBy();
                if (!isEmail(creatorEmail)) {
                    creatorEmail = userRepo.findByUid(t.getCreatedBy())
                        .map(User::getEmail)
                        .orElse(null);
                }
                if (isEmail(creatorEmail)) {
                    emails.add(creatorEmail.trim().toLowerCase());
                }
            }
        }

        // 4. Group Members
        if (includeGroupMembers && t.getAssignmentGroup() != null && !t.getAssignmentGroup().isBlank()) {
            try {
                List<String> groupEmails = jdbcTemplate.queryForList(
                    "SELECT DISTINCT m.user_email FROM settings_group_members m " +
                    "JOIN settings_groups g ON m.group_id = g.id " +
                    "WHERE g.name = ? AND m.status = 'active'", String.class, t.getAssignmentGroup());
                for (String email : groupEmails) {
                    if (isEmail(email)) {
                        emails.add(email.trim().toLowerCase());
                    }
                }
            } catch (Exception e) {
                log.error("[Email] Failed to fetch group members for group '{}': {}", t.getAssignmentGroup(), e.getMessage());
            }
        }

        // 5. Watch List (Watchers)
        if (t.getWatchList() != null && !t.getWatchList().isBlank()) {
            String[] watchers = t.getWatchList().split(",");
            for (String w : watchers) {
                String trimmed = w.trim().toLowerCase();
                if (isEmail(trimmed)) {
                    emails.add(trimmed);
                }
            }
        }

        return emails;
    }

    // ── Ticket event templates ─────────────────────────────────────────────────
    public void notifyTicketCreated(Ticket t) {
        Set<String> recipients = resolveRecipients(t, 
            List.of("admin", "super_admin", "ultra_super_admin", "sub_admin"), 
            true, // includeAgent
            true, // includeCreator
            true  // includeGroupMembers
        );

        String ticketNum = formatTicketNumber(t.getTicketNumber());
        String subject = "[Ticket Created] " + ticketNum + " - " + t.getTitle();
        
        String createdDate = t.getCreatedAt() != null ? 
            t.getCreatedAt().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")) : 
            LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        
        String bodyText = 
            "<p>Hello,</p>" +
            "<p>A new ticket has been created.</p>" +
            "<p><strong>Ticket Number:</strong> " + ticketNum + "</p>" +
            "<p><strong>Short Description:</strong><br/>" + t.getTitle() + "</p>" +
            "<p><strong>Created By:</strong> " + (t.getCreatedByName() != null ? t.getCreatedByName() : t.getCreatedBy()) + "</p>" +
            "<p><strong>Assigned To:</strong> " + (t.getAssignedToName() != null ? t.getAssignedToName() : "Unassigned") + "</p>" +
            "<p><strong>Priority:</strong> " + t.getPriority() + "</p>" +
            "<p><strong>Category:</strong> " + (t.getCategory() != null ? t.getCategory() : "—") + "</p>" +
            "<p><strong>Status:</strong> " + t.getStatus() + "</p>" +
            "<p><strong>Created Date:</strong> " + createdDate + "</p>" +
            "<p>Please log in to the system for complete details.</p>" +
            "<p>Regards,<br/>Manage My Desk Ticketing System</p>";

        String htmlContent = buildTemplate("Ticket Created", ticketNum, bodyText, t.getTicketNumber());

        for (String recipient : recipients) {
            enqueue("ticket_created", t.getId(), t.getTicketNumber(), recipient, subject, htmlContent);
        }
    }

    public void notifyAssigned(Ticket t, String assignedBy) {
        Set<String> recipients = resolveRecipients(t, 
            List.of("admin", "super_admin", "ultra_super_admin", "sub_admin"), 
            true, // includeAgent
            true, // includeCreator
            true  // includeGroupMembers
        );

        String ticketNum = formatTicketNumber(t.getTicketNumber());
        String subject = "[Ticket Assigned] " + ticketNum;
        
        String bodyText = 
            "<p>Hello,</p>" +
            "<p><strong>Ticket Assignment Update</strong></p>" +
            "<p><strong>Ticket Number:</strong> " + ticketNum + "</p>" +
            "<p><strong>Assigned By:</strong> " + (assignedBy != null ? assignedBy : "System") + "</p>" +
            "<p><strong>Assigned To:</strong> " + (t.getAssignedToName() != null ? t.getAssignedToName() : "Unassigned") + "</p>" +
            "<p><strong>Short Description:</strong><br/>" + t.getTitle() + "</p>" +
            "<p><strong>Status:</strong> " + t.getStatus() + "</p>" +
            "<p>Please log in to review the ticket.</p>" +
            "<p>Regards,<br/>Manage My Desk Ticketing System</p>";

        String htmlContent = buildTemplate("Ticket Assigned", ticketNum, bodyText, t.getTicketNumber());

        for (String recipient : recipients) {
            enqueue("ticket_assigned", t.getId(), t.getTicketNumber(), recipient, subject, htmlContent);
        }
    }

    public void notifyStatusChanged(Ticket t, String oldStatus, String newStatus, String updatedByName) {
        Set<String> recipients = resolveRecipients(t, 
            List.of("admin", "super_admin", "ultra_super_admin", "sub_admin"), 
            true, // includeAgent
            true, // includeCreator
            true  // includeGroupMembers
        );

        String ticketNum = formatTicketNumber(t.getTicketNumber());
        String subject = "[Status Updated] " + ticketNum;
        
        String updateTime = LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));

        String bodyText = 
            "<p>Hello,</p>" +
            "<p><strong>Ticket Status Update</strong></p>" +
            "<p><strong>Ticket Number:</strong> " + ticketNum + "</p>" +
            "<p><strong>Short Description:</strong><br/>" + t.getTitle() + "</p>" +
            "<p><strong>Previous Status:</strong> " + oldStatus + "</p>" +
            "<p><strong>New Status:</strong> " + newStatus + "</p>" +
            "<p><strong>Updated By:</strong> " + (updatedByName != null ? updatedByName : "System") + "</p>" +
            "<p><strong>Date & Time:</strong> " + updateTime + "</p>" +
            "<p>Please log in to the system for complete details.</p>" +
            "<p>Regards,<br/>Manage My Desk Ticketing System</p>";

        String htmlContent = buildTemplate("Ticket Status Updated", ticketNum, bodyText, t.getTicketNumber());

        for (String recipient : recipients) {
            enqueue("status_changed", t.getId(), t.getTicketNumber(), recipient, subject, htmlContent);
        }
    }

    public void notifyResolved(Ticket t, String resolvedBy) {
        Set<String> recipients = resolveRecipients(t, 
            List.of("admin", "super_admin", "ultra_super_admin", "sub_admin"), 
            true, // includeAgent
            true, // includeCreator
            true  // includeGroupMembers
        );

        String ticketNum = formatTicketNumber(t.getTicketNumber());
        String subject = "[Status Updated] " + ticketNum;
        String updateTime = LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));

        String bodyText = 
            "<p>Hello,</p>" +
            "<p><strong>Ticket Resolved</strong></p>" +
            "<p><strong>Ticket Number:</strong> " + ticketNum + "</p>" +
            "<p><strong>Short Description:</strong><br/>" + t.getTitle() + "</p>" +
            "<p><strong>Resolved By:</strong> " + (resolvedBy != null ? resolvedBy : "System") + "</p>" +
            "<p><strong>Resolution Notes:</strong><br/>" + (t.getResolutionNotes() != null ? t.getResolutionNotes() : "—") + "</p>" +
            "<p><strong>Status:</strong> Resolved</p>" +
            "<p><strong>Date & Time:</strong> " + updateTime + "</p>" +
            "<p>Please log in to review the resolution details.</p>" +
            "<p>Regards,<br/>Manage My Desk Ticketing System</p>";

        String htmlContent = buildTemplate("Ticket Resolved", ticketNum, bodyText, t.getTicketNumber());

        for (String recipient : recipients) {
            enqueue("ticket_resolved", t.getId(), t.getTicketNumber(), recipient, subject, htmlContent);
        }
    }

    public void notifyClosed(Ticket t, String closedBy) {
        Set<String> recipients = resolveRecipients(t, 
            List.of("admin", "super_admin", "ultra_super_admin", "sub_admin"), 
            true, // includeAgent
            true, // includeCreator
            true  // includeGroupMembers
        );

        String ticketNum = formatTicketNumber(t.getTicketNumber());
        String subject = "[Status Updated] " + ticketNum;
        String updateTime = LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));

        String bodyText = 
            "<p>Hello,</p>" +
            "<p><strong>Ticket Closed</strong></p>" +
            "<p><strong>Ticket Number:</strong> " + ticketNum + "</p>" +
            "<p><strong>Short Description:</strong><br/>" + t.getTitle() + "</p>" +
            "<p><strong>Closed By:</strong> " + (closedBy != null ? closedBy : "System") + "</p>" +
            "<p><strong>Status:</strong> Closed</p>" +
            "<p><strong>Date & Time:</strong> " + updateTime + "</p>" +
            "<p>Regards,<br/>Manage My Desk Ticketing System</p>";

        String htmlContent = buildTemplate("Ticket Closed", ticketNum, bodyText, t.getTicketNumber());

        for (String recipient : recipients) {
            enqueue("ticket_closed", t.getId(), t.getTicketNumber(), recipient, subject, htmlContent);
        }
    }

    public void notifyReopened(Ticket t, String reopenedBy) {
        Set<String> recipients = resolveRecipients(t, 
            List.of("admin", "super_admin", "ultra_super_admin", "sub_admin"), 
            true, // includeAgent
            true, // includeCreator
            true  // includeGroupMembers
        );

        String ticketNum = formatTicketNumber(t.getTicketNumber());
        String subject = "[Status Updated] " + ticketNum;
        String updateTime = LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));

        String bodyText = 
            "<p>Hello,</p>" +
            "<p><strong>Ticket Reopened</strong></p>" +
            "<p><strong>Ticket Number:</strong> " + ticketNum + "</p>" +
            "<p><strong>Short Description:</strong><br/>" + t.getTitle() + "</p>" +
            "<p><strong>Reopened By:</strong> " + (reopenedBy != null ? reopenedBy : "System") + "</p>" +
            "<p><strong>Status:</strong> Reopened</p>" +
            "<p><strong>Date & Time:</strong> " + updateTime + "</p>" +
            "<p>Please log in to review the ticket.</p>" +
            "<p>Regards,<br/>Manage My Desk Ticketing System</p>";

        String htmlContent = buildTemplate("Ticket Reopened", ticketNum, bodyText, t.getTicketNumber());

        for (String recipient : recipients) {
            enqueue("ticket_reopened", t.getId(), t.getTicketNumber(), recipient, subject, htmlContent);
        }
    }

    public void notifyUpdated(Ticket t, String updatedBy, List<String> changes) {
        Set<String> recipients = resolveRecipients(t, 
            List.of("admin", "super_admin", "ultra_super_admin", "sub_admin"), 
            true, // includeAgent
            true, // includeCreator
            true  // includeGroupMembers
        );

        String ticketNum = formatTicketNumber(t.getTicketNumber());
        String subject = "[Ticket Updated] " + ticketNum;
        String updateTime = LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));

        StringBuilder changesHtml = new StringBuilder();
        for (String c : changes) {
            changesHtml.append("<li style='margin-bottom:8px;'>").append(c).append("</li>");
        }

        String bodyText = 
            "<p>Hello,</p>" +
            "<p>A ticket has been updated.</p>" +
            "<p><strong>Ticket Number:</strong> " + ticketNum + "</p>" +
            "<p><strong>Short Description:</strong><br/>" + t.getTitle() + "</p>" +
            "<p><strong>Updated By:</strong> " + (updatedBy != null ? updatedBy : "System") + "</p>" +
            "<p><strong>Date & Time:</strong> " + updateTime + "</p>" +
            "<p><strong>Changes:</strong></p>" +
            "<ul style='padding-left:20px;margin:16px 0;'>" + changesHtml.toString() + "</ul>" +
            "<p>Please log in to the system for complete details.</p>" +
            "<p>Regards,<br/>Manage My Desk Ticketing System</p>";

        String htmlContent = buildTemplate("Ticket Updated", ticketNum, bodyText, t.getTicketNumber());

        for (String recipient : recipients) {
            enqueue("ticket_updated", t.getId(), t.getTicketNumber(), recipient, subject, htmlContent);
        }
    }

    public void notifyCommentAdded(Ticket t, TicketActivity a) {
        Set<String> recipients = resolveRecipients(t, 
            List.of("admin", "super_admin", "ultra_super_admin", "sub_admin"), 
            true, // includeAgent
            true, // includeCreator
            true  // includeGroupMembers
        );

        // Exclude comment author
        String creatorEmail = a.getCreatedBy();
        if (creatorEmail != null) {
            if (!isEmail(creatorEmail)) {
                creatorEmail = userRepo.findByUid(creatorEmail)
                    .map(User::getEmail)
                    .orElse(null);
            }
            if (creatorEmail != null) {
                recipients.remove(creatorEmail.trim().toLowerCase());
            }
        }

        String ticketNum = formatTicketNumber(t.getTicketNumber());
        String subject = "[New Update] " + ticketNum;
        String formattedTime = LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));

        String bodyText = 
            "<p>Hello,</p>" +
            "<p><strong>Ticket Comment Update</strong></p>" +
            "<p><strong>Ticket Number:</strong> " + ticketNum + "</p>" +
            "<p><strong>Short Description:</strong><br/>" + t.getTitle() + "</p>" +
            "<p><strong>Comment Author:</strong> " + a.getCreatedByName() + "</p>" +
            "<p><strong>Comment Time:</strong> " + formattedTime + "</p>" +
            "<p><strong>Comment:</strong></p>" +
            "<div style='padding:12px;background:#f8fafc;border-left:4px solid #1e293b;margin:16px 0;white-space:pre-wrap;'>" +
            a.getMessage() + "</div>" +
            "<p>Please log in to review the ticket.</p>" +
            "<p>Regards,<br/>Manage My Desk Ticketing System</p>";

        String htmlContent = buildTemplate("Ticket Comment Added", ticketNum, bodyText, t.getTicketNumber());

        // Reference headers
        List<EmailLog> logs = emailLogRepo.findByTicketIdOrderByCreatedAtDesc(t.getId()).stream()
            .filter(l -> l.getMessageId() != null && !l.getMessageId().isBlank())
            .toList();
        String inReplyTo = null;
        String references = null;
        if (!logs.isEmpty()) {
            EmailLog lastLog = logs.get(0);
            inReplyTo = lastLog.getMessageId();
            references = (lastLog.getReferencesHeader() != null ? lastLog.getReferencesHeader() + " " : "") +
                         (lastLog.getMessageId() != null ? lastLog.getMessageId() : "");
            references = references.trim();
        }

        String metaJson = null;
        if ((inReplyTo != null && !inReplyTo.isBlank()) || (references != null && !references.isBlank())) {
            try {
                Map<String, String> metaMap = new HashMap<>();
                if (inReplyTo != null && !inReplyTo.isBlank()) metaMap.put("inReplyTo", inReplyTo);
                if (references != null && !references.isBlank()) metaMap.put("references", references);
                metaJson = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(metaMap);
            } catch (Exception ignored) {}
        }

        for (String recipient : recipients) {
            enqueue("ticket_comment", t.getId(), t.getTicketNumber(), recipient, subject, htmlContent, metaJson);
        }
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

    public void notifyApprovalRequested(Ticket t, String approverEmail, String approverName) {
        if (!isEmail(approverEmail)) return;
        enqueue("approval_requested", t.getId(), t.getTicketNumber(), approverEmail,
            "[" + t.getTicketNumber() + "] Approval Required: " + t.getTitle(),
            buildTemplate("Approval Requested", t.getTicketNumber(),
                "<p>Hello <strong>" + approverName + "</strong>,</p>" +
                "<p>Your approval is required for support ticket <strong>" + t.getTicketNumber() + "</strong>.</p>" +
                ticketTable(t) +
                "<p>Please review and take action in the portal.</p>", t.getTicketNumber()));
    }

    public void notifyEscalated(Ticket t, String managerEmail, String managerName, String reason) {
        if (!isEmail(managerEmail)) return;
        enqueue("ticket_escalated", t.getId(), t.getTicketNumber(), managerEmail,
            "🚨 Escalation: [" + t.getTicketNumber() + "] " + t.getTitle(),
            buildTemplate("Ticket Escalated", t.getTicketNumber(),
                "<div style='background:#fee2e2;border-left:4px solid #dc2626;padding:12px;margin:16px 0'>" +
                "<strong>🚨 Ticket has been escalated.</strong><br/>Reason: " + (reason != null ? reason : "Priority Escalation") + "</div>" +
                ticketTable(t), t.getTicketNumber()));
    }

    // ── Core send ──────────────────────────────────────────────────────────────
    public CompanyEmailConfig getActiveConfig() {
        return configRepo.findFirstByIsActiveTrueAndIsDefaultTrue()
            .or(() -> configRepo.findFirstByIsActiveTrue())
            .orElse(null);
    }

    @Value("${graph.tenant-id:}")
    private String graphTenantId;

    @Value("${graph.client-id:}")
    private String graphClientId;

    @Value("${graph.client-secret:}")
    private String graphClientSecret;

    @Value("${graph.user-email:info@technosprint.net}")
    private String graphUserEmail;

    private boolean isOffice365Host(String host) {
        return host != null && (
            host.contains("office365.com") ||
            host.contains("outlook.com") ||
            host.contains("microsoft.com")
        );
    }

    private String getOAuth2AccessToken() throws Exception {
        String tokenUrl = "https://login.microsoftonline.com/" + graphTenantId + "/oauth2/v2.0/token";
        String body = "client_id=" + java.net.URLEncoder.encode(graphClientId, java.nio.charset.StandardCharsets.UTF_8)
            + "&client_secret=" + java.net.URLEncoder.encode(graphClientSecret, java.nio.charset.StandardCharsets.UTF_8)
            + "&scope=" + java.net.URLEncoder.encode("https://outlook.office365.com/.default", java.nio.charset.StandardCharsets.UTF_8)
            + "&grant_type=client_credentials";

        java.net.http.HttpClient client = java.net.http.HttpClient.newHttpClient();
        java.net.http.HttpRequest request = java.net.http.HttpRequest.newBuilder()
            .uri(java.net.URI.create(tokenUrl))
            .header("Content-Type", "application/x-www-form-urlencoded")
            .POST(java.net.http.HttpRequest.BodyPublishers.ofString(body))
            .build();

        java.net.http.HttpResponse<String> response = client.send(request, java.net.http.HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new RuntimeException("OAuth2 token failed: " + response.body());
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> tokenResp = new com.fasterxml.jackson.databind.ObjectMapper().readValue(response.body(), Map.class);
        return (String) tokenResp.get("access_token");
    }

    private JavaMailSender getActiveMailSender(CompanyEmailConfig cfg) {
        String host = cfg != null ? cfg.getSmtpHost() : smtpHost;
        int port = cfg != null ? (cfg.getSmtpPort() != null ? cfg.getSmtpPort() : 587) : (smtpPort != null ? smtpPort : 587);
        String username = cfg != null ? cfg.getSmtpUser() : smtpUser;
        String password = cfg != null ? cfg.getSmtpPass() : smtpPassword;

        JavaMailSenderImpl impl = new JavaMailSenderImpl();
        impl.setHost(host);
        impl.setPort(port);

        boolean useOAuth = false; // Disable OAuth for SMTP as client credentials are not supported for SMTP AUTH XOAUTH2
        if (useOAuth) {
            try {
                String token = getOAuth2AccessToken();
                impl.setUsername(username);
                impl.setPassword(token);

                Properties props = impl.getJavaMailProperties();
                props.put("mail.transport.protocol", "smtp");
                props.put("mail.smtp.auth", "true");
                props.put("mail.smtp.auth.mechanisms", "XOAUTH2");
                props.put("mail.smtp.auth.login.disable", "true");
                props.put("mail.smtp.auth.plain.disable", "true");
                props.put("mail.smtp.starttls.enable", "true");
                props.put("mail.debug", "false");
                props.put("mail.smtp.ssl.trust", host);
                log.info("[Email] Using OAuth2 XOAUTH2 for SMTP to {}", host);
            } catch (Exception e) {
                log.error("[Email] OAuth2 token failed, falling back to basic auth: {}", e.getMessage());
                impl.setUsername(username);
                impl.setPassword(password);
                Properties props = impl.getJavaMailProperties();
                props.put("mail.transport.protocol", "smtp");
                props.put("mail.smtp.auth", "true");
                props.put("mail.smtp.starttls.enable", "true");
                props.put("mail.debug", "false");
                props.put("mail.smtp.ssl.trust", host);
            }
        } else {
            impl.setUsername(username);
            impl.setPassword(password);

            Properties props = impl.getJavaMailProperties();
            props.put("mail.transport.protocol", "smtp");
            props.put("mail.smtp.auth", "true");
            props.put("mail.smtp.starttls.enable", "true");
            props.put("mail.debug", "false");
            props.put("mail.smtp.ssl.trust", host);
        }
        return impl;
    }

    public CompanyEmailConfig getConfigForTicket(Long ticketId) {
        if (ticketId != null) {
            try {
                Long companyId = jdbcTemplate.queryForObject(
                    "SELECT company_id FROM tickets WHERE id = ?", Long.class, ticketId);
                if (companyId != null) {
                    Long configId = jdbcTemplate.queryForObject(
                        "SELECT email_integration_id FROM companies WHERE id = ?", Long.class, companyId);
                    if (configId != null) {
                        return configRepo.findById(configId)
                            .orElseGet(this::getActiveConfig);
                    }
                }
            } catch (Exception ignored) {}
        }
        return getActiveConfig();
    }

    private String sendMail(CompanyEmailConfig cfg, String to, String subject, String html, String ticketNumber, String inReplyTo, String references) throws Exception {
        // Check if Microsoft Graph API outbound email sending is configured
        boolean graphConfigured = graphTenantId != null && !graphTenantId.isBlank()
            && graphClientId != null && !graphClientId.isBlank()
            && graphClientSecret != null && !graphClientSecret.isBlank();

        if (graphConfigured) {
            log.info("[GraphAPI] Attempting outbound email send via Microsoft Graph API for user: {}", graphUserEmail);
            try {
                String messageId = sendMailViaGraphInternal(to, subject, html, ticketNumber, inReplyTo, references);
                log.info("[GraphAPI] Outbound success. Sender: {}, Recipient: {}, Message-ID: {}", graphUserEmail, to, messageId);
                return messageId;
            } catch (Exception e) {
                log.error("[GraphAPI] Outbound failed, falling back to SMTP. Error: {}", e.getMessage(), e);
            }
        }

        // ═══════════════════════════════════════════════════════════════════════
        // CRITICAL: ALL outbound emails MUST be sent from info@technosprint.net
        // We ALWAYS use the default Spring Mail sender (configured in application.properties)
        // and NEVER use employee/company-specific SMTP configs for outbound mail.
        // Company configs are used for INBOUND polling only.
        // ═══════════════════════════════════════════════════════════════════════
        JavaMailSender activeSender = getActiveMailSender(null); // Force default sender
        MimeMessage msg = activeSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
        
        // Always use the centralized company email as sender
        String fromAddress = defaultFrom;       // info@technosprint.net
        String fromName = defaultFromName;      // TechnoSprint Support

        helper.setFrom(fromAddress, fromName);
        helper.setReplyTo(fromAddress, fromName);
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(html, true);
        if (ticketNumber != null) {
            msg.addHeader("X-Ticket-Number", ticketNumber);
        }
        
        // Generate Message-ID using the company domain
        String cleanDomain = "technosprint.net";
        String messageId = "<" + UUID.randomUUID().toString() + "@" + cleanDomain + ">";
        msg.setHeader("Message-ID", messageId);
        
        if (inReplyTo != null && !inReplyTo.isBlank()) {
            msg.setHeader("In-Reply-To", inReplyTo);
        }
        if (references != null && !references.isBlank()) {
            msg.setHeader("References", references);
        }
        
        log.info("[SMTP] Outbound attempt. Sender: {}, Recipient: {}, Subject: {}", fromAddress, to, subject);
        try {
            activeSender.send(msg);
            log.info("[SMTP] Outbound success. Sender: {}, Recipient: {}, Message-ID: {}, SMTP Response: 250 OK", fromAddress, to, messageId);
        } catch (Exception e) {
            String errorMsg = e.getMessage() != null ? e.getMessage() : e.getClass().getName();
            boolean isNonExistent = errorMsg.contains("550") || 
                                    errorMsg.toLowerCase().contains("does not exist") || 
                                    errorMsg.toLowerCase().contains("user unknown") || 
                                    errorMsg.toLowerCase().contains("mailbox unavailable") ||
                                    errorMsg.toLowerCase().contains("invalid address") ||
                                    errorMsg.toLowerCase().contains("recipient");
            if (isNonExistent) {
                log.error("[SMTP] DELIVERY FAILURE - Recipient mailbox does not exist. Sender: {}, Recipient: {}, SMTP Error: {}", fromAddress, to, errorMsg);
            } else {
                log.error("[SMTP] DELIVERY FAILURE - General failure. Sender: {}, Recipient: {}, SMTP Error: {}", fromAddress, to, errorMsg);
            }
            throw e;
        }
        return messageId;
    }

    private String sendMail(String to, String subject, String html, String ticketNumber, String inReplyTo, String references) throws Exception {
        return sendMail(getActiveConfig(), to, subject, html, ticketNumber, inReplyTo, references);
    }

    private void sendMail(String to, String subject, String html, String ticketNumber) throws Exception {
        sendMail(getActiveConfig(), to, subject, html, ticketNumber, null, null);
    }

    private String checkSocket(String host, Integer port) {
        if (host == null || host.isBlank() || port == null) {
            return "error: not configured";
        }
        try (java.net.Socket socket = new java.net.Socket()) {
            socket.connect(new java.net.InetSocketAddress(host, port), 2000);
            return "online";
        } catch (Exception e) {
            return "error: " + e.getMessage();
        }
    }

    // ── Health ────────────────────────────────────────────────────────────────
    public Map<String,Object> getHealth() {
        List<CompanyEmailConfig> configs = configRepo.findByIsActiveTrueOrderByIsDefaultDescCompanyNameAsc();
        List<Object[]> stats = queueRepo.countByStatus();
        Map<String,Long> queueStats = new HashMap<>();
        stats.forEach(r -> queueStats.put((String)r[0], (Long)r[1]));
        
        CompanyEmailConfig activeCfg = getActiveConfig();
        String activeMailbox = activeCfg != null ? activeCfg.getEmailAddress() : defaultFrom;

        // Socket checks
        String activeSmtpHost = activeCfg != null ? activeCfg.getSmtpHost() : smtpHost;
        Integer activeSmtpPort = activeCfg != null ? activeCfg.getSmtpPort() : smtpPort;
        String activeImapHost = activeCfg != null ? activeCfg.getImapHost() : imapHost;
        Integer activeImapPort = activeCfg != null ? activeCfg.getImapPort() : imapPort;

        String smtpStatus = checkSocket(activeSmtpHost, activeSmtpPort != null ? activeSmtpPort : 587);
        String imapStatus = checkSocket(activeImapHost, activeImapPort != null ? activeImapPort : 993);

        // DB stats query
        LocalDateTime lastSync = null;
        try {
            lastSync = jdbcTemplate.queryForObject(
                "SELECT MAX(received_at) FROM email_logs WHERE direction = 'inbound'", LocalDateTime.class);
        } catch (Exception ignored) {}

        long sentEmails = 0;
        try {
            sentEmails = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM email_logs WHERE direction = 'outbound' AND status = 'sent'", Long.class);
        } catch (Exception ignored) {}

        long receivedEmails = 0;
        try {
            receivedEmails = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM email_logs WHERE direction = 'inbound' AND status = 'success'", Long.class);
        } catch (Exception ignored) {}

        long failedEmails = 0;
        try {
            failedEmails = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM email_logs WHERE status = 'failed'", Long.class);
        } catch (Exception ignored) {}

        Map<String, Object> healthMap = new HashMap<>();
        healthMap.put("status", "configured");
        healthMap.put("configurations", configs.size());
        healthMap.put("activeMailbox", activeMailbox);
        healthMap.put("smtpStatus", smtpStatus);
        healthMap.put("imapStatus", imapStatus);
        healthMap.put("lastSync", lastSync);
        healthMap.put("sentEmails", sentEmails);
        healthMap.put("receivedEmails", receivedEmails);
        healthMap.put("failedEmails", failedEmails);
        healthMap.put("queue", Map.of(
            "pending", queueStats.getOrDefault("pending", 0L),
            "failed", queueStats.getOrDefault("failed", 0L),
            "sent", queueStats.getOrDefault("sent", 0L)
        ));
        
        return healthMap;
    }

    private void logEmail(String direction, String recipient, String sender, String subject,
                          String ticketNumber, Long ticketId, String status, String errorMsg, String emailType) {
        logEmail(direction, recipient, sender, subject, ticketNumber, ticketId, status, errorMsg, emailType, null, null, null);
    }

    private void logEmail(String direction, String recipient, String sender, String subject,
                          String ticketNumber, Long ticketId, String status, String errorMsg, String emailType,
                          String messageId, String inReplyTo, String referencesHeader) {
        emailLogRepo.save(EmailLog.builder()
            .direction(direction).recipient(recipient).sender(sender).subject(subject)
            .ticketNumber(ticketNumber).ticketId(ticketId).status(status)
            .errorMessage(errorMsg).emailType(emailType)
            .messageId(messageId).inReplyTo(inReplyTo).referencesHeader(referencesHeader)
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

    public String buildTemplate(String title, String ticketNumber, String body, String tn) {
        String footer = tn != null ? "Reply with [" + tn + "] in the subject to update your ticket." :
            "This is an automated message from Manage My Desk Ticketing System.";
        return "<!DOCTYPE html><html><body style='margin:0;padding:0;font-family:Segoe UI,Arial,sans-serif;background:#f4f6f9'>" +
            "<div style='max-width:640px;margin:20px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)'>" +
            "<div style='background:linear-gradient(135deg,#1e3a8a,#172554);padding:28px 32px;color:#fff'>" +
            "<img src='http://localhost:3000/manage_my_desk_logo.jpg' alt='Manage My Desk Logo' style='height:40px;margin-bottom:12px;display:block;' />" +
            "<h1 style='margin:0;font-size:20px'>🎫 " + title + "</h1>" +
            "<div style='color:#94a3b8;font-size:13px;margin-top:4px'>Manage My Desk Support</div></div>" +
            "<div style='padding:32px;color:#334155;line-height:1.6;font-size:14px;'>" + body + "</div>" +
            "<div style='padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center'>" +
            footer + "</div></div></body></html>";
    }

    private String sendMailViaGraphInternal(String to, String subject, String html, String ticketNumber, String inReplyTo, String references) throws Exception {
        String accessToken = getGraphAccessTokenForSending();
        String userEmail = graphUserEmail != null && !graphUserEmail.isBlank() ? graphUserEmail : defaultFrom;
        
        String url = "https://graph.microsoft.com/v1.0/users/" + java.net.URLEncoder.encode(userEmail, java.nio.charset.StandardCharsets.UTF_8) + "/sendMail";
        
        // Generate Message-ID
        String cleanDomain = "technosprint.net";
        String messageId = "<" + UUID.randomUUID().toString() + "@" + cleanDomain + ">";

        // Construct JSON Payload
        Map<String, Object> payload = new HashMap<>();
        Map<String, Object> message = new HashMap<>();

        message.put("subject", subject);

        Map<String, String> body = new HashMap<>();
        body.put("contentType", "HTML");
        body.put("content", html);
        message.put("body", body);

        List<Map<String, Object>> toRecipients = new ArrayList<>();
        Map<String, Object> recipient = new HashMap<>();
        Map<String, String> emailAddress = new HashMap<>();
        emailAddress.put("address", to);
        recipient.put("emailAddress", emailAddress);
        toRecipients.add(recipient);
        message.put("toRecipients", toRecipients);

        List<Map<String, String>> headersList = new ArrayList<>();

        if (ticketNumber != null) {
            Map<String, String> header = new HashMap<>();
            header.put("name", "X-Ticket-Number");
            header.put("value", ticketNumber);
            headersList.add(header);
        }

        if (inReplyTo != null && !inReplyTo.isBlank()) {
            Map<String, String> header = new HashMap<>();
            header.put("name", "X-In-Reply-To");
            header.put("value", inReplyTo);
            headersList.add(header);
        }

        if (references != null && !references.isBlank()) {
            Map<String, String> header = new HashMap<>();
            header.put("name", "X-References");
            header.put("value", references);
            headersList.add(header);
        }

        Map<String, String> msgIdHeader = new HashMap<>();
        msgIdHeader.put("name", "X-Message-ID");
        msgIdHeader.put("value", messageId);
        headersList.add(msgIdHeader);

        message.put("internetMessageHeaders", headersList);
        payload.put("message", message);
        payload.put("saveToSentItems", "true");

        String jsonPayload = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(payload);

        java.net.http.HttpClient client = java.net.http.HttpClient.newHttpClient();
        java.net.http.HttpRequest request = java.net.http.HttpRequest.newBuilder()
            .uri(java.net.URI.create(url))
            .header("Authorization", "Bearer " + accessToken)
            .header("Content-Type", "application/json")
            .POST(java.net.http.HttpRequest.BodyPublishers.ofString(jsonPayload))
            .build();

        java.net.http.HttpResponse<String> response = client.send(request, java.net.http.HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new RuntimeException("Microsoft Graph API sendMail failed (HTTP " + response.statusCode() + "): " + response.body());
        }

        return messageId;
    }

    private String getGraphAccessTokenForSending() throws Exception {
        if (graphTenantId == null || graphTenantId.isBlank()
            || graphClientId == null || graphClientId.isBlank()
            || graphClientSecret == null || graphClientSecret.isBlank()) {
            throw new IllegalStateException("Microsoft Graph OAuth2 credentials (tenant-id, client-id, client-secret) are not configured");
        }

        String tokenUrl = "https://login.microsoftonline.com/" + graphTenantId + "/oauth2/v2.0/token";
        String body = "client_id=" + java.net.URLEncoder.encode(graphClientId, java.nio.charset.StandardCharsets.UTF_8)
            + "&client_secret=" + java.net.URLEncoder.encode(graphClientSecret, java.nio.charset.StandardCharsets.UTF_8)
            + "&scope=" + java.net.URLEncoder.encode("https://graph.microsoft.com/.default", java.nio.charset.StandardCharsets.UTF_8)
            + "&grant_type=client_credentials";

        java.net.http.HttpClient client = java.net.http.HttpClient.newHttpClient();
        java.net.http.HttpRequest request = java.net.http.HttpRequest.newBuilder()
            .uri(java.net.URI.create(tokenUrl))
            .header("Content-Type", "application/x-www-form-urlencoded")
            .POST(java.net.http.HttpRequest.BodyPublishers.ofString(body))
            .build();

        java.net.http.HttpResponse<String> response = client.send(request, java.net.http.HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new RuntimeException("OAuth2 token request failed (HTTP " + response.statusCode() + "): " + response.body());
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> tokenResponse = new com.fasterxml.jackson.databind.ObjectMapper().readValue(response.body(), Map.class);
        String accessToken = (String) tokenResponse.get("access_token");
        if (accessToken == null || accessToken.isBlank()) {
            throw new RuntimeException("No access_token in OAuth2 response");
        }

        return accessToken;
    }
}
