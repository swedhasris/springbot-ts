import React, { useEffect, useState } from"react";
import { useParams, useNavigate, Link } from"react-router-dom";
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
 CheckCircle2,
 Ticket,
 MessageSquare,
 History,
 Trash2,
 Edit2,
 Calendar,
 AlertTriangle,
 X,
 Check
} from"lucide-react";
import { cn } from"@/lib/utils";

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

export function CallDetail() {
 const { id } = useParams();
 const navigate = useNavigate();
 const { user, profile } = useAuth();
 
 const isAgentOrAdmin = ["agent","admin","sub_admin","super_admin","ultra_super_admin"].includes(profile?.role ||"");

 // Page States
 const [call, setCall] = useState<any>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState("");
 const [successMsg, setSuccessMsg] = useState("");
 
 // Editable fields (only for editing mode)
 const [isEditing, setIsEditing] = useState(false);
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
 const [callDateTime, setCallDateTime] = useState("");

 // Lists and Sub-states
 const [agents, setAgents] = useState<any[]>([]);
 const [notes, setNotes] = useState<any[]>([]);
 const [activities, setActivities] = useState<any[]>([]);
 const [newNote, setNewNote] = useState("");
 const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
 const [editingNoteText, setEditingNoteText] = useState("");

 // Action Pending flags
 const [savingCall, setSavingCall] = useState(false);
 const [converting, setConverting] = useState(false);
 const [addingNote, setAddingNote] = useState(false);

 // Fetch all call data
 const fetchCallDetails = async () => {
 if (!id) return;
 try {
 const res = await fetch(`/api/calls/${id}`);
 if (res.ok) {
 const data = await res.json();
 setCall(data);
 
 // Sync editable states
 setCallerName(data.callerName ||"");
 setPhoneNumber(data.phoneNumber ||"");
 setEmail(data.email ||"");
 setDepartment(data.department ||"");
 setSubject(data.subject ||"");
 setDescription(data.description ||"");
 setCallType(data.callType ||"Incoming");
 setPriority(data.priority ||"3 - Moderate");
 setStatus(data.status ||"New");
 setAgentUid(data.agentUid ||"");
 
 // Format ISO datetime string for local timezone input compatibility
 if (data.callDateTime) {
 const date = new Date(data.callDateTime);
 const tzoffset = date.getTimezoneOffset() * 60000;
 const localISOTime = new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
 setCallDateTime(localISOTime);
 }
 } else {
 setError("Call log not found.");
 }
 } catch (err) {
 console.error(err);
 setError("Failed to fetch call details.");
 } finally {
 setLoading(false);
 }
 };

 const fetchNotes = async () => {
 if (!id) return;
 try {
 const res = await fetch(`/api/calls/${id}/notes`);
 if (res.ok) {
 const data = await res.json();
 setNotes(data);
 }
 } catch (err) {
 console.error("Failed to fetch notes:", err);
 }
 };

 const fetchActivities = async () => {
 if (!id) return;
 try {
 const res = await fetch(`/api/calls/${id}/activities`);
 if (res.ok) {
 const data = await res.json();
 setActivities(data);
 }
 } catch (err) {
 console.error("Failed to fetch activities:", err);
 }
 };

 // Load agents
 const fetchAgents = async () => {
 try {
 const res = await fetch("/api/users");
 if (res.ok) {
 const usersList = await res.json();
 setAgents(
 usersList.filter((u: any) =>
 ["agent","admin","sub_admin","super_admin","ultra_super_admin"].includes(u.role)
 )
 );
 }
 } catch (err) {
 console.error("Failed to load agents:", err);
 }
 };

 useEffect(() => {
 setLoading(true);
 fetchCallDetails();
 fetchNotes();
 fetchActivities();
 fetchAgents();
 }, [id]);

 const handleSaveChanges = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!id) return;
 setError("");
 setSuccessMsg("");

 if (!callerName.trim() || !phoneNumber.trim() || !subject.trim() || !description.trim()) {
 setError("All required fields must be filled.");
 return;
 }

 setSavingCall(true);
 try {
 const selectedAgent = agents.find((a) => a.uid === agentUid);
 const agentName = selectedAgent ? selectedAgent.name : (call?.agentName ||"");

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
 };

 const res = await fetch(`/api/calls/${id}`, {
 method:"PUT",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify(payload),
 });

 if (res.ok) {
 setSuccessMsg("Call log updated successfully.");
 setIsEditing(false);
 fetchCallDetails();
 fetchActivities();
 } else {
 const errData = await res.json();
 setError(errData.error ||"Failed to update call log.");
 }
 } catch (err) {
 console.error(err);
 setError("A server error occurred while updating.");
 } finally {
 setSavingCall(false);
 }
 };

 const handleConvertCall = async () => {
 if (!id) return;
 if (!window.confirm("Convert this support call into an Incident Ticket?")) return;

 setError("");
 setSuccessMsg("");
 setConverting(true);

 try {
 const res = await fetch(`/api/calls/${id}/convert`, {
 method:"POST",
 });

 if (res.ok) {
 const data = await res.json();
 setSuccessMsg(data.message ||"Call successfully converted to ticket!");
 fetchCallDetails();
 fetchActivities();
 } else {
 const errData = await res.json();
 setError(errData.error ||"Failed to convert call to ticket.");
 }
 } catch (err) {
 console.error(err);
 setError("An error occurred during conversion.");
 } finally {
 setConverting(false);
 }
 };

 const handleDeleteCall = async () => {
 if (!id) return;
 if (!window.confirm("Are you sure you want to delete this call log? This cannot be undone.")) return;

 try {
 const res = await fetch(`/api/calls/${id}`, { method:"DELETE" });
 if (res.ok) {
 navigate("/calls");
 } else {
 const errData = await res.json();
 setError(errData.error ||"Failed to delete call log.");
 }
 } catch (err) {
 console.error(err);
 setError("An error occurred while deleting.");
 }
 };

 // Notes Lifecycle
 const handleAddNote = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!id || !newNote.trim()) return;

 setAddingNote(true);
 try {
 const res = await fetch(`/api/calls/${id}/notes`, {
 method:"POST",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify({ message: newNote.trim() }),
 });

 if (res.ok) {
 setNewNote("");
 fetchNotes();
 fetchActivities();
 } else {
 const errData = await res.json();
 alert(errData.error ||"Failed to add note.");
 }
 } catch (err) {
 console.error(err);
 } finally {
 setAddingNote(false);
 }
 };

 const handleUpdateNote = async (noteId: number) => {
 if (!id || !editingNoteText.trim()) return;
 try {
 const res = await fetch(`/api/calls/${id}/notes/${noteId}`, {
 method:"PUT",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify({ message: editingNoteText.trim() }),
 });

 if (res.ok) {
 setEditingNoteId(null);
 setEditingNoteText("");
 fetchNotes();
 } else {
 const errData = await res.json();
 alert(errData.error ||"Failed to update note.");
 }
 } catch (err) {
 console.error(err);
 }
 };

 const handleDeleteNote = async (noteId: number) => {
 if (!id) return;
 if (!window.confirm("Are you sure you want to delete this note?")) return;
 try {
 const res = await fetch(`/api/calls/${id}/notes/${noteId}`, {
 method:"DELETE",
 });

 if (res.ok) {
 fetchNotes();
 fetchActivities();
 } else {
 const errData = await res.json();
 alert(errData.error ||"Failed to delete note.");
 }
 } catch (err) {
 console.error(err);
 }
 };

 if (loading) {
 return (
 <div className="min-h-[50vh] flex items-center justify-center">
 <div className="flex flex-col items-center gap-3">
 <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
 <span className="text-xs text-slate-500 dark:text-slate-400">Loading call details...</span>
 </div>
 </div>
 );
 }

 if (error && !call) {
 return (
 <div className="max-w-4xl mx-auto p-6 text-center space-y-4">
 <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
 <h2 className="text-xl font-bold text-slate-800 dark:text-white">An Error Occurred</h2>
 <p className="text-sm text-slate-500 dark:text-slate-400">{error}</p>
 <button
 onClick={() => navigate("/calls")}
 className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
 >
 Back to Call Logs
 </button>
 </div>
 );
 }

 return (
 <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 animate-in fade-in duration-300">
 {/* Header Banner */}
 <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-5 border-b border-slate-200 dark:border-white/10 gap-4">
 <div className="flex items-center gap-3.5">
 <button
 onClick={() => navigate("/calls")}
 className="w-10 h-10 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl flex items-center justify-center transition-all cursor-pointer"
 >
 <ArrowLeft className="w-4 h-4 text-slate-600 dark:text-white" />
 </button>
 <div>
 <div className="flex items-center gap-2 flex-wrap">
 <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
 CALL-{String(call.id).padStart(5,"0")}
 </span>
 <h1 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white uppercase tracking-wider">
 {call.subject}
 </h1>
 </div>
 <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
 Logged by agent on {new Date(call.createdAt).toLocaleString()}
 </p>
 </div>
 </div>

 {/* Global actions bar */}
 <div className="flex items-center gap-2 flex-wrap">
 {isEditing ? (
 <>
 <button
 onClick={() => setIsEditing(false)}
 className="px-4 py-2 border border-slate-200 dark:border-[#2D3B55] rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
 >
 Cancel
 </button>
 <button
 onClick={handleSaveChanges}
 disabled={savingCall}
 className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-xs font-bold shadow-lg shadow-blue-500/15 transition-all cursor-pointer disabled:opacity-50"
 >
 {savingCall ? (
 <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
 ) : (
 <Save className="w-4 h-4" />
 )}
 Save Changes
 </button>
 </>
 ) : (
 <>
 {isAgentOrAdmin && (
 <button
 onClick={() => setIsEditing(true)}
 className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-white cursor-pointer transition-all"
 >
 <Edit2 className="w-4 h-4 text-blue-500" /> Edit Log
 </button>
 )}
 {isAgentOrAdmin && (
 <button
 onClick={handleDeleteCall}
 className="flex items-center justify-center w-10 h-10 border border-red-500/10 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
 title="Delete Call Log"
 >
 <Trash2 className="w-4 h-4 text-red-500" />
 </button>
 )}
 </>
 )}
 </div>
 </div>

 {error && (
 <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 rounded-2xl text-xs flex items-center gap-2.5 shadow-sm animate-in shake duration-300">
 <AlertCircle className="w-4 h-4 shrink-0" />
 <span className="font-semibold">{error}</span>
 </div>
 )}

 {successMsg && (
 <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-500 dark:text-green-400 rounded-2xl text-xs flex items-center gap-2.5 shadow-sm animate-in fade-in">
 <CheckCircle2 className="w-4 h-4 shrink-0" />
 <span className="font-semibold">{successMsg}</span>
 </div>
 )}

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Left Side: Call Form Details & Call Notes */}
 <div className="lg:col-span-2 space-y-6">
 
 {/* Main Info */}
 <div className="bg-white dark:bg-[#1A2332] border border-slate-200 dark:border-[#2D3B55] rounded-2xl p-5 md:p-6 shadow-sm">
 <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-white/5 pb-2.5 mb-4 flex items-center gap-2">
 <FileText className="w-4 h-4 text-blue-500" /> Call Details
 </h3>

 {isEditing ? (
 <form className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="flex flex-col gap-1">
 <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">Caller Name</label>
 <input
 type="text"
 value={callerName}
 onChange={(e) => setCallerName(e.target.value)}
 className="w-full px-3 py-1.5 border border-slate-200 dark:border-[#2D3B55] rounded-xl text-xs bg-white dark:bg-[#111827] text-slate-800 dark:text-white"
 />
 </div>
 <div className="flex flex-col gap-1">
 <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">Phone Number</label>
 <input
 type="text"
 value={phoneNumber}
 onChange={(e) => setPhoneNumber(e.target.value)}
 className="w-full px-3 py-1.5 border border-slate-200 dark:border-[#2D3B55] rounded-xl text-xs bg-white dark:bg-[#111827] text-slate-800 dark:text-white"
 />
 </div>
 <div className="flex flex-col gap-1">
 <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">Email Address</label>
 <input
 type="email"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 className="w-full px-3 py-1.5 border border-slate-200 dark:border-[#2D3B55] rounded-xl text-xs bg-white dark:bg-[#111827] text-slate-800 dark:text-white"
 />
 </div>
 <div className="flex flex-col gap-1">
 <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">Department</label>
 <input
 type="text"
 value={department}
 onChange={(e) => setDepartment(e.target.value)}
 className="w-full px-3 py-1.5 border border-slate-200 dark:border-[#2D3B55] rounded-xl text-xs bg-white dark:bg-[#111827] text-slate-800 dark:text-white"
 />
 </div>
 <div className="flex flex-col gap-1">
 <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">Call Type</label>
 <select
 value={callType}
 onChange={(e) => setCallType(e.target.value)}
 className="w-full p-2 border border-slate-200 dark:border-[#2D3B55] rounded-xl text-xs bg-white dark:bg-[#111827] text-slate-800 dark:text-white h-8"
 >
 <option value="Incoming">Incoming</option>
 <option value="Outgoing">Outgoing</option>
 </select>
 </div>
 <div className="flex flex-col gap-1">
 <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">Priority</label>
 <select
 value={priority}
 onChange={(e) => setPriority(e.target.value)}
 className="w-full p-2 border border-slate-200 dark:border-[#2D3B55] rounded-xl text-xs bg-white dark:bg-[#111827] text-slate-800 dark:text-white h-8"
 >
 <option value="1 - Critical">Critical</option>
 <option value="2 - High">High</option>
 <option value="3 - Moderate">Moderate</option>
 <option value="4 - Low">Low</option>
 </select>
 </div>
 <div className="flex flex-col gap-1">
 <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">Status</label>
 <select
 value={status}
 onChange={(e) => setStatus(e.target.value)}
 className="w-full p-2 border border-slate-200 dark:border-[#2D3B55] rounded-xl text-xs bg-white dark:bg-[#111827] text-slate-800 dark:text-white h-8"
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
 <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">Assigned Agent</label>
 <select
 value={agentUid}
 onChange={(e) => setAgentUid(e.target.value)}
 className="w-full p-2 border border-slate-200 dark:border-[#2D3B55] rounded-xl text-xs bg-white dark:bg-[#111827] text-slate-800 dark:text-white h-8"
 >
 {agents.map((agent) => (
 <option key={agent.uid} value={agent.uid}>
 {agent.name || agent.email}
 </option>
 ))}
 </select>
 </div>
 <div className="flex flex-col gap-1 md:col-span-2">
 <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">Call DateTime</label>
 <input
 type="datetime-local"
 value={callDateTime}
 onChange={(e) => setCallDateTime(e.target.value)}
 className="w-full px-3 py-1.5 border border-slate-200 dark:border-[#2D3B55] rounded-xl text-xs bg-white dark:bg-[#111827] text-slate-800 dark:text-white"
 />
 </div>
 </div>

 <div className="flex flex-col gap-1 mt-2">
 <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">Subject</label>
 <input
 type="text"
 value={subject}
 onChange={(e) => setSubject(e.target.value)}
 className="w-full px-3 py-1.5 border border-slate-200 dark:border-[#2D3B55] rounded-xl text-xs bg-white dark:bg-[#111827] text-slate-800 dark:text-white"
 />
 </div>

 <div className="flex flex-col gap-1">
 <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/50">Detailed Notes</label>
 <textarea
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 rows={5}
 style={{ resize:"none" }}
 className="w-full p-3 border border-slate-200 dark:border-[#2D3B55] rounded-xl text-xs bg-white dark:bg-[#111827] text-slate-800 dark:text-white"
 />
 </div>
 </form>
 ) : (
 <div className="space-y-6">
 {/* Details Grid */}
 <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
 <div className="space-y-1">
 <div className="text-[10px] font-semibold uppercase text-slate-400 flex items-center gap-1">
 <User className="w-3 h-3" /> Caller Name
 </div>
 <div className="text-xs font-semibold text-slate-800 dark:text-white">{call.callerName}</div>
 </div>

 <div className="space-y-1">
 <div className="text-[10px] font-semibold uppercase text-slate-400 flex items-center gap-1">
 <Phone className="w-3 h-3" /> Phone Number
 </div>
 <div className="text-xs text-slate-800 dark:text-white">{call.phoneNumber}</div>
 </div>

 <div className="space-y-1">
 <div className="text-[10px] font-semibold uppercase text-slate-400 flex items-center gap-1">
 <Mail className="w-3 h-3" /> Email Address
 </div>
 <div className="text-xs text-slate-800 dark:text-white truncate" title={call.email ||"N/A"}>
 {call.email || <span className="text-slate-400 italic">None</span>}
 </div>
 </div>

 <div className="space-y-1">
 <div className="text-[10px] font-semibold uppercase text-slate-400 flex items-center gap-1">
 <Building className="w-3 h-3" /> Department
 </div>
 <div className="text-xs text-slate-800 dark:text-white">
 {call.department || <span className="text-slate-400 italic">N/A</span>}
 </div>
 </div>

 <div className="space-y-1">
 <div className="text-[10px] font-semibold uppercase text-slate-400 flex items-center gap-1">
 <Clock className="w-3 h-3" /> Date & Time
 </div>
 <div className="text-xs text-slate-800 dark:text-white">
 {new Date(call.callDateTime).toLocaleString()}
 </div>
 </div>

 <div className="space-y-1">
 <div className="text-[10px] font-semibold uppercase text-slate-400 flex items-center gap-1">
 <User className="w-3 h-3" /> Assigned Agent
 </div>
 <div className="text-xs text-slate-800 dark:text-white font-semibold">{call.agentName ||"Unassigned"}</div>
 </div>
 </div>

 {/* Badges block */}
 <div className="flex gap-2 flex-wrap border-t border-slate-100 dark:border-white/5 pt-4">
 <div className="flex flex-col gap-1">
 <span className="text-[9px] font-semibold uppercase text-slate-400">Interaction Type</span>
 <span className="inline-flex text-[9px] font-bold px-2 py-0.5 rounded-full border bg-slate-500/10 text-blue-500 border-blue-500/20">
 {call.callType}
 </span>
 </div>

 <div className="flex flex-col gap-1">
 <span className="text-[9px] font-semibold uppercase text-slate-400">Call Status</span>
 <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider", STATUS_COLORS[call.status] ||"bg-slate-100 text-slate-700")}>
 {call.status}
 </span>
 </div>

 <div className="flex flex-col gap-1">
 <span className="text-[9px] font-semibold uppercase text-slate-400">Severity/Priority</span>
 <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider", PRIORITY_COLORS[call.priority] ||"bg-slate-100 text-slate-700")}>
 {call.priority}
 </span>
 </div>
 </div>

 {/* Subject & Description */}
 <div className="border-t border-slate-100 dark:border-white/5 pt-4 space-y-3">
 <div>
 <h4 className="text-[10px] font-semibold uppercase text-slate-400">Subject</h4>
 <p className="text-xs font-semibold text-slate-800 dark:text-white">{call.subject}</p>
 </div>

 <div>
 <h4 className="text-[10px] font-semibold uppercase text-slate-400">Log Description</h4>
 <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/40 p-4 border border-slate-200 dark:border-white/5 rounded-2xl leading-relaxed whitespace-pre-wrap">
 {call.description}
 </p>
 </div>
 </div>
 </div>
 )}
 </div>

 {/* Notes Section */}
 <div className="bg-white dark:bg-[#1A2332] border border-slate-200 dark:border-[#2D3B55] rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
 <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-white/5 pb-2.5 flex items-center gap-2">
 <MessageSquare className="w-4 h-4 text-blue-500" /> Interaction Notes & Work Logs
 </h3>

 {/* Note Input */}
 {isAgentOrAdmin && (
 <form onSubmit={handleAddNote} className="flex gap-2">
 <input
 type="text"
 placeholder="Type a new internal call note or follow up comment..."
 value={newNote}
 onChange={(e) => setNewNote(e.target.value)}
 className="flex-grow px-3 py-2 border border-slate-200 dark:border-[#2D3B55] rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#111827] text-slate-800 dark:text-white"
 required
 />
 <button
 type="submit"
 disabled={addingNote || !newNote.trim()}
 className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 transition-colors"
 >
 Add Note
 </button>
 </form>
 )}

 {/* Notes List */}
 <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
 {notes.length === 0 ? (
 <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-xs italic">
 No notes logged yet.
 </div>
 ) : (
 notes.map((note) => (
 <div
 key={note.id}
 className="p-3 bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-white/5 rounded-xl space-y-2 relative group"
 >
 <div className="flex justify-between items-start gap-2">
 <div>
 <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
 {note.userName}
 </span>
 <span className="text-[9px] text-slate-400 ml-2">
 {new Date(note.createdAt).toLocaleString()}
 </span>
 </div>

 {/* Notes Edit/Delete Controls */}
 {isAgentOrAdmin && (note.userId === user?.uid || profile?.role ==="admin" || profile?.role ==="super_admin") && (
 <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
 <button
 onClick={() => {
 setEditingNoteId(note.id);
 setEditingNoteText(note.message);
 }}
 className="text-slate-400 hover:text-blue-500 p-0.5 cursor-pointer"
 title="Edit Note"
 >
 <Edit2 className="w-3 h-3" />
 </button>
 <button
 onClick={() => handleDeleteNote(note.id)}
 className="text-slate-400 hover:text-red-500 p-0.5 cursor-pointer"
 title="Delete Note"
 >
 <Trash2 className="w-3 h-3" />
 </button>
 </div>
 )}
 </div>

 {editingNoteId === note.id ? (
 <div className="flex gap-2 items-center mt-1">
 <input
 type="text"
 value={editingNoteText}
 onChange={(e) => setEditingNoteText(e.target.value)}
 className="flex-grow px-3 py-1 border border-slate-200 dark:border-[#2D3B55] rounded-xl text-xs bg-white dark:bg-[#111827] text-slate-800 dark:text-white"
 required
 />
 <button
 onClick={() => handleUpdateNote(note.id)}
 className="p-1.5 bg-green-500 text-white rounded-lg cursor-pointer"
 title="Save note"
 >
 <Check className="w-3.5 h-3.5" />
 </button>
 <button
 onClick={() => {
 setEditingNoteId(null);
 setEditingNoteText("");
 }}
 className="p-1.5 bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white rounded-lg cursor-pointer"
 title="Cancel"
 >
 <X className="w-3.5 h-3.5" />
 </button>
 </div>
 ) : (
 <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
 {note.message}
 </p>
 )}
 </div>
 ))
 )}
 </div>
 </div>
 </div>

 {/* Right Side: Conversion & Activities */}
 <div className="space-y-6">
 
 {/* Ticket Linkage / Conversion */}
 <div className="bg-white dark:bg-[#1A2332] border border-slate-200 dark:border-[#2D3B55] rounded-2xl p-5 shadow-sm space-y-4">
 <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-white/5 pb-2 flex items-center gap-2">
 <Ticket className="w-4 h-4 text-blue-500" /> Ticket Association
 </h3>

 {call.linkedTicketId ? (
 <div className="bg-violet-500/5 border border-violet-500/10 rounded-2xl p-4 text-center space-y-3">
 <Ticket className="w-8 h-8 text-violet-500 mx-auto" />
 <div>
 <p className="text-xs font-bold text-slate-800 dark:text-white">Connected to Ticket</p>
 <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
 This call interaction was converted to a ticket.
 </p>
 </div>
 <Link
 to={`/tickets/${call.linkedTicketId}`}
 className="inline-flex w-full justify-center items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl py-2 text-xs font-bold shadow-md transition-all cursor-pointer"
 >
 View Associate Ticket
 </Link>
 </div>
 ) : (
 <div className="bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-white/5 rounded-2xl p-4 text-center space-y-3">
 <AlertTriangle className="w-8 h-8 text-slate-400 mx-auto" />
 <div>
 <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No Ticket Linked</p>
 <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
 This phone call is not linked to any ticketing record.
 </p>
 </div>
 {isAgentOrAdmin && (
 <button
 onClick={handleConvertCall}
 disabled={converting}
 className="flex w-full items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2 text-xs font-bold shadow-lg shadow-blue-500/15 transition-all cursor-pointer disabled:opacity-50"
 >
 {converting ? (
 <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
 ) : (
 <Ticket className="w-4 h-4" />
 )}
 Convert to Ticket
 </button>
 )}
 </div>
 )}
 </div>

 {/* Audit History / Activities Timeline */}
 <div className="bg-white dark:bg-[#1A2332] border border-slate-200 dark:border-[#2D3B55] rounded-2xl p-5 shadow-sm space-y-4">
 <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-white/5 pb-2 flex items-center gap-2">
 <History className="w-4 h-4 text-blue-500" /> Audit Trail Timeline
 </h3>

 <div className="relative pl-4 border-l border-slate-200 dark:border-[#2D3B55] space-y-5 max-h-[400px] overflow-y-auto pr-1">
 {activities.length === 0 ? (
 <div className="text-[10px] text-slate-400 italic">No activity logged yet.</div>
 ) : (
 activities.map((act) => (
 <div key={act.id} className="relative space-y-1">
 {/* Ring Indicator */}
 <div className="absolute -left-[20.5px] top-1 w-2.5 h-2.5 rounded-full border border-blue-500 bg-white dark:bg-[#1A2332]" />
 
 <div className="flex flex-col">
 <span className="text-[10px] font-bold text-slate-800 dark:text-white">
 {act.action}
 </span>
 <span className="text-[9px] text-slate-400">
 {new Date(act.createdAt).toLocaleString()} by {act.userName}
 </span>
 {act.details && (
 <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
 {act.details}
 </p>
 )}
 </div>
 </div>
 ))
 )}
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}
