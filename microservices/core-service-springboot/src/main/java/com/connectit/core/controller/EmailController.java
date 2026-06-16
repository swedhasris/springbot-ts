package com.connectit.core.controller;

import com.connectit.core.model.*;
import com.connectit.core.repository.*;
import com.connectit.core.service.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class EmailController {

    private final EmailService                 emailService;
    private final EmailLogRepository           emailLogRepo;
    private final NotificationQueueRepository  queueRepo;
    private final CompanyEmailConfigRepository configRepo;

    @GetMapping("/email/health")
    public ResponseEntity<?> health() {
        return ResponseEntity.ok(emailService.getHealth());
    }

    @GetMapping("/email/logs")
    public ResponseEntity<?> logs(@RequestParam(defaultValue="50") int limit) {
        return ResponseEntity.ok(emailLogRepo.findAllByOrderByCreatedAtDesc(PageRequest.of(0, limit)));
    }

    @GetMapping("/email/queue")
    public ResponseEntity<?> queue() {
        List<Object[]> statsRaw = queueRepo.countByStatus();
        List<Map<String,Object>> stats = statsRaw.stream()
            .map(r -> Map.of("status", r[0], "count", r[1]))
            .toList();
        var items = queueRepo.findAll(PageRequest.of(0, 50)).getContent();
        return ResponseEntity.ok(Map.of("items", items, "stats", stats));
    }

    @PostMapping("/email/queue/process")
    public ResponseEntity<?> processQueue() {
        emailService.processQueue();
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/email/queue/retry-failed")
    public ResponseEntity<?> retryFailed() {
        queueRepo.findByStatus("failed").forEach(q -> {
            q.setStatus("retry");
            q.setRetryCount(0);
            q.setNextRetryAt(null);
            queueRepo.save(q);
        });
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/email/send-test")
    public ResponseEntity<?> sendTest(@RequestBody Map<String,String> body) {
        String to = body.getOrDefault("to", "info@technosprint.net");
        emailService.sendAsync(to,
            "[TEST] Ticklora Spring Boot Email Test",
            "<div style='font-family:sans-serif;padding:20px'><h2 style='color:#2563eb'>✅ Spring Boot Email Working</h2>" +
            "<p>This confirms the Spring Boot email integration is operational.</p>" +
            "<p>Sent: " + java.time.LocalDateTime.now() + "</p></div>"
        );
        return ResponseEntity.ok(Map.of("success", true, "message", "Test email sent to " + to));
    }

    @PostMapping("/email/send-note")
    public ResponseEntity<?> sendNote(@RequestBody Map<String,String> body) {
        emailService.sendAsync(body.get("to"), body.get("subject"), body.get("body"));
        return ResponseEntity.ok(Map.of("message", "Email queued"));
    }

    // ── Email Configs ──────────────────────────────────────────────────────────
    @GetMapping("/email-configs")
    public ResponseEntity<?> listConfigs() {
        return ResponseEntity.ok(configRepo.findByIsActiveTrueOrderByIsDefaultDescCompanyNameAsc());
    }

    @PostMapping("/email-configs")
    public ResponseEntity<?> createConfig(@RequestBody CompanyEmailConfig cfg) {
        if (Boolean.TRUE.equals(cfg.getIsDefault())) {
            configRepo.findAll().forEach(c -> { c.setIsDefault(false); configRepo.save(c); });
        }
        return ResponseEntity.status(201).body(configRepo.save(cfg));
    }

    @PutMapping("/email-configs/{id}")
    public ResponseEntity<?> updateConfig(@PathVariable Long id, @RequestBody CompanyEmailConfig cfg) {
        return configRepo.findById(id).map(existing -> {
            if (Boolean.TRUE.equals(cfg.getIsDefault())) {
                configRepo.findAll().forEach(c -> { if (!c.getId().equals(id)) { c.setIsDefault(false); configRepo.save(c); } });
            }
            cfg.setId(id);
            return ResponseEntity.ok((Object) configRepo.save(cfg));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/email-configs/{id}")
    public ResponseEntity<?> deleteConfig(@PathVariable Long id) {
        configRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/email-configs/test")
    public ResponseEntity<?> testConfig(@RequestBody CompanyEmailConfig cfg) {
        boolean smtpOk = false;
        boolean imapOk = false;
        String smtpErr = null;
        String imapErr = null;

        // 1. SMTP Test
        try {
            var props = new java.util.Properties();
            props.put("mail.smtp.auth", "true");
            props.put("mail.smtp.starttls.enable", "true");
            props.put("mail.smtp.connectiontimeout", "4000");
            props.put("mail.smtp.timeout", "4000");
            final String smtpUser = cfg.getSmtpUser();
            final String smtpPass = cfg.getSmtpPass();
            var session = jakarta.mail.Session.getInstance(props, new jakarta.mail.Authenticator() {
                protected jakarta.mail.PasswordAuthentication getPasswordAuthentication() {
                    return new jakarta.mail.PasswordAuthentication(smtpUser, smtpPass);
                }
            });
            var transport = session.getTransport("smtp");
            transport.connect(cfg.getSmtpHost(), cfg.getSmtpPort(), smtpUser, smtpPass);
            transport.close();
            smtpOk = true;
        } catch (Exception e) {
            smtpErr = e.getMessage();
        }

        // 2. IMAP Test
        try {
            var props = new java.util.Properties();
            String protocol = "imaps";
            if ("NONE".equalsIgnoreCase(cfg.getEncryption())) {
                protocol = "imap";
            }
            props.put("mail.store.protocol", protocol);
            props.put("mail.imap.ssl.enable", "imaps".equals(protocol) ? "true" : "false");
            props.put("mail.imap.starttls.enable", "TLS".equalsIgnoreCase(cfg.getEncryption()) ? "true" : "false");
            props.put("mail.imap.ssl.trust", cfg.getImapHost());
            props.put("mail.imaps.ssl.trust", cfg.getImapHost());
            props.put("mail.imap.connectiontimeout", "4000");
            props.put("mail.imap.timeout", "4000");
            props.put("mail.imaps.connectiontimeout", "4000");
            props.put("mail.imaps.timeout", "4000");

            var session = jakarta.mail.Session.getInstance(props, null);
            var store = session.getStore(protocol);
            store.connect(cfg.getImapHost(), cfg.getImapPort(), cfg.getImapUser(), cfg.getImapPass());
            store.close();
            imapOk = true;
        } catch (Exception e) {
            imapErr = e.getMessage();
        }

        if (smtpOk && imapOk) {
            return ResponseEntity.ok(Map.of("success", true, "message", "Both SMTP and IMAP connections successful!"));
        } else {
            List<String> errors = new ArrayList<>();
            if (!smtpOk) errors.add("SMTP: " + smtpErr);
            if (!imapOk) errors.add("IMAP: " + imapErr);
            return ResponseEntity.status(500).body(Map.of("error", String.join(" | ", errors)));
        }
    }
}
