"use client";
import { useState, useEffect } from "react";
import { CreditCard, Plus, Loader2, Zap, Check, X, Building2, Store, Users, IndianRupee, Power, Edit3, Trash2, ShieldAlert, HardDrive, ListOrdered, CalendarDays, SortAsc } from "lucide-react";

const INITIAL_FORM_STATE = {
  name: "", price: "", billingCycle: "MONTHLY", 
  maxOutlets: "1", maxUsers: "3", maxMenuItems: "50", maxStorageGb: "1", 
  trialDays: "14", sortOrder: "0", 
  featuresRaw: "Core POS System\nBasic Reporting\nEmail Support"
};

export default function SubscriptionPlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals & States
  const [showFormModal, setShowFormModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);

  // Security Modal State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [pendingAction, setPendingAction] = useState<{type: 'EDIT' | 'DELETE', data?: any} | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/super-admin/subscriptions");
      const data = await res.json();
      if (data.success) setPlans(data.plans);
    } catch (e) {
      console.error("Failed to load plans");
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setFormData(INITIAL_FORM_STATE);
    setEditingId(null);
    setShowFormModal(true);
  };

  const openEditModal = (plan: any) => {
    const featureString = typeof plan.features === 'string' 
      ? JSON.parse(plan.features).join("\n") 
      : (plan.features || []).join("\n");
      
    setFormData({
      name: plan.name, price: plan.price.toString(), billingCycle: plan.billingCycle,
      maxOutlets: plan.maxOutlets.toString(), maxUsers: plan.maxUsers.toString(),
      maxMenuItems: plan.maxMenuItems.toString(), maxStorageGb: plan.maxStorageGb.toString(),
      trialDays: plan.trialDays.toString(), sortOrder: plan.sortOrder.toString(),
      featuresRaw: featureString
    });
    setEditingId(plan.id);
    setShowFormModal(true);
  };

  const initiateSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setPendingAction({ type: 'EDIT' });
      setShowAuthModal(true); // Ask for password on edit
    } else {
      executeCreatePlan(); // No password needed for creation
    }
  };

  const initiateDelete = (id: string) => {
    setPendingAction({ type: 'DELETE', data: { id } });
    setShowAuthModal(true);
  };

  const executeCreatePlan = async () => {
    setIsSaving(true);
    const featureArray = formData.featuresRaw.split("\n").filter(f => f.trim() !== "");
    
    try {
      const res = await fetch("/api/super-admin/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, features: JSON.stringify(featureArray) })
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ Pricing Plan "${formData.name}" successfully launched!`);
        setShowFormModal(false);
        fetchPlans();
      } else alert(`⚠️ Error: ${data.error}`);
    } catch (e) { alert("Network Error."); } finally { setIsSaving(false); }
  };

  const executeAuthAction = async () => {
    if (!adminPassword) return alert("Admin password required!");
    setAuthLoading(true);

    try {
      if (pendingAction?.type === 'EDIT' && editingId) {
        const featureArray = formData.featuresRaw.split("\n").filter(f => f.trim() !== "");
        const res = await fetch("/api/super-admin/subscriptions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            id: editingId, updateType: 'FULL_EDIT', adminPassword, 
            ...formData, features: JSON.stringify(featureArray) 
          })
        });
        const data = await res.json();
        if (data.success) {
          setShowAuthModal(false); setShowFormModal(false);
          setAdminPassword(""); fetchPlans();
          alert("✅ Plan updated successfully!");
        } else alert(`⚠️ Error: ${data.error}`);
      } 
      
      else if (pendingAction?.type === 'DELETE') {
        const res = await fetch("/api/super-admin/subscriptions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: pendingAction.data.id, adminPassword })
        });
        const data = await res.json();
        if (data.success) {
          setShowAuthModal(false); setAdminPassword(""); fetchPlans();
          alert("🗑️ Plan deleted successfully!");
        } else alert(`⚠️ Error: ${data.error}`);
      }
    } catch (e) {
      alert("Action failed due to network error.");
    } finally {
      setAuthLoading(false);
    }
  };

  const togglePlanStatus = async (id: string, currentStatus: boolean) => {
    if (!confirm(`Switch plan to ${currentStatus ? 'Inactive' : 'Active'}?`)) return;
    try {
      const res = await fetch("/api/super-admin/subscriptions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !currentStatus }) // No password for simple toggles (optional based on your need)
      });
      const data = await res.json();
      if (data.success) {
        setPlans(plans.map(p => p.id === id ? { ...p, isActive: !currentStatus } : p));
      } else alert("Update failed");
    } catch (e) { alert("Network error"); }
  };

  return (
    <div className="max-w-[1400px] mx-auto h-full flex flex-col animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 shrink-0 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
            <Zap className="mr-2 text-indigo-600" /> SaaS Subscription Engine
          </h1>
          <p className="text-xs text-slate-500 font-bold mt-1 tracking-wide">Manage tiers, tenant limits, billing cycles & premium features.</p>
        </div>
        <button onClick={openCreateModal} className="bg-slate-900 hover:bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center shadow-lg active:scale-95 transition-all whitespace-nowrap">
          <Plus size={16} className="mr-2" /> Launch New Tier
        </button>
      </div>

      {/* Pricing Cards Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
        {loading ? (
          <div className="h-full flex justify-center items-center"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>
        ) : plans.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 bg-white border border-slate-200 rounded-3xl border-dashed">
            <CreditCard size={40} className="mb-4 opacity-30" />
            <p className="font-black uppercase tracking-widest text-slate-500">No Pricing Plans Yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {plans.map((plan) => {
              const features = typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features || [];
              const isPopular = plan.sortOrder === 1; // Example logic for popular styling

              return (
                <div key={plan.id} className={`bg-white rounded-3xl border-2 flex flex-col relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${plan.isActive ? (isPopular ? 'border-indigo-500 shadow-indigo-100' : 'border-slate-100 hover:border-slate-300') : 'border-slate-200 opacity-60 grayscale-[30%]'}`}>
                  
                  {isPopular && <div className="bg-indigo-500 text-white text-[9px] font-black uppercase tracking-widest text-center py-1.5 w-full absolute top-0">Most Popular Choice</div>}
                  {!plan.isActive && <div className="absolute top-4 right-[-30px] rotate-45 bg-slate-800 text-white text-[9px] font-black uppercase tracking-widest py-1 px-10 z-10 shadow-lg">Inactive</div>}

                  <div className={`p-6 border-b border-slate-100 ${isPopular ? 'mt-4 bg-indigo-50/30' : 'bg-slate-50/50'}`}>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">{plan.name}</h3>
                    <div className="flex items-end mb-4">
                      <span className="text-4xl font-black text-slate-900">₹{plan.price}</span>
                      <span className="text-xs font-bold text-slate-500 mb-1.5 ml-1 uppercase">/ {plan.billingCycle}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div className="bg-white border border-slate-100 rounded-lg p-2.5 flex items-center shadow-sm">
                        <Store size={14} className="text-blue-500 mr-2 shrink-0"/>
                        <p className="text-[10px] font-black text-slate-700 uppercase">{plan.maxOutlets} Outlets</p>
                      </div>
                      <div className="bg-white border border-slate-100 rounded-lg p-2.5 flex items-center shadow-sm">
                        <Users size={14} className="text-emerald-500 mr-2 shrink-0"/>
                        <p className="text-[10px] font-black text-slate-700 uppercase">{plan.maxUsers} Users</p>
                      </div>
                      <div className="bg-white border border-slate-100 rounded-lg p-2.5 flex items-center shadow-sm">
                        <ListOrdered size={14} className="text-orange-500 mr-2 shrink-0"/>
                        <p className="text-[10px] font-black text-slate-700 uppercase">{plan.maxMenuItems} Menu</p>
                      </div>
                      <div className="bg-white border border-slate-100 rounded-lg p-2.5 flex items-center shadow-sm">
                        <HardDrive size={14} className="text-purple-500 mr-2 shrink-0"/>
                        <p className="text-[10px] font-black text-slate-700 uppercase">{plan.maxStorageGb}GB Drive</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 flex-1 flex flex-col bg-white">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Plan Features included</p>
                    <ul className="space-y-3 flex-1 mb-6">
                      {features.map((feature: string, idx: number) => (
                        <li key={idx} className="flex items-start text-xs font-bold text-slate-600">
                          <Check size={14} className="mr-2 text-indigo-500 shrink-0 mt-0.5"/> <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Admin Actions */}
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-auto">
                      <div className="flex items-center text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1.5 rounded-md border border-indigo-100">
                        <Building2 size={12} className="mr-1.5"/> {plan._count?.tenants || 0} Tenants
                      </div>
                      
                      <div className="flex gap-1.5">
                        <button onClick={() => togglePlanStatus(plan.id, plan.isActive)} className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors" title="Toggle Status">
                          <Power size={14} className={plan.isActive ? "text-emerald-500" : "text-slate-400"}/>
                        </button>
                        <button onClick={() => openEditModal(plan)} className="p-2 rounded-lg bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 transition-colors" title="Edit Plan">
                          <Edit3 size={14} />
                        </button>
                        <button onClick={() => initiateDelete(plan.id)} className="p-2 rounded-lg bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors" title="Delete Plan">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- ADD/EDIT PLAN MODAL --- */}
      {showFormModal && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border border-slate-200">
            
            <div className="flex justify-between items-center p-6 bg-slate-50 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center">
                  {editingId ? <Edit3 size={20} className="mr-2 text-indigo-600"/> : <Zap size={20} className="mr-2 text-indigo-600"/>} 
                  {editingId ? "Edit Subscription Tier" : "Create Pricing Tier"}
                </h2>
                <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest">Configure hardware, software & billing limits</p>
              </div>
              <button onClick={() => setShowFormModal(false)} className="text-slate-400 hover:bg-slate-200 p-2 rounded-full transition-colors"><X size={20}/></button>
            </div>

            <form onSubmit={initiateSave} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 bg-white">
              
              {/* Section 1: Basic & Billing */}
              <div>
                <h3 className="text-[11px] font-black uppercase tracking-widest text-indigo-600 mb-4 border-b border-indigo-100 pb-2">1. Core Information & Billing</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Plan Name</label>
                    <input required type="text" placeholder="e.g. Enterprise Plus" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-sm font-bold uppercase focus:border-indigo-500 bg-slate-50 focus:bg-white transition-colors" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest flex items-center"><SortAsc size={12} className="mr-1"/> Sort Order</label>
                    <input required type="number" min="0" value={formData.sortOrder} onChange={(e) => setFormData({...formData, sortOrder: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-sm font-bold focus:border-indigo-500 bg-slate-50 focus:bg-white transition-colors" title="Lower number shows first" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest flex items-center"><IndianRupee size={12} className="mr-1"/> Amount (₹)</label>
                    <input required type="number" min="0" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-lg font-mono font-black focus:border-indigo-500 text-indigo-600 bg-indigo-50/30 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Billing Cycle</label>
                    <select value={formData.billingCycle} onChange={(e) => setFormData({...formData, billingCycle: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-sm font-bold uppercase focus:border-indigo-500 bg-slate-50 focus:bg-white transition-colors h-[52px]">
                      <option value="MONTHLY">Monthly</option>
                      <option value="QUARTERLY">Quarterly</option>
                      <option value="YEARLY">Yearly</option>
                      <option value="ONE_TIME">Lifetime (One-Time)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest flex items-center"><CalendarDays size={12} className="mr-1"/> Free Trial Days</label>
                    <input required type="number" min="0" value={formData.trialDays} onChange={(e) => setFormData({...formData, trialDays: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-sm font-bold focus:border-indigo-500 bg-slate-50 focus:bg-white transition-colors h-[52px]" />
                  </div>
                </div>
              </div>

              {/* Section 2: Resource Limits */}
              <div>
                <h3 className="text-[11px] font-black uppercase tracking-widest text-indigo-600 mb-4 border-b border-indigo-100 pb-2">2. Resource Allocations (Limits)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-700 mb-1.5 tracking-widest flex items-center"><Store size={12} className="mr-1 text-blue-500"/> Max Outlets</label>
                    <input required type="number" min="1" value={formData.maxOutlets} onChange={(e) => setFormData({...formData, maxOutlets: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-lg outline-none text-sm font-black focus:border-indigo-500 bg-white" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-700 mb-1.5 tracking-widest flex items-center"><Users size={12} className="mr-1 text-emerald-500"/> Max Staff</label>
                    <input required type="number" min="1" value={formData.maxUsers} onChange={(e) => setFormData({...formData, maxUsers: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-lg outline-none text-sm font-black focus:border-indigo-500 bg-white" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-700 mb-1.5 tracking-widest flex items-center"><ListOrdered size={12} className="mr-1 text-orange-500"/> Menu Items</label>
                    <input required type="number" min="1" value={formData.maxMenuItems} onChange={(e) => setFormData({...formData, maxMenuItems: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-lg outline-none text-sm font-black focus:border-indigo-500 bg-white" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-700 mb-1.5 tracking-widest flex items-center"><HardDrive size={12} className="mr-1 text-purple-500"/> Storage (GB)</label>
                    <input required type="number" min="1" value={formData.maxStorageGb} onChange={(e) => setFormData({...formData, maxStorageGb: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-lg outline-none text-sm font-black focus:border-indigo-500 bg-white" />
                  </div>
                </div>
              </div>

              {/* Section 3: Features */}
              <div>
                <h3 className="text-[11px] font-black uppercase tracking-widest text-indigo-600 mb-4 border-b border-indigo-100 pb-2">3. Display Features</h3>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Included Features (One per line)</label>
                <textarea required rows={5} placeholder="Cloud POS&#10;Inventory Management&#10;WhatsApp API" value={formData.featuresRaw} onChange={(e) => setFormData({...formData, featuresRaw: e.target.value})} className="w-full p-4 border-2 border-slate-100 rounded-xl outline-none text-xs font-bold leading-relaxed focus:border-indigo-500 bg-slate-50 focus:bg-white transition-colors resize-none" />
              </div>

              <div className="pt-4 border-t border-slate-100 shrink-0">
                <button disabled={isSaving} type="submit" className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-black uppercase tracking-widest py-4 rounded-xl text-xs shadow-xl active:scale-95 transition-all flex justify-center items-center">
                  {isSaving ? <Loader2 className="animate-spin" size={18}/> : (editingId ? "Save Changes (Requires Auth)" : "Publish Subscription Plan")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADMIN AUTH MODAL (For Security) --- */}
      {showAuthModal && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl border-t-8 border-red-500 relative text-center">
            <ShieldAlert size={48} className="text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Admin Authorization</h2>
            <p className="text-xs font-bold text-slate-500 mb-6">Enter super-admin password to confirm {pendingAction?.type === 'DELETE' ? 'deletion' : 'modifications'}.</p>
            
            <input 
              type="password" autoFocus placeholder="Enter Master Password"
              value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} 
              className="w-full p-3 border-2 border-slate-200 rounded-xl outline-none text-center text-lg font-black focus:border-red-500 mb-4 bg-slate-50 focus:bg-white" 
            />
            
            <div className="flex gap-3">
              <button onClick={() => {setShowAuthModal(false); setAdminPassword("");}} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black uppercase tracking-widest py-3 rounded-xl text-[10px] transition-all">Cancel</button>
              <button onClick={executeAuthAction} disabled={authLoading} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-black uppercase tracking-widest py-3 rounded-xl text-[10px] shadow-lg shadow-red-500/30 transition-all flex justify-center items-center">
                {authLoading ? <Loader2 className="animate-spin" size={14}/> : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
