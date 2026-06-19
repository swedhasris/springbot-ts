import React from"react";
import { CheckCircle2, PlusCircle, Edit3, XCircle, UserCheck, Activity } from"lucide-react";

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
 case"resolved":
 return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
 case"created":
 return <PlusCircle className="w-3.5 h-3.5 text-cyan-400" />;
 case"updated":
 return <Edit3 className="w-3.5 h-3.5 text-amber-400" />;
 case"closed":
 return <XCircle className="w-3.5 h-3.5 text-slate-400" />;
 case"assigned":
 return <UserCheck className="w-3.5 h-3.5 text-purple-400" />;
 default:
 return <Activity className="w-3.5 h-3.5 text-cyan-400" />;
 }
 };

 const getBg = (type: string) => {
 switch (type) {
 case"resolved":
 return"bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
 case"created":
 return"bg-cyan-500/10 text-cyan-400 border border-cyan-500/20";
 case"updated":
 return"bg-amber-500/10 text-amber-400 border border-amber-500/20";
 case"closed":
 return"bg-slate-500/10 text-slate-400 border border-slate-500/20";
 case"assigned":
 return"bg-purple-500/10 text-purple-400 border border-purple-500/20";
 default:
 return"bg-cyan-500/10 text-cyan-400 border border-cyan-500/20";
 }
 };

 return (
 <div className="glass-panel rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 border border-border/80">
 <div className="flex items-center justify-between mb-6 border-b border-border/40 pb-3">
 <h3 className="text-[10px] font-semibold uppercase tracking-widest text-foreground">Recent Activity Log</h3>
 </div>
 <div className="relative pl-6 border-l border-border/40 space-y-6">
 {items.map((item) => (
 <div key={item.id} className="relative flex items-center justify-between gap-4 group">
 {/* Timeline Dot/Icon */}
 <div
 className="absolute -left-[35px] p-1.5 rounded-full border border-border/40 bg-card/85 backdrop-blur-sm shadow-md transition-transform duration-300 group-hover:scale-110 flex items-center justify-center"
 >
 {getIcon(item.type)}
 </div>

 <div className="flex-grow">
 <p className="text-xs font-semibold text-foreground/90 transition-colors group-hover:text-cyan-400">{item.title}</p>
 <p className="text-[9px] text-muted-foreground mt-0.5">
 {new Date(item.timestamp).toLocaleDateString(undefined, {
 month:"short",
 day:"numeric",
 hour:"2-digit",
 minute:"2-digit",
 })}
 </p>
 </div>

 <span
 className={`text-[8px] font-semibold uppercase px-2 py-0.5 rounded border tracking-wider shrink-0 ${getBg(
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
