import React, { useEffect, useState } from"react";
import {
 Search,
 Ticket,
 ShoppingCart,
 BookOpen,
 MessageSquare,
 ChevronRight,
 PlusCircle,
 X,
 Send,
 RotateCcw,
 CheckCircle,
 HelpCircle,
 Bell,
 Eye,
 Sliders
} from"lucide-react";
import { Link, useNavigate } from"react-router-dom";
import { Button } from"@/components/ui/button";
import { useAuth } from"../contexts/AuthContext";
import { collection, query, onSnapshot, doc, updateDoc, serverTimestamp, setDoc } from"firebase/firestore";
import { db } from"../lib/firebase";

export function ServicePortal() {
 const { user, profile } = useAuth();
 const navigate = useNavigate();

 const [activeTickets, setActiveTickets] = useState<any[]>([]);
 const [kbArticles, setKbArticles] = useState<any[]>([]);
 const [searchQuery, setSearchQuery] = useState("");
 const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
 const [commentText, setCommentText] = useState("");
 const [savingComment, setSavingComment] = useState(false);
 const [preferences, setPreferences] = useState({
 enableChatbot: true,
 enableNotifications: true,
 ccEmails:""
 });

 const [showPreferences, setShowPreferences] = useState(false);
 const [saveSuccess, setSaveSuccess] = useState("");

 const PORTAL_ACTIONS = [
 { icon: PlusCircle, title:"Report an Issue", description:"Something is broken or not working as expected.", path:"/tickets?action=new", color:"text-red-500", bg:"bg-red-500/10 border-red-500/20" },
 { icon: ShoppingCart, title:"Request Something", description:"Order hardware, software, or access permissions.", path:"/catalog", color:"text-sn-green", bg:"bg-sn-green/10 border-sn-green/20" },
 { icon: BookOpen, title:"Knowledge Base", description:"Find answers and troubleshooting guides.", path:"/kb", color:"text-blue-500", bg:"bg-blue-500/10 border-blue-500/20" },
 { icon: MessageSquare, title:"Virtual Support", description:"Get assistance from our virtual helper.", path:"/kb", color:"text-purple-500", bg:"bg-purple-500/10 border-purple-500/20" },
 ];

 // Fetch customer's active tickets
 useEffect(() => {
 if (!user) return;
 const q = query(collection(db,"tickets"));
 const unsubscribe = onSnapshot(q, (snap) => {
 const all = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
 const userTickets = all.filter(t => 
 t.createdBy === user.uid || 
 t.caller?.toLowerCase() === user.email?.toLowerCase() ||
 (profile?.name && t.caller?.toLowerCase() === profile.name.toLowerCase())
 );
 setActiveTickets(userTickets);
 });
 return unsubscribe;
 }, [user, profile]);

 // Fetch KB articles
 useEffect(() => {
 const q = query(collection(db,"kb_articles"));
 const unsubscribe = onSnapshot(q, (snap) => {
 setKbArticles(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
 });
 return unsubscribe;
 }, []);

 // Fetch Portal general general settings (Preferences fallback)
 useEffect(() => {
 if (!user) return;
 onSnapshot(doc(db,"settings_global","general"), (snap) => {
 if (snap.exists()) {
 const d = snap.data();
 setPreferences(prev => ({
 ...prev,
 ccEmails: d.ccEmails ||""
 }));
 }
 });
 }, [user]);

 const handleSavePreferences = async () => {
 setSavingComment(true);
 try {
 await setDoc(doc(db,"settings_global","general"), {
 ccEmails: preferences.ccEmails,
 updatedAt: serverTimestamp(),
 updatedBy: user?.email
 }, { merge: true });
 setSaveSuccess("Preferences saved successfully!");
 setTimeout(() => setSaveSuccess(""), 4000);
 } catch (e) {
 console.error(e);
 } finally {
 setSavingComment(false);
 }
 };

 const handleAddComment = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!commentText.trim() || !selectedTicket) return;
 setSavingComment(true);
 try {
 const ticketRef = doc(db,"tickets", selectedTicket.id);
 const newHistory = [
 ...(selectedTicket.history || []),
 {
 action: `Customer Comment: ${commentText}`,
 timestamp: new Date().toISOString(),
 user: profile?.name || user?.email ||"Customer"
 }
 ];
 await updateDoc(ticketRef, {
 history: newHistory,
 updatedAt: serverTimestamp()
 });
 setCommentText("");
 setSelectedTicket({ ...selectedTicket, history: newHistory });
 } catch (err) {
 console.error("Failed to post comment:", err);
 } finally {
 setSavingComment(false);
 }
 };

 const handleReopenTicket = async () => {
 if (!selectedTicket) return;
 setSavingComment(true);
 try {
 const ticketRef = doc(db,"tickets", selectedTicket.id);
 const newHistory = [
 ...(selectedTicket.history || []),
 {
 action:"Ticket reopened by customer",
 timestamp: new Date().toISOString(),
 user: profile?.name || user?.email
 }
 ];
 await updateDoc(ticketRef, {
 status:"Open",
 history: newHistory,
 updatedAt: serverTimestamp()
 });
 setSelectedTicket({ ...selectedTicket, status:"Open", history: newHistory });
 } catch (err) {
 console.error(err);
 } finally {
 setSavingComment(false);
 }
 };

 // Live filter KB Articles based on search box input
 const filteredArticles = searchQuery
 ? kbArticles.filter(a =>
 a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
 a.content?.toLowerCase().includes(searchQuery.toLowerCase())
 ).slice(0, 5)
 : kbArticles.slice(0, 4);

 return (
 <div className="space-y-12 max-w-6xl mx-auto pb-20">
 
 {/* ── Dynamic Welcome & Live Search Box ── */}
 <div className="text-center space-y-6 py-16 relative bg-sn-sidebar/30 rounded-[40px] border border-white/5 overflow-hidden">
 <div className="absolute inset-0 bg-gradient-to-b from-sn-green/5 to-transparent pointer-events-none" />
 <p className="text-xs font-semibold uppercase tracking-[0.4em] text-sn-green">Unified End-User Self-Service Portal</p>
 <h1 className="text-5xl font-semibold text-foreground tracking-tighter">
 How can we help you, {profile?.name?.split("")[0] ||"User"}?
 </h1>
 
 <div className="max-w-2xl mx-auto relative group px-6 sm:px-0">
 <Search className="w-5 h-5 absolute left-9 sm:left-5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-sn-green transition-colors" />
 <input
 type="text"
 placeholder="Search KB articles, troubleshooting guides, FAQs..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full bg-sn-dark/60 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm outline-none shadow-2xl focus:border-sn-green/50 focus:ring-1 focus:ring-sn-green/20 transition-all text-foreground placeholder:text-muted-foreground/60"
 />
 </div>
 </div>

 {/* ── Quick Services Navigation Cards ── */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
 {PORTAL_ACTIONS.map((action) => (
 <Link
 key={action.title}
 to={action.path}
 className={`sn-card p-6 border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group flex flex-col items-center text-center space-y-4 ${action.bg}`}
 >
 <div className="w-14 h-14 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center transition-transform group-hover:scale-110">
 <action.icon className={`w-7 h-7 ${action.color}`} />
 </div>
 <div className="space-y-1.5">
 <h3 className="font-semibold text-sm text-foreground">{action.title}</h3>
 <p className="text-xs text-muted-foreground leading-relaxed">{action.description}</p>
 </div>
 </Link>
 ))}
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 
 {/* ── Left Column: Real-time Incident Tracker ── */}
 <div className="lg:col-span-2 space-y-6">
 <div className="flex items-center justify-between">
 <h2 className="text-xl font-semibold flex items-center gap-2">
 <Ticket className="text-sn-green" size={20} /> My Active Requests
 </h2>
 <Button variant="ghost" size="sm" className="text-sn-green font-semibold uppercase text-[10px] tracking-wider" onClick={() => navigate("/tickets")}>
 Full Incident Stream
 </Button>
 </div>

 <div className="bg-sn-sidebar/35 border border-white/5 rounded-3xl divide-y divide-white/5 overflow-hidden">
 {activeTickets.length === 0 ? (
 <div className="p-12 text-center text-xs text-muted-foreground">
 You currently have no open requests or service incidents.
 </div>
 ) : (
 activeTickets.slice(0, 5).map((ticket) => (
 <div
 key={ticket.id}
 onClick={() => setSelectedTicket(ticket)}
 className="p-5 flex items-center justify-between hover:bg-white/[0.02] transition-colors cursor-pointer group"
 >
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 bg-black/40 border border-white/5 rounded-xl flex items-center justify-center">
 <Ticket className="w-5 h-5 text-blue-500" />
 </div>
 <div>
 <div className="text-sm font-semibold text-foreground group-hover:text-sn-green transition-colors">{ticket.title}</div>
 <div className="text-[10px] font-bold text-muted-foreground mt-0.5">
 {ticket.number} • Updated {ticket.updatedAt?.toDate ? new Date(ticket.updatedAt.toDate()).toLocaleDateString() :"Just now"}
 </div>
 </div>
 </div>
 <div className="flex items-center gap-4">
 <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] font-semibold uppercase tracking-wider">
 {ticket.status}
 </span>
 <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
 </div>
 </div>
 ))
 )}
 </div>
 </div>

 {/* ── Right Column: KB FAQs Search & Preferences Toggle ── */}
 <div className="space-y-6">
 <div className="flex items-center justify-between">
 <h2 className="text-xl font-semibold flex items-center gap-2">
 <BookOpen className="text-blue-500" size={20} /> Suggested Knowledge
 </h2>
 <Button
 variant="ghost"
 size="sm"
 className="text-muted-foreground hover:text-white"
 onClick={() => setShowPreferences(!showPreferences)}
 >
 <Sliders size={16} />
 </Button>
 </div>

 {/* Preferences Settings Widget */}
 {showPreferences ? (
 <div className="bg-sn-sidebar/40 border border-white/10 p-6 rounded-3xl space-y-4 animate-in fade-in slide-in-from-top-4 duration-200">
 <h3 className="text-xs font-semibold uppercase tracking-wider text-sn-green">Portal Preferences</h3>
 
 <div className="space-y-3">
 <div className="flex items-center justify-between text-xs">
 <span>Enable Virtual Agent chatbot</span>
 <input
 type="checkbox"
 checked={preferences.enableChatbot}
 onChange={(e) => setPreferences({ ...preferences, enableChatbot: e.target.checked })}
 className="accent-sn-green"
 />
 </div>

 <div className="flex items-center justify-between text-xs">
 <span>In-app ticket push notifications</span>
 <input
 type="checkbox"
 checked={preferences.enableNotifications}
 onChange={(e) => setPreferences({ ...preferences, enableNotifications: e.target.checked })}
 className="accent-sn-green"
 />
 </div>

 <div className="space-y-1 pt-2">
 <label className="text-[9px] font-semibold uppercase text-muted-foreground">Notification CC emails</label>
 <input
 type="text"
 value={preferences.ccEmails}
 onChange={(e) => setPreferences({ ...preferences, ccEmails: e.target.value })}
 className="w-full bg-black/20 border border-white/5 rounded-xl px-3 py-2 text-xs outline-none focus:border-sn-green"
 placeholder="mail@company.com"
 />
 </div>
 </div>

 <Button
 onClick={handleSavePreferences}
 disabled={savingComment}
 className="w-full bg-sn-green text-sn-dark font-semibold text-xs uppercase tracking-wider py-2.5 rounded-xl h-auto"
 >
 Save Preferences
 </Button>

 {saveSuccess && (
 <div className="text-[10px] text-green-500 font-bold text-center mt-1">{saveSuccess}</div>
 )}
 </div>
 ) : (
 <div className="bg-sn-sidebar/35 border border-white/5 p-5 rounded-3xl space-y-4">
 {filteredArticles.length === 0 ? (
 <div className="text-xs text-muted-foreground py-6 text-center">No articles available.</div>
 ) : (
 filteredArticles.map((art) => (
 <Link
 key={art.id}
 to="/kb"
 className="block text-xs font-bold text-foreground hover:text-sn-green transition-colors flex items-center justify-between group py-2"
 >
 <span className="truncate pr-4 flex items-center gap-2">
 📚 {art.title}
 </span>
 <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:translate-x-1 transition-transform" />
 </Link>
 ))
 )}
 </div>
 )}

 <div className="bg-sn-sidebar text-white p-6 rounded-3xl space-y-4 relative overflow-hidden border border-white/5 shadow-2xl">
 <div className="absolute top-0 right-0 w-24 h-24 bg-sn-green/10 rounded-full -translate-y-1/2 translate-x-1/2" />
 <h3 className="font-semibold text-sm relative z-10">Need technical support?</h3>
 <p className="text-xs text-white/60 relative z-10 leading-relaxed">Our service desk engineers are available 24/7. Open a ticket or ping our Slack bot.</p>
 <Button onClick={() => navigate("/tickets?action=new")} className="w-full bg-sn-green text-sn-dark font-semibold text-xs uppercase tracking-widest py-3.5 h-auto rounded-2xl relative z-10 shadow-lg shadow-sn-green/20">
 Orchestrate Request
 </Button>
 </div>
 </div>
 </div>

 {/* ── Ticket Detail Slide-over / Modal ── */}
 {selectedTicket && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
 <div className="bg-sn-sidebar border border-white/10 rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
 
 {/* Modal Header */}
 <div className="p-6 border-b border-white/5 bg-black/20 flex items-center justify-between">
 <div>
 <span className="text-[10px] font-semibold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded">
 {selectedTicket.number}
 </span>
 <h3 className="text-lg font-semibold text-foreground mt-2">{selectedTicket.title}</h3>
 </div>
 <button
 onClick={() => setSelectedTicket(null)}
 className="p-2 hover:bg-white/5 rounded-xl transition-colors text-muted-foreground hover:text-white"
 >
 <X size={18} />
 </button>
 </div>

 {/* Modal Body */}
 <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
 
 {/* Incident Metadata */}
 <div className="grid grid-cols-2 gap-4 bg-black/20 p-4 rounded-2xl border border-white/5 text-xs">
 <div>
 <span className="text-muted-foreground">State:</span>
 <span className="ml-2 px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] font-semibold uppercase tracking-wide">
 {selectedTicket.status}
 </span>
 </div>
 <div>
 <span className="text-muted-foreground">Priority:</span>
 <span className="ml-2 font-bold text-foreground">{selectedTicket.priority ||"4 - Low"}</span>
 </div>
 <div>
 <span className="text-muted-foreground">Engineer:</span>
 <span className="ml-2 font-bold text-foreground">{selectedTicket.assignedToName ||"Unassigned"}</span>
 </div>
 <div>
 <span className="text-muted-foreground">Assigned Group:</span>
 <span className="ml-2 font-bold text-foreground">{selectedTicket.assignmentGroup ||"None"}</span>
 </div>
 </div>

 {/* Description */}
 <div className="space-y-2">
 <h4 className="text-xs font-semibold uppercase text-muted-foreground">Incident Description</h4>
 <p className="text-xs font-medium text-foreground bg-black/10 p-4 rounded-2xl border border-white/5 leading-relaxed">
 {selectedTicket.description ||"No description provided."}
 </p>
 </div>

 {/* Actions: Reopen */}
 {(selectedTicket.status ==="Resolved" || selectedTicket.status ==="Closed") && (
 <div className="flex items-center gap-3 p-4 bg-orange-500/5 border border-orange-500/10 rounded-2xl text-xs justify-between">
 <div>
 <div className="font-bold text-orange-500">Incident Resolved/Closed</div>
 <div className="text-[10px] text-muted-foreground mt-0.5">If the issue is still unresolved, you may reopen it.</div>
 </div>
 <Button
 onClick={handleReopenTicket}
 disabled={savingComment}
 className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase h-9 rounded-xl flex items-center gap-2"
 >
 <RotateCcw size={12} /> Reopen Ticket
 </Button>
 </div>
 )}

 {/* Comment Log Stream */}
 <div className="space-y-3">
 <h4 className="text-xs font-semibold uppercase text-muted-foreground">Incident Log & Conversation</h4>
 <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
 {(!selectedTicket.history || selectedTicket.history.length === 0) ? (
 <div className="text-center py-6 text-xs text-muted-foreground">No updates logged.</div>
 ) : (
 selectedTicket.history.map((hist: any, idx: number) => (
 <div key={idx} className="p-3 bg-black/10 rounded-xl border border-white/5 space-y-1">
 <div className="flex justify-between text-[9px] font-semibold uppercase text-sn-green">
 <span>{hist.user ||"System"}</span>
 <span>{hist.timestamp ? new Date(hist.timestamp).toLocaleString() :""}</span>
 </div>
 <p className="text-xs font-medium text-foreground">{hist.action}</p>
 </div>
 ))
 )}
 </div>
 </div>

 {/* Add Comment Input Form */}
 <form onSubmit={handleAddComment} className="flex gap-2 pt-2 border-t border-white/5">
 <input
 type="text"
 placeholder="Ask for updates or provide comments..."
 value={commentText}
 onChange={(e) => setCommentText(e.target.value)}
 className="flex-grow bg-black/20 border border-white/5 rounded-xl px-4 text-xs font-bold outline-none focus:border-sn-green"
 disabled={savingComment}
 />
 <Button
 type="submit"
 disabled={savingComment || !commentText.trim()}
 className="bg-sn-green text-sn-dark hover:bg-sn-green/90 h-10 w-10 p-0 rounded-xl flex items-center justify-center shrink-0"
 >
 <Send size={14} />
 </Button>
 </form>

 </div>

 </div>
 </div>
 )}

 </div>
 );
}
