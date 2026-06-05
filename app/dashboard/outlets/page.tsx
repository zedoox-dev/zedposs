"use client";
import { useState, useEffect } from "react";
import { 
  MapPin, Map, Plus, Store, Loader2, Users, 
  Settings, Building2, AlertTriangle, X, Mail, Key 
} from "lucide-react";

export default function OutletsAndRegionsPage() {
  const [data, setData] = useState<{ regions: any[], unassignedOutlets: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [showOutletModal, setShowOutletModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Forms
  const [regionName, setRegionName] = useState("");
  const [outletForm, setOutletForm] = useState({
    name: "", address: "", email: "", password: "", regionId: "NONE"
  });

  useEffect(() => {
    fetchNetworkData();
  }, []);

  const fetchNetworkData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/brand/outlets");
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (e) {
      console.error("Network Sync Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRegion = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/brand/outlets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType: "CREATE_REGION", name: regionName })
      });
      if (res.ok) {
        setShowRegionModal(false);
        setRegionName("");
        fetchNetworkData();
        // Option: Hum OutletContext ko bhi refresh trigger kar sakte hain
      }
    } catch (e) {
      alert("Failed to create Region");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateOutlet = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/brand/outlets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType: "CREATE_OUTLET", ...outletForm })
      });
      if (res.ok) {
        setShowOutletModal(false);
        setOutletForm({ name: "", address: "", email: "", password: "", regionId: "NONE" });
        fetchNetworkData();
        alert("✅ Branch Launched Successfully! Refresh the page to update the top switcher.");
      }
    } catch (e) {
      alert("Failed to create Outlet");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Mapping Enterprise Network...</p>
      </div>
    );
  }

  const totalOutlets = data.regions.reduce((acc, r) => acc + r.outlets.length, 0) + data.unassignedOutlets.length;

  return (
    <div className="max-w-[1400px] mx-auto animate-in fade-in duration-300 h-full flex flex-col pb-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
            <Building2 className="mr-2 text-indigo-600" /> Network Architecture
          </h1>
          <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">
            Manage operational zones and physical store locations.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={() => setShowRegionModal(true)} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-sm transition-all active:scale-95">
            <Map className="mr-2" size={14} /> Add Region
          </button>
          <button onClick={() => setShowOutletModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-sm shadow-indigo-500/30 transition-all active:scale-95">
            <Plus className="mr-1.5" size={16} /> Launch Branch
          </button>
        </div>
      </div>

      {/* Network Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8 shrink-0">
        <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Total Active Outlets</span>
            <p className="text-3xl font-mono font-black text-indigo-700 mt-1">{totalOutlets}</p>
          </div>
          <Store size={32} className="text-indigo-200" />
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Defined Regions</span>
            <p className="text-3xl font-mono font-black text-slate-800 mt-1">{data.regions.length}</p>
          </div>
          <Map size={32} className="text-slate-200" />
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Standalone Branches</span>
            <p className="text-3xl font-mono font-black text-slate-800 mt-1">{data.unassignedOutlets.length}</p>
          </div>
          <AlertTriangle size={32} className="text-slate-200" />
        </div>
      </div>

      {/* Regions & Outlets Mapping */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6">
        
        {/* Regions Mapping */}
        {data.regions.map((region) => (
          <div key={region.id} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-black text-slate-800 uppercase tracking-tight flex items-center">
                <Map className="mr-2 text-indigo-500" size={16}/> {region.name}
              </h3>
              <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded uppercase tracking-widest border border-indigo-100">
                {region.outlets.length} Branches
              </span>
            </div>
            
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {region.outlets.length === 0 ? (
                <p className="text-xs font-bold text-slate-400 p-4 border-2 border-dashed border-slate-100 rounded-xl text-center col-span-full">No branches assigned to this region yet.</p>
              ) : (
                region.outlets.map((outlet: any) => (
                  <div key={outlet.id} className="p-4 border border-slate-200 rounded-2xl hover:border-indigo-300 transition-colors group relative">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-3">
                      <Store size={18} />
                    </div>
                    <h4 className="font-black text-sm text-slate-900 uppercase">{outlet.name}</h4>
                    <p className="text-[10px] font-bold text-slate-500 mt-1 truncate flex items-center">
                      <MapPin size={10} className="mr-1"/> {outlet.address}
                    </p>
                    
                    <button className="absolute top-4 right-4 text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Settings size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}

        {/* Unassigned / Standalone Outlets */}
        {data.unassignedOutlets.length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm border-t-4 border-t-amber-400">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-black text-slate-800 uppercase tracking-tight flex items-center">
                <AlertTriangle className="mr-2 text-amber-500" size={16}/> Standalone Branches
              </h3>
              <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-1 rounded uppercase tracking-widest border border-amber-200">
                {data.unassignedOutlets.length} Unmapped
              </span>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.unassignedOutlets.map((outlet: any) => (
                <div key={outlet.id} className="p-4 border border-slate-200 rounded-2xl hover:border-amber-300 transition-colors group relative">
                  <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-3">
                    <Store size={18} />
                  </div>
                  <h4 className="font-black text-sm text-slate-900 uppercase">{outlet.name}</h4>
                  <p className="text-[10px] font-bold text-slate-500 mt-1 truncate flex items-center">
                    <MapPin size={10} className="mr-1"/> {outlet.address}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* --- ADD REGION MODAL --- */}
      {showRegionModal && (
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl relative overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center"><Map size={18} className="mr-2 text-indigo-600"/> New Region</h2>
              <button onClick={() => setShowRegionModal(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full"><X size={18}/></button>
            </div>
            <form onSubmit={handleCreateRegion}>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-2">Zone / Area Name</label>
              <input required type="text" placeholder="e.g. South Delhi" value={regionName} onChange={(e) => setRegionName(e.target.value)} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-sm font-bold uppercase focus:border-indigo-500 bg-slate-50 mb-6" />
              <button disabled={isSaving} type="submit" className="w-full bg-slate-900 text-white font-black uppercase tracking-widest py-3 rounded-xl text-xs flex justify-center items-center">
                {isSaving ? <Loader2 className="animate-spin" size={16}/> : "Create Zone"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- LAUNCH OUTLET MODAL --- */}
      {showOutletModal && (
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border-t-8 border-indigo-600 relative overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4 shrink-0">
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center"><Store size={18} className="mr-2 text-indigo-600"/> Launch New Branch</h2>
              <button onClick={() => setShowOutletModal(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full"><X size={18}/></button>
            </div>
            
            <form onSubmit={handleCreateOutlet} className="space-y-4 overflow-y-auto custom-scrollbar pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Branch Name</label>
                  <input required type="text" placeholder="e.g. Lajpat Nagar 1" value={outletForm.name} onChange={(e) => setOutletForm({...outletForm, name: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-bold uppercase focus:border-indigo-500 bg-slate-50" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Assign to Region</label>
                  <select value={outletForm.regionId} onChange={(e) => setOutletForm({...outletForm, regionId: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-bold uppercase focus:border-indigo-500 bg-slate-50">
                    <option value="NONE">Standalone (Unassigned)</option>
                    {data.regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Full Address</label>
                <input required type="text" placeholder="Plot No, Street, City" value={outletForm.address} onChange={(e) => setOutletForm({...outletForm, address: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-bold focus:border-indigo-500 bg-slate-50" />
              </div>

              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 space-y-3 mt-4">
                <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest mb-2 flex items-center"><Key size={12} className="mr-1"/> Branch Admin Login</p>
                <div>
                  <input type="email" placeholder="Branch Email (Optional)" value={outletForm.email} onChange={(e) => setOutletForm({...outletForm, email: e.target.value})} className="w-full p-3 border border-white rounded-lg outline-none text-xs font-mono font-bold focus:border-indigo-400" />
                </div>
                <div>
                  <input type="text" placeholder="Branch POS Password" value={outletForm.password} onChange={(e) => setOutletForm({...outletForm, password: e.target.value})} className="w-full p-3 border border-white rounded-lg outline-none text-xs font-mono font-black tracking-widest focus:border-indigo-400" />
                </div>
              </div>

              <div className="pt-4 mt-2 border-t border-slate-100 shrink-0">
                <button disabled={isSaving} type="submit" className="w-full bg-indigo-600 text-white font-black uppercase tracking-widest py-3.5 rounded-xl text-xs flex justify-center items-center shadow-lg active:scale-95 transition-all">
                  {isSaving ? <Loader2 className="animate-spin" size={16}/> : "Deploy Store to Network"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
