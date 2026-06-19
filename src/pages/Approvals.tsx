import React, { useEffect, useState } from"react";
import { collection, query, onSnapshot, updateDoc, doc, serverTimestamp, where } from"firebase/firestore";
import { db } from"../lib/firebase";
import { useAuth } from"../contexts/AuthContext";
import { CheckCircle, XCircle, Clock, ShieldAlert } from"lucide-react";
import { Button } from"@/components/ui/button";

export function Approvals() {
 const { profile } = useAuth();
 const [approvals, setApprovals] = useState<any[]>([]);

 useEffect(() => {
 const q = query(collection(db,"approvals"), where("status","==","Pending"));
 const unsubscribe = onSnapshot(q, (snapshot) => {
 setApprovals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
 });
 return unsubscribe;
 }, []);

 const handleApproval = async (approvalId: string, ticketId: string, status:"Approved" |"Rejected") => {
 try {
 // Update approval
 await updateDoc(doc(db,"approvals", approvalId), {
 status,
 approvedBy: profile?.uid,
 updatedAt: serverTimestamp()
 });

 // Update ticket status
 await updateDoc(doc(db,"tickets", ticketId), {
 status: status ==="Approved" ?"New" :"Closed",
 updatedAt: serverTimestamp(),
 history: [
 { 
 action: `Approval ${status}`, 
 timestamp: new Date().toISOString(), 
 user: profile?.name ||"Admin" 
 }
 ]
 });
 } catch (error) {
 console.error("Error updating approval:", error);
 }
 };

 const isAdmin = profile?.role ==="admin" || profile?.role ==="super_admin" || profile?.role ==="ultra_super_admin";
 if (!isAdmin) {
 return (
 <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
 <ShieldAlert className="w-16 h-16 text-muted-foreground opacity-20" />
 <h2 className="text-2xl font-bold">Access Restricted</h2>
 <p className="text-muted-foreground">Only administrators can process approvals.</p>
 </div>
 );
 }

 return (
 <div className="space-y-6">
 <div>
 <h1 className="text-3xl font-bold tracking-tight">Approvals</h1>
 <p className="text-muted-foreground">Review and process pending ticket requests.</p>
 </div>

 <div className="sn-card overflow-hidden p-0">
 <div className="overflow-x-auto">
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="bg-muted/50">
 <th className="data-table-header p-4">Ticket ID</th>
 <th className="data-table-header p-4">Requested By</th>
 <th className="data-table-header p-4">Created</th>
 <th className="data-table-header p-4">Status</th>
 <th className="data-table-header p-4">Actions</th>
 </tr>
 </thead>
 <tbody>
 {approvals.length === 0 ? (
 <tr>
 <td colSpan={5} className="p-8 text-center text-muted-foreground italic">
 No pending approvals found.
 </td>
 </tr>
 ) : (
 approvals.map((approval) => (
 <tr key={approval.id} className="data-table-row">
 <td className="p-4 text-xs font-bold text-blue-600">
 {approval.ticketId.substring(0, 8)}...
 </td>
 <td className="p-4 text-sm">{approval.requestedBy}</td>
 <td className="p-4 text-sm text-muted-foreground">
 {approval.createdAt?.toDate().toLocaleString()}
 </td>
 <td className="p-4">
 <span className="flex items-center gap-2 text-orange-600 font-medium text-sm">
 <Clock className="w-4 h-4" /> Pending
 </span>
 </td>
 <td className="p-4 flex gap-2">
 <Button 
 size="sm" 
 className="bg-sn-green text-sn-dark font-bold"
 onClick={() => handleApproval(approval.id, approval.ticketId,"Approved")}
 >
 <CheckCircle className="w-4 h-4 mr-2" /> Approve
 </Button>
 <Button 
 size="sm" 
 variant="destructive"
 onClick={() => handleApproval(approval.id, approval.ticketId,"Rejected")}
 >
 <XCircle className="w-4 h-4 mr-2" /> Reject
 </Button>
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
