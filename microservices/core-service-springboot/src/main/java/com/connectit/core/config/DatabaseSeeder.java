package com.connectit.core.config;
 
import com.connectit.core.model.CompanyEmailConfig;
import com.connectit.core.model.SLAPolicy;
import com.connectit.core.model.User;
import com.connectit.core.repository.CompanyEmailConfigRepository;
import com.connectit.core.repository.SLAPolicyRepository;
import com.connectit.core.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
 
import java.util.List;
import java.util.Map;
 
@Component
@RequiredArgsConstructor
@Slf4j
public class DatabaseSeeder implements CommandLineRunner {
 
    private final UserRepository userRepository;
    private final SLAPolicyRepository slaPolicyRepository;
    private final CompanyEmailConfigRepository companyEmailConfigRepository;
    private final JdbcTemplate jdbcTemplate;

    @Value("${spring.mail.host:smtp.office365.com}")
    private String smtpHost;

    @Value("${spring.mail.port:587}")
    private Integer smtpPort;

    @Value("${spring.mail.username:info@technosprint.net}")
    private String smtpUser;

    @Value("${spring.mail.password:Poland@01}")
    private String smtpPass;

    @Value("${app.mail.from:info@technosprint.net}")
    private String mailFrom;

    @Value("${app.mail.from-name:TechnoSprint Support}")
    private String mailFromName;

    @Value("${app.imap.host:outlook.office365.com}")
    private String imapHost;

    @Value("${app.imap.port:993}")
    private Integer imapPort;

    @Value("${app.imap.user:info@technosprint.net}")
    private String imapUser;

    @Value("${app.imap.pass:Poland@01}")
    private String imapPass;

    @Override
    public void run(String... args) throws Exception {
        log.info("[DatabaseSeeder] Checking and initializing database schema & seed data...");

        // 1. Create non-JPA tables if they do not exist (critical for H2 fallback)
        createNonJpaTables();

        // 2. Seed Default Company if none exists
        seedDefaultCompany();

        // 2b. Seed Default Company Email Config if none exists
        seedDefaultCompanyEmailConfig();

        // 3. Seed Default SLA Policies if none exists
        seedDefaultSlaPolicies();

        // 4. Seed Default Users if none exists
        seedDefaultUsers();

        // 5. Seed Default System Settings if empty
        seedDefaultSystemSettings();

        // 6. Seed Service Catalog (categories & subcategories) if empty
        seedServiceCatalog();

        // 7. Seed Incident Categories if empty
        seedIncidentCategories();

        // 8. Seed Planning, Forecasting, and Dashboard Templates if empty
        seedPlanningAndForecasting();

        log.info("[DatabaseSeeder] Database initialization completed successfully.");
    }

