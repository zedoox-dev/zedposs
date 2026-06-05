import Link from "next/link";
import { Store, MapPin, ArrowRight, Activity, Clock } from "lucide-react";

// Hamari Branches ka Data (Aage chalkar ye bhi database se aayega)
const BRANCHES = [
  { 
    id: "RK01", 
    name: "Lajpat Nagar (Main)", 
    address: "Shop 12, Main Market, Lajpat Nagar", 
    status: "ACTIVE",
    color: "bg-green-500" 
  },
  { 
    id: "RK02", 
    name: "Karol Bagh (Upcoming)", 
    address: "Location Finalizing...", 
    status: "SETUP",
    color: "bg-orange-500" 
  },
  { 
    id: "RK03", 
    name: "Connaught Place", 
    address: "Planning Phase", 
    status: "PLANNED",
    color: "bg-slate-400" 
  }
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Background Design */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-orange-500/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-orange-600/10 rounded-full blur-3xl"></div>

      <div className="relative z-10 w-full max-w-4xl text-center mb-12">
        <div className="inline-flex items-center justify-center p-4 bg-slate-800 rounded-3xl mb-6 shadow-2xl border border-slate-700">
          <Store size={48} className="text-orange-500 mr-4" />
          <h1 className="text-5xl font-black text-white tracking-tight uppercase">RamKesar</h1>
        </div>
        <p className="text-slate-400 text-lg font-medium tracking-wide">
          Select your outlet to access the Zapped POS Terminal
        </p>
      </div>

      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {BRANCHES.map((branch) => (
          <div key={branch.id} className="relative group">
            {/* Active branch ke liye hover effect aur link */}
            {branch.status === "ACTIVE" ? (
              <Link href={`/pos/${branch.id}`}>
                <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700 hover:border-orange-500 hover:shadow-[0_0_30px_rgba(249,115,22,0.2)] transition-all duration-300 h-full flex flex-col active:scale-95 cursor-pointer">
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-slate-700 p-3 rounded-2xl">
                      <Store className="text-orange-400" size={24} />
                    </div>
                    <span className="flex items-center text-[10px] font-black uppercase tracking-wider bg-green-500/10 text-green-400 px-3 py-1 rounded-full border border-green-500/20">
                      <Activity size={12} className="mr-1" /> {branch.status}
                    </span>
                  </div>
                  
                  <h2 className="text-2xl font-bold text-white mb-2">{branch.name}</h2>
                  <p className="text-slate-400 text-sm flex items-start flex-1">
                    <MapPin size={16} className="mr-1 mt-0.5 shrink-0 opacity-50" /> 
                    {branch.address}
                  </p>
                  
                  <div className="mt-6 pt-4 border-t border-slate-700 flex justify-between items-center text-orange-500 font-bold group-hover:text-orange-400">
                    <span>Open Terminal</span>
                    <ArrowRight size={20} className="transform group-hover:translate-x-2 transition-transform" />
                  </div>
                </div>
              </Link>
            ) : (
              // Inactive/Planned branches ke liye locked design
              <div className="bg-slate-800/50 rounded-3xl p-6 border border-slate-700/50 h-full flex flex-col opacity-70 grayscale-[50%]">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-slate-700/50 p-3 rounded-2xl">
                    <Store className="text-slate-400" size={24} />
                  </div>
                  <span className={`flex items-center text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${
                    branch.status === 'SETUP' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                  }`}>
                    <Clock size={12} className="mr-1" /> {branch.status}
                  </span>
                </div>
                
                <h2 className="text-2xl font-bold text-slate-300 mb-2">{branch.name}</h2>
                <p className="text-slate-500 text-sm flex items-start flex-1">
                  <MapPin size={16} className="mr-1 mt-0.5 shrink-0 opacity-50" /> 
                  {branch.address}
                </p>
                
                <div className="mt-6 pt-4 border-t border-slate-700/50 flex justify-between items-center text-slate-500 font-bold">
                  <span>Terminal Locked</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="relative z-10 mt-16 text-slate-500 text-sm font-medium">
        Powered by <strong className="text-orange-500">Zapped POS</strong> • System Online
      </div>
    </div>
  );
}
