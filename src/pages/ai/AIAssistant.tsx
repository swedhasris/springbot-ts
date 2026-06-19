import React, { useState, useEffect, useCallback } from"react";
import {
 Brain,
 Sparkles,
 Search,
 TrendingUp,
 LayoutDashboard,
 FileText,
 Tag,
 AlertTriangle,
 Users,
 BookOpen,
 MessageSquare,
 ChevronRight,
 Zap,
 BarChart2,
 RefreshCw,
 Copy,
 CheckCircle2,
 Clock,
 ArrowUpRight,
 Info,
 Lightbulb,
 Target,
 Activity,
} from"lucide-react";
import {
 analyzeTicket,
 analyzeTrends,
 RESPONSE_TEMPLATES,
 getPriorityColor,
 getCategoryColor,
 type AIAnalysis,
 type TrendData,
 type ResponseTemplate,
} from"../../lib/aiEngine";
import { collection, onSnapshot, query, orderBy } from"../../lib/api";
import { db } from"../../lib/firebase";
import { cn } from"@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
type ActiveTab ="analyzer" |"trends" |"dashboard";

// ── Helpers ───────────────────────────────────────────────────────────────────
function ConfidenceBar({ value }: { value: number }) {
 const color =
 value >= 70 ?"#22c55e" : value >= 40 ?"#eab308" :"#f97316";
 return (
 <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
 <div
 className="h-2 rounded-full transition-all duration-700"
 style={{ width: `${value}%`, backgroundColor: color }}
 />
 </div>
 );
}