    private void createNonJpaTables() {
        try {
            // System Settings
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS system_settings (" +
                    "id INT AUTO_INCREMENT PRIMARY KEY, " +
                    "setting_key VARCHAR(100) UNIQUE NOT NULL, " +
                    "setting_value TEXT, " +
                    "setting_type VARCHAR(20) DEFAULT 'string', " +
                    "description TEXT, " +
                    "updated_by VARCHAR(128), " +
                    "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");

            // Companies
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS companies (" +
                    "id BIGINT AUTO_INCREMENT PRIMARY KEY, " +
                    "name VARCHAR(255) NOT NULL, " +
                    "status VARCHAR(50) DEFAULT 'Active', " +
                    "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
                    "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");

            // Settings Categories
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS settings_categories (" +
                    "id VARCHAR(128) PRIMARY KEY, " +
                    "name VARCHAR(255) NOT NULL, " +
                    "description TEXT, " +
                    "status VARCHAR(20) DEFAULT 'active', " +
                    "created_by VARCHAR(255) DEFAULT 'system', " +
                    "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
                    "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
                    "company_id VARCHAR(128))");

            // Settings Subcategories
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS settings_subcategories (" +
                    "id VARCHAR(128) PRIMARY KEY, " +
                    "name VARCHAR(255) NOT NULL, " +
                    "description TEXT, " +
                    "category_id VARCHAR(128), " +
                    "category_name VARCHAR(255), " +
                    "status VARCHAR(20) DEFAULT 'active', " +
                    "created_by VARCHAR(255) DEFAULT 'system', " +
                    "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
                    "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
                    "company_id VARCHAR(128))");

            // Settings Service Providers
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS settings_service_providers (" +
                    "id VARCHAR(128) PRIMARY KEY, " +
                    "name VARCHAR(255) NOT NULL, " +
                    "description TEXT, " +
                    "category_id VARCHAR(128), " +
                    "subcategory_id VARCHAR(128), " +
                    "sla VARCHAR(50), " +
                    "status VARCHAR(20) DEFAULT 'active', " +
                    "created_by VARCHAR(255) DEFAULT 'system', " +
                    "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
                    "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
                    "company_id VARCHAR(128))");

            // Settings Group Members
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS settings_group_members (" +
                    "id VARCHAR(128) PRIMARY KEY, " +
                    "user_id VARCHAR(128), " +
                    "user_name VARCHAR(255), " +
                    "user_email VARCHAR(255), " +
                    "group_id VARCHAR(128), " +
                    "role_in_group VARCHAR(100), " +
                    "is_primary TINYINT(1) DEFAULT 0, " +
                    "availability_status VARCHAR(20) DEFAULT 'available', " +
                    "current_workload INT DEFAULT 0, " +
                    "skills TEXT, " +
                    "status VARCHAR(20) DEFAULT 'active', " +
                    "created_by VARCHAR(255) DEFAULT 'system', " +
                    "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
                    "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
                    "company_id VARCHAR(128))");

            // Settings Groups
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS settings_groups (" +
                    "id VARCHAR(128) PRIMARY KEY, " +
                    "name VARCHAR(255) NOT NULL, " +
                    "description TEXT, " +
                    "manager_uid VARCHAR(128), " +
                    "manager_name VARCHAR(255), " +
                    "assignment_email VARCHAR(255), " +
                    "is_active TINYINT(1) DEFAULT 1, " +
                    "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
                    "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
                    "company_id VARCHAR(128))");

            // Settings Audit Logs
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS settings_audit_logs (" +
                    "id VARCHAR(128) PRIMARY KEY, " +
                    "module_id VARCHAR(128), " +
                    "module_name VARCHAR(255), " +
                    "action VARCHAR(255), " +
                    "old_value TEXT, " +
                    "new_value TEXT, " +
                    "performed_by VARCHAR(255), " +
                    "performed_by_role VARCHAR(100), " +
                    "timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");

            // Incident Categories
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS incident_categories (" +
                    "id INT AUTO_INCREMENT PRIMARY KEY, " +
                    "name VARCHAR(100) UNIQUE NOT NULL, " +
                    "description TEXT, " +
                    "status VARCHAR(50) DEFAULT 'Active', " +
                    "created_by VARCHAR(255), " +
                    "created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
                    "last_updated_by VARCHAR(255), " +
                    "last_updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");

            // Incident Category Options
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS incident_category_options (" +
                    "id INT AUTO_INCREMENT PRIMARY KEY, " +
                    "category_id INT, " +
                    "value_text VARCHAR(255) NOT NULL, " +
                    "status VARCHAR(50) DEFAULT 'Active', " +
                    "created_by VARCHAR(255), " +
                    "created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
                    "last_updated_by VARCHAR(255), " +
                    "last_updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");

            // Customizable Dashboard Layouts
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS settings_dashboard_layouts (" +
                    "id VARCHAR(128) PRIMARY KEY, " +
                    "user_uid VARCHAR(128) UNIQUE NOT NULL, " +
                    "layout_json TEXT NOT NULL, " +
                    "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
                    "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");

            // Customizable Dashboard Templates
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS settings_dashboard_templates (" +
                    "id VARCHAR(128) PRIMARY KEY, " +
                    "name VARCHAR(255) NOT NULL, " +
                    "role VARCHAR(50) NOT NULL, " +
                    "layout_json TEXT NOT NULL, " +
                    "is_locked TINYINT(1) DEFAULT 0, " +
                    "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
                    "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");

            // Forecasting & Planning Targets
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS planning_targets (" +
                    "id VARCHAR(128) PRIMARY KEY, " +
                    "target_type VARCHAR(50) NOT NULL, " +
                    "target_period VARCHAR(50) NOT NULL, " +
                    "metric_name VARCHAR(100) NOT NULL, " +
                    "target_value DOUBLE NOT NULL, " +
                    "actual_value DOUBLE DEFAULT 0.0, " +
                    "team_id VARCHAR(128), " +
                    "assignee_uid VARCHAR(128), " +
                    "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
                    "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");

            // Forecasting & Planning Forecasts
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS planning_forecasts (" +
                    "id VARCHAR(128) PRIMARY KEY, " +
                    "forecast_type VARCHAR(50) NOT NULL, " +
                    "forecast_period VARCHAR(50) NOT NULL, " +
                    "forecasted_value DOUBLE NOT NULL, " +
                    "accuracy DOUBLE DEFAULT 1.0, " +
                    "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");

            // Forecasting & Planning Calendar Events
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS planning_calendar_events (" +
                    "id VARCHAR(128) PRIMARY KEY, " +
                    "title VARCHAR(255) NOT NULL, " +
                    "event_type VARCHAR(50) NOT NULL, " +
                    "event_date DATE NOT NULL, " +
                    "details TEXT, " +
                    "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");

            // Groups Kanban Tasks
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS groups_tasks (" +
                    "id VARCHAR(128) PRIMARY KEY, " +
                    "group_id VARCHAR(128) NOT NULL, " +
                    "title VARCHAR(255) NOT NULL, " +
                    "description TEXT, " +
                    "assignee_id VARCHAR(128), " +
                    "assignee_name VARCHAR(255), " +
                    "priority VARCHAR(50) DEFAULT 'Medium', " +
                    "status VARCHAR(50) DEFAULT 'To Do', " +
                    "story_points INT DEFAULT 0, " +
                    "estimated_hours DOUBLE DEFAULT 0.0, " +
                    "actual_hours DOUBLE DEFAULT 0.0, " +
                    "due_date DATE, " +
                    "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
                    "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
                    "FOREIGN KEY (group_id) REFERENCES settings_groups(id) ON DELETE CASCADE)");

            // Groups Sprint Events
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS groups_events (" +
                    "id VARCHAR(128) PRIMARY KEY, " +
                    "group_id VARCHAR(128) NOT NULL, " +
                    "title VARCHAR(255) NOT NULL, " +
                    "description TEXT, " +
                    "type VARCHAR(50) DEFAULT 'Meeting', " +
                    "start_date DATE NOT NULL, " +
                    "end_date DATE, " +
                    "estimated_hours DOUBLE DEFAULT 0.0, " +
                    "priority VARCHAR(50) DEFAULT 'Medium', " +
                    "assignee_id VARCHAR(128), " +
                    "status VARCHAR(50) DEFAULT 'Planned', " +
                    "dependencies VARCHAR(255), " +
                    "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
                    "FOREIGN KEY (group_id) REFERENCES settings_groups(id) ON DELETE CASCADE)");

            // Groups Objectives / Plans
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS groups_plans (" +
                    "id VARCHAR(128) PRIMARY KEY, " +
                    "group_id VARCHAR(128) NOT NULL, " +
                    "type VARCHAR(50) NOT NULL, " +
                    "objective TEXT NOT NULL, " +
                    "planned_work DOUBLE DEFAULT 0.0, " +
                    "actual_work DOUBLE DEFAULT 0.0, " +
                    "completion_rate DOUBLE DEFAULT 0.0, " +
                    "delay_rate DOUBLE DEFAULT 0.0, " +
                    "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
                    "FOREIGN KEY (group_id) REFERENCES settings_groups(id) ON DELETE CASCADE)");

            // Groups Daily Standups
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS groups_standups (" +
                    "id VARCHAR(128) PRIMARY KEY, " +
                    "group_id VARCHAR(128) NOT NULL, " +
                    "user_id VARCHAR(128) NOT NULL, " +
                    "user_name VARCHAR(255) NOT NULL, " +
                    "yesterday TEXT, " +
                    "today TEXT, " +
                    "blockers TEXT, " +
                    "standup_date DATE NOT NULL, " +
                    "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
                    "FOREIGN KEY (group_id) REFERENCES settings_groups(id) ON DELETE CASCADE)");

            // Groups Member Performance Ratings
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS groups_ratings (" +
                    "id VARCHAR(128) PRIMARY KEY, " +
                    "group_id VARCHAR(128) NOT NULL, " +
                    "user_id VARCHAR(128) NOT NULL, " +
                    "user_name VARCHAR(255) NOT NULL, " +
                    "productivity INT DEFAULT 5, " +
                    "quality INT DEFAULT 5, " +
                    "attendance INT DEFAULT 5, " +
                    "communication INT DEFAULT 5, " +
                    "collaboration INT DEFAULT 5, " +
                    "ownership INT DEFAULT 5, " +
                    "score DOUBLE DEFAULT 5.0, " +
                    "frequency VARCHAR(50) DEFAULT 'Weekly', " +
                    "rating_date DATE NOT NULL, " +
                    "rated_by VARCHAR(255), " +
                    "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
                    "FOREIGN KEY (group_id) REFERENCES settings_groups(id) ON DELETE CASCADE)");

            // Groups Discussions
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS groups_discussions (" +
                    "id VARCHAR(128) PRIMARY KEY, " +
                    "group_id VARCHAR(128) NOT NULL, " +
                    "type VARCHAR(50) DEFAULT 'discussion', " +
                    "title VARCHAR(255) NOT NULL, " +
                    "content TEXT NOT NULL, " +
                    "author_name VARCHAR(255), " +
                    "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
                    "FOREIGN KEY (group_id) REFERENCES settings_groups(id) ON DELETE CASCADE)");

            // Groups KB Articles
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS groups_kb (" +
                    "id VARCHAR(128) PRIMARY KEY, " +
                    "group_id VARCHAR(128) NOT NULL, " +
                    "title VARCHAR(255) NOT NULL, " +
                    "content TEXT NOT NULL, " +
                    "category VARCHAR(100), " +
                    "author_name VARCHAR(255), " +
                    "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
                    "FOREIGN KEY (group_id) REFERENCES settings_groups(id) ON DELETE CASCADE)");

            // Groups Escalations
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS groups_escalations (" +
                    "id VARCHAR(128) PRIMARY KEY, " +
                    "group_id VARCHAR(128) NOT NULL, " +
                    "title VARCHAR(255) NOT NULL, " +
                    "description TEXT, " +
                    "status VARCHAR(50), " +
                    "priority VARCHAR(50), " +
                    "assignee_name VARCHAR(255), " +
                    "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
                    "FOREIGN KEY (group_id) REFERENCES settings_groups(id) ON DELETE CASCADE)");

            // Company Feature Permissions
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS company_feature_permissions (" +
                    "id BIGINT AUTO_INCREMENT PRIMARY KEY, " +
                    "company_id VARCHAR(128) NOT NULL, " +
                    "feature_id VARCHAR(128) NOT NULL, " +
                    "can_view TINYINT(1) DEFAULT 1, " +
                    "can_use TINYINT(1) DEFAULT 1, " +
                    "can_edit TINYINT(1) DEFAULT 1, " +
                    "is_mandatory TINYINT(1) DEFAULT 0, " +
                    "status VARCHAR(50) DEFAULT 'enabled', " +
                    "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
                    "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
                    "UNIQUE (company_id, feature_id))");

            // Generic Firestore-like Documents Table
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS generic_documents (" +
                    "id VARCHAR(128) NOT NULL, " +
                    "collection_name VARCHAR(128) NOT NULL, " +
                    "document_json TEXT NOT NULL, " +
                    "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
                    "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
                    "PRIMARY KEY (collection_name, id))");

            // Activity Sessions
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS activity_sessions (" +
                    "id INT AUTO_INCREMENT PRIMARY KEY, " +
                    "session_id VARCHAR(100) NOT NULL, " +
                    "user_id VARCHAR(128) NOT NULL, " +
                    "user_name VARCHAR(255), " +
                    "start_time DATETIME, " +
                    "stop_time DATETIME, " +
                    "duration INT DEFAULT 0, " +
                    "status VARCHAR(20) DEFAULT 'active', " +
                    "ticket_number VARCHAR(50), " +
                    "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");

            // Activity Entries
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS activity_entries (" +
                    "id INT AUTO_INCREMENT PRIMARY KEY, " +
                    "session_id VARCHAR(100), " +
                    "user_id VARCHAR(128) NOT NULL, " +
                    "screenshot_url TEXT, " +
                    "screenshot_filename VARCHAR(255), " +
                    "screenshot_format VARCHAR(20), " +
                    "screenshot_size_kb INT, " +
                    "activity_label TEXT, " +
                    "description TEXT, " +
                    "confidence DECIMAL(5,4), " +
                    "captured_at DATETIME, " +
                    "keystrokes INT DEFAULT 0, " +
                    "clicks INT DEFAULT 0, " +
                    "ticket_number VARCHAR(50), " +
                    "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");

            // Work Notes
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS work_notes (" +
                    "id INT AUTO_INCREMENT PRIMARY KEY, " +
                    "ticket_id VARCHAR(128) NOT NULL, " +
                    "user_id VARCHAR(128), " +
                    "user_name VARCHAR(255), " +
                    "note TEXT NOT NULL, " +
                    "is_internal BOOLEAN DEFAULT TRUE, " +
                    "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
                    "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");

            // Work Sessions
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS work_sessions (" +
                    "id INT AUTO_INCREMENT PRIMARY KEY, " +
                    "ticket_id VARCHAR(128), " +
                    "user_id VARCHAR(128) NOT NULL, " +
                    "user_name VARCHAR(255), " +
                    "session_type VARCHAR(50) DEFAULT 'work', " +
                    "start_time DATETIME, " +
                    "end_time DATETIME, " +
                    "duration INT DEFAULT 0, " +
                    "notes TEXT, " +
                    "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");

            // Settings Workflows
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS settings_workflows (" +
                    "id VARCHAR(128) PRIMARY KEY, " +
                    "name VARCHAR(255) NOT NULL, " +
                    "description TEXT, " +
                    "`trigger` VARCHAR(100), " +
                    "status VARCHAR(50) DEFAULT 'active', " +
                    "attachment TEXT, " +
                    "image TEXT, " +
                    "created_by VARCHAR(128) DEFAULT 'system', " +
                    "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, " +
                    "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");

            log.info("[DatabaseSeeder] DDL initialization of settings tables checked/applied.");
        } catch (Exception e) {
            log.error("[DatabaseSeeder] DDL initialization failed: {}", e.getMessage(), e);
        }
    }

