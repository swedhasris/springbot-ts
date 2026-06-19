import React, { useEffect, useState, useMemo } from"react";
import { collection, query, onSnapshot, where } from"firebase/firestore";
import { db, handleFirestoreError, OperationType } from"../lib/firebase";
import { useAuth } from"../contexts/AuthContext";
import { ROLE_HIERARCHY, Role } from"../lib/roles";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from"recharts";
import { Map as IconMap, AlertTriangle, ArrowUpRight, Zap, Shield, Users, Activity, CheckCircle2, Clock, Briefcase, ClipboardList } from"lucide-react";
import { Link } from"react-router-dom";
import { cn } from"@/lib/utils";

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
"1 - Critical": { color:"#e74c3c", bg:"bg-red-500/15", border:"border-red-500/40", label:"Critical" },
"2 - High": { color:"#f39c12", bg:"bg-orange-500/15", border:"border-orange-500/40", label:"High" },
"3 - Moderate": { color:"#27ae60", bg:"bg-green-500/15", border:"border-green-500/40", label:"Moderate" },
"4 - Low": { color:"#3498db", bg:"bg-blue-500/15", border:"border-blue-500/40", label:"Low" },
};

function toMs(val: any): number {
 if (!val) return NaN;
 if (typeof val === 'object' && val.seconds !== undefined) return val.seconds * 1000 + (val.nanoseconds || 0) / 1_000_000;
 if (typeof val === 'object' && typeof val.toDate === 'function') return val.toDate().getTime();
 if (typeof val === 'number') return val;
 return new Date(val).getTime();
}

function normalizeText(val: any): string {
 return String(val ||"").trim().toLowerCase();
}

function getUserAvatar(user: any): string | null {
 return user?.photoURL || user?.avatar || user?.avatarUrl || user?.profileImage || user?.image || null;
}

function getUserDisplayName(user: any): string {
 return user?.name || user?.displayName || user?.email || user?.uid ||"Unknown User";
}

function getUserDepartment(user: any): string {
 return user?.department || user?.team || user?.groupName || user?.role ||"Unassigned";
}


