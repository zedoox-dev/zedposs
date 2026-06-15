"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { Loader2, Lock, Mail, Store, ShieldCheck, Cpu, Briefcase } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // 🔥 NEW: Toggle between Terminal (POS) and Brand Owner (Tenant)
  const [loginMode, setLoginMode] = useState<"OUTLET" | "OWNER">("OUTLET");

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    // Pass the selected loginType to NextAuth provider
    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
      loginType: loginMode 
    });

    if (result?.error) {
      setError(result.error);
      setLoading(false); 
    } else {
      try {
        const res = await fetch("/api/auth/session");
        const sessionData = await res.json();
        
        // 🚀 SMART ROUTING BASED ON ROLE
        if (sessionData?.user?.outletId) {
          // POS Staff -> Outlet Dashboard
          window.location.href = `/pos/${sessionData.user.outletId}/dashboard`;
        } else if (sessionData?.user?.tenantId) {
          // Brand Owner/Admin -> Tenant Super Dashboard
          window.location.href = `/dashboard`;
        } else {
          setError("Account routing failed. Invalid privileges.");
          setLoading(false);
        }
      } catch (err) {
        setError("Network sync error.");
        setLoading(false);
      }
    }
  };

  return (
    <>
      <title>ZedPoss | Enterprise Login</title>
      <meta name="description" content="Secure POS terminal and Owner login." />

      <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
        
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-orange-600/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="w-full max-w-md z-10 animate-in fade-in zoom-in duration-500">
          <div className="bg-white/[0.02] backdrop-blur-3xl rounded-3xl border border-white/[0.05] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
            
            <div className="p-10 pb-6 text-center border-b border-white/[0.05] relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-50"></div>
              
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl mx-auto flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.2)] mb-5 border border-white/20 relative">
                <Store size={32} className="text-white drop-shadow-md" />
              </div>
              
              <h1 className="text-3xl font-black text-white tracking-tight flex items-center justify-center gap-2">
                ZedPoss <span className="text-[10px] bg-white/10 text-orange-500 px-2 py-1 rounded-md font-mono tracking-widest uppercase border border-white/5 align-top mt-1">{loginMode}</span>
              </h1>
              <p className="text-slate-400 text-[10px] font-black tracking-[0.2em] mt-3 uppercase flex items-center justify-center gap-1.5">
                <Cpu size={12} className="text-orange-500"/> Connect Server
              </p>
            </div>

            <div className="p-10 pt-8">
              
              {/* 🔥 LOGIN TOGGLE SWITCHER */}
              <div className="flex bg-black/40 p-1.5 rounded-xl mb-8 border border-white/10 relative">
                <button 
                  type="button"
                  onClick={() => setLoginMode("OUTLET")}
                  className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex justify-center items-center ${loginMode === 'OUTLET' ? 'bg-orange-500 text-white shadow-md' : 'text-slate-500 hover:text-white'}`}
                >
                  <Store size={14} className="mr-1.5"/> Terminal
                </button>
                <button 
                  type="button"
                  onClick={() => setLoginMode("OWNER")}
                  className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex justify-center items-center ${loginMode === 'OWNER' ? 'bg-orange-500 text-white shadow-md' : 'text-slate-500 hover:text-white'}`}
                >
                  <Briefcase size={14} className="mr-1.5"/> Brand Owner
                </button>
              </div>

              {error && (
                <div className="bg-red-500/10 text-red-400 p-4 rounded-xl text-xs font-bold text-center mb-6 border border-red-500/20 uppercase tracking-wider flex items-center justify-center shadow-inner">
                  <ShieldCheck size={16} className="mr-2" />
                  {error}
                </div>
              )}
              
              <form onSubmit={handleCredentialsLogin} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-[0.15em] mb-2.5 flex items-center">
                    <Mail size={12} className="mr-2 text-orange-500/70"/> {loginMode === "OUTLET" ? "Outlet Email" : "Admin Email"}
                  </label>
                  <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3.5 bg-black/40 border border-white/10 rounded-xl outline-none text-sm font-semibold text-white focus:border-orange-500/50 transition-all placeholder:text-slate-700" placeholder={loginMode === "OUTLET" ? "store@zedoox.com" : "owner@brand.com"} />
                </div>
                
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-[0.15em] mb-2.5 flex items-center">
                    <Lock size={12} className="mr-2 text-orange-500/70"/> {loginMode === "OUTLET" ? "POS Password" : "Account Password"}
                  </label>
                  <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3.5 bg-black/40 border border-white/10 rounded-xl outline-none text-lg font-mono font-black text-white focus:border-orange-500/50 transition-all tracking-[0.2em] placeholder:text-slate-700 placeholder:text-sm placeholder:tracking-normal placeholder:font-sans" placeholder="••••••••" />
                </div>
                
                <button disabled={loading} type="submit" className="w-full bg-gradient-to-r from-orange-600 to-amber-600 text-white font-black uppercase tracking-[0.15em] py-4 rounded-xl text-xs flex justify-center items-center shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all hover:scale-[0.98] mt-4 border border-white/10 disabled:opacity-50">
                  {loading ? <Loader2 className="animate-spin" size={18}/> : <><ShieldCheck size={16} className="mr-2"/> {loginMode === "OUTLET" ? "Start Terminal" : "Open HQ Dashboard"}</>}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
