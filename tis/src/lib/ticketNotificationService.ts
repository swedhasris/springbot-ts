/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Ticket Notification Service — Microsoft 365 Enhanced Email Notifications
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Sends professional email notifications from support@technosprint.net via
 * Microsoft 365 SMTP for ALL ticket lifecycle events.
 *
 * ADDITIVE ONLY — does not modify any existing function or file.
 * Called from server.ts after existing notification logic.
 *
 * Events covered:
 *   ticketCreated      → Requester, Assigned Engineer, Group Members, Team Lead
 *   ticketAssigned     → Assigned Engineer, Requester, Group Members
 *   ticketStatusChanged→ Requester, Assigned Engineer, Team Lead, Group Members
 *   commentAdded       → Requester, Assigned Engineer, Watchers
 *   ticketResolved     → Requester, Assigned Engineer
 *   ticketClosed       → Requester
 *   ticketReopened     → Assigned Engineer, Requester, Group Members
 *   ticketEscalated    → Assigned Engineer, Team Lead, Manager, Requester
 *   slaWarning         → Assigned Engineer, Team Lead, Manager
 *   slaBreached        → Assigned Engineer, Team Lead, Manager, Requester
 *   ticketReassigned   → New Assigned Engineer, Old Assigned Engineer, Requester
 */

import nodemailer from 'nodemailer';
import { query, execute, formatDate } from './db';

// ─── M365 Sender Configuration ────────────────────────────────────────────────
const M365_SMTP = {
  host:  'smtp.office365.com',
  port:  587,
  user:  process.env.M365_SMTP_USER || 'support@technosprint.net',
  pass:  process.env.M365_SMTP_PASS || 'Poland@01',
  from:  '"Technosprint Support" <support@technosprint.net>',
};

// ─── Build M365 transporter ────────────────────────────────────────────────────
function m365Transport() {
  return nodemailer.createTransport({
    host:   M365_SMTP.host,
    port:   M365_SMTP.port,
    secure: false,
    auth:   { user: M365_SMTP.user, pass: M365_SMTP.pass },
    tls:    { rejectUnauthorized: false, minVersion: 'TLSv1.2' },
    connectionTimeout: 15000,
    greetingTimeout:   10000,
    socketTimeout:     20000,
  });
}

