import React, { useState, useEffect, useRef } from"react";
import { 
 collection, 
 query, 
 onSnapshot, 
 orderBy, 
 where, 
 limit, 
 doc, 
 addDoc, 
 serverTimestamp,
 updateDoc
} from"firebase/firestore";
import { db, handleFirestoreError, OperationType } from"../lib/firebase";
import { useAuth } from"../contexts/AuthContext";
import { ROLE_HIERARCHY, Role } from"../lib/roles";
import { 
 MessageSquare, 
 Search, 
 Send, 
 User, 
 Clock, 
 MoreVertical, 
 Phone, 
 Video, 
 Info,
 ChevronLeft
} from"lucide-react";
import { Button } from"@/components/ui/button";
import { cn, formatDate } from"@/lib/utils";
import { useNavigate, useSearchParams } from"react-router-dom";

export function Conversations() {
 const { user, profile } = useAuth();
 const navigate = useNavigate();
 const [searchParams] = useSearchParams();
 const ticketIdParam = searchParams.get("ticketId");

 const [tickets, setTickets] = useState<any[]>([]);
 const [selectedTicketId, setSelectedTicketId] = useState<string | null>(ticketIdParam);
 const [selectedTicket, setSelectedTicket] = useState<any>(null);
 const [messages, setMessages] = useState<any[]>([]);
 const [newMessage, setNewMessage] = useState("");
 const [isLoading, setIsLoading] = useState(true);
 const [searchQuery, setSearchQuery] = useState("");
 
 const messagesEndRef = useRef<HTMLDivElement>(null);

 // Scroll to bottom when messages change
 const scrollToBottom = () => {
 messagesEndRef.current?.scrollIntoView({ behavior:"smooth" });
 };

 useEffect(() => {
 scrollToBottom();
 }, [messages]);

 // Fetch Tickets list for conversations
 useEffect(() => {
 if (!user || !profile) return;

 const isAgent = ROLE_HIERARCHY[profile.role as Role] >= ROLE_HIERARCHY["agent"];
 const ticketsRef = collection(db,"tickets");
 
 // For simplicity, we show tickets that the user has access to
 const q = isAgent 
 ? query(ticketsRef, orderBy("updatedAt","desc"), limit(20))
 : query(ticketsRef, where("createdBy","==", user.uid), orderBy("updatedAt","desc"), limit(20));

 const unsubscribe = onSnapshot(q, (snapshot) => {
 const ticketsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
 setTickets(ticketsList);
 setIsLoading(false);
 
 // Auto-select first if none selected and not provided in param
 if (!selectedTicketId && ticketsList.length > 0 && !ticketIdParam) {
 setSelectedTicketId(ticketsList[0].id);
 }
 }, (error) => {
 handleFirestoreError(error, OperationType.LIST,"tickets");
 setIsLoading(false);
 });

 return unsubscribe;
 }, [user, profile, ticketIdParam]);

 // Fetch Messages for selected ticket
 useEffect(() => {
 if (!selectedTicketId) {
 setMessages([]);
 setSelectedTicket(null);
 return;
 }

 // Get ticket details
 const ticketRef = doc(db,"tickets", selectedTicketId);
 const unsubTicket = onSnapshot(ticketRef, (doc) => {
 if (doc.exists()) {
 setSelectedTicket({ id: doc.id, ...doc.data() });
 }
 });

 // Get messages (comments)
 const messagesRef = collection(db,"tickets", selectedTicketId,"comments");
 const q = query(messagesRef, orderBy("createdAt","asc"));

 const unsubscribe = onSnapshot(q, (snapshot) => {
 setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
 }, (error) => {
 handleFirestoreError(error, OperationType.LIST, `tickets/${selectedTicketId}/comments`);
 });

 return () => {
 unsubTicket();
 unsubscribe();
 };
 }, [selectedTicketId]);

 const handleSendMessage = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!newMessage.trim() || !selectedTicketId || !user) return;

 try {
 const msgText = newMessage;
 setNewMessage("");

 await addDoc(collection(db,"tickets", selectedTicketId,"comments"), {
 userId: user.uid,
 userName: profile?.name || user.email,
 message: msgText,
 createdAt: serverTimestamp()
 });

 // Update ticket's updatedAt and history
 await updateDoc(doc(db,"tickets", selectedTicketId), {
 updatedAt: serverTimestamp(),
 history: [
 ...(selectedTicket?.history || []),
 { 
 action:"Comment Added (Conversations)", 
 timestamp: new Date().toISOString(), 
 user: profile?.name || user.email 
 }
 ]
 });
 } catch (error) {
 console.error("Error sending message:", error);
 }
 };

 const formatDateShort = (date: any) => {
 if (!date) return"";
 let d;
 if (typeof date.toDate ==="function") d = date.toDate();
 else d = new Date(date);
 
 return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
 };

 const filteredTickets = tickets.filter(t => 
 t.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
 t.number?.toLowerCase().includes(searchQuery.toLowerCase())
 );

 return (
 <div className="flex h-[calc(100vh-140px)] bg-white rounded-lg shadow-sm border border-border overflow-hidden">
 {/* Search & List Pane */}
 <div className={cn(
"w-full md:w-80 lg:w-96 flex flex-col border-r border-border shrink-0",
 selectedTicketId &&"hidden md:flex"
 )}>
 <div className="p-4 border-b border-border bg-muted/10">
 <h2 className="text-xl font-bold text-sn-dark mb-4">Conversations</h2>
 <div className="relative">
 <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
 <input 
 type="text" 
 placeholder="Search conversations..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full pl-9 pr-3 py-2 bg-white border border-border rounded-md text-sm outline-none focus:ring-1 focus:ring-sn-green"
 />
 </div>
 </div>

 <div className="flex-grow overflow-y-auto custom-scrollbar">
 {isLoading ? (
 <div className="p-8 text-center text-muted-foreground">Loading...</div>
 ) : filteredTickets.length === 0 ? (
 <div className="p-8 text-center text-muted-foreground">No conversations found</div>
 ) : (
 filteredTickets.map(ticket => (
 <div 
 key={ticket.id}
 onClick={() => setSelectedTicketId(ticket.id)}
 className={cn(
"p-4 border-b border-border cursor-pointer transition-colors hover:bg-muted/10",
 selectedTicketId === ticket.id ?"bg-sn-green/5 border-l-4 border-l-sn-green pl-3" :""
 )}
 >
 <div className="flex justify-between items-start mb-1">
 <span className="text-xs font-bold text-sn-green">{ticket.number}</span>
 <span className="text-[10px] text-muted-foreground">{formatDateShort(ticket.updatedAt)}</span>
 </div>
 <div className="font-semibold text-sm text-sn-dark truncate">{ticket.title}</div>
 <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
 <span className={cn(
"w-2 h-2 rounded-full",
 ticket.status ==="New" ?"bg-blue-400" :
 ticket.status ==="In Progress" ?"bg-sn-green" :
"bg-gray-400"
 )} />
 {ticket.status} • {ticket.priority}
 </div>
 </div>
 ))
 )}
 </div>
 </div>

 {/* Chat Pane */}
 <div className={cn(
"flex-grow flex flex-col min-w-0 bg-[#f9fafb]",
 !selectedTicketId &&"hidden md:flex"
 )}>
 {selectedTicketId ? (
 <>
 {/* Header */}
 <div className="p-4 bg-white border-b border-border flex items-center justify-between shadow-sm z-10">
 <div className="flex items-center gap-3">
 <Button 
 variant="ghost" 
 size="icon" 
 className="md:hidden"
 onClick={() => setSelectedTicketId(null)}
 >
 <ChevronLeft className="w-5 h-5" />
 </Button>
 <div className="w-10 h-10 bg-sn-green/20 rounded-full flex items-center justify-center text-sn-green font-bold">
 {selectedTicket?.number?.slice(-2) ||"?"}
 </div>
 <div>
 <div className="font-bold text-sn-dark flex items-center gap-2">
 {selectedTicket?.number}
 <span className="text-xs font-normal text-muted-foreground">• {selectedTicket?.status}</span>
 </div>
 <div className="text-xs text-muted-foreground truncate max-w-[200px] lg:max-w-md">
 {selectedTicket?.title}
 </div>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <Button variant="ghost" size="icon" className="text-muted-foreground hidden sm:flex"><Phone className="w-4 h-4" /></Button>
 <Button variant="ghost" size="icon" className="text-muted-foreground hidden sm:flex"><Video className="w-4 h-4" /></Button>
 <Button 
 variant="ghost" 
 size="icon" 
 className="text-muted-foreground"
 onClick={() => navigate(`/tickets/${selectedTicketId}`)}
 title="View Ticket Details"
 >
 <Info className="w-4 h-4" />
 </Button>
 <Button variant="ghost" size="icon" className="text-muted-foreground"><MoreVertical className="w-4 h-4" /></Button>
 </div>
 </div>

 {/* Messages */}
 <div className="flex-grow p-6 overflow-y-auto custom-scrollbar flex flex-col gap-4">
 <div className="flex justify-center mb-6">
 <div className="bg-white px-4 py-1.5 rounded-full shadow-sm border border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
 Incident Opened • {formatDate(selectedTicket?.createdAt)}
 </div>
 </div>

 {messages.map((message) => {
 const isMe = message.userId === user?.uid;
 return (
 <div key={message.id} className={cn(
"max-w-[85%] flex flex-col",
 isMe ?"self-end items-end" :"self-start items-start"
 )}>
 {!isMe && <span className="text-[10px] text-muted-foreground mb-1 ml-1">{message.userName}</span>}
 <div className={cn(
"px-4 py-2.5 rounded-2xl shadow-sm text-sm whitespace-pre-wrap",
 isMe 
 ?"bg-sn-green text-sn-dark font-medium rounded-tr-none" 
 :"bg-white border border-border text-sn-dark rounded-tl-none"
 )}>
 {message.message}
 </div>
 <span className="text-[10px] text-muted-foreground mt-1 mx-1">
 {message.createdAt ? formatDateShort(message.createdAt) :"Just now"}
 </span>
 </div>
 );
 })}
 <div ref={messagesEndRef} />
 </div>

 {/* Input Area */}
 <div className="p-4 bg-white border-t border-border">
 <form onSubmit={handleSendMessage} className="flex gap-2">
 <div className="flex-grow relative">
 <textarea 
 value={newMessage}
 onChange={(e) => setNewMessage(e.target.value)}
 placeholder="Type your message..."
 className="w-full pl-4 pr-12 py-3 bg-muted/30 border border-border rounded-xl text-sm outline-none focus:ring-1 focus:ring-sn-green resize-none min-h-[52px] max-h-32"
 onKeyDown={(e) => {
 if (e.key === 'Enter' && !e.shiftKey) {
 e.preventDefault();
 handleSendMessage(e);
 }
 }}
 />
 <Button 
 type="submit" 
 size="icon" 
 disabled={!newMessage.trim()}
 className="absolute right-2 bottom-2 rounded-lg bg-sn-green text-sn-dark hover:bg-sn-green/90"
 >
 <Send className="w-4 h-4" />
 </Button>
 </div>
 </form>
 <div className="text-[10px] text-muted-foreground mt-2 text-center">
 Press Enter to send, Shift+Enter for new line
 </div>
 </div>
 </>
 ) : (
 <div className="flex-grow flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-white">
 <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4 text-muted-foreground/40">
 <MessageSquare className="w-10 h-10" />
 </div>
 <h3 className="text-lg font-bold text-sn-dark">Your Conversations</h3>
 <p className="max-w-xs text-sm mt-2">
 Select an incident from the list to start or resume a conversation with the support team.
 </p>
 </div>
 )}
 </div>
 </div>
 );
}
