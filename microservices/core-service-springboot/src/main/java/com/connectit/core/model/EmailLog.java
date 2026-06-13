package com.connectit.core.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "email_logs", indexes = {
    @Index(name = "idx_el_ticket", columnList = "ticket_id"),
    @Index(name = "idx_el_status", columnList = "status")
})
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class EmailLog {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "ticket_id")             private Long ticketId;
    @Column(name = "ticket_number")         private String ticketNumber;
    @Column(nullable = false, length = 20)  private String direction;
    private String recipient;
    private String sender;
    private String subject;
    @Column(name = "body_preview", columnDefinition = "TEXT") private String bodyPreview;
    @Column(name = "message_id")            private String messageId;
    @Column(name = "in_reply_to")           private String inReplyTo;
    @Column(name = "references_header", columnDefinition = "TEXT") private String referencesHeader;
    @Column(nullable = false, length = 30)  private String status = "pending";
    @Column(name = "error_message", columnDefinition = "TEXT") private String errorMessage;
    @Column(name = "email_type", length = 50) private String emailType = "notification";
    @Column(name = "config_id")             private Long configId;
    @Column(name = "sent_at")               private LocalDateTime sentAt;
    @Column(name = "received_at")           private LocalDateTime receivedAt;
    @Column(name = "created_at")            private LocalDateTime createdAt;
    @PrePersist void prePersist() { createdAt = LocalDateTime.now(); }
}
