/**
 * migrate-sqlite-to-mysql.cjs
 * 
 * Full data migration from SQLite (timesheet.sqlite) → MySQL (connectit_db)
 * 
 * Usage:
 *   node migrate-sqlite-to-mysql.cjs
 *
 * Set these env vars first (or edit directly below):
 *   MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE
 *
 * Features:
 *  - Reads all data from SQLite
 *  - Inserts to MySQL with conflict-safe ON DUPLICATE KEY UPDATE
 *  - Preserves Firebase-origin IDs in sla_breaches
 *  - Skips tables that are empty
 *  - Generates a detailed migration report
 */

require('dotenv').config();
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const mysql = require('mysql2/promise');
const fs = require('fs');

const MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'connectit_db',
  multipleStatements: true,
};

const SQLITE_FILE = './timesheet.sqlite';
const REPORT_FILE = './migration-report.json';

const report = {
  startTime: new Date().toISOString(),
  endTime: null,
  tables: {},
  errors: [],
  success: false
};

function log(msg) {
  const ts = new Date().toLocaleTimeString();
  console.log(`[${ts}] ${msg}`);
}

function warn(msg) {
  console.warn(`[WARN] ${msg}`);
  report.errors.push(msg);
}

// Helper to format any date into MySQL DATETIME format (YYYY-MM-DD HH:MM:SS)
function formatMySQLDate(val) {
  if (!val) return null;
  let date;
  if (typeof val === 'string') {
    // If it's already in YYYY-MM-DD HH:MM:SS format
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(val)) {
      return val;
    }
    date = new Date(val);
  } else if (typeof val === 'number') {
    date = new Date(val);
  } else if (val instanceof Date) {
    date = val;
  } else {
    return null;
  }
  
  if (isNaN(date.getTime())) return null;
  
  const pad = (num) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

async function migrateTable(sqliteDb, mysqlConn, tableName, migrateFn) {
  try {
    const rows = await sqliteDb.all(`SELECT * FROM ${tableName}`);
    if (rows.length === 0) {
      log(`  ⟳ ${tableName}: 0 rows — skipped`);
      report.tables[tableName] = { source: 0, migrated: 0, errors: 0, skipped: true };
      return;
    }
    log(`  → ${tableName}: ${rows.length} rows...`);
    let migrated = 0;
    let errors = 0;
    for (const row of rows) {
      try {
        await migrateFn(mysqlConn, row);
        migrated++;
      } catch (err) {
        errors++;
        warn(`    Error in ${tableName} id=${row.id || row.record_id}: ${err.message}`);
      }
    }
    log(`  ✓ ${tableName}: ${migrated}/${rows.length} migrated (${errors} errors)`);
    report.tables[tableName] = { source: rows.length, migrated, errors, skipped: false };
  } catch (err) {
    warn(`Failed to migrate table ${tableName}: ${err.message}`);
    report.tables[tableName] = { source: 0, migrated: 0, errors: 1, skipped: false, fatalError: err.message };
  }
}

