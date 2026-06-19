import React, { useState, useEffect } from"react";
import {
 LayoutDashboard,
 Ticket,
 Users,
 Settings,
 LogOut,
 CheckSquare,
 BarChart3,
 History,
 Clock,
 Search,
 ChevronRight,
 ChevronDown,
 PlusCircle,
 UserCheck,
 FolderOpen,
 UserMinus,
 CheckCircle2,
 List,
 Map,
 Settings2,
 ChevronLeft,
 Menu,
 Sun,
 Moon,
 ShoppingCart,
 Database,
 AlertOctagon,
 GitPullRequest,
 BookOpen,
 HelpCircle,
 BarChart2,
 ClipboardList,
 CalendarDays,
 Trophy,
 Building2,
 KeyRound,
 Monitor,
 Palette,
 Tag,
 Lock,
 Eye,
 EyeOff,
 X,
 PhoneCall,
 BrainCircuit,
 MessageCircle,
} from"lucide-react";
import { Link, useLocation } from"react-router-dom";
import { cn } from"@/lib/utils";
import { useAuth } from"../contexts/AuthContext";
import { useTickets } from"../contexts/TicketsContext";
import { useBranding } from"../contexts/BrandingContext";
import { useTheme } from"../contexts/ThemeContext";
import { useWorkspace } from"./WorkspaceLayout";

interface MenuItem {
 icon?: any;
 label: string;
 path?: string;
 moduleKey?: string;
 adminOnly?: boolean;
 superAdminOnly?: boolean;
 ultraSuperAdminOnly?: boolean;
 agentOrAdminOnly?: boolean;
 items?: MenuItem[];
 badge?: number;
 onClick?: () => void;
}

