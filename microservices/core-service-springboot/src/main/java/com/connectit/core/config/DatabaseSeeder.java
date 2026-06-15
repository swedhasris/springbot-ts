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
                jdbcTemplate.update("INSERT INTO companies (id, name, status) VALUES (1, 'Connect IT', 'Active')");
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
        // swedhasris@gmail.com     password: 123202      → simpleHash = h_nzmtky_6
        seedUser("demo_swedha", "swedhasris@gmail.com",     "Swedha (Ultra Super Admin)",   "ultra_super_admin", "h_nzmtky_6");
        // Password123! → h_c2sm7e_12
        seedUser("demo_voust", "ulter@technosprint.net",   "Demo Super Admin",             "super_admin",       "h_c2sm7e_12");
        seedUser("demo_admin", "admin@technosprint.net",   "Demo Admin",                   "admin",             "h_c2sm7e_12");
        seedUser("demo_agent", "agent@technosprint.net",   "Demo Support Agent",           "agent",             "h_c2sm7e_12");
        seedUser("demo_user",  "user@technosprint.net",    "Demo User",                    "user",              "h_c2sm7e_12");
    }

    private void seedUser(String uid, String email, String name, String role, String passwordHash) {
        java.util.Optional<User> existing = userRepository.findByEmailIgnoreCase(email);
        if (existing.isEmpty()) {
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
        } else {
            // Always force-update role, password hash, and active status on every startup
            User user = existing.get();
            user.setRole(role);
            user.setPasswordHash(passwordHash);
            user.setIsActive(true);
            userRepository.save(user);
            log.info("[DatabaseSeeder] Updated existing user credentials: {}", email);
        }
    }

    private void seedDefaultCompanyEmailConfig() {
        try {
            java.util.Optional<CompanyEmailConfig> existingOpt = companyEmailConfigRepository.findById(1L);
            CompanyEmailConfig cfg = existingOpt.orElse(new CompanyEmailConfig());
            cfg.setId(1L);
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
                        "company_name", "Connect IT", "string", "Company name displayed in portal");
                jdbcTemplate.update("INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES (?, ?, ?, ?)",
                        "maintenance_mode", "false", "boolean", "Enable maintenance mode");
                jdbcTemplate.update("INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES (?, ?, ?, ?)",
                        "branding", "{\"companyName\":\"Connect IT\",\"logoBase64\":null,\"logoType\":null}", "json", "Branding logo and company name");
            }
        } catch (Exception e) {
            log.error("[DatabaseSeeder] Failed to seed system settings: {}", e.getMessage());
        }
    }
}
