package com.connectit.core.controller;

import com.connectit.core.model.*;
import com.connectit.core.service.SlaService;
import com.connectit.core.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class SlaController {

    private final SlaService        slaService;
    private final TicketRepository  ticketRepo;
    private final JdbcTemplate      jdbcTemplate;

    private boolean checkAdminAccess(String uid, String email) {
        List<String> fallbackEmails = List.of("arun.g@technosprint.net", "swedhasris@gmail.com", "ulter@technosprint.net", "admin@technosprint.net");
        if (email != null && fallbackEmails.contains(email.toLowerCase().trim())) {
            return true;
        }
        if (uid == null || uid.isBlank()) {
            return false;
        }
        try {
            List<Map<String, Object>> users = jdbcTemplate.queryForList("SELECT role, email FROM users WHERE uid = ?", uid);
            if (!users.isEmpty()) {
                Map<String, Object> user = users.get(0);
                String role = (String) user.get("role");
                String userEmail = (String) user.get("email");
                if (List.of("admin", "super_admin", "ultra_super_admin").contains(role) ||
                    (userEmail != null && fallbackEmails.contains(userEmail.toLowerCase().trim()))) {
                    return true;
                }
            }
        } catch (Exception err) {
            System.err.println("Error checking admin access: " + err.getMessage());
        }
        return false;
    }

    private boolean isAuthorized(String headerUid, String headerEmail) {
        return checkAdminAccess(headerUid, headerEmail);
    }

    @GetMapping("/sla/policies")
    public ResponseEntity<?> policies(
            @RequestHeader(required = false, name = "x-user-uid") String headerUid,
            @RequestHeader(required = false, name = "x-user-email") String headerEmail) {
        if (!isAuthorized(headerUid, headerEmail)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Unauthorized role"));
        }
        return ResponseEntity.ok(slaService.getAllPolicies());
    }

    @PostMapping("/sla/policies")
    public ResponseEntity<?> createPolicy(
            @RequestBody SLAPolicy policy,
            @RequestHeader(required = false, name = "x-user-uid") String headerUid,
            @RequestHeader(required = false, name = "x-user-email") String headerEmail) {
        if (!isAuthorized(headerUid, headerEmail)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Unauthorized role"));
        }
        return ResponseEntity.status(201).body(slaService.save(policy));
    }

    @PutMapping("/sla/policies/{id}")
    public ResponseEntity<?> updatePolicy(
            @PathVariable Long id,
            @RequestBody SLAPolicy policy,
            @RequestHeader(required = false, name = "x-user-uid") String headerUid,
            @RequestHeader(required = false, name = "x-user-email") String headerEmail) {
        if (!isAuthorized(headerUid, headerEmail)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Unauthorized role"));
        }
        policy.setId(id);
        return ResponseEntity.ok(slaService.save(policy));
    }

    @DeleteMapping("/sla/policies/{id}")
    public ResponseEntity<?> deletePolicy(
            @PathVariable Long id,
            @RequestHeader(required = false, name = "x-user-uid") String headerUid,
            @RequestHeader(required = false, name = "x-user-email") String headerEmail) {
        if (!isAuthorized(headerUid, headerEmail)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Unauthorized role"));
        }
        slaService.delete(id);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @GetMapping({"/sla/breaches", "/sla-breaches/all"})
    public ResponseEntity<?> breaches(
            @RequestHeader(required = false, name = "x-user-uid") String headerUid,
            @RequestHeader(required = false, name = "x-user-email") String headerEmail) {
        if (!isAuthorized(headerUid, headerEmail)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Unauthorized role"));
        }
        return ResponseEntity.ok(slaService.getBreaches());
    }

    @GetMapping("/sla-breaches/user/{userId}")
    public ResponseEntity<?> breachesByUser(
            @PathVariable String userId,
            @RequestHeader(required = false, name = "x-user-uid") String headerUid,
            @RequestHeader(required = false, name = "x-user-email") String headerEmail) {
        // Enforce RBAC: users can only check their own breaches unless they are admins.
        if (!userId.equals(headerUid) && !isAuthorized(headerUid, headerEmail)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Unauthorized role"));
        }
        return ResponseEntity.ok(slaService.getBreachesByUser(userId));
    }

    @GetMapping("/sla/audit/{ticketId}")
    public ResponseEntity<?> auditLogs(
            @PathVariable String ticketId,
            @RequestHeader(required = false, name = "x-user-uid") String headerUid,
            @RequestHeader(required = false, name = "x-user-email") String headerEmail) {
        if (!isAuthorized(headerUid, headerEmail)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Unauthorized role"));
        }
        return ResponseEntity.ok(slaService.getSlaAuditLogs(ticketId));
    }

    @PostMapping("/tickets/trigger-escalation")
    public ResponseEntity<?> triggerEscalation(
            @RequestHeader(required = false, name = "x-user-uid") String headerUid,
            @RequestHeader(required = false, name = "x-user-email") String headerEmail) {
        if (!isAuthorized(headerUid, headerEmail)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Unauthorized role"));
        }
        return ResponseEntity.ok(Map.of("message","Escalation triggered — check SLA scheduler logs"));
    }
}
