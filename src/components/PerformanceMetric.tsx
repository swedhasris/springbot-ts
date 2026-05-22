import React from "react";
import { cn } from "@/lib/utils";

interface PerformanceMetricProps {
  label: string;
  value: string | number;
}

export default function PerformanceMetric({ label, value }: PerformanceMetricProps) {
  let borderColor = "border-t-slate-400";
  let textColor = "text-slate-800";
  let badgeColor = "bg-slate-50 text-slate-600 border-slate-200";

  const lowerLabel = label.toLowerCase();
  if (lowerLabel.includes("completion")) {
    borderColor = "border-t-violet-500";
    textColor = "text-violet-700";
    badgeColor = "bg-violet-50 text-violet-700 border-violet-100";
  } else if (lowerLabel.includes("resolution")) {
    borderColor = "border-t-amber-500";
    textColor = "text-amber-700";
    badgeColor = "bg-amber-50 text-amber-700 border-amber-100";
  } else if (lowerLabel.includes("today")) {
    borderColor = "border-t-emerald-500";
    textColor = "text-emerald-700";
    badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-100";
  } else if (lowerLabel.includes("weekly")) {
    borderColor = "border-t-blue-500";
    textColor = "text-blue-700";
    badgeColor = "bg-blue-50 text-blue-700 border-blue-100";
  } else if (lowerLabel.includes("monthly")) {
    borderColor = "border-t-fuchsia-500";
    textColor = "text-fuchsia-700";
    badgeColor = "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100";
  } else if (lowerLabel.includes("productivity")) {
    borderColor = "border-t-cyan-500";
    textColor = "text-cyan-700";
    badgeColor = "bg-cyan-50 text-cyan-700 border-cyan-100";
  }

  return (
    <div
      className={cn(
        "p-5 bg-white border border-border border-t-4 rounded-xl shadow-sm transition-all duration-300 hover:shadow-md flex flex-col justify-between",
        borderColor
      )}
    >
      <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">{label}</div>
      <div className="flex items-baseline justify-between">
        <span className={cn("text-3xl font-bold tracking-tight", textColor)}>{value}</span>
        <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-full border", badgeColor)}>
          Metric
        </span>
      </div>
    </div>
  );
}
