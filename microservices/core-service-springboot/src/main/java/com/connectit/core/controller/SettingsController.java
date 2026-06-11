package com.connectit.core.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.*;

@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
public class SettingsController {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // ── GET Branding Settings ────────────────────────────────────────────────
    @GetMapping("/branding")
    public ResponseEntity<?> getBranding() {
        try {
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT setting_value FROM system_settings WHERE setting_key = 'branding'"
            );
            if (!rows.isEmpty()) {
                String settingVal = (String) rows.get(0).get("setting_value");
                if (settingVal != null && !settingVal.isBlank()) {
                    try {
                        Map<?, ?> parsed = objectMapper.readValue(settingVal, Map.class);
                        return ResponseEntity.ok(parsed);
                    } catch (Exception e) {
                        return ResponseEntity.ok(Map.of("companyName", "Connect", "logoBase64", Optional.empty(), "logoType", Optional.empty()));
                    }
                }
            }
            return ResponseEntity.ok(Map.of("companyName", "Connect", "logoBase64", Optional.empty(), "logoType", Optional.empty()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // ── POST Branding Settings ───────────────────────────────────────────────
    @PostMapping("/branding")
    @Transactional
    public ResponseEntity<?> postBranding(@RequestBody Map<String, Object> body) {
        try {
            String companyName = (String) body.getOrDefault("companyName", "Connect");
            String logoBase64 = (String) body.get("logoBase64");
            String logoType = (String) body.get("logoType");
            String updatedBy = (String) body.getOrDefault("updatedBy", "System");

            Map<String, Object> brandingMap = new HashMap<>();
            brandingMap.put("companyName", companyName);
            brandingMap.put("logoBase64", logoBase64);
            brandingMap.put("logoType", logoType);
            String brandingJson = objectMapper.writeValueAsString(brandingMap);

            List<Map<String, Object>> existing = jdbcTemplate.queryForList(
                "SELECT id FROM system_settings WHERE setting_key = 'branding'"
            );

            if (!existing.isEmpty()) {
                jdbcTemplate.update(
                    "UPDATE system_settings SET setting_value = ?, updated_by = ? WHERE setting_key = 'branding'",
                    brandingJson, updatedBy
                );
            } else {
                jdbcTemplate.update(
                    "INSERT INTO system_settings (setting_key, setting_value, setting_type, description, updated_by) VALUES (?, ?, ?, ?, ?)",
                    "branding", brandingJson, "json", "Branding logo and company name", updatedBy
                );
            }

            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
}
