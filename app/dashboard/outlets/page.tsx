"use client";
import { useState, useEffect } from "react";
import { MapPin, Map, Plus, Store, Loader2, X, ShieldCheck, CheckCircle2, AlertTriangle, Building2, Key, HelpCircle } from "lucide-react";

export default function OutletsAndRegionsPage() {
  const [data, setData] = useState<{ regions: any[], unassignedOutlets: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOutletModal, setShowOutletModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [newOutletId, setNewOutletId] = useState("");

  const [outletForm, setOutletForm] = useState({ name: "", address: "", email: "", password: "", regionId: "NONE", utrNumber: "" });

  useEffect(() => { fetchNetworkData(); }, []);

  const fetchNetworkData = async () => {
    setLoading(true);
    const res = await fetch("/api/brand/outlets");
    const json = await res.json();
    if (json.success) setData(json);
    setLoading(false);
  };

  const handleCreateOutlet = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const res = await fetch("/api/brand/outlets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionType: "CREATE_OUTLET", ...outletForm })
    });
    const json = await res.json();
    if (res.ok) {
      setNewOutletId(json.outlet.id.slice(-7).toUpperCase());
      setIsSuccess(true);
      fetchNetworkData();
    }
    setIsSaving(false);
  };

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" size={40}/></div>;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase">Network Architecture</h1>
          <p className="text-xs font-bold text-slate-500">Manage operational zones and physical store locations.</p>
        </div>
        <button onClick={() => setShowOutletModal(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase shadow-lg">Launch Branch</button>
      </div>

      {/* Grid of Regions/Outlets */}
      <div className="space-y-6">
        {data?.regions.map(region => (
          <div key={region.id} className="bg-white p-6 rounded-3xl border border-slate-200">
            <h3 className="font-black uppercase text-slate-900 mb-4 flex items-center"><Map className="mr-2 text-indigo-500"/> {region.name}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {region.outlets.map((o: any) => (
                <div key={o.id} className={`p-4 rounded-2xl border ${o.isActive ? 'border-indigo-200 bg-indigo-50/20' : 'border-red-200 bg-red-50/20'}`}>
                  <div className="flex justify-between items-start">
                    <p className="font-black text-sm uppercase">{o.name}</p>
                    <span className={`text-[9px] font-black px-2 py-1 rounded ${o.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {o.isActive ? "ACTIVE" : "PENDING APPROVAL"}
                    </span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 mt-2">{o.address}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 🟢 LAUNCH MODAL */}
      {showOutletModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl">
            {isSuccess ? (
              <div className="text-center py-6">
                <CheckCircle2 className="mx-auto text-emerald-500 mb-4" size={64}/>
                <h2 className="text-2xl font-black uppercase">Success!</h2>
                <p className="text-sm font-bold text-slate-600 my-4">Branch Deployed with ID: <span className="font-mono text-indigo-600">{newOutletId}</span></p>
                <div className="bg-slate-900 text-white p-4 rounded-xl text-xs font-black mb-6">Need setup help? Call: 9990-969-838</div>
                <button onClick={() => {setIsSuccess(false); setShowOutletModal(false);}} className="w-full bg-slate-900 text-white py-3 rounded-xl font-black uppercase">Close</button>
              </div>
            ) : (
              <form onSubmit={handleCreateOutlet} className="space-y-4">
                <h2 className="text-xl font-black uppercase mb-4">Launch New Branch</h2>
                <input required placeholder="Branch Name" value={outletForm.name} onChange={e=>setOutletForm({...outletForm, name:e.target.value})} className="w-full p-3 border rounded-xl text-sm font-bold" />
                <input required placeholder="Address" value={outletForm.address} onChange={e=>setOutletForm({...outletForm, address:e.target.value})} className="w-full p-3 border rounded-xl text-sm font-bold" />
                <input required placeholder="Email" value={outletForm.email} onChange={e=>setOutletForm({...outletForm, email:e.target.value})} className="w-full p-3 border rounded-xl text-sm font-bold" />
                <input required placeholder="POS Password" value={outletForm.password} onChange={e=>setOutletForm({...outletForm, password:e.target.value})} className="w-full p-3 border rounded-xl text-sm font-bold" />
                <input required placeholder="UTR / Payment ID" value={outletForm.utrNumber} onChange={e=>setOutletForm({...outletForm, utrNumber:e.target.value})} className="w-full p-3 border border-emerald-300 rounded-xl text-sm font-bold" />
                <button disabled={isSaving} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black uppercase">Launch Branch</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
