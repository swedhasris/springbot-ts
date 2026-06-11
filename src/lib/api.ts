/**
 * src/lib/api.ts
 *
 * Pure MySQL REST API client — zero Firebase dependencies.
 * Exports the same Firestore-compatible interface previously provided by
 * firestore-fallback.ts, so all existing pages work without import changes.
 *
 * All data is served by the Spring Boot backend on port 3000 via /api/*.
 */

// ---- Inline SLA delay helpers ----
function parseSlaDelayMeta(raw: any): any {
  if (!raw) return null;
  if (typeof raw === "object") return raw;
  try { return JSON.parse(raw); } catch { return null; }
}

function parseSlaDelayLogs(raw: any): any[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; }
}


// ---- Performance: In-memory API response cache ----
const API_CACHE_TTL_MS = 10_000; // 10-second TTL
const apiCache = new Map<string, { data: any; timestamp: number }>();

// User maps for resolving names/emails
const userEmailMap = new Map<string, string>();
const userNameMap = new Map<string, string>();
let usersPrefetched = false;

async function prefetchUsers() {
  if (usersPrefetched) return;
  try {
    const res = await fetch("/api/users");
    if (res.ok) {
      const dbUsers = await res.json();
      dbUsers.forEach((u: any) => {
        const uid = u.uid || String(u.id);
        if (uid) {
          userEmailMap.set(uid, u.email || "");
          userNameMap.set(uid, u.name || "");
        }
      });
      usersPrefetched = true;
    }
  } catch (err) {
    console.error("[API] Prefetch users failed:", err);
  }
}

// Intercept window.fetch to clear cache on writes and inject auth headers
const originalFetch = window.fetch;
window.fetch = async function (...args: any[]) {
  let url = typeof args[0] === "string" ? args[0] : (args[0] && args[0].url ? args[0].url : "");
  let init = args[1] || {};
  const method = (init.method || "GET").toUpperCase();

  if (method !== "GET" && (url.includes("/api/tickets") || url.includes("/api/settings") || url.includes("/api/users"))) {
    apiCache.clear();
  }

  // Inject auth headers automatically for /api/ requests
  if (typeof url === "string" && url.startsWith("/api/")) {
    try {
      const demoUserStr = localStorage.getItem("demo_user");
      if (demoUserStr) {
        const demoUser = JSON.parse(demoUserStr);
        if (demoUser && demoUser.uid) {
          const headers = init.headers ? { ...init.headers } : {};
          if (!headers["x-user-uid"]) headers["x-user-uid"] = demoUser.uid;
          if (!headers["x-user-email"] && demoUser.email) headers["x-user-email"] = demoUser.email;
          init.headers = headers;
          args[1] = init;
        }
      }
    } catch (e) {
      console.error("[API] Error injecting auth headers:", e);
    }
  }

  return originalFetch.apply(this, args);
};

function getCachedResponse(cacheKey: string): any | null {
  const entry = apiCache.get(cacheKey);
  if (entry && Date.now() - entry.timestamp < API_CACHE_TTL_MS) return entry.data;
  apiCache.delete(cacheKey);
  return null;
}

function setCachedResponse(cacheKey: string, data: any): void {
  apiCache.set(cacheKey, { data, timestamp: Date.now() });
  if (apiCache.size > 50) {
    const oldestKey = apiCache.keys().next().value;
    if (oldestKey) apiCache.delete(oldestKey);
  }
}

// ---- Listener registry for onSnapshot simulation ----
interface FallbackListener {
  queryOrDoc: any;
  onNext: (snapshot: any) => void;
  active: () => boolean;
  trigger: () => void;
}
const activeListeners: FallbackListener[] = [];

function notifyListeners(path: string, id?: string) {
  activeListeners.forEach((listener) => {
    if (!listener.active()) return;
    const lDoc = listener.queryOrDoc;
    if (lDoc && lDoc.type === "document") {
      if (lDoc.path === path && (!id || lDoc.id === id)) listener.trigger();
    } else if (lDoc && (lDoc.type === "collection" || lDoc.type === "query")) {
      const collPath = lDoc.type === "query" ? lDoc.collectionRef.path : lDoc.path;
      if (collPath === path) listener.trigger();
    }
  });
}

