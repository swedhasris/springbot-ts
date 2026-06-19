import { execute } from"./db";

export class NotificationEngine {
 /**
 * Creates a notification for a user
 */
 static async create(userId: string, title: string, message: string, type: string, ticketId?: string) {
 try {
 await execute(
"INSERT INTO notifications (user_id, title, message, type, ticket_id, is_read) VALUES (?, ?, ?, ?, ?, 0)",
 [userId, title, message, type, ticketId || null]
 );
 console.log(`[Notification] Created ${type} for user ${userId}`);
 } catch (error: any) {
 console.error("[Notification] Error creating notification:", error.message);
 }
 }

 /**
 * Notify admins about a new ticket
 */
 static async notifyAdmins(title: string, message: string, ticketId: string) {
 try {
 // Query all admin and agent users from the database
 const { query: dbQuery } = await import("./db");
 const admins = await dbQuery(
"SELECT uid FROM users WHERE role IN ('admin', 'super_admin', 'ultra_super_admin', 'agent') AND is_active = 1"
 );

 // Create a notification for each admin/agent user
 for (const admin of admins) {
 if (admin.uid) {
 await this.create(admin.uid, title, message,"admin_alert", ticketId);
 }
 }
 console.log(`[Notification] Notified ${admins.length} admins for ticket ${ticketId}`);
 } catch (error: any) {
 console.error("[Notification] Error notifying admins:", error.message);
 }
 }
}
