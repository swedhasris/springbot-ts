package com.connectit.core.service;

import com.connectit.core.model.*;
import com.connectit.core.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SlaService {

    private final SLAPolicyRepository policyRepo;
    private final SLABreachRepository breachRepo;
    private final TicketActivityRepository activityRepo;

    public List<SLAPolicy> getAllPolicies() {
        return policyRepo.findByIsActiveTrueOrderByPriorityAsc();
    }

    public SLAPolicy save(SLAPolicy policy) {
        return policyRepo.save(policy);
    }

    public void delete(Long id) {
        policyRepo.deleteById(id);
    }

    public List<SLABreach> getBreaches() {
        return breachRepo.findAll();
    }

    public List<SLABreach> getBreachesByUser(String userId) {
        return breachRepo.findByAssignedUser(userId);
    }

    public List<Object[]> getSlaAuditLogs(String ticketId) {
        return activityRepo.findByTicketIdOrderByCreatedAtAsc(Long.parseLong(ticketId))
            .stream()
            .filter(a -> a.getActivityType() != null && a.getActivityType().startsWith("sla_"))
            .map(a -> new Object[]{a.getId(), a.getActivityType(), a.getMessage(), a.getCreatedAt()})
            .toList();
    }
}
