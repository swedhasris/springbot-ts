import React from"react";
import { cn } from"@/lib/utils";

interface AnalyticsCardProps {
 title: string;
 value: number | string;
}

export default function AnalyticsCard({ title, value }: AnalyticsCardProps) {
 let accentColor ="bg-slate-500";
 let textColor ="text-foreground";

 const lowerTitle = title.toLowerCase();
 if (lowerTitle.includes("assigned")) {
 accentColor ="bg-indigo-500";
 textColor ="text-indigo-600 dark:text-indigo-400";
 } else if (lowerTitle.includes("created")) {
 accentColor ="bg-cyan-500";
 textColor ="text-cyan-600 dark:text-cyan-400";
 } else if (lowerTitle.includes("open")) {
 accentColor ="bg-blue-500";
 textColor ="text-blue-600 dark:text-blue-400";
 } else if (lowerTitle.includes("progress")) {
 accentColor ="bg-amber-500";
 textColor ="text-amber-600 dark:text-amber-400";
 } else if (lowerTitle.includes("resolved")) {
 accentColor ="bg-emerald-500";
 textColor ="text-emerald-600 dark:text-emerald-400";
 } else if (lowerTitle.includes("closed")) {
 accentColor ="bg-teal-500";
 textColor ="text-teal-600 dark:text-teal-400";
 } else if (lowerTitle.includes("pending")) {
 accentColor ="bg-purple-500";
 textColor ="text-purple-600 dark:text-purple-400";
 } else if (lowerTitle.includes("overdue") || lowerTitle.includes("breaches")) {
 accentColor ="bg-rose-500";
 textColor ="text-rose-600 dark:text-rose-400";
 }

 return (
 <div className="relative overflow-hidden rounded-xl border bg-card p-6 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgba(255,255,255,0.04)] group">
 <div className={cn("absolute top-0 left-0 w-full h-1", accentColor)} />
 <div className="relative z-10 flex flex-col justify-between h-full">
 <div className="card-title mb-2">
 {title}
 </div>
 <div className={cn("metric-value mt-2", textColor)}>
 {value}
 </div>
 </div>
 </div>
 );
}
