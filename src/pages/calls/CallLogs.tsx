import React, { useEffect, useState } from"react";
import { Link } from"react-router-dom";
import { useAuth } from"../../contexts/AuthContext";
import {
 Phone,
 PhoneIncoming,
 PhoneOutgoing,
 Search,
 Plus,
 Trash2,
 Eye,
 Ticket,
 BarChart3,
 Clock,
 User,
 CheckCircle2,
 X,
 PhoneCall,
 Calendar,
 AlertTriangle
} from"lucide-react";
import { cn } from"@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from"recharts";

const PRIORITY_COLORS: Record<string, string> = {
"1 - Critical":"bg-red-500/10 text-red-500 border border-red-500/20",
"2 - High":"bg-orange-500/10 text-orange-500 border border-orange-500/20",
"3 - Moderate":"bg-blue-500/10 text-blue-500 border border-blue-500/20",
"4 - Low":"bg-green-500/10 text-green-500 border border-green-500/20",
};

const STATUS_COLORS: Record<string, string> = {
"New":"bg-blue-500/10 text-blue-500 border border-blue-500/20",
"Open":"bg-sky-500/10 text-sky-500 border border-sky-500/20",
"In Progress":"bg-amber-500/10 text-amber-500 border border-amber-500/20",
"On Hold":"bg-purple-500/10 text-purple-500 border border-purple-500/20",
"Resolved":"bg-green-500/10 text-green-500 border border-green-500/20",
"Closed":"bg-slate-500/10 text-slate-500 border border-slate-500/20",
};