export function Sidebar() {
 const { profile, signOut } = useAuth();
 const { openTicketsCount, assignedToMeCount } = useTickets();
 const { branding } = useBranding();
 const { setTheme, resolvedTheme } = useTheme();
 const { openTab } = useWorkspace();
 const location = useLocation();

 const [contextMenu, setContextMenu] = useState<{
 show: boolean;
 x: number;
 y: number;
 path: string;
 label: string;
 }>({ show: false, x: 0, y: 0, path:"", label:"" });

 useEffect(() => {
 const handleGlobalClick = () => {
 if (contextMenu.show) setContextMenu({ show: false, x: 0, y: 0, path:"", label:"" });
 };
 document.addEventListener("click", handleGlobalClick);
 return () => document.removeEventListener("click", handleGlobalClick);
 }, [contextMenu.show]);

 const isActive = (itemPath: string) => {
 if (!itemPath) return false;
 if (itemPath.includes("?")) {
 const [path, search] = itemPath.split("?");
 return location.pathname === path && location.search.includes(search);
 }
 return location.pathname === itemPath;
 };

 const isDarkMode = resolvedTheme ==="dark";
 const [expandedSections, setExpandedSections] = useState<string[]>(() => {
 const saved = localStorage.getItem("sn-sidebar-expanded");
 if (saved) {
 const parsed = JSON.parse(saved);
 // Auto-expand"Data Analytics" for existing users who don't have it yet
 if (!parsed.includes("Data Analytics")) {
 parsed.push("Data Analytics");
 }
 return parsed;
 }
 return ["Favorites","Incident","Data Analytics"];
 });
 const [isCollapsed, setIsCollapsed] = useState(false);
 const [searchQuery, setSearchQuery] = useState("");
 const [showResetModal, setShowResetModal] = useState(false);

 useEffect(() => {
 localStorage.setItem("sn-sidebar-expanded", JSON.stringify(expandedSections));
 }, [expandedSections]);

 const menuStructure: MenuItem[] = [
 {
 label:"Favorites",
 items: profile?.role ==="user"
 ? [
 { icon: LayoutDashboard, label:"Personal Dashboard", path:"/my-dashboard" },
 { icon: Trophy, label:"Leaderboard", path:"/leaderboard" },
 { icon: CalendarDays, label:"Calendar", path:"/calendar" },
 { icon: Ticket, label:"My Tickets", path:"/timesheet", moduleKey:"timesheet" },
 { icon: BarChart2, label:"Timesheet Reports", path:"/timesheet/reports", moduleKey:"timesheet_reports" },
 { icon: Monitor, label:"AI Activity Tracker", path:"/activity-tracker" },
 { icon: KeyRound, label:"Reset Password", onClick: () => setShowResetModal(true) },
 ]
 : [
 { icon: LayoutDashboard, label:"Personal Dashboard", path:"/" },
 { icon: Trophy, label:"Leaderboard", path:"/leaderboard" },
 { icon: CalendarDays, label:"Calendar", path:"/calendar" },
 { icon: Ticket, label:"My Tickets", path:"/timesheet", moduleKey:"timesheet" },
 { icon: BarChart2, label:"Timesheet Reports", path:"/timesheet/reports", moduleKey:"timesheet_reports" },
 { icon: Monitor, label:"AI Activity Tracker", path:"/activity-tracker" },
 { icon: KeyRound, label:"Reset Password", onClick: () => setShowResetModal(true) },
 ]
 },
 {
 label:"Email Integration",
 ultraSuperAdminOnly: true,
 items: [
 { icon: Settings, label:"Email Integration", path:"/email-integrations" },
 ]
 },
 {
 label:"Companies",
 ultraSuperAdminOnly: true,
 items: [
 { icon: Building2, label:"Companies", path:"/companies" },
 ]
 },
 {
 label:"Service Desk",
 items: [
 { icon: HelpCircle, label:"Self-Service Portal", path:"/service-portal" },
 { icon: ShoppingCart, label:"Service Catalog", path:"/catalog", moduleKey:"catalog" },
 { icon: BookOpen, label:"Knowledge Base", path:"/kb", moduleKey:"kb" },
 { icon: Clock, label:"SLA Policies", path:"/sla", moduleKey:"sla" },
 { icon: History, label:"System Activity Log", path:"/history", moduleKey:"history" },
 ]
 },
 {
 label:"Incident",
 items: [
 { icon: PlusCircle, label:"Create New Incident", path:"/tickets?action=new", moduleKey:"tickets" },
 { icon: UserCheck, label:"Assigned to Me", path:"/tickets?filter=assigned_to_me", badge: assignedToMeCount, moduleKey:"tickets" },
 { icon: FolderOpen, label:"Open Incidents", path:"/tickets?filter=open", badge: openTicketsCount, moduleKey:"tickets" },
 { icon: UserMinus, label:"Open - Unassigned", path:"/tickets?filter=unassigned", moduleKey:"tickets" },
 { icon: CheckCircle2, label:"Resolved Incidents", path:"/tickets?filter=resolved", moduleKey:"tickets" },
 { icon: List, label:"All Incidents", path:"/tickets", moduleKey:"tickets" },
 { icon: Map, label:"Critical Incidents Map", path:"/reports", moduleKey:"reports" },
 ]
 },
 {
 label:"Problem & Change",
 items: [
 { icon: AlertOctagon, label:"Problem Management", path:"/problem", moduleKey:"problem" },
 { icon: GitPullRequest, label:"Change Management", path:"/change", moduleKey:"change" },
 ]
 },
 {
 label:"Meetings",
 items: [
 { icon: CalendarDays, label:"Meeting Management", path:"/meetings" },
 { icon: PlusCircle, label:"Create Meeting", path:"/create-meeting" },
 ]
 },
 {
 label:"Call Management",
 agentOrAdminOnly: true,
 items: [
 { icon: PhoneCall, label:"Call Logs", path:"/calls" },
 { icon: PlusCircle, label:"Log New Call", path:"/calls/new" },
 ]
 },
 {
 label:"AI Assistant",
 agentOrAdminOnly: true,
 items: [
 { icon: BrainCircuit, label:"AI Assistant", path:"/ai-assistant" },
 ]
 },
 {
 label:"Groups",
 items: [
 { icon: LayoutDashboard, label:"Group Dashboard", path:"/groups?tab=dashboard" },
 { icon: CalendarDays, label:"Smart Calendar", path:"/groups?tab=calendar" },
 { icon: Map, label:"Planning Center", path:"/groups?tab=planning" },
 { icon: Clock, label:"Timesheets", path:"/groups?tab=timesheets" },
 { icon: CheckSquare, label:"Tasks", path:"/groups?tab=tasks" },
 { icon: GitPullRequest, label:"Sprint Board", path:"/groups?tab=sprint_board" },
 { icon: Trophy, label:"Performance", path:"/groups?tab=performance" },
 { icon: MessageCircle, label:"Discussions", path:"/groups?tab=discussions" },
 { icon: BookOpen, label:"Knowledge Base", path:"/groups?tab=kb" },
 { icon: ClipboardList, label:"Reports", path:"/groups?tab=reports" },
 { icon: BarChart3, label:"Analytics & Health", path:"/groups?tab=analytics" }
 ]
 },
 {
 label:"Data Analytics",
 adminOnly: true,
 items: [
 { icon: BarChart3, label:"Data Analytics", path:"/data-analytics", moduleKey:"reports" },
 { icon: BarChart2, label:"Forecasting & Targets", path:"/forecasting-planning", moduleKey:"reports" },
 ]
 },
 {
 label:"SLA Management",
 adminOnly: true,
 items: [
 { icon: LayoutDashboard, label:"SLA Dashboard", path:"/sla-management?tab=dashboard" },
 { icon: Clock, label:"SLA Policies", path:"/sla-management?tab=policies" },
 { icon: Clock, label:"Business Hours", path:"/sla-management?tab=business-hours" },
 { icon: CalendarDays, label:"Holiday Calendar", path:"/sla-management?tab=holidays" },
 { icon: AlertOctagon, label:"Escalation Rules", path:"/sla-management?tab=escalations" },
 { icon: BarChart3, label:"SLA Reports", path:"/sla-management?tab=reports" },
 ]
 },
 {
 label:"System Administration",
 adminOnly: true,
 items: [
 { icon: Users, label:"User Management", path:"/users", moduleKey:"users" },
 { icon: KeyRound, label:"Access Control", path:"/access-control", moduleKey:"access_control" },
 { icon: Users, label:"Group Management", path:"/groups?tab=teams" },
 { icon: Settings2, label:"System Settings", path:"/settings", moduleKey:"settings" },
 { icon: CheckCircle2, label:"Approved Tickets", path:"/approved-tickets" },
 { icon: ClipboardList, label:"Ticket Approvals", path:"/timesheet-approvals", moduleKey:"timesheet_approvals" },
 { icon: CheckCircle2, label:"Approved Timesheets", path:"/timesheet/reports?status=Approved", moduleKey:"approved_timesheet" },
 { icon: Palette, label:"Branding", path:"/branding", superAdminOnly: true, moduleKey:"settings" },
 { icon: Tag, label:"Incident Category Management", path:"/incident-categories", moduleKey:"settings" },
 ]
 }
 ];

 const toggleSection = (label: string) => {
 setExpandedSections(prev =>
 prev.includes(label) ? prev.filter(s => s !== label) : [...prev, label]
 );
 };

 const hasAccess = (item: MenuItem) => {
 if (item.ultraSuperAdminOnly && profile?.role !=="ultra_super_admin") return false;
 if (item.superAdminOnly && !["super_admin","ultra_super_admin"].includes(profile?.role ||"")) return false;
 if (item.adminOnly && !["admin","super_admin","ultra_super_admin"].includes(profile?.role ||"")) return false;
 if (item.agentOrAdminOnly && !["agent","admin","sub_admin","super_admin","ultra_super_admin"].includes(profile?.role ||"")) return false;

 if (item.moduleKey && profile?.restrictedModules?.includes(item.moduleKey)) {
 return false;
 }
 return true;
 };

 const getFilteredMenu = (items: MenuItem[]): MenuItem[] => {
 return items
 .map(item => {
 if (!hasAccess(item)) return null;

 if (item.items) {
 const filteredSubItems = getFilteredMenu(item.items);
 if (filteredSubItems.length > 0) {
 return { ...item, items: filteredSubItems };
 }
 return null;
 }

 if (searchQuery && !item.label.toLowerCase().includes(searchQuery.toLowerCase())) {
 return null;
 }

 return item;
 })
 .filter(Boolean) as MenuItem[];
 };

 const filteredMenu = getFilteredMenu(menuStructure);

 return (
 <aside className={cn(
"bg-sn-sidebar text-white flex flex-col sticky top-4 left-4 transition-all duration-300 border border-white/10 rounded-2xl m-4 mr-0 shadow-2xl z-20 overflow-hidden",
 isCollapsed ?"w-16" :"w-64",
"h-[calc(100vh-2rem)]"
 )}>
 {/* Sidebar Header */}
 <div className="p-4 flex items-center justify-between border-b border-white/10 h-16 shrink-0">
 {!isCollapsed && (
 <div className="flex items-center gap-2.5">
 {branding.logoBase64 ? (
 <img
 src={branding.logoBase64}
 alt="Logo"
 className="w-8 h-8 rounded-lg object-cover shadow-[0_0_10px_rgba(37,99,235,0.3)]"
 />
 ) : (
 <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-blue-800 rounded-lg flex items-center justify-center font-semibold text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]">
 {branding.companyName.charAt(0).toUpperCase()}
 </div>
 )}
 <span className="text-sm font-semibold tracking-wider text-blue-600 dark:text-blue-400 uppercase truncate max-w-[140px]" title={branding.companyName}>
 {branding.companyName}
 </span>
 </div>
 )}
 <button
 onClick={() => setIsCollapsed(!isCollapsed)}
 className="p-1.5 hover:bg-white/10 rounded-lg transition-all duration-200 cursor-pointer"
 >
 {isCollapsed ? <Menu className="w-4 h-4 text-blue-500" /> : <ChevronLeft className="w-4 h-4 text-text-dim hover:text-white" />}
 </button>
 </div>

 {/* Filter Navigator */}
 {!isCollapsed && (
 <div className="p-4 shrink-0">
 <div className="relative group">
 <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-dim group-focus-within:text-blue-500 transition-colors" />
 <input
 type="text"
 placeholder="Navigator search..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs outline-none focus:ring-1 focus:ring-blue-500/30 focus:border-blue-500 focus:bg-white/10 focus:shadow-[0_0_12px_rgba(37,99,235,0.15)] transition-all placeholder:text-text-dim/60"
 />
 </div>
 </div>
 )}

 {/* Navigation Menu */}
 <nav className="flex-grow overflow-y-auto overflow-x-hidden custom-scrollbar py-2 px-2 space-y-1">
 {filteredMenu.map((section) => (
 <div key={section.label} className="mb-2">
 {!isCollapsed && (
 <button
 onClick={() => toggleSection(section.label)}
 className="w-full flex items-center justify-between px-3 py-1.5 text-[9px] font-semibold uppercase tracking-widest text-text-dim/70 hover:text-white transition-colors group cursor-pointer"
 >
 <span>{section.label}</span>
 {expandedSections.includes(section.label) ? (
 <ChevronDown className="w-3 h-3 text-blue-500/70 group-hover:text-blue-500" />
 ) : (
 <ChevronRight className="w-3 h-3 text-text-dim/50 group-hover:text-white" />
 )}
 </button>
 )}

 {(expandedSections.includes(section.label) || isCollapsed || searchQuery) && (
 <div className="space-y-0.5 mt-1">
 {section.items?.map((item) => {
 const content = (
 <>
 {item.icon && (
 <item.icon className={cn(
"w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110",
 isActive(item.path) ?"text-blue-500 drop-shadow-[0_0_8px_rgba(37,99,235,0.6)]" :"text-text-dim group-hover:text-white"
 )} />
 )}
 {!isCollapsed && <span className="text-xs truncate flex-grow">{item.label}</span>}
 {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
 <span className="bg-blue-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center shadow-[0_0_10px_rgba(37,99,235,0.3)]">
 {item.badge}
 </span>
 )}

 {isCollapsed && (
 <div className="absolute left-16 bg-slate-950 border border-white/10 px-3 py-2 rounded-xl shadow-2xl text-[10px] uppercase font-bold tracking-wider whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-50 transform translate-x-2 group-hover:translate-x-0">
 {item.label}
 </div>
 )}
 </>
 );

 if (item.onClick) {
 return (
 <button
 key={item.label}
 onClick={item.onClick}
 className={cn(
"w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all relative group cursor-pointer text-left",
"text-text-dim hover:bg-white/5 hover:text-white"
 )}
 >
 {content}
 </button>
 );
 }

 return (
 <Link
 key={item.label}
 to={item.path ||"#"}
 onClick={(e) => {
 if (e.ctrlKey || e.metaKey || e.shiftKey) {
 e.preventDefault();
 openTab(item.path ||"#", { forceNew: true });
 }
 }}
 onAuxClick={(e) => {
 if (e.button === 1) {
 e.preventDefault();
 openTab(item.path ||"#", { forceNew: true });
 }
 }}
 onContextMenu={(e) => {
 if (item.path) {
 e.preventDefault();
 setContextMenu({
 show: true,
 x: e.clientX,
 y: e.clientY,
 path: item.path,
 label: item.label
 });
 }
 }}
 className={cn(
"flex items-center gap-3 px-3 py-2 rounded-xl transition-all relative group cursor-pointer",
 isActive(item.path)
 ?"bg-blue-500/10 text-blue-500 dark:text-blue-400 border-r border-blue-500 shadow-[inset_0_0_12px_rgba(37,99,235,0.1)] font-semibold"
 :"text-text-dim hover:bg-white/5 hover:text-white"
 )}
 >
 {content}
 </Link>
 );
 })}
 </div>
 )}
 </div>
 ))}
 </nav>

 {/* Sidebar Footer */}
 <div className="p-3 border-t border-white/10 space-y-1.5 shrink-0 bg-black/20">
 <button
 onClick={() => setTheme(isDarkMode ?"light" :"dark")}
 className={cn(
"flex items-center gap-3 px-3 py-2 w-full text-text-dim hover:text-white transition-all duration-200 rounded-xl hover:bg-white/5 cursor-pointer text-xs",
 isCollapsed &&"justify-center px-0"
 )}
 >
 {isDarkMode ? <Sun className="w-4 h-4 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" /> : <Moon className="w-4 h-4 text-blue-500" />}
 {!isCollapsed && <span>{isDarkMode ?"Light Spectrum" :"Dark Cyber Mode"}</span>}
 </button>
 <button
 onClick={() => setShowResetModal(true)}
 className={cn(
"flex items-center gap-3 px-3 py-2 w-full text-text-dim hover:text-blue-400 transition-all duration-200 rounded-xl hover:bg-white/5 cursor-pointer text-xs",
 isCollapsed &&"justify-center px-0"
 )}
 >
 <Lock className="w-4 h-4" />
 {!isCollapsed && <span>Reset Password</span>}
 </button>
 <button
 onClick={() => signOut()}
 className={cn(
"flex items-center gap-3 px-3 py-2 w-full text-text-dim hover:text-red-400 transition-all duration-200 rounded-xl hover:bg-white/5 cursor-pointer text-xs",
 isCollapsed &&"justify-center px-0"
 )}
 >
 <LogOut className="w-4 h-4" />
 {!isCollapsed && <span>System Logout</span>}
 </button>
 </div>

 {/* Reset Password Modal */}
 <PasswordResetModal show={showResetModal} onClose={() => setShowResetModal(false)} />

 {/* Floating Sidebar Link Context Menu */}
 {contextMenu.show && (
 <div
 className="fixed bg-[#0c101f]/95 border border-white/10 backdrop-blur-xl rounded-xl shadow-2xl py-1.5 z-[9999] text-[11px] text-white min-w-[150px] animate-in fade-in zoom-in-95 duration-100 shadow-[0_10px_25px_rgba(0,0,0,0.5)]"
 style={{ top: contextMenu.y, left: contextMenu.x }}
 >
 <button
 onClick={() => {
 openTab(contextMenu.path, { forceNew: true });
 setContextMenu({ show: false, x: 0, y: 0, path:"", label:"" });
 }}
 className="w-full text-left px-4 py-2 hover:bg-white/10 transition-colors flex items-center gap-2 cursor-pointer"
 >
 <PlusCircle className="w-3.5 h-3.5 text-slate-400" />
 Open in New Tab
 </button>
 </div>
 )}
 </aside>
 );
}

