import React, { useEffect, useState, useMemo, useCallback } from"react";
import { collection, query, onSnapshot } from"firebase/firestore";
import { db, handleFirestoreError, OperationType } from"../lib/firebase";
import { useAuth } from"../contexts/AuthContext";
import { ROLE_HIERARCHY, ROLE_LABELS, Role } from"../lib/roles";
import {
 BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
 PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Legend,
 ComposedChart,
} from"recharts";
import {
 BarChart3, TrendingUp, TrendingDown, Ticket, Clock, AlertTriangle,
 ShieldAlert, Users, ArrowUpRight, RefreshCcw, UserX, Timer,
 Filter, X, ChevronDown, ChevronUp, Activity, Briefcase, Target,
 Zap, Search, Download,
} from"lucide-react";
import { cn } from"@/lib/utils";
import { format, subDays, differenceInDays, differenceInHours, startOfMonth, endOfMonth, eachMonthOfInterval, eachWeekOfInterval, startOfWeek, endOfWeek, isWithinInterval, subMonths } from"date-fns";
import { Link } from"react-router-dom";

/* ═══════════════════════════════════════════════════════════
 HELPERS
 ═══════════════════════════════════════════════════════════ */

function toMs(val: any): number {
 if (!val) return NaN;
 if (typeof val ==="object" && val.seconds !== undefined) return val.seconds * 1000 + (val.nanoseconds || 0) / 1_000_000;
 if (typeof val ==="object" && typeof val.toDate ==="function") return val.toDate().getTime();
 if (typeof val ==="number") return val;
 return new Date(val).getTime();
}

function normalizeText(val: any): string {
 return String(val ||"").trim().toLowerCase();
}

/* ═══════════════════════════════════════════════════════════
 COLORS & TOKENS
 ═══════════════════════════════════════════════════════════ */

const CHART_COLORS = [
"#81B532","#3b82f6","#f59e0b","#ef4444","#8b5cf6",
"#06b6d4","#ec4899","#14b8a6","#f97316","#6366f1",
"#10b981","#e11d48","#0ea5e9","#84cc16","#a855f7",
];

const STATUS_COLORS: Record<string, string> = {
"New":"#3b82f6",
"Open":"#0ea5e9",
"In Progress":"#f59e0b",
"Pending":"#f97316",
"Pending Approval":"#f97316",
"On Hold":"#9ca3af",
"Waiting for Customer":"#a78bfa",
"Awaiting User":"#a78bfa",
"Awaiting Vendor":"#c084fc",
"Resolved":"#81B532",
"Closed":"#10b981",
"Canceled":"#6b7280",
"Reopened":"#ef4444",
};

const PRIORITY_COLORS: Record<string, string> = {
"1 - Critical":"#ef4444",
"2 - High":"#f59e0b",
"3 - Moderate":"#3b82f6",
"4 - Low":"#81B532",
};

const CARD_CONFIGS = [
 { key:"created", label:"Total Incidents Created", gradient:"from-blue-500 to-cyan-500", borderColor:"border-blue-500/20", link:"/tickets?filter=all" },
 { key:"open", label:"Total Incidents Open", gradient:"from-cyan-500 to-teal-500", borderColor:"border-cyan-500/20", link:"/tickets?filter=open" },
 { key:"pending", label:"Total Incidents Pending", gradient:"from-amber-500 to-orange-500", borderColor:"border-amber-500/20", link:"/tickets?filter=pending" },
 { key:"resolved", label:"Total Incidents Resolved", gradient:"from-green-500 to-emerald-500", borderColor:"border-green-500/20", link:"/tickets?filter=resolved" },
 { key:"closed", label:"Total Incidents Closed", gradient:"from-emerald-500 to-green-500", borderColor:"border-emerald-500/20", link:"/tickets?filter=closed" },
 { key:"breached", label:"Total Incidents Breached", gradient:"from-red-500 to-rose-500", borderColor:"border-red-500/20", link:"/tickets?filter=sla_breached_rca" },
 { key:"escalated", label:"Total Incidents Escalated", gradient:"from-purple-500 to-violet-500", borderColor:"border-purple-500/20", link:"/tickets?filter=sla_escalated" },
 { key:"reopened", label:"Total Reopened Incidents", gradient:"from-rose-500 to-pink-500", borderColor:"border-rose-500/20", link:"/tickets?filter=all" },
 { key:"unassigned", label:"Total Unassigned Incidents", gradient:"from-slate-500 to-gray-500", borderColor:"border-slate-500/20", link:"/tickets?filter=unassigned" },
 { key:"overdue", label:"Total Overdue Incidents", gradient:"from-orange-500 to-red-500", borderColor:"border-orange-500/20", link:"/tickets?filter=overdue" },
];

/* ═══════════════════════════════════════════════════════════
 CUSTOM TOOLTIP
 ═══════════════════════════════════════════════════════════ */

function CustomTooltip({ active, payload, label }: any) {
 if (!active || !payload?.length) return null;
 return (
 <div className="bg-white dark:bg-gray-900 border border-border rounded-xl shadow-2xl px-4 py-3 min-w-[160px]">
 <p className="text-xs font-bold text-muted-foreground mb-2">{label}</p>
 {payload.map((entry: any, i: number) => (
 <div key={i} className="flex items-center justify-between gap-4 py-0.5">
 <div className="flex items-center gap-2">
 <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
 <span className="text-xs text-foreground">{entry.name || entry.dataKey}</span>
 </div>
 <span className="text-xs font-bold text-foreground tabular-nums">{entry.value}</span>
 </div>
 ))}
 </div>
 );
}

/* ═══════════════════════════════════════════════════════════
 SUMMARY CARD COMPONENT
 ═══════════════════════════════════════════════════════════ */

function SummaryCard({ config, count, previousCount }: { config: typeof CARD_CONFIGS[0]; count: number; previousCount: number; key?: string }) {
 const change = previousCount > 0 ? ((count - previousCount) / previousCount) * 100 : count > 0 ? 100 : 0;
 const isPositive = change >= 0;

 return (
 <Link to={config.link} className={cn(
"relative overflow-hidden rounded-xl border bg-card p-6 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgba(255,255,255,0.04)] group cursor-pointer block",
 config.borderColor
 )}>
 <div className={cn("absolute top-0 left-0 w-full h-1 bg-gradient-to-r", config.gradient)} />
 <div className="relative z-10 flex flex-col justify-between h-full">
 <div className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground mb-2">
 {config.label}
 </div>
 <div className="flex items-end justify-between mt-2">
 <div className="text-4xl font-semibold tabular-nums tracking-tight text-foreground">
 {count.toLocaleString()}
 </div>
 <div className={cn(
"flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md",
 isPositive ?"text-emerald-700 bg-emerald-500/10 dark:text-emerald-400" :"text-rose-700 bg-rose-500/10 dark:text-rose-400"
 )}>
 {isPositive ?"+" :""}{change.toFixed(1)}%
 </div>
 </div>
 </div>
 </Link>
 );
}

/* ═══════════════════════════════════════════════════════════
 CHART CARD WRAPPER
 ═══════════════════════════════════════════════════════════ */

