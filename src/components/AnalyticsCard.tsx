import React from "react";
import { cn } from "@/lib/utils";

interface AnalyticsCardProps {
  title: string;
  value: number | string;
}

export default function AnalyticsCard({ title, value }: AnalyticsCardProps) {
  let borderGlow = "border-l-slate-400 hover:border-slate-400/40";
  let textColor = "text-foreground dark:text-white";
  let glowShadow = "hover:shadow-[0_0_15px_rgba(148,163,184,0.15)]";

  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes("assigned")) {
    borderGlow = "border-l-indigo-500 hover:border-indigo-400";
    textColor = "text-indigo-600 dark:text-indigo-400";
    glowShadow = "hover:shadow-[0_0_15px_rgba(99,102,241,0.25)]";
  } else if (lowerTitle.includes("created")) {
    borderGlow = "border-l-cyan-400 hover:border-cyan-300";
    textColor = "text-cyan-600 dark:text-cyan-400";
    glowShadow = "hover:shadow-[0_0_15px_rgba(34,211,238,0.25)]";
  } else if (lowerTitle.includes("open")) {
    borderGlow = "border-l-blue-500 hover:border-blue-400";
    textColor = "text-blue-600 dark:text-blue-400";
    glowShadow = "hover:shadow-[0_0_15px_rgba(59,130,246,0.25)]";
  } else if (lowerTitle.includes("progress")) {
    borderGlow = "border-l-amber-500 hover:border-amber-400";
    textColor = "text-amber-600 dark:text-amber-400";
    glowShadow = "hover:shadow-[0_0_15px_rgba(245,158,11,0.25)]";
  } else if (lowerTitle.includes("resolved")) {
    borderGlow = "border-l-emerald-500 hover:border-emerald-400";
    textColor = "text-emerald-600 dark:text-emerald-400";
    glowShadow = "hover:shadow-[0_0_15px_rgba(16,185,129,0.25)]";
  } else if (lowerTitle.includes("closed")) {
    borderGlow = "border-l-teal-600 hover:border-teal-500";
    textColor = "text-teal-700 dark:text-teal-400";
    glowShadow = "hover:shadow-[0_0_15px_rgba(13,148,136,0.25)]";
  } else if (lowerTitle.includes("pending")) {
    borderGlow = "border-l-purple-500 hover:border-purple-400";
    textColor = "text-purple-600 dark:text-purple-400";
    glowShadow = "hover:shadow-[0_0_15px_rgba(168,85,247,0.25)]";
  } else if (lowerTitle.includes("overdue") || lowerTitle.includes("breaches")) {
    borderGlow = "border-l-rose-500 hover:border-rose-400";
    textColor = "text-rose-600 dark:text-rose-400";
    glowShadow = "hover:shadow-[0_0_15px_rgba(244,63,94,0.25)]";
  }

  return (
    <div
      className={cn(
        "p-5 glass-panel border-l-4 rounded-2xl transition-all duration-300 hover:-translate-y-1",
        borderGlow,
        glowShadow
      )}
    >
      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2.5 font-outfit">{title}</p>
      <p className={cn("text-3xl font-bold tracking-tight font-orbitron", textColor)}>{value}</p>
    </div>
  );
}
