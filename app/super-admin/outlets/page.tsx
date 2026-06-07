"use client";

import { useState, useEffect } from "react";
import { 
  Store, Plus, Search, MapPin, Mail, 
  Building2, MoreVertical, Loader2, CheckCircle2, XCircle, CreditCard, Calendar
} from "lucide-react";

interface Outlet {
  id: string;
  name: string;
  address: string;
  email: string | null;
  isActive: boolean;
  tenant: {
    id: string;
    businessName: string;
    plan?: {
      name: string;
      maxOutlets: number;
    } | null;
  };
  createdAt: string;
}

interface Tenant {
  id: string;
  businessName: string;
}

export default function OutletsPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    email: "",
    tenantId: "",
  });

  useEffect(() => {
    fetchOutlets();
    fetchTenants();
  }, []);

  const fetchOutlets = async () => {
    try {
      const res = await fetch("/api/super-admin/outlets");
      const data = await res.json();
      if (data.success) {
        setOutlets(data.outlets);
      }
    } catch (error) {
      console.error("Failed to fetch outlets");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      const res = await fetch("/api/super-admin/tenants");
      const data = await res.json();
      if (data.success) {
        setTenants(data.tenants);
      }
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
        setFormData({ name: "", address: "", email: "", tenantId: "" });
        setIsModalOpen(false);
        fetchOutlets(); // Refresh list
        alert("✅ Outlet successfully provisioned and linked to the Brand!");
      } else {
        // This will trigger if Subscription Max Outlet Limit is reached
        alert("⚠️ " + data.error);
      }
    } catch (error) {
      alert("Network Error: Failed to create outlet");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Utility to calculate dummy validity (Can be replaced with real DB billing cycle logic later)
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
          <Plus size={16} className="mr-2" />
          Provision New Outlet
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
            placeholder="Search by name or brand ID..." 
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
              {outlets.map((outlet) => {
                const validity = getValidityDetails(outlet.createdAt);
                return (
                  <tr key={outlet.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <p className="font-black text-slate-900 uppercase text-xs">{outlet.name}</p>
                      <div className="space-y-1 mt-1.5">
                        <p className="text-[10px] text-slate-500 flex items-start font-bold">
                          <MapPin size={10} className="mr-1 mt-0.5 shrink-0" /> <span className="line-clamp-1">{outlet.address}</span>
                        </p>
                        {outlet.email && (
                          <p className="text-[10px] text-slate-500 flex items-center font-mono">
                            <Mail size={10} className="mr-1" /> {outlet.email}
                          </p>
                        )}
                      </div>
                    </td>
                    
                    <td className="p-4">
                      <div className="flex flex-col items-start">
                        <span className="flex items-center text-[10px] bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md border border-indigo-100 font-black uppercase tracking-widest">
                          <Building2 size={12} className="mr-1.5" /> {outlet.tenant?.businessName || "Unknown"}
                        </span>
                        <span className="text-[9px] font-mono font-bold text-slate-400 mt-1 ml-1">ID: {outlet.tenant?.id}</span>
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
                      <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              
              {outlets.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">
                    <Store size={40} className="mx-auto mb-3 opacity-50" />
                    <p className="text-xs font-black uppercase tracking-widest">No outlets active on network.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Outlet Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border-t-8 border-blue-600 flex flex-col max-h-[90vh]">
            <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-black text-slate-800 flex items-center uppercase tracking-tight">
                  <Store size={18} className="mr-2 text-blue-600" /> 
                  Provision Outlet
                </h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Map store to a registered brand ID.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 bg-white p-2 rounded-full border border-slate-200">
                <XCircle size={16} />
              </button>
            </div>
            
            <form onSubmit={handleCreateOutlet} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 flex items-center">
                  <Building2 size={12} className="mr-1 text-blue-500"/> Assign to Brand (Tenant) *
                </label>
                <select 
                  required
                  value={formData.tenantId}
                  onChange={(e) => setFormData({...formData, tenantId: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase focus:border-blue-500 outline-none transition-all"
                >
                  <option value="" disabled>Select a Business via ID...</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.businessName} (ID: {t.id})</option>
                  ))}
                </select>
                <p className="text-[8px] font-bold text-amber-500 mt-1 uppercase tracking-widest">* Will be rejected if Brand's Subscription limit is reached.</p>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Outlet Name *</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase focus:border-blue-500 outline-none transition-all"
                  placeholder="e.g. Connaught Place Branch"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Full Address *</label>
                <textarea 
                  required
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:border-blue-500 outline-none transition-all resize-none custom-scrollbar"
                  placeholder="Street, City, State, ZIP"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Contact Email (Optional)</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:border-blue-500 outline-none transition-all"
                  placeholder="outlet@business.com"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 bg-slate-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg flex items-center justify-center disabled:opacity-50 py-2.5"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                  {isSubmitting ? "Allocating..." : "Deploy Outlet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
