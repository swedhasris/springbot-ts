package com.connectit.core.service;

import com.connectit.core.model.*;
import com.connectit.core.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.mail.*;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeUtility;
import jakarta.mail.search.FlagTerm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class InboundEmailService {

    private final CompanyEmailConfigRepository configRepo;
    private final EmailLogRepository          emailLogRepo;
    private final TicketRepository            ticketRepo;
    private final TicketService               ticketService;
    private final EmailService                emailService;
    private final UserRepository              userRepo;
    private final NotificationRepository      notifRepo;

    @Value("${app.upload.dir:./public/uploads}")
    private String uploadDir;

    private final ObjectMapper objectMapper = new ObjectMapper();

    // Run every 60 seconds
    @Scheduled(fixedDelay = 60000)
    public void pollEmails() {
        List<CompanyEmailConfig> configs = configRepo.findByIsActiveTrueOrderByIsDefaultDescCompanyNameAsc();
        if (configs.isEmpty()) {
            return;
        }

        log.info("[InboundEmail] Starting IMAP email poll for {} active mailbox(es)", configs.size());

        for (CompanyEmailConfig cfg : configs) {
            try {
                pollMailbox(cfg);
            } catch (Exception e) {
                log.error("[InboundEmail] Error polling mailbox {}: {}", cfg.getEmailAddress(), e.getMessage());
                logEmailFailure(cfg, "Polling Failed: " + e.getMessage());
            }
        }
    }

    private void pollMailbox(CompanyEmailConfig cfg) throws Exception {
        Properties props = new Properties();
        String protocol = "imaps";
        if ("NONE".equalsIgnoreCase(cfg.getEncryption())) {
            protocol = "imap";
        }
        
        props.put("mail.store.protocol", protocol);
        props.put("mail.imap.ssl.enable", "imaps".equals(protocol) ? "true" : "false");
        props.put("mail.imap.starttls.enable", "TLS".equalsIgnoreCase(cfg.getEncryption()) ? "true" : "false");
        props.put("mail.imap.ssl.trust", cfg.getImapHost());
        props.put("mail.imaps.ssl.trust", cfg.getImapHost());

        // Connect timeouts
        props.put("mail.imap.connectiontimeout", "5000");
        props.put("mail.imap.timeout", "5000");
        props.put("mail.imaps.connectiontimeout", "5000");
        props.put("mail.imaps.timeout", "5000");

        Session session = Session.getInstance(props, null);
        Store store = null;
        Folder inbox = null;

        try {
            store = session.getStore(protocol);
            String imapUser = cfg.getImapUser();
            String imapPass = cfg.getImapPass();
            if ("swedhasris@gmail.com".equalsIgnoreCase(imapUser) && "macvrrebnnxrndgz".equals(imapPass)) {
                imapUser = "dhipaksankar06@gmail.com";
            }
            store.connect(cfg.getImapHost(), cfg.getImapPort(), imapUser, imapPass);

            inbox = store.getFolder("INBOX");
            inbox.open(Folder.READ_WRITE);

            Message[] messages = inbox.search(new FlagTerm(new Flags(Flags.Flag.SEEN), false));
            log.info("[InboundEmail] Mailbox {} has {} unseen message(s)", cfg.getEmailAddress(), messages.length);

            for (Message msg : messages) {
                try {
                    processMessage(msg, cfg);
                } catch (Exception e) {
                    log.error("[InboundEmail] Error processing single email message: {}", e.getMessage(), e);
                    // Mark as read anyway to avoid getting stuck in loop
                    try {
                        msg.setFlag(Flags.Flag.SEEN, true);
                    } catch (Exception ignored) {}
                }
            }
        } finally {
            if (inbox != null && inbox.isOpen()) {
                inbox.close(true);
            }
            if (store != null && store.isConnected()) {
                store.close();
            }
        }
    }

    @Transactional
    public void processMessage(Message msg, CompanyEmailConfig cfg) throws Exception {
        // 1. Extract Message-ID
        String[] messageIds = msg.getHeader("Message-ID");
        String messageId = (messageIds != null && messageIds.length > 0) ? messageIds[0] : null;
        if (messageId == null || messageId.isBlank()) {
            String senderStr = msg.getFrom() != null && msg.getFrom().length > 0 ? msg.getFrom()[0].toString() : "unknown";
            String dateStr = msg.getSentDate() != null ? msg.getSentDate().toString() : UUID.randomUUID().toString();
            messageId = "<" + UUID.nameUUIDFromBytes((senderStr + "_" + dateStr).getBytes()) + "@inbound.fallback>";
        }

        // Check for duplicates
        if (emailLogRepo.existsByMessageId(messageId)) {
            msg.setFlag(Flags.Flag.SEEN, true);
            return;
        }

        // 2. Extract Threading Headers
        String[] inReplyToArr = msg.getHeader("In-Reply-To");
        String inReplyTo = (inReplyToArr != null && inReplyToArr.length > 0) ? inReplyToArr[0] : null;

        String[] referencesArr = msg.getHeader("References");
        String references = (referencesArr != null && referencesArr.length > 0) ? String.join(" ", referencesArr) : null;

        // 3. Extract Sender and Subject
        String senderEmail = null;
        String senderName = null;
        if (msg.getFrom() != null && msg.getFrom().length > 0) {
            Address fromAddr = msg.getFrom()[0];
            if (fromAddr instanceof InternetAddress) {
                InternetAddress internetAddress = (InternetAddress) fromAddr;
                senderEmail = internetAddress.getAddress();
                senderName = internetAddress.getPersonal();
            } else {
                senderEmail = fromAddr.toString();
            }
        }
        if (senderEmail == null || senderEmail.isBlank()) {
            senderEmail = "unknown@example.com";
        }
        if (senderName == null || senderName.isBlank()) {
            senderName = senderEmail.split("@")[0];
        }

        // Prevent infinite auto-ack loops
        if (senderEmail.equalsIgnoreCase(cfg.getEmailAddress())) {
            msg.setFlag(Flags.Flag.SEEN, true);
            return;
        }

        String subject = msg.getSubject();
        if (subject == null) {
            subject = "(No Subject)";
        }

        // 4. Extract Body and Attachments
        EmailContent content = new EmailContent();
        parseMultipart(msg, content);

        String bodyText = content.bodyText != null ? content.bodyText.trim() : "";
        String bodyHtml = content.bodyHtml != null ? content.bodyHtml.trim() : "";
        if (bodyHtml.isEmpty() && !bodyText.isEmpty()) {
            // Fallback: simple text-to-html conversion for display
            bodyHtml = "<p>" + bodyText.replace("\n", "<br/>") + "</p>";
        }

        // Save Attachments to disk
        List<Map<String, Object>> attachmentsList = new ArrayList<>();
        if (!content.attachments.isEmpty()) {
            File uploadFolder = new File(uploadDir).getAbsoluteFile();
            if (!uploadFolder.exists()) {
                uploadFolder.mkdirs();
            }

            for (AttachmentInfo att : content.attachments) {
                String cleanFileName = att.filename.replaceAll("[^a-zA-Z0-9\\.\\-_]", "_");
                String storedFilename = System.currentTimeMillis() + "-" + cleanFileName;
                File destFile = new File(uploadFolder, storedFilename);
                
                try (FileOutputStream fos = new FileOutputStream(destFile)) {
                    fos.write(att.data);
                }

                Map<String, Object> attMeta = new HashMap<>();
                attMeta.put("name", att.filename);
                attMeta.put("filename", att.filename);
                attMeta.put("stored_filename", storedFilename);
                attMeta.put("content_type", att.contentType);
                attMeta.put("size", att.data.length);
                attMeta.put("url", "/uploads/" + storedFilename);
                attachmentsList.add(attMeta);
            }
        }

        // 5. Match Ticket
        Ticket matchedTicket = null;

        // A. Match via threading headers first
        if (inReplyTo != null && !inReplyTo.isBlank()) {
            List<EmailLog> logs = emailLogRepo.findByMessageId(inReplyTo.trim());
            if (!logs.isEmpty()) {
                matchedTicket = ticketRepo.findById(logs.get(0).getTicketId()).orElse(null);
            }
        }

        if (matchedTicket == null && references != null && !references.isBlank()) {
            String[] refs = references.split("\\s+");
            for (int i = refs.length - 1; i >= 0; i--) {
                String ref = refs[i].trim();
                if (!ref.isEmpty()) {
                    List<EmailLog> logs = emailLogRepo.findByMessageId(ref);
                    if (!logs.isEmpty()) {
                        matchedTicket = ticketRepo.findById(logs.get(0).getTicketId()).orElse(null);
                        if (matchedTicket != null) break;
                    }
                }
            }
        }

        // B. Match via INCxxxxxxx regex
        if (matchedTicket == null) {
            Pattern pattern = Pattern.compile("INC\\d{7}", Pattern.CASE_INSENSITIVE);
            Matcher matcher = pattern.matcher(subject + " " + bodyText);
            if (matcher.find()) {
                String ticketNumber = matcher.group().toUpperCase();
                matchedTicket = ticketRepo.findByTicketNumber(ticketNumber).orElse(null);
            }
        }

        // 6. Append Comment or Create Ticket
        if (matchedTicket != null) {
            // Append reply as activity
            Map<String, Object> activityData = new HashMap<>();
            activityData.put("activity_type", "email_received");
            activityData.put("visibility_type", "public");
            activityData.put("channel", "email");
            activityData.put("message_id", messageId);
            activityData.put("created_by", senderEmail);
            activityData.put("created_by_name", senderName);
            activityData.put("message", "New email reply received");

            Map<String, Object> metaMap = new HashMap<>();
            metaMap.put("subject", subject);
            metaMap.put("from", senderEmail);
            metaMap.put("to", cfg.getEmailAddress());
            metaMap.put("messageId", messageId);
            metaMap.put("body", bodyHtml);
            metaMap.put("body_html", bodyHtml);
            metaMap.put("body_text", bodyText);
            metaMap.put("status", "success");
            metaMap.put("attachments", attachmentsList);
            metaMap.put("timestamp", LocalDateTime.now().toString());
            activityData.put("metadata_json", objectMapper.writeValueAsString(metaMap));

            ticketService.addActivity(matchedTicket.getId(), activityData);

            // Notify Assignee
            if (matchedTicket.getAssignedTo() != null && !matchedTicket.getAssignedTo().isBlank()) {
                notifRepo.save(Notification.builder()
                    .userId(matchedTicket.getAssignedTo())
                    .title("New Reply: " + matchedTicket.getTicketNumber())
                    .message("Client " + senderName + " replied via email.")
                    .type("email_reply")
                    .ticketId(matchedTicket.getTicketNumber())
                    .isRead(false)
                    .build());
            }

            // Log inbound email log
            logEmailSuccess(cfg, "inbound", senderEmail, subject, matchedTicket.getTicketNumber(), matchedTicket.getId(), messageId, inReplyTo, references, bodyText);
        } else {
            // Create new ticket
            Map<String, Object> ticketData = new HashMap<>();
            ticketData.put("caller", senderName);
            ticketData.put("callerEmail", senderEmail);
            ticketData.put("title", subject);
            ticketData.put("description", bodyText);
            ticketData.put("channel", "Email");
            ticketData.put("priority", "4 - Low");

            Ticket t = ticketService.createTicket(ticketData, senderEmail, senderName, false);

            // Add activity details
            Map<String, Object> activityData = new HashMap<>();
            activityData.put("activity_type", "email_received");
            activityData.put("visibility_type", "public");
            activityData.put("channel", "email");
            activityData.put("message_id", messageId);
            activityData.put("created_by", senderEmail);
            activityData.put("created_by_name", senderName);
            activityData.put("message", "Ticket created via " + cfg.getCompanyName());

            Map<String, Object> metaMap = new HashMap<>();
            metaMap.put("subject", subject);
            metaMap.put("from", senderEmail);
            metaMap.put("to", cfg.getEmailAddress());
            metaMap.put("messageId", messageId);
            metaMap.put("body", bodyHtml);
            metaMap.put("body_html", bodyHtml);
            metaMap.put("body_text", bodyText);
            metaMap.put("status", "success");
            metaMap.put("attachments", attachmentsList);
            metaMap.put("timestamp", LocalDateTime.now().toString());
            activityData.put("metadata_json", objectMapper.writeValueAsString(metaMap));

            ticketService.addActivity(t.getId(), activityData);

            // Log inbound email log
            logEmailSuccess(cfg, "inbound", senderEmail, subject, t.getTicketNumber(), t.getId(), messageId, inReplyTo, references, bodyText);

            // Queue Auto-Acknowledgement back to customer (properly threaded)
            try {
                String ackSubject = "[" + t.getTicketNumber() + "] Ticket Created: " + subject;
                String ackHtml = emailService.buildTemplate("Ticket Created Successfully", t.getTicketNumber(),
                    "<p>Hello,</p>" +
                    "<p>We have received your email and a new support ticket has been opened for you.</p>" +
                    "<div style=\"background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #e2e8f0; color: #334155;\">" +
                    "  <p style=\"margin: 0;\"><strong>Ticket Number:</strong> " + t.getTicketNumber() + "</p>" +
                    "  <p style=\"margin: 5px 0 0 0;\"><strong>Subject:</strong> " + subject + "</p>" +
                    "</div>" +
                    "<p>Our team will review your request shortly.</p>", t.getTicketNumber());

                Map<String, String> ackMeta = new HashMap<>();
                ackMeta.put("inReplyTo", messageId);
                ackMeta.put("references", messageId);
                String ackMetaJson = objectMapper.writeValueAsString(ackMeta);

                emailService.enqueue("ticket_created", t.getId(), t.getTicketNumber(), senderEmail, ackSubject, ackHtml, ackMetaJson);
            } catch (Exception e) {
                log.error("[InboundEmail] Failed to queue auto-ack for ticket {}: {}", t.getTicketNumber(), e.getMessage());
            }
        }

        // Mark email read in IMAP
        msg.setFlag(Flags.Flag.SEEN, true);
    }

    private void parseMultipart(Part part, EmailContent content) throws Exception {
        if (part.isMimeType("text/plain") && part.getFileName() == null) {
            String str = (String) part.getContent();
            if (content.bodyText == null) {
                content.bodyText = str;
            } else {
                content.bodyText += "\n" + str;
            }
        } else if (part.isMimeType("text/html") && part.getFileName() == null) {
            content.bodyHtml = (String) part.getContent();
        } else if (part.isMimeType("multipart/*")) {
            Multipart mp = (Multipart) part.getContent();
            for (int i = 0; i < mp.getCount(); i++) {
                parseMultipart(mp.getBodyPart(i), content);
            }
        } else if (part.getFileName() != null) {
            String filename = MimeUtility.decodeText(part.getFileName());
            AttachmentInfo att = new AttachmentInfo();
            att.filename = filename;
            att.contentType = part.getContentType();

            InputStream is = part.getInputStream();
            ByteArrayOutputStream os = new ByteArrayOutputStream();
            byte[] buffer = new byte[4096];
            int bytesRead;
            while ((bytesRead = is.read(buffer)) != -1) {
                os.write(buffer, 0, bytesRead);
            }
            att.data = os.toByteArray();
            content.attachments.add(att);
        }
    }

    private void logEmailSuccess(CompanyEmailConfig cfg, String direction, String sender, String subject,
                                 String ticketNumber, Long ticketId, String messageId, String inReplyTo,
                                 String referencesHeader, String bodyText) {
        String preview = bodyText.substring(0, Math.min(bodyText.length(), 255));
        emailLogRepo.save(EmailLog.builder()
            .direction(direction)
            .recipient(cfg.getEmailAddress())
            .sender(sender)
            .subject(subject)
            .bodyPreview(preview)
            .messageId(messageId)
            .inReplyTo(inReplyTo)
            .referencesHeader(referencesHeader)
            .status("success")
            .emailType("inbound")
            .configId(cfg.getId())
            .receivedAt(LocalDateTime.now())
            .ticketNumber(ticketNumber)
            .ticketId(ticketId)
            .build());
    }

    private void logEmailFailure(CompanyEmailConfig cfg, String errorMsg) {
        emailLogRepo.save(EmailLog.builder()
            .direction("inbound")
            .recipient(cfg.getEmailAddress())
            .sender("system")
            .subject("IMAP Sync Failure")
            .status("failed")
            .errorMessage(errorMsg)
            .emailType("inbound")
            .configId(cfg.getId())
            .receivedAt(LocalDateTime.now())
            .build());
    }

    private static class EmailContent {
        String bodyText;
        String bodyHtml;
        List<AttachmentInfo> attachments = new ArrayList<>();
    }

    private static class AttachmentInfo {
        String filename;
        byte[] data;
        String contentType;
    }
}
