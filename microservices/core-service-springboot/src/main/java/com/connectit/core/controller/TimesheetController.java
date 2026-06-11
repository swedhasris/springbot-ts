package com.connectit.core.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import jakarta.mail.internet.MimeMessage;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class TimesheetController {

    private final JdbcTemplate jdbcTemplate;
    private final JavaMailSender mailSender;

    @Value("${app.mail.from:support@technosprint.net}")
    private String mailFrom;

    @Value("${app.mail.from-name:Technosprint Support}")
    private String mailFromName;

    // ── Timesheets GET ────────────────────────────────────────────────────────
    @GetMapping("/timesheets")
    public ResponseEntity<?> getTimesheets(
            @RequestParam(required = false) String user_id,
            @RequestParam(required = false) String week_start,
            @RequestParam(required = false) String status) {
        
        String sql = "SELECT * FROM timesheets WHERE 1=1";
        List<Object> params = new ArrayList<>();
        if (user_id != null) {
            sql += " AND user_id = ?";
            params.add(user_id);
        }
        if (week_start != null) {
            sql += " AND week_start = ?";
            params.add(week_start);
        }
        if (status != null) {
            sql += " AND status = ?";
            params.add(status);
        }

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql, params.toArray());
        return ResponseEntity.ok(stringifyIds(rows));
    }

    @GetMapping("/timesheets/all")
    public ResponseEntity<?> getAllTimesheets() {
        String sql = "SELECT * FROM timesheets ORDER BY updated_at DESC";
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql);
        return ResponseEntity.ok(stringifyIds(rows));
    }

    // ── Timesheet Get or Create ───────────────────────────────────────────────
    @PostMapping("/timesheets/get-or-create")
    @Transactional
    public ResponseEntity<?> getOrCreateTimesheet(@RequestBody Map<String, Object> body) {
        String userId = (String) body.get("user_id");
        String weekStart = (String) body.get("week_start");
        String weekEnd = (String) body.get("week_end");

        if (userId == null || weekStart == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "user_id and week_start are required"));
        }

        String selectSql = "SELECT * FROM timesheets WHERE user_id = ? AND week_start = ?";
        List<Map<String, Object>> existing = jdbcTemplate.queryForList(selectSql, userId, weekStart);

        if (!existing.isEmpty()) {
            return ResponseEntity.ok(stringifyId(new HashMap<>(existing.get(0))));
        }

        String insertSql = "INSERT INTO timesheets (user_id, week_start, week_end, status, total_hours) VALUES (?, ?, ?, 'Draft', 0)";
        KeyHolder keyHolder = new GeneratedKeyHolder();

        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(insertSql, Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, userId);
            ps.setString(2, weekStart);
            ps.setString(3, weekEnd);
            return ps;
        }, keyHolder);

        Number key = keyHolder.getKey();
        long newId = key != null ? key.longValue() : 0;

        List<Map<String, Object>> created = jdbcTemplate.queryForList("SELECT * FROM timesheets WHERE id = ?", newId);
        if (created.isEmpty()) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to create timesheet"));
        }

        return ResponseEntity.ok(stringifyId(new HashMap<>(created.get(0))));
    }

    // ── Timesheet PUT (Submit / Approve / Reject) ─────────────────────────────
    @PutMapping("/timesheets/{id}")
    @Transactional
    public ResponseEntity<?> updateTimesheet(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        String status = (String) body.get("status");
        
        if ("Approved".equals(status) && !body.containsKey("approved_at")) {
            body.put("approved_at", LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        }

        List<String> fields = new ArrayList<>();
        List<Object> values = new ArrayList<>();

        for (Map.Entry<String, Object> entry : body.entrySet()) {
            if (!"id".equals(entry.getKey())) {
                fields.add(entry.getKey() + " = ?");
                values.add(entry.getValue());
            }
        }

        if (fields.isEmpty()) {
            List<Map<String, Object>> current = jdbcTemplate.queryForList("SELECT * FROM timesheets WHERE id = ?", id);
            return ResponseEntity.ok(current.isEmpty() ? Map.of() : stringifyId(new HashMap<>(current.get(0))));
        }

        String setClause = String.join(", ", fields);
        
        if ("Submitted".equals(status)) {
            String nowStr = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            String updateSql = "UPDATE timesheets SET " + setClause + ", submitted_at = ? WHERE id = ?";
            values.add(nowStr);
            values.add(id);
            jdbcTemplate.update(updateSql, values.toArray());

            // Send notification email to admins
            try {
                List<Map<String, Object>> admins = jdbcTemplate.queryForList(
                    "SELECT email, name FROM users WHERE role IN ('admin', 'super_admin', 'ultra_super_admin')"
                );
                List<Map<String, Object>> ts = jdbcTemplate.queryForList("SELECT * FROM timesheets WHERE id = ?", id);
                if (!ts.isEmpty()) {
                    String tsUserId = (String) ts.get(0).get("user_id");
                    String tsWeekStart = (String) ts.get(0).get("week_start");
                    String tsWeekEnd = (String) ts.get(0).get("week_end");
                    Object totalHours = ts.get(0).get("total_hours");

                    List<Map<String, Object>> employee = jdbcTemplate.queryForList("SELECT name FROM users WHERE uid = ?", tsUserId);
                    String empName = employee.isEmpty() ? "Employee" : (String) employee.get(0).get("name");

                    for (Map<String, Object> admin : admins) {
                        String adminEmail = (String) admin.get("email");
                        String adminName = (String) admin.get("name");
                        if (adminEmail != null) {
                            sendTimesheetEmail(adminEmail, adminName, empName, tsWeekStart, tsWeekEnd, String.valueOf(totalHours));
                        }
                    }
                }
            } catch (Exception e) {
                System.err.println("[Notify Admins] Failed: " + e.getMessage());
            }
        } else {
            String updateSql = "UPDATE timesheets SET " + setClause + " WHERE id = ?";
            values.add(id);
            jdbcTemplate.update(updateSql, values.toArray());
        }

        // Sync status to time cards if changed
        if (status != null) {
            jdbcTemplate.update("UPDATE time_cards SET status = ? WHERE timesheet_id = ?", status, id);
        }

        List<Map<String, Object>> updated = jdbcTemplate.queryForList("SELECT * FROM timesheets WHERE id = ?", id);
        if (updated.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(stringifyId(new HashMap<>(updated.get(0))));
    }

    // ── Timesheet DELETE ──────────────────────────────────────────────────────
    @DeleteMapping("/timesheets/{id}")
    @Transactional
    public ResponseEntity<?> deleteTimesheet(@PathVariable Long id) {
        jdbcTemplate.update("DELETE FROM time_cards WHERE timesheet_id = ?", id);
        jdbcTemplate.update("DELETE FROM timesheets WHERE id = ?", id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Timesheet deleted successfully"));
    }

    // ── Time Cards GET ────────────────────────────────────────────────────────
    @GetMapping("/time-cards")
    public ResponseEntity<?> getTimeCards(
            @RequestParam(required = false) String timesheet_id,
            @RequestParam(required = false) String user_id,
            @RequestParam(required = false) String start_date,
            @RequestParam(required = false) String end_date) {
        
        String sql = "SELECT * FROM time_cards WHERE 1=1";
        List<Object> params = new ArrayList<>();
        if (timesheet_id != null) {
            sql += " AND timesheet_id = ?";
            params.add(timesheet_id);
        }
        if (user_id != null) {
            sql += " AND user_id = ?";
            params.add(user_id);
        }
        if (start_date != null && end_date != null) {
            sql += " AND entry_date BETWEEN ? AND ?";
            params.add(start_date);
            params.add(end_date);
        }

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql, params.toArray());
        return ResponseEntity.ok(stringifyIds(rows));
    }

    // ── Time Card POST ────────────────────────────────────────────────────────
    @PostMapping("/time-cards")
    @Transactional
    public ResponseEntity<?> createTimeCard(@RequestBody Map<String, Object> body) {
        List<String> fields = new ArrayList<>();
        List<String> placeholders = new ArrayList<>();
        List<Object> values = new ArrayList<>();

        for (Map.Entry<String, Object> entry : body.entrySet()) {
            fields.add(entry.getKey());
            placeholders.add("?");
            values.add(entry.getValue());
        }

        if (fields.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Empty body"));
        }

        String insertSql = "INSERT INTO time_cards (" + String.join(", ", fields) + ") VALUES (" + String.join(", ", placeholders) + ")";
        KeyHolder keyHolder = new GeneratedKeyHolder();

        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(insertSql, Statement.RETURN_GENERATED_KEYS);
            for (int i = 0; i < values.size(); i++) {
                ps.setObject(i + 1, values.get(i));
            }
            return ps;
        }, keyHolder);

        Number key = keyHolder.getKey();
        long newId = key != null ? key.longValue() : 0;

        List<Map<String, Object>> created = jdbcTemplate.queryForList("SELECT * FROM time_cards WHERE id = ?", newId);
        if (created.isEmpty()) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to create time card"));
        }

        // Update timesheet total hours
        Object tsId = body.get("timesheet_id");
        if (tsId != null) {
            updateTimesheetHours(Long.parseLong(String.valueOf(tsId)));
        }

        return ResponseEntity.ok(stringifyId(new HashMap<>(created.get(0))));
    }

    // ── Time Card PUT ─────────────────────────────────────────────────────────
    @PutMapping("/time-cards/{id}")
    @Transactional
    public ResponseEntity<?> updateTimeCard(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        List<String> fields = new ArrayList<>();
        List<Object> values = new ArrayList<>();

        for (Map.Entry<String, Object> entry : body.entrySet()) {
            if (!"id".equals(entry.getKey())) {
                fields.add(entry.getKey() + " = ?");
                values.add(entry.getValue());
            }
        }

        if (fields.isEmpty()) {
            List<Map<String, Object>> current = jdbcTemplate.queryForList("SELECT * FROM time_cards WHERE id = ?", id);
            return ResponseEntity.ok(current.isEmpty() ? Map.of() : stringifyId(new HashMap<>(current.get(0))));
        }

        String updateSql = "UPDATE time_cards SET " + String.join(", ", fields) + " WHERE id = ?";
        values.add(id);
        jdbcTemplate.update(updateSql, values.toArray());

        List<Map<String, Object>> updated = jdbcTemplate.queryForList("SELECT * FROM time_cards WHERE id = ?", id);
        if (updated.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        // Update timesheet total hours
        Object tsId = updated.get(0).get("timesheet_id");
        if (tsId != null) {
            updateTimesheetHours(Long.parseLong(String.valueOf(tsId)));
        }

        return ResponseEntity.ok(stringifyId(new HashMap<>(updated.get(0))));
    }

    // ── Time Card DELETE ──────────────────────────────────────────────────────
    @DeleteMapping("/time-cards/{id}")
    @Transactional
    public ResponseEntity<?> deleteTimeCard(@PathVariable Long id) {
        List<Map<String, Object>> card = jdbcTemplate.queryForList("SELECT timesheet_id FROM time_cards WHERE id = ?", id);
        jdbcTemplate.update("DELETE FROM time_cards WHERE id = ?", id);

        if (!card.isEmpty()) {
            Object tsId = card.get(0).get("timesheet_id");
            if (tsId != null) {
                updateTimesheetHours(Long.parseLong(String.valueOf(tsId)));
            }
        }

        return ResponseEntity.ok(Map.of("message", "Time card deleted successfully"));
    }

    // ── Activity Sessions CRUD ───────────────────────────────────────────────
    @PostMapping("/activity-sessions")
    @Transactional
    public ResponseEntity<?> createActivitySession(@RequestBody Map<String, Object> body) {
        String sessionId = (String) body.get("session_id");
        String userId = (String) body.get("user_id");
        String userName = (String) body.get("user_name");
        String startTime = (String) body.get("start_time");
        String status = (String) body.get("status");
        String ticketNumber = (String) body.get("ticket_number");

        if (userId == null || sessionId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing user_id or session_id"));
        }

        String startStr = formatDateTimeToSql(startTime != null ? startTime : LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        String insertSql = "INSERT INTO activity_sessions (session_id, user_id, user_name, start_time, status, ticket_number) VALUES (?, ?, ?, ?, ?, ?)";
        
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(insertSql, Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, sessionId);
            ps.setString(2, userId);
            ps.setString(3, userName);
            ps.setString(4, startStr);
            ps.setString(5, status != null ? status : "active");
            ps.setString(6, ticketNumber);
            return ps;
        }, keyHolder);

        Number key = keyHolder.getKey();
        long newId = key != null ? key.longValue() : 0;

        List<Map<String, Object>> created = jdbcTemplate.queryForList("SELECT * FROM activity_sessions WHERE id = ?", newId);
        return ResponseEntity.ok(stringifyId(new HashMap<>(created.get(0))));
    }

    @PutMapping("/activity-sessions/{id}")
    @Transactional
    public ResponseEntity<?> updateActivitySession(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        List<String> fields = new ArrayList<>();
        List<Object> values = new ArrayList<>();

        for (Map.Entry<String, Object> entry : body.entrySet()) {
            if (!"id".equals(entry.getKey())) {
                fields.add(entry.getKey() + " = ?");
                Object val = entry.getValue();
                if ("start_time".equals(entry.getKey()) || "stop_time".equals(entry.getKey())) {
                    val = formatDateTimeToSql(val);
                }
                values.add(val);
            }
        }

        if (fields.isEmpty()) {
            List<Map<String, Object>> current = jdbcTemplate.queryForList("SELECT * FROM activity_sessions WHERE id = ?", id);
            return ResponseEntity.ok(current.isEmpty() ? Map.of() : stringifyId(new HashMap<>(current.get(0))));
        }

        String updateSql = "UPDATE activity_sessions SET " + String.join(", ", fields) + " WHERE id = ?";
        values.add(id);
        jdbcTemplate.update(updateSql, values.toArray());

        List<Map<String, Object>> updated = jdbcTemplate.queryForList("SELECT * FROM activity_sessions WHERE id = ?", id);
        return ResponseEntity.ok(stringifyId(new HashMap<>(updated.get(0))));
    }

    @GetMapping("/activity-sessions")
    public ResponseEntity<?> getActivitySessions(
            @RequestParam(required = false) String user_id,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String ticket_number,
            @RequestParam(defaultValue = "20") Integer limit) {
        
        String sql = "SELECT * FROM activity_sessions WHERE 1=1";
        List<Object> params = new ArrayList<>();
        if (user_id != null) {
            sql += " AND user_id = ?";
            params.add(user_id);
        }
        if (status != null) {
            sql += " AND status = ?";
            params.add(status);
        }
        if (ticket_number != null) {
            sql += " AND ticket_number = ?";
            params.add(ticket_number);
        }
        sql += " ORDER BY created_at DESC LIMIT ?";
        params.add(limit);

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql, params.toArray());
        return ResponseEntity.ok(stringifyIds(rows));
    }

    // ── Activity Entries CRUD ────────────────────────────────────────────────
    @PostMapping("/activity-entries")
    @Transactional
    public ResponseEntity<?> createActivityEntry(@RequestBody Map<String, Object> body) {
        String userId = (String) body.get("user_id");
        if (userId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing user_id"));
        }

        List<String> fields = new ArrayList<>();
        List<String> placeholders = new ArrayList<>();
        List<Object> values = new ArrayList<>();

        for (Map.Entry<String, Object> entry : body.entrySet()) {
            fields.add(entry.getKey());
            placeholders.add("?");
            Object val = entry.getValue();
            if ("captured_at".equals(entry.getKey()) || "created_at".equals(entry.getKey())) {
                val = formatDateTimeToSql(val);
            }
            values.add(val);
        }

        String insertSql = "INSERT INTO activity_entries (" + String.join(", ", fields) + ") VALUES (" + String.join(", ", placeholders) + ")";
        KeyHolder keyHolder = new GeneratedKeyHolder();

        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(insertSql, Statement.RETURN_GENERATED_KEYS);
            for (int i = 0; i < values.size(); i++) {
                ps.setObject(i + 1, values.get(i));
            }
            return ps;
        }, keyHolder);

        Number key = keyHolder.getKey();
        long newId = key != null ? key.longValue() : 0;

        List<Map<String, Object>> created = jdbcTemplate.queryForList("SELECT * FROM activity_entries WHERE id = ?", newId);
        return ResponseEntity.ok(stringifyId(new HashMap<>(created.get(0))));
    }

    @GetMapping("/activity-entries")
    public ResponseEntity<?> getActivityEntries(
            @RequestParam(required = false) String user_id,
            @RequestParam(required = false) String session_id,
            @RequestParam(required = false) String start_date,
            @RequestParam(required = false) String end_date,
            @RequestParam(defaultValue = "100") Integer limit) {
        
        String sql = "SELECT * FROM activity_entries WHERE 1=1";
        List<Object> params = new ArrayList<>();
        if (user_id != null) {
            sql += " AND user_id = ?";
            params.add(user_id);
        }
        if (session_id != null) {
            sql += " AND session_id = ?";
            params.add(session_id);
        }
        if (start_date != null) {
            sql += " AND captured_at >= ?";
            params.add(start_date);
        }
        if (end_date != null) {
            sql += " AND captured_at <= ?";
            params.add(end_date);
        }
        sql += " ORDER BY captured_at ASC LIMIT ?";
        params.add(limit);

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql, params.toArray());
        return ResponseEntity.ok(stringifyIds(rows));
    }

    @PutMapping("/activity-entries/{id}")
    @Transactional
    public ResponseEntity<?> updateActivityEntry(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        List<String> fields = new ArrayList<>();
        List<Object> values = new ArrayList<>();

        for (Map.Entry<String, Object> entry : body.entrySet()) {
            if (!"id".equals(entry.getKey()) && !"created_at".equals(entry.getKey())) {
                fields.add(entry.getKey() + " = ?");
                values.add(entry.getValue());
            }
        }

        if (fields.isEmpty()) {
            List<Map<String, Object>> current = jdbcTemplate.queryForList("SELECT * FROM activity_entries WHERE id = ?", id);
            return ResponseEntity.ok(current.isEmpty() ? Map.of() : stringifyId(new HashMap<>(current.get(0))));
        }

        String updateSql = "UPDATE activity_entries SET " + String.join(", ", fields) + " WHERE id = ?";
        values.add(id);
        jdbcTemplate.update(updateSql, values.toArray());

        List<Map<String, Object>> updated = jdbcTemplate.queryForList("SELECT * FROM activity_entries WHERE id = ?", id);
        return ResponseEntity.ok(stringifyId(new HashMap<>(updated.get(0))));
    }

    // ── Message History CRUD ──────────────────────────────────────────────────
    @PostMapping("/message-history")
    @Transactional
    public ResponseEntity<?> createMessageHistory(@RequestBody Map<String, Object> body) {
        String userId = (String) body.get("user_id");
        String messageType = (String) body.get("message_type");
        if (userId == null || messageType == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing required fields: user_id, message_type"));
        }

        List<String> fields = new ArrayList<>();
        List<String> placeholders = new ArrayList<>();
        List<Object> values = new ArrayList<>();

        for (Map.Entry<String, Object> entry : body.entrySet()) {
            fields.add(entry.getKey());
            placeholders.add("?");
            values.add(entry.getValue());
        }

        String insertSql = "INSERT INTO message_history (" + String.join(", ", fields) + ") VALUES (" + String.join(", ", placeholders) + ")";
        KeyHolder keyHolder = new GeneratedKeyHolder();

        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(insertSql, Statement.RETURN_GENERATED_KEYS);
            for (int i = 0; i < values.size(); i++) {
                ps.setObject(i + 1, values.get(i));
            }
            return ps;
        }, keyHolder);

        Number key = keyHolder.getKey();
        long newId = key != null ? key.longValue() : 0;

        List<Map<String, Object>> created = jdbcTemplate.queryForList("SELECT * FROM message_history WHERE id = ?", newId);
        return ResponseEntity.ok(stringifyId(new HashMap<>(created.get(0))));
    }

    @GetMapping("/message-history")
    public ResponseEntity<?> getMessageHistory(
            @RequestParam(required = false) String user_id,
            @RequestParam(required = false) String message_type,
            @RequestParam(defaultValue = "100") Integer limit) {
        
        String sql = "SELECT * FROM message_history WHERE 1=1";
        List<Object> params = new ArrayList<>();
        if (user_id != null) {
            sql += " AND user_id = ?";
            params.add(user_id);
        }
        if (message_type != null) {
            sql += " AND message_type = ?";
            params.add(message_type);
        }
        sql += " ORDER BY sent_at DESC LIMIT ?";
        params.add(limit);

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql, params.toArray());
        return ResponseEntity.ok(stringifyIds(rows));
    }

    // ── Helper Utilities ──────────────────────────────────────────────────────
    private void updateTimesheetHours(Long timesheetId) {
        try {
            Double total = jdbcTemplate.queryForObject(
                "SELECT SUM(hours_worked) FROM time_cards WHERE timesheet_id = ?",
                Double.class,
                timesheetId
            );
            double totalVal = total != null ? total : 0.0;
            jdbcTemplate.update("UPDATE timesheets SET total_hours = ? WHERE id = ?", totalVal, timesheetId);
        } catch (Exception e) {
            System.err.println("Failed to update timesheet hours: " + e.getMessage());
        }
    }

    private List<Map<String, Object>> stringifyIds(List<Map<String, Object>> rows) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            result.add(stringifyId(new HashMap<>(row)));
        }
        return result;
    }

    private Map<String, Object> stringifyId(Map<String, Object> row) {
        if (row != null && row.containsKey("id")) {
            row.put("id", String.valueOf(row.get("id")));
        }
        return row;
    }

    private void sendTimesheetEmail(String toEmail, String adminName, String employeeName, String weekStart, String weekEnd, String totalHours) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(toEmail);
            helper.setSubject("Timesheet Submitted: " + employeeName);
            String content = "<div style=\"font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;\">" +
                "<h2 style=\"color: #2563eb;\">Timesheet Approval Required</h2>" +
                "<p>Hello " + adminName + ",</p>" +
                "<p><strong>" + employeeName + "</strong> has submitted their timesheet for the week of " + weekStart + " for your review.</p>" +
                "<div style=\"background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #e2e8f0;\">" +
                  "<p style=\"margin: 0;\"><strong>Employee:</strong> " + employeeName + "</p>" +
                  "<p style=\"margin: 5px 0 0 0;\"><strong>Period:</strong> " + weekStart + " to " + weekEnd + "</p>" +
                  "<p style=\"margin: 5px 0 0 0;\"><strong>Total Hours:</strong> " + totalHours + "</p>" +
                "</div>" +
                "<p>This timesheet includes <strong>AI-captured screenshots and activity evidence</strong> for verification.</p>" +
                "<a href=\"http://localhost:3000/timesheet/approvals\" style=\"display: inline-block; background-color: #2563eb; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 10px;\">Review & Approve</a>" +
              "</div>";
            helper.setText(content, true);
            helper.setFrom(mailFrom, mailFromName);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send timesheet approval email to " + toEmail + ": " + e.getMessage());
        }
    }

    private String formatDateTimeToSql(Object value) {
        if (value == null) {
            return null;
        }
        String str = value.toString().trim();
        if (str.isEmpty()) {
            return null;
        }
        String replaced = str.replace('T', ' ');
        if (replaced.endsWith("Z")) {
            replaced = replaced.substring(0, replaced.length() - 1);
        }
        int dotIndex = replaced.indexOf('.');
        if (dotIndex != -1) {
            replaced = replaced.substring(0, dotIndex);
        }
        if (replaced.length() == 16) {
            replaced += ":00";
        }
        if (replaced.length() > 19) {
            replaced = replaced.substring(0, 19);
        }
        return replaced;
    }
}
