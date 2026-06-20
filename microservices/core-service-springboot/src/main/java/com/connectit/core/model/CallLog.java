package com.connectit.core.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "call_logs", indexes = {
    @Index(name = "idx_call_agent",   columnList = "agent_uid"),
    @Index(name = "idx_call_status",  columnList = "status"),
    @Index(name = "idx_call_ticket",  columnList = "linked_ticket_id")
})
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class CallLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "caller_name", nullable = false)
    private String callerName;

    @Column(name = "phone_number", nullable = false, length = 50)
    private String phoneNumber;

    private String email;

    @Column(length = 100)
    private String department;

    @Column(nullable = false, length = 500)
    private String subject;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "call_type", nullable = false, length = 50)
    private String callType; // Incoming, Outgoing

    @Column(nullable = false, length = 50)
    private String priority; // Low, Medium, High, Critical

    @Column(name = "agent_uid", nullable = false, length = 128)
    private String agentUid;

    @Column(name = "agent_name")
    private String agentName;

    @Column(name = "call_date_time", nullable = false)
    private LocalDateTime callDateTime;

    @Column(nullable = false, length = 50)
    private String status; // New, Open, In Progress, On Hold, Resolved, Closed

    @Column(name = "linked_ticket_id")
    private Long linkedTicketId;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Transient
    private Boolean createTicket;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) status = "New";
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
