/**
 * src/lib/dashboardUtils.ts
 *
 * Dashboard utility helpers — Firebase/Firestore Timestamp removed.
 * All date handling now uses plain Date objects and ISO strings.
 */

/** Helper to convert date string / number / Timestamp-like object to Date */
export const toDate = (val: any): Date | null => {
 if (!val) return null;
 // Handle Firestore Timestamp-like objects (seconds + nanoseconds)
 if (typeof val ==="object" && val.seconds !== undefined) return new Date(val.seconds * 1000);
 // Handle objects with toDate() method
 if (typeof val ==="object" && typeof val.toDate ==="function") return val.toDate();
 const d = new Date(val);
 return isNaN(d.getTime()) ? null : d;
};

/** Validate a ticket record. Returns true if valid */
export const validateTicket = (
 t: any,
 userUid: string
): { valid: boolean; errors: string[] } => {
 const errors: string[] = [];
 if (!t.id) errors.push("Missing Ticket ID");
 if (!t.number) errors.push("Missing Incident Number");
 if (!t.owner && !t.createdBy && !t.created_by) errors.push("Missing Owner");
 if (t.assignedTo === undefined && t.assigned_to === undefined && t.assigned_user === undefined)
 errors.push("Missing Assigned User field");
 if (!t.status) errors.push("Missing Status");
 if (!t.priority) errors.push("Missing Priority");
 if (t.slaPolicy === undefined && t.sla_name === undefined) errors.push("Missing SLA Policy field");
 if (!t.createdAt) errors.push("Missing Created Date");
 if (!t.updatedAt && !t.lastUpdated) errors.push("Missing Updated Date");
 const isOwned =
 t.assignedTo === userUid ||
 t.assigned_to === userUid ||
 t.assigned_user === userUid ||
 t.createdBy === userUid ||
 t.created_by === userUid;
 if (!isOwned) errors.push("Ticket does not belong to current user");
 return { valid: errors.length === 0, errors };
};

/** Compute SLA and overdue values */
export const computeSla = (
 t: any
): {
 responseSla: string | null;
 resolutionSla: string | null;
 breached: boolean;
 overdueDuration: string | null;
} => {
 const now = new Date();
 const created = toDate(t.createdAt);
 const firstResponse = toDate(t.firstResponseAt);
 const resolved = toDate(t.resolvedAt);
 const responseDeadline = toDate(t.responseDeadline);
 const resolutionDeadline = toDate(t.resolutionDeadline);

 const responseSla =
 firstResponse && created
 ? `${((firstResponse.getTime() - created.getTime()) / 1000 / 60).toFixed(1)}m`
 : null;
 const resolutionSla =
 resolved && created
 ? `${((resolved.getTime() - created.getTime()) / 1000 / 60).toFixed(1)}m`
 : null;

 let breached = false;
 if (resolutionDeadline && now > resolutionDeadline) breached = true;
 else if (responseDeadline && now > responseDeadline && !firstResponse) breached = true;

 let overdueDuration: string | null = null;
 if (breached) {
 const deadline = resolutionDeadline || responseDeadline;
 if (deadline) {
 const diffMs = now.getTime() - deadline.getTime();
 const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
 const hrs = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
 const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
 overdueDuration = `${days}d ${hrs}h ${mins}m`;
 }
 }
 return { responseSla, resolutionSla, breached, overdueDuration };
};

/** Remove duplicate tickets based on incident number + id, keep latest by updatedAt */
export const dedupeTickets = (tickets: any[]): any[] => {
 const map = new Map<string, any>();
 tickets.forEach((t) => {
 const key = `${t.number ||""}-${t.id}`;
 const existing = map.get(key);
 const curUpdated = toDate(t.updatedAt) || toDate(t.lastUpdated) || new Date(0);
 const existUpdated = existing
 ? toDate(existing.updatedAt) || toDate(existing.lastUpdated) || new Date(0)
 : new Date(0);
 if (!existing || curUpdated > existUpdated) map.set(key, t);
 });
 return Array.from(map.values());
};

/** Simple audit logger */
export const auditLog = (userUid: string, ticket: any, issue: string, resolution: string) => {
 const ts = new Date().toISOString();
 console.warn(
 `[AUDIT] ${ts} | User:${userUid} | Ticket:${ticket.id || ticket.number} | Issue:${issue} | Resolution:${resolution}`
 );
};

/** Detect placeholder/test tickets */
export const isBleachedTicket = (t: any): boolean => {
 const title = (t.title ||"").toString().toLowerCase();
 const desc = (t.description || t.body ||"").toString().toLowerCase();
 const bleachedKeywords = ["bleached","placeholder","test ticket","dummy"];
 return bleachedKeywords.some((kw) => title.includes(kw) || desc.includes(kw));
};
