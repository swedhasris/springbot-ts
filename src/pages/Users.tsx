import React, { useEffect, useState } from"react";
import { collection, onSnapshot, updateDoc, doc, serverTimestamp } from"firebase/firestore";
import { db } from"../lib/firebase";
import { useAuth } from"../contexts/AuthContext";
import { Role, ROLE_HIERARCHY, ROLE_LABELS, ROLE_COLORS, assignableRoles, canManage } from"../lib/roles";
import {
 ShieldAlert, UserCog, Mail, ShieldCheck, ShieldOff,
 Crown, Shield, Search, ChevronDown, KeyRound, Unlock, Lock, Plus, X, Edit, Trash2
} from"lucide-react";
import { cn } from"@/lib/utils";

// Fallback Button component since @/components/ui/button is missing in your project
const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(({ className, ...props }, ref) => {
 return (
 <button
 ref={ref}
 className={cn("px-4 py-2 rounded font-bold hover:opacity-90 transition disabled:opacity-50", className)}
 {...props}
 />
 );
});
Button.displayName ="Button";

const ROLE_ICONS: Record<string, any> = {
 ultra_super_admin: Crown,
 super_admin: Crown,
 admin: Shield,
 sub_admin: Shield,
 agent: UserCog,
 user: UserCog,
};

