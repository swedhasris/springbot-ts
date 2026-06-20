package com.connectit.core.service;

import com.connectit.core.model.CallActivity;
import com.connectit.core.model.CallLog;
import com.connectit.core.model.CallNote;
import com.connectit.core.model.Ticket;
import com.connectit.core.repository.CallActivityRepository;
import com.connectit.core.repository.CallLogRepository;
import com.connectit.core.repository.CallNoteRepository;
import com.connectit.core.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class CallService {

    private final CallLogRepository callLogRepo;
    private final CallNoteRepository callNoteRepo;
    private final CallActivityRepository callActivityRepo;
    private final TicketService ticketService;
    private final UserRepository userRepo;

    public List<CallLog> searchCalls(String search, String status, String callType, String priority) {
        return callLogRepo.searchCalls(search, status, callType, priority);
    }

    public Optional<CallLog> getCallById(Long id) {
        return callLogRepo.findById(id);
    }

    @Transactional
    public CallLog createCall(CallLog call, String createdBy, String createdByName) {
        if (call.getStatus() == null) {
            call.setStatus("New");
        }
        if (call.getCallDateTime() == null) {
            call.setCallDateTime(LocalDateTime.now());
        }
        CallLog saved = callLogRepo.save(call);

        // Audit Trail entry
        logActivity(saved.getId(), "Call Log Created", createdBy, createdByName, "Call log initialized");

        if (Boolean.TRUE.equals(call.getCreateTicket())) {
            convertToTicket(saved.getId(), createdBy, createdByName);
        }

        return saved;
    }

    @Transactional
    public CallLog updateCall(Long id, CallLog updated, String updatedBy, String updatedByName) {
        CallLog existing = callLogRepo.findById(id)
            .orElseThrow(() -> new RuntimeException("Call not found with id: " + id));

        StringBuilder auditDetails = new StringBuilder("Updated fields: ");
        boolean changed = false;

        if (!Objects.equals(existing.getCallerName(), updated.getCallerName())) {
            auditDetails.append(String.format("Caller Name (%s -> %s), ", existing.getCallerName(), updated.getCallerName()));
            existing.setCallerName(updated.getCallerName());
            changed = true;
        }
        if (!Objects.equals(existing.getPhoneNumber(), updated.getPhoneNumber())) {
            auditDetails.append(String.format("Phone (%s -> %s), ", existing.getPhoneNumber(), updated.getPhoneNumber()));
            existing.setPhoneNumber(updated.getPhoneNumber());
            changed = true;
        }
        if (!Objects.equals(existing.getEmail(), updated.getEmail())) {
            existing.setEmail(updated.getEmail());
            changed = true;
        }
        if (!Objects.equals(existing.getDepartment(), updated.getDepartment())) {
            existing.setDepartment(updated.getDepartment());
            changed = true;
        }
        if (!Objects.equals(existing.getSubject(), updated.getSubject())) {
            existing.setSubject(updated.getSubject());
            changed = true;
        }
        if (!Objects.equals(existing.getDescription(), updated.getDescription())) {
            existing.setDescription(updated.getDescription());
            changed = true;
        }
        if (!Objects.equals(existing.getCallType(), updated.getCallType())) {
            auditDetails.append(String.format("Type (%s -> %s), ", existing.getCallType(), updated.getCallType()));
            existing.setCallType(updated.getCallType());
            changed = true;
        }
        if (!Objects.equals(existing.getPriority(), updated.getPriority())) {
            auditDetails.append(String.format("Priority (%s -> %s), ", existing.getPriority(), updated.getPriority()));
            existing.setPriority(updated.getPriority());
            changed = true;
        }
        if (!Objects.equals(existing.getAgentUid(), updated.getAgentUid())) {
            auditDetails.append(String.format("Agent (%s -> %s), ", existing.getAgentName(), updated.getAgentName()));
            existing.setAgentUid(updated.getAgentUid());
            existing.setAgentName(updated.getAgentName());
            changed = true;
        }
        if (!Objects.equals(existing.getStatus(), updated.getStatus())) {
            auditDetails.append(String.format("Status (%s -> %s), ", existing.getStatus(), updated.getStatus()));
            existing.setStatus(updated.getStatus());
            changed = true;
        }

        if (changed) {
            existing.setUpdatedAt(LocalDateTime.now());
            CallLog saved = callLogRepo.save(existing);
            String details = auditDetails.toString();
            if (details.endsWith(", ")) {
                details = details.substring(0, details.length() - 2);
            }
            logActivity(id, "Call Log Updated", updatedBy, updatedByName, details);
            return saved;
        }

        return existing;
    }

    @Transactional
    public void deleteCall(Long id) {
        callLogRepo.deleteById(id);
    }

    // ── Notes ─────────────────────────────────────────────────────────────────
    public List<CallNote> getNotes(Long callId) {
        return callNoteRepo.findByCallIdOrderByCreatedAtDesc(callId);
    }

    @Transactional
    public CallNote addNote(Long callId, String userId, String userName, String message) {
        CallNote note = CallNote.builder()
            .callId(callId)
            .userId(userId)
            .userName(userName)
            .message(message)
            .build();
        CallNote saved = callNoteRepo.save(note);

        logActivity(callId, "Note Added", userId, userName, "Added note: " + (message.length() > 50 ? message.substring(0, 47) + "..." : message));

        return saved;
    }

    @Transactional
    public CallNote updateNote(Long noteId, String message, String userId, String userName) {
        CallNote note = callNoteRepo.findById(noteId)
            .orElseThrow(() -> new RuntimeException("Note not found with id: " + noteId));
        note.setMessage(message);
        CallNote saved = callNoteRepo.save(note);

        logActivity(note.getCallId(), "Note Updated", userId, userName, "Updated note: " + (message.length() > 50 ? message.substring(0, 47) + "..." : message));

        return saved;
    }

    @Transactional
    public void deleteNote(Long noteId, String userId, String userName) {
        callNoteRepo.findById(noteId).ifPresent(note -> {
            callNoteRepo.deleteById(noteId);
            logActivity(note.getCallId(), "Note Deleted", userId, userName, "Deleted a note");
        });
    }

    // ── Audit History ────────────────────────────────────────────────────────
    public List<CallActivity> getActivities(Long callId) {
        return callActivityRepo.findByCallIdOrderByCreatedAtDesc(callId);
    }

    @Transactional
    public void logActivity(Long callId, String action, String userId, String userName, String details) {
        CallActivity act = CallActivity.builder()
            .callId(callId)
            .action(action)
            .userId(userId)
            .userName(userName)
            .details(details)
            .build();
        callActivityRepo.save(act);
    }

    // ── Ticket Conversion ────────────────────────────────────────────────────
    @Transactional
    public Ticket convertToTicket(Long callId, String createdBy, String createdByName) {
        CallLog call = callLogRepo.findById(callId)
            .orElseThrow(() -> new RuntimeException("Call not found with id: " + callId));

        if (call.getLinkedTicketId() != null) {
            throw new RuntimeException("Call has already been converted to a ticket.");
        }

        // Prepare ticket data mapping call logs to tickets
        Map<String, Object> ticketData = new HashMap<>();
        ticketData.put("caller", call.getCallerName());
        ticketData.put("callerEmail", call.getEmail());
        ticketData.put("callerUserId", call.getAgentUid()); // Reference to caller user
        ticketData.put("category", "Inquiry / Help"); // Default
        ticketData.put("title", call.getSubject());
        ticketData.put("description", "Converted from Call Log #" + call.getId() + "\n\nCall Description:\n" + call.getDescription());
        ticketData.put("priority", call.getPriority());
        ticketData.put("channel", "Phone");
        ticketData.put("assignedTo", call.getAgentUid());
        ticketData.put("assignedToName", call.getAgentName());

        Ticket ticket = ticketService.createTicket(ticketData, createdBy, createdByName, true);

        // Link references
        call.setLinkedTicketId(ticket.getId());
        call.setStatus("Resolved"); // Converted calls are set to Resolved
        callLogRepo.save(call);

        // Log call activity
        logActivity(callId, "Converted to Ticket", createdBy, createdByName, "Converted call to ticket: " + ticket.getTicketNumber());

        return ticket;
    }

    // ── Reporting ────────────────────────────────────────────────────────────
    public Map<String, Object> getReports() {
        List<CallLog> allCalls = callLogRepo.findAll();

        long totalCalls = allCalls.size();
        long incoming = allCalls.stream().filter(c -> "Incoming".equalsIgnoreCase(c.getCallType())).count();
        long outgoing = allCalls.stream().filter(c -> "Outgoing".equalsIgnoreCase(c.getCallType())).count();
        long convertedToTickets = allCalls.stream().filter(c -> c.getLinkedTicketId() != null).count();

        Map<String, Long> byStatus = new HashMap<>();
        Map<String, Long> byAgent = new HashMap<>();

        for (CallLog c : allCalls) {
            byStatus.put(c.getStatus(), byStatus.getOrDefault(c.getStatus(), 0L) + 1);
            String agent = c.getAgentName() != null ? c.getAgentName() : "Unassigned";
            byAgent.put(agent, byAgent.getOrDefault(agent, 0L) + 1);
        }

        Map<String, Object> reports = new HashMap<>();
        reports.put("totalCalls", totalCalls);
        reports.put("incomingCalls", incoming);
        reports.put("outgoingCalls", outgoing);
        reports.put("convertedToTickets", convertedToTickets);
        reports.put("callsByStatus", byStatus);
        reports.put("callsByAgent", byAgent);

        return reports;
    }
}
