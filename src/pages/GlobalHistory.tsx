import React, { useEffect, useState } from"react";
import { collection, query, orderBy, onSnapshot, limit } from"firebase/firestore";
import { db } from"../lib/firebase";
import { History, Ticket, User, Clock } from"lucide-react";
import { Link } from"react-router-dom";

export function GlobalHistory() {
 const [activities, setActivities] = useState<any[]>([]);

 useEffect(() => {
 // Since history is nested in tickets, we fetch all tickets and flatten their history
 // For a real production app, we would have a separate 'activity' collection
 const q = query(collection(db,"tickets"), orderBy("updatedAt","desc"), limit(50));
 const unsubscribe = onSnapshot(q, (snapshot) => {
 const allHistory: any[] = [];
 snapshot.docs.forEach(doc => {
 const data = doc.data();
 if (data.history) {
 data.history.forEach((h: any) => {
 allHistory.push({
 ...h,
 ticketId: doc.id,
 ticketNumber: data.number,
 ticketTitle: data.title
 });
 });
 }
 });
 // Sort by timestamp descending
 allHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
 setActivities(allHistory.slice(0, 50));
 });
 return unsubscribe;
 }, []);

 return (
 <div className="space-y-6">
 <div>
 <h1 className="text-3xl font-bold tracking-tight">System Activity Log</h1>
 <p className="text-muted-foreground">Real-time audit trail of all ticket modifications and system events.</p>
 </div>

 <div className="sn-card p-0 overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="bg-muted/50">
 <th className="data-table-header p-4">Time</th>
 <th className="data-table-header p-4">User</th>
 <th className="data-table-header p-4">Action</th>
 <th className="data-table-header p-4">Ticket</th>
 </tr>
 </thead>
 <tbody>
 {activities.length === 0 ? (
 <tr>
 <td colSpan={4} className="p-8 text-center text-muted-foreground italic">
 No activity recorded yet.
 </td>
 </tr>
 ) : (
 activities.map((activity, idx) => (
 <tr key={idx} className="data-table-row">
 <td className="p-4">
 <div className="flex items-center gap-2 text-sm">
 <Clock className="w-3 h-3 text-muted-foreground" />
 {new Date(activity.timestamp).toLocaleString()}
 </div>
 </td>
 <td className="p-4">
 <div className="flex items-center gap-2 text-sm font-medium">
 <User className="w-3 h-3 text-blue-600" />
 {activity.user}
 </div>
 </td>
 <td className="p-4">
 <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider">
 {activity.action}
 </span>
 </td>
 <td className="p-4">
 <Link to={`/tickets/${activity.ticketId}`} className="flex items-center gap-2 group">
 <Ticket className="w-3 h-3 text-sn-green" />
 <span className="text-xs font-bold text-blue-600 group-hover:underline">
 {activity.ticketNumber}
 </span>
 <span className="text-xs text-muted-foreground truncate max-w-[200px]">
 - {activity.ticketTitle}
 </span>
 </Link>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 );
}