    private void seedDefaultCompany() {
        try {
            List<Map<String, Object>> existing = jdbcTemplate.queryForList("SELECT id FROM companies LIMIT 1");
            if (existing.isEmpty()) {
                log.info("[DatabaseSeeder] Seeding default company...");
                jdbcTemplate.update("INSERT INTO companies (id, name, status) VALUES (1, 'Manage My Desk', 'Active')");
            }
        } catch (Exception e) {
            log.error("[DatabaseSeeder] Failed to seed default company: {}", e.getMessage());
        }
    }

    private void seedDefaultSlaPolicies() {
        if (slaPolicyRepository.count() == 0) {
            log.info("[DatabaseSeeder] Seeding default SLA policies...");
            slaPolicyRepository.saveAll(List.of(
                SLAPolicy.builder().name("Critical Priority SLA").priority("1 - Critical").responseTimeHours(1).resolutionTimeHours(4).description("Immediate response required for critical issues").isActive(true).build(),
                SLAPolicy.builder().name("High Priority SLA").priority("2 - High").responseTimeHours(4).resolutionTimeHours(8).description("Urgent response for high priority issues").isActive(true).build(),
                SLAPolicy.builder().name("Moderate Priority SLA").priority("3 - Moderate").responseTimeHours(8).resolutionTimeHours(24).description("Standard response for moderate priority").isActive(true).build(),
                SLAPolicy.builder().name("Low Priority SLA").priority("4 - Low").responseTimeHours(24).resolutionTimeHours(72).description("Best effort response for low priority").isActive(true).build()
            ));
        }
    }

