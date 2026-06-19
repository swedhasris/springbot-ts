import React from"react";
import { Clock, History, ArrowRightLeft, AlertTriangle, UserCheck, Shield, Zap, CheckCircle2, Info } from"lucide-react";
import { cn } from"@/lib/utils";

export interface SystemActivityCardProps {
 activity: any;
 formatDate: (date: any) => string;
}

const ACTIVITY_ICONS: Record<string, { icon: React.ReactNode; color: string; bg: string; borderColor: string }> = {
 status_change: { icon: <ArrowRightLeft className="w-2.5 h-2.5 text-white" />, color:"bg-indigo-500", bg:"bg-indigo-50", borderColor:"border-indigo-200" },
 sla_triggered: { icon: <AlertTriangle className="w-2.5 h-2.5 text-white" />, color:"bg-red-500", bg:"bg-red-50", borderColor:"border-red-200" },
 assignment_change: { icon: <UserCheck className="w-2.5 h-2.5 text-white" />, color:"bg-teal-500", bg:"bg-teal-50", borderColor:"border-teal-200" },
 resolution: { icon: <CheckCircle2 className="w-2.5 h-2.5 text-white" />, color:"bg-emerald-500", bg:"bg-emerald-50", borderColor:"border-emerald-200" },
 system: { icon: <Zap className="w-2.5 h-2.5 text-white" />, color:"bg-gray-500", bg:"bg-gray-50", borderColor:"border-gray-200" },
 info: { icon: <Info className="w-2.5 h-2.5 text-white" />, color:"bg-blue-500", bg:"bg-blue-50", borderColor:"border-blue-200" },
};

export function SystemActivityCard({ activity, formatDate }: SystemActivityCardProps) {
 let metadata: any = {};
 try {
 metadata = typeof activity.metadata_json === 'string' ? JSON.parse(activity.metadata_json) : (activity.metadata_json || {});
 } catch (e) { }

 const typeConfig = ACTIVITY_ICONS[activity.activity_type] || ACTIVITY_ICONS.system;
 const isSLA = activity.activity_type === 'sla_triggered';

 return (
 <div className="relative pl-6 pb-4 last:pb-0 border-l-2 border-gray-200 ml-2 group">
 {/* Timeline Node */}
 <div className={cn(
"absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm",
 typeConfig.color
 )}>
 {typeConfig.icon}
 </div>

 {/* Card */}
 <div className={cn(
"flex flex-col gap-1.5 p-3 rounded-lg border shadow-sm transition-all duration-200 hover:shadow-md",
 typeConfig.bg,
 typeConfig.borderColor,
 isSLA &&"ring-1 ring-red-200"
 )}>
 {/* Header */}
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className={cn("w-5 h-5 rounded-full flex items-center justify-center", typeConfig.color)}>
 {typeConfig.icon}
 </div>
 <span className="text-[11px] font-bold text-gray-700">
 {activity.activity_type === 'status_change' ? 'Status Change' :
 activity.activity_type === 'sla_triggered' ? 'SLA Alert' :
 activity.activity_type === 'assignment_change' ? 'Assignment Change' :
 activity.activity_type === 'resolution' ? 'Ticket Resolved' :
 activity.activity_type === 'field_change' ? 'Field Updated' :
 'System Activity'}
 </span>
 <span className={cn(
"text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider",
 isSLA ?"bg-red-100 text-red-700" : 
 activity.activity_type === 'resolution' ?"bg-emerald-100 text-emerald-700" :
"bg-gray-200 text-gray-600"
 )}>
 {activity.activity_type.replace(/_/g, ' ')}
 </span>
 </div>
 <div className="flex items-center gap-1 text-muted-foreground">
 <Clock className="w-3 h-3" />
 <span className="text-[10px] font-medium">{formatDate(activity.created_at)}</span>
 </div>
 </div>

 {/* Message */}
 <div className="text-xs text-gray-700 font-medium pl-7">
 {activity.message}
 </div>

 {/* Field Change Details */}
 {metadata.oldValue !== undefined && metadata.newValue !== undefined && (
 <div className="flex flex-col gap-1 mt-1 ml-7">
 {metadata.fieldName && (
 <span className="text-[9px] text-muted-foreground uppercase font-semibold px-1">{metadata.fieldName.replace(/([A-Z])/g, ' $1').trim()}</span>
 )}
 <div className="flex items-center gap-2 text-[11px] bg-white p-2 border border-gray-100 rounded-md">
 <span className="px-2 py-0.5 rounded bg-gray-50 text-gray-500 font-medium text-[10px] line-through decoration-gray-300">{String(metadata.oldValue) ||"none"}</span>
 <ArrowRightLeft className="w-3 h-3 text-gray-400" />
 <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[10px]">{String(metadata.newValue) ||"none"}</span>
 </div>
 </div>
 )}

 {/* Status Change Details (Legacy Support) */}
 {metadata.oldStatus && metadata.newStatus && !metadata.oldValue && (
 <div className="flex items-center gap-2 text-[11px] bg-white p-2.5 border border-gray-100 rounded-md mt-1 ml-7">
 <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-bold text-[10px]">{metadata.oldStatus}</span>
 <ArrowRightLeft className="w-3 h-3 text-gray-400" />
 <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold text-[10px]">{metadata.newStatus}</span>
 </div>
 )}

 {/* Resolution Details */}
 {activity.activity_type === 'resolution' && (
 <div className="bg-white/80 p-3 rounded-md border border-emerald-100 mt-1 ml-7 space-y-2">
 <div className="grid grid-cols-2 gap-x-4 gap-y-2">
 <div>
 <p className="text-[9px] text-muted-foreground uppercase font-semibold">Resolution Code</p>
 <p className="text-[11px] font-bold text-emerald-800">{metadata.resolutionCode ||"N/A"}</p>
 </div>
 <div>
 <p className="text-[9px] text-muted-foreground uppercase font-semibold">Method</p>
 <p className="text-[11px] font-bold text-gray-700">{metadata.resolutionMethod ||"N/A"}</p>
 </div>
 {metadata.closureReason && (
 <div className="col-span-2">
 <p className="text-[9px] text-muted-foreground uppercase font-semibold">Closure Reason</p>
 <p className="text-[11px] font-bold text-amber-700">{metadata.closureReason}</p>
 </div>
 )}
 </div>
 {metadata.resolutionNotes && (
 <div className="pt-2 border-t border-emerald-100/50">
 <p className="text-[9px] text-muted-foreground uppercase font-semibold mb-1">Notes</p>
 <p className="text-[11px] text-gray-600 italic leading-relaxed">"{metadata.resolutionNotes}"</p>
 </div>
 )}
 </div>
 )}

 {/* Actor info */}
 {activity.created_by_name && activity.created_by_name !== 'System' && (
 <div className="flex items-center gap-1.5 text-[10px] text-gray-500 pl-7 mt-0.5">
 <Shield className="w-3 h-3" />
 <span>by <span className="font-semibold text-gray-700">{activity.created_by_name}</span></span>
 </div>
 )}
 </div>
 </div>
 );
}
