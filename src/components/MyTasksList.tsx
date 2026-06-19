import React from"react";
import { CheckSquare, Square, PlayCircle, HelpCircle } from"lucide-react";

interface Task {
 id: string;
 title: string;
 status: string;
 priority: string;
}

interface MyTasksListProps {
 tasks: Task[];
}

export default function MyTasksList({ tasks }: MyTasksListProps) {
 const getPriorityStyle = (priority: string) => {
 switch (priority.toLowerCase()) {
 case"critical":
 return"bg-rose-500/10 text-rose-400 border border-rose-500/20";
 case"high":
 return"bg-amber-500/10 text-amber-400 border border-amber-500/20";
 case"medium":
 return"bg-blue-500/10 text-blue-400 border border-blue-500/20";
 default:
 return"bg-slate-500/10 text-slate-400 border border-slate-500/20";
 }
 };

 const getStatusIcon = (status: string) => {
 switch (status.toLowerCase()) {
 case"in_progress":
 return <PlayCircle className="w-4 h-4 text-amber-400 animate-pulse" />;
 case"resolved":
 case"closed":
 return <CheckSquare className="w-4 h-4 text-emerald-400" />;
 case"pending":
 return <HelpCircle className="w-4 h-4 text-purple-400" />;
 default:
 return <Square className="w-4 h-4 text-slate-500/60" />;
 }
 };

 const getStatusStyle = (status: string) => {
 switch (status.toLowerCase()) {
 case"in_progress":
 return"bg-amber-500/10 text-amber-400 border border-amber-500/20";
 case"resolved":
 case"closed":
 return"bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
 case"pending":
 return"bg-purple-500/10 text-purple-400 border border-purple-500/20";
 default:
 return"bg-slate-500/10 text-slate-400 border border-slate-500/20";
 }
 };

 return (
 <div className="glass-panel rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 border border-border/80">
 <div className="flex items-center justify-between mb-4 border-b border-border/40 pb-3">
 <h3 className="text-[10px] font-semibold uppercase tracking-widest text-foreground">My Action Items</h3>
 </div>
 <div className="divide-y divide-border/30">
 {tasks.map((task) => (
 <div key={task.id} className="flex justify-between items-center py-3.5 first:pt-0 last:pb-0 gap-4 group">
 <div className="flex items-center gap-3">
 <span className="flex-shrink-0 transition-transform group-hover:scale-110">
 {getStatusIcon(task.status)}
 </span>
 <div>
 <p className="text-xs font-semibold text-foreground/90 group-hover:text-cyan-400 transition-colors">{task.title}</p>
 <span className="text-[8px] text-muted-foreground mt-0.5 inline-block tracking-wider">ID: TASK-{task.id}</span>
 </div>
 </div>
 <div className="flex items-center gap-2 flex-shrink-0">
 <span className={`text-[8px] font-semibold uppercase px-2 py-0.5 rounded border tracking-wider ${getPriorityStyle(task.priority)}`}>
 {task.priority}
 </span>
 <span className={`text-[8px] font-semibold uppercase px-2 py-0.5 rounded border tracking-wider ${getStatusStyle(task.status)}`}>
 {task.status.replace("_","")}
 </span>
 </div>
 </div>
 ))}
 </div>
 </div>
 );
}