    private void seedDefaultUsers() {
        // arun.g@technosprint.net  password: Poland@01  → simpleHash = h_ps1kdz_9
        seedUser("demo_t342dq", "arun.g@technosprint.net",  "Arun G (Ultra Super Admin)",  "ultra_super_admin", "h_ps1kdz_9");
        // info@technosprint.net  password: Poland@01  → simpleHash = h_ps1kdz_9
        seedUser("demo_info", "info@technosprint.net",  "Info Support (Ultra Super Admin)",  "ultra_super_admin", "h_ps1kdz_9");
        // swedhasris@gmail.com     password: 123202      → simpleHash = h_nzmtky_6
        seedUser("demo_swedha", "swedhasris@gmail.com",     "Swedha (Ultra Super Admin)",   "ultra_super_admin", "h_nzmtky_6");
        // Password123! → h_c2sm7e_12
        seedUser("demo_voust", "ulter@technosprint.net",   "Demo Super Admin",             "super_admin",       "h_c2sm7e_12");
        seedUser("demo_admin", "admin@technosprint.net",   "Demo Admin",                   "admin",             "h_c2sm7e_12");
        seedUser("demo_agent", "agent@technosprint.net",   "Demo Support Agent",           "agent",             "h_c2sm7e_12");
        seedUser("demo_user",  "user@technosprint.net",    "Demo User",                    "user",              "h_c2sm7e_12");
    }

