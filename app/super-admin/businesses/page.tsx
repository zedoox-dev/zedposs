"use client";
import { useState, useEffect } from "react";
import { Building2, Search, Plus, Loader2, MoreVertical, ShieldCheck, Mail, Phone, Store, Lock, Power, X, UserCircle } from "lucide-react";

export default function BusinessManagementPage() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    businessName: "",
    ownerName: "",
    ownerEmail: "",
    phone: "",
    password: "",
    // Naye Fields Add Kiye Gaye Hain 👇
    gstin: "",
    pan: "",
    fssaiNo: "",
    businessType: "QSR" // Default type
  });

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const fetchBusinesses = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/super-admin/businesses");
      const data = await res.json();
      if (data.success) {
        setBusinesses(data.businesses);
      }
    } catch (e) {
      console.error("Failed to load businesses");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const res = await fetch("/api/super-admin/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        alert(`✅ Business "${formData.businessName}" successfully registered! The owner can now login.`);
        setShowAddModal(false);
        // Form Reset with new fields
        setFormData({ businessName: "", ownerName: "", ownerEmail: "", phone: "", password: "", gstin: "", pan: "", fssaiNo: "", businessType: "QSR" });
        fetchBusinesses();
      } else {
        alert(`⚠️ Error: ${data.error}`);
      }
    } catch (e) {
      alert("Network Error.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleBusinessStatus = async (id: string, currentStatus: boolean, name: string) => {
    const action = currentStatus ? "Suspend" : "Activate";
    if (!confirm(`Are you sure you want to ${action} ${name}?`)) return;

    try {
      const res = await fetch("/api/super-admin/businesses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !currentStatus })
      });
      const data = await res.json();
      if (data.success) {
        setBusinesses(businesses.map(b => b.id === id ? { ...b, isActive: !currentStatus } : b));
      }
    } catch (e) {
      alert("Failed to update status");
    }
  };

  const filteredBusinesses = businesses.filter(b => 
    b.businessName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    b.ownerEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col animate-in fade-in duration-300">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
            <Building2 className="mr-2 text-blue-600" /> Business Management
          </h1>
          <p className="text-xs text-slate-500 font-bold mt-1 tracking-wide">Onboard, suspend, and monitor SaaS tenants.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Search brands or emails..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 shadow-sm" />
          </div>
          <button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center shadow-lg shadow-blue-500/30 active:scale-95 transition-all whitespace-nowrap">
            <Plus size={16} className="mr-1.5" /> Add Business
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-6 shrink-0">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
          <div><span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Total Tenants</span><span className="text-xl font-black text-slate-800">{businesses.length}</span></div>
          <Building2 size={24} className="text-slate-200"/>
        </div>
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 shadow-sm flex justify-between items-center">
          <div><span className="text-[10px] font-black uppercase text-emerald-600 block mb-1">Active Accounts</span><span className="text-xl font-black text-emerald-700">{businesses.filter(b=>b.isActive).length}</span></div>
          <ShieldCheck size={24} className="text-emerald-200"/>
        </div>
        <div className="bg-red-50 p-4 rounded-xl border border-red-100 shadow-sm flex justify-between items-center">
          <div><span className="text-[10px] font-black uppercase text-red-600 block mb-1">Suspended</span><span className="text-xl font-black text-red-700">{businesses.filter(b=>!b.isActive).length}</span></div>
          <Lock size={24} className="text-red-200"/>
        </div>
      </div>

      {/* Main Table */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex justify-center items-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>
        ) : filteredBusinesses.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <Building2 size={60} className="mb-4 opacity-20" />
            <p className="font-black text-lg uppercase tracking-widest">No Businesses Found</p>
          </div>
        ) : (
          <div className="overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 z-10">
                <tr className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <th className="p-4 w-12 text-center">#</th>
                  <th className="p-4">Brand / Company</th>
                  <th className="p-4">Owner Profile</th>
                  <th className="p-4 text-center">Outlets</th>
                  <th className="p-4 text-center">Reg. Date</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-bold text-slate-700">
                {filteredBusinesses.map((b, idx) => {
                  const owner = b.users?.[0]; // Fetch SUPER_ADMIN user
                  return (
                    <tr key={b.id} className={`hover:bg-slate-50 transition-colors ${!b.isActive ? 'bg-red-50/20' : ''}`}>
                      <td className="p-4 text-center text-slate-400 text-xs">{idx + 1}</td>
                      <td className="p-4">
                        <div className="font-black text-slate-900 uppercase tracking-wide">{b.businessName}</div>
                        <div className="text-[9px] font-mono text-slate-500 uppercase">ID: {b.id.split('-')[0]}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center text-slate-800 text-xs"><UserCircle size={14} className="mr-1.5 text-slate-400"/> {owner?.name || "N/A"}</div>
                        <div className="flex items-center text-[10px] font-mono text-blue-600 mt-1"><Mail size={10} className="mr-1"/> {b.ownerEmail}</div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-xs font-black border border-slate-200 flex items-center justify-center w-fit mx-auto">
                          <Store size={12} className="mr-1.5"/> {b.outlets?.length || 0}
                        </span>
                      </td>
                      <td className="p-4 text-center text-xs font-mono text-slate-500">
                        {new Date(b.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                      </td>
                      <td className="p-4 text-center">
                        {b.isActive ? (
                          <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded text-[9px] uppercase font-black tracking-wider">Active</span>
                        ) : (
                          <span className="bg-red-100 text-red-700 border border-red-200 px-2.5 py-1 rounded text-[9px] uppercase font-black tracking-wider">Suspended</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button onClick={() => toggleBusinessStatus(b.id, b.isActive, b.businessName)} className={`px-3 py-1.5 rounded text-[10px] font-black uppercase transition-all flex items-center ${b.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200'}`}>
                            <Power size={12} className="mr-1"/> {b.isActive ? 'Suspend' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- ADD BUSINESS MODAL --- */}
      {showAddModal && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl border-t-8 border-blue-600 relative overflow-hidden h-fit max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center"><Building2 size={20} className="mr-2 text-blue-600"/> Onboard New Client</h2>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Generates Tenant, Main Branch & Admin Account</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full transition-colors"><X size={20}/></button>
            </div>

            <form onSubmit={handleRegisterBusiness} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Brand / Company Name</label>
                <input required type="text" placeholder="e.g. Burger King" value={formData.businessName} onChange={(e) => setFormData({...formData, businessName: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-sm font-bold uppercase focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Owner Full Name</label>
                  <input required type="text" placeholder="Owner Name" value={formData.ownerName} onChange={(e) => setFormData({...formData, ownerName: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-bold focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Contact Number</label>
                  <input required type="tel" placeholder="Mobile" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/\D/g, '')})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-mono font-bold focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Admin Login Email (Unique)</label>
                  <input required type="email" placeholder="admin@brand.com" value={formData.ownerEmail} onChange={(e) => setFormData({...formData, ownerEmail: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-mono font-bold focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Master Password</label>
                  <input required type="text" placeholder="Secure Password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-sm font-mono font-black tracking-widest focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors" />
                </div>
              </div>

              {/* NAYE FIELDS KE LIYE INPUTS 👇 */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Business Type</label>
                  <select value={formData.businessType} onChange={(e) => setFormData({...formData, businessType: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-bold focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors cursor-pointer">
                    <option value="QSR">QSR</option>
                    <option value="Restaurant">Restaurant</option>
                    <option value="Bakery">Bakery</option>
                    <option value="Mithai">Mithai</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">FSSAI No. (Optional)</label>
                  <input type="text" placeholder="FSSAI License" value={formData.fssaiNo} onChange={(e) => setFormData({...formData, fssaiNo: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-mono font-bold focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">GSTIN (Optional)</label>
                  <input type="text" placeholder="GST Number" value={formData.gstin} onChange={(e) => setFormData({...formData, gstin: e.target.value.toUpperCase()})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-mono font-bold focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">PAN (Optional)</label>
                  <input type="text" placeholder="PAN Number" value={formData.pan} onChange={(e) => setFormData({...formData, pan: e.target.value.toUpperCase()})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-mono font-bold focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors" />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button disabled={isSaving} type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest py-4 rounded-xl text-xs shadow-xl active:scale-95 transition-all flex justify-center items-center">
                  {isSaving ? <Loader2 className="animate-spin" size={18}/> : "Provision SaaS Account & Launch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
