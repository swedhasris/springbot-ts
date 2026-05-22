import React from "react";
import { CheckCircle2, PlusCircle, Edit3, XCircle, UserCheck, Activity } from "lucide-react";

interface RecentActivityItem {
  id: string;
  title: string;
  timestamp: string;
  type: string;
}

interface RecentActivityListProps {
  items: RecentActivityItem[];
}

export default function RecentActivityList({ items }: RecentActivityListProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case "resolved":
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
      case "created":
        return <PlusCircle className="w-3.5 h-3.5 text-sky-500" />;
      case "updated":
        return <Edit3 className="w-3.5 h-3.5 text-amber-500" />;
      case "closed":
        return <XCircle className="w-3.5 h-3.5 text-slate-500" />;
      case "assigned":
        return <UserCheck className="w-3.5 h-3.5 text-indigo-500" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-primary" />;
    }
  };

  const getBg = (type: string) => {
    switch (type) {
      case "resolved":
        return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "created":
        return "bg-sky-50 text-sky-700 border-sky-100";
      case "updated":
        return "bg-amber-50 text-amber-700 border-amber-100";
      case "closed":
        return "bg-slate-50 text-slate-700 border-slate-100";
      case "assigned":
        return "bg-indigo-50 text-indigo-700 border-indigo-100";
      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="bg-white border border-border rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center justify-between mb-6 border-b border-border pb-3">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-foreground">Recent Activity Log</h3>
      </div>
      <div className="relative pl-6 border-l border-slate-100 space-y-6">
        {items.map((item) => (
          <div key={item.id} className="relative flex items-center justify-between gap-4 group">
            {/* Timeline Dot/Icon */}
            <div
              className="absolute -left-[35px] p-1 rounded-full border border-slate-100 bg-white shadow-sm transition-transform duration-300 group-hover:scale-110 flex items-center justify-center"
            >
              {getIcon(item.type)}
            </div>

            <div className="flex-grow">
              <p className="text-xs font-semibold text-slate-800 transition-colors group-hover:text-primary">{item.title}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {new Date(item.timestamp).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            
            <span
              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${getBg(
                item.type
              )}`}
            >
              {item.type}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
