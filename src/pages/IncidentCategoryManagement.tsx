import React, { useEffect, useState } from"react";
import { useAuth } from"../contexts/AuthContext";
import {
 ShieldAlert, Plus, Search, Edit, Trash2, X, Check,
 Tag, ChevronUp, ChevronDown, RefreshCw, AlertTriangle, Sliders, ToggleLeft, ToggleRight, Trash
} from"lucide-react";
import { cn } from"@/lib/utils";

interface IncidentCategory {
 id: string;
 name: string;
 description: string;
 status:"Active" |"Inactive";
 created_by: string;
 created_date: string;
 last_updated_by: string;
 last_updated_date: string;
}

interface CategoryOption {
 id: string;
 category_id: string;
 value_text: string;
 status:"Active" |"Inactive";
 created_by: string;
 created_date: string;
}

type SortField ="name" |"status" |"created_date";
type SortDir ="asc" |"desc";

export function IncidentCategoryManagement() {
 const { user, profile } = useAuth();
 const myRole = profile?.role ||"user";
 const myEmail = user?.email || profile?.email ||"";

 const AUTHORIZED_ROLES = ["admin","super_admin","ultra_super_admin"];
 const FALLBACK_EMAILS = ["arun.g@technosprint.net","swedhasris@gmail.com","ulter@technosprint.net","admin@technosprint.net"];

 const hasAccess =
 AUTHORIZED_ROLES.includes(myRole) ||
 FALLBACK_EMAILS.includes(myEmail.toLowerCase());

 const [categories, setCategories] = useState<IncidentCategory[]>([]);
 const [loading, setLoading] = useState(true);
 const [search, setSearch] = useState("");
 const [statusFilter, setStatusFilter] = useState<"All" |"Active" |"Inactive">("All");
 const [sortField, setSortField] = useState<SortField>("name");
 const [sortDir, setSortDir] = useState<SortDir>("asc");

 // Add/Edit Category form state
 const [showForm, setShowForm] = useState(false);
 const [editingId, setEditingId] = useState<string | null>(null);
 const [formName, setFormName] = useState("");
 const [formDesc, setFormDesc] = useState("");
 const [formStatus, setFormStatus] = useState<"Active" |"Inactive">("Active");
 const [formError, setFormError] = useState("");
 const [formSubmitting, setFormSubmitting] = useState(false);

 // Category Options Drawer/Modal state
 const [activeCategoryForOptions, setActiveCategoryForOptions] = useState<IncidentCategory | null>(null);
 const [options, setOptions] = useState<CategoryOption[]>([]);
 const [loadingOptions, setLoadingOptions] = useState(false);
 const [newOptionText, setNewOptionText] = useState("");
 const [optionError, setOptionError] = useState("");
 const [optionSubmitting, setOptionSubmitting] = useState(false);
 const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
 const [editingOptionText, setEditingOptionText] = useState("");

 // Delete category modal state
 const [deleteTarget, setDeleteTarget] = useState<IncidentCategory | null>(null);
 const [deleteError, setDeleteError] = useState("");
 const [deleteSubmitting, setDeleteSubmitting] = useState(false);

 // Toast state
 const [toast, setToast] = useState<{ msg: string; type:"success" |"error" } | null>(null);

 function showToast(msg: string, type:"success" |"error" ="success") {
 setToast({ msg, type });
 setTimeout(() => setToast(null), 3500);
 }

 function getHeaders() {
 return {
"Content-Type":"application/json",
"x-user-uid": user?.uid ||"",
"x-user-email": myEmail,
 };
 }

 async function fetchCategories() {
 setLoading(true);
 try {
 const res = await fetch(
 `/api/incident-categories?uid=${encodeURIComponent(user?.uid ||"")}&email=${encodeURIComponent(myEmail)}`,
 { headers: getHeaders() }
 );
 if (!res.ok) throw new Error("Failed to load categories");
 const data = await res.json();
 setCategories(data);
 } catch (err: any) {
 showToast(err.message ||"Error loading categories","error");
 } finally {
 setLoading(false);
 }
 }

 useEffect(() => {
 if (hasAccess) fetchCategories();
 }, [hasAccess]);

 // Load options when category is selected
 async function fetchOptions(catId: string) {
 setLoadingOptions(true);
 setOptionError("");
 try {
 const res = await fetch(`/api/incident-categories/options?category_id=${catId}`, {
 headers: getHeaders()
 });
 if (!res.ok) throw new Error("Failed to load dropdown values");
 const data = await res.json();
 setOptions(data);
 } catch (err: any) {
 setOptionError(err.message ||"Failed to load dropdown values");
 } finally {
 setLoadingOptions(false);
 }
 }

 function openAdd() {
 setEditingId(null);
 setFormName("");
 setFormDesc("");
 setFormStatus("Active");
 setFormError("");
 setShowForm(true);
 }

 function openEdit(cat: IncidentCategory) {
 setEditingId(cat.id);
 setFormName(cat.name);
 setFormDesc(cat.description ||"");
 setFormStatus(cat.status);
 setFormError("");
 setShowForm(true);
 }

 function cancelForm() {
 setShowForm(false);
 setEditingId(null);
 setFormError("");
 }

 async function handleSubmit(e: React.FormEvent) {
 e.preventDefault();
 if (!formName.trim()) {
 setFormError("Category name is required");
 return;
 }
 setFormSubmitting(true);
 setFormError("");
 try {
 const url = editingId
 ? `/api/incident-categories/${editingId}`
 :"/api/incident-categories";
 const method = editingId ?"PUT" :"POST";
 const res = await fetch(url, {
 method,
 headers: getHeaders(),
 body: JSON.stringify({
 name: formName.trim(),
 description: formDesc.trim(),
 status: formStatus,
 created_by: profile?.name || myEmail,
 last_updated_by: profile?.name || myEmail,
 uid: user?.uid ||"",
 email: myEmail,
 }),
 });
 const data = await res.json();
 if (!res.ok) {
 setFormError(data.error ||"Operation failed");
 return;
 }
 showToast(data.message || (editingId ?"Category updated" :"Category created"));
 setShowForm(false);
 setEditingId(null);
 await fetchCategories();
 } catch (err: any) {
 setFormError(err.message ||"Network error");
 } finally {
 setFormSubmitting(false);
 }
 }

 async function handleDelete() {
 if (!deleteTarget) return;
 setDeleteSubmitting(true);
 setDeleteError("");
 try {
 const res = await fetch(
 `/api/incident-categories/${deleteTarget.id}?uid=${encodeURIComponent(user?.uid ||"")}&email=${encodeURIComponent(myEmail)}`,
 { method:"DELETE", headers: getHeaders() }
 );
 const data = await res.json();
 if (!res.ok) {
 setDeleteError(data.error ||"Delete failed");
 return;
 }
 showToast("Category deleted successfully");
 setDeleteTarget(null);
 await fetchCategories();
 } catch (err: any) {
 setDeleteError(err.message ||"Network error");
 } finally {
 setDeleteSubmitting(false);
 }
 }

 // Categories Dropdown Options actions
 function openOptionsDrawer(cat: IncidentCategory) {
 setActiveCategoryForOptions(cat);
 setNewOptionText("");
 setEditingOptionId(null);
 setOptionError("");
 fetchOptions(cat.id);
 }

 async function handleAddOption(e: React.FormEvent) {
 e.preventDefault();
 if (!activeCategoryForOptions) return;
 if (!newOptionText.trim()) {
 setOptionError("Value text is required");
 return;
 }
 setOptionSubmitting(true);
 setOptionError("");
 try {
 const res = await fetch("/api/incident-categories/options", {
 method:"POST",
 headers: getHeaders(),
 body: JSON.stringify({
 category_id: activeCategoryForOptions.id,
 value_text: newOptionText.trim(),
 status:"Active",
 created_by: profile?.name || myEmail,
 uid: user?.uid ||"",
 email: myEmail
 })
 });
 const data = await res.json();
 if (!res.ok) {
 setOptionError(data.error ||"Failed to add value");
 return;
 }
 showToast("Dropdown value added successfully");
 setNewOptionText("");
 fetchOptions(activeCategoryForOptions.id);
 } catch (err: any) {
 setOptionError(err.message ||"Network error");
 } finally {
 setOptionSubmitting(false);
 }
 }

 async function handleToggleOptionStatus(opt: CategoryOption) {
 if (!activeCategoryForOptions) return;
 const newStatus = opt.status ==="Active" ?"Inactive" :"Active";
 try {
 const res = await fetch(`/api/incident-categories/options/${opt.id}`, {
 method:"PUT",
 headers: getHeaders(),
 body: JSON.stringify({
 value_text: opt.value_text,
 status: newStatus,
 last_updated_by: profile?.name || myEmail,
 uid: user?.uid ||"",
 email: myEmail
 })
 });
 if (!res.ok) {
 const data = await res.json();
 showToast(data.error ||"Failed to update status","error");
 return;
 }
 showToast(`Value is now ${newStatus}`);
 fetchOptions(activeCategoryForOptions.id);
 } catch (err: any) {
 showToast(err.message ||"Network error","error");
 }
 }

 async function handleSaveEditingOption(opt: CategoryOption) {
 if (!activeCategoryForOptions) return;
 if (!editingOptionText.trim()) return;
 try {
 const res = await fetch(`/api/incident-categories/options/${opt.id}`, {
 method:"PUT",
 headers: getHeaders(),
 body: JSON.stringify({
 value_text: editingOptionText.trim(),
 status: opt.status,
 last_updated_by: profile?.name || myEmail,
 uid: user?.uid ||"",
 email: myEmail
 })
 });
 const data = await res.json();
 if (!res.ok) {
 setOptionError(data.error ||"Failed to update value");
 return;
 }
 showToast("Dropdown value updated");
 setEditingOptionId(null);
 fetchOptions(activeCategoryForOptions.id);
 } catch (err: any) {
 setOptionError(err.message ||"Network error");
 }
 }

 async function handleDeleteOption(optId: string) {
 if (!activeCategoryForOptions) return;
 if (!confirm("Are you sure you want to delete this dropdown value?")) return;
 try {
 const res = await fetch(`/api/incident-categories/options/${optId}?uid=${encodeURIComponent(user?.uid ||"")}&email=${encodeURIComponent(myEmail)}`, {
 method:"DELETE",
 headers: getHeaders()
 });
 if (!res.ok) {
 const data = await res.json();
 showToast(data.error ||"Failed to delete value","error");
 return;
 }
 showToast("Dropdown value deleted");
 fetchOptions(activeCategoryForOptions.id);
 } catch (err: any) {
 showToast(err.message ||"Network error","error");
 }
 }

 function toggleSort(field: SortField) {
 if (sortField === field) {
 setSortDir(d => (d ==="asc" ?"desc" :"asc"));
 } else {
 setSortField(field);
 setSortDir("asc");
 }
 }

 const filtered = categories
 .filter(c => {
 const q = search.toLowerCase();
 const matchSearch = !q || c.name.toLowerCase().includes(q) || (c.description ||"").toLowerCase().includes(q);
 const matchStatus = statusFilter ==="All" || c.status === statusFilter;
 return matchSearch && matchStatus;
 })
 .sort((a, b) => {
 let aVal = a[sortField] ||"";
 let bVal = b[sortField] ||"";
 const cmp = String(aVal).localeCompare(String(bVal));
 return sortDir ==="asc" ? cmp : -cmp;
 });

 function SortIcon({ field }: { field: SortField }) {
 if (sortField !== field) return <ChevronUp className="w-3 h-3 opacity-20" />;
 return sortDir ==="asc"
 ? <ChevronUp className="w-3 h-3 text-sn-green" />
 : <ChevronDown className="w-3 h-3 text-sn-green" />;
 }

 // Access denied
 if (!hasAccess) {
 return (
 <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
 <ShieldAlert className="w-16 h-16 text-muted-foreground opacity-20" />
 <h2 className="text-2xl font-bold">Access Restricted</h2>
 <p className="text-muted-foreground">You don't have permission to manage Incident Categories.</p>
 <p className="text-xs text-muted-foreground">Required role: Administrator or above</p>
 </div>
 );
 }

 return (
 <div className="space-y-6 w-full max-w-none">
 {/* Toast */}
 {toast && (
 <div className={cn(
"fixed top-4 right-4 z-[9999] px-5 py-3 rounded-lg shadow-lg text-white text-sm font-medium flex items-center gap-2 transition-all",
 toast.type ==="success" ?"bg-green-600" :"bg-red-600"
 )}>
 {toast.type ==="success" ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
 {toast.msg}
 </div>
 )}

 {/* Header */}
 <div className="flex items-center justify-between flex-wrap gap-3">
 <div>
 <h1 className="text-2xl font-bold text-sn-dark flex items-center gap-2">
 <Tag className="w-6 h-6 text-sn-green" />
 Incident Category Management
 </h1>
 <p className="text-muted-foreground text-sm mt-0.5">
 Create and manage dynamic custom dropdown categories for dynamic ticket fields
 </p>
 </div>
 <div className="flex items-center gap-2">
 <button
 onClick={fetchCategories}
 className="p-2 border border-border rounded-lg hover:bg-muted/20 transition-colors"
 title="Refresh"
 >
 <RefreshCw className={cn("w-4 h-4 text-muted-foreground", loading &&"animate-spin")} />
 </button>
 <button
 onClick={openAdd}
 className="flex items-center gap-2 px-4 py-2 bg-sn-green text-sn-dark font-bold rounded-lg hover:opacity-90 transition-opacity text-sm"
 >
 <Plus className="w-4 h-4" />
 Add Dropdown Field
 </button>
 </div>
 </div>

 {/* Stats Bar */}
 <div className="grid grid-cols-3 gap-4">
 {[
 { label:"Total Fields", value: categories.length, color:"text-sn-dark" },
 { label:"Active", value: categories.filter(c => c.status ==="Active").length, color:"text-green-600" },
 { label:"Inactive", value: categories.filter(c => c.status ==="Inactive").length, color:"text-orange-500" },
 ].map(stat => (
 <div key={stat.label} className="bg-white border border-border rounded-xl p-4 text-center shadow-sm">
 <div className={cn("text-2xl font-bold", stat.color)}>{stat.value}</div>
 <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-0.5">{stat.label}</div>
 </div>
 ))}
 </div>

 {/* Add/Edit Form */}
 {showForm && (
 <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
 <div className="p-4 border-b border-border bg-gradient-to-r from-sn-dark to-gray-800 text-white flex items-center justify-between">
 <div className="flex items-center gap-2">
 <Tag className="w-4 h-4 text-sn-green" />
 <span className="font-bold">{editingId ?"Edit Dropdown Field" :"Add New Dropdown Field"}</span>
 </div>
 <button onClick={cancelForm} className="text-white/60 hover:text-white transition-colors">
 <X className="w-5 h-5" />
 </button>
 </div>
 <form onSubmit={handleSubmit} className="p-5 space-y-4">
 {formError && (
 <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
 <AlertTriangle className="w-4 h-4 shrink-0" />
 {formError}
 </div>
 )}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="md:col-span-1">
 <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
 Dropdown Field Name <span className="text-red-500">*</span>
 </label>
 <input
 type="text"
 value={formName}
 onChange={e => setFormName(e.target.value)}
 placeholder="e.g. Device Type, Department, Region"
 className="w-full border border-border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-sn-green outline-none"
 required
 />
 </div>
 <div className="md:col-span-1">
 <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
 Description
 </label>
 <input
 type="text"
 value={formDesc}
 onChange={e => setFormDesc(e.target.value)}
 placeholder="Optional description"
 className="w-full border border-border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-sn-green outline-none"
 />
 </div>
 <div>
 <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
 Status
 </label>
 <select
 value={formStatus}
 onChange={e => setFormStatus(e.target.value as"Active" |"Inactive")}
 className="w-full border border-border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-sn-green outline-none"
 >
 <option value="Active">Active</option>
 <option value="Inactive">Inactive</option>
 </select>
 </div>
 </div>
 <div className="flex justify-end gap-2 pt-1">
 <button
 type="button"
 onClick={cancelForm}
 className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted/20 transition-colors"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={formSubmitting}
 className="px-5 py-2 bg-sn-green text-sn-dark font-bold rounded-lg text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
 >
 {formSubmitting ?"Saving..." : editingId ?"Update Field" :"Create Field"}
 </button>
 </div>
 </form>
 </div>
 )}

 {/* Filters */}
 <div className="flex items-center gap-3 flex-wrap">
 <div className="relative">
 <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
 <input
 type="text"
 placeholder="Search custom dropdowns..."
 value={search}
 onChange={e => setSearch(e.target.value)}
 className="pl-9 pr-4 py-2 border border-border rounded-lg text-sm w-56 outline-none focus:ring-2 focus:ring-sn-green"
 />
 </div>
 <select
 value={statusFilter}
 onChange={e => setStatusFilter(e.target.value as any)}
 className="p-2 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-sn-green"
 >
 <option value="All">All Status</option>
 <option value="Active">Active Only</option>
 <option value="Inactive">Inactive Only</option>
 </select>
 <span className="text-sm text-muted-foreground ml-auto">
 {filtered.length} {filtered.length === 1 ?"field" :"fields"}
 </span>
 </div>

 {/* Table */}
 <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-left">
 <thead>
 <tr className="bg-muted/30 border-b border-border text-[10px] font-bold uppercase text-muted-foreground tracking-wide">
 <th
 className="p-4 cursor-pointer hover:text-sn-dark select-none"
 onClick={() => toggleSort("name")}
 >
 <span className="flex items-center gap-1">Field Name <SortIcon field="name" /></span>
 </th>
 <th className="p-4">Description</th>
 <th
 className="p-4 cursor-pointer hover:text-sn-dark select-none"
 onClick={() => toggleSort("status")}
 >
 <span className="flex items-center gap-1">Status <SortIcon field="status" /></span>
 </th>
 <th className="p-4">Created By</th>
 <th
 className="p-4 cursor-pointer hover:text-sn-dark select-none"
 onClick={() => toggleSort("created_date")}
 >
 <span className="flex items-center gap-1">Created Date <SortIcon field="created_date" /></span>
 </th>
 <th className="p-4">Last Updated</th>
 <th className="p-4 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {loading ? (
 <tr>
 <td colSpan={7} className="p-10 text-center">
 <div className="flex flex-col items-center gap-2 text-muted-foreground">
 <RefreshCw className="w-6 h-6 animate-spin" />
 <span className="text-sm">Loading categories...</span>
 </div>
 </td>
 </tr>
 ) : filtered.length === 0 ? (
 <tr>
 <td colSpan={7} className="p-10 text-center">
 <div className="flex flex-col items-center gap-2 text-muted-foreground">
 <Tag className="w-8 h-8 opacity-20" />
 <span className="text-sm font-medium">No fields found</span>
 <span className="text-xs">
 {search || statusFilter !=="All"
 ?"Try adjusting your search or filters"
 :"Click \"Add Dropdown Field\" to create the first one"}
 </span>
 </div>
 </td>
 </tr>
 ) : (
 filtered.map(cat => (
 <tr key={cat.id} className="hover:bg-muted/5 transition-colors group">
 <td className="p-4">
 <div className="flex items-center gap-2">
 <div className="w-7 h-7 rounded-full bg-sn-green/10 flex items-center justify-center">
 <Tag className="w-3.5 h-3.5 text-sn-green" />
 </div>
 <span className="font-semibold text-sm">{cat.name}</span>
 </div>
 </td>
 <td className="p-4 text-sm text-muted-foreground max-w-[200px] truncate">
 {cat.description || <span className="italic opacity-40">No description</span>}
 </td>
 <td className="p-4">
 <span className={cn(
"inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase",
 cat.status ==="Active"
 ?"bg-green-100 text-green-700 border border-green-200"
 :"bg-orange-100 text-orange-700 border border-orange-200"
 )}>
 {cat.status}
 </span>
 </td>
 <td className="p-4 text-xs text-muted-foreground">{cat.created_by ||"—"}</td>
 <td className="p-4 text-xs text-muted-foreground">
 {cat.created_date
 ? new Date(cat.created_date).toLocaleDateString("en-US", { year:"numeric", month:"short", day:"numeric" })
 :"—"}
 </td>
 <td className="p-4 text-xs text-muted-foreground">
 {cat.last_updated_date
 ? new Date(cat.last_updated_date).toLocaleDateString("en-US", { year:"numeric", month:"short", day:"numeric" })
 :"—"}
 </td>
 <td className="p-4">
 <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
 <button
 onClick={() => openOptionsDrawer(cat)}
 className="h-7 px-2 flex items-center gap-1 rounded border border-sn-green text-sn-dark bg-sn-green hover:bg-sn-green/80 transition-colors font-bold text-xs"
 title="Manage Field Values/Options"
 >
 <Sliders className="w-3 h-3" />
 <span>Values</span>
 </button>
 <button
 onClick={() => openEdit(cat)}
 className="h-7 w-7 flex items-center justify-center rounded border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
 title="Edit Field"
 >
 <Edit className="w-3.5 h-3.5" />
 </button>
 <button
 onClick={() => {
 setDeleteTarget(cat);
 setDeleteError("");
 }}
 className="h-7 w-7 flex items-center justify-center rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
 title="Delete Field"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 </div>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 </div>

 {/* Dynamic Options values Sliding Drawer / Modal */}
 {activeCategoryForOptions && (
 <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-end p-0">
 <div className="bg-white h-full w-full max-w-lg shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
 {/* Header */}
 <div className="p-5 border-b border-border bg-gradient-to-r from-sn-dark to-gray-800 text-white flex items-center justify-between">
 <div className="flex items-center gap-2">
 <Sliders className="w-4 h-4 text-sn-green" />
 <div>
 <h3 className="font-bold text-sm">Manage Field Values</h3>
 <p className="text-[10px] text-sn-green font-bold uppercase tracking-wider">Field: {activeCategoryForOptions.name}</p>
 </div>
 </div>
 <button
 onClick={() => setActiveCategoryForOptions(null)}
 className="text-white/60 hover:text-white transition-colors"
 >
 <X className="w-6 h-6" />
 </button>
 </div>

 {/* Form to add a new option */}
 <form onSubmit={handleAddOption} className="p-4 border-b border-border bg-muted/20">
 <div className="flex items-center gap-2">
 <input
 type="text"
 value={newOptionText}
 onChange={e => setNewOptionText(e.target.value)}
 placeholder={`Add a value under ${activeCategoryForOptions.name}...`}
 className="flex-grow border border-border rounded-lg p-2 text-xs focus:ring-1 focus:ring-sn-green outline-none bg-white h-9"
 required
 />
 <button
 type="submit"
 disabled={optionSubmitting}
 className="px-4 bg-sn-green text-sn-dark font-bold rounded-lg text-xs hover:opacity-90 transition-opacity h-9 flex items-center gap-1 whitespace-nowrap"
 >
 <Plus className="w-3.5 h-3.5" />
 <span>Add Value</span>
 </button>
 </div>
 {optionError && (
 <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600 font-medium">
 <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
 <span>{optionError}</span>
 </div>
 )}
 </form>

 {/* List of Dynamic Dropdown values */}
 <div className="flex-grow overflow-y-auto p-4 space-y-2">
 {loadingOptions ? (
 <div className="flex flex-col items-center justify-center p-12 text-muted-foreground gap-2">
 <RefreshCw className="w-6 h-6 animate-spin" />
 <span className="text-xs">Loading values...</span>
 </div>
 ) : options.length === 0 ? (
 <div className="text-center p-12 border border-border border-dashed rounded-lg bg-muted/5">
 <Sliders className="w-8 h-8 mx-auto text-muted-foreground opacity-20 mb-2" />
 <p className="text-xs font-semibold text-muted-foreground">No dropdown values defined yet</p>
 <p className="text-[10px] text-muted-foreground mt-0.5">Use the form above to add laptop, desktop, HR, Finance etc.</p>
 </div>
 ) : (
 options.map(opt => {
 const isEditing = editingOptionId === opt.id;
 return (
 <div
 key={opt.id}
 className={cn(
"p-3 rounded-lg border border-border flex items-center justify-between gap-3 transition-colors bg-white hover:bg-muted/5",
 opt.status ==="Inactive" &&"opacity-60 bg-muted/10 border-dashed"
 )}
 >
 <div className="flex-grow">
 {isEditing ? (
 <div className="flex items-center gap-1">
 <input
 type="text"
 value={editingOptionText}
 onChange={e => setEditingOptionText(e.target.value)}
 className="border border-sn-green rounded p-1 text-xs outline-none focus:ring-1 focus:ring-sn-green bg-white w-full h-8"
 autoFocus
 />
 <button
 onClick={() => handleSaveEditingOption(opt)}
 className="h-8 w-8 rounded bg-green-600 text-white flex items-center justify-center hover:opacity-95"
 title="Save"
 >
 <Check className="w-3.5 h-3.5" />
 </button>
 <button
 onClick={() => setEditingOptionId(null)}
 className="h-8 w-8 rounded border border-border text-muted-foreground flex items-center justify-center hover:bg-muted/20"
 title="Cancel"
 >
 <X className="w-3.5 h-3.5" />
 </button>
 </div>
 ) : (
 <span className="font-semibold text-xs text-sn-dark">{opt.value_text}</span>
 )}
 </div>

 <div className="flex items-center gap-1.5">
 <button
 onClick={() => handleToggleOptionStatus(opt)}
 className="h-7 w-7 flex items-center justify-center rounded border border-border text-muted-foreground hover:bg-muted/25 transition-colors"
 title={opt.status ==="Active" ?"Disable Value" :"Enable Value"}
 >
 {opt.status ==="Active" ? (
 <ToggleRight className="w-5 h-5 text-green-600" />
 ) : (
 <ToggleLeft className="w-5 h-5 text-muted-foreground" />
 )}
 </button>
 {!isEditing && (
 <button
 onClick={() => {
 setEditingOptionId(opt.id);
 setEditingOptionText(opt.value_text);
 }}
 className="h-7 w-7 flex items-center justify-center rounded border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
 title="Edit Value"
 >
 <Edit className="w-3.5 h-3.5" />
 </button>
 )}
 <button
 onClick={() => handleDeleteOption(opt.id)}
 className="h-7 w-7 flex items-center justify-center rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
 title="Delete Value"
 >
 <Trash className="w-3.5 h-3.5" />
 </button>
 </div>
 </div>
 );
 })
 )}
 </div>
 {/* Footer */}
 <div className="p-4 border-t border-border bg-muted/10 text-right">
 <button
 onClick={() => setActiveCategoryForOptions(null)}
 className="px-4 py-2 border border-border rounded-lg text-xs font-semibold bg-white hover:bg-muted/20"
 >
 Close Manager
 </button>
 </div>
 </div>
 </div>
 )}

 {/* Delete Confirmation Modal */}
 {deleteTarget && (
 <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
 <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
 <div className="p-5 border-b border-border flex items-center justify-between bg-red-50">
 <div className="flex items-center gap-2 text-red-700">
 <AlertTriangle className="w-5 h-5" />
 <span className="font-bold">Confirm Deletion</span>
 </div>
 <button
 onClick={() => { setDeleteTarget(null); setDeleteError(""); }}
 className="text-muted-foreground hover:text-sn-dark transition-colors"
 >
 <X className="w-5 h-5" />
 </button>
 </div>
 <div className="p-5 space-y-3">
 <p className="text-sm text-muted-foreground">
 Are you sure you want to delete the custom field:
 </p>
 <div className="bg-muted/20 border border-border rounded-lg px-4 py-2.5 flex items-center gap-2">
 <Tag className="w-4 h-4 text-sn-green" />
 <span className="font-semibold">{deleteTarget.name}</span>
 </div>
 <p className="text-xs text-muted-foreground">
 This action cannot be undone. Custom dropdown fields currently linked to active tickets cannot be deleted.
 </p>
 {deleteError && (
 <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
 <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
 <span>{deleteError}</span>
 </div>
 )}
 </div>
 <div className="p-4 border-t border-border flex justify-end gap-2 bg-muted/10">
 <button
 onClick={() => { setDeleteTarget(null); setDeleteError(""); }}
 className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted/20 transition-colors"
 >
 Cancel
 </button>
 <button
 onClick={handleDelete}
 disabled={deleteSubmitting}
 className="px-5 py-2 bg-red-600 text-white font-bold rounded-lg text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
 >
 {deleteSubmitting ?"Deleting..." :"Delete Field"}
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
