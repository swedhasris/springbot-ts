package com.connectit.core.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "message_history", indexes = {
    @Index(name = "idx_msghist_user", columnList = "user_id")
})
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class MessageHistory {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, length = 128)
    private String userId;

    @Column(name = "user_name", length = 255)
    private String userName;

    @Column(name = "message_type", nullable = false, length = 50)
    private String messageType;

    @Column(length = 255)
    private String recipient;

    @Column(name = "message_content", columnDefinition = "TEXT")
    private String messageContent;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @PrePersist
    public void prePersist() { sentAt = LocalDateTime.now(); }
}
