package com.connectit.core.controller;

import com.connectit.core.model.*;
import com.connectit.core.service.SlaService;
import com.connectit.core.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class SlaController {

    private final SlaService        slaService;
    private final TicketRepository  ticketRepo;

    @GetMapping("/sla/policies")
    public ResponseEntity<?> policies() {
        return ResponseEntity.ok(slaService.getAllPolicies());
    }

    @PostMapping("/sla/policies")
    public ResponseEntity<?> createPolicy(@RequestBody SLAPolicy policy) {
        return ResponseEntity.status(201).body(slaService.save(policy));
    }

    @PutMapping("/sla/policies/{id}")
    public ResponseEntity<?> updatePolicy(@PathVariable Long id, @RequestBody SLAPolicy policy) {
        policy.setId(id);
        return ResponseEntity.ok(slaService.save(policy));
    }

    @DeleteMapping("/sla/policies/{id}")
    public ResponseEntity<?> deletePolicy(@PathVariable Long id) {
        slaService.delete(id);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @GetMapping({"/sla/breaches", "/sla-breaches/all"})
    public ResponseEntity<?> breaches() {
        return ResponseEntity.ok(slaService.getBreaches());
    }

    @GetMapping("/sla-breaches/user/{userId}")
    public ResponseEntity<?> breachesByUser(@PathVariable String userId) {
        return ResponseEntity.ok(slaService.getBreachesByUser(userId));
    }

    @GetMapping("/sla/audit/{ticketId}")
    public ResponseEntity<?> auditLogs(@PathVariable String ticketId) {
        return ResponseEntity.ok(slaService.getSlaAuditLogs(ticketId));
    }

    @PostMapping("/tickets/trigger-escalation")
    public ResponseEntity<?> triggerEscalation() {
        return ResponseEntity.ok(Map.of("message","Escalation triggered — check SLA scheduler logs"));
    }
}