function StatCard({
 icon: Icon,
 label,
 value,
 sub,
 color ="#6366f1",
}: {
 icon: any;
 label: string;
 value: string | number;
 sub?: string;
 color?: string;
}) {
 return (
 <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-start gap-4">
 <div
 className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
 style={{ backgroundColor: color +"22" }}
 >
 <Icon className="w-5 h-5" style={{ color }} />
 </div>
 <div className="min-w-0">
 <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
 {label}
 </p>
 <p className="text-2xl font-semibold text-white">{value}</p>
 {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
 </div>
 </div>
 );
}

// ── Mini bar chart ─────────────────────────────────────────────────────────────
function MiniBar({
 label,
 count,
 total,
 color,
}: {
 label: string;
 count: number;
 total: number;
 color: string;
}) {
 const pct = total > 0 ? Math.round((count / total) * 100) : 0;
 return (
 <div className="flex items-center gap-3">
 <div className="w-32 text-xs text-slate-300 truncate font-medium">{label}</div>
 <div className="flex-grow bg-white/5 rounded-full h-2 overflow-hidden">
 <div
 className="h-2 rounded-full transition-all duration-700"
 style={{ width: `${pct}%`, backgroundColor: color }}
 />
 </div>
 <div className="w-16 text-right">
 <span className="text-xs font-bold text-white">{count}</span>
 <span className="text-[10px] text-slate-500 ml-1">({pct}%)</span>
 </div>
 </div>
 );
}

// ── Keyword Badge ──────────────────────────────────────────────────────────────
function KeywordBadge({ word }: { word: string }) {
 return (
 <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold uppercase tracking-wide">
 {word}
 </span>
 );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 1 — Ticket Analyzer
// ─────────────────────────────────────────────────────────────────────────────
function TicketAnalyzer({ kbArticles }: { kbArticles: any[] }) {
 const [ticketText, setTicketText] = useState("");
 const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
 const [analyzing, setAnalyzing] = useState(false);
 const [copiedTemplate, setCopiedTemplate] = useState(false);
 const [activeTemplate, setActiveTemplate] = useState<ResponseTemplate | null>(null);

 const handleAnalyze = useCallback(() => {
 if (!ticketText.trim()) return;
 setAnalyzing(true);
 // Small timeout for UX animation feel
 setTimeout(() => {
 const result = analyzeTicket(ticketText, kbArticles);
 setAnalysis(result);
 setActiveTemplate(result.suggestedTemplate);
 setAnalyzing(false);
 }, 600);
 }, [ticketText, kbArticles]);

 const handleCopyTemplate = () => {
 if (!activeTemplate) return;
 navigator.clipboard.writeText(activeTemplate.body).then(() => {
 setCopiedTemplate(true);
 setTimeout(() => setCopiedTemplate(false), 2000);
 });
 };

 const SAMPLE_TEXTS = [
"I cannot access Outlook after changing my password. It keeps showing 'incorrect credentials' even though I know the password is right.",
"The VPN keeps disconnecting every 10 minutes. I cannot work from home. This is urgent as I have a client call in 1 hour.",
"The production server is down! All users in the company cannot access the ERP system. Critical issue — please escalate immediately.",
"My laptop screen is flickering and sometimes goes completely black. The device is 2 years old.",
 ];

 return (
 <div className="space-y-6">
 {/* Input Section */}
 <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
 <div className="flex items-center gap-3 mb-4">
 <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center">
 <FileText className="w-4 h-4 text-indigo-400" />
 </div>
 <div>
 <h3 className="text-sm font-bold text-white">Ticket Text Analyzer</h3>
 <p className="text-xs text-slate-400">
 Paste or type a ticket description to get AI recommendations
 </p>
 </div>
 </div>

 <textarea
 value={ticketText}
 onChange={(e) => setTicketText(e.target.value)}
 placeholder="Example: I cannot access Outlook after changing my password..."
 rows={5}
 className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 resize-none transition-all"
 />

 {/* Sample Buttons */}
 <div className="mt-3 mb-4">
 <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2 font-bold">
 Try a sample:
 </p>
 <div className="flex flex-wrap gap-2">
 {SAMPLE_TEXTS.map((sample, i) => (
 <button
 key={i}
 onClick={() => setTicketText(sample)}
 className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[11px] text-slate-300 hover:bg-indigo-500/20 hover:border-indigo-500/40 hover:text-white transition-all cursor-pointer"
 >
 Sample {i + 1}
 </button>
 ))}
 </div>
 </div>

 <button
 onClick={handleAnalyze}
 disabled={!ticketText.trim() || analyzing}
 className={cn(
"w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all",
 ticketText.trim() && !analyzing
 ?"bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/20 cursor-pointer"
 :"bg-white/5 text-slate-500 cursor-not-allowed"
 )}
 >
 {analyzing ? (
 <>
 <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
 Analyzing...
 </>
 ) : (
 <>
 <Sparkles className="w-4 h-4" />
 Analyze Ticket
 </>
 )}
 </button>
 </div>

 {/* Results */}
 {analysis && (
 <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
 {/* Confidence Banner */}
 <div className="bg-gradient-to-r from-indigo-900/40 to-violet-900/40 border border-indigo-500/30 rounded-2xl p-4 flex items-center gap-4">
 <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0">
 <Brain className="w-6 h-6 text-indigo-400" />
 </div>
 <div className="flex-grow">
 <div className="flex items-center justify-between mb-1.5">
 <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
 AI Confidence Score
 </span>
 <span className="text-lg font-semibold text-white">{analysis.confidence}%</span>
 </div>
 <ConfidenceBar value={analysis.confidence} />
 </div>
 </div>

 {/* 2-column grid of results */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {/* Summary */}
 <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
 <div className="flex items-center gap-2 mb-3">
 <FileText className="w-4 h-4 text-cyan-400" />
 <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
 Ticket Summary
 </span>
 </div>
 <p className="text-sm text-white leading-relaxed font-medium">
 {analysis.summary}
 </p>
 </div>

 {/* Category */}
 <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
 <div className="flex items-center gap-2 mb-3">
 <Tag className="w-4 h-4 text-violet-400" />
 <span className="text-xs font-bold uppercase tracking-wider text-violet-400">
 Suggested Category
 </span>
 </div>
 <div className="flex items-center gap-3">
 <span className="px-3 py-1.5 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-200 text-sm font-bold">
 {analysis.suggestedCategory}
 </span>
 </div>
 </div>

 {/* Priority */}
 <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
 <div className="flex items-center gap-2 mb-3">
 <AlertTriangle className="w-4 h-4 text-amber-400" />
 <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
 Suggested Priority
 </span>
 </div>
 <div className="flex items-center gap-2">
 <div
 className="w-3 h-3 rounded-full"
 style={{ backgroundColor: getPriorityColor(analysis.suggestedPriority) }}
 />
 <span
 className="text-sm font-bold"
 style={{ color: getPriorityColor(analysis.suggestedPriority) }}
 >
 {analysis.suggestedPriority}
 </span>
 </div>
 </div>

 {/* Team */}
 <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
 <div className="flex items-center gap-2 mb-3">
 <Users className="w-4 h-4 text-emerald-400" />
 <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
 Suggested Team
 </span>
 </div>
 <div className="flex items-center gap-3">
 <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 text-sm font-bold">
 {analysis.suggestedTeam}
 </span>
 </div>
 </div>
 </div>

 {/* Detected Keywords */}
 {analysis.keywords.length > 0 && (
 <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
 <div className="flex items-center gap-2 mb-3">
 <Search className="w-4 h-4 text-sky-400" />
 <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
 Detected Keywords
 </span>
 </div>
 <div className="flex flex-wrap gap-2">
 {analysis.keywords.map((kw) => (
 <span key={kw}><KeywordBadge word={kw} /></span>
 ))}
 </div>
 </div>
 )}

 {/* KB Articles */}
 {analysis.recommendedArticles.length > 0 && (
 <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
 <div className="flex items-center gap-2 mb-4">
 <BookOpen className="w-4 h-4 text-orange-400" />
 <span className="text-xs font-bold uppercase tracking-wider text-orange-400">
 Recommended Knowledge Articles
 </span>
 </div>
 <div className="space-y-3">
 {analysis.recommendedArticles.map((article) => (
 <div
 key={article.id}
 className="flex items-start gap-3 p-3 rounded-xl bg-black/20 border border-white/5 hover:border-orange-500/30 transition-all"
 >
 <BookOpen className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
 <div className="min-w-0">
 <p className="text-sm font-bold text-white truncate">{article.title}</p>
 <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{article.snippet}</p>
 <span className="text-[10px] text-orange-400/70 font-bold uppercase mt-1 inline-block">
 {article.category}
 </span>
 </div>
 <span className="shrink-0 text-[10px] font-semibold text-orange-400 bg-orange-500/10 px-2 py-1 rounded-lg">
 {article.matchScore * 10}% match
 </span>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Response Template */}
 {activeTemplate && (
 <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-2">
 <MessageSquare className="w-4 h-4 text-pink-400" />
 <span className="text-xs font-bold uppercase tracking-wider text-pink-400">
 Suggested Response Template
 </span>
 </div>
 <button
 onClick={handleCopyTemplate}
 className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-500/20 border border-pink-500/30 text-pink-300 text-xs font-bold hover:bg-pink-500/30 transition-all cursor-pointer"
 >
 {copiedTemplate ? (
 <>
 <CheckCircle2 className="w-3.5 h-3.5" /> Copied!
 </>
 ) : (
 <>
 <Copy className="w-3.5 h-3.5" /> Copy Template
 </>
 )}
 </button>
 </div>

 {/* Template selector */}
 {RESPONSE_TEMPLATES.length > 1 && (
 <div className="flex flex-wrap gap-2 mb-4">
 {RESPONSE_TEMPLATES.map((t) => (
 <button
 key={t.id}
 onClick={() => setActiveTemplate(t)}
 className={cn(
"px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
 activeTemplate?.id === t.id
 ?"bg-pink-500/30 border border-pink-500/50 text-pink-200"
 :"bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10"
 )}
 >
 {t.name}
 </button>
 ))}
 </div>
 )}

 <div className="bg-black/30 rounded-xl p-4 border border-white/5">
 <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Subject</p>
 <p className="text-xs text-slate-300 font-semibold mb-3">{activeTemplate.subject}</p>
 <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Body</p>
 <pre className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
 {activeTemplate.body}
 </pre>
 </div>
 </div>
 )}
 </div>
 )}

 {!analysis && !analyzing && (
 <div className="text-center py-16 text-slate-500">
 <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
 <p className="text-sm font-bold">Enter ticket text above and click Analyze Ticket</p>
 <p className="text-xs mt-1 opacity-70">
 The AI engine will suggest category, priority, team and more
 </p>
 </div>
 )}
 </div>
 );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 2 — Trend Analysis
// ─────────────────────────────────────────────────────────────────────────────
function TrendAnalysis({
 tickets,
 loading,
 serverStats,
 onRefresh,
}: {
 tickets: any[];
 loading: boolean;
 serverStats: any;
 onRefresh: () => void;
}) {
 const trends = analyzeTrends(tickets);

 if (loading) {
 return (
 <div className="flex flex-col items-center justify-center py-24 gap-4">
 <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
 <p className="text-sm text-slate-400">Analyzing system data...</p>
 </div>
 );
 }

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-base font-bold text-white">Trend Analysis</h3>
 <p className="text-xs text-slate-400 mt-0.5">
 Analyzing {trends.totalAnalyzed} tickets from the system
 </p>
 </div>
 <button
 onClick={onRefresh}
 className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 hover:bg-white/10 transition-all cursor-pointer"
 >
 <RefreshCw className="w-3.5 h-3.5" />
 Refresh
 </button>
 </div>

 {/* Stats Row */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <StatCard
 icon={Activity}
 label="Total Tickets"
 value={serverStats?.totalTickets ?? trends.totalAnalyzed}
 color="#6366f1"
 />
 <StatCard
 icon={Clock}
 label="Open Tickets"
 value={serverStats?.openTickets ?? tickets.filter(t => !["Resolved","Closed"].includes(t.status)).length}
 color="#f97316"
 />
 <StatCard
 icon={CheckCircle2}
 label="Resolved"
 value={serverStats?.resolvedTickets ?? tickets.filter(t => ["Resolved","Closed"].includes(t.status)).length}
 color="#22c55e"
 />
 <StatCard
 icon={Target}
 label="Resolution Rate"
 value={`${trends.resolutionRate}%`}
 color="#06b6d4"
 />
 </div>

 {/* Top Categories */}
 <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
 <div className="flex items-center gap-2 mb-5">
 <Tag className="w-4 h-4 text-violet-400" />
 <h4 className="text-sm font-bold text-white">Most Common Categories</h4>
 </div>
 {trends.topCategories.length === 0 ? (
 <p className="text-xs text-slate-500 text-center py-6">No category data available yet.</p>
 ) : (
 <div className="space-y-3">
 {trends.topCategories.map((cat, i) => (
 <div key={cat.name}><MiniBar
 label={cat.name}
 count={cat.count}
 total={trends.totalAnalyzed}
 color={getCategoryColor(i)}
 /></div>
 ))}
 </div>
 )}
 </div>

 {/* Priority Breakdown */}
 <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
 <div className="flex items-center gap-2 mb-5">
 <AlertTriangle className="w-4 h-4 text-amber-400" />
 <h4 className="text-sm font-bold text-white">Priority Distribution</h4>
 </div>
 {trends.topPriorities.length === 0 ? (
 <p className="text-xs text-slate-500 text-center py-6">No priority data available yet.</p>
 ) : (
 <div className="space-y-3">
 {trends.topPriorities.map((p) => (
 <div key={p.name}><MiniBar
 label={p.name}
 count={p.count}
 total={trends.totalAnalyzed}
 color={getPriorityColor(p.name)}
 /></div>
 ))}
 </div>
 )}
 </div>

 {/* Top Teams */}
 <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
 <div className="flex items-center gap-2 mb-5">
 <Users className="w-4 h-4 text-emerald-400" />
 <h4 className="text-sm font-bold text-white">Top Assignment Groups</h4>
 </div>
 {trends.topTeams.length === 0 ? (
 <p className="text-xs text-slate-500 text-center py-6">No assignment data available yet.</p>
 ) : (
 <div className="space-y-3">
 {trends.topTeams.map((team, i) => (
 <div key={team.name}><MiniBar
 label={team.name}
 count={team.count}
 total={trends.totalAnalyzed}
 color={getCategoryColor(i + 3)}
 /></div>
 ))}
 </div>
 )}
 </div>

 {/* Recurring Issues */}
 {trends.recurringIssues.length > 0 && (
 <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
 <div className="flex items-center gap-2 mb-5">
 <RefreshCw className="w-4 h-4 text-rose-400" />
 <h4 className="text-sm font-bold text-white">Recurring Issues</h4>
 <span className="text-[10px] bg-rose-500/20 text-rose-400 font-bold px-2 py-0.5 rounded-full border border-rose-500/30">
 Reported multiple times
 </span>
 </div>
 <div className="space-y-2">
 {trends.recurringIssues.map((issue, i) => (
 <div
 key={i}
 className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-black/20 border border-white/5"
 >
 <span className="text-sm text-slate-300 truncate flex-grow">{issue.title}</span>
 <span className="shrink-0 ml-3 text-xs font-semibold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
 ×{issue.count}
 </span>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Common Keywords */}
 {trends.avgResponseKeywords.length > 0 && (
 <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
 <div className="flex items-center gap-2 mb-4">
 <Zap className="w-4 h-4 text-sky-400" />
 <h4 className="text-sm font-bold text-white">Most Frequent Issue Keywords</h4>
 </div>
 <div className="flex flex-wrap gap-2">
 {trends.avgResponseKeywords.map((kw) => (
 <span key={kw}><KeywordBadge word={kw} /></span>
 ))}
 </div>
 </div>
 )}

 {/* Avg Resolution by Priority (server data) */}
 {serverStats?.avgResolutionByPriority?.length > 0 && (
 <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
 <div className="flex items-center gap-2 mb-5">
 <Clock className="w-4 h-4 text-cyan-400" />
 <h4 className="text-sm font-bold text-white">Avg Resolution Time by Priority</h4>
 </div>
 <div className="space-y-3">
 {serverStats.avgResolutionByPriority.map((item: any) => (
 <div key={item.priority} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-black/20 border border-white/5">
 <div className="flex items-center gap-2">
 <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getPriorityColor(item.priority ||"") }} />
 <span className="text-sm text-slate-300">{item.priority ||"Unknown"}</span>
 </div>
 <span className="text-sm font-bold text-white">
 {item.avg_hours != null ? `${item.avg_hours}h` :"—"}
 </span>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 3 — AI Dashboard
// ─────────────────────────────────────────────────────────────────────────────
function AIDashboard({
 tickets,
 serverStats,
 kbArticles,
}: {
 tickets: any[];
 serverStats: any;
 kbArticles: any[];
}) {
 const trends = analyzeTrends(tickets);

 const insightCards = [
 {
 icon: Tag,
 color:"#8b5cf6",
 title:"Top Category",
 value: trends.topCategories[0]?.name ||"N/A",
 sub: trends.topCategories[0] ? `${trends.topCategories[0].percentage}% of all tickets` :"No data",
 },
 {
 icon: AlertTriangle,
 color:"#f97316",
 title:"Most Common Priority",
 value: trends.topPriorities[0]?.name ||"N/A",
 sub: trends.topPriorities[0] ? `${trends.topPriorities[0].count} tickets` :"No data",
 },
 {
 icon: Users,
 color:"#10b981",
 title:"Busiest Team",
 value: trends.topTeams[0]?.name ||"N/A",
 sub: trends.topTeams[0] ? `${trends.topTeams[0].count} assigned` :"No data",
 },
 {
 icon: BookOpen,
 color:"#06b6d4",
 title:"KB Articles",
 value: kbArticles.length,
 sub:"Available in knowledge base",
 },
 ];

 return (
 <div className="space-y-6">
 <div>
 <h3 className="text-base font-bold text-white">AI Intelligence Dashboard</h3>
 <p className="text-xs text-slate-400 mt-0.5">
 Real-time insights generated from your ticketing system data
 </p>
 </div>

 {/* Key Insights */}
 <div className="grid grid-cols-2 gap-4">
 {insightCards.map((card, i) => (
 <div
 key={i}
 className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-start gap-4 hover:border-white/20 transition-all"
 >
 <div
 className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
 style={{ backgroundColor: card.color +"22" }}
 >
 <card.icon className="w-5 h-5" style={{ color: card.color }} />
 </div>
 <div className="min-w-0">
 <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
 {card.title}
 </p>
 <p className="text-base font-semibold text-white truncate">{card.value}</p>
 <p className="text-[11px] text-slate-500 mt-0.5">{card.sub}</p>
 </div>
 </div>
 ))}
 </div>

 {/* Server Stats Row */}
 {serverStats && (
 <div className="grid grid-cols-3 gap-4">
 <StatCard icon={BarChart2} label="Total Tickets" value={serverStats.totalTickets ?? 0} color="#6366f1" />
 <StatCard icon={Clock} label="Open Tickets" value={serverStats.openTickets ?? 0} color="#f97316" />
 <StatCard icon={CheckCircle2} label="Resolved" value={serverStats.resolvedTickets ?? 0} color="#22c55e" />
 </div>
 )}

 {/* Category Summary */}
 {trends.topCategories.length > 0 && (
 <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
 <div className="flex items-center gap-2 mb-5">
 <Tag className="w-4 h-4 text-violet-400" />
 <h4 className="text-sm font-bold text-white">Suggested Categories Overview</h4>
 </div>
 <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
 {trends.topCategories.slice(0, 6).map((cat, i) => (
 <div
 key={cat.name}
 className="flex items-center gap-3 p-3 rounded-xl bg-black/20 border border-white/5"
 >
 <div
 className="w-2.5 h-2.5 rounded-full shrink-0"
 style={{ backgroundColor: getCategoryColor(i) }}
 />
 <div className="min-w-0">
 <p className="text-xs font-bold text-white truncate">{cat.name}</p>
 <p className="text-[10px] text-slate-500">{cat.count} tickets</p>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Team Suggestions */}
 {trends.topTeams.length > 0 && (
 <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
 <div className="flex items-center gap-2 mb-5">
 <Users className="w-4 h-4 text-emerald-400" />
 <h4 className="text-sm font-bold text-white">Suggested Team Assignments</h4>
 </div>
 <div className="space-y-2">
 {trends.topTeams.slice(0, 5).map((team, i) => (
 <div
 key={team.name}
 className="flex items-center gap-3 p-3 rounded-xl bg-black/20 border border-white/5"
 >
 <div
 className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-semibold text-white"
 style={{ backgroundColor: getCategoryColor(i + 2) +"33" }}
 >
 {i + 1}
 </div>
 <span className="flex-grow text-sm text-slate-200 font-medium">{team.name}</span>
 <div className="text-right">
 <span className="text-xs font-semibold text-white">{team.count}</span>
 <span className="text-[10px] text-slate-500 ml-1">tickets</span>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Knowledge Base Summary */}
 <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
 <div className="flex items-center gap-2 mb-4">
 <BookOpen className="w-4 h-4 text-orange-400" />
 <h4 className="text-sm font-bold text-white">Knowledge Base Overview</h4>
 </div>
 {kbArticles.length === 0 ? (
 <div className="text-center py-6">
 <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-500 opacity-50" />
 <p className="text-xs text-slate-500">No KB articles yet. Add articles to the Knowledge Base to enable AI recommendations.</p>
 </div>
 ) : (
 <div className="space-y-2">
 {kbArticles.slice(0, 5).map((article) => (
 <div
 key={article.id}
 className="flex items-center gap-3 p-3 rounded-xl bg-black/20 border border-white/5"
 >
 <BookOpen className="w-3.5 h-3.5 text-orange-400 shrink-0" />
 <div className="min-w-0 flex-grow">
 <p className="text-xs font-semibold text-white truncate">{article.title}</p>
 <p className="text-[10px] text-slate-500">{article.category}</p>
 </div>
 <div className="flex items-center gap-1 shrink-0">
 <ArrowUpRight className="w-3 h-3 text-orange-400" />
 </div>
 </div>
 ))}
 {kbArticles.length > 5 && (
 <p className="text-[11px] text-slate-500 text-center pt-1">
 +{kbArticles.length - 5} more articles available
 </p>
 )}
 </div>
 )}
 </div>

 {/* Info Banner */}
 <div className="bg-gradient-to-r from-indigo-900/30 to-violet-900/30 border border-indigo-500/20 rounded-2xl p-4 flex items-start gap-3">
 <Info className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
 <div>
 <p className="text-xs font-bold text-indigo-300 mb-1">About AI Assistant</p>
 <p className="text-xs text-slate-400 leading-relaxed">
 All recommendations are generated using internal rule-based logic and keyword matching against your system data. No external AI services, APIs, or third-party tools are used.
 </p>
 </div>
 </div>
 </div>
 );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export function AIAssistant() {
 const [activeTab, setActiveTab] = useState<ActiveTab>("analyzer");
 const [tickets, setTickets] = useState<any[]>([]);
 const [kbArticles, setKbArticles] = useState<any[]>([]);
 const [serverStats, setServerStats] = useState<any>(null);
 const [loading, setLoading] = useState(true);

 // Fetch tickets
 const fetchTickets = useCallback(async () => {
 try {
 const res = await fetch("/api/tickets/all");
 if (res.ok) {
 const data = await res.json();
 setTickets(data);
 }
 } catch (e) {
 console.error("[AI Assistant] Failed to fetch tickets:", e);
 }
 }, []);

 // Fetch server stats
 const fetchServerStats = useCallback(async () => {
 try {
 const res = await fetch("/api/ai/assistant/stats");
 if (res.ok) {
 const data = await res.json();
 setServerStats(data);
 }
 } catch (e) {
 console.error("[AI Assistant] Failed to fetch server stats:", e);
 }
 }, []);

 // Fetch KB articles from Firebase
 useEffect(() => {
 let unsubscribe: (() => void) | undefined;
 try {
 const q = query(collection(db,"kb_articles"), orderBy("views","desc"));
 unsubscribe = onSnapshot(q, (snap: any) => {
 const articles = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
 setKbArticles(articles);
 });
 } catch (e) {
 console.error("[AI Assistant] Failed to fetch KB articles:", e);
 }
 return () => unsubscribe?.();
 }, []);

 // Initial data load
 useEffect(() => {
 setLoading(true);
 Promise.all([fetchTickets(), fetchServerStats()]).finally(() => setLoading(false));
 }, [fetchTickets, fetchServerStats]);

 const handleRefresh = useCallback(() => {
 setLoading(true);
 Promise.all([fetchTickets(), fetchServerStats()]).finally(() => setLoading(false));
 }, [fetchTickets, fetchServerStats]);

 const tabs = [
 { id:"analyzer" as ActiveTab, label:"Ticket Analyzer", icon: Sparkles },
 { id:"trends" as ActiveTab, label:"Trend Analysis", icon: TrendingUp },
 { id:"dashboard" as ActiveTab, label:"AI Dashboard", icon: LayoutDashboard },
 ];

 return (
 <div className="min-h-full bg-gradient-to-br from-[#070b1a] via-[#0d1127] to-[#070b1a]">
 {/* Page Header */}
 <div className="border-b border-white/10 bg-black/20 backdrop-blur-sm px-6 py-5">
 <div className="max-w-6xl mx-auto flex items-center gap-4">
 <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
 <Brain className="w-6 h-6 text-white" />
 </div>
 <div>
 <h1 className="text-xl font-semibold text-white flex items-center gap-2">
 AI Assistant
 <span className="text-[10px] bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ml-1">
 No External APIs
 </span>
 </h1>
 <p className="text-sm text-slate-400 mt-0.5">
 Intelligent recommendations powered by internal rules and system data
 </p>
 </div>
 <div className="ml-auto flex items-center gap-2">
 <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
 <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
 <span className="text-[11px] font-bold text-emerald-400">
 {tickets.length} tickets loaded
 </span>
 </div>
 </div>
 </div>
 </div>

 {/* Tab Navigation */}
 <div className="border-b border-white/10 bg-black/10 px-6">
 <div className="max-w-6xl mx-auto flex items-center gap-1">
 {tabs.map((tab) => (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id)}
 className={cn(
"flex items-center gap-2 px-4 py-3.5 text-sm font-semibold transition-all border-b-2 cursor-pointer",
 activeTab === tab.id
 ?"border-indigo-500 text-indigo-400"
 :"border-transparent text-slate-400 hover:text-white hover:border-white/20"
 )}
 >
 <tab.icon className="w-4 h-4" />
 {tab.label}
 </button>
 ))}
 </div>
 </div>

 {/* Tab Content */}
 <div className="max-w-6xl mx-auto px-6 py-6">
 {activeTab ==="analyzer" && (
 <TicketAnalyzer kbArticles={kbArticles} />
 )}
 {activeTab ==="trends" && (
 <TrendAnalysis
 tickets={tickets}
 loading={loading}
 serverStats={serverStats}
 onRefresh={handleRefresh}
 />
 )}
 {activeTab ==="dashboard" && (
 <AIDashboard
 tickets={tickets}
 serverStats={serverStats}
 kbArticles={kbArticles}
 />
 )}
 </div>
 </div>
 );
}
