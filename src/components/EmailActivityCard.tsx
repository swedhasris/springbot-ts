import React, { useState } from"react";
import { Mail, Clock, CheckCircle2, Paperclip, ExternalLink, X } from"lucide-react";
import { cn } from"@/lib/utils";

export interface EmailActivityCardProps {
 activity: any;
 formatDate: (date: any) => string;
}

function stripHtml(html: string) {
 try {
 const doc = new DOMParser().parseFromString(html, 'text/html');
 return doc.body.textContent ||"";
 } catch (e) {
 return html.replace(/<[^>]+>/g, '').trim();
 }
}

export function EmailActivityCard({ activity, formatDate }: EmailActivityCardProps) {
 const [modalOpen, setModalOpen] = useState(false);

 let metadata: any = {};
 try {
 metadata = typeof activity.metadata_json ==="string" ? JSON.parse(activity.metadata_json) : (activity.metadata_json || {});
 } catch (e) { }

 const isSent = activity.activity_type ==="email_sent" || activity.activity_type ==="email_queued";
 const rawBody = metadata.body_html || metadata.body || activity.message ||"";
 const bodyText = metadata.body_text || stripHtml(rawBody);
 
 let recipientsArray: string[] = [];
 if (Array.isArray(metadata.to)) recipientsArray = metadata.to;
 else if (typeof metadata.to === 'string') recipientsArray = metadata.to.split(',');
 else if (metadata.to) recipientsArray = [metadata.to];
 else recipientsArray = ["System"];

 const recipients = recipientsArray.join(",");
 
 // Truncate text for preview
 const previewText = bodyText.length > 250 ? bodyText.substring(0, 250) +"..." : bodyText;

 return (
 <div className="relative pl-6 pb-6 last:pb-0 border-l border-border ml-2 group">
 <div className={cn(
"absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm",
 isSent ?"bg-purple-500" :"bg-indigo-500"
 )}>
 <Mail className="w-2.5 h-2.5 text-white" />
 </div>
 
 <div className="flex flex-col gap-1.5 p-4 rounded-lg border border-purple-100 bg-purple-50/30 shadow-sm transition-all hover:shadow-md hover:bg-purple-50/60">
 <div className="flex items-center justify-between mb-1">
 <div className="flex items-center gap-2">
 <span className="text-[13px] font-bold text-sn-dark flex items-center gap-1.5">
 📧 {isSent ?"Email Sent" :"Email Received"}
 </span>
 <span className={cn(
"text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider",
 isSent ?"bg-purple-100 text-purple-700" :"bg-indigo-100 text-indigo-700"
 )}>
 {isSent ?"Outbound" :"Inbound"}
 </span>
 </div>
 <div className="flex items-center gap-1.5 text-muted-foreground">
 <Clock className="w-3.5 h-3.5" />
 <span className="text-[11px] font-medium">{formatDate(activity.created_at)}</span>
 </div>
 </div>

 <div className="space-y-1.5 text-[11.5px] text-sn-dark">
 <div className="flex gap-2">
 <span className="font-bold w-12 text-muted-foreground uppercase tracking-wider text-[9px] mt-[3px]">Subject</span>
 <span className="font-bold text-gray-800">{metadata.subject || activity.message}</span>
 </div>
 <div className="flex gap-2">
 <span className="font-bold w-12 text-muted-foreground uppercase tracking-wider text-[9px] mt-[3px]">From</span>
 <span className="font-medium text-gray-700">{metadata.from || activity.created_by_name}</span>
 </div>
 <div className="flex gap-2">
 <span className="font-bold w-12 text-muted-foreground uppercase tracking-wider text-[9px] mt-[3px]">To</span>
 <span className="font-medium text-gray-700">
 {recipients} <span className="text-muted-foreground ml-1 font-normal">(Recipients: {recipientsArray.length})</span>
 </span>
 </div>
 <div className="flex gap-2">
 <span className="font-bold w-12 text-muted-foreground uppercase tracking-wider text-[9px] mt-[3px]">Status</span>
 <span className="font-semibold flex items-center gap-1 text-green-600">
 {metadata.status ==="delivered" || metadata.status ==="success" ? (
 <><CheckCircle2 className="w-3.5 h-3.5" /> Delivered</>
 ) : metadata.status ==="failed" ? (
 <span className="text-red-500 font-bold flex items-center gap-1">❌ Failed</span>
 ) : (
 <span className="text-amber-500 font-bold flex items-center gap-1">⏳ Queued</span>
 )}
 </span>
 </div>
 </div>

 {/* Text Preview */}
 <div className="mt-3 p-3.5 bg-white border border-purple-100 rounded-md text-xs text-gray-600 font-medium leading-relaxed whitespace-pre-wrap shadow-sm">
 {previewText}
 </div>

 <div className="mt-3 flex items-center justify-between border-t border-purple-100 pt-3">
 <div className="flex items-center gap-2">
 {metadata.attachments && metadata.attachments.length > 0 && (
 <div className="flex flex-wrap gap-2">
 {metadata.attachments.map((att: any, i: number) => (
 <span key={i} className="flex items-center gap-1 text-[10px] bg-white border border-purple-100 rounded px-2.5 py-1.5 text-sn-dark shadow-sm">
 <Paperclip className="w-3 h-3 text-muted-foreground" />
 {att.name}
 </span>
 ))}
 </div>
 )}
 </div>
 <button
 onClick={() => setModalOpen(true)}
 className="flex items-center gap-1.5 text-[11px] font-bold text-white bg-purple-600 hover:bg-purple-700 px-3.5 py-1.5 rounded-md transition-colors shadow-sm"
 >
 <ExternalLink className="w-3.5 h-3.5" />
 View Email
 </button>
 </div>
 </div>

 {/* Full Email Modal */}
 {modalOpen && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setModalOpen(false)}>
 <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
 <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
 <div className="flex items-center gap-2.5">
 <div className="p-1.5 bg-purple-100 rounded-md">
 <Mail className="w-4 h-4 text-purple-600" />
 </div>
 <h3 className="font-bold text-gray-800 text-[15px]">Formatted Email Preview</h3>
 </div>
 <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-200/50 transition-colors">
 <X className="w-5 h-5" />
 </button>
 </div>
 
 <div className="p-5 border-b border-gray-100 bg-white space-y-2.5 shadow-sm z-10">
 <div className="text-[17px] font-bold text-gray-900 leading-snug">{metadata.subject ||"No Subject"}</div>
 <div className="flex flex-col gap-1.5 text-[13px] text-gray-600 mt-2">
 <div className="flex items-start"><span className="font-bold text-gray-400 uppercase tracking-wider text-[10px] w-14 mt-1">From</span> <span className="font-medium text-gray-900 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{metadata.from}</span></div>
 <div className="flex items-start"><span className="font-bold text-gray-400 uppercase tracking-wider text-[10px] w-14 mt-1">To</span> <span className="font-medium text-gray-900 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{recipients}</span></div>
 <div className="flex items-start"><span className="font-bold text-gray-400 uppercase tracking-wider text-[10px] w-14 mt-1">Date</span> <span className="font-medium text-gray-900">{formatDate(activity.created_at)}</span></div>
 </div>
 </div>

 <div className="p-6 overflow-y-auto flex-1 bg-[#fcfcfc]">
 <div className="prose prose-sm max-w-none prose-p:my-2 prose-headings:my-3">
 {/* Safe rendering of HTML */}
 <div dangerouslySetInnerHTML={{ __html: rawBody }} className="email-preview-content" />
 </div>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
