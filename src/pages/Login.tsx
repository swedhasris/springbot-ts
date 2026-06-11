import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ROLE_LABELS, type Role } from "../lib/roles";
import { Crown, Shield, UserCog, Eye, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Local Button component
const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'outline' | 'ghost' }>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: "bg-sn-green text-sn-dark hover:bg-sn-green/90 shadow-md",
      outline: "border-2 border-border bg-transparent hover:bg-muted/50 text-foreground",
      ghost: "bg-transparent hover:bg-muted/50 text-muted-foreground"
    };
    return (
      <button
        ref={ref}
        className={cn(
          "px-4 py-2 rounded-lg font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2",
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

// Same hash function as Register
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'h_' + Math.abs(hash).toString(36) + '_' + str.length;
}

const QUICK_ACCESS_ROLES: { role: Role; label: string; description: string; icon: any; color: string; email: string }[] = [
  { role: "user",              label: "User",              description: "End user — raise & track tickets",        icon: UserCog, color: "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200", email: "user@technosprint.net" },
  { role: "agent",             label: "Support Agent",     description: "Support agent — manage incidents",         icon: Eye,     color: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100", email: "agent@technosprint.net" },
  { role: "admin",             label: "Administrator",     description: "Manage users, SLA & approvals",            icon: UserCog, color: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100", email: "admin@technosprint.net" },
  { role: "super_admin",       label: "Super Admin",       description: "Manage dropdowns & system config",         icon: Shield,  color: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100", email: "ulter@technosprint.net" },
  { role: "ultra_super_admin", label: "Ultra Super Admin", description: "Full control — grant/remove all access",   icon: Crown,   color: "bg-gradient-to-r from-yellow-50 to-orange-50 text-orange-800 border-orange-300 hover:from-yellow-100 hover:to-orange-100", email: "arun@technosprint.net" },
];

export function Login() {
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [error, setError]           = useState("");
  const [isLoading, setIsLoading]   = useState(false);
  const [demoLoading, setDemoLoading] = useState<Role | null>(null);
  const navigate = useNavigate();

  const performLogin = async (emailVal: string, passwordVal: string, roleForDemo: Role | null = null) => {
    if (!emailVal.trim() || !passwordVal.trim()) { 
      setError("Please enter email and password."); 
      return; 
    }
    setError("");
    if (roleForDemo) {
      setDemoLoading(roleForDemo);
    } else {
      setIsLoading(true);
    }

    try {
      // Primary: Try backend API (which checks SQLite/MySQL and handles database integration)
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailVal, password: passwordVal })
      });

      if (response.ok) {
        const userData = await response.json();
        
        // Save to localStorage
        localStorage.setItem("demo_user", JSON.stringify({
          uid: userData.uid,
          name: userData.name,
          email: userData.email,
          role: userData.role || "user",
          phone: userData.phone || ""
        }));

        window.location.href = "/";
        return;
      }



      const errorData = await response.json().catch(() => ({}));
      setError(errorData.error || "Invalid email or password.");
      
    } catch (err: any) {
      console.error("Login error:", err);
      setError("Login failed: Check your connection and try again.");
    } finally { 
      setIsLoading(false); 
      setDemoLoading(null);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    performLogin(email, password);
  };

  const handleQuickLogin = (emailVal: string, roleVal: Role) => {
    const passwordVal = emailVal === "arun@technosprint.net" ? "Poland@01" : "Password123!";
    setEmail(emailVal);
    setPassword(passwordVal);
    performLogin(emailVal, passwordVal, roleVal);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-sn-dark p-4 animate-fade-in">
      <div className="w-full max-w-4xl flex flex-col md:flex-row gap-6 items-stretch">

        {/* ── Login Form ── */}
        <div className="flex-grow flex-1 bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 hover:shadow-sn-green/10">
          <div className="bg-sn-sidebar p-8 text-white text-center relative overflow-hidden">
            {/* Design accents */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-sn-green/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-sn-green/5 rounded-full blur-xl" />
            
            <div className="w-16 h-16 bg-sn-green rounded-xl flex items-center justify-center font-bold text-3xl text-sn-dark mx-auto mb-4 shadow-lg transform transition-transform hover:scale-105 duration-300">C</div>
            <h1 className="text-2xl font-bold tracking-tight">Connect IT</h1>
            <p className="text-white/60 text-sm mt-2">Sign in to your employee portal</p>
          </div>

          <form onSubmit={handleLogin} className="p-8 space-y-5">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 animate-shake">{error}</div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email Address</label>
              <input 
                type="email" 
                required 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                className="w-full p-3 border border-border rounded-lg focus:ring-2 focus:ring-sn-green focus:border-sn-green outline-none transition-all"
                placeholder="name@company.com" 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Password</label>
              <input 
                type="password" 
                required 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                className="w-full p-3 border border-border rounded-lg focus:ring-2 focus:ring-sn-green focus:border-sn-green outline-none transition-all"
                placeholder="••••••••" 
              />
            </div>

            <Button 
              type="submit" 
              disabled={isLoading || demoLoading !== null}
              className="w-full py-6 bg-sn-green text-sn-dark font-bold text-base hover:bg-sn-green/90 transition-all active:scale-[0.99] flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : "Sign In"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              No account? <Link to="/register" className="text-sn-green font-bold hover:underline transition-all">Register</Link>
            </p>
          </form>
        </div>

        {/* ── Role Panel ── */}
        <div className="w-full md:w-80 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 hover:shadow-sn-green/10">
          <div className="bg-gradient-to-br from-sn-dark to-gray-800 p-6 text-white text-center relative overflow-hidden">
            <div className="text-2xl mb-1 transform hover:rotate-12 transition-transform duration-300">🚀</div>
            <h2 className="font-bold text-lg tracking-tight">Quick Access</h2>
            <p className="text-white/60 text-xs mt-1">Select a role to sign in instantly</p>
          </div>

          <div className="p-4 space-y-2.5 flex-grow overflow-y-auto">
            {QUICK_ACCESS_ROLES.map(({ role, label, description, icon: Icon, color, email: emailVal }) => (
              <button 
                key={role} 
                type="button"
                onClick={() => handleQuickLogin(emailVal, role)}
                disabled={isLoading || demoLoading !== null}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all active:scale-[0.98] disabled:opacity-50",
                  color
                )}
              >
                <div className="w-9 h-9 rounded-lg bg-white/60 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-grow min-w-0">
                  <div className="font-bold text-sm leading-tight">
                    {demoLoading === role ? "Logging in..." : label}
                  </div>
                  <div className="text-[10px] opacity-70 leading-tight mt-0.5 truncate">{description}</div>
                </div>
                {demoLoading === role && (
                  <Loader2 className="w-4 h-4 animate-spin text-current flex-shrink-0" />
                )}
              </button>
            ))}

            <p className="text-[10px] text-center text-muted-foreground pt-3 border-t border-border mt-3">
              Quick access validates through your secure MySQL/SQLite database services.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