    private void seedUser(String uid, String email, String name, String role, String passwordHash) {
        java.util.Optional<User> existingByUid = userRepository.findByUid(uid);
        if (existingByUid.isPresent()) {
            User user = existingByUid.get();
            user.setEmail(email);
            user.setName(name);
            user.setRole(role);
            user.setPasswordHash(passwordHash);
            user.setIsActive(true);
            userRepository.save(user);
            log.info("[DatabaseSeeder] Updated existing user (by uid={}): {}", uid, email);
            return;
        }

        java.util.Optional<User> existingByEmail = userRepository.findByEmailIgnoreCase(email);
        if (existingByEmail.isPresent()) {
            User user = existingByEmail.get();
            user.setUid(uid);
            user.setName(name);
            user.setRole(role);
            user.setPasswordHash(passwordHash);
            user.setIsActive(true);
            userRepository.save(user);
            log.info("[DatabaseSeeder] Updated existing user (by email={}): uid={}", email, uid);
        } else {
            userRepository.save(User.builder()
                .uid(uid)
                .email(email)
                .name(name)
                .role(role)
                .passwordHash(passwordHash)
                .isActive(true)
                .isDemo(true)
                .provider("email")
                .build());
            log.info("[DatabaseSeeder] Seeded default user: {}", email);
        }
    }

