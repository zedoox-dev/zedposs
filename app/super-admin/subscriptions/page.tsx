"use client";
import { useState, useEffect } from "react";
import { CreditCard, Plus, Loader2, Zap, Check, X, Building2, Store, Users, IndianRupee, Power, ShieldCheck } from "lucide-react";

export default function SubscriptionPlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    billingCycle: "MONTHLY",
    maxOutlets: "1",
    maxUsers: "3",
    featuresRaw: "Core POS System\nBasic Reporting\nEmail Support" // Textarea format
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/super-admin/subscriptions");
      const data = await res.json();
      if (data.success) {
        setPlans(data.plans);
      }
    } catch (e) {
      console.error("Failed to load plans");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    // Convert textarea lines into a JSON stringified array
    const featureArray = formData.featuresRaw.split("\n").filter(f => f.trim() !== "");
    
    try {
      const res = await fetch("/api/super-admin/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          features: JSON.stringify(featureArray)
        })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        alert(`✅ Pricing Plan "${formData.name}" successfully launched!`);
        setShowAddModal(false);
        setFormData({ name: "", price: "", billingCycle: "MONTHLY", maxOutlets: "1", maxUsers: "3", featuresRaw: "" });
        fetchPlans();
      } else {
        alert(`⚠️ Error: ${data.error}`);
      }
    } catch (e) {
      alert("Network Error.");
    } finally {
      setIsSaving(false);
    }
  };

  const togglePlanStatus = async (id: string, currentStatus: boolean, name: string) => {
    if (!confirm(`Are you sure you want to ${currentStatus ? 'Deactivate' : 'Activate'} the ${name} plan?`)) return;

    try {
      const res = await fetch("/api/super-admin/subscriptions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !currentStatus })
      });
      if (res.ok) {
        setPlans(plans.map(p => p.id === id ? { ...p, isActive: !currentStatus } : p));
      }
    } catch (e) {
      alert("Failed to update status");
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto h-full flex flex-col animate-in fade-in duration-300">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
            <Zap className="mr-2 text-indigo-600" /> SaaS Pricing & Plans
          </h1>
          <p className="text-xs text-slate-500 font-bold mt-1 tracking-wide">Configure subscription tiers, limits, and pricing for your clients.</p>
        </div>
        
        <button onClick={() => setShowAddModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center shadow-lg shadow-indigo-500/30 active:scale-95 transition-all whitespace-nowrap">
          <Plus size={16} className="mr-1.5" /> Create New Plan
        </button>
      </div>

      {/* Pricing Cards Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
        {loading ? (
          <div className="h-full flex justify-center items-center"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>
        ) : plans.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-white border border-slate-200 rounded-2xl">
            <CreditCard size={60} className="mb-4 opacity-20" />
            <p className="font-black text-lg uppercase tracking-widest">No Pricing Plans Found</p>
            <p className="text-xs font-bold mt-1">Create your first plan to start onboarding clients.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {plans.map((plan) => {
              const features = typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features || [];
              const activeTenants = plan._count?.tenants || 0;

              return (
                <div key={plan.id} className={`bg-white rounded-3xl border-2 flex flex-col relative overflow-hidden transition-all duration-300 shadow-sm hover:shadow-xl ${plan.isActive ? 'border-slate-200 hover:border-indigo-400' : 'border-slate-200 opacity-70'}`}>
                  
                  {/* Status Ribbon */}
                  {!plan.isActive && (
                    <div className="absolute top-4 right-[-30px] rotate-45 bg-slate-200 text-slate-500 text-[9px] font-black uppercase tracking-widest py-1 px-10">
                      Inactive
                    </div>
                  )}

                  <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">{plan.name}</h3>
                    <div className="flex items-end mb-4">
                      <span className="text-3xl font-black text-slate-900">₹{plan.price}</span>
                      <span className="text-xs font-bold text-slate-500 mb-1 ml-1 uppercase">/ {plan.billingCycle}</span>
                    </div>

                    <div className="flex gap-2 mb-4">
                      <div className="flex-1 bg-white border border-slate-200 rounded-lg p-2 text-center">
                        <Store size={14} className="mx-auto text-blue-500 mb-1"/>
                        <p className="text-[10px] font-black text-slate-800 uppercase">{plan.maxOutlets} Outlets</p>
                      </div>
                      <div className="flex-1 bg-white border border-slate-200 rounded-lg p-2 text-center">
                        <Users size={14} className="mx-auto text-indigo-500 mb-1"/>
                        <p className="text-[10px] font-black text-slate-800 uppercase">{plan.maxUsers} Users</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 flex-1 flex flex-col">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Plan Features</p>
                    <ul className="space-y-3 flex-1 mb-6">
                      {features.map((feature: string, idx: number) => (
                        <li key={idx} className="flex items-start text-xs font-bold text-slate-600">
                          <Check size={14} className="mr-2 text-emerald-500 shrink-0 mt-0.5"/> 
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-auto">
                      <div className="flex items-center text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-2.5 py-1 rounded-md">
                        <Building2 size={12} className="mr-1.5"/> {activeTenants} Subscribed
                      </div>
                      
                      <button 
                        onClick={() => togglePlanStatus(plan.id, plan.isActive, plan.name)}
                        className={`p-2 rounded-lg transition-colors border ${plan.isActive ? 'bg-red-50 hover:bg-red-100 border-red-200 text-red-600' : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-600'}`}
                        title={plan.isActive ? "Deactivate Plan" : "Activate Plan"}
                      >
                        <Power size={16} />
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- ADD PLAN MODAL --- */}
      {showAddModal && (
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border-t-8 border-indigo-600 relative overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4 shrink-0">
              <div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center"><Zap size={20} className="mr-2 text-indigo-600"/> Launch Pricing Tier</h2>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Define limits, pricing, and features</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full transition-colors"><X size={20}/></button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Plan Name</label>
                  <input required type="text" placeholder="e.g. Professional" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-sm font-bold uppercase focus:border-indigo-500 bg-slate-50 focus:bg-white transition-colors" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Billing Cycle</label>
                  <select value={formData.billingCycle} onChange={(e) => setFormData({...formData, billingCycle: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-sm font-bold uppercase focus:border-indigo-500 bg-slate-50 focus:bg-white transition-colors">
                    <option value="MONTHLY">Monthly</option>
                    <option value="YEARLY">Yearly (Annual)</option>
                    <option value="ONE_TIME">Lifetime (One-Time)</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest flex items-center"><IndianRupee size={12} className="mr-1"/> Pricing Amount</label>
                <input required type="number" min="0" placeholder="2499" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-lg font-mono font-black focus:border-indigo-500 bg-slate-50 focus:bg-white transition-colors" />
              </div>

              <div className="grid grid-cols-2 gap-4 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                <div>
                  <label className="block text-[10px] font-black uppercase text-indigo-800 mb-1.5 tracking-widest flex items-center"><Store size={12} className="mr-1"/> Max Outlets Allowed</label>
                  <input required type="number" min="1" value={formData.maxOutlets} onChange={(e) => setFormData({...formData, maxOutlets: e.target.value})} className="w-full p-3 border-2 border-white rounded-xl outline-none text-sm font-black focus:border-indigo-500 bg-white transition-colors" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-indigo-800 mb-1.5 tracking-widest flex items-center"><Users size={12} className="mr-1"/> Max Users / Staff</label>
                  <input required type="number" min="1" value={formData.maxUsers} onChange={(e) => setFormData({...formData, maxUsers: e.target.value})} className="w-full p-3 border-2 border-white rounded-xl outline-none text-sm font-black focus:border-indigo-500 bg-white transition-colors" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Included Features (One per line)</label>
                <textarea required rows={5} placeholder="Cloud POS&#10;Inventory Management&#10;WhatsApp API" value={formData.featuresRaw} onChange={(e) => setFormData({...formData, featuresRaw: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-bold leading-relaxed focus:border-indigo-500 bg-slate-50 focus:bg-white transition-colors resize-none" />
              </div>

              <div className="pt-4 border-t border-slate-100 shrink-0 mt-4">
                <button disabled={isSaving} type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest py-4 rounded-xl text-xs shadow-xl active:scale-95 transition-all flex justify-center items-center">
                  {isSaving ? <Loader2 className="animate-spin" size={18}/> : "Publish Subscription Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
