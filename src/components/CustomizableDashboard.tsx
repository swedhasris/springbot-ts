import React, { useEffect, useState } from"react";
import { Link } from"react-router-dom";
import { Settings, Save, RotateCcw, Plus, Trash2, ArrowUp, ArrowDown, ShieldAlert, Sparkles, Lock, Unlock, Eye } from"lucide-react";
import { Button } from"@/components/ui/button";
import AnalyticsCard from"./AnalyticsCard";
import PerformanceMetric from"./PerformanceMetric";
import AnalyticsChart from"./AnalyticsChart";
import RecentActivityList from"./RecentActivityList";
import MyTasksList from"./MyTasksList";
import QuickActions from"./QuickActions";

interface CustomizableDashboardProps {
 data: any;
 userUid: string;
 role: string;
 validBreaches: any[];
}

const ALL_AVAILABLE_WIDGETS = [
"Quick Actions",
"Open Tickets",
"Closed Tickets",
"Pending Tickets",
"SLA Compliance",
"Escalated Tickets",
"Ticket Trend Chart",
"Category Distribution Chart",
"Status Distribution Chart",
"Performance Metrics",
"Recent Activity Log",
"My Tasks List"
];

const WIDGET_WIDTHS: Record<string, string> = {
"Quick Actions":"col-span-full",
"Open Tickets":"col-span-1",
"Closed Tickets":"col-span-1",
"Pending Tickets":"col-span-1",
"SLA Compliance":"col-span-1",
"Escalated Tickets":"col-span-1",
"Ticket Trend Chart":"col-span-1 lg:col-span-2",
"Category Distribution Chart":"col-span-1 lg:col-span-2",
"Status Distribution Chart":"col-span-1 lg:col-span-2",
"Performance Metrics":"col-span-full",
"Recent Activity Log":"col-span-1 lg:col-span-2",
"My Tasks List":"col-span-1 lg:col-span-2"
};

