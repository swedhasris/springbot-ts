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

    @Value("${app.mail.from:support@technosprint.net}")
    private String defaultFrom;

    @Value("${app.mail.from-name:Technosprint Support}")
    private String defaultFromName;

    @Value("${spring.mail.host:smtp.office365.com}")
    private String smtpHost;

    @Value("${spring.mail.port:587}")
    private Integer smtpPort;

    @Value("${app.imap.host:outlook.office365.com}")
    private String imapHost;

    @Value("${app.imap.port:993}")
    private Integer imapPort;

    private static final int[] RETRY_DELAYS_SECONDS = {60, 300, 900, 1800, 3600};

    // ── Enqueue ────────────────────────────────────────────────────────────────
    @Transactional
    public void enqueue(String eventType, Long ticketId, String ticketNumber,
                        String recipient, String subject, String bodyHtml, String metadataJson) {
        queueRepo.save(NotificationQueue.builder()
            .eventType(eventType).ticketId(ticketId).ticketNumber(ticketNumber)
            .recipient(recipient).subject(subject).bodyHtml(bodyHtml)
            .status("pending").priority(3).retryCount(0).maxRetries(5)
            .metadataJson(metadataJson)
            .build());
    }

    @Transactional
    public void enqueue(String eventType, Long ticketId, String ticketNumber,
                        String recipient, String subject, String bodyHtml) {
        enqueue(eventType, ticketId, ticketNumber, recipient, subject, bodyHtml, null);
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
            String fromAddress = cfg != null ? cfg.getEmailAddress() : defaultFrom;
            
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
                logEmail("outbound", job.getRecipient(), fromAddress, job.getSubject(),
                    job.getTicketNumber(), job.getTicketId(), "sent", null, job.getEventType(), sentMessageId, inReplyTo, references);
                log.info("[EmailQueue] ✓ Sent to {}", job.getRecipient());
            } catch (Exception e) {
                int retries = (job.getRetryCount() == null ? 0 : job.getRetryCount()) + 1;
                int delaySeconds = RETRY_DELAYS_SECONDS[Math.min(retries - 1, RETRY_DELAYS_SECONDS.length - 1)];
                job.setRetryCount(retries);
                job.setErrorMessage(e.getMessage());
                if (retries >= (job.getMaxRetries() == null ? 5 : job.getMaxRetries())) {
                    job.setStatus("failed");
                    logEmail("outbound", job.getRecipient(), fromAddress, job.getSubject(),
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

    public void notifyReassigned(Ticket t, String agentEmail, String agentName, String oldAgentName) {
        if (!isEmail(agentEmail)) return;
        enqueue("ticket_reassigned", t.getId(), t.getTicketNumber(), agentEmail,
            "[" + t.getTicketNumber() + "] Ticket Reassigned to " + agentName,
            buildTemplate("Ticket Reassigned", t.getTicketNumber(),
                "<p>Hello <strong>" + agentName + "</strong>,</p>" +
                "<p>A ticket has been reassigned to you from <strong>" + (oldAgentName != null ? oldAgentName : "Unassigned") + "</strong>.</p>" +
                ticketTable(t), t.getTicketNumber()));
    }

    public void notifyClosed(Ticket t) {
        String to = t.getCallerEmail() != null ? t.getCallerEmail() : t.getCaller();
        if (!isEmail(to)) return;
        enqueue("ticket_closed", t.getId(), t.getTicketNumber(), to,
            "[" + t.getTicketNumber() + "] Ticket Closed",
            buildTemplate("Ticket Closed", t.getTicketNumber(),
                "<p>Hello,</p><p>Your ticket has been <strong style='color:#475569'>closed</strong>.</p>" +
                ticketTable(t) + "<p>If you have further questions, please contact support.</p>", t.getTicketNumber()));
    }

    public void notifyReopened(Ticket t) {
        // Notify caller
        String caller = t.getCallerEmail() != null ? t.getCallerEmail() : t.getCaller();
        if (isEmail(caller)) {
            enqueue("ticket_reopened", t.getId(), t.getTicketNumber(), caller,
                "[" + t.getTicketNumber() + "] Ticket Reopened",
                buildTemplate("Ticket Reopened", t.getTicketNumber(),
                    "<p>Hello,</p><p>Your ticket has been reopened.</p>" +
                    ticketTable(t), t.getTicketNumber()));
        }
        // Notify assigned agent if any
        String agentEmail = resolveAgentEmail(t);
        if (isEmail(agentEmail)) {
            enqueue("ticket_reopened", t.getId(), t.getTicketNumber(), agentEmail,
                "[" + t.getTicketNumber() + "] Ticket Reopened (Assigned to you)",
                buildTemplate("Ticket Reopened", t.getTicketNumber(),
                    "<p>Hello,</p><p>A ticket assigned to you has been reopened by the caller.</p>" +
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
        if (cfg != null) {
            JavaMailSenderImpl impl = new JavaMailSenderImpl();
            impl.setHost(cfg.getSmtpHost());
            impl.setPort(cfg.getSmtpPort() != null ? cfg.getSmtpPort() : 587);
            boolean useOAuth = isOffice365Host(cfg.getSmtpHost());
            if (useOAuth) {
                try {
                    String token = getOAuth2AccessToken();
                    impl.setUsername(cfg.getSmtpUser());
                    impl.setPassword(token);

                    Properties props = impl.getJavaMailProperties();
                    props.put("mail.transport.protocol", "smtp");
                    props.put("mail.smtp.auth", "true");
                    props.put("mail.smtp.auth.mechanisms", "XOAUTH2");
                    props.put("mail.smtp.auth.login.disable", "true");
                    props.put("mail.smtp.auth.plain.disable", "true");
                    props.put("mail.smtp.starttls.enable", "true");
                    props.put("mail.debug", "false");
                    props.put("mail.smtp.ssl.trust", cfg.getSmtpHost());
                    log.info("[Email] Using OAuth2 XOAUTH2 for SMTP to {}", cfg.getSmtpHost());
                } catch (Exception e) {
                    log.error("[Email] OAuth2 token failed, falling back to basic auth: {}", e.getMessage());
                    impl.setUsername(cfg.getSmtpUser());
                    impl.setPassword(cfg.getSmtpPass());
                    Properties props = impl.getJavaMailProperties();
                    props.put("mail.transport.protocol", "smtp");
                    props.put("mail.smtp.auth", "true");
                    props.put("mail.smtp.starttls.enable", "true");
                    props.put("mail.debug", "false");
                    props.put("mail.smtp.ssl.trust", cfg.getSmtpHost());
                }
            } else {
                impl.setUsername(cfg.getSmtpUser());
                impl.setPassword(cfg.getSmtpPass());

                Properties props = impl.getJavaMailProperties();
                props.put("mail.transport.protocol", "smtp");
                props.put("mail.smtp.auth", "true");
                props.put("mail.smtp.starttls.enable", "true");
                props.put("mail.debug", "false");
                props.put("mail.smtp.ssl.trust", cfg.getSmtpHost());
            }
            
            return impl;
        }
        return mailSender;
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
                            .filter(cfg -> Boolean.TRUE.equals(cfg.getIsActive()))
                            .orElseGet(this::getActiveConfig);
                    }
                }
            } catch (Exception ignored) {}
        }
        return getActiveConfig();
    }

    private String sendMail(CompanyEmailConfig cfg, String to, String subject, String html, String ticketNumber, String inReplyTo, String references) throws Exception {
        JavaMailSender activeSender = getActiveMailSender(cfg);
        MimeMessage msg = activeSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
        
        String fromAddress = (cfg != null && cfg.getEmailAddress() != null && !cfg.getEmailAddress().isBlank())
            ? cfg.getEmailAddress()
            : defaultFrom;
        String fromName = (cfg != null && cfg.getCompanyName() != null && !cfg.getCompanyName().isBlank())
            ? cfg.getCompanyName() + " Support"
            : defaultFromName;

        // Validation Rules:
        // - Sender email must come from Email Integration settings.
        // - Sender email must not come from ticket caller.
        // - Sender email must not come from company contact email.
        // - Sender email must not come from requestor email.
        if (ticketNumber != null) {
            try {
                Map<String, Object> ticketInfo = jdbcTemplate.queryForMap(
                    "SELECT t.caller_email, c.email as company_email, t.created_by " +
                    "FROM tickets t " +
                    "LEFT JOIN companies c ON t.company_id = c.id " +
                    "WHERE t.ticket_number = ?", ticketNumber);
                
                String callerEmail = (String) ticketInfo.get("caller_email");
                String companyEmail = (String) ticketInfo.get("company_email");
                String requestor = (String) ticketInfo.get("created_by");
                
                if (fromAddress != null) {
                    boolean matchesCaller = fromAddress.equalsIgnoreCase(callerEmail);
                    boolean matchesCompany = fromAddress.equalsIgnoreCase(companyEmail);
                    boolean matchesRequestor = requestor != null && requestor.contains("@") && fromAddress.equalsIgnoreCase(requestor);
                    
                    if (matchesCaller || matchesCompany || matchesRequestor) {
                        log.warn("[SMTP] Guard Triggered: Sender email ({}) matches caller, company, or requestor email. Forcing to defaultFrom.", fromAddress);
                        fromAddress = defaultFrom;
                        
                        if (fromAddress.equalsIgnoreCase(callerEmail) || fromAddress.equalsIgnoreCase(companyEmail) || (requestor != null && requestor.contains("@") && fromAddress.equalsIgnoreCase(requestor))) {
                            CompanyEmailConfig active = getActiveConfig();
                            if (active != null && active.getEmailAddress() != null && !active.getEmailAddress().isBlank()) {
                                fromAddress = active.getEmailAddress();
                            }
                        }
                    }
                }
            } catch (Exception ignored) {}
        }

        helper.setFrom(fromAddress, fromName);
        helper.setReplyTo(fromAddress, fromName);
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(html, true);
        if (ticketNumber != null) {
            msg.addHeader("X-Ticket-Number", ticketNumber);
        }
        
        // Generate Message-ID
        String cleanDomain = "technosprint.net";
        if (fromAddress.contains("@")) {
            cleanDomain = fromAddress.split("@")[1];
        }
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