// ---- Reference Objects ----
export class CollectionReference {
  type = "collection" as const;
  constructor(public db: any, public path: string) {}
}

export class FallbackQuery {
  type = "query" as const;
  constructor(public collectionRef: CollectionReference, public clauses: any[] = []) {}
}

export class DocumentReference {
  type = "document" as const;
  constructor(public db: any, public path: string, public id: string) {}
}

// ---- Ticket field mapper (DB → Frontend camelCase) ----
function mapDbTicketToFrontend(t: any): any {
  if (!t) return null;
  const uid = t.created_by || t.createdBy || "";
  const fallbackEmail =
    t.created_by_name && t.created_by_name.includes("@")
      ? t.created_by_name
      : t.caller && t.caller.includes("@")
      ? t.caller
      : "";
  return {
    id: String(t.id || t.ticket_number || ""),
    number: t.ticket_number || t.number || "",
    caller: t.caller || "",
    callerEmail: t.caller_email || t.callerEmail || "",
    category: t.category || "",
    incidentCategory: t.incident_category || t.incidentCategory || "",
    incident_category: t.incident_category || t.incidentCategory || "",
    subcategory: t.subcategory || "",
    service: t.service || "",
    serviceOffering: t.service_offering || t.serviceOffering || "",
    cmdbItem: t.cmdb_item || t.cmdbItem || "",
    title: t.title || "",
    description: t.description || "",
    status: t.status || "New",
    priority: t.priority || "4 - Low",
    impact: t.impact || "3 - Low",
    urgency: t.urgency || "3 - Low",
    channel: t.channel || "Self-service",
    assignmentGroup: t.assignment_group || t.assignmentGroup || "",
    assignment_group: t.assignment_group || t.assignmentGroup || "",
    assignedTo: t.assigned_to || t.assignedTo || "",
    assigned_to: t.assigned_to || t.assignedTo || "",
    assignedToName: t.assigned_to_name || t.assignedToName || "",
    assigned_to_name: t.assigned_to_name || t.assignedToName || "",
    createdBy: uid,
    created_by: uid,
    createdByName: t.created_by_name || t.createdByName || userNameMap.get(uid) || t.caller || "System",
    created_by_name: t.created_by_name || t.createdByName || userNameMap.get(uid) || t.caller || "System",
    createdByEmail: userEmailMap.get(uid) || fallbackEmail || "",
    created_by_email: userEmailMap.get(uid) || fallbackEmail || "",
    resolvedBy: t.resolved_by || t.resolvedBy || "",
    resolved_by: t.resolved_by || t.resolvedBy || "",
    resolvedByName: t.resolved_by_name || t.resolvedByName || "",
    resolved_by_name: t.resolved_by_name || t.resolvedByName || "",
    resolvedAt: t.resolved_at || t.resolvedAt || null,
    resolved_at: t.resolved_at || t.resolvedAt || null,
    closedBy: t.closed_by || t.closedBy || "",
    closed_by: t.closed_by || t.closedBy || "",
    closedByName: t.closed_by_name || t.closedByName || "",
    closed_by_name: t.closed_by_name || t.closedByName || "",
    closedAt: t.closed_at || t.closedAt || null,
    closed_at: t.closed_at || t.closedAt || null,
    responseDeadline: t.response_deadline || t.responseDeadline || null,
    response_deadline: t.response_deadline || t.responseDeadline || null,
    resolutionDeadline: t.resolution_deadline || t.resolutionDeadline || null,
    resolution_deadline: t.resolution_deadline || t.resolutionDeadline || null,
    responseSlaStatus: t.response_sla_status || t.responseSlaStatus || "Pending",
    response_sla_status: t.response_sla_status || t.responseSlaStatus || "Pending",
    resolutionSlaStatus: t.resolution_sla_status || t.resolutionSlaStatus || "Pending",
    resolution_sla_status: t.resolution_sla_status || t.resolutionSlaStatus || "Pending",
    responseSlaStartTime: t.response_sla_start_time || t.responseSlaStartTime || null,
    response_sla_start_time: t.response_sla_start_time || t.responseSlaStartTime || null,
    resolutionSlaStartTime: t.resolution_sla_start_time || t.resolutionSlaStartTime || null,
    resolution_sla_start_time: t.resolution_sla_start_time || t.resolutionSlaStartTime || null,
    firstResponseAt: t.first_response_at || t.firstResponseAt || null,
    first_response_at: t.first_response_at || t.firstResponseAt || null,
    totalPausedTime: t.total_paused_time ?? t.totalPausedTime ?? 0,
    total_paused_time: t.total_paused_time ?? t.totalPausedTime ?? 0,
    onHoldStart: t.on_hold_start || t.onHoldStart || null,
    on_hold_start: t.on_hold_start || t.onHoldStart || null,
    points: t.points ?? 0,
    slaDelayMeta: parseSlaDelayMeta(t.sla_delay_meta_json || t.slaDelayMeta),
    slaDelayLogs: parseSlaDelayLogs(t.sla_delay_logs_json || t.slaDelayLogs),
    slaPolicy: t.sla_policy || t.slaPolicy || "Default SLA",
    sla_policy: t.sla_policy || t.slaPolicy || "Default SLA",
    sla_name: t.sla_name || t.slaName || t.slaPolicy || "Default SLA",
    createdAt: t.created_at || t.createdAt || null,
    created_at: t.created_at || t.createdAt || null,
    updatedAt: t.updated_at || t.updatedAt || t.created_at || t.createdAt || null,
    updated_at: t.updated_at || t.updatedAt || t.created_at || t.createdAt || null,
  };
}

