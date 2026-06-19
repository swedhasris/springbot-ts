import React, { useState } from"react";
import { 
 Laptop, 
 Monitor, 
 ShieldCheck, 
 Smartphone, 
 Cpu, 
 Globe, 
 Lock, 
 Mail, 
 Search,
 ChevronRight,
 ShoppingCart,
 Clock,
 Edit,
 Trash2
} from"lucide-react";
import { Button } from"@/components/ui/button";
import { cn } from"@/lib/utils";
import { collection, addDoc, serverTimestamp } from"firebase/firestore";
import { db } from"../lib/firebase";
import { useAuth } from"../contexts/AuthContext";

const CATALOG_ITEMS = [
 {
 category:"Hardware",
 items: [
 { id:"hw-1", name:"Standard Laptop", description:"Standard corporate laptop for office use.", icon: Laptop, price:"$1,200" },
 { id:"hw-2", name:"Developer Workstation", description:"High-performance workstation for developers.", icon: Cpu, price:"$2,500" },
 { id:"hw-3", name:"External Monitor", description:"27-inch 4K monitor for enhanced productivity.", icon: Monitor, price:"$400" },
 { id:"hw-4", name:"Mobile Device", description:"Corporate smartphone for mobile access.", icon: Smartphone, price:"$800" },
 ]
 },
 {
 category:"Software & Access",
 items: [
 { id:"sw-1", name:"Adobe Creative Cloud", description:"Full suite of Adobe creative tools.", icon: Globe, price:"$50/mo" },
 { id:"sw-2", name:"VPN Access", description:"Secure remote access to corporate network.", icon: Lock, price:"Free" },
 { id:"sw-3", name:"Email Distribution List", description:"Request a new corporate email group.", icon: Mail, price:"Free" },
 { id:"sw-4", name:"Admin Permissions", description:"Elevated privileges for specific systems.", icon: ShieldCheck, price:"Free" },
 ]
 }
];

