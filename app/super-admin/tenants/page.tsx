"use client";
import { useState, useEffect } from "react";
import { 
  Building2, Plus, Search, Loader2, X, Crown, 
  Store, Users, Globe, ShieldAlert, CheckCircle2, IndianRupee
} from "lucide-react";

export default function SuperAdminTenantsPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal & Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [onboardForm, setOnboardForm] = useState({
    brandName: "",
    ownerName: "",
    ownerEmail: "",
    ownerPassword: "",
    subscriptionPlan: "PRO"
  });

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/super-admin/tenants");
      const json = await res.json();
      if (json.success) setTenants(json.tenants);
    } catch (e) {
      console.error("Failed to fetch SaaS tenants");
    } finally {
      setLoading(false);
    }
  };

  const handleOnboardBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const res = await fetch("/api/super-admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(onboardForm)
      });
      const json = await res.json();
      
      if (res.ok && json.success) {
        setShowAddModal(false);
        setOnboardForm({ brandName: "", ownerName: "", ownerEmail: "", ownerPassword: "", subscriptionPlan: "PRO" });
        fetchTenants();
        alert(`✅ ${json.data.tenant.name} has been successfully onboarded! The owner can now log in.`);
      } else {
        alert("Error: " + json.error);
      }
    } catch (e) {
      alert("Network Error during onboarding");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (t.users[0]?.email || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalOutlets = tenants.reduce((sum, t) => sum + t._count.outlets, 0);

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-white">
        <Loader2 className="animate-spin text-indigo-500 mb-4" size={50} />
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Accessing Master SaaS Database...</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-6 md:p-10">
      <div className="max-w-[1400px] mx-auto animate-in fade-in duration-300 h-full flex flex-col">
        
        {/* Super Admin Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 shrink-0 bg-slate-900 p-6 rounded-3xl shadow-xl border border-slate-800 text-white">
          <div>
            <div className="inline-flex items-center bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 border border-indigo-500/30">
              <ShieldAlert size={12} className="mr-1.5" /> Super Admin Console
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tight flex items-center">
              <Globe className="mr-3 text-indigo-400" size={28}/> SaaS Brand Network
            </h1>
          </div>
          <button onClick={() => setShowAddModal(true)} className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-lg shadow-indigo-500/30 transition-all active:scale-95">
            <Plus className="mr-1.5" size={16} /> Onboard New Client
          </button>
        </div>

        {/* System Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 shrink-0">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Brands Registered</span>
              <p className="text-4xl font-mono font-black text-slate-900 mt-1">{tenants.length}</p>
            </div>
            <Building2 size={40} className="text-slate-100" />
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Live Outlets Worldwide</span>
              <p className="text-4xl font-mono font-black text-indigo-600 mt-1">{totalOutlets}</p>
            </div>
            <Store size={40} className="text-indigo-50" />
          </div>

          <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Active Subscriptions</span>
              <p className="text-4xl font-mono font-black text-emerald-700 mt-1">{tenants.length}</p>
            </div>
            <CheckCircle2 size={40} className="text-emerald-200" />
          </div>
        </div>

        {/* Tenants Table */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" placeholder="Search Brand or Owner Email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 bg-white shadow-sm" 
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead className="bg-white sticky top-0 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400 z-10 shadow-sm">
                <tr>
                  <th className="p-5">Registered Brand</th>
                  <th className="p-5">Owner Credentials</th>
                  <th className="p-5 text-center">Network Size</th>
                  <th className="p-5 text-right">System Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm font-bold text-slate-700">
                {filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-10 text-center">
                      <Building2 size={50} className="mx-auto text-slate-200 mb-4" />
                      <p className="text-xs font-black uppercase tracking-widest text-slate-400">No SaaS Clients Found</p>
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((tenant: any) => (
                    <tr key={tenant.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="p-5">
                        <div className="font-black text-base text-slate-900 uppercase flex items-center">
                          <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center mr-3">
                            <Building2 size={14} />
                          </div>
                          {tenant.name}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest ml-11 font-black">
                          Joined: {new Date(tenant.createdAt).toLocaleDateString('en-GB')}
                        </div>
                      </td>
                      
                      <td className="p-5">
                        <div className="flex items-center text-xs font-black text-slate-800 uppercase">
                          <Crown size={12} className="mr-1.5 text-amber-500"/> {tenant.users[0]?.name || "N/A"}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 mt-1">
                          {tenant.users[0]?.email || "No email"}
                        </div>
                      </td>

                      <td className="p-5 text-center">
                        <div className="flex justify-center gap-2">
                          <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-[10px] uppercase tracking-widest border border-slate-200 font-black flex items-center">
                            <Store size={10} className="mr-1"/> {tenant._count.outlets}
                          </span>
                          <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-[10px] uppercase tracking-widest border border-slate-200 font-black flex items-center">
                            <Users size={10} className="mr-1"/> {tenant._count.users}
                          </span>
                        </div>
                      </td>

                      <td className="p-5 text-right">
                        <span className="inline-flex items-center text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                          <CheckCircle2 size={12} className="mr-1.5"/> Active Server
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- ONBOARD BRAND MODAL --- */}
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] border-t-8 border-indigo-500">
              
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4 shrink-0">
                <div>
                  <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center"><Globe size={20} className="mr-2 text-indigo-600"/> Provision New Tenant</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Create isolated database workspace & owner login.</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full"><X size={20}/></button>
              </div>
              
              <form onSubmit={handleOnboardBrand} className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-6">
                
                {/* Brand Details */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-4 flex items-center"><Building2 size={12} className="mr-1.5"/> 1. Company Information</h3>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Registered Brand Name</label>
                    <input required type="text" placeholder="e.g. RamKesar Foods" value={onboardForm.brandName} onChange={(e) => setOnboardForm({...onboardForm, brandName: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl outline-none text-sm font-black uppercase focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all bg-white" />
                  </div>
                </div>

                {/* Owner Credentials */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-4 flex items-center"><Crown size={12} className="mr-1.5"/> 2. Super Admin Credentials (Brand Owner)</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Owner Name</label>
                      <input required type="text" placeholder="e.g. Upendra Yadav" value={onboardForm.ownerName} onChange={(e) => setOnboardForm({...onboardForm, ownerName: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl outline-none text-xs font-bold uppercase focus:border-indigo-500 bg-white" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Subscription Tier</label>
                      <select value={onboardForm.subscriptionPlan} onChange={(e) => setOnboardForm({...onboardForm, subscriptionPlan: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl outline-none text-xs font-bold uppercase focus:border-indigo-500 bg-white">
                        <option value="PRO">Pro Plan (Unlimited Outlets)</option>
                        <option value="BASIC">Basic Plan (1 Outlet)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Login Email ID</label>
                      <input required type="email" placeholder="admin@ramkesar.co.in" value={onboardForm.ownerEmail} onChange={(e) => setOnboardForm({...onboardForm, ownerEmail: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl outline-none text-xs font-mono font-bold focus:border-indigo-500 bg-white" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Master Password</label>
                      <input required type="text" placeholder="Pass@123" value={onboardForm.ownerPassword} onChange={(e) => setOnboardForm({...onboardForm, ownerPassword: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl outline-none text-xs font-mono font-bold focus:border-indigo-500 bg-white" />
                    </div>
                  </div>
                </div>

                <button disabled={isProcessing} type="submit" className="w-full mt-auto bg-slate-900 text-white font-black uppercase tracking-widest py-4 rounded-xl text-xs flex justify-center items-center shadow-xl active:scale-95 transition-all disabled:opacity-50">
                  {isProcessing ? <Loader2 className="animate-spin" size={16}/> : "Deploy Brand & Send Credentials"}
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
