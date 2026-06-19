import React, { useState, useEffect } from"react";
import { collection, onSnapshot, addDoc, serverTimestamp, query, orderBy } from"firebase/firestore";
import { db } from"../lib/firebase";
import { useAuth } from"../contexts/AuthContext";
import { GitPullRequest, Search, Plus, CheckCircle2, Clock, AlertCircle, Calendar, User, ChevronRight, X, Edit, Trash2 } from"lucide-react";
import { Button } from"@/components/ui/button";
import { cn } from"@/lib/utils";

export function ChangeManagement() {
 const { profile } = useAuth();
 const [changes, setChanges] = useState<any[]>([]);
 const [search, setSearch] = useState("");
 const [showModal, setShowModal] = useState(false);
 const [saving, setSaving] = useState(false);
 const [form, setForm] = useState({ title:"", description:"", type:"Normal", risk:"Medium", requester:"", plannedDate:"" });

 useEffect(() => {
 const q = query(collection(db,"changes"), orderBy("createdAt","desc"));
 return onSnapshot(q, snap => setChanges(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
 }, []);

 const handleCreate = async (e: React.FormEvent) => {
 e.preventDefault();
 setSaving(true);
 try {
 await addDoc(collection(db,"changes"), {
 ...form,
 state:"New",
 createdBy: profile?.uid ||"",
 createdAt: serverTimestamp(),
 updatedAt: serverTimestamp(),
 });
 setShowModal(false);
 setForm({ title:"", description:"", type:"Normal", risk:"Medium", requester:"", plannedDate:"" });
 } catch (e) { console.error(e); }
 setSaving(false);
 };

 const filtered = changes.filter(c =>
 c.title?.toLowerCase().includes(search.toLowerCase()) ||
 c.state?.toLowerCase().includes(search.toLowerCase()) ||
 c.type?.toLowerCase().includes(search.toLowerCase())
 );

 const counts = {
 New: changes.filter(c => c.state ==="New").length,
"In Approval": changes.filter(c => c.state ==="Authorize").length,
 Scheduled: changes.filter(c => c.state ==="Scheduled").length,
 Implemented: changes.filter(c => c.state ==="Implemented").length,
 };

 return (
 <div className="space-y-6 max-w-7xl mx-auto">
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-3xl font-light text-sn-dark">Change Management</h1>
 <p className="text-muted-foreground">Control and manage system changes to minimize risk and impact.</p>
 </div>
 <Button className="bg-sn-green text-sn-dark font-bold gap-2" onClick={() => setShowModal(true)}>
 <Plus className="w-4 h-4" /> Create Change Request
 </Button>
 </div>

 <div className="grid grid-cols-4 gap-4">
 {[
 { label:"New", count: counts.New, icon: Plus, color:"blue" },
 { label:"In Approval", count: counts["In Approval"], icon: Clock, color:"orange" },
 { label:"Scheduled", count: counts.Scheduled, icon: Calendar, color:"green" },
 { label:"Implemented", count: counts.Implemented, icon: CheckCircle2, color:"gray" },
 ].map(s => (
 <div key={s.label} className="sn-card p-4 flex items-center gap-4">
 <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center",
 s.color ==="blue" ?"bg-blue-100 text-blue-600" :
 s.color ==="orange" ?"bg-orange-100 text-orange-600" :
 s.color ==="green" ?"bg-green-100 text-green-600" :"bg-gray-100 text-gray-600")}>
 <s.icon className="w-5 h-5" />
 </div>
 <div>
 <div className="text-xl font-bold text-sn-dark">{s.count}</div>
 <div className="text-[10px] font-bold uppercase text-muted-foreground">{s.label}</div>
 </div>
 </div>
 ))}
 </div>

 <div className="sn-card p-0 overflow-hidden">
 <div className="p-4 border-b border-border bg-muted/10 flex items-center gap-2">
 <div className="relative flex-grow max-w-md">
 <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
 <input type="text" placeholder="Search changes..." value={search} onChange={e => setSearch(e.target.value)}
 className="w-full bg-white border border-border rounded py-1.5 pl-9 pr-3 text-sm outline-none focus:ring-1 focus:ring-sn-green" />
 </div>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="bg-muted/30 border-b border-border">
 {["Number","Short Description","Type","State","Risk","Planned Date","Actions"].map(h => (
 <th key={h} className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">{h}</th>
 ))}
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {filtered.length === 0 ? (
 <tr><td colSpan={6} className="p-12 text-center text-muted-foreground">
 {changes.length === 0 ?"No change requests yet. Create the first one." :"No results found."}
 </td></tr>
 ) : filtered.map(c => (
 <tr key={c.id} className="hover:bg-muted/20 transition-colors group">
 <td className="p-4 text-sm text-blue-600 font-bold">{c.id?.slice(0,8)}</td>
 <td className="p-4 text-sm font-medium text-sn-dark">{c.title}</td>
 <td className="p-4 text-sm text-muted-foreground">{c.type}</td>
 <td className="p-4">
 <span className="px-2 py-0.5 rounded bg-muted text-[10px] font-bold uppercase text-muted-foreground">{c.state}</span>
 </td>
 <td className="p-4">
 <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase",
 c.risk ==="Critical" || c.risk ==="High" ?"bg-red-100 text-red-700" :"bg-blue-100 text-blue-700")}>
 {c.risk}
 </span>
 </td>
 <td className="p-4 text-sm text-muted-foreground">
 <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5" />{c.plannedDate ||"—"}</div>
 </td>
 <td className="p-4 text-right">
 <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
 <button onClick={() => alert("Edit feature coming soon!")} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors" title="Edit Change">
 <Edit className="w-4 h-4" />
 </button>
 <button onClick={async () => {
 if (confirm(`Are you sure you want to delete change ${c.id.slice(0,8)}?`)) {
 const { deleteDoc, doc } = await import("firebase/firestore");
 await deleteDoc(doc(db,"changes", c.id));
 }
 }} className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors" title="Delete Change">
 <Trash2 className="w-4 h-4" />
 </button>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>

 {showModal && (
 <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
 <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
 <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
 <h3 className="font-bold">Create Change Request</h3>
 <button onClick={() => setShowModal(false)} className="p-1 hover:bg-muted rounded"><X className="w-5 h-5" /></button>
 </div>
 <form onSubmit={handleCreate} className="p-6 space-y-4">
 <div>
 <label className="text-sm font-medium block mb-1">Title <span className="text-red-500">*</span></label>
 <input required value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))}
 className="w-full p-2 border border-border rounded text-sm focus:ring-1 focus:ring-sn-green outline-none" />
 </div>
 <div>
 <label className="text-sm font-medium block mb-1">Description</label>
 <textarea rows={3} value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
 className="w-full p-2 border border-border rounded text-sm focus:ring-1 focus:ring-sn-green outline-none resize-none" />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="text-sm font-medium block mb-1">Type</label>
 <select value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))}
 className="w-full p-2 border border-border rounded text-sm focus:ring-1 focus:ring-sn-green outline-none">
 {["Normal","Standard","Emergency"].map(t => <option key={t}>{t}</option>)}
 </select>
 </div>
 <div>
 <label className="text-sm font-medium block mb-1">Risk</label>
 <select value={form.risk} onChange={e => setForm(f => ({...f, risk: e.target.value}))}
 className="w-full p-2 border border-border rounded text-sm focus:ring-1 focus:ring-sn-green outline-none">
 {["Critical","High","Medium","Low"].map(r => <option key={r}>{r}</option>)}
 </select>
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="text-sm font-medium block mb-1">Requester</label>
 <input value={form.requester} onChange={e => setForm(f => ({...f, requester: e.target.value}))}
 className="w-full p-2 border border-border rounded text-sm focus:ring-1 focus:ring-sn-green outline-none" />
 </div>
 <div>
 <label className="text-sm font-medium block mb-1">Planned Date</label>
 <input type="date" value={form.plannedDate} onChange={e => setForm(f => ({...f, plannedDate: e.target.value}))}
 className="w-full p-2 border border-border rounded text-sm focus:ring-1 focus:ring-sn-green outline-none" />
 </div>
 </div>
 <div className="flex justify-end gap-3 pt-2 border-t border-border">
 <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
 <Button type="submit" className="bg-sn-green text-sn-dark font-bold" disabled={saving}>
 {saving ?"Saving..." :"Create Change"}
 </Button>
 </div>
 </form>
 </div>
 </div>
 )}
 </div>
 );
}