function IncidentMapView({
 tickets,
 users,
 usersLoading,
 usersError,
}: {
 tickets: any[];
 users: any[];
 usersLoading: boolean;
 usersError: string | null;
}) {
 const [viewMode, setViewMode] = useState<"group" |"category" |"priority" |"individual">("group");
 const [hoveredId, setHoveredId] = useState<string | null>(null);
 const [dateFrom, setDateFrom] = useState("");
 const [dateTo, setDateTo] = useState("");
 const [departmentFilter, setDepartmentFilter] = useState("all");
 const [priorityFilter, setPriorityFilter] = useState("all");
 const [statusFilter, setStatusFilter] = useState("all");
 const [teamUserFilter, setTeamUserFilter] = useState("all");
 const [sortBy, setSortBy] = useState<"resolved" |"pending" |"workload" |"active" |"rate">("resolved");

 const openTickets = useMemo(
 () => tickets.filter(t => !["Resolved","Closed","Canceled"].includes(t.status ??"")),
 [tickets]
 );

 const individualRows = useMemo(() => {
 const usersByKey = new Map<string, any>();
 users.forEach((user) => {
 const keys = [user.id, user.uid, user.email, user.name];
 keys.forEach((key) => {
 const normalized = normalizeText(key);
 if (normalized) usersByKey.set(normalized, user);
 });
 });

 const groups = new Map<string, any>();

 tickets.forEach((ticket) => {
 const assignedKey = normalizeText(ticket.assignedTo) || normalizeText(ticket.assignedToName);
 const createdKey =
 normalizeText(ticket.createdBy) ||
 normalizeText(ticket.createdByName) ||
 normalizeText(ticket.createdByEmail) ||
 normalizeText(ticket.caller);

 const attach = (key: string, type:"assigned" |"created") => {
 if (!key) return;
 const matchedUser = usersByKey.get(key);
 const baseName = type ==="assigned"
 ? ticket.assignedToName || ticket.assignedTo ||"Unassigned"
 : ticket.createdByName || ticket.createdByEmail || ticket.caller ||"Unknown User";
 const rowKey = matchedUser?.uid || matchedUser?.id || key;

 if (!groups.has(rowKey)) {
 groups.set(rowKey, {
 id: rowKey,
 name: getUserDisplayName(matchedUser) || baseName,
 avatar: getUserAvatar(matchedUser),
 department: getUserDepartment(matchedUser),
 assignedTickets: 0,
 createdTickets: 0,
 resolvedTickets: 0,
 pendingTickets: 0,
 inProgressTickets: 0,
 escalatedTickets: 0,
 closedTickets: 0,
 openWorkload: 0,
 latestActivity: 0,
 items: [] as any[],
 });
 }

 const row = groups.get(rowKey);
 row.name = row.name || baseName;
 row.avatar = row.avatar || getUserAvatar(matchedUser);
 row.department = row.department || getUserDepartment(matchedUser);
 row.latestActivity = Math.max(row.latestActivity, toMs(ticket.updatedAt) || toMs(ticket.createdAt) || 0);
 if (!row.items.some((item: any) => item.id === ticket.id)) {
 row.items.push(ticket);
 }

 if (type ==="assigned") {
 row.assignedTickets += 1;
 if (ticket.status ==="Resolved") row.resolvedTickets += 1;
 if (ticket.status ==="Closed") row.closedTickets += 1;
 if (ticket.status ==="In Progress") row.inProgressTickets += 1;
 if (["Pending","Pending Approval","On Hold","Waiting for Customer","Awaiting User","Awaiting Vendor"].includes(ticket.status ||"")) {
 row.pendingTickets += 1;
 }
 if (!["Resolved","Closed","Canceled"].includes(ticket.status ||"")) {
 row.openWorkload += 1;
 }
 if (
 ticket.responseSlaStatus ==="Breached" ||
 ticket.resolutionSlaStatus ==="Breached" ||
 String(ticket.priority ||"").includes("Critical")
 ) {
 row.escalatedTickets += 1;
 }
 }

 if (type ==="created") {
 row.createdTickets += 1;
 }
 };

 attach(assignedKey,"assigned");
 if (createdKey && createdKey !== assignedKey) attach(createdKey,"created");
 });

 return Array.from(groups.values()).map((row) => {
 const totalHandled = row.assignedTickets || row.createdTickets || 0;
 const resolutionPercentage = row.assignedTickets > 0
 ? (row.resolvedTickets + row.closedTickets) / row.assignedTickets * 100
 : 0;
 const workloadStatus = row.openWorkload >= 15
 ?"High"
 : row.openWorkload >= 7
 ?"Medium"
 :"Low";

 return {
 ...row,
 totalHandled,
 resolutionPercentage,
 workloadStatus,
 };
 });
 }, [tickets, users]);

 const filteredIndividuals = useMemo(() => {
 return individualRows
 .filter((row) => {
 const matchesDepartment = departmentFilter ==="all" || normalizeText(row.department) === normalizeText(departmentFilter);
 const matchesUser = teamUserFilter ==="all" || normalizeText(row.id) === normalizeText(teamUserFilter) || normalizeText(row.name) === normalizeText(teamUserFilter);

 const filteredTickets = row.items.filter((ticket: any) => {
 const createdMs = toMs(ticket.createdAt) || toMs(ticket.updatedAt);
 if (dateFrom) {
 const fromMs = new Date(`${dateFrom}T00:00:00`).getTime();
 if (createdMs < fromMs) return false;
 }
 if (dateTo) {
 const toMsValue = new Date(`${dateTo}T23:59:59`).getTime();
 if (createdMs > toMsValue) return false;
 }
 if (priorityFilter !=="all" && (ticket.priority ||"4 - Low") !== priorityFilter) return false;
 if (statusFilter !=="all" && (ticket.status ||"New") !== statusFilter) return false;
 return true;
 });

 return matchesDepartment && matchesUser && filteredTickets.length > 0;
 })
 .map((row) => {
 const filteredTickets = row.items.filter((ticket: any) => {
 const createdMs = toMs(ticket.createdAt) || toMs(ticket.updatedAt);
 if (dateFrom) {
 const fromMs = new Date(`${dateFrom}T00:00:00`).getTime();
 if (createdMs < fromMs) return false;
 }
 if (dateTo) {
 const toMsValue = new Date(`${dateTo}T23:59:59`).getTime();
 if (createdMs > toMsValue) return false;
 }
 if (priorityFilter !=="all" && (ticket.priority ||"4 - Low") !== priorityFilter) return false;
 if (statusFilter !=="all" && (ticket.status ||"New") !== statusFilter) return false;
 return true;
 });

 const assignedTickets = filteredTickets.filter((ticket: any) =>
 normalizeText(ticket.assignedTo) === normalizeText(row.id) ||
 normalizeText(ticket.assignedToName) === normalizeText(row.name)
 ).length;
 const createdTickets = filteredTickets.filter((ticket: any) =>
 normalizeText(ticket.createdBy) === normalizeText(row.id) ||
 normalizeText(ticket.createdByName) === normalizeText(row.name) ||
 normalizeText(ticket.createdByEmail) === normalizeText(row.name) ||
 normalizeText(ticket.caller) === normalizeText(row.name)
 ).length;
 const resolvedTickets = filteredTickets.filter((ticket: any) => ticket.status ==="Resolved").length;
 const closedTickets = filteredTickets.filter((ticket: any) => ticket.status ==="Closed").length;
 const pendingTickets = filteredTickets.filter((ticket: any) => ["Pending","Pending Approval","On Hold","Waiting for Customer","Awaiting User","Awaiting Vendor"].includes(ticket.status ||"")).length;
 const inProgressTickets = filteredTickets.filter((ticket: any) => ticket.status ==="In Progress").length;
 const escalatedTickets = filteredTickets.filter((ticket: any) =>
 ticket.responseSlaStatus ==="Breached" ||
 ticket.resolutionSlaStatus ==="Breached" ||
 String(ticket.priority ||"").includes("Critical")
 ).length;
 const resolutionPercentage = assignedTickets > 0 ? ((resolvedTickets + closedTickets) / assignedTickets) * 100 : 0;
 const workloadStatus = assignedTickets - (resolvedTickets + closedTickets) >= 15
 ?"High"
 : assignedTickets - (resolvedTickets + closedTickets) >= 7
 ?"Medium"
 :"Low";

 return {
 ...row,
 items: filteredTickets,
 assignedTickets,
 createdTickets,
 resolvedTickets,
 pendingTickets,
 inProgressTickets,
 escalatedTickets,
 closedTickets,
 resolutionPercentage,
 workloadStatus,
 openWorkload: Math.max(assignedTickets - resolvedTickets - closedTickets, 0),
 latestActivity: filteredTickets.reduce((max: number, ticket: any) => Math.max(max, toMs(ticket.updatedAt) || toMs(ticket.createdAt) || 0), 0),
 };
 })
 .sort((a, b) => {
 switch (sortBy) {
 case"pending":
 return b.pendingTickets - a.pendingTickets;
 case"workload":
 return b.openWorkload - a.openWorkload;
 case"active":
 return b.latestActivity - a.latestActivity;
 case"rate":
 return b.resolutionPercentage - a.resolutionPercentage;
 case"resolved":
 default:
 return (b.resolvedTickets + b.closedTickets) - (a.resolvedTickets + a.closedTickets);
 }
 });
 }, [individualRows, dateFrom, dateTo, departmentFilter, priorityFilter, statusFilter, teamUserFilter, sortBy]);

 const groupedData = useMemo(() => {
 const groups: Record<string, any[]> = {};
 openTickets.forEach(t => {
 let key: string;
 if (viewMode ==="group") {
 key = (t.assignmentGroup && t.assignmentGroup.trim()) ? t.assignmentGroup :"Unassigned";
 } else if (viewMode ==="category") {
 const catValue = t.incidentCategory || t.incident_category || t.category;
 key = (catValue && catValue.trim()) ? catValue :"Uncategorized";
 } else {
 key = t.priority ||"4 - Low";
 }
 if (!groups[key]) groups[key] = [];
 groups[key].push(t);
 });
 return Object.entries(groups)
 .map(([name, items]) => ({ name, items, count: items.length }))
 .sort((a, b) => b.count - a.count);
 }, [openTickets, viewMode]);

 const departments = useMemo(
 () => Array.from(new Set(users.map(getUserDepartment).filter(Boolean))).sort(),
 [users]
 );
 const userOptions = useMemo(
 () => individualRows.map((row) => ({ id: row.id, name: row.name })).sort((a, b) => a.name.localeCompare(b.name)),
 [individualRows]
 );
 const statusOptions = useMemo(
 () => Array.from(new Set(tickets.map((ticket) => ticket.status ||"New"))).sort(),
 [tickets]
 );
 const priorityOptions = useMemo(
 () => Array.from(new Set(tickets.map((ticket) => ticket.priority ||"4 - Low"))).sort(),
 [tickets]
 );

 if (openTickets.length === 0 && viewMode !=="individual") {
 return (
 <div className="h-96 flex flex-col items-center justify-center text-muted-foreground">
 <Shield className="w-16 h-16 mb-4 opacity-20" />
 <p className="font-bold text-lg">All Clear!</p>
 <p className="text-sm">No open incidents to display on the map.</p>
 </div>
 );
 }

 return (
 <div className="space-y-4">
 {/* View Mode Tabs */}
 <div className="flex items-center gap-2">
 {(["group","category","priority","individual"] as const).map(mode => (
 <button
 key={mode}
 onClick={() => setViewMode(mode)}
 className={cn(
"px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
 viewMode === mode
 ?"bg-sn-green text-sn-dark shadow-sm"
 :"bg-muted/50 text-muted-foreground hover:bg-muted"
 )}
 >
 {mode ==="group" ?"By Group" : mode ==="category" ?"By Category" : mode ==="priority" ?"By Priority" :"By Individual"}
 </button>
 ))}
 <div className="ml-auto text-xs text-muted-foreground font-medium">
 {viewMode ==="individual" ? `${filteredIndividuals.length} individuals` : `${openTickets.length} open incidents`}
 </div>
 </div>

 {viewMode ==="individual" && (
 <div className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
 <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
 Date From
 <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:ring-1 focus:ring-sn-green" />
 </label>
 <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
 Date To
 <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:ring-1 focus:ring-sn-green" />
 </label>
 <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
 Department Filter
 <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:ring-1 focus:ring-sn-green">
 <option value="all">All Departments</option>
 {departments.map((department) => <option key={department} value={department}>{department}</option>)}
 </select>
 </label>
 <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
 Priority Filter
 <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:ring-1 focus:ring-sn-green">
 <option value="all">All Priorities</option>
 {priorityOptions.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
 </select>
 </label>
 <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
 Ticket Status Filter
 <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:ring-1 focus:ring-sn-green">
 <option value="all">All Statuses</option>
 {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
 </select>
 </label>
 <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
 Team/User Filter
 <select value={teamUserFilter} onChange={(e) => setTeamUserFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground outline-none focus:ring-1 focus:ring-sn-green">
 <option value="all">All Users</option>
 {userOptions.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
 </select>
 </label>
 </div>

 <div className="flex flex-wrap items-center gap-2">
 {([
 { key:"resolved", label:"Highest Resolved Tickets" },
 { key:"pending", label:"Most Pending Tickets" },
 { key:"workload", label:"Highest Workload" },
 { key:"active", label:"Most Active Employee" },
 { key:"rate", label:"Best Resolution Rate" },
 ] as const).map((option) => (
 <button
 key={option.key}
 onClick={() => setSortBy(option.key)}
 className={cn(
"px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
 sortBy === option.key ?"bg-sn-green text-sn-dark shadow-sm" :"bg-muted/50 text-muted-foreground hover:bg-muted"
 )}
 >
 {option.label}
 </button>
 ))}
 </div>
 </div>
 )}

 {viewMode ==="individual" && (
 <>
 {usersLoading ? (
 <div className="h-72 flex flex-col items-center justify-center text-muted-foreground">
 <Users className="w-10 h-10 mb-3 opacity-30 animate-pulse" />
 <p className="text-sm font-medium">Loading individual analytics...</p>
 </div>
 ) : usersError ? (
 <div className="h-72 flex flex-col items-center justify-center text-muted-foreground">
 <AlertTriangle className="w-10 h-10 mb-3 text-red-500" />
 <p className="text-sm font-medium">{usersError}</p>
 <p className="text-xs">Showing fallback employee analytics where possible.</p>
 </div>
 ) : filteredIndividuals.length === 0 ? (
 <div className="h-72 flex flex-col items-center justify-center text-muted-foreground">
 <Users className="w-10 h-10 mb-3 opacity-30" />
 <p className="text-sm font-medium">No individual analytics match the selected filters.</p>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
 {filteredIndividuals.map((individual) => {
 const workloadColor = individual.workloadStatus ==="High"
 ?"text-red-600"
 : individual.workloadStatus ==="Medium"
 ?"text-orange-600"
 :"text-green-600";
 const workloadBg = individual.workloadStatus ==="High"
 ?"bg-red-500/15 border-red-500/30"
 : individual.workloadStatus ==="Medium"
 ?"bg-orange-500/15 border-orange-500/30"
 :"bg-green-500/15 border-green-500/30";
 const resolutionPct = Math.max(0, Math.min(individual.resolutionPercentage, 100));
 const escalatedCount = individual.escalatedTickets;

 return (
 <div key={individual.id} className="relative rounded-xl border-2 p-4 transition-all duration-300 overflow-hidden border-border bg-gradient-to-br from-white to-muted/30 dark:from-gray-900 dark:to-gray-800/50">
 <div className="flex items-start gap-3 mb-4">
 {individual.avatar ? (
 <img src={individual.avatar} alt={individual.name} className="w-12 h-12 rounded-full object-cover border border-border" />
 ) : (
 <div className="w-12 h-12 rounded-full border border-border bg-muted flex items-center justify-center font-semibold text-sm text-foreground">
 {individual.name.charAt(0).toUpperCase()}
 </div>
 )}
 <div className="min-w-0 flex-1">
 <h4 className="text-sm font-bold text-foreground truncate">{individual.name}</h4>
 <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider truncate">{individual.department}</p>
 </div>
 <span className={cn("text-[9px] font-semibold uppercase px-2 py-1 rounded-md border", workloadBg, workloadColor)}>
 {individual.workloadStatus} Workload
 </span>
 </div>

 <div className="grid grid-cols-2 gap-2 mb-4">
 {[
 { label:"Assigned", value: individual.assignedTickets, icon: Briefcase },
 { label:"Created", value: individual.createdTickets, icon: ClipboardList },
 { label:"Resolved", value: individual.resolvedTickets, icon: CheckCircle2 },
 { label:"Closed", value: individual.closedTickets, icon: CheckCircle2 },
 ].map((stat) => (
 <div key={stat.label} className="rounded-lg border border-border bg-background/70 p-2">
 <div className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
 <stat.icon className="w-3 h-3" />
 {stat.label}
 </div>
 <div className="text-lg font-semibold text-foreground">{stat.value}</div>
 </div>
 ))}
 </div>

 <div className="flex flex-wrap gap-1.5 mb-4">
 <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-md border bg-orange-500/15 border-orange-500/30 text-orange-600">
 Pending: {individual.pendingTickets}
 </span>
 <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-md border bg-blue-500/15 border-blue-500/30 text-blue-600">
 In Progress: {individual.inProgressTickets}
 </span>
 <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-md border bg-red-500/15 border-red-500/30 text-red-600">
 Escalated: {escalatedCount}
 </span>
 </div>

 <div className="mb-4">
 <div className="flex items-center justify-between mb-1">
 <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Resolution Percentage</span>
 <span className="text-xs font-bold text-foreground">{resolutionPct.toFixed(1)}%</span>
 </div>
 <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
 <div className="h-full bg-sn-green transition-all duration-500" style={{ width: `${resolutionPct}%` }} />
 </div>
 </div>

 <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
 {individual.items.slice(0, 4).map((ticket: any) => {
 const cfg = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG["4 - Low"];
 return (
 <Link
 key={ticket.id}
 to={`/tickets/${ticket.id}`}
 className="flex items-center gap-2 p-1.5 rounded-lg transition-all text-[10px] hover:bg-black/5 dark:hover:bg-white/5"
 >
 <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
 <span className="font-bold text-blue-600 truncate">{ticket.number || ticket.id.slice(0, 8)}</span>
 <span className="text-muted-foreground truncate flex-1">{ticket.title ||"—"}</span>
 <ArrowUpRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
 </Link>
 );
 })}
 {individual.items.length > 4 && (
 <div className="text-[10px] text-muted-foreground text-center py-1 font-medium">
 +{individual.items.length - 4} more
 </div>
 )}
 </div>
 </div>
 );
 })}
 </div>
 )}
 </>
 )}

 {viewMode !=="individual" && (
 <>
 {/* Map Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
 {groupedData.map(group => {
 const criticalCount = group.items.filter((t: any) => t.priority?.includes("Critical")).length;
 const highCount = group.items.filter((t: any) => t.priority?.includes("High")).length;
 const breachedCount = group.items.filter(
 (t: any) => t.responseSlaStatus ==="Breached" || t.resolutionSlaStatus ==="Breached"
 ).length;

 return (
 <div
 key={group.name}
 className={cn(
"relative rounded-xl border-2 p-4 transition-all duration-300 cursor-default group overflow-hidden",
 criticalCount > 0
 ?"border-red-400/60 bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20 shadow-lg shadow-red-500/10"
 : highCount > 0
 ?"border-orange-400/40 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/20 dark:to-orange-900/10"
 :"border-border bg-gradient-to-br from-white to-muted/30 dark:from-gray-900 dark:to-gray-800/50"
 )}
 >
 {/* Pulse indicator for critical */}
 {criticalCount > 0 && (
 <div className="absolute top-3 right-3">
 <div className="relative">
 <div className="w-3 h-3 bg-red-500 rounded-full animate-ping absolute" />
 <div className="w-3 h-3 bg-red-500 rounded-full relative" />
 </div>
 </div>
 )}

 {/* Group Name */}
 <h4 className="text-sm font-bold text-foreground mb-2 pr-6 truncate">{group.name}</h4>

 {/* Count */}
 <div className="flex items-baseline gap-2 mb-3">
 <span
 className={cn(
"text-3xl font-semibold tabular-nums leading-none",
 criticalCount > 0 ?"text-red-600" : highCount > 0 ?"text-orange-600" :"text-foreground"
 )}
 >
 {group.count}
 </span>
 <span className="text-xs text-muted-foreground font-medium">incidents</span>
 </div>

 {/* Priority Breakdown Bar */}
 <div className="w-full h-2 rounded-full bg-muted overflow-hidden flex mb-3">
 {["1 - Critical","2 - High","3 - Moderate","4 - Low"].map(p => {
 const pCount = group.items.filter((t: any) => t.priority === p).length;
 if (pCount === 0) return null;
 const pct = (pCount / group.count) * 100;
 return (
 <div
 key={p}
 className="h-full transition-all duration-500"
 style={{ width: `${pct}%`, backgroundColor: PRIORITY_CONFIG[p]?.color ||"#94a3b8" }}
 title={`${PRIORITY_CONFIG[p]?.label}: ${pCount}`}
 />
 );
 })}
 </div>

 {/* Priority Tags */}
 <div className="flex flex-wrap gap-1.5 mb-3">
 {["1 - Critical","2 - High","3 - Moderate","4 - Low"].map(p => {
 const pCount = group.items.filter((t: any) => t.priority === p).length;
 if (pCount === 0) return null;
 const cfg = PRIORITY_CONFIG[p];
 return (
 <span
 key={p}
 className={cn("text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-md border", cfg.bg, cfg.border)}
 style={{ color: cfg.color }}
 >
 {cfg.label}: {pCount}
 </span>
 );
 })}
 </div>

 {/* SLA Breach Warning */}
 {breachedCount > 0 && (
 <div className="flex items-center gap-1.5 text-red-600 mb-2">
 <AlertTriangle className="w-3.5 h-3.5" />
 <span className="text-[10px] font-semibold uppercase tracking-wider animate-pulse">
 {breachedCount} SLA Breached
 </span>
 </div>
 )}

 {/* Ticket List */}
 <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
 {group.items.slice(0, 8).map((t: any) => {
 const cfg = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG["4 - Low"];
 const isSlaBreached =
 t.responseSlaStatus ==="Breached" || t.resolutionSlaStatus ==="Breached";
 return (
 <Link
 key={t.id}
 to={`/tickets/${t.id}`}
 className={cn(
"flex items-center gap-2 p-1.5 rounded-lg transition-all text-[10px] group/item",
 hoveredId === t.id
 ?"bg-black/5 dark:bg-white/5"
 :"hover:bg-black/5 dark:hover:bg-white/5"
 )}
 onMouseEnter={() => setHoveredId(t.id)}
 onMouseLeave={() => setHoveredId(null)}
 >
 <div
 className="w-2 h-2 rounded-full flex-shrink-0"
 style={{ backgroundColor: cfg.color }}
 />
 <span className="font-bold text-blue-600 truncate">
 {t.number || t.id.slice(0, 8)}
 </span>
 <span className="text-muted-foreground truncate flex-1">{t.title ||"—"}</span>
 {isSlaBreached && <Zap className="w-3 h-3 text-red-500 flex-shrink-0" />}
 <ArrowUpRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover/item:opacity-100 flex-shrink-0" />
 </Link>
 );
 })}
 {group.items.length > 8 && (
 <div className="text-[10px] text-muted-foreground text-center py-1 font-medium">
 +{group.items.length - 8} more
 </div>
 )}
 </div>
 </div>
 );
 })}
 </div>
 </>
 )}

 {/* Legend */}
 <div className="flex items-center justify-center gap-6 pt-2">
 {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
 <div key={key} className="flex items-center gap-1.5">
 <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cfg.color }} />
 <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
 {cfg.label}
 </span>
 </div>
 ))}
 </div>
 </div>
 );
}

