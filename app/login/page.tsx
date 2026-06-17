"use client";
import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { Loader2, Lock, Mail, Store, ShieldCheck, Cpu } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 🔥 FIX: Force document title on client load to prevent "Create Next App" flashing
  useEffect(() => {
    document.title = "ZedPoss Billing | Secure Outlet Login | By ZedooX";
  }, []);

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    // 🌟 ONLY OUTLET LOGIN - Passing loginType
    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
      loginType: "OUTLET" // Tells backend to check Prisma.Outlet
    });

    if (result?.error) {
      setError(result.error);
      setLoading(false); 
    } else {
      try {
        const res = await fetch("/api/auth/session");
        const sessionData = await res.json();
        if (sessionData?.user?.outletId) {
          window.location.href = `/pos/${sessionData.user.outletId}/dashboard`;
        } else {
          setError("Terminal Allocation Failed.");
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
      {/* 🔥 PREMIUM SEO & META TAGS */}
      <title>ZedPoss Billing | Secure Outlet Login</title>
      <meta name="description" content="Login to ZedPoss Cloud POS Terminal. A premium, ultra-fast, and highly secure restaurant & retail billing system developed by ZedooX Technologies." />
      <meta name="keywords" content="ZedPoss Login, POS Terminal, ZedooX Technologies, Cloud Billing, Smart POS, Restaurant Billing, Retail POS, Fast Checkout" />

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
                ZedPoss <span className="text-[10px] bg-white/10 text-orange-500 px-2 py-1 rounded-md font-mono tracking-widest uppercase border border-white/5 align-top mt-1">TERMINAL</span>
              </h1>
              <p className="text-slate-400 text-[10px] font-black tracking-[0.2em] mt-3 uppercase flex items-center justify-center gap-1.5">
                <Cpu size={12} className="text-orange-500"/> Connect Store
              </p>
            </div>

            <div className="p-10 pt-8">
              {error && (
                <div className="bg-red-500/10 text-red-400 p-4 rounded-xl text-xs font-bold text-center mb-6 border border-red-500/20 uppercase tracking-wider flex items-center justify-center shadow-inner">
                  <ShieldCheck size={16} className="mr-2" />
                  {error}
                </div>
              )}
              
              <form onSubmit={handleCredentialsLogin} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-[0.15em] mb-2.5 flex items-center">
                    <Mail size={12} className="mr-2 text-orange-500/70"/> Outlet Email
                  </label>
                  <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3.5 bg-black/40 border border-white/10 rounded-xl outline-none text-sm font-semibold text-white focus:border-orange-500/50 transition-all placeholder:text-slate-700" placeholder="store@zedoox.com" />
                </div>
                
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-[0.15em] mb-2.5 flex items-center">
                    <Lock size={12} className="mr-2 text-orange-500/70"/> POS Password
                  </label>
                  <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3.5 bg-black/40 border border-white/10 rounded-xl outline-none text-lg font-mono font-black text-white focus:border-orange-500/50 transition-all tracking-[0.2em] placeholder:text-slate-700 placeholder:text-sm placeholder:tracking-normal placeholder:font-sans" placeholder="Enter Password" />
                </div>
                
                <button disabled={loading} type="submit" className="w-full bg-gradient-to-r from-orange-600 to-amber-600 text-white font-black uppercase tracking-[0.15em] py-4 rounded-xl text-xs flex justify-center items-center shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all hover:scale-[0.98] mt-4 border border-white/10 disabled:opacity-50">
                  {loading ? <Loader2 className="animate-spin" size={18}/> : <><ShieldCheck size={16} className="mr-2"/> Start Terminal</>}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* 🔥 NEW: ZedooX Technologies Branding Footer */}
        <div className="absolute bottom-6 w-full text-center z-10 animate-in fade-in duration-1000 delay-300">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center justify-center">
            ZedPoss By <span className="text-orange-500 ml-1.5">ZedooX Technologies</span>
          </p>
        </div>

      </div>
    </>
  );
}
