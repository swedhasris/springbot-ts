import React from"react";
import { cn } from"@/lib/utils";

interface PerformanceMetricProps {
 label: string;
 value: string | number;
}

export default function PerformanceMetric({ label, value }: PerformanceMetricProps) {
 let borderColor ="border-t-slate-400";
 let textColor ="text-slate-800 dark:text-slate-300";
 let badgeColor ="bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";
 let glowShadow ="hover:shadow-[0_0_15px_rgba(148,163,184,0.15)]";

 const lowerLabel = label.toLowerCase();
 if (lowerLabel.includes("completion")) {
 borderColor ="border-t-violet-500";
 textColor ="text-violet-600 dark:text-violet-400";
 badgeColor ="bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/20";
 glowShadow ="hover:shadow-[0_0_15px_rgba(168,85,247,0.25)]";
 } else if (lowerLabel.includes("resolution")) {
 borderColor ="border-t-amber-500";
 textColor ="text-amber-600 dark:text-amber-400";
 badgeColor ="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20";
 glowShadow ="hover:shadow-[0_0_15px_rgba(245,158,11,0.25)]";
 } else if (lowerLabel.includes("today")) {
 borderColor ="border-t-emerald-500";
 textColor ="text-emerald-600 dark:text-emerald-400";
 badgeColor ="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
 glowShadow ="hover:shadow-[0_0_15px_rgba(16,185,129,0.25)]";
 } else if (lowerLabel.includes("weekly")) {
 borderColor ="border-t-blue-500";
 textColor ="text-blue-600 dark:text-blue-400";
 badgeColor ="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20";
 glowShadow ="hover:shadow-[0_0_15px_rgba(59,130,246,0.25)]";
 } else if (lowerLabel.includes("monthly")) {
 borderColor ="border-t-fuchsia-500";
 textColor ="text-fuchsia-600 dark:text-fuchsia-400";
 badgeColor ="bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/20";
 glowShadow ="hover:shadow-[0_0_15px_rgba(217,70,239,0.25)]";
 } else if (lowerLabel.includes("productivity")) {
 borderColor ="border-t-cyan-500";
 textColor ="text-cyan-600 dark:text-cyan-400";
 badgeColor ="bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/20";
 glowShadow ="hover:shadow-[0_0_15px_rgba(34,211,238,0.25)]";
 }

 return (
 <div
 className={cn(
"p-5 glass-panel border-t-4 rounded-2xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between",
 borderColor,
 glowShadow
 )}
 >
 <div className="card-title mb-3.5">{label}</div>
 <div className="flex items-baseline justify-between">
 <span className={cn("metric-value", textColor)}>{value}</span>
 <span className={cn("text-[8px] font-semibold uppercase px-2 py-0.5 rounded-full border tracking-widest", badgeColor)}>
 Telemetry
 </span>
 </div>
 </div>
 );
}