    private void seedDefaultCompanyEmailConfig() {
        try {
            CompanyEmailConfig cfg = null;
            List<CompanyEmailConfig> allConfigs = companyEmailConfigRepository.findAll();
            if (!allConfigs.isEmpty()) {
                cfg = allConfigs.get(0);
            } else {
                cfg = new CompanyEmailConfig();
            }
            cfg.setCompanyName(mailFromName);
            cfg.setEmailAddress(mailFrom);
            cfg.setSmtpHost(smtpHost);
            cfg.setSmtpPort(smtpPort);
            cfg.setSmtpUser(smtpUser);
            cfg.setSmtpPass(smtpPass);
            cfg.setImapHost(imapHost);
            cfg.setImapPort(imapPort);
            cfg.setImapUser(imapUser);
            cfg.setImapPass(imapPass);
            cfg.setEncryption("TLS");
            cfg.setIsActive(true);
            cfg.setIsDefault(true);
            
            companyEmailConfigRepository.save(cfg);
            log.info("[DatabaseSeeder] Seeded/updated default company email config (info@technosprint.net) successfully.");
        } catch (Exception e) {
            log.error("[DatabaseSeeder] Failed to seed/update default company email config: {}", e.getMessage());
        }
    }

    private void seedDefaultSystemSettings() {
        try {
            List<Map<String, Object>> existing = jdbcTemplate.queryForList("SELECT id FROM system_settings LIMIT 1");
            if (existing.isEmpty()) {
                log.info("[DatabaseSeeder] Seeding default system settings...");
                jdbcTemplate.update("INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES (?, ?, ?, ?)",
                        "ticket_number_prefix", "INC", "string", "Prefix for incident ticket numbers");
                jdbcTemplate.update("INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES (?, ?, ?, ?)",
                        "ticket_number_next", "1000000", "number", "Next ticket number sequence");
                jdbcTemplate.update("INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES (?, ?, ?, ?)",
                        "enable_sla_monitoring", "true", "boolean", "Enable automatic SLA monitoring");
                jdbcTemplate.update("INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES (?, ?, ?, ?)",
                        "enable_email_notifications", "false", "boolean", "Enable email notifications");
                jdbcTemplate.update("INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES (?, ?, ?, ?)",
                        "company_name", "Manage My Desk", "string", "Company name displayed in portal");
                jdbcTemplate.update("INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES (?, ?, ?, ?)",
                        "maintenance_mode", "false", "boolean", "Enable maintenance mode");
                jdbcTemplate.update("INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES (?, ?, ?, ?)",
                        "branding", "{\"companyName\":\"Manage My Desk\",\"logoBase64\":\"/manage_my_desk_logo.jpg\",\"logoType\":\"image/jpeg\"}", "json", "Branding logo and company name");
            }
        } catch (Exception e) {
            log.error("[DatabaseSeeder] Failed to seed system settings: {}", e.getMessage());
        }
    }