export function ServiceCatalog() {
 const { user, profile } = useAuth();
 const [selectedItem, setSelectedItem] = useState<any>(null);
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [justification, setJustification] = useState("");
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [orderSuccess, setOrderSuccess] = useState(false);

 // Dynamic Catalog state
 const [catalogSections, setCatalogSections] = useState(CATALOG_ITEMS);
 const [searchQuery, setSearchQuery] = useState("");

 // Edit Catalog modal state
 const [isEditModalOpen, setIsEditModalOpen] = useState(false);
 const [editingItem, setEditingItem] = useState<any>(null);
 const [editName, setEditName] = useState("");
 const [editDescription, setEditDescription] = useState("");
 const [editPrice, setEditPrice] = useState("");

 const handleEditSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!editingItem) return;

 setCatalogSections(prev => prev.map(section => {
 if (section.category === editingItem.category) {
 return {
 ...section,
 items: section.items.map(item => {
 if (item.id === editingItem.id) {
 return {
 ...item,
 name: editName,
 description: editDescription,
 price: editPrice
 };
 }
 return item;
 })
 };
 }
 return section;
 }));

 setIsEditModalOpen(false);
 setEditingItem(null);
 };

 const handleDelete = (itemId: string, category: string) => {
 setCatalogSections(prev => prev.map(section => {
 if (section.category === category) {
 return {
 ...section,
 items: section.items.filter(item => item.id !== itemId)
 };
 }
 return section;
 }));
 };

 const filteredCatalog = catalogSections.map(section => {
 const items = section.items.filter(item => 
 item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
 item.description.toLowerCase().includes(searchQuery.toLowerCase())
 );
 return { ...section, items };
 }).filter(section => section.items.length > 0);

 const handleRequest = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!user || !selectedItem) return;

 setIsSubmitting(true);
 try {
 const requestData = {
 requestedBy: user.uid,
 requesterName: profile?.name || user.email,
 item: selectedItem.name,
 category: selectedItem.category,
 justification,
 status:"Pending Approval",
 createdAt: serverTimestamp(),
 updatedAt: serverTimestamp(),
 history: [{
 action:"Request Submitted",
 timestamp: new Date().toISOString(),
 user: profile?.name || user.email
 }]
 };

 await addDoc(collection(db,"approvals"), requestData);
 setOrderSuccess(true);
 setTimeout(() => {
 setIsModalOpen(false);
 setOrderSuccess(false);
 setSelectedItem(null);
 setJustification("");
 }, 2000);
 } catch (error) {
 console.error("Error submitting request:", error);
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <div className="space-y-8 max-w-7xl mx-auto">
 <div className="flex items-center justify-between">
 <div className="space-y-1">
 <h1 className="text-3xl font-light text-sn-dark">Service Catalog</h1>
 <p className="text-muted-foreground">Browse and request IT services and equipment.</p>
 </div>
 <div className="relative w-96">
 <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
 <input 
 type="text"
 placeholder="Search catalog..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full bg-white border border-border rounded-lg py-2 pl-10 pr-4 text-sm outline-none focus:ring-1 focus:ring-sn-green"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
 {filteredCatalog.map((section) => (
 <div key={section.category} className="space-y-4">
 <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
 {section.category}
 </h2>
 <div className="grid grid-cols-1 gap-4">
 {section.items.map((item) => (
 <div 
 key={item.id}
 className="sn-card p-4 flex items-center gap-4 hover:border-sn-green transition-all cursor-pointer group"
 >
 <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center group-hover:bg-sn-green/10 transition-colors" onClick={() => {
 setSelectedItem({ ...item, category: section.category });
 setIsModalOpen(true);
 }}>
 <item.icon className="w-6 h-6 text-sn-dark group-hover:text-sn-green" />
 </div>
 <div className="flex-grow" onClick={() => {
 setSelectedItem({ ...item, category: section.category });
 setIsModalOpen(true);
 }}>
 <div className="font-bold text-sn-dark">{item.name}</div>
 <div className="text-xs text-muted-foreground line-clamp-1">{item.description}</div>
 </div>
 <div className="text-right flex items-center gap-2">
 <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
 {profile && ["admin","super_admin","ultra_super_admin"].includes(profile.role) && (
 <>
 <button onClick={e => {
 e.stopPropagation();
 setEditingItem({ ...item, category: section.category });
 setEditName(item.name);
 setEditDescription(item.description);
 setEditPrice(item.price);
 setIsEditModalOpen(true);
 }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors" title="Edit Item">
 <Edit className="w-4 h-4" />
 </button>
 <button onClick={e => {
 e.stopPropagation();
 if (confirm(`Are you sure you want to delete ${item.name}?`)) {
 handleDelete(item.id, section.category);
 }
 }} className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors" title="Delete Item">
 <Trash2 className="w-4 h-4" />
 </button>
 </>
 )}
 </div>
 <div className="text-sm font-bold text-sn-green">{item.price}</div>
 <ChevronRight className="w-4 h-4 text-muted-foreground ml-2" />
 </div>
 </div>
 ))}
 </div>
 </div>
 ))}
 </div>

 {/* Request Modal */}
 {isModalOpen && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
 <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
 {orderSuccess ? (
 <div className="p-12 text-center space-y-4">
 <div className="w-16 h-16 bg-sn-green/20 rounded-full flex items-center justify-center mx-auto">
 <ShoppingCart className="w-8 h-8 text-sn-green" />
 </div>
 <h2 className="text-2xl font-bold text-sn-dark">Request Submitted!</h2>
 <p className="text-muted-foreground">Your request for {selectedItem?.name} has been sent for approval.</p>
 </div>
 ) : (
 <>
 <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
 <h2 className="font-bold text-sn-dark">Request {selectedItem?.name}</h2>
 <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>Cancel</Button>
 </div>
 <form onSubmit={handleRequest} className="p-6 space-y-6">
 <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
 <div className="w-10 h-10 bg-white rounded flex items-center justify-center shadow-sm">
 {selectedItem && <selectedItem.icon className="w-5 h-5 text-sn-green" />}
 </div>
 <div>
 <div className="font-bold text-sm">{selectedItem?.name}</div>
 <div className="text-xs text-muted-foreground">{selectedItem?.description}</div>
 </div>
 </div>

 <div className="space-y-2">
 <label className="text-sm font-medium">Business Justification</label>
 <textarea 
 required
 value={justification}
 onChange={(e) => setJustification(e.target.value)}
 placeholder="Please explain why you need this..."
 className="w-full p-3 border border-border rounded-lg text-sm focus:ring-1 focus:ring-sn-green outline-none min-h-[100px] resize-none"
 />
 </div>

 <div className="flex items-center gap-2 text-xs text-muted-foreground bg-blue-50 p-3 rounded-lg border border-blue-100">
 <Clock className="w-4 h-4 text-blue-500" />
 Estimated fulfillment time: 3-5 business days after approval.
 </div>

 <Button 
 type="submit" 
 disabled={isSubmitting}
 className="w-full bg-sn-green text-sn-dark font-bold py-6"
 >
 {isSubmitting ?"Submitting..." :"Submit Request"}
 </Button>
 </form>
 </>
 )}
 </div>
 </div>
 )}

 {/* Edit Modal */}
 {isEditModalOpen && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
 <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
 <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
 <h2 className="font-bold text-sn-dark">Edit Catalog Item</h2>
 <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
 </div>
 <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
 <div className="space-y-2">
 <label className="text-sm font-medium">Item Name</label>
 <input 
 type="text"
 required
 value={editName}
 onChange={(e) => setEditName(e.target.value)}
 className="w-full p-2.5 border border-border rounded-lg text-sm focus:ring-1 focus:ring-sn-green outline-none"
 />
 </div>
 <div className="space-y-2">
 <label className="text-sm font-medium">Description</label>
 <textarea 
 required
 value={editDescription}
 onChange={(e) => setEditDescription(e.target.value)}
 className="w-full p-2.5 border border-border rounded-lg text-sm focus:ring-1 focus:ring-sn-green outline-none min-h-[80px] resize-none"
 />
 </div>
 <div className="space-y-2">
 <label className="text-sm font-medium">Price / Frequency</label>
 <input 
 type="text"
 required
 value={editPrice}
 onChange={(e) => setEditPrice(e.target.value)}
 className="w-full p-2.5 border border-border rounded-lg text-sm focus:ring-1 focus:ring-sn-green outline-none"
 />
 </div>
 <Button 
 type="submit" 
 className="w-full bg-sn-green text-sn-dark font-bold py-6 mt-4"
 >
 Save Changes
 </Button>
 </form>
 </div>
 </div>
 )}
 </div>
 );
}
