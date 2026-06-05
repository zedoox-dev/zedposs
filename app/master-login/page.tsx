"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Loader2, Lock, Mail, AlertTriangle } from "lucide-react";

export default function MasterLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleMasterLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/master-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        // 🔥 SECURE LOCAL STORAGE INJECTION
        localStorage.setItem("zed_master_session", email);
        router.push("/super-admin");
      } else {
        setError(data.error || "Access Denied.");
        setLoading(false);
      }
    } catch (err) {
      setError("System connection failed.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-600/30 border border-blue-400/20">
            <ShieldCheck size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-widest">SaaS Master Node</h1>
          <p className="text-xs text-slate-400 font-mono mt-2">Restricted Access Layer</p>
        </div>

        <form onSubmit={handleMasterLogin} className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
              <AlertTriangle size={18} className="text-red-500 shrink-0" />
              <p className="text-xs font-bold text-red-400 uppercase tracking-wide">{error}</p>
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center">
                <Mail size={12} className="mr-1.5" /> Master Email
              </label>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-xl outline-none focus:border-blue-500 transition-all font-mono text-sm" placeholder="admin@zedposs.com" />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center">
                <Lock size={12} className="mr-1.5" /> Security Key
              </label>
              <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-xl outline-none focus:border-blue-500 transition-all font-mono text-sm tracking-widest" placeholder="••••••••••••" />
            </div>

            <button type="submit" disabled={loading} className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest py-4 rounded-xl text-xs shadow-lg shadow-blue-900/50 active:scale-95 transition-all flex justify-center items-center">
              {loading ? <Loader2 className="animate-spin" size={18}/> : "Authorize Entry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