export function Users() {
 const { profile } = useAuth();
 const myRole = profile?.role || 'user';
 const [users, setUsers] = useState<any[]>([]);
 const [search, setSearch] = useState("");
 const [filterRole, setFilterRole] = useState("all");
 const [updating, setUpdating] = useState<string | null>(null);
 const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
 const [newUser, setNewUser] = useState({ name:"", email:"", role:"user" as Role });

 const fetchUsers = async () => {
 try {
 const res = await fetch("/api/users");
 const data = await res.json();
 if (Array.isArray(data)) {
 setUsers(data);
 } else {
 setUsers([]);
 }
 } catch (e) { console.error(e); }
 };

 useEffect(() => {
 fetchUsers();
 }, []);

 // Only admin and above can access this page
 if (ROLE_HIERARCHY[myRole] < ROLE_HIERARCHY["admin"]) {
 return (
 <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
 <ShieldAlert className="w-16 h-16 text-muted-foreground opacity-20" />
 <h2 className="text-2xl font-bold">Access Restricted</h2>
 <p className="text-muted-foreground">You don't have permission to manage users.</p>
 <p className="text-xs text-muted-foreground">Required: Administrator or above</p>
 </div>
 );
 }

 const handleRoleChange = async (userId: string, newRole: Role, currentRole: Role) => {
 // Can only assign roles strictly below your own
 if (!canManage(myRole, newRole) || !canManage(myRole, currentRole)) {
 alert("You cannot assign or modify roles at or above your own level.");
 return;
 }
 setUpdating(userId);
 try {
 await fetch(`/api/users/${userId}`, {
 method:"PUT",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify({ role: newRole })
 });
 fetchUsers();
 } catch (e) { console.error(e); }
 setUpdating(null);
 };

 const handleToggleAccess = async (userId: string, currentRole: Role, disabled: boolean) => {
 if (!canManage(myRole, currentRole)) {
 alert("You cannot modify access for users at or above your level.");
 return;
 }
 setUpdating(userId);
 try {
 await fetch(`/api/users/${userId}`, {
 method:"PUT",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify({ disabled: !disabled ? 1 : 0 })
 });
 fetchUsers();
 } catch (e) { console.error(e); }
 setUpdating(null);
 };

 const handleCreateUser = async () => {
 if (!newUser.name || !newUser.email) {
 alert("Name and email are required");
 return;
 }
 if (!canManage(myRole, newUser.role)) {
 alert("Cannot create a user with this role");
 return;
 }
 setUpdating("new");
 try {
 const res = await fetch("/api/users", {
 method:"POST",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify({
 uid:"usr_" + Date.now().toString(36) + Math.random().toString(36).substring(2),
 name: newUser.name,
 email: newUser.email,
 role: newUser.role,
 disabled: 0
 })
 });
 if (res.ok) {
 fetchUsers();
 setIsCreateModalOpen(false);
 setNewUser({ name:"", email:"", role:"user" as Role });
 } else {
 const data = await res.json();
 alert(data.error ||"Failed to create user");
 }
 } catch (e) {
 console.error(e);
 alert("Error creating user");
 }
 setUpdating(null);
 };

 const filtered = users.filter(u => {
 const matchSearch = !search ||
 u.name?.toLowerCase().includes(search.toLowerCase()) ||
 u.email?.toLowerCase().includes(search.toLowerCase());
 const matchRole = filterRole ==="all" || u.role === filterRole;
 return matchSearch && matchRole;
 });

 // Role counts
 const roleCounts = users.reduce((acc, u) => {
 acc[u.role] = (acc[u.role] || 0) + 1;
 return acc;
 }, {} as Record<string, number>);

 const myAssignable = assignableRoles(myRole);

 return (
 <div className="space-y-6 w-full max-w-none">
 {/* Header */}
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold text-sn-dark">User Management</h1>
 <p className="text-muted-foreground text-sm">
 Manage users and access levels · You are: <span className={cn("px-2 py-0.5 rounded text-xs font-bold", ROLE_COLORS[myRole])}>{ROLE_LABELS[myRole]}</span>
 </p>
 </div>
 <Button onClick={() => setIsCreateModalOpen(true)} className="bg-sn-green text-sn-dark font-bold">
 <Plus className="w-4 h-4 mr-2" />
 Add Member
 </Button>
 </div>

 {/* ── Access Control Panel (admin / super_admin / ultra_super_admin) ── */}
 <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
 <div className="p-4 border-b border-border bg-gradient-to-r from-sn-dark to-gray-800 text-white flex items-center gap-3">
 <KeyRound className="w-5 h-5 text-sn-green" />
 <div>
 <div className="font-bold">Access Control</div>
 <div className="text-xs text-white/60">Grant or remove system access for users below your role level</div>
 </div>
 </div>
 <div className="p-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 {/* Grant All Access */}
 <div className="border border-green-200 bg-green-50 rounded-lg p-4 flex items-start gap-3">
 <Unlock className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
 <div className="flex-grow">
 <div className="font-semibold text-green-800 text-sm">Grant Access</div>
 <div className="text-xs text-green-600 mt-0.5">Re-enable access for a disabled user below your level</div>
 </div>
 </div>
 {/* Remove All Access */}
 <div className="border border-red-200 bg-red-50 rounded-lg p-4 flex items-start gap-3">
 <Lock className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
 <div className="flex-grow">
 <div className="font-semibold text-red-800 text-sm">Remove Access</div>
 <div className="text-xs text-red-600 mt-0.5">Disable access for a user below your level</div>
 </div>
 </div>
 </div>
 <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
 <ShieldCheck className="w-3.5 h-3.5" />
 Use the <strong>Grant Access</strong> / <strong>Remove Access</strong> buttons in the table below to control individual users.
 You can only manage roles strictly below <strong>{ROLE_LABELS[myRole]}</strong>.
 </p>
 </div>
 </div>

 {/* Role Summary Cards */}
 <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
 {(Object.keys(ROLE_LABELS) as Role[]).map(r => {
 const Icon = ROLE_ICONS[r] || UserCog;
 const count = roleCounts[r] || 0;
 const isMine = r === myRole;
 return (
 <div key={r} className={cn(
"bg-white border rounded-lg p-3 text-center transition-all",
 isMine ?"border-sn-green ring-1 ring-sn-green" :"border-border"
 )}>
 <Icon className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
 <div className="text-xl font-bold text-sn-dark">{count}</div>
 <div className="text-[10px] font-bold text-muted-foreground uppercase leading-tight">{ROLE_LABELS[r]}</div>
 {isMine && <div className="text-[9px] text-sn-green font-bold mt-0.5">YOU</div>}
 </div>
 );
 })}
 </div>

 {/* Filters */}
 <div className="flex items-center gap-3 flex-wrap">
 <div className="relative">
 <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
 <input type="text" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)}
 className="pl-9 pr-4 py-2 border border-border rounded-lg text-sm w-56 outline-none focus:ring-2 focus:ring-sn-green" />
 </div>
 <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
 className="p-2 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-sn-green">
 <option value="all">All Roles</option>
 {(Object.keys(ROLE_LABELS) as Role[]).map(r => (
 <option key={r} value={r}>{ROLE_LABELS[r]}</option>
 ))}
 </select>
 <span className="text-sm text-muted-foreground ml-auto">{filtered.length} users</span>
 </div>

 {/* Users Table */}
 <div className="bg-white border border-border rounded-lg shadow-sm overflow-x-auto">
 <table className="w-full min-w-[1100px] text-left">
 <thead>
 <tr className="bg-muted/30 border-b border-border text-[10px] font-bold uppercase text-muted-foreground tracking-wide">
 <th className="p-4">User</th>
 <th className="p-4">Email</th>
 <th className="p-4">Current Role</th>
 <th className="p-4">Access</th>
 <th className="p-4">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {filtered.length === 0 ? (
 <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No users found.</td></tr>
 ) : filtered.map(u => {
 const uRole = (u.role ||"user") as Role;
 const Icon = ROLE_ICONS[uRole] || UserCog;
 const isMe = u.uid === profile?.uid || u.id === profile?.uid;
 const canEdit = !isMe && canManage(myRole, uRole);
 const isDisabled = u.disabled === true;

 return (
 <tr key={u.id} className={cn("hover:bg-muted/5 transition-colors", isDisabled &&"opacity-50")}>
 <td className="p-4">
 <div className="flex items-center gap-3">
 <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold",
 ROLE_COLORS[uRole])}>
 {(u.name || u.email ||"?")[0].toUpperCase()}
 </div>
 <div>
 <div className="font-medium text-sm">{u.name ||"—"}</div>
 {isMe && <div className="text-[10px] text-sn-green font-bold">You</div>}
 </div>
 </div>
 </td>
 <td className="p-4 text-sm text-muted-foreground">
 <div className="flex items-center gap-1.5"><Mail className="w-3 h-3" />{u.email}</div>
 </td>
 <td className="p-4">
 <span className={cn("px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1 w-fit", ROLE_COLORS[uRole])}>
 <Icon className="w-3 h-3" />
 {ROLE_LABELS[uRole] || uRole}
 </span>
 </td>
 <td className="p-4">
 {isDisabled ? (
 <span className="flex items-center gap-1 text-red-500 text-xs font-bold">
 <ShieldOff className="w-3.5 h-3.5" /> Disabled
 </span>
 ) : (
 <span className="flex items-center gap-1 text-sn-green text-xs font-bold">
 <ShieldCheck className="w-3.5 h-3.5" /> Active
 </span>
 )}
 </td>
 <td className="p-4">
 {isMe ? (
 <span className="text-xs text-muted-foreground italic">Your account</span>
 ) : !canEdit ? (
 <span className="text-xs text-muted-foreground italic">No permission</span>
 ) : (
 <div className="flex items-center gap-2">
 {/* Role change dropdown */}
 <div className="relative">
 <select
 value={uRole}
 disabled={updating === u.id}
 onChange={e => handleRoleChange(u.id, e.target.value as Role, uRole)}
 className="pl-2 pr-7 py-1.5 border border-border rounded text-xs outline-none focus:ring-1 focus:ring-sn-green appearance-none bg-white cursor-pointer"
 >
 {myAssignable.map(r => (
 <option key={r} value={r}>{ROLE_LABELS[r]}</option>
 ))}
 </select>
 <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
 </div>
 {/* Grant/Remove access */}
 <Button
 size="sm"
 variant={isDisabled ?"default" :"outline"}
 disabled={updating === u.id}
 onClick={() => handleToggleAccess(u.id, uRole, isDisabled)}
 className={cn("h-7 text-xs font-bold",
 isDisabled ?"bg-sn-green text-sn-dark" :"text-red-600 border-red-200 hover:bg-red-50")}
 >
 {updating === u.id ?"..." : isDisabled ?"Grant Access" :"Remove Access"}
 </Button>
 <button
 className="h-7 w-7 flex items-center justify-center rounded border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
 onClick={() => alert("Edit user feature coming soon!")}
 title="Edit User"
 >
 <Edit className="w-3.5 h-3.5" />
 </button>
 <button
 className="h-7 w-7 flex items-center justify-center rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
 onClick={async () => {
 if (confirm(`Are you sure you want to delete user ${u.email}?`)) {
 try {
 await fetch(`/api/users/${u.id}`, { method:"DELETE" });
 fetchUsers();
 } catch (e) {
 console.error(e);
 }
 }
 }}
 title="Delete User"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 </div>
 )}
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>

 {/* Permission Matrix */}
 <div className="bg-white border border-border rounded-lg shadow-sm overflow-hidden">
 <div className="p-4 border-b border-border bg-muted/10">
 <h3 className="font-bold text-sm">Permission Matrix</h3>
 <p className="text-xs text-muted-foreground mt-0.5">What each role can do in the system</p>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full text-xs">
 <thead>
 <tr className="bg-muted/20 border-b border-border">
 <th className="p-3 text-left font-bold text-muted-foreground">Permission</th>
 {(Object.keys(ROLE_LABELS) as Role[]).map(r => (
 <th key={r} className={cn("p-3 text-center font-bold", r === myRole ?"text-sn-green" :"text-muted-foreground")}>
 {ROLE_LABELS[r]}
 </th>
 ))}
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {[
 { label:"View own tickets", check: (r: Role) => true },
 { label:"View all tickets", check: (r: Role) => ROLE_HIERARCHY[r] >= 2 },
 { label:"Manage tickets", check: (r: Role) => ROLE_HIERARCHY[r] >= 2 },
 { label:"Company-wide view", check: (r: Role) => ROLE_HIERARCHY[r] >= 3 },
 { label:"Approve tickets", check: (r: Role) => ROLE_HIERARCHY[r] >= 4 },
 { label:"Manage users", check: (r: Role) => ROLE_HIERARCHY[r] >= 4 },
 { label:"Grant/Remove access", check: (r: Role) => ROLE_HIERARCHY[r] >= 4 },
 { label:"Manage SLA policies", check: (r: Role) => ROLE_HIERARCHY[r] >= 4 },
 { label:"Manage dropdowns", check: (r: Role) => ROLE_HIERARCHY[r] >= 5 },
 { label:"System configuration", check: (r: Role) => ROLE_HIERARCHY[r] >= 5 },
 { label:"Full system control", check: (r: Role) => r ==="ultra_super_admin" },
 ].map(perm => (
 <tr key={perm.label} className="hover:bg-muted/5">
 <td className="p-3 font-medium">{perm.label}</td>
 {(Object.keys(ROLE_LABELS) as Role[]).map(r => (
 <td key={r} className="p-3 text-center">
 {perm.check(r)
 ? <span className="text-sn-green font-bold">✓</span>
 : <span className="text-muted-foreground/30">—</span>}
 </td>
 ))}
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>

 {/* Create User Modal */}
 {isCreateModalOpen && (
 <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
 <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
 <div className="p-4 border-b border-border flex justify-between items-center bg-muted/10">
 <h3 className="font-bold text-lg">Create New User</h3>
 <button onClick={() => setIsCreateModalOpen(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
 </div>
 <div className="p-5 space-y-4">
 <div>
 <label className="block text-sm font-medium mb-1">Full Name</label>
 <input
 type="text"
 value={newUser.name}
 onChange={e => setNewUser(prev => ({ ...prev, name: e.target.value }))}
 className="w-full border rounded p-2 text-sm focus:ring-1 focus:ring-sn-green outline-none"
 placeholder="e.g. Jane Doe"
 />
 </div>
 <div>
 <label className="block text-sm font-medium mb-1">Email Address</label>
 <input
 type="email"
 value={newUser.email}
 onChange={e => setNewUser(prev => ({ ...prev, email: e.target.value }))}
 className="w-full border rounded p-2 text-sm focus:ring-1 focus:ring-sn-green outline-none"
 placeholder="e.g. jane@company.com"
 />
 </div>
 <div>
 <label className="block text-sm font-medium mb-1">Role</label>
 <select
 value={newUser.role}
 onChange={e => setNewUser(prev => ({ ...prev, role: e.target.value as Role }))}
 className="w-full border rounded p-2 text-sm focus:ring-1 focus:ring-sn-green outline-none"
 >
 {myAssignable.map(r => (
 <option key={r} value={r}>{ROLE_LABELS[r]}</option>
 ))}
 </select>
 </div>
 </div>
 <div className="p-4 border-t border-border flex justify-end gap-2 bg-muted/10">
 <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
 <Button onClick={handleCreateUser} disabled={updating ==="new"} className="bg-sn-green text-sn-dark font-bold">
 {updating ==="new" ?"Creating..." :"Create User"}
 </Button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
