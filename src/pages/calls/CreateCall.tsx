import React, { useState, useEffect } from"react";
import { useNavigate } from"react-router-dom";
import { useAuth } from"../../contexts/AuthContext";
import {
 PhoneCall,
 ArrowLeft,
 AlertCircle,
 Clock,
 User,
 Phone,
 Mail,
 Building,
 FileText,
 Save,
 CheckCircle2
} from"lucide-react";
import { cn } from"@/lib/utils";

export function CreateCall() {
 const { user, profile } = useAuth();
 const navigate = useNavigate();

 // Form State
 const [callerName, setCallerName] = useState("");
 const [phoneNumber, setPhoneNumber] = useState("");
 const [email, setEmail] = useState("");
 const [department, setDepartment] = useState("");
 const [subject, setSubject] = useState("");
 const [description, setDescription] = useState("");
 const [callType, setCallType] = useState("Incoming");
 const [priority, setPriority] = useState("3 - Moderate");
 const [status, setStatus] = useState("New");
 const [agentUid, setAgentUid] = useState("");
 
 // Format current local date-time as YYYY-MM-DDTHH:MM for datetime-local input
 const getLocalDateTimeString = () => {
 const tzoffset = (new Date()).getTimezoneOffset() * 60000;
 const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 16);
 return localISOTime;
 };
 const [callDateTime, setCallDateTime] = useState(getLocalDateTimeString());
 const [createTicket, setCreateTicket] = useState(false);

 // Agents list
 const [agents, setAgents] = useState<any[]>([]);
 const [loadingAgents, setLoadingAgents] = useState(false);
 const [submitting, setSubmitting] = useState(false);
 const [error, setError] = useState("");
 const [success, setSuccess] = useState(false);

 // Fetch agents
 useEffect(() => {
 setLoadingAgents(true);
 fetch("/api/users")
 .then((r) => r.json())
 .then((usersList: any[]) => {
 const filteredAgents = usersList.filter((u: any) =>
 ["agent","admin","sub_admin","super_admin","ultra_super_admin"].includes(u.role)
 );
 setAgents(filteredAgents);
 
 // Auto select current user if they are an agent/admin
 const isAgent = ["agent","admin","sub_admin","super_admin","ultra_super_admin"].includes(profile?.role ||"");
 if (isAgent && user?.uid) {
 setAgentUid(user.uid);
 } else if (filteredAgents.length > 0) {
 setAgentUid(filteredAgents[0].uid);
 }
 })
 .catch((err) => {
 console.error("Failed to load agents:", err);
 })
 .finally(() => {
 setLoadingAgents(false);
 });
 }, [user, profile]);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setError("");
 setSuccess(false);

 // Validation
 if (!callerName.trim()) {
 setError("Caller Name is required.");
 return;
 }
 if (!phoneNumber.trim()) {
 setError("Phone Number is required.");
 return;
 }
 if (!subject.trim()) {
 setError("Subject is required.");
 return;
 }
 if (!description.trim()) {
 setError("Description is required.");
 return;
 }
 if (!callDateTime) {
 setError("Call Date & Time is required.");
 return;
 }
 if (!agentUid) {
 setError("Assigned Agent is required.");
 return;
 }

 setSubmitting(true);

 try {
 const selectedAgent = agents.find((a) => a.uid === agentUid);
 const agentName = selectedAgent ? selectedAgent.name :"";

 const payload = {
 callerName,
 phoneNumber,
 email: email || null,
 department: department || null,
 subject,
 description,
 callType,
 priority,
 status,
 agentUid,
 agentName,
 callDateTime: new Date(callDateTime).toISOString(),
 createTicket,
 };

 const res = await fetch("/api/calls", {
 method:"POST",
 headers: {
"Content-Type":"application/json",
 },
 body: JSON.stringify(payload),
 });

 if (res.ok) {
 setSuccess(true);
 const data = await res.json();
 setTimeout(() => {
 navigate(`/calls/${data.id}`);
 }, 1500);
 } else {
 const errData = await res.json();
 setError(errData.error ||"Failed to log the call.");
 }
 } catch (err) {
 console.error(err);
 setError("A network or server error occurred.");
 } finally {
 setSubmitting(false);
 }
 };

 return (
 <div className="space-y-6 max-w-4xl mx-auto p-4 md:p-6 animate-in fade-in duration-300">
 {/* Back Button */}
 <div className="flex items-center justify-between pb-4 border-b border-white/10">
 <div className="flex items-center gap-3.5">
 <button
 onClick={() => navigate("/calls")}
 className="w-10 h-10 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl flex items-center justify-center transition-all cursor-pointer"
 >
 <ArrowLeft className="w-4 h-4 text-slate-600 dark:text-white" />
 </button>
 <div>
 <h1 className="text-xl md:text-2xl font-semibold text-slate-800 dark:text-white uppercase tracking-wider">
 Log Support Call
 </h1>
 <p className="text-xs text-slate-500 dark:text-slate-400">
 Create a record for a new telephone interaction
 </p>
 </div>
 </div>
 </div>

 {error && (
 <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 rounded-2xl text-xs flex items-center gap-2.5 shadow-sm animate-in shake duration-300">
 <AlertCircle className="w-4 h-4 shrink-0" />
 <span className="font-semibold">{error}</span>
 </div>
 )}

 {success && (
 <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-500 dark:text-green-400 rounded-2xl text-xs flex items-center gap-2.5 shadow-sm animate-in fade-in">
 <CheckCircle2 className="w-4 h-4 shrink-0" />
 <span className="font-semibold">Call log created successfully! Redirecting...</span>
 </div>
 )}

 <form onSubmit={handleSubmit} className="space-y-6">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {/* Customer / Caller Info Card */}
 <div className="bg-white dark:bg-[#1A2332] border border-slate-200 dark:border-[#2D3B55] rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
 <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-white/5 pb-2 flex items-center gap-2">
 <User className="w-4 h-4 text-blue-500" /> Caller Information
 </h3>

 <div className="space-y-3">
 <div className="flex flex-col gap-1">
 <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">
 Caller Name *
 </label>
 <div className="relative">
 <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
 <input
 type="text"
 placeholder="Enter customer name"
 value={callerName}
 onChange={(e) => setCallerName(e.target.value)}
 className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-[#2D3B55] rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#111827] text-slate-800 dark:text-white transition-all h-10"
 required
 />
 </div>
 </div>

 <div className="flex flex-col gap-1">
 <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">
 Phone Number *
 </label>
 <div className="relative">
 <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
 <input
 type="tel"
 placeholder="e.g. +1 555-0199"
 value={phoneNumber}
 onChange={(e) => setPhoneNumber(e.target.value)}
 className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-[#2D3B55] rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#111827] text-slate-800 dark:text-white transition-all h-10"
 required
 />
 </div>
 </div>

 <div className="flex flex-col gap-1">
 <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">
 Email Address
 </label>
 <div className="relative">
 <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
 <input
 type="email"
 placeholder="email@customer.com"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-[#2D3B55] rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#111827] text-slate-800 dark:text-white transition-all h-10"
 />
 </div>
 </div>

 <div className="flex flex-col gap-1">
 <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">
 Department
 </label>
 <div className="relative">
 <Building className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
 <input
 type="text"
 placeholder="IT, HR, Operations..."
 value={department}
 onChange={(e) => setDepartment(e.target.value)}
 className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-[#2D3B55] rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#111827] text-slate-800 dark:text-white transition-all h-10"
 />
 </div>
 </div>
 </div>
 </div>

 {/* Call Metadata Card */}
 <div className="bg-white dark:bg-[#1A2332] border border-slate-200 dark:border-[#2D3B55] rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
 <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-white/5 pb-2 flex items-center gap-2">
 <PhoneCall className="w-4 h-4 text-blue-500" /> Interaction Metadata
 </h3>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="flex flex-col gap-1">
 <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">
 Call Type *
 </label>
 <select
 value={callType}
 onChange={(e) => setCallType(e.target.value)}
 className="w-full p-2 border border-slate-200 dark:border-[#2D3B55] rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#111827] text-slate-800 dark:text-white h-10"
 >
 <option value="Incoming">Incoming</option>
 <option value="Outgoing">Outgoing</option>
 </select>
 </div>

 <div className="flex flex-col gap-1">
 <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">
 Priority *
 </label>
 <select
 value={priority}
 onChange={(e) => setPriority(e.target.value)}
 className="w-full p-2 border border-slate-200 dark:border-[#2D3B55] rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#111827] text-slate-800 dark:text-white h-10"
 >
 <option value="1 - Critical">Critical</option>
 <option value="2 - High">High</option>
 <option value="3 - Moderate">Moderate</option>
 <option value="4 - Low">Low</option>
 </select>
 </div>

 <div className="flex flex-col gap-1">
 <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">
 Status *
 </label>
 <select
 value={status}
 onChange={(e) => setStatus(e.target.value)}
 className="w-full p-2 border border-slate-200 dark:border-[#2D3B55] rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#111827] text-slate-800 dark:text-white h-10"
 >
 <option value="New">New</option>
 <option value="Open">Open</option>
 <option value="In Progress">In Progress</option>
 <option value="On Hold">On Hold</option>
 <option value="Resolved">Resolved</option>
 <option value="Closed">Closed</option>
 </select>
 </div>

 <div className="flex flex-col gap-1">
 <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">
 Assigned Agent *
 </label>
 <select
 value={agentUid}
 onChange={(e) => setAgentUid(e.target.value)}
 className="w-full p-2 border border-slate-200 dark:border-[#2D3B55] rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#111827] text-slate-800 dark:text-white h-10"
 disabled={loadingAgents}
 >
 {loadingAgents ? (
 <option>Loading agents...</option>
 ) : (
 agents.map((agent) => (
 <option key={agent.uid} value={agent.uid}>
 {agent.name || agent.email}
 </option>
 ))
 )}
 </select>
 </div>
 </div>

 <div className="flex flex-col gap-1">
 <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">
 Call Date & Time *
 </label>
 <div className="relative">
 <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
 <input
 type="datetime-local"
 value={callDateTime}
 onChange={(e) => setCallDateTime(e.target.value)}
 className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-[#2D3B55] rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#111827] text-slate-800 dark:text-white transition-all h-10"
 required
 />
 </div>
 </div>

 <div className="flex items-center gap-3.5 bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/30 p-4 rounded-2xl transition-all">
 <input
 type="checkbox"
 id="createTicket"
 checked={createTicket}
 onChange={(e) => setCreateTicket(e.target.checked)}
 className="w-4.5 h-4.5 text-blue-600 border-slate-300 rounded-lg focus:ring-blue-500 dark:bg-[#111827] dark:border-[#2D3B55] cursor-pointer"
 />
 <div className="flex flex-col">
 <label htmlFor="createTicket" className="text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
 Auto-create Corresponding Support Ticket
 </label>
 <span className="text-[10px] text-slate-500 dark:text-slate-400">
 This will automatically create a support ticket using this call's subject, description, and agent assignment.
 </span>
 </div>
 </div>
 </div>
 </div>

 {/* Call Content Card */}
 <div className="bg-white dark:bg-[#1A2332] border border-slate-200 dark:border-[#2D3B55] rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
 <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-white/5 pb-2 flex items-center gap-2">
 <FileText className="w-4 h-4 text-blue-500" /> Call Details
 </h3>

 <div className="space-y-4">
 <div className="flex flex-col gap-1">
 <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">
 Subject *
 </label>
 <input
 type="text"
 placeholder="Brief summary of the issue or inquiry"
 value={subject}
 onChange={(e) => setSubject(e.target.value)}
 className="w-full px-4 py-2 border border-slate-200 dark:border-[#2D3B55] rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#111827] text-slate-800 dark:text-white transition-all h-10"
 required
 />
 </div>

 <div className="flex flex-col gap-1">
 <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">
 Detailed Log / Notes *
 </label>
 <textarea
 placeholder="Log detailed notes of the conversation..."
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 rows={6}
 style={{ resize:"none" }}
 className="w-full p-4 border border-slate-200 dark:border-[#2D3B55] rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#111827] text-slate-800 dark:text-white transition-all"
 required
 />
 </div>
 </div>
 </div>

 {/* Submit Actions */}
 <div className="flex items-center justify-end gap-3">
 <button
 type="button"
 onClick={() => navigate("/calls")}
 className="px-5 py-2.5 border border-slate-200 dark:border-[#2D3B55] rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={submitting}
 className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-2.5 text-xs font-bold shadow-lg shadow-blue-500/15 hover:shadow-blue-500/30 transition-all cursor-pointer disabled:opacity-50"
 >
 {submitting ? (
 <>
 <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
 Logging Call...
 </>
 ) : (
 <>
 <Save className="w-4 h-4" /> Save Call Log
 </>
 )}
 </button>
 </div>
 </form>
 </div>
 );
}
