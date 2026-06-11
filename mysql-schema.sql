-- Connect IT - MySQL Database Schema
-- Migration from Firebase Firestore to MySQL
-- Run this SQL to create the complete database structure

-- Create database
CREATE DATABASE IF NOT EXISTS connectit_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE connectit_db;

-- ============================================================
-- USERS TABLE (Replaces Firebase Auth + Firestore users collection)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uid VARCHAR(128) UNIQUE NOT NULL,          -- Firebase UID format compatibility
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),                  -- For email/password auth
    name VARCHAR(255) NOT NULL,
    role ENUM('user', 'agent', 'sub_admin', 'admin', 'super_admin', 'ultra_super_admin') DEFAULT 'user',
    phone VARCHAR(50),
    department VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    is_demo BOOLEAN DEFAULT FALSE,
    email_verified BOOLEAN DEFAULT FALSE,
    photo_url TEXT,
    provider VARCHAR(50) DEFAULT 'email',        -- email, google, demo
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    INDEX idx_email (email),
    INDEX idx_uid (uid),
    INDEX idx_role (role),
    INDEX idx_active (is_active)
) ENGINE=InnoDB;

-- ============================================================
-- TICKETS TABLE (Replaces Firestore tickets collection)
-- ============================================================
CREATE TABLE IF NOT EXISTS tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_number VARCHAR(50) UNIQUE NOT NULL,   -- INCxxxxxxx format
    caller VARCHAR(255) NOT NULL,
    caller_user_id VARCHAR(128),                 -- Reference to users.uid
    caller_email VARCHAR(255),
    affected_user VARCHAR(255),
    affected_user_id VARCHAR(128),
    category VARCHAR(100),
    incident_category VARCHAR(100) NULL,
    subcategory VARCHAR(100),
    service VARCHAR(100),
    service_offering VARCHAR(100),
    cmdb_item VARCHAR(100),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    channel ENUM('Phone', 'Email', 'Self-service', 'Walk-in', 'Other') DEFAULT 'Self-service',
    status ENUM('New', 'In Progress', 'On Hold', 'Resolved', 'Closed', 'Canceled', 'Pending Approval') DEFAULT 'New',
    impact ENUM('1 - High', '2 - Medium', '3 - Low') DEFAULT '3 - Low',
    urgency ENUM('1 - High', '2 - Medium', '3 - Low') DEFAULT '3 - Low',
    priority ENUM('1 - Critical', '2 - High', '3 - Moderate', '4 - Low') DEFAULT '4 - Low',
    assignment_group VARCHAR(100),
    assigned_to VARCHAR(128),                    -- Reference to users.uid
    assigned_to_name VARCHAR(255),
    created_by VARCHAR(128) NOT NULL,             -- Reference to users.uid
    created_by_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    first_response_at TIMESTAMP NULL,
    resolved_at TIMESTAMP NULL,
    closed_at TIMESTAMP NULL,
    response_deadline TIMESTAMP NULL,
    resolution_deadline TIMESTAMP NULL,
    on_hold_start TIMESTAMP NULL,
    on_hold_reason VARCHAR(255),
    total_paused_time_ms BIGINT DEFAULT 0,
    response_sla_status ENUM('In Progress', 'Completed', 'Breached', 'At Risk') DEFAULT 'In Progress',
    resolution_sla_status ENUM('In Progress', 'Completed', 'Breached', 'At Risk') DEFAULT 'In Progress',
    points INT DEFAULT 0,
    approval_status ENUM('Not Required', 'Pending', 'Approved', 'Rejected') DEFAULT 'Not Required',
    affected_user_email VARCHAR(255) NULL,
    reporting_user_email VARCHAR(255) NULL,
    resolution_code VARCHAR(255) NULL,
    resolution_notes TEXT NULL,
    resolution_method VARCHAR(255) NULL,
    closure_reason VARCHAR(255) NULL,
    company_id BIGINT NULL,
    parent_ticket_id INT NULL,
    FOREIGN KEY (parent_ticket_id) REFERENCES tickets(id) ON DELETE SET NULL,
    INDEX idx_ticket_number (ticket_number),
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_assigned_to (assigned_to),
    INDEX idx_created_by (created_by),
    INDEX idx_caller (caller),
    INDEX idx_category (category),
    INDEX idx_created_at (created_at),
    INDEX idx_resolved_at (resolved_at),
    INDEX idx_status_priority (status, priority),
    INDEX idx_assigned_status (assigned_to, status),
    FULLTEXT INDEX idx_title_description (title, description)
) ENGINE=InnoDB;