    private void seedServiceCatalog() {
        try {
            List<Map<String, Object>> existingCats = jdbcTemplate.queryForList("SELECT id FROM settings_categories LIMIT 1");
            if (existingCats.isEmpty()) {
                log.info("[DatabaseSeeder] Seeding default service catalog (categories & subcategories)...");
                jdbcTemplate.update("INSERT INTO settings_categories (id, name, description, status, created_by, company_id) VALUES (?, ?, ?, ?, ?, ?)",
                        "cat_default_1", "IT Support", "IT related hardware, software and access issues", "active", "system", "1");
                jdbcTemplate.update("INSERT INTO settings_categories (id, name, description, status, created_by, company_id) VALUES (?, ?, ?, ?, ?, ?)",
                        "cat_default_2", "HR Support", "Human resources, benefits and payroll support", "active", "system", "1");

                jdbcTemplate.update("INSERT INTO settings_subcategories (id, name, description, category_id, status, created_by, company_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
                        "sub_default_1", "Software Issue", "Operating system or application software failure", "cat_default_1", "active", "system", "1");
                jdbcTemplate.update("INSERT INTO settings_subcategories (id, name, description, category_id, status, created_by, company_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
                        "sub_default_2", "Hardware Issue", "Computer or peripheral hardware malfunction", "cat_default_1", "active", "system", "1");
                jdbcTemplate.update("INSERT INTO settings_subcategories (id, name, description, category_id, status, created_by, company_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
                        "sub_default_3", "Payroll Inquiry", "Questions regarding salary, tax forms or pay slips", "cat_default_2", "active", "system", "1");
            }
        } catch (Exception e) {
            log.error("[DatabaseSeeder] Failed to seed service catalog: {}", e.getMessage());
        }
    }

    private void seedIncidentCategories() {
        try {
            List<Map<String, Object>> existing = jdbcTemplate.queryForList("SELECT id FROM incident_categories LIMIT 1");
            if (existing.isEmpty()) {
                log.info("[DatabaseSeeder] Seeding default incident categories...");
                String[] categories = {
                    "Hardware Issue", "Software Issue", "Network Issue", "System Access",
                    "Security Issue", "Login Problem", "Email Issue", "Performance Issue",
                    "Service Request", "Other"
                };
                for (String cat : categories) {
                    jdbcTemplate.update("INSERT INTO incident_categories (name, description, status, created_by) VALUES (?, ?, 'Active', 'system')",
                            cat, cat + " Category");
                }
            }
        } catch (Exception e) {
            log.error("[DatabaseSeeder] Failed to seed incident categories: {}", e.getMessage());
        }
    }

