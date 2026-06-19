import React, { useEffect, useState } from"react";
import { Sparkles, Calendar, TrendingUp, BarChart2, Download, Plus, Trash2, Edit3, CheckCircle2, ChevronRight } from"lucide-react";
import { Button } from"@/components/ui/button";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from"recharts";
import { useAuth } from"../contexts/AuthContext";

interface Target {
 id: string;
 targetType: string;
 targetPeriod: string;
 metricName: string;
 targetValue: number;
 actualValue: number;
 teamId?: string;
 assigneeUid?: string;
}

interface Forecast {
 id: string;
 forecastPeriod: string;
 predictedVolume: number;
 predictedSlaBreaches: number;
 requiredFtes: number;
}

interface CalendarEvent {
 id: string;
 title: string;
 eventType: string;
 eventDate: string;
 details?: string;
}

export function ForecastingPlanning() {
 const { user, profile } = useAuth();
 const [targets, setTargets] = useState<Target[]>([]);
 const [forecasts, setForecasts] = useState<Forecast[]>([]);
 const [events, setEvents] = useState<CalendarEvent[]>([]);
 const [loading, setLoading] = useState(false);

 // Form states for creating a Target
 const [showTargetModal, setShowTargetModal] = useState(false);
 const [newTarget, setNewTarget] = useState({
 targetType:"Global",
 targetPeriod:"2026-Q3",
 metricName:"SLA Resolution Rate",
 targetValue: 95.0,
 actualValue: 92.5,
 assigneeUid: user?.uid ||""
 });

 // Form states for Calendar Event
 const [showEventModal, setShowEventModal] = useState(false);
 const [newEvent, setNewEvent] = useState({
 title:"Major Infrastructure Deployment",
 eventType:"Release",
 eventDate: new Date().toISOString().split("T")[0],
 details:"Migrating main cluster to premium instances"
 });

 const [toast, setToast] = useState<{ text: string; type:"success" |"error" } | null>(null);

 const isAdmin = profile?.role ==="admin" || profile?.role ==="super_admin" || profile?.role ==="ultra_super_admin";

 const fetchData = async () => {
 setLoading(true);
 try {
 const [tgtRes, fcastRes, evRes] = await Promise.all([
 fetch("/api/planning/targets"),
 fetch("/api/planning/forecasts"),
 fetch("/api/planning/calendar-events")
 ]);

 if (tgtRes.ok) {
 const tgts = await tgtRes.json();
 // Spring Boot keys mapping
 setTargets(tgts.map((t: any) => ({
 id: t.ID || t.id,
 targetType: t.TARGET_TYPE || t.targetType,
 targetPeriod: t.TARGET_PERIOD || t.targetPeriod,
 metricName: t.METRIC_NAME || t.metricName,
 targetValue: t.TARGET_VALUE || t.targetValue,
 actualValue: t.ACTUAL_VALUE || t.actualValue,
 teamId: t.TEAM_ID || t.teamId,
 assigneeUid: t.ASSIGNEE_UID || t.assigneeUid
 })));
 }

 if (fcastRes.ok) {
 const fcasts = await fcastRes.json();
 setForecasts(fcasts.map((f: any) => ({
 id: f.ID || f.id,
 forecastPeriod: f.FORECAST_PERIOD || f.forecastPeriod,
 predictedVolume: f.PREDICTED_VOLUME || f.predictedVolume,
 predictedSlaBreaches: f.PREDICTED_SLA_BREACHES || f.predictedSlaBreaches,
 requiredFtes: f.REQUIRED_FTES || f.requiredFtes
 })));
 }

 if (evRes.ok) {
 const evs = await evRes.json();
 setEvents(evs.map((e: any) => ({
 id: e.ID || e.id,
 title: e.TITLE || e.title,
 eventType: e.EVENT_TYPE || e.eventType,
 eventDate: e.EVENT_DATE || e.eventDate,
 details: e.DETAILS || e.details
 })));
 }
 } catch (err) {
 console.error("Error loading forecasting planning data:", err);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 fetchData();
 }, []);

 const handleSaveTarget = async (e: React.FormEvent) => {
 e.preventDefault();
 try {
 const res = await fetch("/api/planning/targets", {
 method:"POST",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify(newTarget)
 });
 const data = await res.json();
 if (data.success) {
 setToast({ text:"Target metric configured successfully!", type:"success" });
 setShowTargetModal(false);
 fetchData();
 }
 } catch (err: any) {
 setToast({ text: err.message, type:"error" });
 } finally {
 setTimeout(() => setToast(null), 4000);
 }
 };

 const handleDeleteTarget = async (id: string) => {
 if (!confirm("Are you sure you want to delete this target?")) return;
 try {
 const res = await fetch(`/api/planning/targets/${id}`, {
 method:"DELETE"
 });
 const data = await res.json();
 if (data.success) {
 setToast({ text:"Target metric removed", type:"success" });
 fetchData();
 }
 } catch (err: any) {
 setToast({ text: err.message, type:"error" });
 } finally {
 setTimeout(() => setToast(null), 4000);
 }
 };

 const handleSaveEvent = async (e: React.FormEvent) => {
 e.preventDefault();
 try {
 const res = await fetch("/api/planning/calendar-events", {
 method:"POST",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify(newEvent)
 });
 const data = await res.json();
 if (data.success) {
 setToast({ text:"Milestone event scheduled successfully!", type:"success" });
 setShowEventModal(false);
 fetchData();
 }
 } catch (err: any) {
 setToast({ text: err.message, type:"error" });
 } finally {
 setTimeout(() => setToast(null), 4000);
 }
 };

 const handleExportCSV = () => {
 let csvContent ="data:text/csv;charset=utf-8,";
 csvContent +="Type,Period,Metric/Title,Target/Value,Actual/Date,Details\n";

 targets.forEach(t => {
 csvContent += `Target,${t.targetPeriod},${t.metricName},${t.targetValue},${t.actualValue},${t.targetType}\n`;
 });

 forecasts.forEach(f => {
 csvContent += `Forecast,${f.forecastPeriod},Predicted Vol: ${f.predictedVolume},Breaches: ${f.predictedSlaBreaches},FTE: ${f.requiredFtes},-\n`;
 });

 events.forEach(e => {
 csvContent += `Milestone,-,${e.title},-,${e.eventDate},${e.eventType} - ${e.details ||""}\n`;
 });

 const encodedUri = encodeURI(csvContent);
 const link = document.createElement("a");
 link.setAttribute("href", encodedUri);
 link.setAttribute("download", `forecasting_planning_data_${Date.now()}.csv`);
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 };

 const handleExportMock = (type:"excel" |"pdf") => {
 setToast({ text: `Generating ${type.toUpperCase()} report bundle...`, type:"success" });
 setTimeout(() => {
 const link = document.createElement("a");
 // Simulate file download
 link.setAttribute("href","data:text/plain;charset=utf-8,Mock Report Bundle Export Completed");
 link.setAttribute("download", `forecasting_planning_export_${Date.now()}.${type ==="excel" ?"xlsx" :"pdf"}`);
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 setToast({ text: `${type.toUpperCase()} downloaded successfully!`, type:"success" });
 }, 1500);
 };

 return (
 <div className="max-w-[1600px] mx-auto min-h-[90vh] flex flex-col gap-6 pb-20">
 {/* Page Header */}
 <div className="relative p-12 bg-sn-sidebar rounded-[40px] border border-white/5 shadow-2xl overflow-hidden group flex flex-col sm:flex-row items-center justify-between gap-6">
 <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent pointer-events-none" />
 <div className="space-y-2 max-w-xl">
 <div className="flex items-center gap-2 text-blue-500">
 <TrendingUp size={16} />
 <span className="text-[10px] font-semibold uppercase tracking-[0.4em]">HaloITSM Intelligence</span>
 </div>
 <h1 className="text-4xl font-semibold tracking-tighter">Forecasting & Targets</h1>
 <p className="text-text-dim text-sm font-medium">Predictive SLA capacity planning, yearly KPI benchmarks, and operations scheduling calendar.</p>
 </div>

 <div className="flex items-center gap-2.5 shrink-0">
 <Button onClick={handleExportCSV} className="bg-sn-dark text-white border border-white/10 hover:bg-white/5 h-11 px-5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2">
 <Download size={14} /> CSV
 </Button>
 <Button onClick={() => handleExportMock("excel")} className="bg-emerald-600 hover:bg-emerald-700 text-white h-11 px-5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2">
 <Download size={14} /> Excel
 </Button>
 <Button onClick={() => handleExportMock("pdf")} className="bg-red-600 hover:bg-red-700 text-white h-11 px-5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2">
 <Download size={14} /> PDF
 </Button>
 </div>
 </div>

 <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
 {/* Left column: Targets Panel */}
 <div className="xl:col-span-1 bg-sn-sidebar rounded-[32px] border border-white/5 p-8 flex flex-col justify-between space-y-6">
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <h2 className="text-xl font-semibold flex items-center gap-2">
 <BarChart2 className="text-sn-green" size={20} /> Target Thresholds
 </h2>
 {isAdmin && (
 <button onClick={() => setShowTargetModal(true)} className="p-2 bg-sn-green/10 text-sn-green rounded-xl hover:scale-105 transition-all">
 <Plus size={16} />
 </button>
 )}
 </div>
 <p className="text-xs text-muted-foreground font-medium">Global vs Team KPI standards for SLA, capacity load, and user ratings.</p>
 </div>

 <div className="space-y-5 flex-1 overflow-y-auto max-h-[400px] pr-2">
 {targets.map((tgt) => {
 const progress = Math.min(100, Math.round((tgt.actualValue / tgt.targetValue) * 100));
 const progressColor = progress >= 95 ?"bg-sn-green" : progress >= 80 ?"bg-blue-500" :"bg-red-500";
 return (
 <div key={tgt.id} className="p-4 bg-black/20 rounded-2xl border border-white/5 relative group/item">
 {isAdmin && (
 <button onClick={() => handleDeleteTarget(tgt.id)} className="absolute top-4 right-4 opacity-0 group-hover/item:opacity-100 p-1 bg-red-500/10 text-red-500 rounded hover:scale-115 transition-all">
 <Trash2 size={12} />
 </button>
 )}
 <div className="text-[10px] font-semibold text-blue-500 uppercase tracking-widest mb-1">{tgt.targetType} • {tgt.targetPeriod}</div>
 <h4 className="text-sm font-semibold text-foreground mb-3">{tgt.metricName}</h4>
 
 <div className="flex justify-between text-[11px] font-bold mb-1.5">
 <span className="text-muted-foreground">Target: {tgt.targetValue}%</span>
 <span className="text-foreground">Actual: {tgt.actualValue}%</span>
 </div>
 <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden">
 <div className={`h-full ${progressColor}`} style={{ width: `${progress}%` }} />
 </div>
 </div>
 );
 })}
 </div>
 </div>

 {/* Center column: Forecasting Charts */}
 <div className="xl:col-span-2 bg-sn-sidebar rounded-[32px] border border-white/5 p-8 space-y-6">
 <div className="space-y-1">
 <h2 className="text-xl font-semibold flex items-center gap-2">
 <TrendingUp className="text-blue-500" size={20} /> Machine Learning Volume Forecast
 </h2>
 <p className="text-xs text-muted-foreground font-medium">Predicting incident volumes and required staff count over next periods.</p>
 </div>

 {forecasts.length > 0 ? (
 <div className="h-[320px] bg-black/20 rounded-2xl p-4 border border-white/5">
 <ResponsiveContainer width="100%" height="100%">
 <AreaChart data={forecasts}>
 <defs>
 <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
 <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
 <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
 </linearGradient>
 <linearGradient id="fteGrad" x1="0" y1="0" x2="0" y2="1">
 <stop offset="5%" stopColor="#81b532" stopOpacity={0.3} />
 <stop offset="95%" stopColor="#81b532" stopOpacity={0} />
 </linearGradient>
 </defs>
 <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" />
 <XAxis dataKey="forecastPeriod" stroke="#ffffff40" fontSize={11} />
 <YAxis stroke="#ffffff40" fontSize={11} />
 <Tooltip contentStyle={{ backgroundColor:"#121420", borderColor:"#ffffff10" }} />
 <Legend verticalAlign="top" height={36} />
 <Area type="monotone" name="Incident Volume Forecast" dataKey="predictedVolume" stroke="#3b82f6" fillOpacity={1} fill="url(#volGrad)" strokeWidth={2} />
 <Area type="monotone" name="Required Headcount (FTE)" dataKey="requiredFtes" stroke="#81b532" fillOpacity={1} fill="url(#fteGrad)" strokeWidth={2} />
 </AreaChart>
 </ResponsiveContainer>
 </div>
 ) : (
 <div className="h-[320px] flex items-center justify-center text-xs text-muted-foreground">Generating forecasting models...</div>
 )}
 </div>
 </div>

 {/* Row 2: Workload Calendar Schedule */}
 <div className="bg-sn-sidebar rounded-[32px] border border-white/5 p-8 space-y-6">
 <div className="flex items-center justify-between">
 <div className="space-y-1">
 <h2 className="text-xl font-semibold flex items-center gap-2">
 <Calendar className="text-purple-500" size={20} /> Workload Milestone Schedule
 </h2>
 <p className="text-xs text-muted-foreground font-medium">Sync scheduled rollouts, training exercises, and system changes against resource limits.</p>
 </div>
 {isAdmin && (
 <Button onClick={() => setShowEventModal(true)} className="bg-sn-green text-sn-dark hover:bg-sn-green/90 text-[10px] font-semibold uppercase px-4 h-9 rounded-xl">
 <Plus size={12} className="mr-2" /> Add Schedule Event
 </Button>
 )}
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {events.map((evt) => (
 <div key={evt.id} className="p-5 bg-black/20 rounded-[24px] border border-white/5 flex flex-col justify-between hover:border-purple-500/30 transition-all duration-300">
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[9px] font-semibold uppercase border border-purple-500/20">{evt.eventType}</span>
 <span className="text-[10px] text-muted-foreground font-bold">{evt.eventDate}</span>
 </div>
 <h4 className="text-sm font-semibold text-foreground">{evt.title}</h4>
 <p className="text-xs text-muted-foreground font-medium leading-relaxed">{evt.details ||"No details provided."}</p>
 </div>
 <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-[10px] font-bold text-muted-foreground">
 <span>Milestone</span>
 <ChevronRight size={14} className="text-sn-green" />
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Toast Notification */}
 {toast && (
 <div className={`fixed bottom-8 right-8 px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-2 z-50 backdrop-blur-xl border text-xs font-semibold ${
 toast.type ==="success" ?"bg-green-500/10 text-green-500 border-green-500/25" :"bg-red-500/10 text-red-500 border-red-500/25"
 }`}>
 {toast.text}
 </div>
 )}

 {/* Target Modal */}
 {showTargetModal && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
 <form onSubmit={handleSaveTarget} className="w-full max-w-md bg-sn-sidebar border border-white/10 rounded-[32px] shadow-2xl p-8 space-y-6">
 <h3 className="text-xl font-semibold">Configure KPI Target</h3>
 
 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Target Type</label>
 <select
 value={newTarget.targetType}
 onChange={e => setNewTarget({ ...newTarget, targetType: e.target.value })}
 className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-2.5 text-xs font-bold outline-none"
 >
 <option value="Global">Global</option>
 <option value="Team">Team</option>
 <option value="Individual">Individual</option>
 </select>
 </div>

 <div className="space-y-2">
 <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Period</label>
 <input
 type="text"
 value={newTarget.targetPeriod}
 onChange={e => setNewTarget({ ...newTarget, targetPeriod: e.target.value })}
 className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-2.5 text-xs font-bold outline-none"
 />
 </div>
 </div>

 <div className="space-y-2">
 <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Metric Name</label>
 <input
 type="text"
 value={newTarget.metricName}
 onChange={e => setNewTarget({ ...newTarget, metricName: e.target.value })}
 className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-2.5 text-xs font-bold outline-none"
 />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Target Value (%)</label>
 <input
 type="number"
 step="0.1"
 value={newTarget.targetValue}
 onChange={e => setNewTarget({ ...newTarget, targetValue: parseFloat(e.target.value) || 0 })}
 className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-2.5 text-xs font-bold outline-none"
 />
 </div>

 <div className="space-y-2">
 <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Actual Value (%)</label>
 <input
 type="number"
 step="0.1"
 value={newTarget.actualValue}
 onChange={e => setNewTarget({ ...newTarget, actualValue: parseFloat(e.target.value) || 0 })}
 className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-2.5 text-xs font-bold outline-none"
 />
 </div>
 </div>
 </div>

 <div className="flex justify-end gap-2.5 pt-4">
 <Button type="button" variant="outline" onClick={() => setShowTargetModal(false)} className="border-white/5 text-text-dim hover:text-foreground text-[10px] font-semibold uppercase px-4 h-9 rounded-xl">Cancel</Button>
 <Button type="submit" className="bg-sn-green text-sn-dark hover:bg-sn-green/90 text-[10px] font-semibold uppercase px-4 h-9 rounded-xl">Configure</Button>
 </div>
 </form>
 </div>
 )}

 {/* Event Modal */}
 {showEventModal && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
 <form onSubmit={handleSaveEvent} className="w-full max-w-md bg-sn-sidebar border border-white/10 rounded-[32px] shadow-2xl p-8 space-y-6">
 <h3 className="text-xl font-semibold">Schedule Operations Event</h3>
 
 <div className="space-y-4">
 <div className="space-y-2">
 <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Event Title</label>
 <input
 type="text"
 value={newEvent.title}
 onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
 className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-2.5 text-xs font-bold outline-none"
 />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Event Type</label>
 <select
 value={newEvent.eventType}
 onChange={e => setNewEvent({ ...newEvent, eventType: e.target.value })}
 className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-2.5 text-xs font-bold outline-none"
 >
 <option value="Release">Release Deployment</option>
 <option value="Training">Team Training</option>
 <option value="Audit">Compliance Audit</option>
 <option value="Maintenance">Maintenance Window</option>
 </select>
 </div>

 <div className="space-y-2">
 <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Event Date</label>
 <input
 type="date"
 value={newEvent.eventDate}
 onChange={e => setNewEvent({ ...newEvent, eventDate: e.target.value })}
 className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-2.5 text-xs font-bold outline-none"
 />
 </div>
 </div>

 <div className="space-y-2">
 <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Details / Description</label>
 <textarea
 value={newEvent.details}
 onChange={e => setNewEvent({ ...newEvent, details: e.target.value })}
 rows={3}
 className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-2.5 text-xs font-bold outline-none resize-none"
 />
 </div>
 </div>

 <div className="flex justify-end gap-2.5 pt-4">
 <Button type="button" variant="outline" onClick={() => setShowEventModal(false)} className="border-white/5 text-text-dim hover:text-foreground text-[10px] font-semibold uppercase px-4 h-9 rounded-xl">Cancel</Button>
 <Button type="submit" className="bg-sn-green text-sn-dark hover:bg-sn-green/90 text-[10px] font-semibold uppercase px-4 h-9 rounded-xl">Schedule</Button>
 </div>
 </form>
 </div>
 )}
 </div>
 );
}
