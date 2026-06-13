package com.connectit.core.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class MasterController {

    private static final Logger log = LoggerFactory.getLogger(MasterController.class);

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final List<String> VALID_MASTER_TABLES = List.of(
        "mst_groups", "mst_statuses", "mst_roles", "mst_departments",
        "mst_ticket_types", "mst_projects", "mst_priorities",
        "mst_sources", "mst_tags", "mst_categories", "mst_subcategories",
        "mst_providences", "mst_members"
    );

    // ── Helper to check Admin Access ──────────────────────────────────────────
    private boolean checkAdminAccess(String uid, String email) {
        List<String> fallbackEmails = List.of("arun@technosprint.net", "ulter@technosprint.net", "admin@technosprint.net");
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

    private boolean isAuthorized(String headerUid, String headerEmail, String queryUid, String queryEmail) {
        String uid = headerUid != null ? headerUid : queryUid;
        String email = headerEmail != null ? headerEmail : queryEmail;
        if (uid == null || uid.isBlank()) {
            var auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null) {
                uid = auth.getName();
            }
        }
        return checkAdminAccess(uid, email);
    }

    // ── Custom Dropdowns Endpoints ────────────────────────────────────────────
    @GetMapping("/custom-dropdowns")
    public ResponseEntity<?> getCustomDropdowns() {
        try {
            List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT * FROM custom_dropdowns ORDER BY created_at ASC");
            List<Map<String, Object>> result = new ArrayList<>();
            for (Map<String, Object> r : rows) {
                Map<String, Object> m = new HashMap<>();
                m.put("id", r.get("id"));
                m.put("name", r.get("name"));
                m.put("label", r.get("label"));
                m.put("options", parseJsonArray((String) r.get("options_json")));
                m.put("enabledForAll", parseBoolean(r.get("enabled_for_all")));
                m.put("enabledCompanyIds", parseJsonArray((String) r.get("enabled_company_ids_json")));
                m.put("isRequired", parseBoolean(r.get("is_required")));
                m.put("isActive", parseBoolean(r.get("is_active")));
                m.put("createdAt", r.get("created_at"));
                result.add(m);
            }
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/custom-dropdowns")
    @Transactional
    public ResponseEntity<?> createCustomDropdown(@RequestBody Map<String, Object> body) {
        try {
            String id = "dd_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8);
            String name = (String) body.get("name");
            String label = (String) body.get("label");
            Object options = body.getOrDefault("options", List.of());
            boolean enabledForAll = parseBoolean(body.getOrDefault("enabledForAll", true));
            Object enabledCompanyIds = body.getOrDefault("enabledCompanyIds", List.of());
            boolean isRequired = parseBoolean(body.getOrDefault("isRequired", false));
            boolean isActive = parseBoolean(body.getOrDefault("isActive", true));

            jdbcTemplate.update(
                "INSERT INTO custom_dropdowns (id, name, label, options_json, enabled_for_all, enabled_company_ids_json, is_required, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                id, name, label, toJsonString(options), enabledForAll ? 1 : 0, toJsonString(enabledCompanyIds), isRequired ? 1 : 0, isActive ? 1 : 0
            );

            Map<String, Object> res = new HashMap<>();
            res.put("id", id);
            res.put("name", name);
            res.put("label", label);
            res.put("options", options);
            res.put("enabledForAll", enabledForAll);
            res.put("enabledCompanyIds", enabledCompanyIds);
            res.put("isRequired", isRequired);
            res.put("isActive", isActive);
            res.put("createdAt", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/custom-dropdowns/{id}")
    @Transactional
    public ResponseEntity<?> updateCustomDropdown(@PathVariable String id, @RequestBody Map<String, Object> body) {
        try {
            String name = (String) body.get("name");
            String label = (String) body.get("label");
            Object options = body.getOrDefault("options", List.of());
            boolean enabledForAll = parseBoolean(body.getOrDefault("enabledForAll", true));
            Object enabledCompanyIds = body.getOrDefault("enabledCompanyIds", List.of());
            boolean isRequired = parseBoolean(body.getOrDefault("isRequired", false));
            boolean isActive = parseBoolean(body.getOrDefault("isActive", true));

            String nowStr = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            jdbcTemplate.update(
                "UPDATE custom_dropdowns SET name=?, label=?, options_json=?, enabled_for_all=?, enabled_company_ids_json=?, is_required=?, is_active=?, updated_at=? WHERE id=?",
                name, label, toJsonString(options), enabledForAll ? 1 : 0, toJsonString(enabledCompanyIds), isRequired ? 1 : 0, isActive ? 1 : 0, nowStr, id
            );

            Map<String, Object> res = new HashMap<>();
            res.put("id", id);
            res.put("name", name);
            res.put("label", label);
            res.put("options", options);
            res.put("enabledForAll", enabledForAll);
            res.put("enabledCompanyIds", enabledCompanyIds);
            res.put("isRequired", isRequired);
            res.put("isActive", isActive);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/custom-dropdowns/{id}")
    @Transactional
    public ResponseEntity<?> deleteCustomDropdown(@PathVariable String id) {
        try {
            jdbcTemplate.update("DELETE FROM custom_dropdowns WHERE id = ?", id);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/custom-dropdowns/active")
    public ResponseEntity<?> getActiveCustomDropdowns(@RequestParam(required = false) String company_id) {
        try {
            List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT * FROM custom_dropdowns WHERE is_active = 1 ORDER BY created_at ASC");
            List<Map<String, Object>> result = new ArrayList<>();
            for (Map<String, Object> r : rows) {
                boolean enabledForAll = parseBoolean(r.get("enabled_for_all"));
                List<?> enabledCompanyIds = parseJsonArray((String) r.get("enabled_company_ids_json"));

                if (company_id == null && enabledForAll) {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id", r.get("id"));
                    m.put("name", r.get("name"));
                    m.put("label", r.get("label"));
                    m.put("options", parseJsonArray((String) r.get("options_json")));
                    m.put("enabledForAll", enabledForAll);
                    m.put("isRequired", parseBoolean(r.get("is_required")));
                    result.add(m);
                } else if (company_id != null && (enabledForAll || enabledCompanyIds.contains(company_id))) {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id", r.get("id"));
                    m.put("name", r.get("name"));
                    m.put("label", r.get("label"));
                    m.put("options", parseJsonArray((String) r.get("options_json")));
                    m.put("enabledForAll", enabledForAll);
                    m.put("isRequired", parseBoolean(r.get("is_required")));
                    result.add(m);
                }
            }
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }


    // ── Feature Permissions API ───────────────────────────────────────────────
    @GetMapping("/feature-permissions")
    public ResponseEntity<?> getFeaturePermissions(@RequestParam(required = false) String company_id) {
        try {
            if (company_id == null || company_id.trim().isEmpty() || "undefined".equals(company_id) || "null".equals(company_id)) {
                return ResponseEntity.ok(new ArrayList<>());
            }
            List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT * FROM company_feature_permissions WHERE company_id = ?", company_id);
            List<Map<String, Object>> result = new ArrayList<>();
            for (Map<String, Object> r : rows) {
                Map<String, Object> m = new HashMap<>();
                m.put("companyId", r.get("company_id"));
                m.put("featureId", r.get("feature_id"));
                m.put("canView", parseBoolean(r.get("can_view")));
                m.put("canUse", parseBoolean(r.get("can_use")));
                m.put("canEdit", parseBoolean(r.get("can_edit")));
                m.put("isMandatory", parseBoolean(r.get("is_mandatory")));
                m.put("status", r.get("status") != null ? r.get("status") : "enabled");
                result.add(m);
            }
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Error retrieving company feature permissions: {}", e.getMessage(), e);
            return ResponseEntity.ok(new ArrayList<>()); // Fallback: return HTTP 200 and [] instead of 500
        }
    }

    @PostMapping("/feature-permissions")
    @Transactional
    public ResponseEntity<?> saveFeaturePermissions(@RequestBody Map<String, Object> body) {
        try {
            String companyId = (String) body.get("companyId");
            String featureId = (String) body.get("featureId");
            boolean canView = parseBoolean(body.get("canView"));
            boolean canUse = parseBoolean(body.get("canUse"));
            boolean canEdit = parseBoolean(body.get("canEdit"));
            boolean isMandatory = parseBoolean(body.get("isMandatory"));
            String status = (String) body.get("status");

            if (companyId == null || featureId == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Missing required fields"));
            }

            List<Map<String, Object>> existing = jdbcTemplate.queryForList(
                "SELECT id FROM company_feature_permissions WHERE company_id = ? AND feature_id = ?", companyId, featureId
            );

            if (!existing.isEmpty()) {
                jdbcTemplate.update(
                    "UPDATE company_feature_permissions SET can_view=?, can_use=?, can_edit=?, is_mandatory=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE company_id=? AND feature_id=?",
                    canView ? 1 : 0, canUse ? 1 : 0, canEdit ? 1 : 0, isMandatory ? 1 : 0, status != null ? status : "enabled", companyId, featureId
                );
            } else {
                jdbcTemplate.update(
                    "INSERT INTO company_feature_permissions (company_id, feature_id, can_view, can_use, can_edit, is_mandatory, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    companyId, featureId, canView ? 1 : 0, canUse ? 1 : 0, canEdit ? 1 : 0, isMandatory ? 1 : 0, status != null ? status : "enabled"
                );
            }
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            log.error("Error saving company feature permissions: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // ── Incident Categories API ───────────────────────────────────────────────
    @GetMapping("/incident-categories")
    public ResponseEntity<?> getIncidentCategories(
            @RequestParam(required = false, name = "active_only") String activeOnlyStr,
            @RequestParam(required = false) String uid,
            @RequestParam(required = false) String email,
            @RequestHeader(required = false, name = "x-user-uid") String headerUid,
            @RequestHeader(required = false, name = "x-user-email") String headerEmail) {
        
        try {
            boolean activeOnly = "true".equalsIgnoreCase(activeOnlyStr);
            if (!activeOnly) {
                if (!isAuthorized(headerUid, headerEmail, uid, email)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Unauthorized role"));
                }
            }

            String sql = "SELECT * FROM incident_categories";
            if (activeOnly) {
                sql += " WHERE status = 'Active'";
            }
            sql += " ORDER BY name ASC";

            List<Map<String, Object>> list = jdbcTemplate.queryForList(sql);
            return ResponseEntity.ok(stringifyIds(list));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/incident-categories")
    @Transactional
    public ResponseEntity<?> createIncidentCategory(
            @RequestBody Map<String, Object> body,
            @RequestParam(required = false) String uid,
            @RequestParam(required = false) String email,
            @RequestHeader(required = false, name = "x-user-uid") String headerUid,
            @RequestHeader(required = false, name = "x-user-email") String headerEmail) {
        
        try {
            if (!isAuthorized(headerUid, headerEmail, uid, email)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Unauthorized role"));
            }

            String name = (String) body.get("name");
            String description = (String) body.get("description");
            String status = (String) body.getOrDefault("status", "Active");
            String createdBy = (String) body.get("created_by");

            if (name == null || name.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Category name is required"));
            }

            name = name.trim();
            List<Map<String, Object>> existing = jdbcTemplate.queryForList("SELECT id FROM incident_categories WHERE LOWER(name) = ?", name.toLowerCase());
            if (!existing.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "This category already exists"));
            }

            String insertSql = "INSERT INTO incident_categories (name, description, status, created_by, last_updated_by) VALUES (?, ?, ?, ?, ?)";
            KeyHolder keyHolder = new GeneratedKeyHolder();
            String finalName = name;
            String finalCreatedBy = createdBy != null ? createdBy : "Admin";
            jdbcTemplate.update(connection -> {
                PreparedStatement ps = connection.prepareStatement(insertSql, Statement.RETURN_GENERATED_KEYS);
                ps.setString(1, finalName);
                ps.setString(2, description != null ? description : "");
                ps.setString(3, status);
                ps.setString(4, finalCreatedBy);
                ps.setString(5, finalCreatedBy);
                return ps;
            }, keyHolder);

            Number key = keyHolder.getKey();
            long newId = key != null ? key.longValue() : 0;

            Map<String, Object> res = new HashMap<>();
            res.put("id", String.valueOf(newId));
            res.put("name", name);
            res.put("description", description);
            res.put("status", status);
            res.put("created_by", finalCreatedBy);
            res.put("message", "Incident category created successfully");
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/incident-categories/{id}")
    @Transactional
    public ResponseEntity<?> updateIncidentCategory(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            @RequestParam(required = false) String uid,
            @RequestParam(required = false) String email,
            @RequestHeader(required = false, name = "x-user-uid") String headerUid,
            @RequestHeader(required = false, name = "x-user-email") String headerEmail) {
        
        try {
            if (!isAuthorized(headerUid, headerEmail, uid, email)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Unauthorized role"));
            }

            String name = (String) body.get("name");
            String description = (String) body.get("description");
            String status = (String) body.getOrDefault("status", "Active");
            String lastUpdatedBy = (String) body.get("last_updated_by");

            if (name == null || name.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Category name is required"));
            }

            name = name.trim();
            List<Map<String, Object>> existing = jdbcTemplate.queryForList("SELECT id FROM incident_categories WHERE LOWER(name) = ? AND id != ?", name.toLowerCase(), id);
            if (!existing.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "This category already exists"));
            }

            String updateSql = "UPDATE incident_categories SET name = ?, description = ?, status = ?, last_updated_by = ?, last_updated_date = CURRENT_TIMESTAMP WHERE id = ?";
            jdbcTemplate.update(updateSql, name, description != null ? description : "", status, lastUpdatedBy != null ? lastUpdatedBy : "Admin", id);

            Map<String, Object> res = new HashMap<>();
            res.put("id", String.valueOf(id));
            res.put("name", name);
            res.put("description", description);
            res.put("status", status);
            res.put("last_updated_by", lastUpdatedBy);
            res.put("message", "Incident category updated successfully");
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/incident-categories/{id}")
    @Transactional
    public ResponseEntity<?> deleteIncidentCategory(
            @PathVariable Long id,
            @RequestParam(required = false) String uid,
            @RequestParam(required = false) String email,
            @RequestHeader(required = false, name = "x-user-uid") String headerUid,
            @RequestHeader(required = false, name = "x-user-email") String headerEmail) {
        
        try {
            if (!isAuthorized(headerUid, headerEmail, uid, email)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Unauthorized role"));
            }

            List<Map<String, Object>> categories = jdbcTemplate.queryForList("SELECT name FROM incident_categories WHERE id = ?", id);
            if (categories.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            String categoryName = (String) categories.get(0).get("name");

            // Integrity check
            String checkSql = "SELECT COUNT(*) as count FROM tickets WHERE (incident_category = ? OR category = ?) AND status NOT IN ('Resolved', 'Closed', 'Canceled')";
            Map<String, Object> checkResult = jdbcTemplate.queryForMap(checkSql, categoryName, categoryName);
            long activeCount = ((Number) checkResult.get("count")).longValue();

            if (activeCount > 0) {
                return ResponseEntity.badRequest().body(Map.of("error", "This category is currently used by existing tickets"));
            }

            jdbcTemplate.update("DELETE FROM incident_categories WHERE id = ?", id);
            return ResponseEntity.ok(Map.of("success", true, "message", "Incident category deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // ── Incident Category Options API ─────────────────────────────────────────
    @GetMapping("/incident-categories/options")
    public ResponseEntity<?> getIncidentCategoryOptions(
            @RequestParam(required = false) Integer category_id,
            @RequestParam(required = false, name = "active_only") String activeOnlyStr) {
        
        try {
            boolean activeOnly = "true".equalsIgnoreCase(activeOnlyStr);
            String sql = "SELECT * FROM incident_category_options";
            List<Object> params = new ArrayList<>();
            List<String> clauses = new ArrayList<>();

            if (category_id != null) {
                clauses.add("category_id = ?");
                params.add(category_id);
            }
            if (activeOnly) {
                clauses.add("status = 'Active'");
            }

            if (!clauses.isEmpty()) {
                sql += " WHERE " + String.join(" AND ", clauses);
            }
            sql += " ORDER BY value_text ASC";

            List<Map<String, Object>> list = jdbcTemplate.queryForList(sql, params.toArray());
            return ResponseEntity.ok(stringifyIds(list));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/incident-categories/options")
    @Transactional
    public ResponseEntity<?> createIncidentCategoryOption(
            @RequestBody Map<String, Object> body,
            @RequestParam(required = false) String uid,
            @RequestParam(required = false) String email,
            @RequestHeader(required = false, name = "x-user-uid") String headerUid,
            @RequestHeader(required = false, name = "x-user-email") String headerEmail) {
        
        try {
            if (!isAuthorized(headerUid, headerEmail, uid, email)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Unauthorized role"));
            }

            Object categoryIdObj = body.get("category_id");
            String valueText = (String) body.get("value_text");
            String status = (String) body.getOrDefault("status", "Active");
            String createdBy = (String) body.get("created_by");

            if (categoryIdObj == null || valueText == null || valueText.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Category ID and value text are required"));
            }

            int categoryId = Integer.parseInt(String.valueOf(categoryIdObj));
            valueText = valueText.trim();

            List<Map<String, Object>> existing = jdbcTemplate.queryForList(
                "SELECT id FROM incident_category_options WHERE category_id = ? AND LOWER(value_text) = ?", categoryId, valueText.toLowerCase()
            );
            if (!existing.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "This value already exists in this category"));
            }

            String insertSql = "INSERT INTO incident_category_options (category_id, value_text, status, created_by, last_updated_by) VALUES (?, ?, ?, ?, ?)";
            KeyHolder keyHolder = new GeneratedKeyHolder();
            String finalValueText = valueText;
            String finalCreatedBy = createdBy != null ? createdBy : "Admin";
            jdbcTemplate.update(connection -> {
                PreparedStatement ps = connection.prepareStatement(insertSql, Statement.RETURN_GENERATED_KEYS);
                ps.setInt(1, categoryId);
                ps.setString(2, finalValueText);
                ps.setString(3, status);
                ps.setString(4, finalCreatedBy);
                ps.setString(5, finalCreatedBy);
                return ps;
            }, keyHolder);

            Number key = keyHolder.getKey();
            long newId = key != null ? key.longValue() : 0;

            Map<String, Object> res = new HashMap<>();
            res.put("id", String.valueOf(newId));
            res.put("category_id", categoryId);
            res.put("value_text", valueText);
            res.put("status", status);
            res.put("message", "Value added successfully");
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/incident-categories/options/{id}")
    @Transactional
    public ResponseEntity<?> updateIncidentCategoryOption(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            @RequestParam(required = false) String uid,
            @RequestParam(required = false) String email,
            @RequestHeader(required = false, name = "x-user-uid") String headerUid,
            @RequestHeader(required = false, name = "x-user-email") String headerEmail) {
        
        try {
            if (!isAuthorized(headerUid, headerEmail, uid, email)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Unauthorized role"));
            }

            String valueText = (String) body.get("value_text");
            String status = (String) body.getOrDefault("status", "Active");
            String lastUpdatedBy = (String) body.get("last_updated_by");

            if (valueText == null || valueText.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Value text is required"));
            }

            valueText = valueText.trim();
            jdbcTemplate.update(
                "UPDATE incident_category_options SET value_text = ?, status = ?, last_updated_by = ?, last_updated_date = CURRENT_TIMESTAMP WHERE id = ?",
                valueText, status, lastUpdatedBy != null ? lastUpdatedBy : "Admin", id
            );

            Map<String, Object> res = new HashMap<>();
            res.put("id", String.valueOf(id));
            res.put("value_text", valueText);
            res.put("status", status);
            res.put("message", "Value updated successfully");
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/incident-categories/options/{id}")
    @Transactional
    public ResponseEntity<?> deleteIncidentCategoryOption(
            @PathVariable Long id,
            @RequestParam(required = false) String uid,
            @RequestParam(required = false) String email,
            @RequestHeader(required = false, name = "x-user-uid") String headerUid,
            @RequestHeader(required = false, name = "x-user-email") String headerEmail) {
        
        try {
            if (!isAuthorized(headerUid, headerEmail, uid, email)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Unauthorized role"));
            }

            jdbcTemplate.update("DELETE FROM incident_category_options WHERE id = ?", id);
            return ResponseEntity.ok(Map.of("success", true, "message", "Value deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // ── Dynamic Master-Data Endpoints ─────────────────────────────────────────
    @GetMapping("/master-data/{table}")
    public ResponseEntity<?> getMasterData(
            @PathVariable String table,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "name") String sort,
            @RequestParam(defaultValue = "ASC") String order,
            @RequestParam(required = false) Integer category_id,
            @RequestParam(required = false) Integer subcategory_id,
            @RequestParam(required = false) Integer group_id) {
        
        try {
            if (!VALID_MASTER_TABLES.contains(table)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid master table"));
            }

            String sql = "SELECT * FROM " + table + " WHERE 1=1";
            List<Object> params = new ArrayList<>();

            if (status != null) {
                sql += " AND status = ?";
                params.add(status);
            }

            if (search != null) {
                sql += " AND (name LIKE ? OR description LIKE ?)";
                params.add("%" + search + "%");
                params.add("%" + search + "%");
            }

            if (category_id != null && "mst_subcategories".equals(table)) {
                sql += " AND category_id = ?";
                params.add(category_id);
            }
            if (subcategory_id != null && "mst_providences".equals(table)) {
                sql += " AND subcategory_id = ?";
                params.add(subcategory_id);
            }
            if (group_id != null && "mst_members".equals(table)) {
                sql += " AND group_id = ?";
                params.add(group_id);
            }

            // Safe sorting
            List<String> allowedSort = List.of("name", "created_at", "id", "level", "status");
            String finalSort = allowedSort.contains(sort) ? sort : "name";
            String finalOrder = "DESC".equalsIgnoreCase(order) ? "DESC" : "ASC";

            sql += " ORDER BY " + finalSort + " " + finalOrder;

            List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql, params.toArray());
            return ResponseEntity.ok(stringifyIds(rows));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/master-data/{table}")
    @Transactional
    public ResponseEntity<?> createMasterData(@PathVariable String table, @RequestBody Map<String, Object> body) {
        try {
            if (!VALID_MASTER_TABLES.contains(table)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid master table"));
            }

            List<String> fields = new ArrayList<>();
            List<String> placeholders = new ArrayList<>();
            List<Object> values = new ArrayList<>();

            for (Map.Entry<String, Object> entry : body.entrySet()) {
                if (!"id".equals(entry.getKey())) {
                    fields.add(entry.getKey());
                    placeholders.add("?");
                    values.add(entry.getValue());
                }
            }

            if (fields.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Empty body"));
            }

            String insertSql = "INSERT INTO " + table + " (" + String.join(", ", fields) + ") VALUES (" + String.join(", ", placeholders) + ")";
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

            List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT * FROM " + table + " WHERE id = ?", newId);
            if (rows.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(stringifyId(new HashMap<>(rows.get(0))));
        } catch (org.springframework.dao.DuplicateKeyException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", "An entry with this name already exists"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/master-data/{table}/{id}")
    @Transactional
    public ResponseEntity<?> updateMasterData(@PathVariable String table, @PathVariable Long id, @RequestBody Map<String, Object> body) {
        try {
            if (!VALID_MASTER_TABLES.contains(table)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid master table"));
            }

            List<String> fields = new ArrayList<>();
            List<Object> values = new ArrayList<>();

            for (Map.Entry<String, Object> entry : body.entrySet()) {
                if (!"id".equals(entry.getKey()) && !"created_at".equals(entry.getKey())) {
                    fields.add(entry.getKey() + " = ?");
                    values.add(entry.getValue());
                }
            }

            if (fields.isEmpty()) {
                List<Map<String, Object>> current = jdbcTemplate.queryForList("SELECT * FROM " + table + " WHERE id = ?", id);
                return ResponseEntity.ok(current.isEmpty() ? Map.of() : stringifyId(new HashMap<>(current.get(0))));
            }

            String updateSql = "UPDATE " + table + " SET " + String.join(", ", fields) + " WHERE id = ?";
            values.add(id);
            jdbcTemplate.update(updateSql, values.toArray());

            List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT * FROM " + table + " WHERE id = ?", id);
            if (rows.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(stringifyId(new HashMap<>(rows.get(0))));
        } catch (org.springframework.dao.DuplicateKeyException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", "An entry with this name already exists"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/master-data/{table}/{id}")
    @Transactional
    public ResponseEntity<?> deleteMasterData(
            @PathVariable String table,
            @PathVariable Long id,
            @RequestParam(defaultValue = "false") String permanent) {
        
        try {
            if (!VALID_MASTER_TABLES.contains(table)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid master table"));
            }

            if ("true".equalsIgnoreCase(permanent)) {
                jdbcTemplate.update("DELETE FROM " + table + " WHERE id = ?", id);
                return ResponseEntity.ok(Map.of("message", "Item deleted permanently"));
            } else {
                List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT status FROM " + table + " WHERE id = ?", id);
                if (rows.isEmpty()) {
                    return ResponseEntity.notFound().build();
                }
                String currentStatus = (String) rows.get(0).get("status");
                String newStatus = "active".equalsIgnoreCase(currentStatus) ? "inactive" : "active";
                jdbcTemplate.update("UPDATE " + table + " SET status = ? WHERE id = ?", newStatus, id);
                return ResponseEntity.ok(Map.of("message", "Item marked as " + newStatus, "status", newStatus));
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // ── Parsing Utilities ─────────────────────────────────────────────────────
    private List<?> parseJsonArray(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, List.class);
        } catch (Exception e) {
            return List.of();
        }
    }

    private String toJsonString(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "[]";
        }
    }

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
}
