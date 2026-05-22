import React from "react";
import { CheckSquare, Square, PlayCircle, HelpCircle, AlertCircle } from "lucide-react";

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
      case "critical":
        return "bg-rose-50 text-rose-700 border-rose-100";
      case "high":
        return "bg-amber-50 text-amber-700 border-amber-100";
      case "medium":
        return "bg-blue-50 text-blue-700 border-blue-100";
      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "in_progress":
        return <PlayCircle className="w-4 h-4 text-amber-500 animate-pulse" />;
      case "resolved":
      case "closed":
        return <CheckSquare className="w-4 h-4 text-emerald-500" />;
      case "pending":
        return <HelpCircle className="w-4 h-4 text-purple-500" />;
      default:
        return <Square className="w-4 h-4 text-slate-300" />;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "in_progress":
        return "bg-amber-50 text-amber-700 border-amber-100";
      case "resolved":
      case "closed":
        return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "pending":
        return "bg-purple-50 text-purple-700 border-purple-100";
      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="bg-white border border-border rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-foreground">My Action Items</h3>
      </div>
      <div className="divide-y divide-slate-100">
        {tasks.map((task) => (
          <div key={task.id} className="flex justify-between items-center py-3 first:pt-0 last:pb-0 gap-4 group">
            <div className="flex items-center gap-3">
              <span className="flex-shrink-0 transition-transform group-hover:scale-110">
                {getStatusIcon(task.status)}
              </span>
              <div>
                <p className="text-xs font-semibold text-slate-800 group-hover:text-primary transition-colors">{task.title}</p>
                <span className="text-[9px] text-muted-foreground mt-0.5 inline-block">ID: TASK-{task.id}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${getPriorityStyle(task.priority)}`}>
                {task.priority}
              </span>
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${getStatusStyle(task.status)}`}>
                {task.status.replace("_", " ")}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
