import React from"react";
import { Link } from"react-router-dom";
import { Ticket, Calendar, BookOpen, Settings } from"lucide-react";

export default function QuickActions() {
 const actions = [
 {
 title:"View Tickets",
 to:"/tickets",
 icon: <Ticket className="w-4 h-4 text-cyan-400" />,
 color:"from-cyan-500/10 to-blue-600/10 hover:from-cyan-500/15 hover:to-blue-600/15 border-cyan-500/20 shadow-cyan-500/5 hover:border-cyan-500/40 hover:shadow-cyan-500/10",
 description:"Manage your assigned tickets"
 },
 {
 title:"View Calendar",
 to:"/calendar",
 icon: <Calendar className="w-4 h-4 text-emerald-400" />,
 color:"from-emerald-500/10 to-teal-600/10 hover:from-emerald-500/15 hover:to-teal-600/15 border-emerald-500/20 shadow-emerald-500/5 hover:border-emerald-500/40 hover:shadow-emerald-500/10",
 description:"See scheduled tasks & outages"
 },
 {
 title:"Knowledge Base",
 to:"/kb",
 icon: <BookOpen className="w-4 h-4 text-amber-400" />,
 color:"from-amber-500/10 to-orange-600/10 hover:from-amber-500/15 hover:to-orange-600/15 border-amber-500/20 shadow-amber-500/5 hover:border-amber-500/40 hover:shadow-amber-500/10",
 description:"Browse articles & guides"
 },
 {
 title:"System Settings",
 to:"/settings",
 icon: <Settings className="w-4 h-4 text-purple-400" />,
 color:"from-purple-500/10 to-indigo-600/10 hover:from-purple-500/15 hover:to-indigo-600/15 border-purple-500/20 shadow-purple-500/5 hover:border-purple-500/40 hover:shadow-purple-500/10",
 description:"Manage your preferences"
 }
 ];

 return (
 <div className="glass-panel rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 border border-border/80">
 <div className="flex items-center justify-between mb-4 border-b border-border/40 pb-3">
 <h3 className="text-[10px] font-semibold uppercase tracking-widest text-foreground">Quick Shortcuts</h3>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 {actions.map((act) => (
 <Link
 key={act.to}
 to={act.to}
 className={`flex items-start gap-3 p-3.5 rounded-xl bg-gradient-to-br ${act.color} text-foreground border shadow-sm transition-all duration-300 transform hover:-translate-y-1`}
 >
 <div className="p-2 bg-white/5 dark:bg-black/25 rounded-lg border border-white/10 flex items-center justify-center">
 {act.icon}
 </div>
 <div>
 <p className="text-xs font-semibold leading-tight">{act.title}</p>
 <p className="text-[9px] text-muted-foreground mt-1 line-clamp-1 leading-normal">{act.description}</p>
 </div>
 </Link>
 ))}
 </div>
 </div>
 );
}