-- ============================================================
-- TICKET HISTORY TABLE (Replaces Firestore ticket history array)
-- ============================================================
CREATE TABLE IF NOT EXISTS ticket_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    action VARCHAR(255) NOT NULL,
    user VARCHAR(255),
    user_id VARCHAR(128),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    details TEXT,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    INDEX idx_ticket_id (ticket_id),
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB;

-- ============================================================
-- COMMENTS TABLE (Replaces Firestore comments subcollection)
-- ============================================================
CREATE TABLE IF NOT EXISTS comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    user_id VARCHAR(128),
    user_name VARCHAR(255),
    user_role VARCHAR(50),
    message TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE,             -- Internal note vs public comment
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    INDEX idx_ticket_id (ticket_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB;

-- ============================================================
-- TICKET ACTIVITIES TABLE (Unified Timeline)
-- ============================================================
CREATE TABLE IF NOT EXISTS ticket_activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    activity_type VARCHAR(50) NOT NULL,            -- e.g., 'work_note', 'comment', 'email', 'status_change', 'system'
    visibility_type VARCHAR(50) NOT NULL,          -- e.g., 'internal', 'public'
    channel VARCHAR(50) DEFAULT 'portal',
    message_id VARCHAR(255) NULL,
    thread_id VARCHAR(255) NULL,
    created_by VARCHAR(128),
    created_by_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    message TEXT NOT NULL,
    metadata_json JSON,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    INDEX idx_ticket_id (ticket_id),
    INDEX idx_created_at (created_at),
    INDEX idx_visibility (visibility_type)
) ENGINE=InnoDB;

-- ============================================================
-- APPROVALS TABLE (Replaces Firestore approvals collection)
-- ============================================================
CREATE TABLE IF NOT EXISTS approvals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
    requested_by VARCHAR(128) NOT NULL,
    requested_by_name VARCHAR(255),
    approved_by VARCHAR(128),
    approved_by_name VARCHAR(255),
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    approved_at TIMESTAMP NULL,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    INDEX idx_ticket_id (ticket_id),
    INDEX idx_status (status),
    INDEX idx_requested_by (requested_by)
) ENGINE=InnoDB;

-- ============================================================
-- SLA POLICIES TABLE (Replaces Firestore sla_policies collection)
-- ============================================================
CREATE TABLE IF NOT EXISTS sla_policies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    priority VARCHAR(50) NOT NULL,
    category VARCHAR(100),
    response_time_hours INT NOT NULL,
    resolution_time_hours INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_priority (priority),
    INDEX idx_category (category),
    INDEX idx_active (is_active),
    UNIQUE KEY unique_priority_category (priority, category)
) ENGINE=InnoDB;

-- ============================================================
-- ASSETS/CMD TABLE (Replaces Firestore assets collection)
-- ============================================================
CREATE TABLE IF NOT EXISTS assets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type ENUM('Server', 'Database', 'Network', 'Application', 'Hardware', 'Service') DEFAULT 'Hardware',
    status ENUM('Operational', 'Degraded', 'Maintenance', 'Retired') DEFAULT 'Operational',
    owner VARCHAR(128),
    owner_name VARCHAR(255),
    location VARCHAR(255),
    serial_number VARCHAR(255),
    model VARCHAR(255),
    manufacturer VARCHAR(255),
    purchase_date DATE,
    warranty_expiry DATE,
    ip_address VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_type (type),
    INDEX idx_status (status),
    INDEX idx_owner (owner)
) ENGINE=InnoDB;