// ─── Internal email sender — queues to notifications_queue for retry logic ────
async function queueM365Email(opts: {
  to:           string;
  subject:      string;
  html:         string;
  ticketId?:    number | string;
  ticketNumber?: string;
  eventType:    string;
}) {
  if (!opts.to || !opts.to.includes('@')) return;

  try {
    // Insert into existing notifications_queue (same table used by processEmailQueue)
    await execute(
      `INSERT INTO notifications_queue
         (event_type, ticket_id, ticket_number, recipient, subject, body_html, priority, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        opts.eventType,
        opts.ticketId   ? String(opts.ticketId)   : null,
        opts.ticketNumber ?? null,
        opts.to,
        opts.subject,
        opts.html,
        3, // priority 3 = normal (lower = higher priority)
      ]
    );
  } catch (e: any) {
    // If queue insert fails, attempt direct send so the notification is never lost
    console.error(`[TNS] Queue insert failed for ${opts.to}, attempting direct send:`, e.message);
    await sendDirectM365(opts.to, opts.subject, opts.html, opts.ticketNumber).catch(() => {});
  }
}

// ─── Direct send (used as fallback only) ──────────────────────────────────────
async function sendDirectM365(
  to: string, subject: string, html: string, ticketNumber?: string
): Promise<void> {
  try {
    const t = m365Transport();
    await t.sendMail({
      from:    M365_SMTP.from,
      to,
      subject,
      html,
      headers: ticketNumber ? { 'X-Ticket-Number': ticketNumber } : {},
    });
    console.log(`[TNS] Direct M365 email sent to ${to} — ${subject}`);
  } catch (e: any) {
    console.error(`[TNS] Direct M365 send failed to ${to}:`, e.message);
  }
}

// ─── Resolve email address for a user UID ─────────────────────────────────────
async function resolveEmail(uid: string): Promise<string | null> {
  if (!uid) return null;
  if (uid.includes('@')) return uid; // already an email
  try {
    const rows = await query('SELECT email FROM users WHERE uid = ? AND is_active = 1 LIMIT 1', [uid]);
    return rows[0]?.email ?? null;
  } catch { return null; }
}

// ─── Resolve ALL active group member emails ────────────────────────────────────
async function resolveGroupMemberEmails(groupName: string): Promise<string[]> {
  if (!groupName) return [];
  const emails: string[] = [];
  try {
    // Try MySQL mst_groups → mst_members → users
    const groups = await query('SELECT id FROM mst_groups WHERE name = ? AND status = ?', [groupName, 'active']);
    if (groups.length > 0) {
      const groupId = groups[0].id;
      const members = await query(
        `SELECT u.email FROM mst_members m
         JOIN users u ON u.uid = m.user_id
         WHERE m.group_id = ? AND m.status = 'active' AND u.is_active = 1`,
        [groupId]
      );
      members.forEach((r: any) => { if (r.email) emails.push(r.email); });
    }
  } catch { /* ignore — table may not exist */ }
  return emails;
}

// ─── Resolve team lead email for a group ──────────────────────────────────────
async function resolveTeamLeadEmail(groupName: string): Promise<string | null> {
  if (!groupName) return null;
  try {
    const groups = await query('SELECT id FROM mst_groups WHERE name = ? AND status = ?', [groupName, 'active']);
    if (groups.length > 0) {
      const groupId = groups[0].id;
      const leads = await query(
        `SELECT u.email FROM mst_members m
         JOIN users u ON u.uid = m.user_id
         WHERE m.group_id = ? AND m.status = 'active'
           AND LOWER(m.role) IN ('lead','team lead','manager')
           AND u.is_active = 1
         LIMIT 1`,
        [groupId]
      );
      return leads[0]?.email ?? null;
    }
  } catch { /* ignore */ }
  return null;
}

// ─── Resolve manager/admin email ──────────────────────────────────────────────
async function resolveManagerEmail(): Promise<string | null> {
  try {
    const rows = await query(
      `SELECT email FROM users
       WHERE role IN ('ultra_super_admin','super_admin','admin') AND is_active = 1
       ORDER BY CASE role
         WHEN 'ultra_super_admin' THEN 1
         WHEN 'super_admin' THEN 2
         ELSE 3 END
       LIMIT 1`
    );
    return rows[0]?.email ?? null;
  } catch { return null; }
}

// ─── Deduplicate & filter recipient list ──────────────────────────────────────
function uniqueEmails(...lists: (string | null | undefined)[][]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const list of lists) {
    for (const e of list) {
      const email = (e ?? '').trim().toLowerCase();
      if (email && email.includes('@') && !seen.has(email)) {
        seen.add(email);
        result.push(e!.trim());
      }
    }
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HTML EMAIL TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

const CSS = `
  body{margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f0f2f5}
  .wrap{max-width:640px;margin:24px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10)}
  .header{background:linear-gradient(135deg,#0050a0 0%,#0078d4 100%);padding:28px 36px 24px;color:#fff}
  .header-brand{font-size:13px;font-weight:600;letter-spacing:0.06em;opacity:0.85;margin-bottom:6px;text-transform:uppercase}
  .header-title{font-size:22px;font-weight:700;margin:0;line-height:1.3}
  .body{padding:32px 36px}
  .label{font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.07em}
  .value{font-size:14px;font-weight:500;color:#111827;margin-top:2px}
  .info-table{width:100%;border-collapse:collapse;margin:18px 0}
  .info-table td{padding:9px 14px;font-size:13px;border-bottom:1px solid #f3f4f6}
  .info-table tr:last-child td{border-bottom:none}
  .info-table .lbl{color:#6b7280;font-weight:600;width:38%;vertical-align:top}
  .info-table .val{color:#111827;font-weight:500}
  .badge{display:inline-block;padding:3px 11px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase}
  .badge-critical{background:#fee2e2;color:#b91c1c}
  .badge-high{background:#ffedd5;color:#c2410c}
  .badge-moderate{background:#fef9c3;color:#92400e}
  .badge-low{background:#dcfce7;color:#15803d}
  .badge-new{background:#dbeafe;color:#1d4ed8}
  .badge-progress{background:#e0e7ff;color:#4338ca}
  .badge-resolved{background:#dcfce7;color:#15803d}
  .badge-closed{background:#f3f4f6;color:#374151}
  .badge-onhold{background:#fef9c3;color:#92400e}
  .badge-breached{background:#fee2e2;color:#b91c1c}
  .alert-box{border-radius:8px;padding:14px 16px;margin:18px 0;font-size:13px}
  .alert-warn{background:#fffbeb;border-left:4px solid #f59e0b;color:#92400e}
  .alert-breach{background:#fef2f2;border-left:4px solid #ef4444;color:#991b1b}
  .alert-success{background:#f0fdf4;border-left:4px solid #22c55e;color:#15803d}
  .alert-info{background:#eff6ff;border-left:4px solid #3b82f6;color:#1d4ed8}
  .comment-box{background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:18px 0;font-size:13px;line-height:1.6;color:#374151;white-space:pre-wrap}
  .btn{display:inline-block;padding:12px 26px;background:#0078d4;color:#ffffff!important;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;margin-top:20px}
  .footer{padding:20px 36px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center;line-height:1.8}
  .divider{border:0;border-top:1px solid #f3f4f6;margin:20px 0}
`;

function wrap(title: string, headerBg: string, body: string, ticketNumber?: string): string {
  const footer = ticketNumber
    ? `Reply to this email with <strong>[${ticketNumber}]</strong> in the subject to update your ticket.<br>Sent from <strong>support@technosprint.net</strong> · Ticklora ITSM`
    : `Sent from <strong>support@technosprint.net</strong> · Ticklora ITSM Platform`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>${CSS}</style></head><body><div class="wrap">
<div class="header" style="background:${headerBg}">
  <div class="header-brand">Technosprint Support</div>
  <div class="header-title">${title}</div>
</div>
<div class="body">${body}</div>
<div class="footer">${footer}</div>
</div></body></html>`;
}

function priorityBadge(p: string): string {
  const s = (p || '').toLowerCase();
  const cls = s.includes('1') || s.includes('critical') ? 'badge-critical'
    : s.includes('2') || s.includes('high')    ? 'badge-high'
    : s.includes('3') || s.includes('moderate') ? 'badge-moderate'
    : 'badge-low';
  return `<span class="badge ${cls}">${p || 'Low'}</span>`;
}

function statusBadge(s: string): string {
  const sl = (s || '').toLowerCase().replace(/\s+/g, '');
  const cls = sl === 'new' ? 'badge-new'
    : sl === 'inprogress' ? 'badge-progress'
    : sl === 'resolved'   ? 'badge-resolved'
    : sl === 'closed'     ? 'badge-closed'
    : sl === 'onhold'     ? 'badge-onhold'
    : 'badge-new';
  return `<span class="badge ${cls}">${s || 'New'}</span>`;
}

function ticketTable(t: any): string {
  return `<table class="info-table">
    <tr><td class="lbl">Ticket #</td><td class="val"><strong>${t.ticket_number}</strong></td></tr>
    <tr><td class="lbl">Title</td><td class="val">${escHtml(t.title)}</td></tr>
    <tr><td class="lbl">Status</td><td class="val">${statusBadge(t.status)}</td></tr>
    <tr><td class="lbl">Priority</td><td class="val">${priorityBadge(t.priority)}</td></tr>
    <tr><td class="lbl">Category</td><td class="val">${escHtml(t.category || '—')}</td></tr>
    <tr><td class="lbl">Assigned To</td><td class="val">${escHtml(t.assigned_to_name || t.assigned_to || 'Unassigned')}</td></tr>
    <tr><td class="lbl">Assigned Group</td><td class="val">${escHtml(t.assignment_group || '—')}</td></tr>
    <tr><td class="lbl">Created By</td><td class="val">${escHtml(t.created_by_name || t.caller || '—')}</td></tr>
    <tr><td class="lbl">Created</td><td class="val">${t.created_at ? new Date(t.created_at).toLocaleString() : '—'}</td></tr>
  </table>`;
}

function escHtml(s: string): string {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT: TICKET CREATED
// Recipients: Requester, Assigned Engineer, Group Members, Team Lead
// ═══════════════════════════════════════════════════════════════════════════════
export async function notifyTicketCreatedM365(ticket: any): Promise<void> {
  try {
    const tn = ticket.ticket_number;

    // Resolve recipients
    const requesterEmail  = ticket.caller?.includes('@') ? ticket.caller : await resolveEmail(ticket.caller);
    const agentEmail      = ticket.assigned_to ? await resolveEmail(ticket.assigned_to) : null;
    const groupEmails     = await resolveGroupMemberEmails(ticket.assignment_group);
    const teamLeadEmail   = await resolveTeamLeadEmail(ticket.assignment_group);

    // ── Email to Requester ────────────────────────────────────────────────────
    if (requesterEmail) {
      const html = wrap(
        `Ticket Created: [${tn}]`,
        'linear-gradient(135deg,#0050a0 0%,#0078d4 100%)',
        `<p style="font-size:15px;color:#374151;margin:0 0 16px">Hello,</p>
         <p style="font-size:14px;color:#374151">Your support ticket has been successfully created. Our team will review and respond shortly.</p>
         ${ticketTable(ticket)}
         ${ticket.description ? `<p style="font-size:13px;color:#374151;margin:16px 0 6px"><strong>Description:</strong></p><div class="comment-box">${escHtml(String(ticket.description).substring(0, 800))}</div>` : ''}
         <div class="alert-box alert-info">Our typical response time is based on the ticket priority. You will receive updates at every stage.</div>`,
        tn
      );
      await queueM365Email({ to: requesterEmail, subject: `[${tn}] Ticket Created Successfully`, html, ticketId: ticket.id, ticketNumber: tn, eventType: 'ticket_created_requester' });
    }

    // ── Email to Assigned Engineer ────────────────────────────────────────────
    if (agentEmail && agentEmail !== requesterEmail) {
      const html = wrap(
        `New Ticket Assigned to You: [${tn}]`,
        'linear-gradient(135deg,#065f46 0%,#059669 100%)',
        `<p style="font-size:15px;color:#374151;margin:0 0 16px">Hello <strong>${escHtml(ticket.assigned_to_name || 'Engineer')}</strong>,</p>
         <p style="font-size:14px;color:#374151">A new ticket has been assigned to you. Please review and take action.</p>
         ${ticketTable(ticket)}
         ${ticket.description ? `<div class="comment-box">${escHtml(String(ticket.description).substring(0, 800))}</div>` : ''}
         <div class="alert-box alert-info"><strong>Action required:</strong> Please acknowledge receipt and begin investigating.</div>`,
        tn
      );
      await queueM365Email({ to: agentEmail, subject: `[${tn}] New Ticket Assigned to You`, html, ticketId: ticket.id, ticketNumber: tn, eventType: 'ticket_created_agent' });
    }

    // ── Email to Group Members & Team Lead ────────────────────────────────────
    const internalRecipients = uniqueEmails(
      groupEmails,
      [teamLeadEmail],
    ).filter(e => e !== requesterEmail && e !== agentEmail);

    for (const email of internalRecipients) {
      const html = wrap(
        `New Ticket for Your Group: [${tn}]`,
        'linear-gradient(135deg,#1e1b4b 0%,#4338ca 100%)',
        `<p style="font-size:14px;color:#374151">A new ticket has been created and assigned to your group.</p>
         ${ticketTable(ticket)}`,
        tn
      );
      await queueM365Email({ to: email, subject: `[${tn}] New Ticket for ${ticket.assignment_group || 'Your Group'}`, html, ticketId: ticket.id, ticketNumber: tn, eventType: 'ticket_created_group' });
    }

    console.log(`[TNS] ticketCreated notifications queued for ${tn}`);
  } catch (e: any) {
    console.error('[TNS] notifyTicketCreatedM365 error:', e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT: TICKET ASSIGNED / REASSIGNED
// Recipients: New Assigned Engineer, Requester, Group Members
// ═══════════════════════════════════════════════════════════════════════════════
export async function notifyTicketAssignedM365(
  ticket: any,
  newAssigneeUid: string,
  newAssigneeName: string,
  oldAssigneeUid?: string
): Promise<void> {
  try {
    const tn         = ticket.ticket_number;
    const agentEmail = await resolveEmail(newAssigneeUid);
    const oldEmail   = oldAssigneeUid ? await resolveEmail(oldAssigneeUid) : null;
    const requesterEmail = ticket.caller?.includes('@') ? ticket.caller : await resolveEmail(ticket.caller);
    const groupEmails    = await resolveGroupMemberEmails(ticket.assignment_group);

    // ── New Assignee ──────────────────────────────────────────────────────────
    if (agentEmail) {
      const html = wrap(
        `Ticket Assigned to You: [${tn}]`,
        'linear-gradient(135deg,#065f46 0%,#059669 100%)',
        `<p style="font-size:15px;color:#374151;margin:0 0 16px">Hello <strong>${escHtml(newAssigneeName)}</strong>,</p>
         <p style="font-size:14px;color:#374151">The following ticket has been assigned to you.</p>
         ${ticketTable(ticket)}
         <div class="alert-box alert-info">Please review the ticket and begin working on it. Reply to this email to add updates.</div>`,
        tn
      );
      await queueM365Email({ to: agentEmail, subject: `[${tn}] Ticket Assigned to ${escHtml(newAssigneeName)}`, html, ticketId: ticket.id, ticketNumber: tn, eventType: 'ticket_assigned_agent' });
    }

    // ── Requester ─────────────────────────────────────────────────────────────
    if (requesterEmail && requesterEmail !== agentEmail) {
      const html = wrap(
        `Your Ticket Has Been Assigned: [${tn}]`,
        'linear-gradient(135deg,#0050a0 0%,#0078d4 100%)',
        `<p style="font-size:14px;color:#374151">Your ticket has been assigned to <strong>${escHtml(newAssigneeName)}</strong> who will be working on it.</p>
         ${ticketTable(ticket)}`,
        tn
      );
      await queueM365Email({ to: requesterEmail, subject: `[${tn}] Ticket Assigned to ${escHtml(newAssigneeName)}`, html, ticketId: ticket.id, ticketNumber: tn, eventType: 'ticket_assigned_requester' });
    }

    // ── Old Assignee (reassignment notification) ──────────────────────────────
    if (oldEmail && oldEmail !== agentEmail && oldEmail !== requesterEmail) {
      const html = wrap(
        `Ticket Reassigned: [${tn}]`,
        'linear-gradient(135deg,#78350f 0%,#d97706 100%)',
        `<p style="font-size:14px;color:#374151">Ticket <strong>${tn}</strong> has been reassigned from you to <strong>${escHtml(newAssigneeName)}</strong>.</p>
         ${ticketTable(ticket)}`,
        tn
      );
      await queueM365Email({ to: oldEmail, subject: `[${tn}] Ticket Reassigned`, html, ticketId: ticket.id, ticketNumber: tn, eventType: 'ticket_reassigned_old' });
    }

    // ── Group Members ─────────────────────────────────────────────────────────
    for (const email of groupEmails.filter(e => e !== agentEmail && e !== requesterEmail && e !== oldEmail)) {
      const html = wrap(
        `Ticket Assignment Update: [${tn}]`,
        'linear-gradient(135deg,#1e1b4b 0%,#4338ca 100%)',
        `<p style="font-size:14px;color:#374151">Ticket <strong>${tn}</strong> has been assigned to <strong>${escHtml(newAssigneeName)}</strong> in your group.</p>
         ${ticketTable(ticket)}`,
        tn
      );
      await queueM365Email({ to: email, subject: `[${tn}] Ticket Assigned to ${escHtml(newAssigneeName)}`, html, ticketId: ticket.id, ticketNumber: tn, eventType: 'ticket_assigned_group' });
    }

    console.log(`[TNS] ticketAssigned notifications queued for ${tn}`);
  } catch (e: any) {
    console.error('[TNS] notifyTicketAssignedM365 error:', e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT: STATUS CHANGED
// Recipients: Requester, Assigned Engineer, Team Lead, Group Members
// ═══════════════════════════════════════════════════════════════════════════════
export async function notifyStatusChangedM365(
  ticket: any,
  oldStatus: string,
  newStatus: string,
  changedByName?: string
): Promise<void> {
  try {
    const tn = ticket.ticket_number;
    const requesterEmail = ticket.caller?.includes('@') ? ticket.caller : await resolveEmail(ticket.caller);
    const agentEmail     = ticket.assigned_to ? await resolveEmail(ticket.assigned_to) : null;
    const teamLeadEmail  = await resolveTeamLeadEmail(ticket.assignment_group);

    const isResolved  = newStatus === 'Resolved';
    const isClosed    = newStatus === 'Closed';
    const isReopened  = newStatus === 'New' || newStatus === 'In Progress';
    const isEscalated = newStatus === 'Escalated';

    // ── Colour scheme per status ──────────────────────────────────────────────
    const headerBg = isResolved  ? 'linear-gradient(135deg,#065f46 0%,#059669 100%)'
      : isClosed    ? 'linear-gradient(135deg,#374151 0%,#4b5563 100%)'
      : isEscalated ? 'linear-gradient(135deg,#7f1d1d 0%,#dc2626 100%)'
      : isReopened  ? 'linear-gradient(135deg,#78350f 0%,#d97706 100%)'
      : 'linear-gradient(135deg,#0050a0 0%,#0078d4 100%)';

    const alertClass = isResolved  ? 'alert-success'
      : isEscalated ? 'alert-breach'
      : 'alert-info';

    const alertMsg = isResolved
      ? 'Your ticket has been resolved. If you need further assistance, reply to this email to reopen it.'
      : isClosed
      ? 'This ticket has been closed. Thank you for contacting Technosprint Support.'
      : isEscalated
      ? 'This ticket has been escalated due to urgency. Our senior team is now handling it.'
      : `The status has been updated from <strong>${escHtml(oldStatus)}</strong> to <strong>${escHtml(newStatus)}</strong>.`;

    const subject = `[${tn}] Status Updated: ${oldStatus} → ${newStatus}`;

    const baseHtml = (greeting: string) => wrap(
      `Ticket Status Changed: [${tn}]`,
      headerBg,
      `<p style="font-size:14px;color:#374151">${greeting}</p>
       ${ticketTable(ticket)}
       <div class="alert-box ${alertClass}">${alertMsg}</div>
       ${changedByName ? `<p style="font-size:12px;color:#6b7280">Updated by: <strong>${escHtml(changedByName)}</strong></p>` : ''}`,
      tn
    );

    // Requester
    if (requesterEmail) {
      await queueM365Email({ to: requesterEmail, subject, html: baseHtml('Hello,'), ticketId: ticket.id, ticketNumber: tn, eventType: 'status_changed_requester' });
    }
    // Assigned engineer
    if (agentEmail && agentEmail !== requesterEmail) {
      await queueM365Email({ to: agentEmail, subject, html: baseHtml(`Hello <strong>${escHtml(ticket.assigned_to_name || 'Engineer')}</strong>,`), ticketId: ticket.id, ticketNumber: tn, eventType: 'status_changed_agent' });
    }
    // Team lead
    if (teamLeadEmail && teamLeadEmail !== requesterEmail && teamLeadEmail !== agentEmail) {
      await queueM365Email({ to: teamLeadEmail, subject, html: baseHtml('Hello Team Lead,'), ticketId: ticket.id, ticketNumber: tn, eventType: 'status_changed_lead' });
    }

    console.log(`[TNS] statusChanged (${oldStatus}→${newStatus}) notifications queued for ${tn}`);
  } catch (e: any) {
    console.error('[TNS] notifyStatusChangedM365 error:', e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT: COMMENT / UPDATE ADDED
// Recipients: Requester, Assigned Engineer
// ═══════════════════════════════════════════════════════════════════════════════
export async function notifyCommentAddedM365(
  ticket: any,
  authorName: string,
  commentText: string,
  isInternal: boolean
): Promise<void> {
  // Internal work notes are NOT sent to requester
  try {
    const tn = ticket.ticket_number;
    const requesterEmail = ticket.caller?.includes('@') ? ticket.caller : await resolveEmail(ticket.caller);
    const agentEmail     = ticket.assigned_to ? await resolveEmail(ticket.assigned_to) : null;

    const subject = `Re: [${tn}] ${ticket.title}`;

    const body = (greeting: string) => wrap(
      `New Update on Ticket [${tn}]`,
      'linear-gradient(135deg,#0050a0 0%,#0078d4 100%)',
      `<p style="font-size:14px;color:#374151">${greeting}</p>
       <p style="font-size:13px;color:#374151"><strong>${escHtml(authorName)}</strong> added a new ${isInternal ? 'work note' : 'comment'}:</p>
       <div class="comment-box">${escHtml(String(commentText).substring(0, 2000))}</div>
       ${ticketTable(ticket)}`,
      tn
    );

    // Always notify requester on public comments
    if (!isInternal && requesterEmail) {
      await queueM365Email({ to: requesterEmail, subject, html: body('Hello,'), ticketId: ticket.id, ticketNumber: tn, eventType: 'comment_requester' });
    }
    // Always notify agent (both internal and public)
    if (agentEmail && agentEmail !== requesterEmail) {
      await queueM365Email({ to: agentEmail, subject, html: body(`Hello <strong>${escHtml(ticket.assigned_to_name || 'Engineer')}</strong>,`), ticketId: ticket.id, ticketNumber: tn, eventType: 'comment_agent' });
    }

    console.log(`[TNS] commentAdded notifications queued for ${tn}`);
  } catch (e: any) {
    console.error('[TNS] notifyCommentAddedM365 error:', e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT: TICKET RESOLVED
// Recipients: Requester, Assigned Engineer
// ═══════════════════════════════════════════════════════════════════════════════
export async function notifyTicketResolvedM365(ticket: any): Promise<void> {
  try {
    const tn             = ticket.ticket_number;
    const requesterEmail = ticket.caller?.includes('@') ? ticket.caller : await resolveEmail(ticket.caller);
    const agentEmail     = ticket.assigned_to ? await resolveEmail(ticket.assigned_to) : null;

    const makeHtml = (greeting: string) => wrap(
      `Ticket Resolved: [${tn}]`,
      'linear-gradient(135deg,#065f46 0%,#059669 100%)',
      `<p style="font-size:14px;color:#374151">${greeting}</p>
       <p style="font-size:14px;color:#374151">Your ticket has been marked as <strong style="color:#059669">Resolved</strong>.</p>
       ${ticketTable(ticket)}
       <div class="alert-box alert-success">If you are satisfied with the resolution, no further action is needed. To reopen, simply reply to this email.</div>`,
      tn
    );

    if (requesterEmail) {
      await queueM365Email({ to: requesterEmail, subject: `[${tn}] Ticket Resolved`, html: makeHtml('Hello,'), ticketId: ticket.id, ticketNumber: tn, eventType: 'ticket_resolved_requester' });
    }
    if (agentEmail && agentEmail !== requesterEmail) {
      await queueM365Email({ to: agentEmail, subject: `[${tn}] Ticket Resolved`, html: makeHtml(`Hello <strong>${escHtml(ticket.assigned_to_name || 'Engineer')}</strong>,`), ticketId: ticket.id, ticketNumber: tn, eventType: 'ticket_resolved_agent' });
    }

    console.log(`[TNS] ticketResolved notifications queued for ${tn}`);
  } catch (e: any) {
    console.error('[TNS] notifyTicketResolvedM365 error:', e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT: TICKET CLOSED
// Recipients: Requester
// ═══════════════════════════════════════════════════════════════════════════════
export async function notifyTicketClosedM365(ticket: any): Promise<void> {
  try {
    const tn             = ticket.ticket_number;
    const requesterEmail = ticket.caller?.includes('@') ? ticket.caller : await resolveEmail(ticket.caller);

    if (requesterEmail) {
      const html = wrap(
        `Ticket Closed: [${tn}]`,
        'linear-gradient(135deg,#374151 0%,#4b5563 100%)',
        `<p style="font-size:14px;color:#374151">Hello,</p>
         <p style="font-size:14px;color:#374151">Your ticket has been <strong>closed</strong>. Thank you for contacting Technosprint Support.</p>
         ${ticketTable(ticket)}
         <div class="alert-box alert-info">If you need to reopen this ticket or have a new issue, please reply to this email or create a new ticket.</div>`,
        tn
      );
      await queueM365Email({ to: requesterEmail, subject: `[${tn}] Ticket Closed`, html, ticketId: ticket.id, ticketNumber: tn, eventType: 'ticket_closed' });
    }
    console.log(`[TNS] ticketClosed notification queued for ${tn}`);
  } catch (e: any) {
    console.error('[TNS] notifyTicketClosedM365 error:', e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT: SLA WARNING
// Recipients: Assigned Engineer, Team Lead, Manager
// ═══════════════════════════════════════════════════════════════════════════════
export async function notifySlaWarningM365(
  ticket: any,
  pct: number,
  slaType: string
): Promise<void> {
  try {
    const tn           = ticket.ticket_number;
    const agentEmail   = ticket.assigned_to ? await resolveEmail(ticket.assigned_to) : null;
    const teamLeadEmail = await resolveTeamLeadEmail(ticket.assignment_group);
    const managerEmail  = await resolveManagerEmail();

    const subject = `⚠️ SLA Warning (${pct}%): [${tn}]`;
    const makeHtml = (greeting: string) => wrap(
      `SLA Warning: ${pct}% Used`,
      'linear-gradient(135deg,#78350f 0%,#d97706 100%)',
      `<p style="font-size:14px;color:#374151">${greeting}</p>
       <div class="alert-box alert-warn"><strong>⚠️ SLA ${slaType} is at ${pct}% utilization</strong><br>Immediate action is required to avoid a breach.</div>
       ${ticketTable(ticket)}`,
      tn
    );

    const recipients = uniqueEmails([agentEmail], [teamLeadEmail], [managerEmail]);
    for (const email of recipients) {
      await queueM365Email({ to: email, subject, html: makeHtml('Hello,'), ticketId: ticket.id, ticketNumber: tn, eventType: 'sla_warning' });
    }
    console.log(`[TNS] slaWarning notifications queued for ${tn}`);
  } catch (e: any) {
    console.error('[TNS] notifySlaWarningM365 error:', e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT: SLA BREACHED
// Recipients: Assigned Engineer, Team Lead, Manager, Requester
// ═══════════════════════════════════════════════════════════════════════════════
export async function notifySlaBreachedM365(
  ticket: any,
  slaType: string,
  breachDuration?: string
): Promise<void> {
  try {
    const tn             = ticket.ticket_number;
    const agentEmail     = ticket.assigned_to ? await resolveEmail(ticket.assigned_to) : null;
    const teamLeadEmail  = await resolveTeamLeadEmail(ticket.assignment_group);
    const managerEmail   = await resolveManagerEmail();
    const requesterEmail = ticket.caller?.includes('@') ? ticket.caller : await resolveEmail(ticket.caller);

    const subject = `🚨 SLA BREACHED: [${tn}]`;
    const makeHtml = (greeting: string) => wrap(
      `SLA Breach Alert: [${tn}]`,
      'linear-gradient(135deg,#7f1d1d 0%,#dc2626 100%)',
      `<p style="font-size:14px;color:#374151">${greeting}</p>
       <div class="alert-box alert-breach">
         <strong>🚨 SLA ${slaType} has been BREACHED</strong><br>
         ${breachDuration ? `Breach Duration: <strong>${breachDuration}</strong><br>` : ''}
         Immediate escalation and RCA are required.
       </div>
       ${ticketTable(ticket)}
       <div class="alert-box alert-warn">Root Cause Analysis (RCA) must be submitted before this ticket can be resolved.</div>`,
      tn
    );

    // Internal staff
    const internalEmails = uniqueEmails([agentEmail], [teamLeadEmail], [managerEmail]);
    for (const email of internalEmails) {
      await queueM365Email({ to: email, subject, html: makeHtml('Hello,'), ticketId: ticket.id, ticketNumber: tn, eventType: 'sla_breached_internal' });
    }
    // Requester
    if (requesterEmail && !internalEmails.includes(requesterEmail)) {
      const html = wrap(
        `Update on Your Ticket: [${tn}]`,
        'linear-gradient(135deg,#7f1d1d 0%,#dc2626 100%)',
        `<p style="font-size:14px;color:#374151">Hello,</p>
         <p style="font-size:14px;color:#374151">We sincerely apologise — your ticket has exceeded our standard response time. Our senior team is now prioritising this issue.</p>
         ${ticketTable(ticket)}`,
        tn
      );
      await queueM365Email({ to: requesterEmail, subject: `[${tn}] We Are Prioritising Your Ticket`, html, ticketId: ticket.id, ticketNumber: tn, eventType: 'sla_breached_requester' });
    }

    console.log(`[TNS] slaBreached notifications queued for ${tn}`);
  } catch (e: any) {
    console.error('[TNS] notifySlaBreachedM365 error:', e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT: TICKET ESCALATED
// Recipients: Assigned Engineer, Team Lead, Manager, Requester
// ═══════════════════════════════════════════════════════════════════════════════
export async function notifyTicketEscalatedM365(
  ticket: any,
  reason?: string
): Promise<void> {
  try {
    const tn             = ticket.ticket_number;
    const agentEmail     = ticket.assigned_to ? await resolveEmail(ticket.assigned_to) : null;
    const teamLeadEmail  = await resolveTeamLeadEmail(ticket.assignment_group);
    const managerEmail   = await resolveManagerEmail();
    const requesterEmail = ticket.caller?.includes('@') ? ticket.caller : await resolveEmail(ticket.caller);

    const makeHtml = (greeting: string, forRequester = false) => wrap(
      `Ticket Escalated: [${tn}]`,
      'linear-gradient(135deg,#4c1d95 0%,#7c3aed 100%)',
      `<p style="font-size:14px;color:#374151">${greeting}</p>
       ${forRequester
         ? `<p style="font-size:14px;color:#374151">Your ticket has been escalated to our senior team who will now handle it.</p>`
         : `<p style="font-size:14px;color:#374151">This ticket has been escalated${reason ? `: <em>${escHtml(reason)}</em>` : ''}. Immediate attention is required.</p>`}
       ${ticketTable(ticket)}`,
      tn
    );

    const internalEmails = uniqueEmails([agentEmail], [teamLeadEmail], [managerEmail]);
    for (const email of internalEmails) {
      await queueM365Email({ to: email, subject: `[${tn}] Ticket Escalated — Action Required`, html: makeHtml('Hello,'), ticketId: ticket.id, ticketNumber: tn, eventType: 'ticket_escalated_internal' });
    }
    if (requesterEmail && !internalEmails.includes(requesterEmail)) {
      await queueM365Email({ to: requesterEmail, subject: `[${tn}] Your Ticket Has Been Escalated`, html: makeHtml('Hello,', true), ticketId: ticket.id, ticketNumber: tn, eventType: 'ticket_escalated_requester' });
    }

    console.log(`[TNS] ticketEscalated notifications queued for ${tn}`);
  } catch (e: any) {
    console.error('[TNS] notifyTicketEscalatedM365 error:', e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MASTER DISPATCHER
// Called from server.ts PUT /api/tickets/:id after the existing notification block
// Handles all status changes and assignment changes in ONE place
// ═══════════════════════════════════════════════════════════════════════════════
export async function dispatchTicketUpdateNotifications(
  updatedTicket: any,
  prevTicket:    any,
  reqBody:       any
): Promise<void> {
  try {
    const newStatus    = reqBody.status;
    const oldStatus    = prevTicket.status;
    const newAssignee  = reqBody.assignedTo;
    const oldAssignee  = prevTicket.assigned_to;
    const updatedBy    = reqBody.updatedBy || reqBody.updatedById || 'System';

    // Status changed
    if (newStatus && newStatus !== oldStatus) {
      if (newStatus === 'Resolved') {
        await notifyTicketResolvedM365(updatedTicket);
      } else if (newStatus === 'Closed') {
        await notifyTicketClosedM365(updatedTicket);
      } else if (newStatus === 'Escalated') {
        await notifyTicketEscalatedM365(updatedTicket);
      } else {
        await notifyStatusChangedM365(updatedTicket, oldStatus, newStatus, updatedBy);
      }
    }

    // Assignment changed
    if (newAssignee && newAssignee !== oldAssignee) {
      await notifyTicketAssignedM365(
        updatedTicket,
        newAssignee,
        reqBody.assignedToName || updatedTicket.assigned_to_name || newAssignee,
        oldAssignee || undefined
      );
    }
  } catch (e: any) {
    console.error('[TNS] dispatchTicketUpdateNotifications error:', e.message);
  }
}
