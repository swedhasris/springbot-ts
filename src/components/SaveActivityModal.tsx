import React, { useEffect } from"react";
import { Bot, Save } from"lucide-react";

export interface SessionFormType {
 entryDate: string;
 startTime: string;
 endTime: string;
 minutesWorked: number;
 task: string;
 customTask: string;
 workType: string;
 shortDescription: string;
 description: string;
 notes: string;
 billable: string;
}

interface SaveActivityModalProps {
 show: boolean;
 onClose: () => void;
 sessionForm: SessionFormType;
 setSessionForm: React.Dispatch<React.SetStateAction<SessionFormType>>;
 onSave: () => void;
 savingSession: boolean;
 selectedIncident: string | null;
}

export function SaveActivityModal({
 show,
 onClose,
 sessionForm,
 setSessionForm,
 onSave,
 savingSession,
 selectedIncident
}: SaveActivityModalProps) {
 if (!show) return null;

 const updateDuration = (s: string, e: string) => {
 const parseTime = (t: string) => {
 const [h, m] = t.split(":").map(Number);
 return { h, m };
 };
 if (s && e) {
 const st = parseTime(s);
 const et = parseTime(e);
 const startMinutes = st.h * 60 + st.m;
 const endMinutes = et.h * 60 + et.m;
 let diff = endMinutes - startMinutes;
 if (diff < 0) diff += 24 * 60;
 setSessionForm((f: any) => ({ ...f, minutesWorked: diff }));
 }
 };

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm animate-in fade-in duration-200">
 <div className="bg-white dark:bg-[#1A2332] rounded-2xl border border-border dark:border-[#2D3B55] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
 {/* Header */}
 <div className="px-6 py-4 bg-slate-50 dark:bg-[#111827] border-b border-border dark:border-[#2D3B55] flex items-center justify-between">
 <div className="flex items-center gap-2">
 <Bot className="w-5 h-5 text-blue-600" />
 <h2 className="text-base font-bold text-slate-800 dark:text-white">
 Save AI Activity Details
 {selectedIncident && (
 <span className="ml-2 text-sm text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900/50">
 {selectedIncident}
 </span>
 )}
 </h2>
 </div>
 <button
 type="button"
 onClick={onClose}
 className="text-slate-400 dark:text-[#94A3B8] hover:text-slate-600 dark:hover:text-white text-xl font-bold p-1 rounded hover:bg-slate-100 dark:hover:bg-[#111827] transition-colors"
 >
 ×
 </button>
 </div>

 {/* Body */}
 <div className="p-6 space-y-4 overflow-y-auto flex-1 text-left">
 {/* Date */}
 <div>
 <label className="block text-xs font-bold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wider mb-1">Activity Date</label>
 <input type="date" value={sessionForm.entryDate} onChange={e => setSessionForm(f => ({ ...f, entryDate: e.target.value }))} className="w-full p-2 border border-border dark:border-[#2D3B55] rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#111827] dark:text-white" />
 </div>

 {/* Start Time & End Time & Duration */}
 <div className="grid grid-cols-3 gap-3">
 <div>
 <label className="block text-xs font-bold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wider mb-1">Start Time</label>
 <input type="time" value={sessionForm.startTime} onChange={e => { const val = e.target.value; setSessionForm(f => ({ ...f, startTime: val })); updateDuration(val, sessionForm.endTime); }} className="w-full p-2 border border-border dark:border-[#2D3B55] rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#111827] dark:text-white" />
 </div>
 <div>
 <label className="block text-xs font-bold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wider mb-1">End Time</label>
 <input type="time" value={sessionForm.endTime} onChange={e => { const val = e.target.value; setSessionForm(f => ({ ...f, endTime: val })); updateDuration(sessionForm.startTime, val); }} className="w-full p-2 border border-border dark:border-[#2D3B55] rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#111827] dark:text-white" />
 </div>
 <div>
 <label className="block text-xs font-bold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wider mb-1">Duration (Mins)</label>
 <input type="number" value={sessionForm.minutesWorked} onChange={e => setSessionForm(f => ({ ...f, minutesWorked: parseInt(e.target.value) || 0 }))} className="w-full p-2 border border-border dark:border-[#2D3B55] rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#111827] dark:text-white" />
 </div>
 </div>

 {/* Task */}
 <div>
 <label className="block text-xs font-bold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wider mb-1">Task / Work Type</label>
 <select value={sessionForm.task} onChange={e => setSessionForm(f => ({ ...f, task: e.target.value }))} className="w-full p-2 border border-border dark:border-[#2D3B55] rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#111827] dark:text-white">
 <option value="Ticket Resolution">Ticket Resolution</option>
 <option value="Documentation">Documentation</option>
 <option value="System Maintenance">System Maintenance</option>
 <option value="Meeting">Meeting</option>
 <option value="General Support">General Support</option>
 <option value="Other...">Other...</option>
 </select>
 </div>

 {sessionForm.task ==="Other..." && (
 <div className="animate-in slide-in-from-top-2 duration-150">
 <label className="block text-xs font-bold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wider mb-1">Custom Work Type</label>
 <input type="text" placeholder="Specify your custom task/work type..." value={sessionForm.customTask} onChange={e => setSessionForm(f => ({ ...f, customTask: e.target.value }))} className="w-full p-2 border border-border dark:border-[#2D3B55] rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#111827] dark:text-white" />
 </div>
 )}

 {/* Activity Category */}
 <div>
 <label className="block text-xs font-bold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wider mb-1">Activity Category</label>
 <select value={sessionForm.workType} onChange={e => setSessionForm(f => ({ ...f, workType: e.target.value }))} className="w-full p-2 border border-border dark:border-[#2D3B55] rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#111827] dark:text-white">
 <option value="Development">Development</option>
 <option value="Testing">Testing</option>
 <option value="Support">Support</option>
 <option value="Management">Management</option>
 <option value="Design">Design</option>
 <option value="Other">Other</option>
 </select>
 </div>

 {/* Short Description */}
 <div>
 <label className="block text-xs font-bold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wider mb-1">
 <span className="text-red-500 font-bold">*</span> Short Description
 </label>
 <input type="text" required placeholder="Briefly explain what was done during this session..." value={sessionForm.shortDescription} onChange={e => setSessionForm(f => ({ ...f, shortDescription: e.target.value }))} className="w-full p-2 border border-border dark:border-[#2D3B55] rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#111827] dark:text-white" />
 </div>

 {/* Detailed Description */}
 <div>
 <label className="block text-xs font-bold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wider mb-1">Detailed Description / Work Summary</label>
 <textarea rows={3} placeholder="Explain all tasks completed during this session..." value={sessionForm.description} onChange={e => setSessionForm(f => ({ ...f, description: e.target.value }))} className="w-full p-2 border border-border dark:border-[#2D3B55] rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#111827] dark:text-white resize-none" />
 </div>

 {/* Notes */}
 <div>
 <label className="block text-xs font-bold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wider mb-1">Optional Notes</label>
 <textarea rows={2} placeholder="Enter any additional notes..." value={sessionForm.notes} onChange={e => setSessionForm(f => ({ ...f, notes: e.target.value }))} className="w-full p-2 border border-border dark:border-[#2D3B55] rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#111827] dark:text-white resize-none" />
 </div>

 {/* Billable Status */}
 <div>
 <label className="block text-xs font-bold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wider mb-2">Billable Status</label>
 <div className="flex gap-4">
 <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-[#CBD5E1] cursor-pointer">
 <input type="radio" name="billable" value="Billable" checked={sessionForm.billable ==="Billable"} onChange={() => setSessionForm(f => ({ ...f, billable:"Billable" }))} className="w-4 h-4 accent-blue-600" />
 Billable
 </label>
 <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-[#CBD5E1] cursor-pointer">
 <input type="radio" name="billable" value="Non-Billable" checked={sessionForm.billable ==="Non-Billable"} onChange={() => setSessionForm(f => ({ ...f, billable:"Non-Billable" }))} className="w-4 h-4 accent-blue-600" />
 Non-Billable
 </label>
 </div>
 </div>
 </div>

 {/* Footer */}
 <div className="px-6 py-4 bg-slate-50 dark:bg-[#111827] border-t border-border dark:border-[#2D3B55] flex items-center justify-end gap-2">
 <button type="button" onClick={onClose} className="px-4 py-2 border border-border dark:border-[#2D3B55] rounded-lg text-xs bg-white dark:bg-[#1A2332] text-foreground dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#111827] transition-colors font-semibold">
 Cancel
 </button>
 <button type="button" onClick={onSave} disabled={savingSession} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40">
 {savingSession ? (
 <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
 ) : (
 <Save className="w-4 h-4" />
 )}
 {savingSession ?"Saving..." :"Save & Create Event"}
 </button>
 </div>
 </div>
 </div>
 );
}
