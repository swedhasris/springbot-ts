package com.connectit.core.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name = "sla_policies", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"priority","category"})
})
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class SLAPolicy {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false)              private String name;
    @Column(nullable = false, length = 50) private String priority;
    @Column(length = 100)                  private String category;
    @Column(name = "response_time_hours",   nullable = false) private Integer responseTimeHours;
    @Column(name = "resolution_time_hours", nullable = false) private Integer resolutionTimeHours;
    @Column(name = "business_hours_only")   private Boolean businessHoursOnly = false;
    @Column(name = "exclude_weekends")      private Boolean excludeWeekends = false;
    @Column(name = "exclude_holidays")      private Boolean excludeHolidays = false;
    @Column(name = "assignment_group")      private String assignmentGroup;
    @Column(name = "allow_pause")           private Boolean allowPause = true;
    @Column(name = "escalation_levels")     private Integer escalationLevels = 1;
    @Column(name = "is_active")            private Boolean isActive = true;
    @Column(columnDefinition = "TEXT")     private String description;
    @Column(name = "created_at")           private LocalDateTime createdAt;
    @Column(name = "updated_at")           private LocalDateTime updatedAt;
    @PrePersist  void prePersist()  { createdAt = LocalDateTime.now(); updatedAt = LocalDateTime.now(); }
    @PreUpdate   void preUpdate()   { updatedAt = LocalDateTime.now(); }
}
