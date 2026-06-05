"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Store, Loader2, MapPin, ChevronRight, Lock, ShieldCheck, Power } from "lucide-react";

export default function OutletRedirectPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [outlets, setOutlets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session?.user) {
      fetchUserOutlets();
    }
  }, [status, session]);

  const fetchUserOutlets = async () => {
    try {
      const tenantId = (session?.user as any).tenantId;
      const res = await fetch(`/api/outlets?tenantId=${tenantId}`);
      const data = await res.json();

      if (data && data.length > 0) {
        setOutlets(data);
        // SMART ROUTING: Agar sirf 1 outlet hai, toh ye screen skip karke direct dashboard par bhej do
        if (data.length === 1 && data[0].isActive) {
          router.push(`/pos/${data[0].id}/dashboard`);
        } else {
          setLoading(false);
        }
      } else {
        // Agar naya user hai jiska koi outlet nahi bana
        setLoading(false);
      }
    } catch (error) {
      console.error("Failed to load outlets");
      setLoading(false);
    }
  };

  if (loading || status === "loading") {
    return (
      <div className="h-screen w-screen bg-[#0a0a0c] flex flex-col items-center justify-center relative overflow-hidden">
        <Store size={64} className="text-amber-500 absolute animate-pulse drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
        <h2 className="text-white font-black uppercase tracking-widest text-sm mt-24">Syncing Workspace...</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex flex-col relative overflow-hidden font-sans">
      {/* Background Lighting */}
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-orange-600/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Header */}
      <div className="p-8 border-b border-white/10 bg-white/[0.02] backdrop-blur-md flex justify-between items-center z-10">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center mr-4 shadow-lg shadow-orange-500/20 border border-white/10">
            <Store size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white uppercase tracking-wider">{session?.user?.name || "Brand"} Workspace</h1>
            <p className="text-slate-400 text-[10px] font-black tracking-widest mt-0.5 uppercase">Select your outlet to access the terminal</p>
          </div>
        </div>
        <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
          <ShieldCheck size={14} className="mr-1.5"/> System Online
        </div>
      </div>

      {/* Outlet Selection Grid */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 z-10">
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {outlets.map((outlet) => (
            <div key={outlet.id} className={`bg-white/[0.03] backdrop-blur-xl rounded-3xl border ${outlet.isActive ? 'border-amber-500/30 hover:border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.05)] cursor-pointer hover:-translate-y-1' : 'border-white/5 opacity-60'} p-6 transition-all duration-300 flex flex-col h-full`} onClick={() => outlet.isActive && router.push(`/pos/${outlet.id}/dashboard`)}>
              <div className="flex justify-between items-start mb-4">
                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded ${outlet.isActive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                  {outlet.isActive ? '🟢 Active' : '🔴 Setup Phase'}
                </span>
                {outlet.isActive ? <Power size={16} className="text-amber-500"/> : <Lock size={16} className="text-slate-500"/>}
              </div>
              
              <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">{outlet.name}</h2>
              <p className="text-xs text-slate-400 font-bold flex items-start mb-6 flex-1">
                <MapPin size={14} className="mr-1.5 mt-0.5 shrink-0 text-slate-500"/> {outlet.address}
              </p>

              {outlet.isActive ? (
                <button className="w-full bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-white border border-amber-500/30 font-black uppercase tracking-widest py-3.5 rounded-xl text-xs flex justify-center items-center transition-all">
                  Open Terminal <ChevronRight size={16} className="ml-1"/>
                </button>
              ) : (
                <button disabled className="w-full bg-slate-900 text-slate-500 border border-slate-800 font-black uppercase tracking-widest py-3.5 rounded-xl text-xs flex justify-center items-center">
                  Terminal Locked
                </button>
              )}
            </div>
          ))}

          {/* If No Outlets (First time setup placeholder) */}
          {outlets.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center p-10 text-center border-2 border-dashed border-white/10 rounded-3xl">
              <Store size={48} className="text-slate-600 mb-4"/>
              <h2 className="text-xl font-black text-white uppercase tracking-tight mb-2">No Outlets Configured</h2>
              <p className="text-xs font-bold text-slate-400 mb-6">Contact Super Admin to assign an outlet to this workspace.</p>
            </div>
          )}

        </div>
      </div>

      {/* Footer */}
      <div className="p-6 text-center z-10">
        <p className="text-slate-600 text-[10px] font-black tracking-[0.2em] uppercase flex items-center justify-center">
          Powered by ZedPoss <span className="mx-2">•</span> V1.0.0 PROD
        </p>
      </div>
    </div>
  );
}