    private void seedPlanningAndForecasting() {
        try {
            List<Map<String, Object>> existingTargets = jdbcTemplate.queryForList("SELECT id FROM planning_targets LIMIT 1");
            if (existingTargets.isEmpty()) {
                log.info("[DatabaseSeeder] Seeding default planning targets...");
                jdbcTemplate.update("INSERT INTO planning_targets (id, target_type, target_period, metric_name, target_value, actual_value) VALUES (?, ?, ?, ?, ?, ?)",
                        "target_1", "Monthly", "June 2026", "SLA Compliance", 95.0, 94.2);
                jdbcTemplate.update("INSERT INTO planning_targets (id, target_type, target_period, metric_name, target_value, actual_value) VALUES (?, ?, ?, ?, ?, ?)",
                        "target_2", "Monthly", "June 2026", "Resolution Capacity", 500.0, 485.0);
                jdbcTemplate.update("INSERT INTO planning_targets (id, target_type, target_period, metric_name, target_value, actual_value) VALUES (?, ?, ?, ?, ?, ?)",
                        "target_3", "Monthly", "June 2026", "Ticket Volume", 450.0, 420.0);
                jdbcTemplate.update("INSERT INTO planning_targets (id, target_type, target_period, metric_name, target_value, actual_value) VALUES (?, ?, ?, ?, ?, ?)",
                        "target_4", "Quarterly", "Q2 2026", "Team Customer Satisfaction", 90.0, 92.5);
            }

            List<Map<String, Object>> existingForecasts = jdbcTemplate.queryForList("SELECT id FROM planning_forecasts LIMIT 1");
            if (existingForecasts.isEmpty()) {
                log.info("[DatabaseSeeder] Seeding default planning forecasts...");
                jdbcTemplate.update("INSERT INTO planning_forecasts (id, forecast_type, forecast_period, forecasted_value, accuracy) VALUES (?, ?, ?, ?, ?)",
                        "fc_1", "Ticket Volume", "July 2026", 480.0, 0.92);
                jdbcTemplate.update("INSERT INTO planning_forecasts (id, forecast_type, forecast_period, forecasted_value, accuracy) VALUES (?, ?, ?, ?, ?)",
                        "fc_2", "SLA Achievement", "July 2026", 96.5, 0.95);
                jdbcTemplate.update("INSERT INTO planning_forecasts (id, forecast_type, forecast_period, forecasted_value, accuracy) VALUES (?, ?, ?, ?, ?)",
                        "fc_3", "Resolution Capacity", "July 2026", 520.0, 0.89);
            }

            List<Map<String, Object>> existingEvents = jdbcTemplate.queryForList("SELECT id FROM planning_calendar_events LIMIT 1");
            if (existingEvents.isEmpty()) {
                log.info("[DatabaseSeeder] Seeding default planning calendar events...");
                jdbcTemplate.update("INSERT INTO planning_calendar_events (id, title, event_type, event_date, details) VALUES (?, ?, ?, ?, ?)",
                        "evt_1", "SLA Breach Target Review", "SLA Goals", java.sql.Date.valueOf("2026-06-20"), "Monthly review of SLA compliance targets and metrics.");
                jdbcTemplate.update("INSERT INTO planning_calendar_events (id, title, event_type, event_date, details) VALUES (?, ?, ?, ?, ?)",
                        "evt_2", "Capacity Planning Session", "Planned Workloads", java.sql.Date.valueOf("2026-06-25"), "Evaluate agent workload distribution and capacity constraints.");
                jdbcTemplate.update("INSERT INTO planning_calendar_events (id, title, event_type, event_date, details) VALUES (?, ?, ?, ?, ?)",
                        "evt_3", "Milestone Q2 Review", "Milestones", java.sql.Date.valueOf("2026-06-30"), "Review Q2 target achievements.");
            }

            List<Map<String, Object>> existingTemplates = jdbcTemplate.queryForList("SELECT id FROM settings_dashboard_templates LIMIT 1");
            if (existingTemplates.isEmpty()) {
                log.info("[DatabaseSeeder] Seeding default dashboard templates...");
                String defaultLayout = "[\"Open Tickets\", \"Closed Tickets\", \"Pending Tickets\", \"SLA Compliance\", \"Escalated Tickets\", \"Ticket Trend Chart\"]";
                jdbcTemplate.update("INSERT INTO settings_dashboard_templates (id, name, role, layout_json, is_locked) VALUES (?, ?, ?, ?, ?)",
                        "tpl_admin", "Admin Template", "admin", defaultLayout, 0);
                jdbcTemplate.update("INSERT INTO settings_dashboard_templates (id, name, role, layout_json, is_locked) VALUES (?, ?, ?, ?, ?)",
                        "tpl_agent", "Agent Template", "agent", defaultLayout, 0);
            }
        } catch (Exception e) {
            log.error("[DatabaseSeeder] Failed to seed planning and forecasting: {}", e.getMessage());
        }
    }
}
