import React, { useState, useEffect } from"react";
import { collection, onSnapshot, addDoc, serverTimestamp, query, orderBy } from"firebase/firestore";
import { db } from"../lib/firebase";
import { useAuth } from"../contexts/AuthContext";
import { AlertOctagon, Search, Plus, Clock, User, Activity, X, Edit, Trash2 } from"lucide-react";
import { Button } from"@/components/ui/button";
import { cn, formatDate } from"@/lib/utils";

export function ProblemManagement() {
 const { profile } = useAuth();
 const [problems, setProblems] = useState<any[]>([]);
 const [search, setSearch] = useState("");
 const [showModal, setShowModal] = useState(false);
 const [form, setForm] = useState({ title:"", description:"", priority:"High", assignedTo:"" });
 const [saving, setSaving] = useState(false);

 useEffect(() => {
 const q = query(collection(db,"problems"), orderBy("createdAt","desc"));
 return onSnapshot(q, snap => setProblems(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
 }, []);

 const handleCreate = async (e: React.FormEvent) => {
 e.preventDefault();
 setSaving(true);
 try {
 await addDoc(collection(db,"problems"), {
 ...form,
 status:"New",
 incidents: 0,
 createdBy: profile?.uid ||"",
 createdAt: serverTimestamp(),
 updatedAt: serverTimestamp(),
 });
 setShowModal(false);
 setForm({ title:"", description:"", priority:"High", assignedTo:"" });
 } catch (e) { console.error(e); }
 setSaving(false);
 };

 const filtered = problems.filter(p =>
 p.title?.toLowerCase().includes(search.toLowerCase()) ||
 p.status?.toLowerCase().includes(search.toLowerCase())
 );

 const open = problems.filter(p => !["Resolved","Closed"].includes(p.status ??"")).length;
 const linked = problems.reduce((s, p) => s + (p.incidents || 0), 0);

 return (
 <div className="space-y-6 max-w-7xl mx-auto">
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-3xl font-light text-sn-dark">Problem Management</h1>
 <p className="text-muted-foreground">Identify root causes and prevent recurring incidents.</p>
 </div>
 <Button className="bg-sn-green text-sn-dark font-bold gap-2" onClick={() => setShowModal(true)}>
 <Plus className="w-4 h-4" /> Create Problem
 </Button>
 </div>

 <div className="grid grid-cols-3 gap-6">
 {[
 { label:"Open Problems", value: open, icon: AlertOctagon, color:"red" },
 { label:"Linked Incidents", value: linked, icon: Activity, color:"blue" },
 { label:"Avg. Resolution", value:"14d", icon: Clock, color:"green" },
 ].map(s => (
 <div key={s.label} className={`sn-card bg-${s.color}-50 border-${s.color}-100 p-6 flex items-center gap-4`}>
 <div className={`w-12 h-12 bg-${s.color}-100 rounded-full flex items-center justify-center`}>
 <s.icon className={`w-6 h-6 text-${s.color}-600`} />
 </div>
 <div>
 <div className={`text-2xl font-bold text-${s.color}-700`}>{s.value}</div>
 <div className={`text-xs font-bold uppercase text-${s.color}-600/70`}>{s.label}</div>
 </div>
 </div>
 ))}
 </div>

 <div className="sn-card p-0 overflow-hidden">
 <div className="p-4 border-b border-border bg-muted/10 flex items-center gap-2">
 <div className="relative flex-grow max-w-md">
 <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
 <input type="text" placeholder="Search problems..." value={search} onChange={e => setSearch(e.target.value)}
 className="w-full bg-white border border-border rounded py-1.5 pl-9 pr-3 text-sm outline-none focus:ring-1 focus:ring-sn-green" />
 </div>
 </div>
 <div className="divide-y divide-border">
 {filtered.length === 0 ? (
 <div className="p-12 text-center text-muted-foreground">
 {problems.length === 0 ?"No problems recorded yet. Create the first one." :"No results found."}
 </div>
 ) : filtered.map(p => (
 <div key={p.id} className="p-6 hover:bg-muted/10 transition-colors group">
 <div className="flex items-start justify-between gap-4">
 <div className="space-y-2 flex-grow">
 <div className="flex items-center gap-3 flex-wrap">
 <span className="text-xs text-blue-600 font-bold">{p.id?.slice(0,8)}</span>
 <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase",
 p.priority ==="Critical" ?"bg-red-100 text-red-700" :
 p.priority ==="High" ?"bg-orange-100 text-orange-700" :"bg-blue-100 text-blue-700")}>
 {p.priority}
 </span>
 <span className="px-2 py-0.5 rounded bg-muted text-[10px] font-bold uppercase text-muted-foreground">{p.status}</span>
 </div>
 <h3 className="text-lg font-bold text-sn-dark">{p.title}</h3>
 {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
 <div className="flex items-center gap-6 text-xs text-muted-foreground flex-wrap">
 {p.assignedTo && <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{p.assignedTo}</span>}
 <span className="flex items-center gap-1"><AlertOctagon className="w-3.5 h-3.5" />{p.incidents || 0} Linked Incidents</span>
 <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />
 {formatDate(p.createdAt)}
 </span>
 </div>
 </div>
 <div className="flex flex-col items-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
 <button onClick={() => alert("Edit problem feature coming soon!")} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors" title="Edit Problem">
 <Edit className="w-4 h-4" />
 </button>
 <button onClick={async () => {
 if (confirm(`Are you sure you want to delete problem ${p.id.slice(0,8)}?`)) {
 const { deleteDoc, doc } = await import("firebase/firestore");
 await deleteDoc(doc(db,"problems", p.id));
 }
 }} className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors" title="Delete Problem">
 <Trash2 className="w-4 h-4" />
 </button>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>

 {showModal && (
 <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
 <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
 <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
 <h3 className="font-bold">Create Problem Record</h3>
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
 <label className="text-sm font-medium block mb-1">Priority</label>
 <select value={form.priority} onChange={e => setForm(f => ({...f, priority: e.target.value}))}
 className="w-full p-2 border border-border rounded text-sm focus:ring-1 focus:ring-sn-green outline-none">
 {["Critical","High","Medium","Low"].map(p => <option key={p}>{p}</option>)}
 </select>
 </div>
 <div>
 <label className="text-sm font-medium block mb-1">Assigned To</label>
 <input value={form.assignedTo} onChange={e => setForm(f => ({...f, assignedTo: e.target.value}))}
 placeholder="Team or person" className="w-full p-2 border border-border rounded text-sm focus:ring-1 focus:ring-sn-green outline-none" />
 </div>
 </div>
 <div className="flex justify-end gap-3 pt-2 border-t border-border">
 <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
 <Button type="submit" className="bg-sn-green text-sn-dark font-bold" disabled={saving}>
 {saving ?"Saving..." :"Create Problem"}
 </Button>
 </div>
 </form>
 </div>
 </div>
 )}
 </div>
 );
}