// ── Password Reset Modal ──
interface PasswordResetModalProps {
 show: boolean;
 onClose: () => void;
}

function PasswordResetModal({ show, onClose }: PasswordResetModalProps) {
 const [currentPassword, setCurrentPassword] = useState("");
 const [newPassword, setNewPassword] = useState("");
 const [confirmNewPassword, setConfirmNewPassword] = useState("");
 const [error, setError] = useState("");
 const [success, setSuccess] = useState("");
 const [loading, setLoading] = useState(false);
 const [showCurrent, setShowCurrent] = useState(false);
 const [showNew, setShowNew] = useState(false);

 useEffect(() => {
 if (show) {
 setCurrentPassword("");
 setNewPassword("");
 setConfirmNewPassword("");
 setError("");
 setSuccess("");
 setLoading(false);
 }
 }, [show]);

 if (!show) return null;

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setError("");
 setSuccess("");

 if (!currentPassword) {
 setError("Current password is required.");
 return;
 }
 if (newPassword.length < 6) {
 setError("New password must be at least 6 characters.");
 return;
 }
 if (newPassword !== confirmNewPassword) {
 setError("New passwords do not match.");
 return;
 }

 setLoading(true);
 try {
 const res = await fetch("/api/users/reset-password", {
 method:"POST",
 headers: {
"Content-Type":"application/json",
 },
 body: JSON.stringify({
 currentPassword,
 newPassword,
 confirmNewPassword,
 }),
 });

 if (res.ok) {
 setSuccess("Password reset successfully! Logging you out to renew session...");
 setTimeout(() => {
 localStorage.removeItem("demo_user");
 localStorage.removeItem("timesheet_user");
 window.location.href ="/login";
 }, 1500);
 } else {
 const errData = await res.json().catch(() => ({}));
 setError(errData.error ||"Failed to reset password.");
 }
 } catch (err) {
 console.error(err);
 setError("An unexpected error occurred. Please check your connection and try again.");
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
 <div className="bg-white dark:bg-[#1A2332] rounded-2xl border border-border dark:border-[#2D3B55] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
 {/* Header */}
 <div className="px-6 py-4 bg-slate-50 dark:bg-[#111827] border-b border-border dark:border-[#2D3B55] flex items-center justify-between">
 <div className="flex items-center gap-2 text-left">
 <Lock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
 <h2 className="text-base font-bold text-slate-800 dark:text-white">Reset Password</h2>
 </div>
 <button
 type="button"
 onClick={onClose}
 className="text-slate-400 dark:text-[#94A3B8] hover:text-slate-600 dark:hover:text-white text-xl font-bold p-1 rounded hover:bg-slate-100 dark:hover:bg-[#111827] transition-colors"
 >
 <X className="w-4 h-4" />
 </button>
 </div>

 {/* Body */}
 <form onSubmit={handleSubmit} className="p-6 space-y-4 text-left">
 {error && (
 <div className="p-3.5 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs rounded-xl border border-red-100 dark:border-red-900/30 font-semibold animate-shake">
 {error}
 </div>
 )}
 {success && (
 <div className="p-3.5 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 text-xs rounded-xl border border-green-100 dark:border-green-900/30 font-bold animate-fade-in">
 {success}
 </div>
 )}

 {/* Current Password */}
 <div className="space-y-1">
 <label className="block text-[10px] font-semibold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wider">
 Current Password
 </label>
 <div className="relative">
 <input
 type={showCurrent ?"text" :"password"}
 required
 disabled={loading || !!success}
 value={currentPassword}
 onChange={(e) => setCurrentPassword(e.target.value)}
 placeholder="Enter current password"
 className="w-full p-2.5 border border-border dark:border-[#2D3B55] rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#111827] dark:text-white transition-all placeholder:text-slate-400/60 dark:placeholder:text-slate-600/50"
 />
 <button
 type="button"
 onClick={() => setShowCurrent(!showCurrent)}
 className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:text-[#94A3B8] dark:hover:text-white transition-colors"
 >
 {showCurrent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
 </button>
 </div>
 </div>

 {/* New Password */}
 <div className="space-y-1">
 <label className="block text-[10px] font-semibold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wider">
 New Password
 </label>
 <div className="relative">
 <input
 type={showNew ?"text" :"password"}
 required
 disabled={loading || !!success}
 value={newPassword}
 onChange={(e) => setNewPassword(e.target.value)}
 placeholder="Minimum 6 characters"
 className="w-full p-2.5 border border-[#D1D5DB] dark:border-[#2D3B55] rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#111827] dark:text-white transition-all placeholder:text-slate-400/60 dark:placeholder:text-slate-600/50"
 />
 <button
 type="button"
 onClick={() => setShowNew(!showNew)}
 className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:text-[#94A3B8] dark:hover:text-white transition-colors"
 >
 {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
 </button>
 </div>
 </div>

 {/* Confirm New Password */}
 <div className="space-y-1">
 <label className="block text-[10px] font-semibold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wider">
 Confirm New Password
 </label>
 <input
 type={showNew ?"text" :"password"}
 required
 disabled={loading || !!success}
 value={confirmNewPassword}
 onChange={(e) => setConfirmNewPassword(e.target.value)}
 placeholder="Confirm new password"
 className="w-full p-2.5 border border-border dark:border-[#2D3B55] rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#111827] dark:text-white transition-all placeholder:text-slate-400/60 dark:placeholder:text-slate-600/50"
 />
 </div>

 {/* Footer Buttons */}
 <div className="pt-2 flex justify-end gap-2 border-t border-border dark:border-[#2D3B55]">
 <button
 type="button"
 onClick={onClose}
 disabled={loading || !!success}
 className="px-4 py-2 border border-border dark:border-[#2D3B55] rounded-xl text-xs bg-white dark:bg-[#1A2332] text-slate-700 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#111827] transition-colors font-semibold"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={loading || !!success}
 className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40"
 >
 {loading && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
 {loading ?"Updating..." :"Update Password"}
 </button>
 </div>
 </form>
 </div>
 </div>
 );
}
