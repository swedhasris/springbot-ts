import React from"react";
import { ShieldAlert, ArrowLeft } from"lucide-react";
import { useAuth } from"../contexts/AuthContext";
import { ROLE_COLORS, ROLE_LABELS } from"../lib/roles";
import { cn } from"@/lib/utils";

export function AccessRestricted() {
 const { profile } = useAuth();
 const userRole = profile?.role ||"user";

 const handleBackToDashboard = () => {
 window.location.href ="/my-dashboard";
 };

 return (
 <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 animate-in fade-in duration-500">
 {/* Glow effect in background */}
 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

 {/* Glassmorphic Restricted Card */}
 <div className="relative glass-panel max-w-md w-full rounded-2xl p-8 border border-blue-500/20 text-center shadow-2xl space-y-6">
 {/* Animated Glowing Shield Icon */}
 <div className="mx-auto w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center animate-pulse shadow-[0_0_20px_rgba(59,130,246,0.15)]">
 <ShieldAlert className="w-8 h-8 text-blue-500" />
 </div>

 <div className="space-y-2">
 <h2 className="text-2xl font-semibold tracking-tight text-sn-dark dark:text-white uppercase">
 Access Restricted
 </h2>
 <p className="text-xs text-text-dim leading-relaxed">
 Your current security profile does not have permission to view or use this feature.
 </p>
 </div>

 {/* User profile info */}
 <div className="p-4 bg-muted/20 dark:bg-black/20 rounded-xl border border-border/50 dark:border-white/5 flex flex-col items-center gap-2">
 <div className="flex items-center gap-2">
 <span className="w-2 h-2 rounded-full bg-blue-500 status-indicator-pulse" />
 <span className="text-xs font-semibold text-sn-dark dark:text-white truncate max-w-[180px]">
 {profile?.name || profile?.email ||"Unknown User"}
 </span>
 </div>
 <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase", ROLE_COLORS[userRole])}>
 {ROLE_LABELS[userRole] || userRole}
 </span>
 </div>

 {/* Back action */}
 <button
 onClick={handleBackToDashboard}
 className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all cursor-pointer"
 >
 <ArrowLeft className="w-3.5 h-3.5" />
 Return to Dashboard
 </button>
 </div>
 </div>
 );
}
