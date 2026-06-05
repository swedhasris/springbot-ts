/**
 * AI Activity Tracker — Full Agentic System
 * App detection + icons + screenshots + continuous monitoring + timesheet integration
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Monitor, Square, Loader2, AlertCircle, BarChart2, Clock, Bot,
  RefreshCw, Zap, Eye, EyeOff, Settings, Play, MousePointer,
  Keyboard, Activity, Maximize2, Download, Camera, ChevronDown,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useActivityTracker } from '../contexts/ActivityTrackerContext';
import { useTickets } from '../contexts/TicketsContext';
import { ActivityWatcher, type ActivitySnapshot, type WatcherStatus } from '../lib/activityCapture';

/* ── Types ── */
interface ActivityEntry {
  id: string;
  timestamp: string;
  appName: string; appIcon: string; appCategory: string; appColor: string;
  pageType: string; pageUrl: string; ticketNumber: string | null;
  activity: string; description: string; confidence: number;
  detectedApp: string | null;     // what Gemini Vision actually saw
  detectedWebsite: string | null; // website Gemini identified
  clicks: string[]; keystrokes: number; idleSeconds: number; scrollDepth: number;
  screenshotDataUrl: string | null; screenshotUrl: string | null;
  screenshotFilename: string | null;
  isProcessing: boolean; isIdle: boolean;
}

/* ── Helpers ── */
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function fmtHMS(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return [h, m, sec].map(v => String(v).padStart(2, '0')).join(':');
}
function getWeekMonday(d: string) {
  const dt = new Date((d || "").includes("T") ? d : (d + "T12:00:00"));
  if (isNaN(dt.getTime())) return new Date().toISOString().split("T")[0];
  const day = dt.getDay();
  dt.setDate(dt.getDate() - day + (day === 0 ? -6 : 1));
  return dt.toISOString().split("T")[0];
}
function getWeekSunday(d: string) {
  const mondayStr = getWeekMonday(d);
  const m = new Date(mondayStr + "T12:00:00");
  if (isNaN(m.getTime())) return new Date().toISOString().split("T")[0];
  m.setDate(m.getDate() + 6);
  return m.toISOString().split("T")[0];
}

/* ── Screenshot Modal ── */
function ScreenshotModal({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm" onClick={onClose}>
      <div className="relative max-w-6xl max-h-[92vh] rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        <img src={src} alt="Activity screenshot" className="max-w-full max-h-[88vh] object-contain block" />
        <button onClick={onClose} className="absolute top-3 right-3 bg-black/70 text-white rounded-full w-9 h-9 flex items-center justify-center hover:bg-black/90 text-xl font-bold">×</button>
      </div>
    </div>
  );
}