-- ============================================================
-- PROBLEMS TABLE (Replaces Firestore problems collection)
-- ============================================================
CREATE TABLE IF NOT EXISTS problems (
    id INT AUTO_INCREMENT PRIMARY KEY,
    problem_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status ENUM('Open', 'Under Investigation', 'Resolved', 'Closed') DEFAULT 'Open',
    priority ENUM('1 - Critical', '2 - High', '3 - Moderate', '4 - Low') DEFAULT '4 - Low',
    category VARCHAR(100),
    root_cause TEXT,
    workaround TEXT,
    resolution TEXT,
    assigned_to VARCHAR(128),
    assigned_to_name VARCHAR(255),
    reported_by VARCHAR(128),
    reported_by_name VARCHAR(255),
    related_incidents INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    closed_at TIMESTAMP NULL,
    INDEX idx_problem_number (problem_number),
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_assigned_to (assigned_to)
) ENGINE=InnoDB;

-- ============================================================
-- CHANGES TABLE (Replaces Firestore changes collection)
-- ============================================================
CREATE TABLE IF NOT EXISTS changes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    change_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    type ENUM('Normal', 'Standard', 'Emergency') DEFAULT 'Normal',
    state ENUM('Draft', 'Submitted', 'Planned', 'Approved', 'In Progress', 'Completed', 'Closed', 'Canceled') DEFAULT 'Draft',
    risk ENUM('Low', 'Medium', 'High', 'Critical') DEFAULT 'Low',
    impact TEXT,
    rollback_plan TEXT,
    requester VARCHAR(128) NOT NULL,
    requester_name VARCHAR(255),
    assigned_to VARCHAR(128),
    assigned_to_name VARCHAR(255),
    planned_start_date TIMESTAMP NULL,
    planned_end_date TIMESTAMP NULL,
    actual_start_date TIMESTAMP NULL,
    actual_end_date TIMESTAMP NULL,
    category VARCHAR(100),
    affected_services TEXT,
    approval_status ENUM('Not Required', 'Pending', 'Approved', 'Rejected') DEFAULT 'Not Required',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_change_number (change_number),
    INDEX idx_type (type),
    INDEX idx_state (state),
    INDEX idx_risk (risk),
    INDEX idx_requester (requester),
    INDEX idx_planned_dates (planned_start_date, planned_end_date)
) ENGINE=InnoDB;

-- ============================================================
-- KNOWLEDGE BASE TABLE (Replaces Firestore knowledge collection)
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_articles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    article_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    content TEXT NOT NULL,
    summary TEXT,
    tags TEXT,
    views INT DEFAULT 0,
    rating DECIMAL(2,1) DEFAULT 0,
    rating_count INT DEFAULT 0,
    helpful_count INT DEFAULT 0,
    not_helpful_count INT DEFAULT 0,
    author VARCHAR(128) NOT NULL,
    author_name VARCHAR(255),
    reviewer VARCHAR(128),
    reviewer_name VARCHAR(255),
    status ENUM('Draft', 'Published', 'Archived') DEFAULT 'Draft',
    visibility ENUM('Internal', 'Public') DEFAULT 'Internal',
    version INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    published_at TIMESTAMP NULL,
    archived_at TIMESTAMP NULL,
    INDEX idx_article_number (article_number),
    INDEX idx_category (category),
    INDEX idx_status (status),
    INDEX idx_author (author),
    INDEX idx_views (views),
    FULLTEXT INDEX idx_title_content (title, content, summary)
) ENGINE=InnoDB;

-- ============================================================
-- NOTIFICATIONS TABLE (For real-time notifications)
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(128) NOT NULL,
    type ENUM('ticket_assigned', 'ticket_updated', 'approval_required', 'sla_breach', 'system') DEFAULT 'system',
    title VARCHAR(255) NOT NULL,
    message TEXT,
    related_ticket_id INT,
    related_entity_type VARCHAR(50),               -- ticket, problem, change, approval
    related_entity_id VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_user_read (user_id, is_read),
    INDEX idx_created_at (created_at),
    INDEX idx_type (type),
    FOREIGN KEY (related_ticket_id) REFERENCES tickets(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- USER SESSIONS TABLE (For session management)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(128) NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(50),
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_session_token (session_token),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB;

-- ============================================================
-- AUDIT LOG TABLE (For tracking all changes)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,            -- ticket, user, asset, etc.
    entity_id VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,                  -- CREATE, UPDATE, DELETE
    user_id VARCHAR(128),
    user_name VARCHAR(255),
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB;

-- ============================================================
-- SYSTEM SETTINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT,
    updated_by VARCHAR(128),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_setting_key (setting_key)
) ENGINE=InnoDB;