async function run() {
  log('=== ConnectIT SQLite → MySQL Migration ===');
  log(`SQLite: ${SQLITE_FILE}`);
  log(`MySQL: ${MYSQL_CONFIG.user}@${MYSQL_CONFIG.host}:${MYSQL_CONFIG.port}/${MYSQL_CONFIG.database}`);
  log('');

  // 1. Open SQLite
  let sqliteDb;
  try {
    sqliteDb = await open({ filename: SQLITE_FILE, driver: sqlite3.Database });
    log('✓ SQLite connected');
  } catch (err) {
    console.error('✗ Failed to open SQLite:', err.message);
    process.exit(1);
  }

  // 2. Connect to MySQL
  let mysqlConn;
  try {
    mysqlConn = await mysql.createConnection(MYSQL_CONFIG);
    await mysqlConn.execute('SELECT 1');
    log('✓ MySQL connected');
  } catch (err) {
    console.error('✗ Failed to connect to MySQL:', err.message);
    console.error('  → Set MYSQL_PASSWORD in your .env file, then re-run.');
    await sqliteDb.close();
    process.exit(1);
  }

  log('\n--- Starting table migrations ---\n');

  // ── users ──────────────────────────────────────────────────────────────
  await migrateTable(sqliteDb, mysqlConn, 'users', async (db, row) => {
    await db.execute(`
      INSERT INTO users (uid, email, name, role, phone, is_active, last_login, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        role = VALUES(role),
        phone = VALUES(phone),
        is_active = VALUES(is_active),
        last_login = VALUES(last_login)
    `, [
      row.uid || `user_${row.id}`,
      row.email || `user_${row.id}@connectit.local`,
      row.name || 'Unknown User',
      row.role || 'user',
      row.phone || null,
      row.is_active !== undefined ? row.is_active : 1,
      formatMySQLDate(row.last_login),
      formatMySQLDate(row.created_at || new Date())
    ]);
  });

  // ── tickets ────────────────────────────────────────────────────────────
  await migrateTable(sqliteDb, mysqlConn, 'tickets', async (db, row) => {
    await db.execute(`
      INSERT INTO tickets (
        ticket_number, caller, category, incident_category, subcategory,
        service, service_offering, cmdb_item, title, description,
        status, priority, impact, urgency, channel,
        assignment_group, assigned_to, assigned_to_name,
        points, response_deadline, resolution_deadline,
        first_response_at, resolved_at, response_sla_status,
        resolution_sla_status, response_sla_start_time, resolution_sla_start_time,
        total_paused_time, created_by, created_by_name, created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        priority = VALUES(priority),
        assigned_to = VALUES(assigned_to),
        assigned_to_name = VALUES(assigned_to_name),
        updated_at = VALUES(updated_at)
    `, [
      row.ticket_number || `INC${Date.now()}`,
      row.caller || 'System',
      row.category || null,
      row.incident_category || null,
      row.subcategory || null,
      row.service || null,
      row.service_offering || null,
      row.cmdb_item || null,
      row.title || 'Untitled Ticket',
      row.description || null,
      row.status || 'New',
      row.priority || '4 - Low',
      row.impact || '3 - Low',
      row.urgency || '3 - Low',
      row.channel || 'Self-service',
      row.assignment_group || null,
      row.assigned_to || null,
      row.assigned_to_name || null,
      row.points || 0,
      formatMySQLDate(row.response_deadline),
      formatMySQLDate(row.resolution_deadline),
      formatMySQLDate(row.first_response_at),
      formatMySQLDate(row.resolved_at),
      row.response_sla_status || 'In Progress',
      row.resolution_sla_status || 'In Progress',
      formatMySQLDate(row.response_sla_start_time),
      formatMySQLDate(row.resolution_sla_start_time),
      row.total_paused_time || 0,
      row.created_by || 'system',
      row.created_by_name || 'System',
      formatMySQLDate(row.created_at || new Date()),
      formatMySQLDate(row.updated_at || new Date())
    ]);
  });

  // ── timesheets ─────────────────────────────────────────────────────────
  await migrateTable(sqliteDb, mysqlConn, 'timesheets', async (db, row) => {
    await db.execute(`
      INSERT INTO timesheets (id, user_id, week_start, week_end, status, total_hours,
        screenshot_url, approved_by, approved_at, rejection_reason, created_at, updated_at, submitted_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        total_hours = VALUES(total_hours),
        updated_at = VALUES(updated_at)
    `, [
      row.id, row.user_id, row.week_start, row.week_end,
      row.status || 'Draft',
      row.total_hours || 0,
      row.screenshot_url || null,
      row.approved_by || null,
      formatMySQLDate(row.approved_at),
      row.rejection_reason || null,
      formatMySQLDate(row.created_at || new Date()),
      formatMySQLDate(row.updated_at || new Date()),
      formatMySQLDate(row.submitted_at)
    ]);
  });

  // ── time_cards ─────────────────────────────────────────────────────────
  await migrateTable(sqliteDb, mysqlConn, 'time_cards', async (db, row) => {
    await db.execute(`
      INSERT INTO time_cards (id, timesheet_id, user_id, entry_date, task,
        hours_worked, description, short_description, start_time, end_time,
        deduct, work_type, billable, notes, status, elapsed_seconds,
        ticket_id, ticket_number, is_system_generated, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE
        hours_worked = VALUES(hours_worked),
        status = VALUES(status),
        updated_at = VALUES(updated_at)
    `, [
      row.id, row.timesheet_id, row.user_id, row.entry_date,
      row.task || null,
      row.hours_worked || 0,
      row.description || null,
      row.short_description || null,
      row.start_time || null,
      row.end_time || null,
      row.deduct || 0,
      row.work_type || null,
      row.billable || null,
      row.notes || null,
      row.status || 'Draft',
      row.elapsed_seconds || 0,
      row.ticket_id || null,
      row.ticket_number || null,
      row.is_system_generated || 0,
      formatMySQLDate(row.created_at || new Date()),
      formatMySQLDate(row.updated_at || new Date())
    ]);
  });

  // ── activity_sessions ──────────────────────────────────────────────────
  await migrateTable(sqliteDb, mysqlConn, 'activity_sessions', async (db, row) => {
    await db.execute(`
      INSERT INTO activity_sessions (id, session_id, user_id, user_name, start_time,
        stop_time, duration, status, ticket_number, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE
        stop_time = VALUES(stop_time),
        duration = VALUES(duration),
        status = VALUES(status)
    `, [
      row.id, row.session_id, row.user_id, row.user_name || null,
      formatMySQLDate(row.start_time),
      formatMySQLDate(row.stop_time),
      row.duration || 0,
      row.status || 'active',
      row.ticket_number || null,
      formatMySQLDate(row.created_at || new Date())
    ]);
  });

  // ── activity_entries ───────────────────────────────────────────────────
  await migrateTable(sqliteDb, mysqlConn, 'activity_entries', async (db, row) => {
    await db.execute(`
      INSERT INTO activity_entries (id, session_id, user_id, screenshot_url, screenshot_filename,
        screenshot_format, screenshot_size_kb, activity_label, description, confidence,
        captured_at, keystrokes, clicks, ticket_number, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE
        activity_label = VALUES(activity_label),
        description = VALUES(description)
    `, [
      row.id, row.session_id, row.user_id,
      row.screenshot_url || null,
      row.screenshot_filename || null,
      row.screenshot_format || null,
      row.screenshot_size_kb || null,
      row.activity_label || null,
      row.description || null,
      row.confidence || null,
      formatMySQLDate(row.captured_at),
      row.keystrokes || 0,
      row.clicks || 0,
      row.ticket_number || null,
      formatMySQLDate(row.created_at || new Date())
    ]);
  });

  // ── sla_breaches ───────────────────────────────────────────────────────
  await migrateTable(sqliteDb, mysqlConn, 'sla_breaches', async (db, row) => {
    await db.execute(`
      INSERT INTO sla_breaches (record_id, record_type, assigned_user, assigned_user_name,
        sla_name, sla_target, actual_time_taken, breach_duration, breach_timeslot,
        breach_timestamp, status, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE
        actual_time_taken = VALUES(actual_time_taken),
        breach_duration = VALUES(breach_duration),
        breach_timeslot = VALUES(breach_timeslot),
        status = VALUES(status)
    `, [
      row.record_id, row.record_type || 'Ticket',
      row.assigned_user, row.assigned_user_name || null,
      row.sla_name, row.sla_target || null,
      row.actual_time_taken || null, row.breach_duration || null,
      row.breach_timeslot || null, row.breach_timestamp || null,
      row.status || 'active',
      formatMySQLDate(row.created_at || new Date())
    ]);
  });

  // ── notifications ──────────────────────────────────────────────────────
  await migrateTable(sqliteDb, mysqlConn, 'notifications', async (db, row) => {
    await db.execute(`
      INSERT INTO notifications (user_id, message, ticket_id, ticket_number,
        actor_id, actor_name, is_read, created_at)
      VALUES (?,?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE is_read = VALUES(is_read)
    `, [
      row.user_id, row.message || '',
      row.ticket_id || null, row.ticket_number || null,
      row.actor_id || null, row.actor_name || null,
      row.is_read || 0,
      formatMySQLDate(row.created_at || new Date())
    ]);
  });

  // ── company_email_configs ──────────────────────────────────────────────
  await migrateTable(sqliteDb, mysqlConn, 'company_email_configs', async (db, row) => {
    await db.execute(`
      INSERT INTO company_email_configs (id, company_name, email_address, smtp_host,
        smtp_port, smtp_user, smtp_pass, imap_host, imap_port, imap_user, imap_pass,
        encryption, is_active, is_default, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE
        smtp_host = VALUES(smtp_host),
        is_active = VALUES(is_active)
    `, [
      row.id, row.company_name || null, row.email_address || null,
      row.smtp_host || null, row.smtp_port || null,
      row.smtp_user || null, row.smtp_pass || null,
      row.imap_host || null, row.imap_port || null,
      row.imap_user || null, row.imap_pass || null,
      row.encryption || null,
      row.is_active !== undefined ? row.is_active : 1,
      row.is_default || 0,
      formatMySQLDate(row.created_at || new Date()),
      formatMySQLDate(row.updated_at || new Date())
    ]);
  });

  // ── message_history ────────────────────────────────────────────────────
  await migrateTable(sqliteDb, mysqlConn, 'message_history', async (db, row) => {
    await db.execute(`
      INSERT INTO message_history (id, user_id, user_name, message_type, recipient, message_content, sent_at)
      VALUES (?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE
        user_id = VALUES(user_id),
        user_name = VALUES(user_name),
        message_type = VALUES(message_type),
        recipient = VALUES(recipient),
        message_content = VALUES(message_content),
        sent_at = VALUES(sent_at)
    `, [
      row.id,
      row.user_id,
      row.user_name || null,
      row.message_type,
      row.recipient || null,
      row.message_content || null,
      formatMySQLDate(row.sent_at || new Date())
    ]);
  });

  // ── ticket_activities ──────────────────────────────────────────────────
  await migrateTable(sqliteDb, mysqlConn, 'ticket_activities', async (db, row) => {
    await db.execute(`
      INSERT INTO ticket_activities (id, ticket_id, activity_type, visibility_type,
        created_by, created_by_name, message, created_at)
      VALUES (?,?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE message = VALUES(message)
    `, [
      row.id,
      String(row.ticket_id || ''),
      row.activity_type || 'system',
      row.visibility_type || 'internal',
      row.created_by || null,
      row.created_by_name || null,
      row.message || '',
      formatMySQLDate(row.created_at || new Date())
    ]);
  });

  // ── email_queue ────────────────────────────────────────────────────────
  await migrateTable(sqliteDb, mysqlConn, 'email_queue', async (db, row) => {
    await db.execute(`
      INSERT INTO email_queue (id, ticket_id, company_id, email_integration_id,
        direction, recipient, subject, body, status, attempts, error_message, created_at, processed_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE status = VALUES(status), attempts = VALUES(attempts)
    `, [
      row.id, row.ticket_id || null, row.company_id || null, row.email_integration_id || null,
      row.direction || 'outbound',
      row.recipient || null, row.subject || null, row.body || null,
      row.status || 'pending',
      row.attempts || 0, row.error_message || null,
      formatMySQLDate(row.created_at || new Date()),
      formatMySQLDate(row.processed_at)
    ]);
  });

  // ── sla_audit_logs ─────────────────────────────────────────────────────
  await migrateTable(sqliteDb, mysqlConn, 'sla_audit_logs', async (db, row) => {
    await db.execute(`
      INSERT INTO sla_audit_logs (ticket_id, sla_type, event_type, timestamp, reason)
      VALUES (?,?,?,?,?)
    `, [
      String(row.ticket_id || ''),
      row.sla_type || 'unknown',
      row.event_type || 'unknown',
      formatMySQLDate(row.timestamp || new Date()),
      row.reason || null
    ]);
  });

  // ── incident_categories ────────────────────────────────────────────────
  await migrateTable(sqliteDb, mysqlConn, 'incident_categories', async (db, row) => {
    await db.execute(`
      INSERT INTO incident_categories (id, name, description, status, created_by, created_date)
      VALUES (?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE name = VALUES(name), status = VALUES(status)
    `, [
      row.id, row.name, row.description || null,
      row.status || 'Active',
      row.created_by || null,
      formatMySQLDate(row.created_date || new Date())
    ]);
  });

  // ── meetings ───────────────────────────────────────────────────────────
  await migrateTable(sqliteDb, mysqlConn, 'meetings', async (db, row) => {
    await db.execute(`
      INSERT INTO meetings (id, meeting_id, creation_method, title, meeting_date,
        platform, conducted_by, attendees, absentees, one_line_summary,
        short_description, detailed_description, discussion_points, decisions_taken,
        action_items, responsible_person, target_date, next_steps, remarks,
        file_path, file_name, file_size, status, version, created_by, created_by_name,
        created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE status = VALUES(status), updated_at = VALUES(updated_at)
    `, [
      row.id, row.meeting_id, row.creation_method || 'manual',
      row.title, formatMySQLDate(row.meeting_date),
      row.platform || null, row.conducted_by || null,
      row.attendees || null, row.absentees || null,
      row.one_line_summary || null, row.short_description || null,
      row.detailed_description || null, row.discussion_points || null,
      row.decisions_taken || null, row.action_items || null,
      row.responsible_person || null, row.target_date || null,
      row.next_steps || null, row.remarks || null,
      row.file_path || null, row.file_name || null, row.file_size || null,
      row.status || 'Draft', row.version || 1,
      row.created_by || null, row.created_by_name || null,
      formatMySQLDate(row.created_at || new Date()),
      formatMySQLDate(row.updated_at || new Date())
    ]);
  });

  // ── companies ──────────────────────────────────────────────────────────
  await migrateTable(sqliteDb, mysqlConn, 'companies', async (db, row) => {
    await db.execute(`
      INSERT INTO companies (id, name, contact_name, phone, email, address1, address2,
        city, province, postal_code, country, website, logo_url, type, status,
        email_integration_id, primary_color, secondary_color, support_signature,
        industry, priority_tier, default_assignment_group, default_sla_policy,
        default_support_mailbox, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE name = VALUES(name), status = VALUES(status)
    `, [
      row.id, row.name || null, row.contact_name || null,
      row.phone || null, row.email || null,
      row.address1 || null, row.address2 || null,
      row.city || null, row.province || null,
      row.postal_code || null, row.country || null,
      row.website || null, row.logo_url || null,
      row.type || null, row.status || null,
      row.email_integration_id || null,
      row.primary_color || null, row.secondary_color || null,
      row.support_signature || null, row.industry || null,
      row.priority_tier || null, row.default_assignment_group || null,
      row.default_sla_policy || null, row.default_support_mailbox || null,
      formatMySQLDate(row.created_at || new Date()),
      formatMySQLDate(row.updated_at || new Date())
    ]);
  });

  // ── Final report ───────────────────────────────────────────────────────
  await mysqlConn.end();
  await sqliteDb.close();

  report.endTime = new Date().toISOString();
  report.success = report.errors.length === 0;

  let totalSource = 0, totalMigrated = 0, totalErrors = 0;
  for (const [table, stats] of Object.entries(report.tables)) {
    totalSource += stats.source;
    totalMigrated += stats.migrated;
    totalErrors += stats.errors;
  }

  log('\n=== Migration Complete ===');
  log(`Total source rows:   ${totalSource}`);
  log(`Total migrated rows: ${totalMigrated}`);
  log(`Total errors:        ${totalErrors}`);
  log(`Warnings:            ${report.errors.length}`);

  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
  log(`\nDetailed report saved to: ${REPORT_FILE}`);

  if (totalErrors > 0) {
    log('\n⚠ Some rows had errors. Check migration-report.json for details.');
  } else {
    log('\n✓ All data migrated successfully!');
  }
}

run().catch(err => {
  console.error('Fatal migration error:', err.message);
  report.errors.push('FATAL: ' + err.message);
  report.endTime = new Date().toISOString();
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
  process.exit(1);
});
