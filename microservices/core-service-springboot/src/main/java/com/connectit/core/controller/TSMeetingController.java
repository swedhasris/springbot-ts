package com.connectit.core.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class TSMeetingController {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Helper to serialize list/maps to JSON string for database persistence
    private String serializeJsonField(Object val) {
        if (val == null) return "[]";
        if (val instanceof String) return (String) val;
        try {
            return objectMapper.writeValueAsString(val);
        } catch (Exception e) {
            return "[]";
        }
    }

    // Helper to parse JSON string columns to lists
    private List<?> parseJsonArray(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, List.class);
        } catch (Exception e) {
            return List.of();
        }
    }

    // ── Restored notifyMeetingEvent ──────────────────────────────────────────
    private void notifyMeetingEvent(String tsmId, String eventType, String actorId, String actorName) {
        try {
            List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT * FROM ts_meetings WHERE tsm_id = ?", tsmId);
            if (rows.isEmpty()) return;
            Map<String, Object> meeting = rows.get(0);

            String title = (String) meeting.get("title");
            String meetingDate = (String) meeting.get("meeting_date");
            String meetingTime = (String) meeting.get("meeting_time");
            String organizer = (String) meeting.get("organizer");

            String msg = "";
            if ("created".equals(eventType)) {
                msg = "New TS Meeting scheduled: \"" + title + "\" on " + meetingDate + " at " + meetingTime + ".";
            } else if ("updated".equals(eventType)) {
                msg = "TS Meeting updated: \"" + title + "\" details changed.";
            } else if ("started".equals(eventType)) {
                msg = "TS Meeting started: \"" + title + "\" is in progress. Join now!";
            } else if ("ended".equals(eventType)) {
                msg = "TS Meeting ended: \"" + title + "\" has completed.";
            } else if ("join".equals(eventType)) {
                msg = "Participant joined: " + actorName + " has joined the meeting \"" + title + "\".";
            } else if ("leave".equals(eventType)) {
                msg = "Participant left: " + actorName + " has left the meeting \"" + title + "\".";
            }

            // Extract participant emails
            List<?> participantsList = parseJsonArray((String) meeting.get("participants"));
            List<String> emails = new ArrayList<>();
            for (Object pObj : participantsList) {
                if (pObj instanceof Map) {
                    Map<?, ?> pMap = (Map<?, ?>) pObj;
                    String email = (String) pMap.get("email");
                    if (email != null && !email.isBlank()) {
                        emails.add(email);
                    }
                }
            }

            // Build query to find user uids to alert
            StringBuilder querySb = new StringBuilder("SELECT uid FROM users WHERE 1 = 0");
            List<Object> queryParams = new ArrayList<>();

            if (!emails.isEmpty()) {
                querySb.append(" OR email IN (");
                for (int i = 0; i < emails.size(); i++) {
                    querySb.append(i == 0 ? "?" : ",?");
                    queryParams.add(emails.get(i));
                }
                querySb.append(")");
            }
            if (organizer != null && !organizer.isBlank()) {
                querySb.append(" OR email = ? OR name = ?");
                queryParams.add(organizer);
                queryParams.add(organizer);
            }

            List<Map<String, Object>> matchingUsers = jdbcTemplate.queryForList(querySb.toString(), queryParams.toArray());

            final String finalMsg = msg;

            for (Map<String, Object> targetUser : matchingUsers) {
                String targetUid = (String) targetUser.get("uid");
                if (targetUid == null || targetUid.isBlank()) continue;

                KeyHolder keyHolder = new GeneratedKeyHolder();
                String insertSql = "INSERT INTO notifications (user_id, message, ticket_id, ticket_number, actor_id, actor_name, is_read) VALUES (?, ?, ?, ?, ?, ?, 0)";
                jdbcTemplate.update(connection -> {
                    PreparedStatement ps = connection.prepareStatement(insertSql, Statement.RETURN_GENERATED_KEYS);
                    ps.setString(1, targetUid);
                    ps.setString(2, finalMsg);
                    ps.setString(3, tsmId);
                    ps.setString(4, tsmId); // ticket_number maps to tsmId
                    ps.setString(5, actorId);
                    ps.setString(6, actorName);
                    return ps;
                }, keyHolder);

                Number key = keyHolder.getKey();
                long newNotifId = key != null ? key.longValue() : 0;

                Map<String, Object> newNotif = new HashMap<>();
                newNotif.put("id", String.valueOf(newNotifId));
                newNotif.put("user_id", targetUid);
                newNotif.put("message", msg);
                newNotif.put("ticket_id", tsmId);
                newNotif.put("ticket_number", tsmId);
                newNotif.put("actor_id", actorId);
                newNotif.put("actor_name", actorName);
                newNotif.put("is_read", 0);
                newNotif.put("created_at", LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));

                NotificationController.sendNotification(targetUid, newNotif);
            }
        } catch (Exception e) {
            System.err.println("[TSMeetingController] notifyMeetingEvent error: " + e.getMessage());
        }
    }

    private void notifyMeetingEvent(String tsmId, String eventType) {
        notifyMeetingEvent(tsmId, eventType, "system", "System");
    }

    // ── Restored Endpoints ───────────────────────────────────────────────────

    // GET /api/ts-meetings
    @GetMapping("/ts-meetings")
    public ResponseEntity<?> listMeetings() {
        try {
            List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT * FROM ts_meetings ORDER BY created_at DESC");
            // Map the parsed JSON list fields back to lists before sending
            for (Map<String, Object> r : rows) {
                r.put("participants", parseJsonArray((String) r.get("participants")));
                r.put("attachments", parseJsonArray((String) r.get("attachments")));
                r.put("comments", parseJsonArray((String) r.get("comments")));
                r.put("timeline", parseJsonArray((String) r.get("timeline")));
            }
            return ResponseEntity.ok(rows);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // POST /api/ts-meetings
    @PostMapping("/ts-meetings")
    @Transactional
    public ResponseEntity<?> createOrUpdateMeeting(@RequestBody Map<String, Object> body) {
        try {
            String tsm_id = (String) body.get("tsm_id");
            String title = (String) body.get("title");
            String description = (String) body.get("description");
            String meeting_date = (String) body.get("meeting_date");
            String meeting_time = (String) body.get("meeting_time");
            String duration = (String) body.get("duration");
            String organizer = (String) body.get("organizer");
            String meeting_type = (String) body.get("meeting_type");
            String priority = (String) body.get("priority");
            String status = (String) body.get("status");
            String room_id = (String) body.get("room_id");
            String password = (String) body.get("password");
            String notes = (String) body.get("notes");
            String recurrence = (String) body.get("recurrence");
            String ticket_id = (String) body.get("ticket_id");

            if (tsm_id == null || title == null || room_id == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Missing required fields: tsm_id, title, room_id"));
            }

            String partsJson = serializeJsonField(body.get("participants"));
            String attsJson = serializeJsonField(body.get("attachments"));
            String commsJson = serializeJsonField(body.get("comments"));
            String timelineJson = serializeJsonField(body.get("timeline"));

            List<Map<String, Object>> existing = jdbcTemplate.queryForList("SELECT tsm_id FROM ts_meetings WHERE tsm_id = ?", tsm_id);
            if (!existing.isEmpty()) {
                jdbcTemplate.update(
                    "UPDATE ts_meetings SET " +
                    "  title = ?, description = ?, meeting_date = ?, meeting_time = ?, " +
                    "  duration = ?, organizer = ?, participants = ?, meeting_type = ?, " +
                    "  priority = ?, status = ?, room_id = ?, password = ?, notes = ?, " +
                    "  attachments = ?, comments = ?, timeline = ?, recurrence = ?, ticket_id = ?, updated_at = NOW() " +
                    "WHERE tsm_id = ?",
                    title, description, meeting_date, meeting_time,
                    duration, organizer, partsJson, meeting_type,
                    priority, status != null ? status : "Draft", room_id, password, notes,
                    attsJson, commsJson, timelineJson, recurrence != null ? recurrence : "None", ticket_id, tsm_id
                );
                notifyMeetingEvent(tsm_id, "updated");
            } else {
                jdbcTemplate.update(
                    "INSERT INTO ts_meetings (" +
                    "  tsm_id, title, description, meeting_date, meeting_time, " +
                    "  duration, organizer, participants, meeting_type, priority, " +
                    "  status, room_id, password, notes, attachments, comments, timeline, " +
                    "  recurrence, ticket_id" +
                    ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    tsm_id, title, description, meeting_date, meeting_time,
                    duration, organizer, partsJson, meeting_type, priority,
                    status != null ? status : "Draft", room_id, password, notes,
                    attsJson, commsJson, timelineJson, recurrence != null ? recurrence : "None", ticket_id
                );
                notifyMeetingEvent(tsm_id, "created");
            }
            return ResponseEntity.ok(Map.of("success", true, "tsm_id", tsm_id));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // GET /api/ts-meetings/{tsmId}
    @GetMapping("/ts-meetings/{tsmId}")
    public ResponseEntity<?> getMeeting(@PathVariable String tsmId) {
        try {
            List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT * FROM ts_meetings WHERE tsm_id = ?", tsmId);
            if (rows.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("error", "TS Meeting not found"));
            }
            Map<String, Object> meeting = new HashMap<>(rows.get(0));
            meeting.put("participants", parseJsonArray((String) meeting.get("participants")));
            meeting.put("attachments", parseJsonArray((String) meeting.get("attachments")));
            meeting.put("comments", parseJsonArray((String) meeting.get("comments")));
            meeting.put("timeline", parseJsonArray((String) meeting.get("timeline")));
            return ResponseEntity.ok(Map.of("success", true, "meeting", meeting));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // PUT /api/ts-meetings/{tsmId}
    @PutMapping("/ts-meetings/{tsmId}")
    @Transactional
    public ResponseEntity<?> updateMeeting(@PathVariable String tsmId, @RequestBody Map<String, Object> body) {
        try {
            String status = (String) body.get("status");
            String notes = (String) body.get("notes");

            if (status != null) {
                jdbcTemplate.update("UPDATE ts_meetings SET status = ?, updated_at = NOW() WHERE tsm_id = ?", status, tsmId);
                if ("Completed".equals(status)) {
                    notifyMeetingEvent(tsmId, "ended");
                }
            }
            if (notes != null) {
                jdbcTemplate.update("UPDATE ts_meetings SET notes = ?, updated_at = NOW() WHERE tsm_id = ?", notes, tsmId);
            }
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // POST /api/ts-meetings/{tsmId}/join
    @PostMapping("/ts-meetings/{tsmId}/join")
    @Transactional
    public ResponseEntity<?> joinMeeting(@PathVariable String tsmId, @RequestBody Map<String, Object> body) {
        try {
            String peerId = (String) body.get("peerId");
            String name = (String) body.get("name");
            String joinTime = (String) body.get("joinTime");

            jdbcTemplate.update(
                "INSERT INTO ts_meeting_attendance (tsm_id, peer_id, name, join_time) VALUES (?, ?, ?, ?)",
                tsmId, peerId, name, joinTime
            );

            // Transition Scheduled status to In Progress
            List<Map<String, Object>> meetings = jdbcTemplate.queryForList("SELECT status FROM ts_meetings WHERE tsm_id = ?", tsmId);
            if (!meetings.isEmpty() && "Scheduled".equals(meetings.get(0).get("status"))) {
                jdbcTemplate.update("UPDATE ts_meetings SET status = 'In Progress', updated_at = NOW() WHERE tsm_id = ?", tsmId);
                notifyMeetingEvent(tsmId, "started", peerId, name);
            }

            notifyMeetingEvent(tsmId, "join", peerId, name);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // POST /api/ts-meetings/{tsmId}/leave
    @PostMapping("/ts-meetings/{tsmId}/leave")
    @Transactional
    public ResponseEntity<?> leaveMeeting(@PathVariable String tsmId, @RequestBody Map<String, Object> body) {
        try {
            String peerId = (String) body.get("peerId");
            String name = (String) body.get("name");
            String leaveTime = (String) body.get("leaveTime");

            List<Map<String, Object>> logs = jdbcTemplate.queryForList(
                "SELECT id FROM ts_meeting_attendance WHERE tsm_id = ? AND peer_id = ? AND leave_time IS NULL ORDER BY id DESC LIMIT 1",
                tsmId, peerId
            );

            if (!logs.isEmpty()) {
                jdbcTemplate.update(
                    "UPDATE ts_meeting_attendance SET leave_time = ? WHERE id = ?",
                    leaveTime, logs.get(0).get("id")
                );
            } else {
                jdbcTemplate.update(
                    "UPDATE ts_meeting_attendance SET leave_time = ? WHERE tsm_id = ? AND peer_id = ? AND leave_time IS NULL",
                    leaveTime, tsmId, peerId
                );
            }

            notifyMeetingEvent(tsmId, "leave", peerId, name != null ? name : "Participant");
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // POST /api/ts-meetings/{tsmId}/chat
    @PostMapping("/ts-meetings/{tsmId}/chat")
    @Transactional
    public ResponseEntity<?> saveChat(@PathVariable String tsmId, @RequestBody Map<String, Object> body) {
        try {
            String senderId = (String) body.get("senderId");
            String senderName = (String) body.get("senderName");
            String text = (String) body.get("text");
            String timestamp = (String) body.get("timestamp");
            String type = (String) body.get("type");
            String fileUrl = (String) body.get("fileUrl");
            String fileName = (String) body.get("fileName");

            jdbcTemplate.update(
                "INSERT INTO ts_meeting_chat (tsm_id, sender_id, sender_name, text, timestamp, type, file_url, file_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                tsmId, senderId, senderName, text, timestamp, type != null ? type : "text", fileUrl, fileName
            );
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // GET /api/ts-meetings/{tsmId}/chat
    @GetMapping("/ts-meetings/{tsmId}/chat")
    public ResponseEntity<?> getChat(@PathVariable String tsmId) {
        try {
            List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT * FROM ts_meeting_chat WHERE tsm_id = ? ORDER BY id ASC", tsmId);
            return ResponseEntity.ok(rows);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // GET /api/ts-meetings/{tsmId}/attendance
    @GetMapping("/ts-meetings/{tsmId}/attendance")
    public ResponseEntity<?> getAttendance(@PathVariable String tsmId) {
        try {
            List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT * FROM ts_meeting_attendance WHERE tsm_id = ? ORDER BY id ASC", tsmId);
            return ResponseEntity.ok(Map.of("success", true, "attendance", rows));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // DELETE /api/ts-meetings/{tsmId}
    @DeleteMapping("/ts-meetings/{tsmId}")
    @Transactional
    public ResponseEntity<?> deleteMeeting(@PathVariable String tsmId) {
        try {
            jdbcTemplate.update("DELETE FROM ts_meetings WHERE tsm_id = ?", tsmId);
            jdbcTemplate.update("DELETE FROM ts_meeting_chat WHERE tsm_id = ?", tsmId);
            jdbcTemplate.update("DELETE FROM ts_meeting_attendance WHERE tsm_id = ?", tsmId);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
}