export function CustomizableDashboard({ data, userUid, role, validBreaches }: CustomizableDashboardProps) {
 const [layout, setLayout] = useState<string[]>([]);
 const [isEditing, setIsEditing] = useState(false);
 const [loading, setLoading] = useState(false);
 const [message, setMessage] = useState<{ text: string; type:"success" |"error" } | null>(null);

 // Admin template form states
 const [showTemplateModal, setShowTemplateModal] = useState(false);
 const [templateName, setTemplateName] = useState("");
 const [templateRole, setTemplateRole] = useState(role ||"user");
 const [templateLocked, setTemplateLocked] = useState(false);

 const isAdmin = role ==="admin" || role ==="super_admin" || role ==="ultra_super_admin";

 const fetchLayout = () => {
 setLoading(true);
 fetch(`/api/dashboard/layout?userUid=${userUid}&role=${role}`)
 .then(res => res.json())
 .then(data => {
 if (Array.isArray(data)) {
 setLayout(data);
 } else {
 // Fallback default layout
 setLayout([
"Quick Actions",
"Open Tickets",
"Closed Tickets",
"Pending Tickets",
"SLA Compliance",
"Ticket Trend Chart",
"Performance Metrics",
"Recent Activity Log",
"My Tasks List"
 ]);
 }
 })
 .catch(err => {
 console.error("Error fetching dashboard layout:", err);
 })
 .finally(() => setLoading(false));
 };

 useEffect(() => {
 if (userUid) {
 fetchLayout();
 }
 }, [userUid, role]);

 const handleSaveLayout = async () => {
 setLoading(true);
 try {
 const res = await fetch("/api/dashboard/layout", {
 method:"POST",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify({ userUid, layout })
 });
 const result = await res.json();
 if (result.success) {
 setMessage({ text:"Dashboard layout saved successfully!", type:"success" });
 setIsEditing(false);
 } else {
 setMessage({ text: result.error ||"Failed to save layout", type:"error" });
 }
 } catch (e: any) {
 setMessage({ text: e.message, type:"error" });
 } finally {
 setLoading(false);
 setTimeout(() => setMessage(null), 4000);
 }
 };

 const handleResetLayout = async () => {
 if (!confirm("Are you sure you want to reset your layout to the template default?")) return;
 setLoading(true);
 try {
 const res = await fetch(`/api/dashboard/layout?userUid=${userUid}`, {
 method:"DELETE"
 });
 const result = await res.json();
 if (result.success) {
 setMessage({ text:"Dashboard reset to default template!", type:"success" });
 setIsEditing(false);
 fetchLayout();
 } else {
 setMessage({ text: result.error ||"Failed to reset layout", type:"error" });
 }
 } catch (e: any) {
 setMessage({ text: e.message, type:"error" });
 } finally {
 setLoading(false);
 setTimeout(() => setMessage(null), 4000);
 }
 };

 const handleSaveTemplate = async () => {
 if (!templateName.trim()) {
 alert("Please enter a template name");
 return;
 }
 setLoading(true);
 try {
 const res = await fetch("/api/dashboard/templates", {
 method:"POST",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify({
 name: templateName,
 role: templateRole,
 layout: layout,
 isLocked: templateLocked
 })
 });
 const result = await res.json();
 if (result.success) {
 setMessage({ text: `Template"${templateName}" saved for role ${templateRole}!`, type:"success" });
 setShowTemplateModal(false);
 } else {
 setMessage({ text: result.error ||"Failed to save template", type:"error" });
 }
 } catch (e: any) {
 setMessage({ text: e.message, type:"error" });
 } finally {
 setLoading(false);
 setTimeout(() => setMessage(null), 4000);
 }
 };

 // Rearrange items in layout array
 const moveWidget = (index: number, direction:"up" |"down") => {
 const nextIndex = direction ==="up" ? index - 1 : index + 1;
 if (nextIndex < 0 || nextIndex >= layout.length) return;

 const newLayout = [...layout];
 const temp = newLayout[index];
 newLayout[index] = newLayout[nextIndex];
 newLayout[nextIndex] = temp;
 setLayout(newLayout);
 };

 const removeWidget = (index: number) => {
 const newLayout = layout.filter((_, i) => i !== index);
 setLayout(newLayout);
 };

 const addWidget = (widgetName: string) => {
 if (layout.includes(widgetName)) return;
 setLayout([...layout, widgetName]);
 };

 const inactiveWidgets = ALL_AVAILABLE_WIDGETS.filter(w => !layout.includes(w));

 const renderWidget = (widgetName: string) => {
 switch (widgetName) {
 case"Quick Actions":
 return <QuickActions />;
 case"Open Tickets":
 return (
 <Link to="/tickets?filter=open" className="block cursor-pointer w-full h-full">
 <AnalyticsCard title="Open Incidents" value={data.cards.open} />
 </Link>
 );
 case"Closed Tickets":
 return (
 <Link to="/tickets?filter=closed" className="block cursor-pointer w-full h-full">
 <AnalyticsCard title="Closed Incidents" value={data.cards.closed} />
 </Link>
 );
 case"Pending Tickets":
 return (
 <Link to="/tickets?filter=pending" className="block cursor-pointer w-full h-full">
 <AnalyticsCard title="Pending Incidents" value={data.cards.pending} />
 </Link>
 );
 case"SLA Compliance":
 return (
 <Link to="/tickets?filter=overdue" className="block cursor-pointer w-full h-full">
 <AnalyticsCard title="Overdue Incidents" value={data.cards.overdue} />
 </Link>
 );
 case"Escalated Tickets":
 return (
 <div className="block cursor-pointer w-full h-full">
 <AnalyticsCard title="Total SLA Breaches" value={validBreaches.length} />
 </div>
 );
 case"Ticket Trend Chart":
 return <AnalyticsChart type="line" title="Ticket Trends (Weekly)" data={data.charts.trend} />;
 case"Category Distribution Chart":
 return <AnalyticsChart type="pie" title="Category Distribution" data={data.charts.categoryDistribution} />;
 case"Status Distribution Chart":
 return <AnalyticsChart type="pie" title="Ticket Status Distribution" data={data.charts.statusDistribution} />;
 case"Performance Metrics":
 return (
 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full">
 <PerformanceMetric label="Ticket Completion %" value={data.performance.completionPercentage} />
 <PerformanceMetric label="Avg Resolution Time" value={data.performance.avgResolutionTime} />
 <PerformanceMetric label="Tickets Completed Today" value={data.performance.ticketsToday} />
 <PerformanceMetric label="Weekly Performance" value={data.performance.weekly} />
 <PerformanceMetric label="Monthly Performance" value={data.performance.monthly} />
 <PerformanceMetric label="Productivity Score" value={data.performance.productivityScore} />
 </div>
 );
 case"Recent Activity Log":
 return <RecentActivityList items={data.recentActivity} />;
 case"My Tasks List":
 return <MyTasksList tasks={data.myTasks} />;
 default:
 return null;
 }
 };

 return (
 <div className="space-y-6">
 {/* ── Toolbar / Controls ── */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-muted/20 dark:bg-sn-sidebar/40 border border-border/40 dark:border-white/5 rounded-2xl backdrop-blur-md">
 <div className="flex items-center gap-2">
 <Settings className={isEditing ?"text-sn-green animate-spin" :"text-muted-foreground"} size={18} />
 <span className="text-sm font-semibold uppercase tracking-wider">
 {isEditing ?"Editing Viewport Layout" :"Customizable Dashboard Engine"}
 </span>
 </div>

 <div className="flex flex-wrap items-center gap-2">
 {isEditing ? (
 <>
 <Button
 onClick={handleSaveLayout}
 disabled={loading}
 className="bg-sn-green text-sn-dark hover:bg-sn-green/90 text-[10px] font-semibold uppercase tracking-widest px-4 h-9 rounded-xl"
 >
 <Save size={12} className="mr-2" /> Save Layout
 </Button>
 {isAdmin && (
 <Button
 onClick={() => setShowTemplateModal(true)}
 disabled={loading}
 className="bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-semibold uppercase tracking-widest px-4 h-9 rounded-xl"
 >
 <Lock size={12} className="mr-2" /> Save as Template
 </Button>
 )}
 <Button
 onClick={handleResetLayout}
 disabled={loading}
 variant="outline"
 className="border-red-500/20 text-red-500 hover:bg-red-500/10 text-[10px] font-semibold uppercase tracking-widest px-4 h-9 rounded-xl"
 >
 <RotateCcw size={12} className="mr-2" /> Reset Default
 </Button>
 <Button
 onClick={() => {
 setIsEditing(false);
 fetchLayout(); // Restore unsaved layout changes
 }}
 variant="outline"
 className="border-white/10 text-text-dim hover:text-foreground text-[10px] font-semibold uppercase tracking-widest px-4 h-9 rounded-xl"
 >
 Cancel
 </Button>
 </>
 ) : (
 <Button
 onClick={() => setIsEditing(true)}
 variant="outline"
 className="border-sn-green/20 text-sn-green hover:bg-sn-green/10 text-[10px] font-semibold uppercase tracking-widest px-4 h-9 rounded-xl"
 >
 Configure Grid Widgets
 </Button>
 )}
 </div>
 </div>

 {/* ── Active Layout Grid ── */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
 {layout.map((widgetName, index) => {
 const widthClass = WIDGET_WIDTHS[widgetName] ||"col-span-1";
 return (
 <div
 key={`${widgetName}-${index}`}
 className={`relative group/widget ${widthClass} border ${isEditing ?"border-dashed border-sn-green/40 bg-sn-green/[0.02] p-2 rounded-[22px]" :"border-transparent"}`}
 >
 {/* Widget Edit Bar Overlay */}
 {isEditing && (
 <div className="absolute top-4 right-4 z-40 bg-black/80 backdrop-blur-md rounded-xl p-1 border border-white/10 flex items-center gap-1 shadow-lg opacity-80 hover:opacity-100 transition-opacity">
 <span className="text-[9px] font-semibold text-muted-foreground uppercase px-2">{widgetName}</span>
 <button
 disabled={index === 0}
 onClick={() => moveWidget(index,"up")}
 className="p-1 hover:bg-white/10 rounded text-white disabled:opacity-30"
 title="Move Left/Up"
 >
 <ArrowUp size={12} />
 </button>
 <button
 disabled={index === layout.length - 1}
 onClick={() => moveWidget(index,"down")}
 className="p-1 hover:bg-white/10 rounded text-white disabled:opacity-30"
 title="Move Right/Down"
 >
 <ArrowDown size={12} />
 </button>
 <button
 onClick={() => removeWidget(index)}
 className="p-1 hover:bg-red-500/20 rounded text-red-400"
 title="Remove Widget"
 >
 <Trash2 size={12} />
 </button>
 </div>
 )}

 <div className={isEditing ?"pointer-events-none opacity-60" :""}>
 {renderWidget(widgetName)}
 </div>
 </div>
 );
 })}
 </div>

 {/* ── Inactive Widgets / Library Panel (shown in edit mode) ── */}
 {isEditing && inactiveWidgets.length > 0 && (
 <div className="p-6 bg-sn-sidebar/35 border border-white/5 rounded-3xl space-y-4">
 <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
 <Plus size={14} className="text-sn-green" /> Widget Library (Available to Add)
 </h3>
 <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
 {inactiveWidgets.map((widgetName) => (
 <button
 key={widgetName}
 onClick={() => addWidget(widgetName)}
 className="p-3 bg-sn-dark border border-white/5 hover:border-sn-green/30 hover:bg-sn-green/5 rounded-xl text-left transition-all duration-200 group flex items-center justify-between"
 >
 <span className="text-[11px] font-semibold text-text-dim group-hover:text-foreground">{widgetName}</span>
 <Plus size={12} className="text-muted-foreground group-hover:text-sn-green transition-colors" />
 </button>
 ))}
 </div>
 </div>
 )}

 {/* ── Status Messages ── */}
 {message && (
 <div
 className={`fixed bottom-8 right-8 px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-2 z-50 backdrop-blur-xl border text-xs font-semibold ${
 message.type ==="success"
 ?"bg-green-500/10 text-green-500 border-green-500/20"
 :"bg-red-500/10 text-red-500 border-red-500/20"
 }`}
 >
 {message.text}
 </div>
 )}

 {/* ── Save Template Dialog (Admins Only) ── */}
 {showTemplateModal && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
 <div className="w-full max-w-md bg-sn-sidebar border border-white/10 rounded-[32px] shadow-2xl p-8 space-y-6">
 <div className="space-y-1">
 <h3 className="text-xl font-semibold flex items-center gap-2">
 <Sparkles className="text-purple-500" size={20} /> Save Role Dashboard Template
 </h3>
 <p className="text-xs text-muted-foreground font-medium">
 Create a locked default configuration template for specific user roles.
 </p>
 </div>

 <div className="space-y-4">
 <div className="space-y-2">
 <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Template Name</label>
 <input
 type="text"
 placeholder="e.g. Agent Default, Operations Dashboard"
 value={templateName}
 onChange={e => setTemplateName(e.target.value)}
 className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-2.5 text-xs font-bold outline-none"
 />
 </div>

 <div className="space-y-2">
 <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Assign to User Role</label>
 <select
 value={templateRole}
 onChange={e => setTemplateRole(e.target.value)}
 className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-2.5 text-xs font-bold outline-none"
 >
 <option value="user">User / End Customer</option>
 <option value="agent">Agent / Support Engineer</option>
 <option value="admin">Administrator / Manager</option>
 </select>
 </div>

 <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl">
 <div>
 <div className="text-xs font-semibold">Lock Layout Configuration</div>
 <div className="text-[9px] text-muted-foreground">Users of this role cannot override locked widgets.</div>
 </div>
 <button
 onClick={() => setTemplateLocked(!templateLocked)}
 className={`p-1.5 rounded-lg border transition-colors ${
 templateLocked ?"bg-purple-600/20 border-purple-500 text-purple-500" :"border-white/5 text-muted-foreground"
 }`}
 >
 {templateLocked ? <Lock size={16} /> : <Unlock size={16} />}
 </button>
 </div>
 </div>

 <div className="flex justify-end gap-2.5 pt-4">
 <Button
 variant="outline"
 onClick={() => setShowTemplateModal(false)}
 className="border-white/5 text-text-dim hover:text-foreground text-[10px] font-semibold uppercase px-4 h-9 rounded-xl"
 >
 Cancel
 </Button>
 <Button
 onClick={handleSaveTemplate}
 className="bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-semibold uppercase px-4 h-9 rounded-xl"
 >
 Save Template
 </Button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