export function Reports() {
 const { user, profile } = useAuth();
 const [tickets, setTickets] = useState<any[]>([]);
 const [users, setUsers] = useState<any[]>([]);
 const [data, setData] = useState<any[]>([]);
 const [categoryData, setCategoryData] = useState<any[]>([]);
 const [slaData, setSlaData] = useState<any[]>([]);
 const [resolutionData, setResolutionData] = useState<any[]>([]);
 const [usersLoading, setUsersLoading] = useState(true);
 const [usersError, setUsersError] = useState<string | null>(null);

 useEffect(() => {
 if (!user || !profile) return;

 const isAgent = ROLE_HIERARCHY[profile.role as Role] >= ROLE_HIERARCHY["agent"];
 const ticketsRef = collection(db,"tickets");
 const q = isAgent ? query(ticketsRef) : query(ticketsRef, where("createdBy","==", user.uid));

 const unsubscribe = onSnapshot(
 q,
 snapshot => {
 const ticketsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
 setTickets(ticketsList);

 // Status Distribution
 const statusCounts: any = {};
 ticketsList.forEach((t: any) => {
 statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
 });
 setData(Object.keys(statusCounts).map(status => ({ name: status, count: statusCounts[status] })));

 // Category Distribution
 const catCounts: any = {};
 ticketsList.forEach((t: any) => {
 const catValue = t.incidentCategory || t.incident_category || t.category ||"Uncategorized";
 catCounts[catValue] = (catCounts[catValue] || 0) + 1;
 });
 setCategoryData(Object.keys(catCounts).map(cat => ({ name: cat, value: catCounts[cat] })));

 // Resolution Code Distribution
 const resCounts: any = {};
 ticketsList.forEach((t: any) => {
 if (t.status ==="Resolved" || t.status ==="Closed") {
 const code = t.resolutionCode ||"Uncoded";
 resCounts[code] = (resCounts[code] || 0) + 1;
 }
 });
 setResolutionData(Object.keys(resCounts).map(code => ({ name: code, count: resCounts[code] })));

 // SLA Compliance dynamically calculated
 const slaCounts = {"Within SLA": 0,"At Risk": 0, Breached: 0 };
 const now = Date.now();

 const getDynamicSLAStatus = (ticket: any, type: 'response' | 'resolution') => {
 const metAt = type === 'response' ? ticket.firstResponseAt : ticket.resolvedAt;
 if (metAt) {
 const metMs = toMs(metAt);
 if (!isNaN(metMs)) return"Within SLA"; // Or completed
 }

 if (type === 'resolution' && !ticket.firstResponseAt && ticket.status ==="New") {
 // Resolution timer hasn't started yet
 return"Within SLA";
 }

 const deadline = type === 'response' ? ticket.responseDeadline : ticket.resolutionDeadline;
 const deadlineMs = toMs(deadline);
 
 if (isNaN(deadlineMs)) return"Within SLA"; // Ignore tickets without deadlines

 const isPaused = ticket.status ==="On Hold" || ticket.status ==="Waiting for Customer" || ticket.status ==="Awaiting User" || ticket.status ==="Awaiting Vendor";
 
 let effectiveNow = now;
 if (isPaused && ticket.onHoldStart) {
 const holdMs = toMs(ticket.onHoldStart);
 if (!isNaN(holdMs)) effectiveNow = holdMs;
 }
 
 const diff = deadlineMs - effectiveNow + (Number(ticket.totalPausedTime) || 0);

 if (diff <= 0) return"Breached";
 if (diff < 3600000) return"At Risk"; // Less than 1 hour left
 return"Within SLA";
 };

 ticketsList.forEach((t: any) => {
 // Exclude resolved/closed/canceled tickets from"At Risk" or"Breached" if they met it.
 // But actually, we want to know historically if they breached.
 // If they are closed/resolved, getDynamicSLAStatus handles metAt checking.
 const respStatus = getDynamicSLAStatus(t, 'response');
 const resStatus = getDynamicSLAStatus(t, 'resolution');

 if (resStatus ==="Breached" || respStatus ==="Breached") {
 slaCounts["Breached"]++;
 } else if (resStatus ==="At Risk" || respStatus ==="At Risk") {
 slaCounts["At Risk"]++;
 } else {
 slaCounts["Within SLA"]++;
 }
 });

 setSlaData([
 { name:"Within SLA", value: slaCounts["Within SLA"] },
 { name:"At Risk", value: slaCounts["At Risk"] },
 { name:"Breached", value: slaCounts["Breached"] },
 ]);
 },
 error => {
 handleFirestoreError(error, OperationType.LIST,"tickets");
 }
 );
 return unsubscribe;
 }, [user?.uid, profile?.role]);

 useEffect(() => {
 const unsubscribe = onSnapshot(
 query(collection(db,"users")),
 (snapshot) => {
 setUsers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
 setUsersLoading(false);
 setUsersError(null);
 },
 (error) => {
 handleFirestoreError(error, OperationType.LIST,"users");
 setUsers([]);
 setUsersLoading(false);
 setUsersError("Unable to load team directory.");
 }
 );
 return unsubscribe;
 }, []);

 const COLORS = ["#81B532","#151B26","#3b82f6","#ef4444","#f59e0b"];
 const SLA_COLORS = ["#81B532","#f59e0b","#ef4444"];

 return (
 <div className="space-y-8">
 <div>
 <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
 <p className="text-muted-foreground">Visual insights into service desk performance.</p>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
 {/* SLA Compliance Widget */}
 <div className="sn-card">
 <h3 className="text-lg font-bold mb-6">SLA Compliance Rate</h3>
 <div className="h-64 w-full relative">
 <ResponsiveContainer width="100%" height="100%">
 <PieChart>
 <Pie
 data={slaData.some(d => d.value > 0) ? slaData : [{ name:"No Data", value: 1 }]}
 cx="50%"
 cy="50%"
 innerRadius={75}
 outerRadius={105}
 paddingAngle={slaData.some(d => d.value > 0) ? 3 : 0}
 dataKey="value"
 startAngle={90}
 endAngle={-270}
 >
 {(slaData.some(d => d.value > 0) ? slaData : [{ name:"No Data", value: 1 }]).map(
 (entry, index) => (
 <Cell
 key={`cell-${index}`}
 fill={
 slaData.some(d => d.value > 0)
 ? SLA_COLORS[index % SLA_COLORS.length]
 :"#e2e8f0"
 }
 />
 )
 )}
 </Pie>
 <Tooltip
 formatter={(value: any, name: any) => [value +" tickets", name]}
 contentStyle={{ borderRadius:"8px", border:"1px solid #e2e8f0", fontSize:"12px" }}
 />
 </PieChart>
 </ResponsiveContainer>
 {/* Center text */}
 <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
 <span className="text-4xl font-bold text-sn-dark dark:text-white leading-none">
 {(() => {
 const total = slaData.reduce((sum, d) => sum + d.value, 0);
 const withinSla = slaData[0]?.value ?? 0;
 return total > 0 ? Math.round((withinSla / total) * 100) : 0;
 })()}
 %
 </span>
 <span className="text-xs text-muted-foreground font-medium mt-1">Compliance</span>
 </div>
 </div>
 {/* Legend */}
 <div className="flex justify-center gap-6 mt-4">
 {slaData.map((entry, index) => (
 <div key={entry.name} className="flex items-center gap-2">
 <div
 className="w-3 h-3 rounded-full flex-shrink-0"
 style={{ backgroundColor: SLA_COLORS[index % SLA_COLORS.length] }}
 />
 <span className="text-sm font-medium text-foreground">
 {entry.name}:&nbsp;<strong>{entry.value}</strong>
 </span>
 </div>
 ))}
 </div>
 </div>

 <div className="sn-card">
 <h3 className="text-lg font-bold mb-6">Ticket Status Distribution</h3>
 <div className="h-80 w-full">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={data}>
 <CartesianGrid strokeDasharray="3 3" vertical={false} />
 <XAxis dataKey="name" fontSize={12} />
 <YAxis fontSize={12} />
 <Tooltip
 contentStyle={{
 backgroundColor:"#fff",
 borderRadius:"8px",
 border:"1px solid #e2e8f0",
 }}
 />
 <Bar dataKey="count" fill="#81B532" radius={[4, 4, 0, 0]} />
 </BarChart>
 </ResponsiveContainer>
 </div>
 </div>

 <div className="sn-card">
 <h3 className="text-lg font-bold mb-6">Tickets by Category</h3>
 <div className="h-80 w-full flex items-center justify-center">
 <ResponsiveContainer width="100%" height="100%">
 <PieChart>
 <Pie
 data={categoryData}
 cx="50%"
 cy="50%"
 innerRadius={60}
 outerRadius={100}
 paddingAngle={5}
 dataKey="value"
 >
 {categoryData.map((entry, index) => (
 <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
 ))}
 </Pie>
 <Tooltip />
 </PieChart>
 </ResponsiveContainer>
 </div>
 <div className="flex flex-wrap justify-center gap-4 mt-4">
 {categoryData.map((entry, index) => (
 <div key={entry.name} className="flex items-center gap-2">
 <div
 className="w-3 h-3 rounded-full"
 style={{ backgroundColor: COLORS[index % COLORS.length] }}
 />
 <span className="text-xs font-medium">{entry.name}</span>
 </div>
 ))}
 </div>
 </div>

 {/* Resolution Codes Chart */}
 <div className="sn-card">
 <h3 className="text-lg font-bold mb-6">Tickets by Resolution Code</h3>
 <div className="h-80 w-full">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart
 data={
 resolutionData.length > 0
 ? resolutionData
 : [{ name:"No Resolved Tickets", count: 0 }]
 }
 >
 <CartesianGrid strokeDasharray="3 3" vertical={false} />
 <XAxis dataKey="name" fontSize={9} interval={0} angle={-45} textAnchor="end" height={80} />
 <YAxis fontSize={12} />
 <Tooltip
 contentStyle={{
 backgroundColor:"#fff",
 borderRadius:"8px",
 border:"1px solid #e2e8f0",
 fontSize:"11px",
 }}
 />
 <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
 </BarChart>
 </ResponsiveContainer>
 </div>
 </div>

 {/* ═══ CRITICAL INCIDENTS MAP — FULL WIDTH ═══ */}
 <div className="sn-card lg:col-span-2">
 <div className="flex items-center gap-3 mb-6">
 <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
 <IconMap className="w-5 h-5 text-red-600" />
 </div>
 <div>
 <h3 className="text-lg font-bold">Critical Incidents Map</h3>
 <p className="text-xs text-muted-foreground">
 Interactive visualization of open incidents by group, category, priority, or individual.
 </p>
 </div>
 </div>
 <IncidentMapView tickets={tickets} users={users} usersLoading={usersLoading} usersError={usersError} />
 </div>
 </div>
 </div>
 );
}
