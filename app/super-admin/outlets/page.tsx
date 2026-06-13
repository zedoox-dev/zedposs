"use client";

import { useState, useEffect } from "react";
import { 
  Store, Plus, Search, MapPin, Mail, 
  Building2, MoreVertical, Loader2, CheckCircle2, XCircle, CreditCard, Calendar, Hash, Crown, Settings, Edit2
} from "lucide-react";

interface Outlet {
  id: string;
  name: string;
  address: string;
  email: string | null;
  password: string | null;
  isActive: boolean;
  generalSettings: any;
  tenant: {
    id: string;
    businessName: string;
    ownerEmail: string;
    plan?: {
      id: string;
      name: string;
      maxOutlets: number;
      price: number;
    } | null;
  };
  createdAt: string;
}

interface Tenant {
  id: string;
  businessName: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  maxOutlets: number;
}

export default function OutletsPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editOutletData, setEditOutletData] = useState<Outlet | null>(null);

  const [formData, setFormData] = useState({
    name: "", address: "", email: "", password: "", tenantId: "", planId: "", phone: "", gst: "", fssai: ""
  });

  const [editFormData, setEditFormData] = useState({
    name: "", address: "", email: "", password: "", phone: "", gst: "", fssai: "", isActive: true
  });

  useEffect(() => {
    fetchInitialData();
    fetchTenants();
  }, []);

  const fetchInitialData = async () => {
    try {
      const res = await fetch("/api/super-admin/outlets");
      const data = await res.json();
      if (data.success) {
        setOutlets(data.outlets);
        setPlans(data.subscriptionPlans || []); 
      }
    } catch (error) {
      console.error("Failed to load outlets");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      const res = await fetch("/api/super-admin/tenants");
      const data = await res.json();
      if (data.success) setTenants(data.tenants);
    } catch (error) {
      console.error("Failed to fetch tenants");
    }
  };

  const handleCreateOutlet = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/super-admin/outlets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      
      if (data.success) {
        setFormData({ name: "", address: "", email: "", password: "", tenantId: "", planId: "", phone: "", gst: "", fssai: "" });
        setIsModalOpen(false);
        fetchInitialData();
        alert(`✅ Outlet deployed with unique 7-Digit ID: ${data.outlet.id}`);
      } else {
        alert("⚠️ Error: " + data.error);
      }
    } catch (error) {
      alert("Network Connection Refused");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateOutlet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editOutletData) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/super-admin/outlets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editOutletData.id, ...editFormData }),
      });
      const data = await res.json();
      if (data.success) {
        setEditOutletData(null);
        fetchInitialData();
        alert("✅ Configuration customized successfully.");
      } else {
        alert("⚠️ Update Denied: " + data.error);
      }
    } catch (error) {
      alert("Network sync timeout error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (outlet: Outlet) => {
    const gs = outlet.generalSettings || {};
    setEditFormData({
      name: outlet.name,
      address: outlet.address,
      email: outlet.email || "",
      password: outlet.password || "",
      phone: gs.phone || "",
      gst: gs.gstNumber || "",
      fssai: gs.fssaiNumber || "",
      isActive: outlet.isActive
    });
    setEditOutletData(outlet);
  };

  const getValidityDetails = (createdAt: string) => {
    const createdDate = new Date(createdAt);
    const validTill = new Date(createdDate.setDate(createdDate.getDate() + 30)); 
    const today = new Date();
    const diffTime = validTill.getTime() - today.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      validTill: validTill.toLocaleDateString('en-GB'),
      daysLeft: daysLeft > 0 ? daysLeft : 0,
      isActive: daysLeft > 0
    };
  };

  const filteredOutlets = outlets.filter(o => 
    o.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    o.id.includes(searchQuery) ||
    o.tenant?.businessName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Mapping Outlet Network...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-300">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center uppercase tracking-tight">
            <Store className="mr-3 text-blue-600" size={28} />
            Global Outlets
          </h1>
          <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">
            Manage physical stores & enforce SaaS plan limits.
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center transition-all shadow-lg shadow-blue-600/20 active:scale-95"
        >
          <Plus size={16} className="mr-2" /> Provision New Outlet
        </button>
      </div>

      {/* Stats/Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex items-center justify-between">
        <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-slate-500">
          <span className="bg-slate-100 px-3 py-1.5 rounded-lg mr-3 border border-slate-200">
            Total Active Outlets: <span className="text-blue-600 ml-1">{outlets.filter(o => o.isActive).length}</span>
          </span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Search Outlet ID, Name or Brand..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-72 pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 transition-all" 
          />
        </div>
      </div>

      {/* Outlets Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-widest font-black text-slate-500">
                <th className="p-4">Outlet Details</th>
                <th className="p-4">Linked Brand (Tenant)</th>
                <th className="p-4">SaaS Subscription</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm font-semibold text-slate-700 divide-y divide-slate-100">
              {filteredOutlets.map((outlet) => {
                const validity = getValidityDetails(outlet.createdAt);
                return (
                  <tr key={outlet.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                          {outlet.id}
                        </span>
                        <p className="font-black text-slate-900 uppercase text-xs">{outlet.name}</p>
                      </div>
                      <div className="space-y-1 mt-1.5">
                        <p className="text-[10px] text-slate-500 flex items-start font-bold">
                          <MapPin size={10} className="mr-1 mt-0.5 shrink-0" /> <span className="line-clamp-1">{outlet.address}</span>
                        </p>
                      </div>
                    </td>
                    
                    <td className="p-4">
                      <div className="flex flex-col items-start">
                        <span className="flex items-center text-[10px] bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-100 font-black uppercase tracking-widest">
                          <Building2 size={12} className="mr-1.5" /> {outlet.tenant?.businessName || "Unknown"}
                        </span>
                        <span className="text-[9px] font-mono font-bold text-slate-400 mt-1 ml-1">Brand ID: {outlet.tenant?.id}</span>
                      </div>
                    </td>
                    
                    <td className="p-4">
                      <div className="flex flex-col items-start gap-1.5">
                        <span className={`flex items-center text-[9px] px-2 py-1 rounded font-black uppercase tracking-widest border ${outlet.tenant?.plan?.name === 'PRO' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                          <CreditCard size={10} className="mr-1" /> {outlet.tenant?.plan?.name || "BASIC"} PLAN
                        </span>
                        <span className="flex items-center text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                          <Calendar size={10} className="mr-1"/> Ends: {validity.validTill}
                        </span>
                      </div>
                    </td>

                    <td className="p-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {outlet.isActive ? (
                          <span className="flex items-center text-[9px] uppercase font-black tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full">
                            <CheckCircle2 size={10} className="mr-1" /> Active
                          </span>
                        ) : (
                          <span className="flex items-center text-[9px] uppercase font-black tracking-widest text-red-600 bg-red-50 border border-red-100 px-2 py-1 rounded-full">
                            <XCircle size={10} className="mr-1" /> Inactive
                          </span>
                        )}
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                          {validity.daysLeft} Days Left
                        </span>
                      </div>
                    </td>

                    <td className="p-4 text-right">
                      <button onClick={() => openEditModal(outlet)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-end w-full gap-1 text-[10px] font-black uppercase tracking-widest">
                        <Edit2 size={14} /> Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- ADD OUTLET MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border-t-8 border-blue-600 flex flex-col max-h-[90vh]">
            <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-black text-slate-800 flex items-center uppercase tracking-tight">
                  <Store size={18} className="mr-2 text-blue-600" /> Provision Outlet
                </h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Generates unique 7-Digit ID automatically.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 bg-white p-2 rounded-full border border-slate-200"><XCircle size={16} /></button>
            </div>
            
            <form onSubmit={handleCreateOutlet} className="p-6 overflow-y-auto custom-scrollbar space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50 p-4 rounded-xl border border-blue-100">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-blue-800 mb-1.5 flex items-center">
                    <Building2 size={12} className="mr-1"/> 1. Link to Brand ID *
                  </label>
                  <select 
                    required
                    value={formData.tenantId}
                    onChange={(e) => setFormData({...formData, tenantId: e.target.value})}
                    className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl text-xs font-mono font-bold outline-none focus:border-blue-500 transition-all"
                  >
                    <option value="" disabled>Select Brand...</option>
                    {tenants.map(t => <option key={t.id} value={t.id}>{t.businessName} (ID: {t.id})</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-blue-800 mb-1.5 flex items-center">
                    <CreditCard size={12} className="mr-1"/> 2. Purchase Subscription Plan *
                  </label>
                  <select
                    required
                    value={formData.planId}
                    onChange={(e) => setFormData({...formData, planId: e.target.value})}
                    className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl text-xs font-bold uppercase outline-none focus:border-blue-500 transition-all"
                  >
                    <option value="" disabled>Choose Subscription Plan...</option>
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (₹{p.price}/mo - Max {p.maxOutlets} Stores)</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Outlet Name *</label>
                  <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase focus:border-blue-500 outline-none" placeholder="e.g. Lajpat Nagar Branch" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">POS Login Password</label>
                  <input type="text" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:border-blue-500 outline-none" placeholder="Terminal Pass" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Full Address *</label>
                <textarea required rows={2} value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:border-blue-500 outline-none resize-none custom-scrollbar" placeholder="Street Address, City, ZIP" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Outlet Email</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:border-blue-500 outline-none" placeholder="store@..." />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Store Phone</label>
                  <input type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:border-blue-500 outline-none" placeholder="+91..." />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">GST Number</label>
                  <input type="text" value={formData.gst} onChange={(e) => setFormData({...formData, gst: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase focus:border-blue-500 outline-none" placeholder="GSTIN..." />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="bg-slate-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg px-8 py-3 disabled:opacity-50 flex items-center">
                  {isSubmitting ? <Loader2 size={16} className="animate-spin mr-2" /> : null} {isSubmitting ? "Allocating Plan..." : "Deploy Outlet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT / CONFIGURATION MODULE MODAL --- */}
      {editOutletData && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden border-t-8 border-amber-500 flex flex-col max-h-[90vh]">
            <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-black text-slate-800 flex items-center uppercase tracking-tight">
                  <Settings size={18} className="mr-2 text-amber-500" /> Manage Outlet Configurations
                </h3>
                <p className="text-[10px] font-mono text-indigo-600 font-bold mt-1 bg-indigo-50 w-fit px-2 py-0.5 rounded border border-indigo-100">OUTLET ID: {editOutletData.id}</p>
              </div>
              <button onClick={() => setEditOutletData(null)} className="text-slate-400 hover:text-slate-700 bg-white p-2 rounded-full border border-slate-200"><XCircle size={16} /></button>
            </div>
            
            <form onSubmit={handleUpdateOutlet} className="p-6 overflow-y-auto custom-scrollbar space-y-6">
              
              <div className="bg-slate-900 rounded-2xl p-5 text-white flex flex-col md:flex-row gap-4 items-center justify-between shadow-lg">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Parent Brand (Tenant)</p>
                  <div className="font-black text-lg flex items-center"><Building2 size={16} className="mr-2 text-indigo-400"/> {editOutletData.tenant?.businessName}</div>
                </div>
                <div className="h-8 w-px bg-slate-700 hidden md:block"></div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Owner Registry Connection</p>
                  <div className="font-mono text-xs flex items-center"><Crown size={14} className="mr-2 text-amber-400"/> {editOutletData.tenant?.ownerEmail}</div>
                </div>
                <div className="h-8 w-px bg-slate-700 hidden md:block"></div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Active SaaS Plan Token</p>
                  <div className="font-black text-xs text-emerald-400">{editOutletData.tenant?.plan?.name || "BASIC"} PLAN</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Outlet Name</label>
                  <input required type="text" value={editFormData.name} onChange={(e) => setEditFormData({...editFormData, name: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs font-bold uppercase focus:border-amber-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">POS Login Password</label>
                  <input type="text" value={editFormData.password} onChange={(e) => setEditFormData({...editFormData, password: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:border-amber-500 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Full Address</label>
                <textarea required rows={2} value={editFormData.address} onChange={(e) => setEditFormData({...editFormData, address: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs font-bold focus:border-amber-500 outline-none resize-none custom-scrollbar" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Contact Email</label>
                  <input type="email" value={editFormData.email} onChange={(e) => setEditFormData({...editFormData, email: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs font-bold focus:border-amber-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Store Phone</label>
                  <input type="text" value={editFormData.phone} onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:border-amber-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">GST Number</label>
                  <input type="text" value={editFormData.gst} onChange={(e) => setEditFormData({...editFormData, gst: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase focus:border-amber-500 outline-none" />
                </div>
              </div>

              <div className="pt-4 flex justify-between items-center border-t border-slate-100">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={editFormData.isActive} onChange={(e) => setEditFormData({...editFormData, isActive: e.target.checked})} className="w-5 h-5 text-amber-600 rounded border-slate-300 focus:ring-amber-500" />
                  <div>
                    <span className="text-xs font-black uppercase text-slate-800 block">Outlet Operations Status</span>
                    <span className="text-[9px] font-bold text-slate-400 tracking-widest uppercase">Toggle to suspend operations</span>
                  </div>
                </label>
                
                <div className="flex gap-3">
                  <button type="button" onClick={() => setEditOutletData(null)} className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg px-8 py-3 disabled:opacity-50 flex items-center">
                    {isSubmitting ? <Loader2 size={16} className="animate-spin mr-2" /> : null} Save Details
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
