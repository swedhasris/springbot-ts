import React, { useState, useEffect } from"react";
import { 
 Server, 
 Laptop, 
 Database, 
 Globe, 
 Shield, 
 Activity,
 Search,
 Filter,
 Edit,
 Trash2,
 Link as LinkIcon,
 ChevronRight
} from"lucide-react";
import { Button } from"@/components/ui/button";
import { cn } from"@/lib/utils";
import { collection, query, onSnapshot } from"firebase/firestore";
import { db } from"../lib/firebase";

const MOCK_ASSETS = [
 { id:"CI001", name:"PROD-WEB-01", type:"Server", status:"Operational", owner:"IT Ops", location:"Data Center A" },
 { id:"CI002", name:"PROD-DB-01", type:"Database", status:"Operational", owner:"DBA Team", location:"Data Center A" },
 { id:"CI003", name:"CORP-FW-01", type:"Network", status:"Operational", owner:"Security", location:"Edge" },
 { id:"CI004", name:"ERP-Application", type:"Application", status:"Degraded", owner:"App Support", location:"Cloud" },
 { id:"CI005", name:"Laptop-JD-001", type:"Hardware", status:"Operational", owner:"John Doe", location:"Remote" },
];

export function CMDB() {
 const [assets, setAssets] = useState(MOCK_ASSETS);
 const [searchQuery, setSearchQuery] = useState("");

 const getIcon = (type: string) => {
 switch (type) {
 case"Server": return Server;
 case"Database": return Database;
 case"Network": return Shield;
 case"Application": return Globe;
 default: return Laptop;
 }
 };

 const filteredAssets = assets.filter(a => 
 a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
 a.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
 a.type.toLowerCase().includes(searchQuery.toLowerCase())
 );

 return (
 <div className="space-y-6 max-w-7xl mx-auto">
 <div className="flex items-center justify-between">
 <div className="space-y-1">
 <h1 className="text-3xl font-light text-sn-dark">Configuration Management (CMDB)</h1>
 <p className="text-muted-foreground">Manage and track all configuration items and their relationships.</p>
 </div>
 <div className="flex items-center gap-3">
 <Button variant="outline" className="gap-2 border-border">
 <LinkIcon className="w-4 h-4" /> Dependency Map
 </Button>
 <Button className="bg-sn-green text-sn-dark font-bold">Add CI</Button>
 </div>
 </div>

 <div className="sn-card p-0 overflow-hidden">
 <div className="p-4 border-b border-border bg-muted/10 flex items-center justify-between gap-4">
 <div className="flex items-center gap-2 flex-grow max-w-md">
 <div className="relative flex-grow">
 <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
 <input 
 type="text"
 placeholder="Search assets..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full bg-white border border-border rounded py-1.5 pl-9 pr-3 text-sm outline-none focus:ring-1 focus:ring-sn-green"
 />
 </div>
 <Button variant="outline" size="sm" className="gap-2 border-border">
 <Filter className="w-3.5 h-3.5" /> Filter
 </Button>
 </div>
 <div className="text-xs text-muted-foreground">
 Showing {filteredAssets.length} of {assets.length} items
 </div>
 </div>

 <div className="overflow-x-auto">
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="bg-muted/30 border-b border-border">
 <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">ID</th>
 <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Name</th>
 <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Type</th>
 <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</th>
 <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Owner</th>
 <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Location</th>
 <th className="p-4 w-10"></th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border">
 {filteredAssets.map((asset) => {
 const Icon = getIcon(asset.type);
 return (
 <tr key={asset.id} className="hover:bg-muted/20 transition-colors group">
 <td className="p-4 text-sm text-blue-600 cursor-pointer hover:underline">{asset.id}</td>
 <td className="p-4">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
 <Icon className="w-4 h-4 text-sn-dark" />
 </div>
 <span className="text-sm font-medium text-sn-dark">{asset.name}</span>
 </div>
 </td>
 <td className="p-4 text-sm text-muted-foreground">{asset.type}</td>
 <td className="p-4">
 <span className={cn(
"px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
 asset.status ==="Operational" ?"bg-green-100 text-green-700" :"bg-yellow-100 text-yellow-700"
 )}>
 {asset.status}
 </span>
 </td>
 <td className="p-4 text-sm text-muted-foreground">{asset.owner}</td>
 <td className="p-4 text-sm text-muted-foreground">{asset.location}</td>
 <td className="p-4">
 <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
 <button onClick={() => alert("Edit CI coming soon!")} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors" title="Edit Item">
 <Edit className="w-4 h-4" />
 </button>
 <button onClick={() => alert("Delete CI coming soon!")} className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors" title="Delete Item">
 <Trash2 className="w-4 h-4" />
 </button>
 </div>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </div>

 {/* Relationships Preview */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <div className="sn-card space-y-4">
 <h3 className="text-sm font-bold flex items-center gap-2">
 <Activity className="w-4 h-4 text-sn-green" /> Health Overview
 </h3>
 <div className="space-y-3">
 <div className="flex items-center justify-between text-xs">
 <span className="text-muted-foreground">Operational</span>
 <span className="font-bold text-green-600">98.2%</span>
 </div>
 <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
 <div className="h-full bg-green-500" style={{ width:"98.2%" }} />
 </div>
 <div className="flex items-center justify-between text-xs">
 <span className="text-muted-foreground">Under Maintenance</span>
 <span className="font-bold text-yellow-600">1.8%</span>
 </div>
 </div>
 </div>

 <div className="sn-card space-y-4">
 <h3 className="text-sm font-bold flex items-center gap-2">
 <LinkIcon className="w-4 h-4 text-blue-500" /> Critical Dependencies
 </h3>
 <div className="space-y-2">
 {assets.slice(0, 3).map(a => (
 <div key={a.id} className="flex items-center justify-between p-2 hover:bg-muted/30 rounded transition-colors cursor-pointer">
 <span className="text-xs font-medium">{a.name}</span>
 <ChevronRight className="w-3 h-3 text-muted-foreground" />
 </div>
 ))}
 </div>
 </div>

 <div className="sn-card space-y-4">
 <h3 className="text-sm font-bold flex items-center gap-2">
 <Shield className="w-4 h-4 text-red-500" /> Security Compliance
 </h3>
 <div className="flex items-center justify-center py-4">
 <div className="relative w-24 h-24">
 <svg className="w-full h-full" viewBox="0 0 36 36">
 <path className="text-muted stroke-current" strokeWidth="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
 <path className="text-sn-green stroke-current" strokeWidth="3" strokeDasharray="85, 100" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
 </svg>
 <div className="absolute inset-0 flex items-center justify-center text-xl font-bold">85%</div>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}