/* ── Feed Entry Card ── */
function FeedEntry({ entry, onPreview }: { entry: ActivityEntry; onPreview: (src: string) => void; key?: React.Key }) {
  if (entry.isProcessing) {
    return (
      <div className="flex gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-lg">{entry.appIcon || '⏳'}</div>
        <div className="flex-1 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-2xl rounded-tl-sm px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-blue-600 font-medium">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Analyzing {entry.appName}...
          </div>
        </div>
      </div>
    );
  }

  if (entry.isIdle) {
    return (
      <div className="flex gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-lg">💤</div>
        <div className="flex-1 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl rounded-tl-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-amber-100/60 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/50">
            <span className="text-xs font-bold text-amber-800 dark:text-amber-300">😴 User Idle</span>
            <span className="text-xs text-amber-600 dark:text-amber-400 font-mono">{fmtTime(entry.timestamp)}</span>
          </div>
          <div className="px-4 py-3 text-sm text-amber-700 dark:text-amber-300">{entry.description}</div>
        </div>
      </div>
    );
  }

  const preview = entry.screenshotDataUrl || entry.screenshotUrl;

  return (
    <div className="flex gap-3">
      {/* App icon avatar */}
      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-sm border ${entry.appColor} dark:border-[#2D3B55]`}>
        {entry.appIcon}
      </div>

      {/* Card */}
      <div className="flex-1 bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#2D3B55] rounded-2xl rounded-tl-sm shadow-sm overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-[#1A2332] border-b border-slate-100 dark:border-[#2D3B55]">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border shadow-sm ${entry.appColor} dark:border-[#2D3B55]`}>
              <span className="text-sm leading-none">{entry.appIcon}</span>
              {/* Show Gemini-detected app if different from tab-detected */}
              {entry.detectedApp && entry.detectedApp !== entry.appName
                ? entry.detectedApp
                : entry.appName}
            </span>
            {/* Show detected website if Gemini found one */}
            {entry.detectedWebsite && (
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-900/50 px-2 py-0.5 rounded-md">
                🌐 {entry.detectedWebsite}
              </span>
            )}
            <span className="text-[10px] text-slate-400 dark:text-[#94A3B8] bg-slate-100 dark:bg-[#111827] px-1.5 py-0.5 rounded font-medium">{entry.appCategory}</span>
            <span className="text-xs text-slate-500 dark:text-[#CBD5E1]">› {entry.pageType}</span>
            {entry.ticketNumber && (
              <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 px-2 py-0.5 rounded-md">{entry.ticketNumber}</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-[#94A3B8] flex-shrink-0 ml-2">
            <Clock className="w-3 h-3" />{fmtTime(entry.timestamp)}
          </div>
        </div>

        {/* Screenshot */}
        {preview ? (
          <div className="relative group cursor-zoom-in border-b border-slate-100 dark:border-[#2D3B55]" onClick={() => onPreview(preview)}>
            <img src={preview} alt="Activity" className="w-full block" style={{ maxHeight: '220px', objectFit: 'contain', background: '#0f172a' }} loading="lazy" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <Maximize2 className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 drop-shadow-lg transition-opacity" />
            </div>
            <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">
              <Camera className="w-2.5 h-2.5" />{entry.screenshotFilename || 'screenshot.jpeg'}
            </div>
            {entry.screenshotUrl && (
              <a href={entry.screenshotUrl} download={entry.screenshotFilename || 'screenshot.jpeg'}
                onClick={e => e.stopPropagation()}
                className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full transition-colors" title="Download">
                <Download className="w-3 h-3" />
              </a>
            )}
          </div>
        ) : (
          <div className="px-4 py-2 border-b border-slate-100 dark:border-[#2D3B55] flex items-center gap-2 text-xs text-slate-400 dark:text-[#94A3B8] italic bg-white dark:bg-[#111827]">
            <Camera className="w-3 h-3" /> No screenshot
          </div>
        )}

        {/* AI Description */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-[#2D3B55]">
          <div className="flex items-start gap-2">
            <Bot className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wide block mb-0.5">🧠 AI Analysis</span>
              <p className="text-sm text-slate-700 dark:text-[#CBD5E1] leading-relaxed">{entry.description}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="px-4 py-2 flex items-center gap-4 flex-wrap bg-slate-50/50 dark:bg-[#1A2332] border-t border-slate-100 dark:border-[#2D3B55]">
          {entry.clicks.length > 0 ? (
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-[#CBD5E1]">
              <MousePointer className="w-3.5 h-3.5 text-blue-500" />
              <span className="font-medium">Clicked:</span>
              <span className="text-slate-500 dark:text-[#94A3B8]">{entry.clicks.slice(-3).join(' → ')}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-[#94A3B8]">
              <MousePointer className="w-3.5 h-3.5" />
              <span>No clicks</span>
            </div>
          )}
          <div className={`flex items-center gap-1.5 text-xs ${entry.keystrokes > 0 ? 'text-slate-600 dark:text-[#CBD5E1]' : 'text-slate-400 dark:text-[#94A3B8]'}`}>
            <Keyboard className={`w-3.5 h-3.5 ${entry.keystrokes > 0 ? 'text-purple-500' : ''}`} />
            <span className={entry.keystrokes > 0 ? 'font-medium' : ''}>{entry.keystrokes} keystrokes</span>
          </div>
          {entry.idleSeconds > 30 && (
            <div className="flex items-center gap-1.5 text-xs text-amber-500 dark:text-amber-400">
              <Clock className="w-3.5 h-3.5" />
              <span>Idle {entry.idleSeconds}s</span>
            </div>
          )}
          {entry.scrollDepth > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-[#94A3B8]">
              <Activity className="w-3.5 h-3.5" />
              <span>Scroll {entry.scrollDepth}%</span>
            </div>
          )}
          {entry.confidence > 0 && (
            <div className="ml-auto text-[10px] text-slate-300 dark:text-[#94A3B8] font-mono">{Math.round(entry.confidence * 100)}% confidence</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Summary Card ── */
function SummaryCard({ summary, duration, entryCount, onDismiss }: { summary: string; duration: number; entryCount: number; onDismiss: () => void }) {
  return (
    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-6 shadow-xl">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2"><BarChart2 className="w-5 h-5" /><span className="font-bold text-lg">Session Summary</span></div>
        <button onClick={onDismiss} className="text-white/60 hover:text-white text-xl font-bold">×</button>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white/10 rounded-xl p-3">
          <div className="text-white/60 text-xs uppercase tracking-wide mb-1">Duration</div>
          <div className="font-mono font-bold text-xl">{fmtHMS(duration)}</div>
        </div>
        <div className="bg-white/10 rounded-xl p-3">
          <div className="text-white/60 text-xs uppercase tracking-wide mb-1">Snapshots</div>
          <div className="font-mono font-bold text-xl">{entryCount}</div>
        </div>
      </div>
      <div className="bg-white/10 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Bot className="w-4 h-4 text-white/70" />
          <span className="text-xs font-bold uppercase tracking-wide text-white/70">AI Summary</span>
        </div>
        <p className="text-sm leading-relaxed">{summary}</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
export function ActivityTracker() {
  const { user, profile } = useAuth();
  const { tickets: allTickets, loading: ticketsLoading } = useTickets();
  const {
    status, entries, elapsed, summary, error,
    startWatcher, stopWatcher, setEntries, setSummary, setError,
    intervalSec, setIntervalSec, captureScreenshots, setCaptureScreenshots,
    screenshotInterval, setScreenshotInterval,
    selectedIncident, setSelectedIncident
  } = useActivityTracker();

  const isValUnassigned = (val: any) => {
    const v = (val || '').trim().toLowerCase();
    return !v || v === 'unassigned' || v === 'undefined' || v === 'null' || v === 'none';
  };

  // ── Incident filtering: show all open and unassigned tickets ──
  const EXCLUDED_STATUSES = ['Closed', 'Resolved', 'Cancelled', 'Canceled', 'Completed'];
  const myIncidents = allTickets.filter(t => {
    const isExcluded = EXCLUDED_STATUSES.some(s => (t.status || '').toLowerCase() === s.toLowerCase());
    return !isExcluded;
  });

  const getPriorityColor = (priority: string) => {
    if (!priority) return '#64748b';
    if (priority.toLowerCase().includes('critical')) return '#dc2626';
    if (priority.toLowerCase().includes('high')) return '#ea580c';
    if (priority.toLowerCase().includes('moderate') || priority.toLowerCase().includes('medium')) return '#d97706';
    return '#2563eb';
  };

  const [showSettings, setShowSettings] = useState(false);
  const [previewModal, setPreviewModal] = useState<string | null>(null);
  const feedEndRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const PRESET_INTERVALS = [5, 10, 15, 30, 60, 120, 300];
  const [dropdownValue, setDropdownValue] = useState<string>(() => {
    return PRESET_INTERVALS.includes(screenshotInterval) ? screenshotInterval.toString() : 'custom';
  });
  const [customValue, setCustomValue] = useState<string>(() => {
    return !PRESET_INTERVALS.includes(screenshotInterval) ? screenshotInterval.toString() : '';
  });
  const [customError, setCustomError] = useState<string>('');


  const isActive = status === 'active';
  const canConfigureSettings = profile && !["user", "agent", "sub_admin"].includes(profile.role);

  /* ── Auto-scroll ── */
  useEffect(() => { feedEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [entries]);

  /* ── SUBMIT APPROVAL ── */
  const handleSubmitApproval = useCallback(async () => {
    if (!window.confirm("Submit your captured screenshots and activity logs to the Admin, Super Admin, and Ultra Super Admin for approval?")) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const userId = user?.uid;
      if (!userId) return;

      // 1. Get current timesheet
      const tsRes = await fetch('/api/timesheets/get-or-create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, week_start: getWeekMonday(today), week_end: getWeekSunday(today) }),
      });
      
      if (tsRes.ok) {
        const ts = await tsRes.json();
        // 2. Submit timesheet to trigger the admin notifications
        const submitRes = await fetch(`/api/timesheets/${ts.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: "Submitted" })
        });
        
        if (submitRes.ok) {
          window.alert("Success! Your screenshots and activity logs have been submitted to the Admin, Super Admin, and Ultra Super Admin for approval.");
        } else {
          throw new Error("Failed to submit.");
        }
      }
    } catch (e: any) {
      window.alert("Error submitting for approval: " + e.message);
    }
  }, [user]);

  const handleStart = async () => {
    if (!selectedIncident) {
      alert('Please select an incident before starting monitoring.');
      return;
    }
    await startWatcher();
  };

  const [showSessionPopup, setShowSessionPopup] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    entryDate: "",
    startTime: "",
    endTime: "",
    minutesWorked: 0,
    task: "General Support",
    customTask: "",
    workType: "Support",
    shortDescription: "",
    description: "",
    notes: "",
    billable: "Billable"
  });
  const [savingSession, setSavingSession] = useState(false);

  const updateDuration = (startStr: string, endStr: string) => {
    const parseTime = (timeStr: string) => {
      const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
      if (!match) return null;
      return { h: parseInt(match[1]), m: parseInt(match[2]) };
    };

    const s = parseTime(startStr);
    const e = parseTime(endStr);

    if (s && e) {
      const startMinutes = s.h * 60 + s.m;
      const endMinutes = e.h * 60 + e.m;
      let diff = endMinutes - startMinutes;
      if (diff < 0) {
        diff += 24 * 60; // Next day overflow
      }
      setSessionForm(f => ({ ...f, minutesWorked: diff }));
    }
  };

  const handleStop = async () => {
    if (!isActive) return;

    const now = new Date();
    const startMs = Date.now() - (elapsed * 1000);
    const start = new Date(startMs);
    const calculatedMinutes = Math.max(1, Math.round(elapsed / 60));

    const pad = (n: number) => String(n).padStart(2, '0');
    const formatTimeForInput = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const formatDateForInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const initialStart = formatTimeForInput(start);
    const initialEnd = formatTimeForInput(now);
    const initialDate = formatDateForInput(now);

    await stopWatcher();

    setSessionForm({
      entryDate: initialDate,
      startTime: initialStart,
      endTime: initialEnd,
      minutesWorked: calculatedMinutes,
      task: "General Support",
      customTask: "",
      workType: "Support",
      shortDescription: "",
      description: "",
      notes: "",
      billable: "Billable"
    });

    setShowSessionPopup(true);
  };

  useEffect(() => {
    if (summary && showSessionPopup) {
      setSessionForm(f => ({ ...f, description: summary }));
    }
  }, [summary, showSessionPopup]);

  const handleSaveSession = async () => {
    if (!user) return;
    if (!sessionForm.shortDescription.trim()) {
      alert("Short Description is required.");
      return;
    }

    setSavingSession(true);
    try {
      const userId = user.uid;
      const finalTask = sessionForm.task === "Other..." ? sessionForm.customTask : sessionForm.task;
      const finalShortDesc = selectedIncident 
        ? `[${selectedIncident}] ${sessionForm.shortDescription}`
        : sessionForm.shortDescription;

      const entryD = new Date(sessionForm.entryDate + "T12:00:00");
      const day = entryD.getDay();
      const diff = entryD.getDate() - day + (day === 0 ? -6 : 1);
      const mon = new Date(entryD);
      mon.setDate(diff);
      const monStr = mon.toISOString().split("T")[0];
      const sun = new Date(mon.getTime() + 6 * 86400000);
      const sunStr = sun.toISOString().split("T")[0];

      const tsRes = await fetch("/api/timesheets/get-or-create", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          week_start: monStr,
          week_end: sunStr
        })
      });
      const ts = await tsRes.json();

      const response = await fetch("/api/time-cards", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timesheet_id: ts.id,
          user_id: userId,
          entry_date: sessionForm.entryDate,
          start_time: sessionForm.startTime,
          end_time: sessionForm.endTime,
          hours_worked: sessionForm.minutesWorked,
          task: finalTask,
          work_type: sessionForm.workType,
          billable: sessionForm.billable,
          description: sessionForm.description,
          short_description: finalShortDesc,
          notes: sessionForm.notes,
          status: 'Draft'
        })
      });

      if (response.ok) {
        alert("Session activity details saved successfully! Calendar entry created.");
        setShowSessionPopup(false);
        setSummary(null);
      } else {
        alert("Failed to save activity details.");
      }
    } catch (e) {
      console.error(e);
      alert("Error saving session details.");
    } finally {
      setSavingSession(false);
    }
  };

  useEffect(() => {
    // Sync local state if needed (mostly just for the interval display)
  }, [intervalSec]);

  const breakdown = entries.filter(e => !e.isProcessing && !e.isIdle)
    .reduce<Record<string, number>>((acc, e) => { acc[e.activity] = (acc[e.activity] || 0) + 1; return acc; }, {});
  const topActivity = Object.entries(breakdown).sort((a, b) => (b[1] as number) - (a[1] as number))[0];
  const totalKeys = entries.reduce((s, e) => s + e.keystrokes, 0);
  const totalClicks = entries.reduce((s, e) => s + e.clicks.length, 0);

  /* ── Render ── */
  return (
    <>
      {previewModal && <ScreenshotModal src={previewModal} onClose={() => setPreviewModal(null)} />}

      <div className="max-w-5xl mx-auto space-y-5 activity-tracker-container dark:bg-[#0B1220] dark:p-6 dark:rounded-2xl dark:border dark:border-[#2D3B55]">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground dark:text-white flex items-center gap-2">
              <Monitor className="w-6 h-6 text-blue-600" /> AI Activity Tracker
            </h1>
            <p className="text-sm text-muted-foreground dark:text-[#94A3B8] mt-0.5">
              Detects apps, captures screenshots, generates AI descriptions, updates timesheet automatically.
            </p>
          </div>
          {canConfigureSettings && (
            <button onClick={() => setShowSettings(s => !s)} className="p-2 rounded-lg hover:bg-muted dark:hover:bg-[#111827] transition-colors">
              <Settings className="w-5 h-5 text-muted-foreground dark:text-[#94A3B8]" />
            </button>
          )}
        </div>

        {/* Settings */}
        {showSettings && canConfigureSettings && (
          <div className="bg-white dark:bg-[#1A2332] border border-border dark:border-[#2D3B55] rounded-xl p-5 shadow-sm space-y-4 text-foreground dark:text-white">
            <div>
              <h3 className="text-sm font-bold mb-3">Snapshot interval</h3>
              <div className="flex items-center gap-2 flex-wrap">
                {[10, 15, 20, 30, 60].map(s => (
                  <button key={s} onClick={() => setIntervalSec(s)} disabled={isActive}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors disabled:opacity-50
                      ${intervalSec === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-[#111827] text-muted-foreground dark:text-[#CBD5E1] border-border dark:border-[#2D3B55] hover:border-blue-400'}`}>
                    {s}s
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="capScreenshots" checked={captureScreenshots} onChange={e => setCaptureScreenshots(e.target.checked)} disabled={isActive} className="w-4 h-4 accent-blue-600" />
              <label htmlFor="capScreenshots" className="text-sm font-medium cursor-pointer dark:text-[#CBD5E1]">
                Silent Monitoring (OS-level capture, no permission dialogs)
              </label>
            </div>

            <div className="pt-2 border-t border-border dark:border-[#2D3B55]">
              <h3 className="text-sm font-bold mb-3 mt-2">Screenshot Capture Frequency</h3>
              <div className="flex flex-col gap-3 max-w-xs">
                <select 
                  value={dropdownValue}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDropdownValue(val);
                    if (val !== 'custom') {
                      setScreenshotInterval(parseInt(val, 10));
                      setCustomError('');
                    }
                  }}
                  disabled={isActive}
                  className="w-full px-3 py-2 border border-border dark:border-[#2D3B55] rounded-lg text-sm bg-white dark:bg-[#111827] text-foreground dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="5">Every 5 seconds</option>
                  <option value="10">Every 10 seconds</option>
                  <option value="15">Every 15 seconds</option>
                  <option value="30">Every 30 seconds</option>
                  <option value="60">Every 1 minute</option>
                  <option value="120">Every 2 minutes</option>
                  <option value="300">Every 5 minutes</option>
                  <option value="custom">Custom</option>
                </select>

                {dropdownValue === 'custom' && (
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground dark:text-[#94A3B8] mb-1">
                      Custom Interval (Seconds)
                    </label>
                    <input 
                      type="number"
                      value={customValue}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomValue(val);
                        const num = parseInt(val, 10);
                        if (!val || isNaN(num) || num < 5 || num > 3600) {
                          setCustomError("Please enter a value between 5 and 3600 seconds");
                        } else {
                          setCustomError('');
                          setScreenshotInterval(num);
                        }
                      }}
                      placeholder="Enter time in seconds"
                      disabled={isActive}
                      className={`w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-[#111827] text-foreground dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${customError ? 'border-red-500' : 'border-border dark:border-[#2D3B55]'}`}
                    />
                    {customError && (
                      <p className="text-xs text-red-500 mt-1">{customError}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Control Bar */}
        <div className="bg-white dark:bg-[#1A2332] border border-border dark:border-[#2D3B55] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              {isActive ? (
                <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/40 px-3 py-2 rounded-lg flex-wrap">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse inline-block flex-shrink-0" />
                  <Eye className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm font-semibold text-green-700">Screen monitoring is active</span>
                  {selectedIncident && (
                    <>
                      <span className="text-green-400 text-sm">·</span>
                      <span className="text-xs font-bold text-slate-600 dark:text-[#CBD5E1]">Incident:</span>
                      <span className="font-mono text-xs font-bold text-white bg-blue-600 px-2 py-0.5 rounded-full">
                        {selectedIncident}
                      </span>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-[#2D3B55] px-3 py-2 rounded-lg">
                  <EyeOff className="w-4 h-4 text-slate-400 dark:text-[#94A3B8]" />
                  <span className="text-sm text-slate-500 dark:text-[#CBD5E1]">Monitoring inactive</span>
                </div>
              )}
              {isActive && <div className="font-mono text-xl font-bold text-green-600 tabular-nums">{fmtHMS(elapsed)}</div>}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {entries.length > 0 && (
                <div className="text-xs text-muted-foreground dark:text-[#94A3B8] hidden sm:block">
                  {entries.filter(e => !e.isProcessing).length} snapshots{topActivity ? ` · ${topActivity[0]}` : ''}
                </div>
              )}

              {/* ── Incident Selection Dropdown (inline) ── */}
              {!isActive && (
                <div ref={dropdownRef} className="relative flex items-center" style={{ minWidth: '240px', maxWidth: '320px' }}>
                  {(() => {
                    const selectedInc = myIncidents.find(t => t.number === selectedIncident);
                    const dotColor = selectedInc ? getPriorityColor(selectedInc.priority || '') : undefined;
                    return (
                      <div className="w-full relative">
                        {/* Dropdown Toggle Button */}
                        <button
                          type="button"
                          onClick={() => { setIsOpen(!isOpen); }}
                          disabled={ticketsLoading}
                          className={`w-full flex items-center justify-between h-[42px] border rounded-xl text-sm bg-white dark:bg-[#111827] outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer text-left px-3
                            ${selectedIncident ? 'border-blue-500 font-semibold text-blue-600 dark:text-blue-400 shadow-sm' : 'border-border dark:border-[#2D3B55] text-slate-500 dark:text-[#CBD5E1]'}
                            ${ticketsLoading ? 'opacity-60 cursor-wait' : ''}
                          `}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {dotColor && (
                              <span
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ background: dotColor }}
                              />
                            )}
                            <span className="truncate">
                              {ticketsLoading ? (
                                '⏳ Loading incidents...'
                              ) : selectedInc ? (
                                `${selectedInc.number} | ${selectedInc.title || 'Untitled'}${isValUnassigned(selectedInc.assignedTo) && isValUnassigned(selectedInc.assignedToName) ? ' (Unassigned)' : ''}`
                              ) : (
                                myIncidents.length === 0 ? '— No open incidents found —' : '— Select Incident —'
                              )}
                            </span>
                          </div>
                          <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 ml-2" />
                        </button>

                        {/* Dropdown Menu */}
                        {isOpen && (
                          <div className="absolute z-[9999] left-0 right-0 mt-1 bg-white dark:bg-[#1A2332] border border-slate-200 dark:border-[#2D3B55] rounded-xl shadow-xl max-h-60 overflow-y-auto py-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedIncident(null);
                                setIsOpen(false);
                              }}
                              className="w-full text-left px-3 py-2 text-sm text-slate-500 dark:text-[#94A3B8] hover:bg-slate-50 dark:hover:bg-[#111827] transition-colors font-medium flex items-center"
                            >
                              — Select Incident —
                            </button>
                            {myIncidents.map(ticket => {
                              const p = (ticket.priority || '').toLowerCase();
                              const dot = p.includes('critical') ? '🔴'
                                : p.includes('high') ? '🟠'
                                : (p.includes('moderate') || p.includes('medium')) ? '🟡'
                                : p.includes('low') ? '🟣' : '⚪';
                              const isUnassigned = isValUnassigned(ticket.assignedTo) && isValUnassigned(ticket.assignedToName);
                              return (
                                <button
                                  key={ticket.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedIncident(ticket.number);
                                    setIsOpen(false);
                                  }}
                                  className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 hover:bg-blue-50/50 dark:hover:bg-blue-950/40
                                    ${selectedIncident === ticket.number ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold' : 'text-blue-600 dark:text-blue-400 font-semibold'}
                                  `}
                                  style={{ color: '#2563eb' }}
                                >
                                  <span className="flex-shrink-0">{dot}</span>
                                  <span className="truncate">
                                    {ticket.number} | {ticket.title || 'Untitled'}{isUnassigned ? ' (Unassigned)' : ''}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {!isActive ? (
                <button
                  onClick={handleStart}
                  disabled={!selectedIncident}
                  className="flex items-center gap-2 bg-green-500 hover:bg-green-600 disabled:bg-green-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!selectedIncident ? 'Please select an incident before starting monitoring.' : 'Start Monitoring'}
                >
                  <Play className="w-4 h-4 fill-white" /> Start Monitoring
                </button>
              ) : (
                <button onClick={handleStop} className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm">
                  <Square className="w-4 h-4 fill-white" /> Stop Monitoring
                </button>
              )}
              
              <button 
                onClick={handleSubmitApproval} 
                disabled={isActive && entries.length === 0}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Screenshots
              </button>
            </div>
          </div>
          {!isActive && entries.length === 0 && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-[#111827] border border-blue-200 dark:border-[#2D3B55] dark:border-l-4 dark:border-l-blue-500 rounded-lg flex items-start gap-2">
              <Bot className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 dark:text-[#CBD5E1]">
                <strong>Silent OS-level Monitoring.</strong>{' '}
                {!selectedIncident && myIncidents.length > 0 ? (
                  <span className="text-red-600 dark:text-red-400 font-semibold">Select an incident from the dropdown, then click </span>
                ) : (
                  <>Click </>
                )}
                <strong>Start Monitoring</strong> to begin. The system captures your full desktop silently at the OS level every {intervalSec} seconds.{' '}
                <strong>No browser permission dialogs or screen-share prompts are required.</strong>{' '}
                Your activity is analyzed by Gemini Vision and linked to the selected incident.
              </p>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="text-sm text-red-700">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600 text-xl font-bold">×</button>
          </div>
        )}

        {/* Summary */}
        {summary && <SummaryCard summary={summary} duration={elapsed} entryCount={entries.filter(e => !e.isProcessing).length} onDismiss={() => setSummary(null)} />}

        {/* Stats */}
        {(isActive || entries.length > 0) && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Snapshots', value: entries.filter(e => !e.isProcessing).length, icon: <Zap className="w-4 h-4 text-blue-500" /> },
              { label: 'Keystrokes', value: totalKeys, icon: <Keyboard className="w-4 h-4 text-purple-500" /> },
              { label: 'Clicks', value: totalClicks, icon: <MousePointer className="w-4 h-4 text-green-500" /> },
            ].map(s => (
              <div key={s.label} className="bg-white dark:bg-[#111827] border border-border dark:border-[#2D3B55] rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-1">{s.icon}<span className="text-xs text-muted-foreground dark:text-[#94A3B8] uppercase tracking-wide font-bold">{s.label}</span></div>
                <div className="text-2xl font-bold text-foreground dark:text-white tabular-nums">{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Live Feed */}
        <div className="bg-white dark:bg-[#1A2332] border border-border dark:border-[#2D3B55] rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border dark:border-[#2D3B55] bg-slate-50 dark:bg-[#111827]">
            <div className="flex items-center gap-2 text-foreground dark:text-white">
              <Zap className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-bold">Live Activity Feed</span>
              {entries.length > 0 && <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">{entries.length}</span>}
            </div>
            {entries.length > 0 && (
              <button onClick={() => { setEntries([]); setSummary(null); }} className="text-xs text-muted-foreground dark:text-[#CBD5E1] hover:text-red-500 dark:hover:text-red-400 transition-colors flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
          <div className="p-4 space-y-4 max-h-[640px] overflow-y-auto">
            {entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 bg-blue-50 dark:bg-[#111827] rounded-full flex items-center justify-center mb-4 border border-blue-100 dark:border-[#2D3B55]">
                  <Monitor className="w-7 h-7 text-blue-400" />
                </div>
                <p className="text-sm font-semibold text-muted-foreground dark:text-[#CBD5E1]">No activity recorded yet</p>
                <p className="text-xs text-muted-foreground dark:text-[#94A3B8] mt-1 max-w-sm">
                  Click <strong>Start Monitoring</strong>. The AI detects your app, captures a screenshot,
                  and describes what you're working on every {intervalSec} seconds.
                </p>
              </div>
            ) : entries.map(entry => <FeedEntry key={entry.id} entry={entry} onPreview={src => setPreviewModal(src)} />)}
            <div ref={feedEndRef} />
          </div>
        </div>

        {/* Breakdown */}
        {Object.keys(breakdown).length > 0 && (
          <div className="bg-white dark:bg-[#1A2332] border border-border dark:border-[#2D3B55] rounded-xl p-5 shadow-sm text-foreground dark:text-white">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><BarChart2 className="w-4 h-4 text-blue-500" /> Activity Breakdown</h3>
            <div className="space-y-2">
              {Object.entries(breakdown).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([label, count]) => {
                const total = entries.filter(e => !e.isProcessing && !e.isIdle).length;
                const pct = total > 0 ? Math.round(((count as number) / total) * 100) : 0;
                return (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-sm w-40 truncate font-medium dark:text-[#CBD5E1]">{label}</span>
                    <div className="flex-1 bg-slate-100 dark:bg-[#111827] rounded-full h-2 overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground dark:text-[#94A3B8] w-16 text-right font-mono">{pct}% ({count})</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Activity Details Popup Modal */}
        {showSessionPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm animate-in fade-in duration-200 activity-tracker-modal">
            <div className="bg-white dark:bg-[#1A2332] rounded-2xl border border-border dark:border-[#2D3B55] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="px-6 py-4 bg-slate-50 dark:bg-[#111827] border-b border-border dark:border-[#2D3B55] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-blue-600" />
                  <h2 className="text-base font-bold text-slate-800 dark:text-white">
                    Save AI Activity Details
                    {selectedIncident && (
                      <span className="ml-2 text-sm text-blue-600 font-mono bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900/50">
                        {selectedIncident}
                      </span>
                    )}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSessionPopup(false)}
                  className="text-slate-400 dark:text-[#94A3B8] hover:text-slate-600 dark:hover:text-white text-xl font-bold p-1 rounded hover:bg-slate-100 dark:hover:bg-[#111827] transition-colors"
                >
                  ×
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4 overflow-y-auto flex-1 text-left">
                {/* Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wider mb-1">
                    Activity Date
                  </label>
                  <input
                    type="date"
                    value={sessionForm.entryDate}
                    onChange={e => setSessionForm(f => ({ ...f, entryDate: e.target.value }))}
                    className="w-full p-2 border border-border dark:border-[#2D3B55] rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-[#111827] dark:text-white"
                  />
                </div>

                {/* Start Time & End Time & Duration */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wider mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={sessionForm.startTime}
                      onChange={e => {
                        const val = e.target.value;
                        setSessionForm(f => ({ ...f, startTime: val }));
                        updateDuration(val, sessionForm.endTime);
                      }}
                      className="w-full p-2 border border-border dark:border-[#2D3B55] rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-[#111827] dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wider mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={sessionForm.endTime}
                      onChange={e => {
                        const val = e.target.value;
                        setSessionForm(f => ({ ...f, endTime: val }));
                        updateDuration(sessionForm.startTime, val);
                      }}
                      className="w-full p-2 border border-border dark:border-[#2D3B55] rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-[#111827] dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wider mb-1">
                      Duration (Mins)
                    </label>
                    <input
                      type="number"
                      value={sessionForm.minutesWorked}
                      onChange={e => setSessionForm(f => ({ ...f, minutesWorked: parseInt(e.target.value) || 0 }))}
                      className="w-full p-2 border border-border dark:border-[#2D3B55] rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-[#111827] dark:text-white"
                    />
                  </div>
                </div>

                {/* Task / Work Type Dropdown */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wider mb-1">
                    Task / Work Type
                  </label>
                  <select
                    value={sessionForm.task}
                    onChange={e => setSessionForm(f => ({ ...f, task: e.target.value }))}
                    className="w-full p-2 border border-border dark:border-[#2D3B55] rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-[#111827] dark:text-white"
                  >
                    <option value="Ticket Resolution">Ticket Resolution</option>
                    <option value="Documentation">Documentation</option>
                    <option value="System Maintenance">System Maintenance</option>
                    <option value="Meeting">Meeting</option>
                    <option value="General Support">General Support</option>
                    <option value="Other...">Other...</option>
                  </select>
                </div>

                {/* Custom Task type input if Other chosen */}
                {sessionForm.task === "Other..." && (
                  <div className="animate-in slide-in-from-top-2 duration-150">
                    <label className="block text-xs font-bold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wider mb-1">
                      Custom Work Type
                    </label>
                    <input
                      type="text"
                      placeholder="Specify your custom task/work type..."
                      value={sessionForm.customTask}
                      onChange={e => setSessionForm(f => ({ ...f, customTask: e.target.value }))}
                      className="w-full p-2 border border-border dark:border-[#2D3B55] rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-[#111827] dark:text-white"
                    />
                  </div>
                )}

                {/* Activity Category Dropdown */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wider mb-1">
                    Activity Category
                  </label>
                  <select
                    value={sessionForm.workType}
                    onChange={e => setSessionForm(f => ({ ...f, workType: e.target.value }))}
                    className="w-full p-2 border border-border dark:border-[#2D3B55] rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-[#111827] dark:text-white"
                  >
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
                  <input
                    type="text"
                    required
                    placeholder="Briefly explain what was done during this session..."
                    value={sessionForm.shortDescription}
                    onChange={e => setSessionForm(f => ({ ...f, shortDescription: e.target.value }))}
                    className="w-full p-2 border border-border dark:border-[#2D3B55] rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-[#111827] dark:text-white"
                  />
                </div>

                {/* Detailed Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wider mb-1">
                    Detailed Description / Work Summary
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Explain all tasks completed during this session..."
                    value={sessionForm.description}
                    onChange={e => setSessionForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full p-2 border border-border dark:border-[#2D3B55] rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-[#111827] dark:text-white resize-none"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wider mb-1">
                    Optional Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter any additional notes..."
                    value={sessionForm.notes}
                    onChange={e => setSessionForm(f => ({ ...f, notes: e.target.value }))}
                    className="w-full p-2 border border-border dark:border-[#2D3B55] rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-[#111827] dark:text-white resize-none"
                  />
                </div>

                {/* Billable Status */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wider mb-2">
                    Billable Status
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-[#CBD5E1] cursor-pointer">
                      <input
                        type="radio"
                        name="billable"
                        value="Billable"
                        checked={sessionForm.billable === "Billable"}
                        onChange={() => setSessionForm(f => ({ ...f, billable: "Billable" }))}
                        className="w-4 h-4 accent-blue-600"
                      />
                      Billable
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-[#CBD5E1] cursor-pointer">
                      <input
                        type="radio"
                        name="billable"
                        value="Non-Billable"
                        checked={sessionForm.billable === "Non-Billable"}
                        onChange={() => setSessionForm(f => ({ ...f, billable: "Non-Billable" }))}
                        className="w-4 h-4 accent-blue-600"
                      />
                      Non-Billable
                    </label>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-slate-50 dark:bg-[#111827] border-t border-border dark:border-[#2D3B55] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSessionPopup(false)}
                  className="px-4 py-2 border border-border dark:border-[#2D3B55] rounded-lg text-xs bg-white dark:bg-[#1A2332] text-foreground dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#111827] transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingSession}
                  onClick={handleSaveSession}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow"
                >
                  {savingSession ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>Save & Create Event</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