export function CallLogs() {
 const { profile } = useAuth();
 const [calls, setCalls] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [activeTab, setActiveTab] = useState<"logs" |"reports">("logs");

 // Filtering & Sorting State
 const [search, setSearch] = useState("");
 const [filterType, setFilterType] = useState("");
 const [filterStatus, setFilterStatus] = useState("");
 const [filterPriority, setFilterPriority] = useState("");
 const [sortField, setSortField] = useState("callDateTime");
 const [sortOrder, setSortOrder] = useState<"asc" |"desc">("desc");

 // Pagination State
 const [currentPage, setCurrentPage] = useState(1);
 const itemsPerPage = 10;

 // Reporting State
 const [reportsData, setReportsData] = useState<any>({
 totalCalls: 0,
 incomingCalls: 0,
 outgoingCalls: 0,
 convertedToTickets: 0,
 callsByStatus: {},
 callsByAgent: {},
 });

 const isAgentOrAdmin = ["agent","admin","super_admin","ultra_super_admin","sub_admin"].includes(profile?.role ||"");

 const fetchCalls = async () => {
 setLoading(true);
 try {
 const params = new URLSearchParams();
 if (search) params.append("search", search);
 if (filterStatus) params.append("status", filterStatus);
 if (filterType) params.append("callType", filterType);
 if (filterPriority) params.append("priority", filterPriority);

 const res = await fetch(`/api/calls?${params.toString()}`);
 if (res.ok) {
 const data = await res.json();
 setCalls(data);
 }
 } catch (err) {
 console.error("Failed to fetch calls:", err);
 } finally {
 setLoading(false);
 }
 };

 const fetchReports = async () => {
 try {
 const res = await fetch("/api/calls/reports");
 if (res.ok) {
 const data = await res.json();
 setReportsData(data);
 }
 } catch (err) {
 console.error("Failed to fetch reports:", err);
 }
 };

 useEffect(() => {
 fetchCalls();
 fetchReports();
 }, [search, filterType, filterStatus, filterPriority]);

 const handleDelete = async (id: number) => {
 if (!window.confirm("Are you sure you want to delete this call log?")) return;
 try {
 const res = await fetch(`/api/calls/${id}`, { method:"DELETE" });
 if (res.ok) {
 fetchCalls();
 fetchReports();
 }
 } catch (err) {
 console.error("Failed to delete call:", err);
 }
 };

 // Sorting logic
 const handleSort = (field: string) => {
 if (sortField === field) {
 setSortOrder(sortOrder ==="asc" ?"desc" :"asc");
 } else {
 setSortField(field);
 setSortOrder("desc");
 }
 };

 const sortedCalls = [...calls].sort((a, b) => {
 let aVal = a[sortField];
 let bVal = b[sortField];

 if (aVal === null || aVal === undefined) return sortOrder ==="asc" ? -1 : 1;
 if (bVal === null || bVal === undefined) return sortOrder ==="asc" ? 1 : -1;

 if (typeof aVal ==="string") {
 return sortOrder ==="asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
 } else {
 return sortOrder ==="asc" ? (aVal > bVal ? 1 : -1) : (bVal > aVal ? 1 : -1);
 }
 });

 // Pagination logic
 const totalPages = Math.ceil(sortedCalls.length / itemsPerPage);
 const paginatedCalls = sortedCalls.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

 const handlePageChange = (page: number) => {
 if (page >= 1 && page <= totalPages) {
 setCurrentPage(page);
 }
 };

 // Recharts Chart Formats
 const statusChartData = Object.entries(reportsData.callsByStatus || {}).map(([name, value]) => ({
 name,
 value,
 }));

 const agentChartData = Object.entries(reportsData.callsByAgent || {}).map(([name, value]) => ({
 name,
 calls: value,
 }));

 const typeChartData = [
 { name:"Incoming", value: reportsData.incomingCalls || 0, color:"#3b82f6" },
 { name:"Outgoing", value: reportsData.outgoingCalls || 0, color:"#10b981" },
 ];

 const COLORS = ["#3b82f6","#10b981","#f59e0b","#8b5cf6","#10b981","#64748b"];

 return (
 <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 animate-in fade-in duration-300">
 {/* Header */}
 <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-white/10 gap-4">
 <div className="flex items-center gap-3.5">
 <div className="w-11 h-11 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/5">
 <PhoneCall className="w-5 h-5 text-blue-500" />
 </div>
 <div>
 <h1 className="text-xl md:text-2xl font-semibold text-slate-800 dark:text-white uppercase tracking-wider">
 Call Management
 </h1>
 <p className="text-xs text-slate-500 dark:text-slate-400">
 Log, track, and resolve telephone support logs
 </p>
 </div>
 </div>
 <div className="flex items-center gap-3">
 <Link
 to="/calls/new"
 className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2.5 text-xs font-bold shadow-lg shadow-blue-500/15 hover:shadow-blue-500/30 transition-all cursor-pointer"
 >
 <Plus className="w-4 h-4" /> Log Call
 </Link>
 </div>
 </div>

 {/* Tabs */}
 <div className="flex border-b border-white/10 space-x-6">
 <button
 onClick={() => setActiveTab("logs")}
 className={cn(
"pb-3 text-xs uppercase font-semibold tracking-widest outline-none border-b-2 cursor-pointer transition-all",
 activeTab ==="logs"
 ?"border-blue-500 text-blue-500 font-bold"
 :"border-transparent text-slate-400 hover:text-white"
 )}
 >
 Call Logs
 </button>
 <button
 onClick={() => setActiveTab("reports")}
 className={cn(
"pb-3 text-xs uppercase font-semibold tracking-widest outline-none border-b-2 cursor-pointer transition-all",
 activeTab ==="reports"
 ?"border-blue-500 text-blue-500 font-bold"
 :"border-transparent text-slate-400 hover:text-white"
 )}
 >
 Analytics & Reports
 </button>
 </div>

 {activeTab ==="logs" ? (
 <>
 {/* Stats Bar */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
 <div className="bg-white dark:bg-[#1A2332] border border-slate-200 dark:border-[#2D3B55] rounded-2xl p-4 md:p-5 flex items-center gap-4 shadow-sm">
 <Phone className="w-9 h-9 text-blue-500 opacity-80" />
 <div>
 <div className="text-2xl md:text-3xl font-semibold text-slate-800 dark:text-white">
 {reportsData.totalCalls}
 </div>
 <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
 Total Calls
 </div>
 </div>
 </div>

 <div className="bg-white dark:bg-[#1A2332] border border-slate-200 dark:border-[#2D3B55] rounded-2xl p-4 md:p-5 flex items-center gap-4 shadow-sm">
 <PhoneIncoming className="w-9 h-9 text-green-500 opacity-80" />
 <div>
 <div className="text-2xl md:text-3xl font-semibold text-slate-800 dark:text-white">
 {reportsData.incomingCalls}
 </div>
 <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
 Incoming Calls
 </div>
 </div>
 </div>

 <div className="bg-white dark:bg-[#1A2332] border border-slate-200 dark:border-[#2D3B55] rounded-2xl p-4 md:p-5 flex items-center gap-4 shadow-sm">
 <PhoneOutgoing className="w-9 h-9 text-amber-500 opacity-80" />
 <div>
 <div className="text-2xl md:text-3xl font-semibold text-slate-800 dark:text-white">
 {reportsData.outgoingCalls}
 </div>
 <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
 Outgoing Calls
 </div>
 </div>
 </div>

 <div className="bg-white dark:bg-[#1A2332] border border-slate-200 dark:border-[#2D3B55] rounded-2xl p-4 md:p-5 flex items-center gap-4 shadow-sm">
 <Ticket className="w-9 h-9 text-violet-500 opacity-80" />
 <div>
 <div className="text-2xl md:text-3xl font-semibold text-slate-800 dark:text-white">
 {reportsData.convertedToTickets}
 </div>
 <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
 Converted to Tickets
 </div>
 </div>
 </div>
 </div>

 {/* Filters */}
 <div className="flex flex-col md:flex-row items-center gap-3 flex-wrap">
 <div className="relative w-full md:w-64">
 <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
 <input
 type="text"
 placeholder="Search caller, phone, subject..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-[#2D3B55] rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#111827] text-slate-800 dark:text-white transition-all"
 />
 </div>

 <select
 value={filterType}
 onChange={(e) => setFilterType(e.target.value)}
 className="w-full md:w-auto p-2 border border-slate-200 dark:border-[#2D3B55] rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#111827] text-slate-800 dark:text-white"
 >
 <option value="">All Call Types</option>
 <option value="Incoming">Incoming</option>
 <option value="Outgoing">Outgoing</option>
 </select>

 <select
 value={filterStatus}
 onChange={(e) => setFilterStatus(e.target.value)}
 className="w-full md:w-auto p-2 border border-slate-200 dark:border-[#2D3B55] rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#111827] text-slate-800 dark:text-white"
 >
 <option value="">All Statuses</option>
 <option value="New">New</option>
 <option value="Open">Open</option>
 <option value="In Progress">In Progress</option>
 <option value="On Hold">On Hold</option>
 <option value="Resolved">Resolved</option>
 <option value="Closed">Closed</option>
 </select>

 <select
 value={filterPriority}
 onChange={(e) => setFilterPriority(e.target.value)}
 className="w-full md:w-auto p-2 border border-slate-200 dark:border-[#2D3B55] rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#111827] text-slate-800 dark:text-white"
 >
 <option value="">All Priorities</option>
 <option value="1 - Critical">Critical</option>
 <option value="2 - High">High</option>
 <option value="3 - Moderate">Moderate</option>
 <option value="4 - Low">Low</option>
 </select>

 {(search || filterType || filterStatus || filterPriority) && (
 <button
 onClick={() => {
 setSearch("");
 setFilterType("");
 setFilterStatus("");
 setFilterPriority("");
 }}
 className="w-full md:w-auto px-4 py-2 text-xs border border-slate-200 dark:border-[#2D3B55] rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer transition-colors"
 >
 Clear Filters
 </button>
 )}

 <span className="text-xs text-slate-500 dark:text-slate-400 md:ml-auto">
 Showing {sortedCalls.length} logs
 </span>
 </div>

 {/* Table */}
 <div className="bg-white dark:bg-[#1A2332] border border-slate-200 dark:border-[#2D3B55] rounded-2xl shadow-sm overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-left">
 <thead>
 <tr className="bg-slate-50 dark:bg-[#111827]/40 border-b border-slate-200 dark:border-[#2D3B55] text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
 <th className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5" onClick={() => handleSort("id")}>
 Call ID
 </th>
 <th className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5" onClick={() => handleSort("callerName")}>
 Caller Name
 </th>
 <th className="p-4">Phone Number</th>
 <th className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5" onClick={() => handleSort("callType")}>
 Type
 </th>
 <th className="p-4">Subject</th>
 <th className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5" onClick={() => handleSort("callDateTime")}>
 Date & Time
 </th>
 <th className="p-4">Agent</th>
 <th className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5" onClick={() => handleSort("status")}>
 Status
 </th>
 <th className="p-4">Ticket</th>
 <th className="p-4 text-center">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-200 dark:divide-[#2D3B55]">
 {loading ? (
 <tr>
 <td colSpan={10} className="p-8 text-center text-slate-500 dark:text-slate-400">
 <div className="flex items-center justify-center gap-2">
 <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
 Loading call logs...
 </div>
 </td>
 </tr>
 ) : paginatedCalls.length === 0 ? (
 <tr>
 <td colSpan={10} className="p-12 text-center">
 <Phone className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
 <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold">No call logs found</p>
 <p className="text-xs text-slate-400 mt-1">Try resetting the filters or create a new call record.</p>
 </td>
 </tr>
 ) : (
 paginatedCalls.map((call) => (
 <tr key={call.id} className="hover:bg-blue-50/20 dark:hover:bg-blue-500/5 transition-colors">
 <td className="p-4 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
 CALL-{String(call.id).padStart(5,"0")}
 </td>
 <td className="p-4 text-xs font-semibold text-slate-800 dark:text-white">
 {call.callerName}
 </td>
 <td className="p-4 text-xs text-slate-500 dark:text-slate-400">
 {call.phoneNumber}
 </td>
 <td className="p-4">
 <span
 className={cn(
"inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border",
 call.callType ==="Incoming"
 ?"bg-green-500/10 text-green-500 border-green-500/20"
 :"bg-sky-500/10 text-sky-500 border-sky-500/20"
 )}
 >
 {call.callType ==="Incoming" ? <PhoneIncoming className="w-2.5 h-2.5" /> : <PhoneOutgoing className="w-2.5 h-2.5" />}
 {call.callType}
 </span>
 </td>
 <td className="p-4 text-xs max-w-[150px] truncate text-slate-700 dark:text-slate-300" title={call.subject}>
 {call.subject}
 </td>
 <td className="p-4 text-xs text-slate-500 dark:text-slate-400">
 <div className="flex items-center gap-1.5">
 <Clock className="w-3 h-3 text-slate-400" />
 {new Date(call.callDateTime).toLocaleString()}
 </div>
 </td>
 <td className="p-4 text-xs text-slate-500 dark:text-slate-400">
 <div className="flex items-center gap-1.5">
 <User className="w-3 h-3 text-slate-400" />
 {call.agentName ||"Unassigned"}
 </div>
 </td>
 <td className="p-4">
 <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider", STATUS_COLORS[call.status] ||"bg-slate-100 text-slate-700")}>
 {call.status}
 </span>
 </td>
 <td className="p-4">
 {call.linkedTicketId ? (
 <Link
 to={`/tickets/${call.linkedTicketId}`}
 className="inline-flex items-center gap-1 text-[10px] font-bold text-violet-500 hover:underline"
 >
 <Ticket className="w-3 h-3" />
 View Ticket
 </Link>
 ) : (
 <span className="text-[10px] text-slate-400 italic">None</span>
 )}
 </td>
 <td className="p-4 text-center">
 <div className="flex items-center justify-center gap-2">
 <Link
 to={`/calls/${call.id}`}
 className="inline-flex items-center justify-center w-7.5 h-7.5 border border-slate-200 dark:border-[#2D3B55] hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-all"
 title="View Call Details"
 >
 <Eye className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
 </Link>
 {isAgentOrAdmin && (
 <button
 onClick={() => handleDelete(call.id)}
 className="inline-flex items-center justify-center w-7.5 h-7.5 border border-red-500/10 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
 title="Delete Call Log"
 >
 <Trash2 className="w-3.5 h-3.5 text-red-500" />
 </button>
 )}
 </div>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>

 {/* Pagination */}
 {totalPages > 1 && (
 <div className="px-4 py-3 bg-slate-50 dark:bg-[#111827]/30 border-t border-slate-200 dark:border-[#2D3B55] flex items-center justify-between">
 <span className="text-xs text-slate-500 dark:text-slate-400">
 Page {currentPage} of {totalPages}
 </span>
 <div className="flex gap-1">
 <button
 onClick={() => handlePageChange(currentPage - 1)}
 disabled={currentPage === 1}
 className="px-3 py-1.5 border border-slate-200 dark:border-[#2D3B55] rounded-xl text-xs bg-white dark:bg-[#1A2332] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer disabled:opacity-50 transition-all font-semibold"
 >
 Prev
 </button>
 <button
 onClick={() => handlePageChange(currentPage + 1)}
 disabled={currentPage === totalPages}
 className="px-3 py-1.5 border border-slate-200 dark:border-[#2D3B55] rounded-xl text-xs bg-white dark:bg-[#1A2332] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer disabled:opacity-50 transition-all font-semibold"
 >
 Next
 </button>
 </div>
 </div>
 )}
 </div>
 </>
 ) : (
 /* Analytics Tab */
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {/* Call Volume split */}
 <div className="bg-white dark:bg-[#1A2332] border border-slate-200 dark:border-[#2D3B55] rounded-2xl p-5 shadow-sm">
 <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-1.5">
 <PhoneCall className="w-4 h-4 text-blue-500" /> Call Type Split
 </h3>
 <div className="h-56 flex items-center justify-center">
 {reportsData.totalCalls > 0 ? (
 <ResponsiveContainer width="100%" height="100%">
 <PieChart>
 <Pie
 data={typeChartData}
 cx="50%"
 cy="50%"
 innerRadius={60}
 outerRadius={80}
 paddingAngle={4}
 dataKey="value"
 >
 {typeChartData.map((entry, index) => (
 <Cell key={`cell-${index}`} fill={entry.color} />
 ))}
 </Pie>
 <Tooltip formatter={(v: any) => [v,"Calls"]} contentStyle={{ fontSize: 11, borderRadius: 8, border:"none" }} />
 <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11 }} />
 </PieChart>
 </ResponsiveContainer>
 ) : (
 <span className="text-xs text-slate-400 italic">No call volume data to display</span>
 )}
 </div>
 </div>

 {/* Calls by Status */}
 <div className="bg-white dark:bg-[#1A2332] border border-slate-200 dark:border-[#2D3B55] rounded-2xl p-5 shadow-sm">
 <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-1.5">
 <CheckCircle2 className="w-4 h-4 text-green-500" /> Calls by Status
 </h3>
 <div className="h-56 flex items-center justify-center">
 {statusChartData.length > 0 ? (
 <ResponsiveContainer width="100%" height="100%">
 <PieChart>
 <Pie
 data={statusChartData}
 cx="50%"
 cy="50%"
 outerRadius={80}
 labelLine={false}
 label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
 dataKey="value"
 >
 {statusChartData.map((entry, index) => (
 <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
 ))}
 </Pie>
 <Tooltip formatter={(v: any) => [v,"Calls"]} contentStyle={{ fontSize: 11, borderRadius: 8, border:"none" }} />
 </PieChart>
 </ResponsiveContainer>
 ) : (
 <span className="text-xs text-slate-400 italic">No status distribution data</span>
 )}
 </div>
 </div>

 {/* Calls by Agent */}
 <div className="bg-white dark:bg-[#1A2332] border border-slate-200 dark:border-[#2D3B55] rounded-2xl p-5 shadow-sm md:col-span-2">
 <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-1.5">
 <User className="w-4 h-4 text-blue-500" /> Calls Managed by Agent
 </h3>
 <div className="h-64">
 {agentChartData.length > 0 ? (
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={agentChartData} margin={{ left: 0, right: 10, top: 10, bottom: 20 }}>
 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
 <XAxis dataKey="name" fontSize={10} tickLine={false} />
 <YAxis fontSize={10} allowDecimals={false} tickLine={false} />
 <Tooltip formatter={(v: any) => [v,"Calls Logged"]} contentStyle={{ fontSize: 11, borderRadius: 8, border:"none" }} />
 <Bar dataKey="calls" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={32} />
 </BarChart>
 </ResponsiveContainer>
 ) : (
 <div className="h-full flex items-center justify-center">
 <span className="text-xs text-slate-400 italic">No agent performance data to display</span>
 </div>
 )}
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