// ---- Core Data Fetcher ----
async function fetchFallbackData(path: string, queryObj?: any): Promise<any[]> {
  let cacheKey = path;
  if (queryObj && queryObj.clauses) cacheKey += ":" + JSON.stringify(queryObj.clauses);

  const cached = getCachedResponse(cacheKey);
  if (cached) return cached;

  console.log(`[API] Fetching data for path: "${path}"`);

  try {
    let result: any[] = [];

    if (path.startsWith("tickets")) {
      prefetchUsers().catch(() => {});

      let isOnlyOpenQuery = false;
      let isOnlyResolvedQuery = false;
      if (queryObj && queryObj.clauses) {
        const whereClause = queryObj.clauses.find((c: any) => c.type === "where" && c.field === "status");
        if (whereClause) {
          const val = whereClause.value;
          const openStatuses = ["New", "Open", "In Progress", "Pending", "Pending Approval", "On Hold", "Waiting for Customer", "Awaiting User", "Awaiting Vendor"];
          const resolvedStatuses = ["Resolved", "Closed", "Canceled"];
          if (Array.isArray(val)) {
            isOnlyOpenQuery = val.every((v) => openStatuses.includes(v));
            isOnlyResolvedQuery = val.every((v) => resolvedStatuses.includes(v));
          } else {
            isOnlyOpenQuery = openStatuses.includes(val);
            isOnlyResolvedQuery = resolvedStatuses.includes(val);
          }
        }
      }

      let url = "/api/tickets/all";
      if (isOnlyResolvedQuery) url = "/api/tickets/resolved";
      else if (isOnlyOpenQuery) url = "/api/tickets/open";

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      const dbTickets = await res.json();
      result = dbTickets.map(mapDbTicketToFrontend);
    } else if (path === "users") {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      const dbUsers = await res.json();
      result = dbUsers.map((u: any) => {
        const uid = u.uid || String(u.id);
        const email = u.email || "";
        const name = u.name || "";
        if (uid) {
          userEmailMap.set(uid, email);
          userNameMap.set(uid, name);
        }
        return { id: uid, uid, name, email, role: u.role || "user", phone: u.phone || "", passwordHash: u.password_hash || "" };
      });
    } else if (path === "settings_groups") {
      const res = await fetch("/api/settings_groups");
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      result = await res.json();
    } else if (path === "sla_breaches") {
      let url = "/api/sla-breaches/all";
      if (queryObj && queryObj.clauses) {
        const whereClause = queryObj.clauses.find(
          (c: any) => c.type === "where" && (c.field === "assigned_user" || c.field === "assignedTo")
        );
        if (whereClause && whereClause.value) url = `/api/sla-breaches/user/${whereClause.value}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      result = await res.json();
    } else if (path === "sla_policies") {
      result = [
        { id: "p1", name: "P1 SLA", priority: "1 - Critical", category: "", resolutionTimeMinutes: 240, isActive: true },
        { id: "p2", name: "P2 SLA", priority: "2 - High", category: "", resolutionTimeMinutes: 480, isActive: true },
        { id: "p3", name: "P3 SLA", priority: "3 - Moderate", category: "", resolutionTimeMinutes: 1440, isActive: true },
        { id: "p4", name: "P4 SLA", priority: "4 - Low", category: "", resolutionTimeMinutes: 4320, isActive: true },
      ];
    } else if (path === "companies") {
      const res = await fetch("/api/companies");
      if (!res.ok) return [];
      result = await res.json();
    } else if (path.includes("/comments")) {
      const parts = path.split("/");
      const ticketId = parts[1];
      const res = await fetch(`/api/tickets/${ticketId}`);
      if (!res.ok) return [];
      const data = await res.json();
      result = data.comments || [];
    } else if (path === "settings_categories" || path === "settings_subcategories" || path === "settings_service_providers" || path === "settings_group_members") {
      const res = await fetch(`/api/${path}`);
      if (!res.ok) return [];
      result = await res.json();
    } else {
      // Generic: try REST endpoint
      try {
        const res = await fetch(`/api/${path}`);
        if (res.ok) result = await res.json();
      } catch {}
    }

    setCachedResponse(cacheKey, result);
    return result;
  } catch (err) {
    console.error(`[API] Error fetching path "${path}":`, err);
  }

  return [];
}

// -------------------------------------------------------
// Firestore-compatible API
// -------------------------------------------------------

export function collection(...args: any[]): any {
  const path = typeof args[0] === "string" ? args[0] : args[1];
  return new CollectionReference(args[0], path);
}

export function doc(...args: any[]): any {
  let path = "";
  let id = "";
  if (args[0] && (args[0].type === "collection" || args[0] instanceof CollectionReference)) {
    path = args[0].path;
    id = args[1];
  } else {
    path = args[1];
    id = args[2];
  }
  return new DocumentReference(args[0], path, id);
}

export function query(queryRef: any, ...clauses: any[]): any {
  if (queryRef && (queryRef.type === "query" || queryRef.type === "collection")) {
    const collRef = queryRef.type === "query" ? queryRef.collectionRef : queryRef;
    const allClauses = queryRef.type === "query" ? [...queryRef.clauses, ...clauses] : clauses;
    return new FallbackQuery(collRef, allClauses);
  }
  return new FallbackQuery(queryRef, clauses);
}

export function where(field: string, op: string, value: any): any {
  return { type: "where", field, op, value };
}

export function orderBy(field: string, direction?: any): any {
  return { type: "orderBy", field, direction };
}

export function limit(n: number): any {
  return { type: "limit", limit: n };
}

export async function getDocs(queryObj: any): Promise<any> {
  const path = queryObj.type === "query" ? queryObj.collectionRef.path : queryObj.path;
  const dataList = await fetchFallbackData(path, queryObj);

  let filteredData = dataList;
  if (queryObj && queryObj.clauses) {
    for (const clause of queryObj.clauses) {
      if (clause.type === "where") {
        filteredData = filteredData.filter((item: any) => {
          const itemVal = item[clause.field];
          if (clause.op === "==") return itemVal === clause.value;
          if (clause.op === "in") return Array.isArray(clause.value) && clause.value.includes(itemVal);
          if (clause.op === "array-contains") return Array.isArray(itemVal) && itemVal.includes(clause.value);
          return true;
        });
      }
    }
  }

  const docs = filteredData.map((item) => ({
    id: String(item.id),
    data: () => item,
    exists: () => true,
  }));

  return {
    docs,
    empty: docs.length === 0,
    size: docs.length,
    forEach: (callback: any) => docs.forEach(callback),
  };
}

export async function getDoc(docRef: any): Promise<any> {
  let path = docRef.path;
  let id = docRef.id;
  if (path && path.includes("/")) {
    const parts = path.split("/");
    id = parts[parts.length - 1];
    path = parts.slice(0, -1).join("/");
  }
  let data: any = null;

  try {
    if (path === "settings" && id === "branding") {
      try {
        const res = await fetch("/api/settings/branding");
        if (res.ok) data = await res.json();
      } catch {}
      if (!data) data = { companyName: "Connect", logoBase64: null, logoType: null };
    } else if (path === "tickets") {
      const res = await fetch(`/api/tickets/${id}`);
      if (res.ok) {
        const dbTicket = await res.json();
        data = mapDbTicketToFrontend(dbTicket);
      }
    } else if (path === "users") {
      const res = await fetch(`/api/users/${id}`);
      if (res.ok) data = await res.json();
    } else if (path === "companies") {
      const res = await fetch(`/api/companies/${id}`);
      if (res.ok) data = await res.json();
    }
  } catch (e) {
    console.error("[API] getDoc error:", e);
  }

  return { id, exists: () => data !== null, data: () => data };
}

export async function getDocFromServer(docRef: any): Promise<any> {
  return getDoc(docRef);
}

export function onSnapshot(
  queryOrDoc: any,
  onNext: (snapshot: any) => void,
  onError?: (error: any) => void
): () => void {
  const isDoc = queryOrDoc && queryOrDoc.type === "document";
  let active = true;
  let timerId: any = null;

  const runPoll = async () => {
    if (!active) return;
    try {
      if (isDoc) {
        const snap = await getDoc(queryOrDoc);
        if (active) onNext(snap);
      } else {
        const snap = await getDocs(queryOrDoc);
        if (active) onNext(snap);
      }
    } catch (err) {
      console.error("[API] onSnapshot poll error:", err);
      if (active && onError) onError(err);
    }
  };

  runPoll();
  timerId = setInterval(runPoll, 15000);

  const listenerRecord: FallbackListener = {
    queryOrDoc,
    onNext,
    active: () => active,
    trigger: runPoll,
  };
  activeListeners.push(listenerRecord);

  return () => {
    active = false;
    if (timerId) clearInterval(timerId);
    const idx = activeListeners.indexOf(listenerRecord);
    if (idx !== -1) activeListeners.splice(idx, 1);
  };
}

export async function addDoc(collectionRef: any, data: any): Promise<any> {
  apiCache.clear();
  const path = collectionRef.path;
  console.log(`[API] addDoc to "${path}":`, data);

  if (path === "tickets") {
    const res = await fetch("/api/tickets/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        caller: data.caller || "System",
        incidentCategory: data.incidentCategory || data.incident_category,
        createdByName: data.createdByName || data.caller || "System",
        customFields: data.customFields || {},
        slaDelayMeta: data.slaDelayMeta || null,
        slaDelayLogs: data.slaDelayLogs || [],
      }),
    });
    if (!res.ok) throw new Error("Failed to create ticket via API");
    const created = await res.json();
    return { id: String(created.id) };
  }

  if (path === "settings_groups") {
    const res = await fetch("/api/settings_groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const created = await res.json();
      return { id: String(created.id || Date.now()) };
    }
  }

  // Generic collections — persist to any supported API endpoint
  try {
    const res = await fetch(`/api/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const created = await res.json();
      return { id: String(created.id || Date.now()) };
    }
  } catch {}

  return { id: "local_" + Date.now() };
}

export async function updateDoc(docRef: any, data: any): Promise<void> {
  apiCache.clear();
  let path = docRef.path;
  let id = docRef.id;
  if (path && path.includes("/")) {
    const parts = path.split("/");
    id = parts[parts.length - 1];
    path = parts.slice(0, -1).join("/");
  }
  console.log(`[API] updateDoc on "${path}/${id}":`, data);

  if (path === "tickets") {
    const payload = { ...data };
    if (payload.slaDelayMeta !== undefined) {
      payload.sla_delay_meta_json = payload.slaDelayMeta;
      delete payload.slaDelayMeta;
    }
    if (payload.slaDelayLogs !== undefined) {
      payload.sla_delay_logs_json = payload.slaDelayLogs;
      delete payload.slaDelayLogs;
    }
    const res = await fetch(`/api/tickets/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to update ticket via API");
    return;
  }

  if (path === "settings_groups") {
    await fetch(`/api/settings_groups/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return;
  }

  if (path === "users") {
    await fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return;
  }

  // Generic update
  try {
    await fetch(`/api/${path}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch {}
}

export async function setDoc(docRef: any, data: any, options?: any): Promise<void> {
  apiCache.clear();
  let path = docRef.path;
  let id = docRef.id;
  if (path && path.includes("/")) {
    const parts = path.split("/");
    id = parts[parts.length - 1];
    path = parts.slice(0, -1).join("/");
  }
  console.log(`[API] setDoc on "${path}/${id}":`, data);

  if (path === "users") {
    // If merge, use PUT; otherwise POST
    if (options?.merge && id) {
      await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } else {
      await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    }
    return;
  }

  if (path === "settings_groups") {
    await fetch("/api/settings_groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });
    return;
  }

  if (path === "settings" && id === "branding") {
    try {
      let currentData = { companyName: "Connect", logoBase64: null, logoType: null };
      const getRes = await fetch("/api/settings/branding");
      if (getRes.ok) currentData = await getRes.json();
      const newData = { ...currentData, ...data };
      await fetch("/api/settings/branding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newData),
      });
    } catch (e) {
      console.error("[API] Error saving branding:", e);
    }
    notifyListeners("settings", "branding");
    return;
  }

  // Generic setDoc
  try {
    if (id) {
      await fetch(`/api/${path}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } else {
      await fetch(`/api/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...data }),
      });
    }
  } catch {}
}

export async function deleteDoc(docRef: any): Promise<void> {
  apiCache.clear();
  let path = docRef.path;
  let id = docRef.id;
  if (path && path.includes("/")) {
    const parts = path.split("/");
    id = parts[parts.length - 1];
    path = parts.slice(0, -1).join("/");
  }
  console.log(`[API] deleteDoc on "${path}/${id}"`);

  if (path === "tickets") {
    const res = await fetch(`/api/tickets/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete ticket via API");
    return;
  }

  if (path === "settings_groups") {
    await fetch(`/api/settings_groups/${id}`, { method: "DELETE" });
    return;
  }

  if (path === "users") {
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    return;
  }

  // Generic delete
  try {
    await fetch(`/api/${path}/${id}`, { method: "DELETE" });
  } catch {}
}

export function serverTimestamp(): string {
  return new Date().toISOString();
}

export function increment(n: number) {
  return { type: "increment", value: n };
}

export function writeBatch(db: any): any {
  const operations: any[] = [];
  return {
    set: (docRef: any, data: any, options?: any) => operations.push({ type: "set", docRef, data, options }),
    update: (docRef: any, data: any) => operations.push({ type: "update", docRef, data }),
    delete: (docRef: any) => operations.push({ type: "delete", docRef }),
    commit: async () => {
      for (const op of operations) {
        if (op.type === "set") await setDoc(op.docRef, op.data, op.options);
        else if (op.type === "update") await updateDoc(op.docRef, op.data);
        else if (op.type === "delete") await deleteDoc(op.docRef);
      }
    },
  };
}

export function initializeFirestore(..._args: any[]): any {
  return {};
}

// -------------------------------------------------------
// Firestore type stubs (replaces firebase/firestore types)
// -------------------------------------------------------

export class Timestamp {
  constructor(public seconds: number, public nanoseconds: number = 0) {}
  toDate(): Date { return new Date(this.seconds * 1000); }
  toMillis(): number { return this.seconds * 1000; }
  static now(): Timestamp { return new Timestamp(Math.floor(Date.now() / 1000)); }
  static fromDate(date: Date): Timestamp { return new Timestamp(Math.floor(date.getTime() / 1000)); }
  static fromMillis(ms: number): Timestamp { return new Timestamp(Math.floor(ms / 1000)); }
}

export function arrayUnion(...elements: any[]) {
  return { type: "arrayUnion", elements };
}

export function arrayRemove(...elements: any[]) {
  return { type: "arrayRemove", elements };
}

// No-op FieldPath stub
export class FieldPath {
  constructor(...segments: string[]) {}
}

export const FieldValue = {
  serverTimestamp: () => new Date().toISOString(),
  increment: (n: number) => ({ type: "increment", value: n }),
  arrayUnion: (...elements: any[]) => ({ type: "arrayUnion", elements }),
  arrayRemove: (...elements: any[]) => ({ type: "arrayRemove", elements }),
  delete: () => ({ type: "delete" }),
};

// -------------------------------------------------------
// Expose cache invalidation for external use
// -------------------------------------------------------
export function invalidateApiCache() {
  apiCache.clear();
  usersPrefetched = false;
}
