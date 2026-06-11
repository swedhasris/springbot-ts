package com.connectit.core.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AiActivityController {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final com.connectit.core.service.GeminiService geminiService;

    // ── 1. INPUT STATS ────────────────────────────────────────────────────────
    @GetMapping("/input-stats")
    public ResponseEntity<?> getInputStats() {
        return ResponseEntity.ok(Map.of("keystrokes", 0, "clicks", 0));
    }

    // ── 2. SCREEN CAPTURE & UPLOAD ─────────────────────────────────────────────
    @GetMapping("/capture-screen")
    public ResponseEntity<?> captureScreen() {
        String filename = "activity_" + System.currentTimeMillis() + ".jpeg";
        File uploadDir = new File("./public/uploads").getAbsoluteFile();
        if (!uploadDir.exists()) uploadDir.mkdirs();
        File outputFile = new File(uploadDir, filename);

        // ── Method 1: Native Windows screen capture via PowerShell (.NET) ──
        // Uses System.Drawing.Graphics.CopyFromScreen (Win32 BitBlt) — captures
        // the ENTIRE screen including taskbar, other apps, and all UI elements.
        // Completely bypasses Java AWT headless issues.
        try {
            String escapedPath = outputFile.getAbsolutePath().replace("'", "''");
            String psScript =
                "[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null; " +
                "[System.Reflection.Assembly]::LoadWithPartialName('System.Drawing') | Out-Null; " +
                "$b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds; " +
                "$bmp = New-Object System.Drawing.Bitmap $b.Width, $b.Height; " +
                "$g = [System.Drawing.Graphics]::FromImage($bmp); " +
                "$g.CopyFromScreen($b.Location, [System.Drawing.Point]::Empty, $b.Size); " +
                "$encs = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders(); " +
                "$enc = $null; " +
                "foreach ($e in $encs) { if ($e.MimeType -eq 'image/jpeg') { $enc = $e; break; } }; " +
                "if ($enc -ne $null) { " +
                "  $p = New-Object System.Drawing.Imaging.EncoderParameters(1); " +
                "  $p.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]75); " +
                "  $bmp.Save('" + escapedPath + "', $enc, $p); " +
                "  $p.Dispose(); " +
                "} else { " +
                "  $bmp.Save('" + escapedPath + "', [System.Drawing.Imaging.ImageFormat]::Jpeg); " +
                "} " +
                "$g.Dispose(); $bmp.Dispose()";

            ProcessBuilder pb = new ProcessBuilder(
                "powershell.exe", "-NoProfile", "-NonInteractive", "-Command", psScript
            );
            pb.redirectErrorStream(true);
            Process proc = pb.start();
            byte[] procOut = proc.getInputStream().readAllBytes();
            boolean finished = proc.waitFor(15, java.util.concurrent.TimeUnit.SECONDS);
            if (!finished) proc.destroyForcibly();

            if (finished && proc.exitValue() == 0 && outputFile.exists() && outputFile.length() > 5000) {
                byte[] imgBytes = java.nio.file.Files.readAllBytes(outputFile.toPath());
                String base64 = Base64.getEncoder().encodeToString(imgBytes);
                String dataUrl = "data:image/jpeg;base64," + base64;
                System.out.println("[captureScreen] PowerShell capture OK: " + filename +
                    " (" + (imgBytes.length / 1024) + " KB, " +
                    "[System.Windows.Forms.Screen]::PrimaryScreen)");
                return ResponseEntity.ok(Map.of(
                    "data_url", dataUrl,
                    "image_url", "/uploads/" + filename,
                    "filename", filename
                ));
            }
            String psOutput = new String(procOut).trim();
            System.err.println("[captureScreen] PowerShell failed. exit=" +
                (finished ? proc.exitValue() : "timeout") +
                " fileExists=" + outputFile.exists() +
                " fileSize=" + (outputFile.exists() ? outputFile.length() : 0) +
                " output=" + psOutput.substring(0, Math.min(300, psOutput.length())));
        } catch (Exception e) {
            System.err.println("[captureScreen] PowerShell error: " + e.getMessage());
        }

        // ── Method 2: java.awt.Robot (works when spring.main.headless=false) ──
        try {
            java.awt.Dimension screenSize = java.awt.Toolkit.getDefaultToolkit().getScreenSize();
            java.awt.Rectangle screenRect = new java.awt.Rectangle(screenSize);
            java.awt.Robot robot = new java.awt.Robot();
            java.awt.image.BufferedImage image = robot.createScreenCapture(screenRect);

            // Save to disk
            javax.imageio.ImageIO.write(image, "jpeg", outputFile);

            // Also produce base64 data URL
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            javax.imageio.ImageIO.write(image, "jpeg", baos);
            byte[] bytes = baos.toByteArray();
            String base64 = Base64.getEncoder().encodeToString(bytes);
            String dataUrl = "data:image/jpeg;base64," + base64;

            System.out.println("[captureScreen] Robot capture OK: " + filename +
                " (" + (bytes.length / 1024) + " KB, " + screenSize.width + "x" + screenSize.height + ")");
            return ResponseEntity.ok(Map.of(
                "data_url", dataUrl,
                "image_url", "/uploads/" + filename,
                "filename", filename
            ));
        } catch (Exception e) {
            System.err.println("[captureScreen] Robot error: " + e.getClass().getSimpleName() + ": " + e.getMessage());
        }

        // ── No capture method worked — return error (NOT a mock image) ──
        // The frontend will fall back to browser-based capture (getDisplayMedia / html2canvas)
        return ResponseEntity.status(503).body(Map.of(
            "error", "Screen capture unavailable",
            "message", "Both native PowerShell and AWT Robot capture methods failed on this server"
        ));
    }

    @PostMapping("/upload-screenshot")
    public ResponseEntity<?> uploadScreenshot(
            @RequestParam("screenshot") MultipartFile file,
            @RequestParam(value = "userId", required = false) String userId,
            @RequestParam(value = "format", required = false) String format,
            @RequestParam(value = "sizeKB", required = false) String sizeKB) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Empty file"));
            }
            String filename = file.getOriginalFilename();
            if (filename == null || filename.isBlank()) {
                filename = "screenshot_" + System.currentTimeMillis() + ".jpeg";
            }
            
            File uploadDir = new File("./public/uploads").getAbsoluteFile();
            if (!uploadDir.exists()) uploadDir.mkdirs();
            File destination = new File(uploadDir, filename);
            
            java.nio.file.Files.copy(
                file.getInputStream(), 
                destination.toPath(), 
                java.nio.file.StandardCopyOption.REPLACE_EXISTING
            );
            
            return ResponseEntity.ok(Map.of("image_url", "/uploads/" + filename));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // ── 3. SETTINGS GROUPS CRUD ───────────────────────────────────────────────
    @GetMapping("/settings_groups")
    public ResponseEntity<?> getSettingsGroups() {
        try {
            List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT * FROM settings_groups ORDER BY name ASC");
            return ResponseEntity.ok(stringifyIds(rows));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/settings_groups")
    @Transactional
    public ResponseEntity<?> createSettingsGroup(@RequestBody Map<String, Object> body) {
        try {
            String id = (String) body.get("id");
            if (id == null) {
                id = "sg_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8);
            }
            String name = (String) body.get("name");
            String description = (String) body.get("description");
            String managerUid = (String) body.get("manager_uid");
            if (managerUid == null) managerUid = (String) body.get("managerUid");
            String managerName = (String) body.get("manager_name");
            if (managerName == null) managerName = (String) body.get("managerName");
            String assignmentEmail = (String) body.get("assignment_email");
            if (assignmentEmail == null) assignmentEmail = (String) body.get("assignmentEmail");
            
            Boolean isActive = parseBoolean(body.getOrDefault("is_active", body.getOrDefault("isActive", true)));

            jdbcTemplate.update(
                "INSERT INTO settings_groups (id, name, description, manager_uid, manager_name, assignment_email, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
                id, name, description, managerUid, managerName, assignmentEmail, isActive ? 1 : 0
            );

            List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT * FROM settings_groups WHERE id = ?", id);
            return ResponseEntity.ok(stringifyId(new HashMap<>(rows.get(0))));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/settings_groups/{id}")
    @Transactional
    public ResponseEntity<?> updateSettingsGroup(@PathVariable String id, @RequestBody Map<String, Object> body) {
        try {
            List<String> fields = new ArrayList<>();
            List<Object> values = new ArrayList<>();

            for (Map.Entry<String, Object> entry : body.entrySet()) {
                String key = entry.getKey();
                if ("id".equals(key) || "created_at".equals(key) || "updated_at".equals(key)) {
                    continue;
                }
                String dbColumn = key;
                if ("managerUid".equals(key)) dbColumn = "manager_uid";
                else if ("managerName".equals(key)) dbColumn = "manager_name";
                else if ("assignmentEmail".equals(key)) dbColumn = "assignment_email";
                else if ("isActive".equals(key)) dbColumn = "is_active";
                else if ("is_active".equals(key)) dbColumn = "is_active";

                fields.add(dbColumn + " = ?");
                if ("is_active".equals(dbColumn)) {
                    values.add(parseBoolean(entry.getValue()) ? 1 : 0);
                } else {
                    values.add(entry.getValue());
                }
            }

            if (!fields.isEmpty()) {
                String updateSql = "UPDATE settings_groups SET " + String.join(", ", fields) + " WHERE id = ?";
                values.add(id);
                jdbcTemplate.update(updateSql, values.toArray());
            }

            List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT * FROM settings_groups WHERE id = ?", id);
            if (rows.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(stringifyId(new HashMap<>(rows.get(0))));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/settings_groups/{id}")
    @Transactional
    public ResponseEntity<?> deleteSettingsGroup(@PathVariable String id) {
        try {
            jdbcTemplate.update("DELETE FROM settings_groups WHERE id = ?", id);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // ── 4. WORK NOTES CRUD ────────────────────────────────────────────────────
    @GetMapping("/work-notes")
    public ResponseEntity<?> getWorkNotes(
            @RequestParam(required = false) String user_id,
            @RequestParam(required = false) String ticket_id,
            @RequestParam(defaultValue = "50") Integer limit) {
        try {
            String sql = "SELECT * FROM work_notes WHERE 1=1";
            List<Object> params = new ArrayList<>();
            if (user_id != null) {
                sql += " AND user_id = ?";
                params.add(user_id);
            }
            if (ticket_id != null) {
                sql += " AND ticket_id = ?";
                params.add(ticket_id);
            }
            sql += " ORDER BY created_at ASC LIMIT ?";
            params.add(limit);

            List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql, params.toArray());
            List<Map<String, Object>> results = new ArrayList<>();

            for (Map<String, Object> row : rows) {
                Map<String, Object> result = new HashMap<>();
                result.put("id", String.valueOf(row.get("id")));
                result.put("ticket_id", row.get("ticket_id"));
                result.put("user_id", row.get("user_id"));
                result.put("user_name", row.get("user_name"));
                
                Object createdAtObj = row.get("created_at");
                if (createdAtObj != null) {
                    result.put("created_at", createdAtObj.toString());
                }

                String noteContent = (String) row.get("note");
                if (noteContent != null && noteContent.startsWith("{")) {
                    try {
                        Map<?, ?> parsed = objectMapper.readValue(noteContent, Map.class);
                        for (Map.Entry<?, ?> entry : parsed.entrySet()) {
                            result.put(String.valueOf(entry.getKey()), entry.getValue());
                        }
                    } catch (Exception ex) {
                        result.put("ai_note", noteContent);
                    }
                } else {
                    result.put("ai_note", noteContent);
                }
                results.add(result);
            }
            return ResponseEntity.ok(results);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/work-notes")
    @Transactional
    public ResponseEntity<?> createWorkNote(@RequestBody Map<String, Object> body) {
        try {
            String userId = (String) body.get("user_id");
            String userName = (String) body.get("user_name");
            String ticketId = (String) body.get("ticket_id");
            if (ticketId == null) ticketId = (String) body.get("ticketId");
            if (ticketId == null || ticketId.isBlank()) {
                ticketId = "0"; // safe default for NOT NULL constraint
            }

            String serializedNote = objectMapper.writeValueAsString(body);

            String sql = "INSERT INTO work_notes (ticket_id, user_id, user_name, note, is_internal) VALUES (?, ?, ?, ?, ?)";
            KeyHolder keyHolder = new GeneratedKeyHolder();
            String finalTicketId = ticketId;
            jdbcTemplate.update(connection -> {
                PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
                ps.setString(1, finalTicketId);
                ps.setString(2, userId);
                ps.setString(3, userName);
                ps.setString(4, serializedNote);
                ps.setInt(5, 1); // internal
                return ps;
            }, keyHolder);

            Number key = keyHolder.getKey();
            long newId = key != null ? key.longValue() : 0;

            Map<String, Object> res = new HashMap<>(body);
            res.put("id", String.valueOf(newId));
            res.put("created_at", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // ── 5. WORK SESSIONS ──────────────────────────────────────────────────────
    @PostMapping("/work-sessions")
    @Transactional
    public ResponseEntity<?> createWorkSession(@RequestBody Map<String, Object> body) {
        try {
            String userId = (String) body.get("user_id");
            String userName = (String) body.get("user_name");
            String ticketId = (String) body.get("ticket_id");
            if (ticketId == null) ticketId = (String) body.get("ticketId");
            
            String startTimeStr = (String) body.get("start_time");
            String endTimeStr = (String) body.get("stop_time");
            if (endTimeStr == null) endTimeStr = (String) body.get("end_time");
            
            Number durationNum = (Number) body.get("duration");
            int duration = durationNum != null ? durationNum.intValue() : 0;
            
            String notes = objectMapper.writeValueAsString(body);

            String sql = "INSERT INTO work_sessions (ticket_id, user_id, user_name, session_type, start_time, end_time, duration, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
            KeyHolder keyHolder = new GeneratedKeyHolder();
            String finalTicketId = ticketId;
            String finalStartTime = formatDateTimeToSql(startTimeStr);
            String finalEndTime = formatDateTimeToSql(endTimeStr);

            jdbcTemplate.update(connection -> {
                PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
                ps.setString(1, finalTicketId);
                ps.setString(2, userId);
                ps.setString(3, userName);
                ps.setString(4, "work");
                ps.setString(5, finalStartTime);
                ps.setString(6, finalEndTime);
                ps.setInt(7, duration);
                ps.setString(8, notes);
                return ps;
            }, keyHolder);

            Number key = keyHolder.getKey();
            long newId = key != null ? key.longValue() : 0;

            Map<String, Object> res = new HashMap<>(body);
            res.put("id", String.valueOf(newId));
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // ── 6. AI MOCKS / OFFLINE APIS ─────────────────────────────────────────────
    @PostMapping("/ai/analyze-activity")
    public ResponseEntity<?> analyzeActivity(@RequestBody Map<String, Object> body) {
        String appName = (String) body.getOrDefault("appName", "");
        String pageTitle = (String) body.getOrDefault("pageTitle", "");
        String pageUrl = (String) body.getOrDefault("pageUrl", "");
        if (pageUrl == null || pageUrl.isEmpty()) {
            pageUrl = (String) body.getOrDefault("pagePath", "");
        }
        String screenshotUrl = (String) body.get("screenshot_url");
        if (screenshotUrl == null) screenshotUrl = (String) body.get("screenshotUrl");

        String base64Image = null;
        if (screenshotUrl != null && screenshotUrl.startsWith("/uploads/")) {
            File imgFile = new File("./public" + screenshotUrl).getAbsoluteFile();
            if (imgFile.exists() && imgFile.isFile()) {
                try {
                    byte[] fileContent = java.nio.file.Files.readAllBytes(imgFile.toPath());
                    base64Image = Base64.getEncoder().encodeToString(fileContent);
                } catch (Exception e) {
                    System.err.println("[AiActivityController] Failed to read screenshot file: " + e.getMessage());
                }
            }
        }

        // Build prompt
        String prompt = "You are an AI activity tracking assistant.\n" +
                "Analyze the user's current work activity using the provided metadata and screenshot (if available).\n" +
                "Determine:\n" +
                "1. The activity category. Choose EXACTLY one from: [\"Ticket Work\", \"Documentation\", \"System Maintenance\", \"Meeting\", \"Communication\", \"General Work\"].\n" +
                "2. A short, professional, specific one-sentence description of the user's active task (e.g., \"Reviewing incident ticket details on ConnectIT\", \"Writing code in Visual Studio Code\", \"Communicating with team in Slack\").\n" +
                "3. A confidence score between 0.0 and 1.0.\n" +
                "4. The detected application name.\n" +
                "5. The detected website domain/name (if browser is active).\n\n" +
                "Metadata:\n" +
                "Application Name: " + appName + "\n" +
                "Window Title/Page Title: " + pageTitle + "\n" +
                "Page URL/Path: " + pageUrl + "\n" +
                "Ticket Number: " + body.getOrDefault("ticketNumber", "None") + "\n" +
                "Page Headings: " + body.getOrDefault("headings", "") + "\n" +
                "Input Stats: keys=" + body.getOrDefault("recentKeys", 0) + ", clicks=" + body.getOrDefault("recentClicks", "") + "\n" +
                "Badges: " + body.getOrDefault("badges", "") + "\n" +
                "Visible Text: " + body.getOrDefault("visibleText", "") + "\n\n" +
                "Output in JSON format with these exact keys:\n" +
                "{\n" +
                "  \"activity\": \"Ticket Work\",\n" +
                "  \"description\": \"...\",\n" +
                "  \"confidence\": 0.95,\n" +
                "  \"detected_app\": \"...\",\n" +
                "  \"detected_website\": \"...\"\n" +
                "}";

        String responseText = geminiService.generateContent(prompt, base64Image, "image/jpeg", true);
        if (responseText != null) {
            try {
                String cleanJson = cleanJsonString(responseText);
                Map<?, ?> parsed = objectMapper.readValue(cleanJson, Map.class);
                return ResponseEntity.ok(parsed);
            } catch (Exception e) {
                System.err.println("[AiActivityController] Failed to parse Gemini response: " + e.getMessage());
            }
        }

        // Local keyword heuristic fallback if Gemini is unavailable
        String activity = "General Work";
        String description = "Working on " + appName;
        
        String lowerApp = appName.toLowerCase();
        String lowerTitle = pageTitle.toLowerCase();
        
        if (lowerApp.contains("code") || lowerApp.contains("cursor") || lowerApp.contains("kiro") || lowerApp.contains("ide") || lowerApp.contains("studio")) {
            activity = "Ticket Work";
            description = "Writing and debugging code in editor";
        } else if (lowerTitle.contains("ticket") || lowerTitle.contains("incident") || lowerTitle.contains("inc")) {
            activity = "Ticket Work";
            description = "Reviewing ticket details in Connect IT";
        } else if (lowerApp.contains("gmail") || lowerApp.contains("mail") || lowerApp.contains("outlook")) {
            activity = "Communication";
            description = "Reading and responding to customer emails";
        } else if (lowerApp.contains("slack") || lowerApp.contains("teams") || lowerApp.contains("discord")) {
            activity = "Communication";
            description = "Team coordination and messaging";
        } else if (lowerApp.contains("meet") || lowerApp.contains("zoom") || lowerApp.contains("calendar")) {
            activity = "Meeting";
            description = "Attending calendar events / meeting";
        } else if (lowerTitle.contains("timesheet")) {
            activity = "Timesheet Entry";
            description = "Entering and submitting work hours";
        } else if (lowerTitle.contains("doc") || lowerTitle.contains("wiki") || lowerTitle.contains("confluence") || lowerTitle.contains("notes")) {
            activity = "Documentation";
            description = "Reading or writing documentation";
        }

        return ResponseEntity.ok(Map.of(
            "activity", activity,
            "description", description,
            "confidence", 0.95,
            "detected_app", appName,
            "detected_website", body.getOrDefault("pageUrl", "")
        ));
    }

    @PostMapping("/ai/generate-summary")
    public ResponseEntity<?> generateSummary(@RequestBody Map<String, Object> body) {
        List<?> sessionData = (List<?>) body.getOrDefault("session_data", List.of());
        Number durationSec = (Number) body.getOrDefault("duration_seconds", 0);
        int mins = durationSec.intValue() / 60;
        
        String fallbackSummary = "During this session of " + mins + " minutes, you worked on resolving tickets, communicating with the team, and documenting tasks. Main tools used were Web Browser and code editor.";
        if (!sessionData.isEmpty()) {
            fallbackSummary = "Activity session summary: Tracked " + sessionData.size() + " updates. Main focus was on resolving incidents, documentation, and coordination.";
        }

        try {
            String prompt = "You are an AI timesheet assistant.\n" +
                    "Summarize the following session of tracked work activity:\n" +
                    "Duration: " + mins + " minutes.\n" +
                    "Activity logs:\n" +
                    objectMapper.writeValueAsString(sessionData) + "\n\n" +
                    "Write a clear, professional, concise two-sentence summary of what was accomplished during this session.\n" +
                    "Format the output as a JSON object with a single key 'summary':\n" +
                    "{\n" +
                    "  \"summary\": \"During this session of X minutes, you worked on...\"\n" +
                    "}";

            String responseText = geminiService.generateContent(prompt, null, null, true);
            if (responseText != null) {
                String cleanJson = cleanJsonString(responseText);
                Map<?, ?> parsed = objectMapper.readValue(cleanJson, Map.class);
                String geminiSummary = (String) parsed.get("summary");
                if (geminiSummary != null && !geminiSummary.trim().isEmpty()) {
                    return ResponseEntity.ok(Map.of("summary", geminiSummary));
                }
            }
        } catch (Exception e) {
            System.err.println("[AiActivityController] Failed to generate Gemini summary: " + e.getMessage());
        }

        return ResponseEntity.ok(Map.of("summary", fallbackSummary));
    }

    @PostMapping("/ai/classify")
    public ResponseEntity<?> classify(@RequestBody Map<String, Object> textBody) {
        String text = (String) textBody.getOrDefault("text", "");
        
        String fallbackCategory = "Software";
        String fallbackPriority = "Low";
        String lower = text.toLowerCase();
        if (lower.contains("crash") || lower.contains("error") || lower.contains("fail")) {
            fallbackCategory = "Software";
            fallbackPriority = "High";
        } else if (lower.contains("password") || lower.contains("login") || lower.contains("account")) {
            fallbackCategory = "Access Control";
            fallbackPriority = "Medium";
        } else if (lower.contains("network") || lower.contains("wifi") || lower.contains("internet")) {
            fallbackCategory = "Network";
            fallbackPriority = "High";
        } else if (lower.contains("printer") || lower.contains("hardware") || lower.contains("laptop")) {
            fallbackCategory = "Hardware";
            fallbackPriority = "Medium";
        }

        String prompt = "Classify the following IT support ticket:\n" +
                "Ticket Text: \"" + text + "\"\n\n" +
                "Determine:\n" +
                "1. Category. Choose one from: [\"Software\", \"Hardware\", \"Network\", \"Access Control\", \"Other\"].\n" +
                "2. Priority. Choose one from: [\"1 - Critical\", \"2 - High\", \"3 - Moderate\", \"4 - Low\"].\n\n" +
                "Output in JSON format with these exact keys:\n" +
                "{\n" +
                "  \"category\": \"...\",\n" +
                "  \"priority\": \"...\"\n" +
                "}";

        String responseText = geminiService.generateContent(prompt, null, null, true);
        if (responseText != null) {
            try {
                String cleanJson = cleanJsonString(responseText);
                Map<?, ?> parsed = objectMapper.readValue(cleanJson, Map.class);
                return ResponseEntity.ok(parsed);
            } catch (Exception e) {
                System.err.println("[AiActivityController] Failed to parse Gemini classification: " + e.getMessage());
            }
        }

        return ResponseEntity.ok(Map.of("category", fallbackCategory, "priority", fallbackPriority));
    }

    @PostMapping("/ai/suggest")
    public ResponseEntity<?> suggest(@RequestBody Map<String, Object> textBody) {
        String text = (String) textBody.getOrDefault("text", "");
        String fallbackSuggestion = "User reported: " + text + ".\n\nProposed Resolution steps:\n1. Verify error details and logs.\n2. Confirm database connection and access rights.\n3. Reset settings and clear local cache.\n4. Test flow to verify fix.";

        String prompt = "Analyze this IT support ticket:\n" +
                "Ticket Text: \"" + text + "\"\n\n" +
                "Provide a professional, concise, structured list of suggested resolution steps.\n" +
                "Output in JSON format with a single key 'suggestion':\n" +
                "{\n" +
                "  \"suggestion\": \"...\"\n" +
                "}";

        String responseText = geminiService.generateContent(prompt, null, null, true);
        if (responseText != null) {
            try {
                String cleanJson = cleanJsonString(responseText);
                Map<?, ?> parsed = objectMapper.readValue(cleanJson, Map.class);
                return ResponseEntity.ok(parsed);
            } catch (Exception e) {
                System.err.println("[AiActivityController] Failed to parse Gemini suggestion: " + e.getMessage());
            }
        }

        return ResponseEntity.ok(Map.of("suggestion", fallbackSuggestion));
    }

    @PostMapping("/ai/chat")
    public ResponseEntity<?> chat(@RequestBody Map<String, Object> chatBody) {
        String message = (String) chatBody.getOrDefault("message", "");
        List<?> history = (List<?>) chatBody.getOrDefault("history", List.of());
        
        String fallbackResponse = "Thanks for asking! I'm Kiru, your assistant. I am analyzing: \"" + message + "\". Based on your context, please make sure your SLA policies are updated and that database tables have channel columns properly defined.";

        try {
            String prompt = "You are Kiru, an AI assistant for ConnectIT / Nexus, an advanced IT ticketing and timesheet platform.\n" +
                    "Help the user with their question. Be professional, friendly, and concise.\n" +
                    "Conversation History:\n" +
                    objectMapper.writeValueAsString(history) + "\n\n" +
                    "Current User Message: \"" + message + "\"\n\n" +
                    "Output in JSON format with a single key 'response':\n" +
                    "{\n" +
                    "  \"response\": \"...\"\n" +
                    "}";

            String responseText = geminiService.generateContent(prompt, null, null, true);
            if (responseText != null) {
                String cleanJson = cleanJsonString(responseText);
                Map<?, ?> parsed = objectMapper.readValue(cleanJson, Map.class);
                return ResponseEntity.ok(parsed);
            }
        } catch (Exception e) {
            System.err.println("[AiActivityController] Failed to get chat response from Gemini: " + e.getMessage());
        }

        return ResponseEntity.ok(Map.of("response", fallbackResponse));
    }

    @PostMapping("/ai/generate-notes")
    public ResponseEntity<?> generateNotes(@RequestBody Map<String, Object> noteBody) {
        String context = (String) noteBody.get("context");
        String ticketNumber = (String) noteBody.get("ticketNumber");
        String ticketTitle = (String) noteBody.get("ticketTitle");
        
        String fallbackNote = "Worked on incident " + ticketNumber + " (" + ticketTitle + ") — verified state and details.";
        if ("start".equals(context)) {
            fallbackNote = "Started troubleshooting session for ticket " + ticketNumber + ": " + ticketTitle;
        } else if ("stop".equals(context)) {
            Number duration = (Number) noteBody.get("durationSeconds");
            String timeStr = duration != null ? (duration.intValue() / 60) + "m " + (duration.intValue() % 60) + "s" : "";
            fallbackNote = "Concluded work session on ticket " + ticketNumber + " after " + timeStr + ". Completed analysis.";
        }

        String prompt = "Generate professional, brief internal work notes for ticket " + ticketNumber + ": " + ticketTitle + ".\n" +
                "Context: " + context + " (e.g. start means starting troubleshooting, stop means concluding work).\n" +
                "Session Duration: " + noteBody.getOrDefault("durationSeconds", 0) + " seconds.\n\n" +
                "Output in JSON format with a single key 'note':\n" +
                "{\n" +
                "  \"note\": \"...\"\n" +
                "}";

        String responseText = geminiService.generateContent(prompt, null, null, true);
        if (responseText != null) {
            try {
                String cleanJson = cleanJsonString(responseText);
                Map<?, ?> parsed = objectMapper.readValue(cleanJson, Map.class);
                return ResponseEntity.ok(parsed);
            } catch (Exception e) {
                System.err.println("[AiActivityController] Failed to parse notes from Gemini: " + e.getMessage());
            }
        }

        return ResponseEntity.ok(Map.of("note", fallbackNote));
    }

    @PostMapping("/ai/analyze-work")
    public ResponseEntity<?> analyzeWork(@RequestBody Map<String, Object> workBody) {
        String action = (String) workBody.get("action");
        String ticketNumber = (String) workBody.get("ticketNumber");
        String ticketTitle = (String) workBody.get("ticketTitle");
        Number elapsed = (Number) workBody.get("elapsedTime");
        int elapsedVal = elapsed != null ? elapsed.intValue() : 0;
        
        String fallbackSummary = "Analyzing incident " + ticketNumber + ": " + ticketTitle;
        if ("start".equals(action)) {
            fallbackSummary = "Investigating incident " + ticketNumber + ": " + ticketTitle;
        } else if ("stop".equals(action)) {
            fallbackSummary = "Finished working on incident " + ticketNumber + ": " + ticketTitle + " (" + (elapsedVal / 60) + "m " + (elapsedVal % 60) + "s)";
        }

        String prompt = "Analyze this ticket work session:\n" +
                "Ticket: " + ticketNumber + ": " + ticketTitle + "\n" +
                "Action: " + action + "\n" +
                "Elapsed Time: " + elapsedVal + " seconds\n\n" +
                "Return a JSON object with these exact keys:\n" +
                "{\n" +
                "  \"summary\": \"...\",\n" +
                "  \"activityType\": \"ticket_resolution\",\n" +
                "  \"confidence\": 0.95,\n" +
                "  \"actionVerb\": \"...\",\n" +
                "  \"detectedActivities\": [\"...\"]\n" +
                "}";

        String responseText = geminiService.generateContent(prompt, null, null, true);
        if (responseText != null) {
            try {
                String cleanJson = cleanJsonString(responseText);
                Map<?, ?> parsed = objectMapper.readValue(cleanJson, Map.class);
                return ResponseEntity.ok(parsed);
            } catch (Exception e) {
                System.err.println("[AiActivityController] Failed to parse work analysis from Gemini: " + e.getMessage());
            }
        }
        
        return ResponseEntity.ok(Map.of(
            "summary", fallbackSummary,
            "activityType", "ticket_resolution",
            "confidence", 0.95,
            "actionVerb", "start".equals(action) ? "Investigated" : "Finished",
            "detectedActivities", List.of("Ticket work")
        ));
    }

    private String cleanJsonString(String responseText) {
        if (responseText == null) return null;
        String clean = responseText.trim();
        if (clean.startsWith("```")) {
            int firstLineBreak = clean.indexOf('\n');
            if (firstLineBreak != -1) {
                clean = clean.substring(firstLineBreak + 1);
            }
            if (clean.endsWith("```")) {
                clean = clean.substring(0, clean.length() - 3);
            }
            clean = clean.trim();
        }
        return clean;
    }

    // ── PRIVATE UTILITIES ─────────────────────────────────────────────────────
    private boolean parseBoolean(Object val) {
        if (val == null) return false;
        if (val instanceof Boolean) return (Boolean) val;
        if (val instanceof Number) return ((Number) val).intValue() != 0;
        String s = val.toString().trim();
        return "true".equalsIgnoreCase(s) || "1".equals(s);
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
