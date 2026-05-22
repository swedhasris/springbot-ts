import React from "react";
import { cn } from "@/lib/utils";

interface AnalyticsCardProps {
  title: string;
  value: number | string;
}

export default function AnalyticsCard({ title, value }: AnalyticsCardProps) {
  // Determine color theme based on the title
  let borderColor = "border-l-slate-400";
  let textColor = "text-slate-800";
  let bgHover = "hover:border-slate-300";

  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes("assigned")) {
    borderColor = "border-l-indigo-500";
    textColor = "text-indigo-600";
    bgHover = "hover:border-indigo-200 hover:shadow-indigo-500/5";
  } else if (lowerTitle.includes("created")) {
    borderColor = "border-l-sky-500";
    textColor = "text-sky-600";
    bgHover = "hover:border-sky-200 hover:shadow-sky-500/5";
  } else if (lowerTitle.includes("open")) {
    borderColor = "border-l-blue-500";
    textColor = "text-blue-600";
    bgHover = "hover:border-blue-200 hover:shadow-blue-500/5";
  } else if (lowerTitle.includes("progress")) {
    borderColor = "border-l-amber-500";
    textColor = "text-amber-600";
    bgHover = "hover:border-amber-200 hover:shadow-amber-500/5";
  } else if (lowerTitle.includes("resolved")) {
    borderColor = "border-l-emerald-500";
    textColor = "text-emerald-600";
    bgHover = "hover:border-emerald-200 hover:shadow-emerald-500/5";
  } else if (lowerTitle.includes("closed")) {
    borderColor = "border-l-teal-600";
    textColor = "text-teal-700";
    bgHover = "hover:border-teal-200 hover:shadow-teal-500/5";
  } else if (lowerTitle.includes("pending")) {
    borderColor = "border-l-purple-500";
    textColor = "text-purple-600";
    bgHover = "hover:border-purple-200 hover:shadow-purple-500/5";
  } else if (lowerTitle.includes("overdue")) {
    borderColor = "border-l-rose-500";
    textColor = "text-rose-600";
    bgHover = "hover:border-rose-200 hover:shadow-rose-500/5";
  }

  return (
    <div
      className={cn(
        "p-5 bg-white border border-border border-l-4 rounded-xl shadow-sm transition-all duration-300 hover:shadow-md",
        borderColor,
        bgHover
      )}
    >
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">{title}</p>
      <p className={cn("text-3xl font-light tracking-tight", textColor)}>{value}</p>
    </div>
  );
}
