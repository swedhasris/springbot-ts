import React, { useEffect, useState } from"react";
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from"firebase/firestore";
import { db } from"../lib/firebase";
import { useAuth } from"../contexts/AuthContext";
import { Plus, Trash2, ShieldAlert, Clock, Save, X, Edit } from"lucide-react";
import { Button } from"@/components/ui/button";

export function SLAManagement() {
 const { profile } = useAuth();
 const isAdmin = ["admin","super_admin","ultra_super_admin"].includes(profile?.role);
 const [policies, setPolicies] = useState<any[]>([]);
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
 const [newPolicy, setNewPolicy] = useState({
 name:"",
 priority:"3 - Moderate",
 category:"Inquiry / Help",
 responseTimeHours: 4,
 resolutionTimeHours: 24,
 isActive: true,
 department:"",
 businessHours: false,
 excludeHolidays: false,
 excludeWeekends: false
 });

 useEffect(() => {
 const q = query(collection(db,"sla_policies"));
 const unsubscribe = onSnapshot(q, (snapshot) => {
 setPolicies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
 });
 return unsubscribe;
 }, []);

 const handleCreateOrUpdatePolicy = async (e: React.FormEvent) => {
 e.preventDefault();
 try {
 if (selectedPolicyId) {
 await updateDoc(doc(db,"sla_policies", selectedPolicyId), {
 ...newPolicy,
 updatedAt: serverTimestamp()
 });
 } else {
 await addDoc(collection(db,"sla_policies"), {
 ...newPolicy,
 createdAt: serverTimestamp()
 });
 }
 setIsModalOpen(false);
 setSelectedPolicyId(null);
 setNewPolicy({
 name:"",
 priority:"3 - Moderate",
 category:"Inquiry / Help",
 responseTimeHours: 4,
 resolutionTimeHours: 24,
 isActive: true,
 department:"",
 businessHours: false,
 excludeHolidays: false,
 excludeWeekends: false
 });
 } catch (error) {
 console.error("Error saving policy:", error);
 }
 };

 const handleDeletePolicy = async (id: string) => {
 if (window.confirm("Are you sure you want to delete this SLA policy?")) {
 try {
 await deleteDoc(doc(db,"sla_policies", id));
 } catch (error) {
 console.error("Error deleting policy:", error);
 }
 }
 };


 return (
 <div className="space-y-6">
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-3xl font-bold tracking-tight">SLA Management</h1>
 <p className="text-muted-foreground">Define and manage Service Level Agreements.</p>
 </div>
 {isAdmin && (
 <Button onClick={() => { setSelectedPolicyId(null); setNewPolicy({ name:"", priority:"3 - Moderate", category:"Inquiry / Help", responseTimeHours: 4, resolutionTimeHours: 24, isActive: true }); setIsModalOpen(true); }} className="bg-sn-green text-sn-dark font-bold">
 <Plus className="w-4 h-4 mr-2" /> Create SLA Policy
 </Button>
 )}
 </div>

 <div className="sn-card p-0 overflow-hidden">
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="bg-muted/50">
 <th className="data-table-header p-4">Policy Name</th>
 <th className="data-table-header p-4">Priority</th>
 <th className="data-table-header p-4">Category</th>
 <th className="data-table-header p-4">Response Time</th>
 <th className="data-table-header p-4">Resolution Time</th>
 <th className="data-table-header p-4">Status</th>
 {isAdmin && <th className="data-table-header p-4">Actions</th>}
 </tr>
 </thead>
 <tbody>
 {policies.map((policy) => (
 <tr key={policy.id} className="data-table-row">
 <td className="p-4 font-medium">{policy.name}</td>
 <td className="p-4">
 <span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-700">
 {policy.priority}
 </span>
 </td>
 <td className="p-4 text-sm">{policy.category}</td>
 <td className="p-4 text-sm">{policy.responseTimeHours}h</td>
 <td className="p-4 text-sm">{policy.resolutionTimeHours}h</td>
 <td className="p-4">
 <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${policy.isActive ?"bg-green-100 text-green-700" :"bg-red-100 text-red-700"}`}>
 {policy.isActive ?"Active" :"Inactive"}
 </span>
 </td>
 {isAdmin && (
 <td className="p-4 flex gap-2">
 <Button variant="ghost" size="icon" onClick={() => {
 setSelectedPolicyId(policy.id);
 setNewPolicy({
 name: policy.name,
 priority: policy.priority,
 category: policy.category,
 responseTimeHours: policy.responseTimeHours,
 resolutionTimeHours: policy.resolutionTimeHours,
 isActive: policy.isActive,
 department: policy.department ||"",
 businessHours: policy.businessHours || false,
 excludeHolidays: policy.excludeHolidays || false,
 excludeWeekends: policy.excludeWeekends || false
 });
 setIsModalOpen(true);
 }} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
 <Edit className="w-4 h-4" />
 </Button>
 <Button variant="ghost" size="icon" onClick={() => handleDeletePolicy(policy.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
 <Trash2 className="w-4 h-4" />
 </Button>
 </td>
 )}
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 {isModalOpen && (
 <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
 <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
 <div className="p-6 border-b border-border flex items-center justify-between bg-muted/30">
 <h2 className="text-xl font-bold">{selectedPolicyId ?"Edit SLA Policy" :"Create SLA Policy"}</h2>
 <Button variant="ghost" size="icon" onClick={() => { setIsModalOpen(false); setSelectedPolicyId(null); }}>
 <X className="w-5 h-5" />
 </Button>
 </div>
 <form onSubmit={handleCreateOrUpdatePolicy} className="p-6 space-y-4">
 <div className="space-y-2">
 <label className="text-sm font-medium">Policy Name</label>
 <input
 required
 type="text"
 className="w-full p-2 border border-border rounded-md text-sm outline-none focus:ring-2 focus:ring-sn-green"
 value={newPolicy.name}
 onChange={(e) => setNewPolicy({ ...newPolicy, name: e.target.value })}
 placeholder="e.g., High Priority Network SLA"
 />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <label className="text-sm font-medium">Priority</label>
 <select
 className="w-full p-2 border border-border rounded-md text-sm outline-none focus:ring-2 focus:ring-sn-green"
 value={newPolicy.priority}
 onChange={(e) => setNewPolicy({ ...newPolicy, priority: e.target.value })}
 >
 {["1 - Critical","2 - High","3 - Moderate","4 - Low"].map(p => (
 <option key={p} value={p}>{p}</option>
 ))}
 </select>
 </div>
 <div className="space-y-2">
 <label className="text-sm font-medium">Category</label>
 <select
 className="w-full p-2 border border-border rounded-md text-sm outline-none focus:ring-2 focus:ring-sn-green"
 value={newPolicy.category}
 onChange={(e) => setNewPolicy({ ...newPolicy, category: e.target.value })}
 >
 {["Inquiry / Help","Software","Hardware","Network","Database"].map(c => (
 <option key={c} value={c}>{c}</option>
 ))}
 </select>
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <label className="text-sm font-medium">Response Time (Hours)</label>
 <input
 required
 type="number"
 className="w-full p-2 border border-border rounded-md text-sm outline-none focus:ring-2 focus:ring-sn-green"
 value={newPolicy.responseTimeHours}
 onChange={(e) => setNewPolicy({ ...newPolicy, responseTimeHours: parseInt(e.target.value) })}
 />
 </div>
 <div className="space-y-2">
 <label className="text-sm font-medium">Resolution Time (Hours)</label>
 <input
 required
 type="number"
 className="w-full p-2 border border-border rounded-md text-sm outline-none focus:ring-2 focus:ring-sn-green"
 value={newPolicy.resolutionTimeHours}
 onChange={(e) => setNewPolicy({ ...newPolicy, resolutionTimeHours: parseInt(e.target.value) })}
 />
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4 mt-2">
 <div className="space-y-2">
 <label className="text-sm font-medium">Department</label>
 <select
 className="w-full p-2 border border-border rounded-md text-sm outline-none focus:ring-2 focus:ring-sn-green"
 value={newPolicy.department ||""}
 onChange={(e) => setNewPolicy({ ...newPolicy, department: e.target.value })}
 >
 <option value="">Global (All Departments)</option>
 <option value="IT">IT</option>
 <option value="HR">HR</option>
 <option value="Facilities">Facilities</option>
 <option value="Finance">Finance</option>
 </select>
 </div>
 </div>
 <div className="space-y-3 mt-4 p-3 bg-muted/30 rounded-md border border-border">
 <h4 className="text-sm font-bold">Business Rules</h4>
 <div className="flex items-center justify-between">
 <label className="text-xs font-medium">Business Hours Support (8 AM - 6 PM)</label>
 <input
 type="checkbox"
 checked={newPolicy.businessHours || false}
 onChange={(e) => setNewPolicy({ ...newPolicy, businessHours: e.target.checked })}
 className="w-4 h-4 accent-sn-green"
 />
 </div>
 <div className="flex items-center justify-between">
 <label className="text-xs font-medium">Exclude Holidays</label>
 <input
 type="checkbox"
 checked={newPolicy.excludeHolidays || false}
 onChange={(e) => setNewPolicy({ ...newPolicy, excludeHolidays: e.target.checked })}
 className="w-4 h-4 accent-sn-green"
 />
 </div>
 <div className="flex items-center justify-between">
 <label className="text-xs font-medium">Exclude Weekends</label>
 <input
 type="checkbox"
 checked={newPolicy.excludeWeekends || false}
 onChange={(e) => setNewPolicy({ ...newPolicy, excludeWeekends: e.target.checked })}
 className="w-4 h-4 accent-sn-green"
 />
 </div>
 </div>
 <div className="flex justify-end gap-3 pt-4">
 <Button type="button" variant="outline" onClick={() => { setIsModalOpen(false); setSelectedPolicyId(null); }}>Cancel</Button>
 <Button type="submit" className="bg-sn-green text-sn-dark font-bold">{selectedPolicyId ?"Update Policy" :"Create Policy"}</Button>
 </div>
 </form>
 </div>
 </div>
 )}
 </div>
 );
}
