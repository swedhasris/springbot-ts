import React, { useState } from"react";
import { Link, useNavigate } from"react-router-dom";
import { type Role } from"../lib/roles";
import { Loader2 } from"lucide-react";
import { cn } from"@/lib/utils";

// Local Button component
const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'outline' | 'ghost' }>(
 ({ className, variant = 'default', ...props }, ref) => {
 const variants = {
 default:"bg-sn-green text-sn-dark hover:bg-sn-green/90 shadow-md",
 outline:"border-2 border-border bg-transparent hover:bg-muted/50 text-foreground",
 ghost:"bg-transparent hover:bg-muted/50 text-muted-foreground"
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
Button.displayName ="Button";

export function Login() {
 const [email, setEmail] = useState("");
 const [password, setPassword] = useState("");
 const [error, setError] = useState("");
 const [isLoading, setIsLoading] = useState(false);
 const navigate = useNavigate();

 const handleLogin = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!email.trim() || !password.trim()) {
 setError("Please enter email and password.");
 return;
 }
 setError("");
 setIsLoading(true);

 try {
 const response = await fetch("/api/auth/login", {
 method:"POST",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify({ email, password })
 });

 if (response.ok) {
 const userData = await response.json();
 localStorage.setItem("demo_user", JSON.stringify({
 uid: userData.uid,
 name: userData.name,
 email: userData.email,
 role: userData.role ||"user",
 phone: userData.phone ||""
 }));
 window.location.href ="/";
 return;
 }

 const errorData = await response.json().catch(() => ({}));
 setError(errorData.error ||"Invalid email or password.");
 } catch (err: any) {
 setError("Login failed: Check your connection and try again.");
 } finally {
 setIsLoading(false);
 }
 };

 return (
 <div className="min-h-screen flex items-center justify-center bg-sn-dark p-4 animate-fade-in">
 <div className="w-full max-w-md">

 {/* ── Login Card ── */}
 <div className="bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 hover:shadow-sn-green/10">
 <div className="bg-sn-sidebar p-8 text-white text-center relative overflow-hidden">
 {/* Design accents */}
 <div className="absolute top-0 right-0 w-24 h-24 bg-sn-green/10 rounded-full blur-2xl" />
 <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-sn-green/5 rounded-full blur-xl" />

 <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center font-bold text-3xl text-sn-dark mx-auto mb-4 shadow-lg transform transition-transform hover:scale-105 duration-300 overflow-hidden">
 <img 
 src="/manage_my_desk_logo.jpg" 
 alt="Manage My Desk Logo" 
 className="w-full h-full object-contain" 
 />
 </div>
 <h1 className="text-2xl font-bold tracking-tight">Manage My Desk</h1>
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
 disabled={isLoading}
 className="w-full py-6 bg-sn-green text-sn-dark font-bold text-base hover:bg-sn-green/90 transition-all active:scale-[0.99] flex items-center justify-center"
 >
 {isLoading ? (
 <>
 <Loader2 className="w-5 h-5 animate-spin" />
 <span>Signing in...</span>
 </>
 ) :"Sign In"}
 </Button>

 <p className="text-center text-sm text-muted-foreground">
 No account? <Link to="/register" className="text-sn-green font-bold hover:underline transition-all">Register</Link>
 </p>
 </form>
 </div>

 </div>
 </div>
 );
}