-- ============================================================
-- TIMESHEETS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS timesheets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(128) NOT NULL,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    status ENUM('Draft', 'Submitted', 'Approved', 'Rejected') DEFAULT 'Draft',
    total_hours DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP NULL,
    INDEX idx_user_week (user_id, week_start),
    INDEX idx_status (status)
) ENGINE=InnoDB;

-- ============================================================
-- TIME CARDS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS time_cards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    timesheet_id INT NOT NULL,
    user_id VARCHAR(128) NOT NULL,
    entry_date DATE NOT NULL,
    task VARCHAR(255),
    hours_worked DECIMAL(10, 2) DEFAULT 0.00,
    description TEXT,
    short_description VARCHAR(255),
    start_time VARCHAR(20),
    end_time VARCHAR(20),
    deduct DECIMAL(10, 2) DEFAULT 0.00,
    work_type VARCHAR(50),
    billable VARCHAR(50),
    status ENUM('Draft', 'Submitted', 'Approved', 'Rejected') DEFAULT 'Draft',
    elapsed_seconds INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (timesheet_id) REFERENCES timesheets(id) ON DELETE CASCADE,
    INDEX idx_timesheet_id (timesheet_id),
    INDEX idx_user_date (user_id, entry_date)
) ENGINE=InnoDB;

-- ============================================================
-- INSERT DEFAULT SLA POLICIES
-- ============================================================
INSERT INTO sla_policies (name, priority, response_time_hours, resolution_time_hours, description) VALUES
('Critical Priority SLA', '1 - Critical', 1, 4, 'Immediate response required for critical issues'),
('High Priority SLA', '2 - High', 4, 8, 'Urgent response for high priority issues'),
('Moderate Priority SLA', '3 - Moderate', 8, 24, 'Standard response for moderate priority'),
('Low Priority SLA', '4 - Low', 24, 72, 'Best effort response for low priority');

-- ============================================================
-- INSERT DEFAULT SYSTEM SETTINGS
-- ============================================================
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('ticket_number_prefix', 'INC', 'string', 'Prefix for incident ticket numbers'),
('ticket_number_next', '1000000', 'number', 'Next ticket number sequence'),
('enable_sla_monitoring', 'true', 'boolean', 'Enable automatic SLA monitoring'),
('enable_email_notifications', 'false', 'boolean', 'Enable email notifications'),
('company_name', 'Connect IT', 'string', 'Company name displayed in portal'),
('maintenance_mode', 'false', 'boolean', 'Enable maintenance mode');

-- ============================================================
-- INCIDENT CATEGORIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS incident_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    status ENUM('Active', 'Inactive') DEFAULT 'Active',
    created_by VARCHAR(255),
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated_by VARCHAR(255),
    last_updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_status (status)
) ENGINE=InnoDB;

-- ============================================================
-- EMAIL QUEUE TABLE (For background outbound email processing)
-- ============================================================
CREATE TABLE IF NOT EXISTS email_queue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT,
    company_id INT,
    email_integration_id INT,
    direction ENUM('outbound', 'inbound') DEFAULT 'outbound',
    recipient VARCHAR(255),
    subject VARCHAR(255),
    body TEXT,
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    attempts INT DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    INDEX idx_status (status),
    INDEX idx_ticket (ticket_id)
) ENGINE=InnoDB;

-- ============================================================
-- TICKET EMAIL ACTIVITIES TABLE (Audit trail for emails)
-- ============================================================
CREATE TABLE IF NOT EXISTS ticket_email_activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    direction ENUM('inbound', 'outbound'),
    sender VARCHAR(255),
    recipient VARCHAR(255),
    subject VARCHAR(255),
    body TEXT,
    status ENUM('success', 'failed', 'pending'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
    INDEX idx_ticket_id (ticket_id)
) ENGINE=InnoDB;
