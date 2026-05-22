import React from "react";
import { Link } from "react-router-dom";
import { Ticket, Calendar, BookOpen, Settings } from "lucide-react";

export default function QuickActions() {
  const actions = [
    {
      title: "View Tickets",
      to: "/tickets",
      icon: <Ticket className="w-4 h-4" />,
      color: "from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-blue-500/10",
      description: "Manage your assigned tickets"
    },
    {
      title: "View Calendar",
      to: "/calendar",
      icon: <Calendar className="w-4 h-4" />,
      color: "from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-500/10",
      description: "See scheduled tasks & outages"
    },
    {
      title: "Knowledge Base",
      to: "/kb",
      icon: <BookOpen className="w-4 h-4" />,
      color: "from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-500/10",
      description: "Browse articles & guides"
    },
    {
      title: "System Settings",
      to: "/settings",
      icon: <Settings className="w-4 h-4" />,
      color: "from-slate-600 to-slate-800 hover:from-slate-700 hover:to-slate-900 shadow-slate-500/10",
      description: "Manage your preferences"
    }
  ];

  return (
    <div className="bg-white border border-border rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-foreground">Quick Shortcuts</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((act) => (
          <Link
            key={act.to}
            to={act.to}
            className={`flex items-start gap-3 p-3.5 rounded-xl bg-gradient-to-br ${act.color} text-white shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5`}
          >
            <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm flex items-center justify-center">
              {act.icon}
            </div>
            <div>
              <p className="text-xs font-bold leading-tight">{act.title}</p>
              <p className="text-[9px] text-white/80 mt-1 line-clamp-1 leading-normal">{act.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