function ChartCard({ title, subtitle, children, className }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
 return (
 <div className={cn(
"bg-card border border-border rounded-2xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20",
 className
 )}>
 <div className="px-6 pt-6 pb-2">
 <h3 className="text-base font-bold text-foreground">{title}</h3>
 {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
 </div>
 <div className="px-4 pb-6">{children}</div>
 </div>
 );
}

/* ═══════════════════════════════════════════════════════════
 MAIN COMPONENT
 ═══════════════════════════════════════════════════════════ */

export function DataAnalytics() {
 const { user, profile } = useAuth();
 const role = (profile?.role ||"user") as Role;

 /* ─── Access Control: Admin and above only ─── */
 if (ROLE_HIERARCHY[role] < ROLE_HIERARCHY["admin"]) {
 return (
 <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
 <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
 <ShieldAlert className="w-16 h-16 text-red-500 opacity-60" />
 </div>
 <h2 className="text-2xl font-bold text-foreground">Access Restricted</h2>
 <p className="text-muted-foreground max-w-md">You do not have permission to access this module.</p>
 <p className="text-xs text-muted-foreground">Required: Administrator or above</p>
 </div>
 );
 }

 /* ─── Raw data ─── */
 const [allTickets, setAllTickets] = useState<any[]>([]);
 const [allUsers, setAllUsers] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);

 /* ─── Filters ─── */
 const [showFilters, setShowFilters] = useState(false);
 const [dateFrom, setDateFrom] = useState("");
 const [dateTo, setDateTo] = useState("");
 const [companyFilter, setCompanyFilter] = useState("all");
 const [departmentFilter, setDepartmentFilter] = useState("all");
 const [teamFilter, setTeamFilter] = useState("all");
 const [employeeFilter, setEmployeeFilter] = useState("all");
 const [priorityFilter, setPriorityFilter] = useState("all");
 const [categoryFilter, setCategoryFilter] = useState("all");
 const [statusFilter, setStatusFilter] = useState("all");

 /* ─── Active tab ─── */
 const [activeTab, setActiveTab] = useState<"tickets" |"employee" |"workload">("tickets");

 /* ═══ REAL-TIME FIRESTORE LISTENERS ═══ */

 useEffect(() => {
 if (!user || !profile) return;

 const ticketsRef = collection(db,"tickets");
 const q = query(ticketsRef);

 const unsubTickets = onSnapshot(
 q,
 (snapshot) => {
 const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
 setAllTickets(list);
 setLoading(false);
 },
 (error) => {
 handleFirestoreError(error, OperationType.LIST,"tickets");
 setLoading(false);
 }
 );

 const usersRef = collection(db,"users");
 const unsubUsers = onSnapshot(
 query(usersRef),
 (snapshot) => {
 setAllUsers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
 },
 (error) => {
 handleFirestoreError(error, OperationType.LIST,"users");
 }
 );

 return () => {
 unsubTickets();
 unsubUsers();
 };
 }, [user, profile]);

 /* ═══ ROLE-BASED FILTERING ═══ */

 const roleFilteredTickets = useMemo(() => {
 if (!profile) return [];

 switch (role) {
 case"ultra_super_admin":
 case"super_admin":
 return allTickets; // See everything

 case"admin":
 return allTickets.filter((t) => {
 if (!profile.department) return true;
 return (
 normalizeText(t.department) === normalizeText(profile.department) ||
 normalizeText(t.assignmentGroup) === normalizeText(profile.department)
 );
 });

 case"sub_admin":
 return allTickets.filter((t) => {
 const teamMatch = profile.team && normalizeText(t.team) === normalizeText(profile.team);
 const groupMatch = profile.groupName && normalizeText(t.assignmentGroup) === normalizeText(profile.groupName);
 return teamMatch || groupMatch;
 });

 case"agent":
 return allTickets.filter((t) => {
 return (
 normalizeText(t.assignedTo) === normalizeText(user?.uid) ||
 normalizeText(t.assignedToName) === normalizeText(profile.name)
 );
 });

 case"user":
 default:
 return allTickets.filter((t) => {
 return (
 normalizeText(t.createdBy) === normalizeText(user?.uid) ||
 normalizeText(t.caller) === normalizeText(profile.name) ||
 normalizeText(t.createdByEmail) === normalizeText(profile.email)
 );
 });
 }
 }, [allTickets, profile, role, user]);

 /* ═══ FILTER APPLICATION ═══ */

 const filteredTickets = useMemo(() => {
 return roleFilteredTickets.filter((t) => {
 // Date filter
 if (dateFrom) {
 const createdMs = toMs(t.createdAt);
 if (!isNaN(createdMs) && createdMs < new Date(`${dateFrom}T00:00:00`).getTime()) return false;
 }
 if (dateTo) {
 const createdMs = toMs(t.createdAt);
 if (!isNaN(createdMs) && createdMs > new Date(`${dateTo}T23:59:59`).getTime()) return false;
 }

 // Company filter
 if (companyFilter !=="all" && normalizeText(t.company) !== normalizeText(companyFilter)) return false;

 // Department filter
 if (departmentFilter !=="all" && normalizeText(t.department) !== normalizeText(departmentFilter)) return false;

 // Team filter
 if (teamFilter !=="all" && normalizeText(t.team || t.assignmentGroup) !== normalizeText(teamFilter)) return false;

 // Employee filter
 if (employeeFilter !=="all") {
 const matchAssigned = normalizeText(t.assignedTo) === normalizeText(employeeFilter) || normalizeText(t.assignedToName) === normalizeText(employeeFilter);
 const matchCreated = normalizeText(t.createdBy) === normalizeText(employeeFilter) || normalizeText(t.createdByName) === normalizeText(employeeFilter);
 if (!matchAssigned && !matchCreated) return false;
 }

 // Priority filter
 if (priorityFilter !=="all" && (t.priority ||"4 - Low") !== priorityFilter) return false;

 // Category filter
 if (categoryFilter !=="all") {
 const ticketCat = t.incidentCategory || t.incident_category || t.category;
 if (normalizeText(ticketCat) !== normalizeText(categoryFilter)) return false;
 }

 // Status filter
 if (statusFilter !=="all" && normalizeText(t.status) !== normalizeText(statusFilter)) return false;

 return true;
 });
 }, [roleFilteredTickets, dateFrom, dateTo, companyFilter, departmentFilter, teamFilter, employeeFilter, priorityFilter, categoryFilter, statusFilter]);

 /* ═══ PREVIOUS PERIOD TICKETS (for trend comparison) ═══ */

 const previousPeriodTickets = useMemo(() => {
 if (!dateFrom && !dateTo) {
 // Default: compare current month vs previous month
 const now = new Date();
 const startCurrent = startOfMonth(now).getTime();
 const startPrev = startOfMonth(subMonths(now, 1)).getTime();
 const endPrev = endOfMonth(subMonths(now, 1)).getTime();

 return roleFilteredTickets.filter((t) => {
 const ms = toMs(t.createdAt);
 return !isNaN(ms) && ms >= startPrev && ms <= endPrev;
 });
 }
 return [];
 }, [roleFilteredTickets, dateFrom, dateTo]);

 /* ═══ SUMMARY CARD CALCULATIONS ═══ */

 const summaryData = useMemo(() => {
 const now = Date.now();
 const tickets = filteredTickets;
 const prev = previousPeriodTickets;

 const isBreached = (t: any) => {
 if (t.responseSlaStatus ==="Breached" || t.resolutionSlaStatus ==="Breached") return true;
 const respDeadline = toMs(t.responseDeadline);
 const resDeadline = toMs(t.resolutionDeadline);
 if (!isNaN(respDeadline) && now > respDeadline && !t.firstResponseAt) return true;
 if (!isNaN(resDeadline) && now > resDeadline && !["Resolved","Closed","Canceled"].includes(t.status)) return true;
 return false;
 };

 const isOverdue = (t: any) => {
 const deadline = toMs(t.resolutionDeadline) || toMs(t.responseDeadline);
 if (isNaN(deadline)) return false;
 return now > deadline && !["Resolved","Closed","Canceled"].includes(t.status ||"");
 };

 const calc = (arr: any[]) => ({
 created: arr.length,
 open: arr.filter((t) => ["New","Open","In Progress"].includes(t.status ||"")).length,
 pending: arr.filter((t) => ["Pending","Pending Approval","On Hold","Waiting for Customer","Awaiting User","Awaiting Vendor"].includes(t.status ||"")).length,
 resolved: arr.filter((t) => t.status ==="Resolved").length,
 closed: arr.filter((t) => t.status ==="Closed").length,
 breached: arr.filter(isBreached).length,
 escalated: arr.filter((t) => t.escalated === true || t.isEscalated === true || (t.priority ||"").includes("Critical")).length,
 reopened: arr.filter((t) => t.status ==="Reopened" || t.reopened === true || t.reopenCount > 0).length,
 unassigned: arr.filter((t) => !t.assignedTo && !t.assignedToName).length,
 overdue: arr.filter(isOverdue).length,
 });

 return { current: calc(tickets), previous: calc(prev) };
 }, [filteredTickets, previousPeriodTickets]);

 /* ═══ FILTER OPTIONS (derived from data) ═══ */

 const filterOptions = useMemo(() => {
 const companies = [...new Set(roleFilteredTickets.map((t) => t.company).filter(Boolean))].sort();
 const departments = [...new Set(roleFilteredTickets.map((t) => t.department).filter(Boolean))].sort();
 const teams = [...new Set(roleFilteredTickets.map((t) => t.team || t.assignmentGroup).filter(Boolean))].sort();
 const employees = [...new Set([
 ...roleFilteredTickets.map((t) => t.assignedToName).filter(Boolean),
 ...roleFilteredTickets.map((t) => t.createdByName).filter(Boolean),
 ])].sort();
 const priorities = [...new Set(roleFilteredTickets.map((t) => t.priority ||"4 - Low"))].sort();
 const categories = [...new Set(roleFilteredTickets.flatMap((t) => [t.incidentCategory, t.incident_category, t.category].filter(Boolean)))].sort();
 const statuses = [...new Set(roleFilteredTickets.map((t) => t.status ||"New"))].sort();

 return { companies, departments, teams, employees, priorities, categories, statuses };
 }, [roleFilteredTickets]);

 /* ═══ CHART DATA CALCULATIONS ═══ */

 // 1. Tickets Created Over Time (Monthly)
 const ticketsOverTimeData = useMemo(() => {
 const now = new Date();
 const months = eachMonthOfInterval({
 start: subMonths(now, 11),
 end: now,
 });

 return months.map((monthStart) => {
 const monthEnd = endOfMonth(monthStart);
 const count = filteredTickets.filter((t) => {
 const ms = toMs(t.createdAt);
 return !isNaN(ms) && isWithinInterval(new Date(ms), { start: monthStart, end: monthEnd });
 }).length;
 return { name: format(monthStart,"MMM yy"), count };
 });
 }, [filteredTickets]);

 // 2. Open vs Closed vs Pending vs Resolved
 const statusComparisonData = useMemo(() => {
 const s = summaryData.current;
 return [
 { name:"Open", count: s.open, fill:"#0ea5e9" },
 { name:"Pending", count: s.pending, fill:"#f59e0b" },
 { name:"Resolved", count: s.resolved, fill:"#81B532" },
 { name:"Closed", count: s.closed, fill:"#10b981" },
 ];
 }, [summaryData]);

 // 3. Tickets by Category
 const categoryData = useMemo(() => {
 const counts: Record<string, number> = {};
 filteredTickets.forEach((t) => {
 const cat = t.incidentCategory || t.incident_category || t.category ||"Uncategorized";
 counts[cat] = (counts[cat] || 0) + 1;
 });
 return Object.entries(counts)
 .map(([name, value]) => ({ name, value }))
 .sort((a, b) => b.value - a.value)
 .slice(0, 10);
 }, [filteredTickets]);

 // 4. Tickets by Priority
 const priorityData = useMemo(() => {
 const counts: Record<string, number> = {};
 filteredTickets.forEach((t) => {
 const p = t.priority ||"4 - Low";
 counts[p] = (counts[p] || 0) + 1;
 });
 return Object.entries(counts)
 .map(([name, count]) => ({ name, count, fill: PRIORITY_COLORS[name] ||"#6b7280" }))
 .sort((a, b) => a.name.localeCompare(b.name));
 }, [filteredTickets]);

 // 5. Tickets by Department
 const departmentData = useMemo(() => {
 const counts: Record<string, number> = {};
 filteredTickets.forEach((t) => {
 const dep = t.department ||"Unassigned";
 counts[dep] = (counts[dep] || 0) + 1;
 });
 return Object.entries(counts)
 .map(([name, count]) => ({ name, count }))
 .sort((a, b) => b.count - a.count)
 .slice(0, 10);
 }, [filteredTickets]);

 // 6. Tickets by Employee
 const employeeTicketData = useMemo(() => {
 const counts: Record<string, number> = {};
 filteredTickets.forEach((t) => {
 const emp = t.assignedToName ||"Unassigned";
 counts[emp] = (counts[emp] || 0) + 1;
 });
 return Object.entries(counts)
 .map(([name, count]) => ({ name, count }))
 .sort((a, b) => b.count - a.count)
 .slice(0, 12);
 }, [filteredTickets]);

 // 7. Ticket Aging Analysis
 const agingData = useMemo(() => {
 const now = Date.now();
 const buckets = [
 { label:"< 1 Day", min: 0, max: 1 },
 { label:"1-3 Days", min: 1, max: 3 },
 { label:"3-7 Days", min: 3, max: 7 },
 { label:"1-2 Weeks", min: 7, max: 14 },
 { label:"2-4 Weeks", min: 14, max: 30 },
 { label:"> 30 Days", min: 30, max: Infinity },
 ];

 const openTickets = filteredTickets.filter(
 (t) => !["Resolved","Closed","Canceled"].includes(t.status ||"")
 );

 return buckets.map((bucket) => {
 const count = openTickets.filter((t) => {
 const created = toMs(t.createdAt);
 if (isNaN(created)) return false;
 const dayAge = differenceInDays(now, created);
 return dayAge >= bucket.min && dayAge < bucket.max;
 }).length;
 return { name: bucket.label, count };
 });
 }, [filteredTickets]);

 // 8. SLA Breach Analysis
 const slaBreachData = useMemo(() => {
 const now = Date.now();
 let withinSla = 0;
 let atRisk = 0;
 let breached = 0;

 filteredTickets.forEach((t) => {
 const isB =
 t.responseSlaStatus ==="Breached" ||
 t.resolutionSlaStatus ==="Breached" ||
 (!isNaN(toMs(t.responseDeadline)) && now > toMs(t.responseDeadline) && !t.firstResponseAt) ||
 (!isNaN(toMs(t.resolutionDeadline)) && now > toMs(t.resolutionDeadline) && !["Resolved","Closed","Canceled"].includes(t.status));

 if (isB) {
 breached++;
 return;
 }

 const respDeadline = toMs(t.responseDeadline);
 const resDeadline = toMs(t.resolutionDeadline);
 const minDeadline = Math.min(
 isNaN(respDeadline) ? Infinity : respDeadline,
 isNaN(resDeadline) ? Infinity : resDeadline
 );
 if (minDeadline !== Infinity && minDeadline - now < 3600000 && minDeadline - now > 0) {
 atRisk++;
 return;
 }

 withinSla++;
 });

 return [
 { name:"Within SLA", value: withinSla },
 { name:"At Risk", value: atRisk },
 { name:"Breached", value: breached },
 ];
 }, [filteredTickets]);

 // 9. Escalation Analysis
 const escalationData = useMemo(() => {
 const months = eachMonthOfInterval({
 start: subMonths(new Date(), 5),
 end: new Date(),
 });

 return months.map((monthStart) => {
 const monthEnd = endOfMonth(monthStart);
 const monthTickets = filteredTickets.filter((t) => {
 const ms = toMs(t.createdAt);
 return !isNaN(ms) && isWithinInterval(new Date(ms), { start: monthStart, end: monthEnd });
 });

 const escalated = monthTickets.filter(
 (t) => t.escalated === true || t.isEscalated === true || (t.priority ||"").includes("Critical")
 ).length;
 const nonEscalated = monthTickets.length - escalated;

 return {
 name: format(monthStart,"MMM yy"),
 Escalated: escalated,
"Non-Escalated": nonEscalated,
 };
 });
 }, [filteredTickets]);

 // 10. Resolution Trend
 const resolutionTrendData = useMemo(() => {
 const months = eachMonthOfInterval({
 start: subMonths(new Date(), 11),
 end: new Date(),
 });

 return months.map((monthStart) => {
 const monthEnd = endOfMonth(monthStart);
 const monthTickets = filteredTickets.filter((t) => {
 const ms = toMs(t.createdAt);
 return !isNaN(ms) && isWithinInterval(new Date(ms), { start: monthStart, end: monthEnd });
 });

 const resolved = monthTickets.filter((t) => t.status ==="Resolved" || t.status ==="Closed").length;
 const total = monthTickets.length;
 const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;

 return {
 name: format(monthStart,"MMM yy"),
"Resolution Rate": rate,
 Created: total,
 Resolved: resolved,
 };
 });
 }, [filteredTickets]);

 /* ═══ EMPLOYEE ANALYTICS ═══ */

 const employeeAnalytics = useMemo(() => {
 const empMap = new Map<string, any>();

 // Seed from users collection
 allUsers.forEach((u) => {
 const key = normalizeText(u.uid || u.id);
 if (!key) return;
 empMap.set(key, {
 id: key,
 name: u.name || u.displayName || u.email ||"Unknown",
 role: ROLE_LABELS[(u.role ||"user") as Role] || u.role ||"User",
 email: u.email ||"",
 assigned: 0,
 created: 0,
 resolved: 0,
 pending: 0,
 open: 0,
 breached: 0,
 totalResponseTimeMs: 0,
 responseCount: 0,
 });
 });

 filteredTickets.forEach((t) => {
 // Assigned tickets
 const assignedKey = normalizeText(t.assignedTo);
 if (assignedKey) {
 if (!empMap.has(assignedKey)) {
 empMap.set(assignedKey, {
 id: assignedKey,
 name: t.assignedToName || assignedKey,
 role:"—",
 email:"",
 assigned: 0,
 created: 0,
 resolved: 0,
 pending: 0,
 open: 0,
 breached: 0,
 totalResponseTimeMs: 0,
 responseCount: 0,
 });
 }
 const emp = empMap.get(assignedKey);
 emp.assigned++;
 if (t.status ==="Resolved" || t.status ==="Closed") emp.resolved++;
 if (["Pending","Pending Approval","On Hold","Waiting for Customer","Awaiting User","Awaiting Vendor"].includes(t.status ||"")) emp.pending++;
 if (["New","Open","In Progress"].includes(t.status ||"")) emp.open++;
 if (t.responseSlaStatus ==="Breached" || t.resolutionSlaStatus ==="Breached") emp.breached++;

 // Response time calculation
 const createdMs = toMs(t.createdAt);
 const firstRespMs = toMs(t.firstResponseAt);
 if (!isNaN(createdMs) && !isNaN(firstRespMs)) {
 emp.totalResponseTimeMs += firstRespMs - createdMs;
 emp.responseCount++;
 }
 if (t.assignedToName) emp.name = t.assignedToName;
 }

 // Created tickets
 const createdKey = normalizeText(t.createdBy);
 if (createdKey) {
 if (!empMap.has(createdKey)) {
 empMap.set(createdKey, {
 id: createdKey,
 name: t.createdByName || t.createdByEmail || t.caller || createdKey,
 role:"—",
 email: t.createdByEmail ||"",
 assigned: 0,
 created: 0,
 resolved: 0,
 pending: 0,
 open: 0,
 breached: 0,
 totalResponseTimeMs: 0,
 responseCount: 0,
 });
 }
 empMap.get(createdKey).created++;
 }
 });

 return Array.from(empMap.values())
 .filter((e) => e.assigned > 0 || e.created > 0)
 .map((e) => ({
 ...e,
 resolutionPct: e.assigned > 0 ? Math.round((e.resolved / e.assigned) * 100) : 0,
 avgResponseTime: e.responseCount > 0 ? e.totalResponseTimeMs / e.responseCount : 0,
 avgResponseTimeFormatted: e.responseCount > 0
 ? (() => {
 const hrs = Math.floor(e.totalResponseTimeMs / e.responseCount / 3600000);
 const mins = Math.floor((e.totalResponseTimeMs / e.responseCount % 3600000) / 60000);
 return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
 })()
 :"—",
 }))
 .sort((a, b) => b.assigned - a.assigned);
 }, [filteredTickets, allUsers]);

 /* ═══ WORKLOAD ANALYTICS ═══ */

 // Ticket distribution among employees (top 8)
 const workloadDistribution = useMemo(() => {
 return employeeAnalytics
 .filter((e) => e.assigned > 0)
 .slice(0, 8)
 .map((e) => ({ name: e.name.split("")[0], value: e.assigned }));
 }, [employeeAnalytics]);

 // Team workload
 const teamWorkload = useMemo(() => {
 const counts: Record<string, { total: number; resolved: number; open: number }> = {};
 filteredTickets.forEach((t) => {
 const team = t.team || t.assignmentGroup ||"Unassigned";
 if (!counts[team]) counts[team] = { total: 0, resolved: 0, open: 0 };
 counts[team].total++;
 if (t.status ==="Resolved" || t.status ==="Closed") counts[team].resolved++;
 else if (!["Canceled"].includes(t.status ||"")) counts[team].open++;
 });

 return Object.entries(counts)
 .map(([name, data]) => ({ name, ...data }))
 .sort((a, b) => b.total - a.total)
 .slice(0, 10);
 }, [filteredTickets]);

 // Employee performance (top 6)
 const employeePerformance = useMemo(() => {
 return employeeAnalytics
 .filter((e) => e.assigned >= 1)
 .slice(0, 6)
 .map((e) => ({
 name: e.name.split("")[0],
"Resolution %": e.resolutionPct,
"Assigned": e.assigned,
"Resolved": e.resolved,
"Breached": e.breached,
 }));
 }, [employeeAnalytics]);

 /* ═══ CLEAR FILTERS ═══ */

 const clearFilters = useCallback(() => {
 setDateFrom("");
 setDateTo("");
 setCompanyFilter("all");
 setDepartmentFilter("all");
 setTeamFilter("all");
 setEmployeeFilter("all");
 setPriorityFilter("all");
 setCategoryFilter("all");
 setStatusFilter("all");
 }, []);

 const activeFilterCount = [
 dateFrom, dateTo,
 companyFilter !=="all" ? companyFilter :"",
 departmentFilter !=="all" ? departmentFilter :"",
 teamFilter !=="all" ? teamFilter :"",
 employeeFilter !=="all" ? employeeFilter :"",
 priorityFilter !=="all" ? priorityFilter :"",
 categoryFilter !=="all" ? categoryFilter :"",
 statusFilter !=="all" ? statusFilter :"",
 ].filter(Boolean).length;

 const SLA_PIE_COLORS = ["#81B532","#f59e0b","#ef4444"];

 /* ═══ LOADING STATE ═══ */

 if (loading) {
 return (
 <div className="flex items-center justify-center min-h-[60vh]">
 <div className="flex flex-col items-center gap-4">
 <div className="w-16 h-16 border-4 border-sn-green border-t-transparent rounded-full animate-spin" />
 <p className="text-muted-foreground font-medium animate-pulse">Loading analytics data...</p>
 </div>
 </div>
 );
 }

 /* ═══ RENDER ═══ */

 return (
 <div className="space-y-8 animate-in fade-in duration-500">
 {/* ─── Page Header ─── */}
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
 <div>
 <div className="flex items-center gap-3">
 <div className="p-3 rounded-2xl bg-gradient-to-br from-sn-green/20 to-emerald-500/10 border border-sn-green/20">
 <BarChart3 className="w-7 h-7 text-sn-green" />
 </div>
 <div>
 <h1 className="text-3xl font-semibold tracking-tight text-foreground">Data Analytics</h1>
 <p className="text-sm text-muted-foreground mt-0.5">
 Real-time insights · {filteredTickets.length.toLocaleString()} tickets
 {role !=="ultra_super_admin" && role !=="super_admin" && (
 <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-muted font-medium">
 {ROLE_LABELS[role]} view
 </span>
 )}
 </p>
 </div>
 </div>
 </div>

 <div className="flex items-center gap-2">
 <button
 onClick={() => setShowFilters(!showFilters)}
 className={cn(
"flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border",
 showFilters
 ?"bg-sn-green text-sn-dark border-sn-green shadow-lg shadow-sn-green/20"
 :"bg-card text-foreground border-border hover:border-sn-green/50"
 )}
 >
 <Filter className="w-4 h-4" />
 Filters
 {activeFilterCount > 0 && (
 <span className="bg-red-500 text-white text-[10px] font-semibold w-5 h-5 rounded-full flex items-center justify-center">
 {activeFilterCount}
 </span>
 )}
 {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
 </button>
 </div>
 </div>

 {/* ─── Filters Panel ─── */}
 {showFilters && (
 <div className="bg-card border border-border rounded-2xl p-6 shadow-sm animate-in slide-in-from-top-2 duration-300">
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
 <Filter className="w-4 h-4 text-sn-green" />
 Filter Analytics Data
 </h3>
 {activeFilterCount > 0 && (
 <button
 onClick={clearFilters}
 className="flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-600 transition-colors"
 >
 <X className="w-3.5 h-3.5" /> Clear All
 </button>
 )}
 </div>

 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
 {/* Date From */}
 <div>
 <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Date From</label>
 <input
 type="date"
 value={dateFrom}
 onChange={(e) => setDateFrom(e.target.value)}
 className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:ring-2 focus:ring-sn-green/30 focus:border-sn-green outline-none transition-all"
 />
 </div>

 {/* Date To */}
 <div>
 <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Date To</label>
 <input
 type="date"
 value={dateTo}
 onChange={(e) => setDateTo(e.target.value)}
 className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:ring-2 focus:ring-sn-green/30 focus:border-sn-green outline-none transition-all"
 />
 </div>

 {/* Company Filter */}
 {(role ==="ultra_super_admin" || role ==="super_admin") && filterOptions.companies.length > 0 && (
 <div>
 <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Company</label>
 <select
 value={companyFilter}
 onChange={(e) => setCompanyFilter(e.target.value)}
 className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:ring-2 focus:ring-sn-green/30 focus:border-sn-green outline-none transition-all"
 >
 <option value="all">All Companies</option>
 {filterOptions.companies.map((c) => (
 <option key={c} value={c}>{c}</option>
 ))}
 </select>
 </div>
 )}

 {/* Department Filter */}
 {filterOptions.departments.length > 0 && (
 <div>
 <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Department</label>
 <select
 value={departmentFilter}
 onChange={(e) => setDepartmentFilter(e.target.value)}
 className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:ring-2 focus:ring-sn-green/30 focus:border-sn-green outline-none transition-all"
 >
 <option value="all">All Departments</option>
 {filterOptions.departments.map((d) => (
 <option key={d} value={d}>{d}</option>
 ))}
 </select>
 </div>
 )}

 {/* Team Filter */}
 {filterOptions.teams.length > 0 && (
 <div>
 <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Team</label>
 <select
 value={teamFilter}
 onChange={(e) => setTeamFilter(e.target.value)}
 className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:ring-2 focus:ring-sn-green/30 focus:border-sn-green outline-none transition-all"
 >
 <option value="all">All Teams</option>
 {filterOptions.teams.map((t) => (
 <option key={t} value={t}>{t}</option>
 ))}
 </select>
 </div>
 )}

 {/* Employee Filter */}
 {filterOptions.employees.length > 0 && (
 <div>
 <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Employee</label>
 <select
 value={employeeFilter}
 onChange={(e) => setEmployeeFilter(e.target.value)}
 className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:ring-2 focus:ring-sn-green/30 focus:border-sn-green outline-none transition-all"
 >
 <option value="all">All Employees</option>
 {filterOptions.employees.map((e) => (
 <option key={e} value={e}>{e}</option>
 ))}
 </select>
 </div>
 )}

 {/* Priority Filter */}
 <div>
 <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Priority</label>
 <select
 value={priorityFilter}
 onChange={(e) => setPriorityFilter(e.target.value)}
 className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:ring-2 focus:ring-sn-green/30 focus:border-sn-green outline-none transition-all"
 >
 <option value="all">All Priorities</option>
 {filterOptions.priorities.map((p) => (
 <option key={p} value={p}>{p}</option>
 ))}
 </select>
 </div>

 {/* Category Filter */}
 {filterOptions.categories.length > 0 && (
 <div>
 <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Category</label>
 <select
 value={categoryFilter}
 onChange={(e) => setCategoryFilter(e.target.value)}
 className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:ring-2 focus:ring-sn-green/30 focus:border-sn-green outline-none transition-all"
 >
 <option value="all">All Categories</option>
 {filterOptions.categories.map((c) => (
 <option key={c} value={c}>{c}</option>
 ))}
 </select>
 </div>
 )}

 {/* Status Filter */}
 <div>
 <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Status</label>
 <select
 value={statusFilter}
 onChange={(e) => setStatusFilter(e.target.value)}
 className="w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:ring-2 focus:ring-sn-green/30 focus:border-sn-green outline-none transition-all"
 >
 <option value="all">All Statuses</option>
 {filterOptions.statuses.map((s) => (
 <option key={s} value={s}>{s}</option>
 ))}
 </select>
 </div>
 </div>
 </div>
 )}

 {/* ─── Summary Cards ─── */}
 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
 {CARD_CONFIGS.map((config) => (
 <SummaryCard
 key={config.key}
 config={config}
 count={(summaryData.current as any)[config.key]}
 previousCount={(summaryData.previous as any)[config.key]}
 />
 ))}
 </div>

 {/* ─── Tab Navigation ─── */}
 <div className="flex items-center gap-1 p-1.5 bg-muted/50 rounded-2xl w-fit border border-border">
 {[
 { key:"tickets" as const, label:"Ticket Analytics", icon: BarChart3 },
 { key:"employee" as const, label:"Employee Analytics", icon: Users },
 { key:"workload" as const, label:"Workload Analytics", icon: Activity },
 ].map((tab) => (
 <button
 key={tab.key}
 onClick={() => setActiveTab(tab.key)}
 className={cn(
"flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all",
 activeTab === tab.key
 ?"bg-card text-foreground shadow-sm border border-border"
 :"text-muted-foreground hover:text-foreground"
 )}
 >
 <tab.icon className="w-4 h-4" />
 {tab.label}
 </button>
 ))}
 </div>

 {/* ═══════════════════════════════════════════════════
 TICKET ANALYTICS TAB
 ═══════════════════════════════════════════════════ */}
 {activeTab ==="tickets" && (
 <div className="space-y-6 animate-in fade-in duration-300">
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* 1. Tickets Created Over Time */}
 <ChartCard title="Tickets Created Over Time" subtitle="Monthly trend over the last 12 months" className="lg:col-span-2">
 <div className="h-72">
 <ResponsiveContainer width="100%" height="100%">
 <AreaChart data={ticketsOverTimeData}>
 <defs>
 <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
 <stop offset="5%" stopColor="#81B532" stopOpacity={0.3} />
 <stop offset="95%" stopColor="#81B532" stopOpacity={0} />
 </linearGradient>
 </defs>
 <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
 <XAxis dataKey="name" fontSize={11} tick={{ fill:"hsl(var(--muted-foreground))" }} />
 <YAxis fontSize={11} tick={{ fill:"hsl(var(--muted-foreground))" }} />
 <Tooltip content={<CustomTooltip />} />
 <Area type="monotone" dataKey="count" name="Tickets" stroke="#81B532" strokeWidth={2.5} fill="url(#areaGradient)" dot={{ fill:"#81B532", r: 4, strokeWidth: 2, stroke:"#fff" }} activeDot={{ r: 6 }} />
 </AreaChart>
 </ResponsiveContainer>
 </div>
 </ChartCard>

 {/* 2. Open vs Closed vs Pending vs Resolved */}
 <ChartCard title="Status Comparison" subtitle="Open vs Pending vs Resolved vs Closed">
 <div className="h-72">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={statusComparisonData}>
 <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
 <XAxis dataKey="name" fontSize={11} tick={{ fill:"hsl(var(--muted-foreground))" }} />
 <YAxis fontSize={11} tick={{ fill:"hsl(var(--muted-foreground))" }} />
 <Tooltip content={<CustomTooltip />} />
 <Bar dataKey="count" name="Tickets" radius={[6, 6, 0, 0]}>
 {statusComparisonData.map((entry, i) => (
 <Cell key={i} fill={entry.fill} />
 ))}
 </Bar>
 </BarChart>
 </ResponsiveContainer>
 </div>
 </ChartCard>

 {/* 3. Tickets by Category */}
 <ChartCard title="Tickets by Category" subtitle="Distribution across ticket categories">
 <div className="h-72 flex items-center">
 <ResponsiveContainer width="100%" height="100%">
 <PieChart>
 <Pie
 data={categoryData.length > 0 ? categoryData : [{ name:"No Data", value: 1 }]}
 cx="50%"
 cy="50%"
 innerRadius={55}
 outerRadius={95}
 paddingAngle={3}
 dataKey="value"
 >
 {(categoryData.length > 0 ? categoryData : [{ name:"No Data", value: 1 }]).map((_, i) => (
 <Cell key={i} fill={categoryData.length > 0 ? CHART_COLORS[i % CHART_COLORS.length] :"#e2e8f0"} />
 ))}
 </Pie>
 <Tooltip content={<CustomTooltip />} />
 </PieChart>
 </ResponsiveContainer>
 </div>
 <div className="flex flex-wrap justify-center gap-3 mt-2">
 {categoryData.slice(0, 6).map((entry, i) => (
 <div key={entry.name} className="flex items-center gap-1.5">
 <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
 <span className="text-[10px] font-medium text-muted-foreground">{entry.name}</span>
 </div>
 ))}
 </div>
 </ChartCard>

 {/* 4. Tickets by Priority */}
 <ChartCard title="Tickets by Priority" subtitle="Breakdown by priority level">
 <div className="h-72">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={priorityData} layout="vertical">
 <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
 <XAxis type="number" fontSize={11} tick={{ fill:"hsl(var(--muted-foreground))" }} />
 <YAxis type="category" dataKey="name" fontSize={10} width={90} tick={{ fill:"hsl(var(--muted-foreground))" }} />
 <Tooltip content={<CustomTooltip />} />
 <Bar dataKey="count" name="Tickets" radius={[0, 6, 6, 0]}>
 {priorityData.map((entry, i) => (
 <Cell key={i} fill={entry.fill} />
 ))}
 </Bar>
 </BarChart>
 </ResponsiveContainer>
 </div>
 </ChartCard>

 {/* 5. Tickets by Department */}
 <ChartCard title="Tickets by Department" subtitle="Distribution across departments">
 <div className="h-72">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={departmentData}>
 <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
 <XAxis dataKey="name" fontSize={9} interval={0} angle={-30} textAnchor="end" height={60} tick={{ fill:"hsl(var(--muted-foreground))" }} />
 <YAxis fontSize={11} tick={{ fill:"hsl(var(--muted-foreground))" }} />
 <Tooltip content={<CustomTooltip />} />
 <Bar dataKey="count" name="Tickets" fill="#3b82f6" radius={[6, 6, 0, 0]} />
 </BarChart>
 </ResponsiveContainer>
 </div>
 </ChartCard>

 {/* 6. Tickets by Employee */}
 <ChartCard title="Tickets by Employee" subtitle="Top assignees by ticket count">
 <div className="h-72">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={employeeTicketData}>
 <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
 <XAxis dataKey="name" fontSize={9} interval={0} angle={-30} textAnchor="end" height={60} tick={{ fill:"hsl(var(--muted-foreground))" }} />
 <YAxis fontSize={11} tick={{ fill:"hsl(var(--muted-foreground))" }} />
 <Tooltip content={<CustomTooltip />} />
 <Bar dataKey="count" name="Tickets" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
 </BarChart>
 </ResponsiveContainer>
 </div>
 </ChartCard>

 {/* 7. Ticket Aging Analysis */}
 <ChartCard title="Ticket Aging Analysis" subtitle="Open tickets by age bucket">
 <div className="h-72">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={agingData}>
 <defs>
 <linearGradient id="agingGrad" x1="0" y1="0" x2="0" y2="1">
 <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.9} />
 <stop offset="95%" stopColor="#ef4444" stopOpacity={0.9} />
 </linearGradient>
 </defs>
 <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
 <XAxis dataKey="name" fontSize={10} tick={{ fill:"hsl(var(--muted-foreground))" }} />
 <YAxis fontSize={11} tick={{ fill:"hsl(var(--muted-foreground))" }} />
 <Tooltip content={<CustomTooltip />} />
 <Bar dataKey="count" name="Tickets" fill="url(#agingGrad)" radius={[6, 6, 0, 0]} />
 </BarChart>
 </ResponsiveContainer>
 </div>
 </ChartCard>

 {/* 8. SLA Breach Analysis */}
 <ChartCard title="SLA Breach Analysis" subtitle="SLA compliance overview">
 <div className="h-72 relative">
 <ResponsiveContainer width="100%" height="100%">
 <PieChart>
 <Pie
 data={slaBreachData.some((d) => d.value > 0) ? slaBreachData : [{ name:"No Data", value: 1 }]}
 cx="50%"
 cy="50%"
 innerRadius={65}
 outerRadius={95}
 paddingAngle={3}
 dataKey="value"
 startAngle={90}
 endAngle={-270}
 >
 {(slaBreachData.some((d) => d.value > 0) ? slaBreachData : [{ name:"No Data", value: 1 }]).map((_, i) => (
 <Cell key={i} fill={slaBreachData.some((d) => d.value > 0) ? SLA_PIE_COLORS[i % SLA_PIE_COLORS.length] :"#e2e8f0"} />
 ))}
 </Pie>
 <Tooltip content={<CustomTooltip />} />
 </PieChart>
 </ResponsiveContainer>
 {/* Center label */}
 <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
 <span className="text-3xl font-semibold text-foreground">
 {(() => {
 const total = slaBreachData.reduce((s, d) => s + d.value, 0);
 return total > 0 ? Math.round((slaBreachData[0]?.value / total) * 100) : 0;
 })()}%
 </span>
 <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Compliance</span>
 </div>
 </div>
 <div className="flex justify-center gap-5 mt-2">
 {slaBreachData.map((entry, i) => (
 <div key={entry.name} className="flex items-center gap-1.5">
 <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SLA_PIE_COLORS[i] }} />
 <span className="text-xs font-medium text-muted-foreground">
 {entry.name}: <strong className="text-foreground">{entry.value}</strong>
 </span>
 </div>
 ))}
 </div>
 </ChartCard>

 {/* 9. Escalation Analysis */}
 <ChartCard title="Escalation Analysis" subtitle="Escalated vs non-escalated tickets over time">
 <div className="h-72">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={escalationData}>
 <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
 <XAxis dataKey="name" fontSize={11} tick={{ fill:"hsl(var(--muted-foreground))" }} />
 <YAxis fontSize={11} tick={{ fill:"hsl(var(--muted-foreground))" }} />
 <Tooltip content={<CustomTooltip />} />
 <Legend wrapperStyle={{ fontSize:"11px" }} />
 <Bar dataKey="Escalated" fill="#ef4444" radius={[4, 4, 0, 0]} stackId="stack" />
 <Bar dataKey="Non-Escalated" fill="#81B532" radius={[4, 4, 0, 0]} stackId="stack" />
 </BarChart>
 </ResponsiveContainer>
 </div>
 </ChartCard>

 {/* 10. Resolution Trend */}
 <ChartCard title="Resolution Trend" subtitle="Monthly resolution rate and volume" className="lg:col-span-2">
 <div className="h-72">
 <ResponsiveContainer width="100%" height="100%">
 <LineChart data={resolutionTrendData}>
 <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
 <XAxis dataKey="name" fontSize={11} tick={{ fill:"hsl(var(--muted-foreground))" }} />
 <YAxis yAxisId="left" fontSize={11} tick={{ fill:"hsl(var(--muted-foreground))" }} />
 <YAxis yAxisId="right" orientation="right" fontSize={11} tick={{ fill:"hsl(var(--muted-foreground))" }} unit="%" />
 <Tooltip content={<CustomTooltip />} />
 <Legend wrapperStyle={{ fontSize:"11px" }} />
 <Line yAxisId="left" type="monotone" dataKey="Created" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
 <Line yAxisId="left" type="monotone" dataKey="Resolved" stroke="#81B532" strokeWidth={2} dot={{ r: 3 }} />
 <Line yAxisId="right" type="monotone" dataKey="Resolution Rate" stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="5 5" dot={{ r: 3 }} />
 </LineChart>
 </ResponsiveContainer>
 </div>
 </ChartCard>
 </div>
 </div>
 )}

 {/* ═══════════════════════════════════════════════════
 EMPLOYEE ANALYTICS TAB
 ═══════════════════════════════════════════════════ */}
 {activeTab ==="employee" && (
 <div className="animate-in fade-in duration-300">
 <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
 <div className="px-6 py-4 border-b border-border bg-gradient-to-r from-muted/30 to-transparent">
 <h3 className="text-base font-bold text-foreground flex items-center gap-2">
 <Users className="w-5 h-5 text-sn-green" />
 Employee Performance Analytics
 </h3>
 <p className="text-xs text-muted-foreground mt-0.5">{employeeAnalytics.length} employees with ticket activity</p>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full min-w-[1100px]">
 <thead>
 <tr className="border-b border-border bg-muted/20 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
 <th className="px-5 py-3.5 text-left">Employee</th>
 <th className="px-3 py-3.5 text-left">Role</th>
 <th className="px-3 py-3.5 text-center">Assigned</th>
 <th className="px-3 py-3.5 text-center">Created</th>
 <th className="px-3 py-3.5 text-center">Resolved</th>
 <th className="px-3 py-3.5 text-center">Pending</th>
 <th className="px-3 py-3.5 text-center">Open</th>
 <th className="px-3 py-3.5 text-center">Breached</th>
 <th className="px-3 py-3.5 text-center">Resolution %</th>
 <th className="px-3 py-3.5 text-center">Avg Response</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {employeeAnalytics.length === 0 ? (
 <tr>
 <td colSpan={10} className="px-5 py-12 text-center text-muted-foreground">
 No employee data available.
 </td>
 </tr>
 ) : (
 employeeAnalytics.map((emp, idx) => (
 <tr key={emp.id} className="hover:bg-muted/5 transition-colors group">
 <td className="px-5 py-3.5">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sn-green/30 to-emerald-500/20 flex items-center justify-center text-xs font-semibold text-sn-green border border-sn-green/20">
 {emp.name.charAt(0).toUpperCase()}
 </div>
 <div>
 <div className="text-sm font-bold text-foreground">{emp.name}</div>
 {emp.email && <div className="text-[10px] text-muted-foreground">{emp.email}</div>}
 </div>
 </div>
 </td>
 <td className="px-3 py-3.5">
 <span className="text-xs font-medium text-muted-foreground">{emp.role}</span>
 </td>
 <td className="px-3 py-3.5 text-center">
 <span className="text-sm font-bold tabular-nums">{emp.assigned}</span>
 </td>
 <td className="px-3 py-3.5 text-center">
 <span className="text-sm font-bold tabular-nums">{emp.created}</span>
 </td>
 <td className="px-3 py-3.5 text-center">
 <span className="text-sm font-bold tabular-nums text-green-600">{emp.resolved}</span>
 </td>
 <td className="px-3 py-3.5 text-center">
 <span className="text-sm font-bold tabular-nums text-amber-600">{emp.pending}</span>
 </td>
 <td className="px-3 py-3.5 text-center">
 <span className="text-sm font-bold tabular-nums text-blue-600">{emp.open}</span>
 </td>
 <td className="px-3 py-3.5 text-center">
 <span className={cn("text-sm font-bold tabular-nums", emp.breached > 0 ?"text-red-600" :"text-muted-foreground")}>
 {emp.breached}
 </span>
 </td>
 <td className="px-3 py-3.5 text-center">
 <div className="flex flex-col items-center gap-1">
 <span className={cn(
"text-sm font-semibold tabular-nums",
 emp.resolutionPct >= 80 ?"text-green-600" : emp.resolutionPct >= 50 ?"text-amber-600" :"text-red-600"
 )}>
 {emp.resolutionPct}%
 </span>
 <div className="w-14 h-1.5 bg-muted rounded-full overflow-hidden">
 <div
 className={cn(
"h-full rounded-full transition-all duration-500",
 emp.resolutionPct >= 80 ?"bg-green-500" : emp.resolutionPct >= 50 ?"bg-amber-500" :"bg-red-500"
 )}
 style={{ width: `${emp.resolutionPct}%` }}
 />
 </div>
 </div>
 </td>
 <td className="px-3 py-3.5 text-center">
 <span className="text-xs font-bold text-muted-foreground">{emp.avgResponseTimeFormatted}</span>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 )}

 {/* ═══════════════════════════════════════════════════
 WORKLOAD ANALYTICS TAB
 ═══════════════════════════════════════════════════ */}
 {activeTab ==="workload" && (
 <div className="space-y-6 animate-in fade-in duration-300">
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Employee Ticket Distribution */}
 <ChartCard title="Ticket Distribution Among Employees" subtitle="Top assignees by open workload">
 <div className="h-80">
 <ResponsiveContainer width="100%" height="100%">
 <PieChart>
 <Pie
 data={workloadDistribution.length > 0 ? workloadDistribution : [{ name:"No Data", value: 1 }]}
 cx="50%"
 cy="50%"
 innerRadius={50}
 outerRadius={100}
 paddingAngle={3}
 dataKey="value"
 >
 {(workloadDistribution.length > 0 ? workloadDistribution : [{ name:"No Data", value: 1 }]).map((_, i) => (
 <Cell key={i} fill={workloadDistribution.length > 0 ? CHART_COLORS[i % CHART_COLORS.length] :"#e2e8f0"} />
 ))}
 </Pie>
 <Tooltip content={<CustomTooltip />} />
 <Legend wrapperStyle={{ fontSize:"11px" }} />
 </PieChart>
 </ResponsiveContainer>
 </div>
 </ChartCard>

 {/* Team Workload Distribution */}
 <ChartCard title="Team Workload Distribution" subtitle="Total, resolved, and open tickets per team">
 <div className="h-80">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={teamWorkload}>
 <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
 <XAxis dataKey="name" fontSize={9} interval={0} angle={-25} textAnchor="end" height={55} tick={{ fill:"hsl(var(--muted-foreground))" }} />
 <YAxis fontSize={11} tick={{ fill:"hsl(var(--muted-foreground))" }} />
 <Tooltip content={<CustomTooltip />} />
 <Legend wrapperStyle={{ fontSize:"11px" }} />
 <Bar dataKey="resolved" name="Resolved" fill="#81B532" radius={[4, 4, 0, 0]} stackId="workload" />
 <Bar dataKey="open" name="Open" fill="#3b82f6" radius={[4, 4, 0, 0]} stackId="workload" />
 </BarChart>
 </ResponsiveContainer>
 </div>
 </ChartCard>

 {/* Employee Performance Chart */}
 <ChartCard title="Employee Performance Chart" subtitle="Resolution rate and workload comparison" className="lg:col-span-2">
 <div className="h-80">
 <ResponsiveContainer width="100%" height="100%">
 <ComposedChart data={employeePerformance} barGap={4}>
 <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
 <XAxis dataKey="name" fontSize={11} tick={{ fill:"hsl(var(--muted-foreground))" }} />
 <YAxis yAxisId="left" fontSize={11} tick={{ fill:"hsl(var(--muted-foreground))" }} />
 <YAxis yAxisId="right" orientation="right" fontSize={11} tick={{ fill:"hsl(var(--muted-foreground))" }} unit="%" />
 <Tooltip content={<CustomTooltip />} />
 <Legend wrapperStyle={{ fontSize:"11px" }} />
 <Bar yAxisId="left" dataKey="Assigned" fill="#3b82f6" radius={[4, 4, 0, 0]} />
 <Bar yAxisId="left" dataKey="Resolved" fill="#81B532" radius={[4, 4, 0, 0]} />
 <Bar yAxisId="left" dataKey="Breached" fill="#ef4444" radius={[4, 4, 0, 0]} />
 <Line yAxisId="right" type="monotone" dataKey="Resolution %" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4, fill:"#f59e0b" }} />
 </ComposedChart>
 </ResponsiveContainer>
 </div>
 </ChartCard>
 </div>
 </div>
 )}
 </div>
 );
}

export default DataAnalytics;
