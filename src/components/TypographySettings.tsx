import React, { useState, useEffect } from"react";
import { Sparkles, Upload, FileText, CheckCircle2 } from"lucide-react";
import { Button } from"@/components/ui/button";

interface TypographySettingsData {
 globalFont: string;
 loginFont: string;
 dashboardFont: string;
 ticketFont: string;
 reportFont: string;
 portalFont: string;
 kbFont: string;
 profileFont: string;
 customFonts: Array<{ name: string; url: string }>;
}

export function TypographySettings() {
 const [settings, setSettings] = useState<TypographySettingsData>({
 globalFont:"Inter",
 loginFont:"Inter",
 dashboardFont:"Inter",
 ticketFont:"Inter",
 reportFont:"Inter",
 portalFont:"Inter",
 kbFont:"Inter",
 profileFont:"Inter",
 customFonts: []
 });

 const [loading, setLoading] = useState(false);
 const [uploading, setUploading] = useState(false);
 const [successMsg, setSuccessMsg] = useState("");
 const [previewText, setPreviewText] = useState("The quick brown fox jumps over the lazy dog");

 const fontOptions = ["Inter","Roboto","Outfit","Open Sans","Poppins","Montserrat","Lato"];

 useEffect(() => {
 fetch("/api/settings/typography")
 .then(res => res.json())
 .then(data => {
 if (data && !data.error) {
 setSettings(data);
 }
 })
 .catch(err => console.error("Error loading typography settings:", err));
 }, []);

 const handleSave = async () => {
 setLoading(true);
 try {
 const res = await fetch("/api/settings/typography", {
 method:"POST",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify(settings)
 });
 const data = await res.json();
 if (data.success) {
 setSuccessMsg("Typography settings saved successfully! Reload the page to apply fully.");
 setTimeout(() => setSuccessMsg(""), 5000);
 }
 } catch (e) {
 console.error(e);
 } finally {
 setLoading(false);
 }
 };

 const handleFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;
 setUploading(true);

 const formData = new FormData();
 formData.append("fontFile", file);

 try {
 const res = await fetch("/api/settings/upload-font", {
 method:"POST",
 body: formData
 });
 const data = await res.json();
 if (data.success) {
 const updatedCustom = [...settings.customFonts, { name: data.font_name, url: data.font_url }];
 setSettings(prev => ({
 ...prev,
 customFonts: updatedCustom
 }));
 setSuccessMsg(`Font"${data.font_name}" uploaded successfully!`);
 setTimeout(() => setSuccessMsg(""), 5000);
 } else {
 alert(data.error ||"Upload failed");
 }
 } catch (err) {
 console.error(err);
 alert("Error uploading font file");
 } finally {
 setUploading(false);
 }
 };

 const allFontOptions = [...fontOptions, ...settings.customFonts.map(f => f.name)];

 return (
 <div className="bg-white dark:bg-sn-sidebar rounded-[40px] border border-border dark:border-white/5 p-10 shadow-2xl space-y-8">
 <div className="flex items-center justify-between pb-6 border-b border-border dark:border-white/5">
 <div>
 <h2 className="text-3xl font-semibold">Enterprise Font Management</h2>
 <p className="text-muted-foreground text-sm font-medium mt-1">
 Configure typography mappings and upload custom assets.
 </p>
 </div>
 <div className="flex items-center gap-3">
 <label className="cursor-pointer px-4 py-2.5 bg-sn-dark text-sn-green rounded-xl hover:scale-105 transition-all inline-flex items-center gap-2 border border-sn-green/20">
 <Upload size={14} />
 <span className="text-[10px] font-semibold uppercase tracking-widest">
 {uploading ?"Uploading..." :"Upload WOFF2/TTF"}
 </span>
 <input type="file" className="hidden" accept=".woff2,.woff,.ttf,.otf" onChange={handleFontUpload} disabled={uploading} />
 </label>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 {/* Left: Selectors */}
 <div className="space-y-6">
 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground ml-1">Global Font</label>
 <select
 value={settings.globalFont}
 onChange={e => setSettings({ ...settings, globalFont: e.target.value })}
 className="w-full bg-muted/40 dark:bg-black/20 border border-border dark:border-white/5 rounded-2xl px-5 py-3 text-xs font-bold outline-none"
 >
 {allFontOptions.map(f => <option key={f} value={f}>{f}</option>)}
 </select>
 </div>

 <div className="space-y-2">
 <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground ml-1">Login Page Font</label>
 <select
 value={settings.loginFont}
 onChange={e => setSettings({ ...settings, loginFont: e.target.value })}
 className="w-full bg-muted/40 dark:bg-black/20 border border-border dark:border-white/5 rounded-2xl px-5 py-3 text-xs font-bold outline-none"
 >
 {allFontOptions.map(f => <option key={f} value={f}>{f}</option>)}
 </select>
 </div>

 <div className="space-y-2">
 <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground ml-1">Dashboard Font</label>
 <select
 value={settings.dashboardFont}
 onChange={e => setSettings({ ...settings, dashboardFont: e.target.value })}
 className="w-full bg-muted/40 dark:bg-black/20 border border-border dark:border-white/5 rounded-2xl px-5 py-3 text-xs font-bold outline-none"
 >
 {allFontOptions.map(f => <option key={f} value={f}>{f}</option>)}
 </select>
 </div>

 <div className="space-y-2">
 <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground ml-1">Ticket Manager Font</label>
 <select
 value={settings.ticketFont}
 onChange={e => setSettings({ ...settings, ticketFont: e.target.value })}
 className="w-full bg-muted/40 dark:bg-black/20 border border-border dark:border-white/5 rounded-2xl px-5 py-3 text-xs font-bold outline-none"
 >
 {allFontOptions.map(f => <option key={f} value={f}>{f}</option>)}
 </select>
 </div>

 <div className="space-y-2">
 <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground ml-1">Reports Font</label>
 <select
 value={settings.reportFont}
 onChange={e => setSettings({ ...settings, reportFont: e.target.value })}
 className="w-full bg-muted/40 dark:bg-black/20 border border-border dark:border-white/5 rounded-2xl px-5 py-3 text-xs font-bold outline-none"
 >
 {allFontOptions.map(f => <option key={f} value={f}>{f}</option>)}
 </select>
 </div>

 <div className="space-y-2">
 <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground ml-1">Self-Service Portal</label>
 <select
 value={settings.portalFont}
 onChange={e => setSettings({ ...settings, portalFont: e.target.value })}
 className="w-full bg-muted/40 dark:bg-black/20 border border-border dark:border-white/5 rounded-2xl px-5 py-3 text-xs font-bold outline-none"
 >
 {allFontOptions.map(f => <option key={f} value={f}>{f}</option>)}
 </select>
 </div>

 <div className="space-y-2">
 <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground ml-1">Knowledge Base Font</label>
 <select
 value={settings.kbFont}
 onChange={e => setSettings({ ...settings, kbFont: e.target.value })}
 className="w-full bg-muted/40 dark:bg-black/20 border border-border dark:border-white/5 rounded-2xl px-5 py-3 text-xs font-bold outline-none"
 >
 {allFontOptions.map(f => <option key={f} value={f}>{f}</option>)}
 </select>
 </div>

 <div className="space-y-2">
 <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground ml-1">User Profile Font</label>
 <select
 value={settings.profileFont}
 onChange={e => setSettings({ ...settings, profileFont: e.target.value })}
 className="w-full bg-muted/40 dark:bg-black/20 border border-border dark:border-white/5 rounded-2xl px-5 py-3 text-xs font-bold outline-none"
 >
 {allFontOptions.map(f => <option key={f} value={f}>{f}</option>)}
 </select>
 </div>
 </div>

 <Button
 onClick={handleSave}
 disabled={loading}
 className="w-full bg-sn-green text-sn-dark h-12 rounded-2xl font-semibold uppercase tracking-widest text-xs mt-4 shadow-lg shadow-sn-green/20"
 >
 {loading ?"Saving Configuration..." :"Save Typography Configuration"}
 </Button>
 </div>

 {/* Right: Live Preview Panel */}
 <div className="bg-muted/30 p-8 rounded-[32px] border border-border flex flex-col justify-between space-y-6">
 <div className="space-y-4">
 <h3 className="text-lg font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
 <FileText size={16} /> Live Typography Preview
 </h3>
 <textarea
 value={previewText}
 onChange={e => setPreviewText(e.target.value)}
 className="w-full bg-white dark:bg-black/10 border border-border dark:border-white/5 rounded-2xl p-4 text-xs font-bold outline-none resize-none h-20"
 />
 </div>

 <div className="p-8 bg-white dark:bg-black/40 rounded-2xl border border-border/50 text-center min-h-[160px] flex items-center justify-center overflow-hidden">
 <div className="space-y-3">
 <div 
 style={{ fontFamily: `'${settings.globalFont}', sans-serif` }}
 className="text-3xl font-semibold tracking-tight transition-all duration-300"
 >
 {previewText}
 </div>
 <div className="text-[10px] font-semibold uppercase text-sn-green tracking-widest">
 Rendering Font: {settings.globalFont}
 </div>
 </div>
 </div>
 </div>
 </div>

 {settings.customFonts.length > 0 && (
 <div className="pt-6 border-t border-border dark:border-white/5 space-y-4">
 <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Custom Uploaded Fonts</h3>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 {settings.customFonts.map(f => (
 <div key={f.name} className="flex items-center gap-3 p-4 bg-muted/40 rounded-2xl border border-border">
 <div className="p-2 bg-sn-green/10 text-sn-green rounded-lg">
 <CheckCircle2 size={16} />
 </div>
 <div className="truncate">
 <div className="text-xs font-semibold truncate">{f.name}</div>
 <div className="text-[9px] font-bold text-muted-foreground">Custom font</div>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {successMsg && (
 <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-500 rounded-2xl text-xs font-semibold flex items-center gap-2">
 <CheckCircle2 size={16} /> {successMsg}
 </div>
 )}
 </div>
 );
}
