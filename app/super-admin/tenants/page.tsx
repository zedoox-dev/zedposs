k"use client";
import { useState, useEffect } from "react";
import { 
  Building2, Plus, Search, Loader2, X, Crown, 
  Store, Users, Globe, ShieldAlert, Hash, Calendar, 
  ChevronDown, ChevronUp, Eye, EyeOff, Edit2, Mail, Key, MapPin
} from "lucide-react";

export default function SuperAdminTenantsPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Track which tenant row is expanded to show its outlets
  const [expandedTenantId, setExpandedTenantId] = useState<string | null>(null);

  // Toggle Password Visibility State
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  // Onboard Modal Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [onboardForm, setOnboardForm] = useState({
    brandName: "",
    ownerName: "",
    ownerEmail: "",
    ownerPassword: ""
  });

  // Edit Credentials Modal State
  const [editModalData, setEditModalData] = useState<any>(null);
  const [editForm, setEditForm] = useState({ newEmail: "", newPassword: "" });
  const [isUpdating, setIsUpdating] = useState(false);

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
        setOnboardForm({ brandName: "", ownerName: "", ownerEmail: "", ownerPassword: "" });
        fetchTenants();
        alert(`✅ ${json.data.tenant.businessName} created with ID: ${json.data.tenant.id} ! You can now assign outlets to this ID.`);
      } else {
        alert("Error: " + json.error);
      }
    } catch (e) {
      alert("Network Error during onboarding");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const res = await fetch("/api/super-admin/tenants", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: editModalData.tenantId,
          userId: editModalData.userId,
          newEmail: editForm.newEmail,
          newPassword: editForm.newPassword
        })
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setEditModalData(null);
        fetchTenants();
        alert("✅ Credentials updated successfully!");
      } else {
        alert("Error: " + json.error);
      }
    } catch (e) {
      alert("Network Error during update");
    } finally {
      setIsUpdating(false);
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPasswordMap(prev => ({ ...prev, [id]: !prev[id] }));
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

  const filteredTenants = tenants.filter(t => 
    (t.businessName || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
    (t.users[0]?.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.id || "").includes(searchQuery)
  );

  const totalOutlets = tenants.reduce((sum, t) => sum + (t._count?.outlets || 0), 0);

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-white">
        <Loader2 className="animate-spin text-indigo-500 mb-4" size={50} />
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Syncing Multi-Tenant DB...</h2>
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
            <Plus className="mr-1.5" size={16} /> Onboard New Tenant
          </button>
        </div>

        {/* System Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 shrink-0">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Brands Registered</span>
              <p className="text-4xl font-mono font-black text-slate-900 mt-1">{tenants.length}</p>
            </div>
            <Building2 size={40} className="text-slate-100" />
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Outlets Powered</span>
              <p className="text-4xl font-mono font-black text-indigo-600 mt-1">{totalOutlets}</p>
            </div>
            <Store size={40} className="text-indigo-50" />
          </div>
        </div>

        {/* Tenants Table */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" placeholder="Search Brand, 5-Digit ID or Email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 bg-white shadow-sm" 
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
            <div className="space-y-4">
              {filteredTenants.length === 0 ? (
                <div className="p-10 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                  <Building2 size={50} className="mx-auto text-slate-200 mb-4" />
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">No Brands Found</p>
                </div>
              ) : (
                filteredTenants.map((tenant: any) => {
                  const owner = tenant.users[0] || {};
                  const isPassVisible = showPasswordMap[owner.id];

                  return (
                    <div key={tenant.id} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm transition-all hover:border-indigo-300">
                      
                      {/* Primary Tenant Row */}
                      <div className="p-5 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors">
                        
                        <div className="flex items-center gap-6 w-[30%] cursor-pointer" onClick={() => setExpandedTenantId(expandedTenantId === tenant.id ? null : tenant.id)}>
                          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                            <Building2 size={20} />
                          </div>
                          <div>
                            <div className="font-black text-base text-slate-900 uppercase">
                              {tenant.businessName || "Unnamed Brand"}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-black flex items-center">
                              <Hash size={12} className="mr-1 text-indigo-400"/> ID: <span className="text-indigo-600 ml-1">{tenant.id}</span> 
                            </div>
                          </div>
                        </div>

                        {/* Owner Credentials Area */}
                        <div className="w-[40%] flex flex-col justify-center border-l border-r border-slate-100 px-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center text-xs font-black text-slate-800 uppercase">
                              <Crown size={14} className="mr-2 text-amber-500"/> {owner.name || "N/A"}
                            </div>
                            <button 
                              onClick={() => {
                                setEditModalData({ tenantId: tenant.id, userId: owner.id });
                                setEditForm({ newEmail: owner.email, newPassword: owner.password });
                              }}
                              className="text-[9px] font-black uppercase tracking-widest bg-slate-100 hover:bg-indigo-100 hover:text-indigo-600 text-slate-500 px-2 py-1 rounded transition-colors flex items-center"
                            >
                              <Edit2 size={10} className="mr-1"/> Edit
                            </button>
                          </div>
                          <div className="flex flex-col gap-1 mt-2">
                            <div className="text-[10px] font-mono text-slate-600 flex items-center">
                              <Mail size={10} className="mr-1.5 text-slate-400"/> {owner.email || "No email"}
                            </div>
                            <div className="text-[10px] font-mono text-slate-600 flex items-center">
                              <Key size={10} className="mr-1.5 text-slate-400"/> 
                              {isPassVisible ? owner.password : "••••••••"}
                              <button onClick={() => togglePasswordVisibility(owner.id)} className="ml-2 text-slate-400 hover:text-indigo-600">
                                {isPassVisible ? <EyeOff size={12}/> : <Eye size={12}/>}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="w-[20%] flex justify-end gap-3 items-center cursor-pointer" onClick={() => setExpandedTenantId(expandedTenantId === tenant.id ? null : tenant.id)}>
                          <span className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-widest border border-slate-200 font-black flex items-center">
                            <Store size={14} className="mr-1.5"/> {tenant._count?.outlets || 0} Outlets
                          </span>
                          {expandedTenantId === tenant.id ? <ChevronUp size={20} className="text-slate-400"/> : <ChevronDown size={20} className="text-slate-400"/>}
                        </div>
                      </div>

                      {/* Expandable Outlets Sub-Table */}
                      {expandedTenantId === tenant.id && (
                        <div className="bg-slate-50 border-t border-slate-100 p-5">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center mb-4">
                            <Store size={12} className="mr-1.5"/> Comprehensive Outlet Data
                          </h4>
                          
                          {tenant.outlets?.length === 0 ? (
                            <div className="text-center p-4 bg-white rounded-xl border border-slate-200 text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                              No outlets mapped to ID {tenant.id} yet.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-4">
                              {tenant.outlets.map((outlet: any) => {
                                const validity = getValidityDetails(outlet.createdAt);
                                const isOutletPassVisible = showPasswordMap[`outlet_${outlet.id}`];

                                return (
                                  <div key={outlet.id} className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center shadow-sm gap-4">
                                    
                                    <div className="w-full md:w-[40%]">
                                      <p className="text-sm font-black uppercase text-slate-900 flex items-center">
                                        {outlet.name}
                                        {outlet.isActive && <span className="ml-2 w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>}
                                      </p>
                                      <p className="text-[10px] font-bold text-slate-500 uppercase mt-1 flex items-start leading-tight">
                                        <MapPin size={10} className="mr-1.5 shrink-0 mt-0.5"/> {outlet.address || "Address not provided"}
                                      </p>
                                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center">
                                        <Calendar size={10} className="mr-1"/> Added: {new Date(outlet.createdAt).toLocaleDateString('en-GB')}
                                      </p>
                                    </div>

                                    <div className="w-full md:w-[35%] bg-slate-50 p-3 rounded-lg border border-slate-100">
                                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5 border-b border-slate-200 pb-1">Outlet POS Login</p>
                                      <div className="flex flex-col gap-1.5">
                                        <div className="text-[10px] font-mono text-slate-700 flex items-center">
                                          <Mail size={10} className="mr-1.5 text-slate-400"/> {outlet.email || "No specific email"}
                                        </div>
                                        <div className="text-[10px] font-mono text-slate-700 flex items-center">
                                          <Key size={10} className="mr-1.5 text-slate-400"/> 
                                          {outlet.password ? (isOutletPassVisible ? outlet.password : "••••••••") : "No password set"}
                                          {outlet.password && (
                                            <button onClick={() => togglePasswordVisibility(`outlet_${outlet.id}`)} className="ml-2 text-slate-400 hover:text-indigo-600">
                                              {isOutletPassVisible ? <EyeOff size={12}/> : <Eye size={12}/>}
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="w-full md:w-[25%] flex flex-col items-end gap-2">
                                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Validity Status</span>
                                      <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${validity.isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                                        {validity.daysLeft} Days Left
                                      </span>
                                    </div>

                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* --- EDIT CREDENTIALS MODAL --- */}
        {editModalData && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl relative border-t-8 border-amber-500">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center">
                  <Edit2 size={18} className="mr-2 text-amber-500"/> Update Credentials
                </h2>
                <button onClick={() => setEditModalData(null)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full"><X size={18}/></button>
              </div>
              <form onSubmit={handleUpdateCredentials} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Owner Email ID</label>
                  <input required type="email" value={editForm.newEmail} onChange={(e) => setEditForm({...editForm, newEmail: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl outline-none text-xs font-mono font-bold focus:border-amber-500 bg-slate-50" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Master Password</label>
                  <input required type="text" value={editForm.newPassword} onChange={(e) => setEditForm({...editForm, newPassword: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl outline-none text-xs font-mono font-bold focus:border-amber-500 bg-slate-50" />
                </div>
                <button disabled={isUpdating} type="submit" className="w-full mt-4 bg-slate-900 text-white font-black uppercase tracking-widest py-3.5 rounded-xl text-xs flex justify-center items-center shadow-xl active:scale-95 transition-all disabled:opacity-50">
                  {isUpdating ? <Loader2 className="animate-spin" size={16}/> : "Save Changes"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* --- ONBOARD BRAND MODAL --- */}
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] border-t-8 border-indigo-500">
              
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4 shrink-0">
                <div>
                  <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center"><Globe size={20} className="mr-2 text-indigo-600"/> Provision New Tenant</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Create master login and generate 5-Digit Brand ID.</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full"><X size={20}/></button>
              </div>
              
              <form onSubmit={handleOnboardBrand} className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-6">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-4 flex items-center"><Building2 size={12} className="mr-1.5"/> 1. Company Information</h3>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Registered Brand Name</label>
                    <input required type="text" placeholder="e.g. RamKesar Foods" value={onboardForm.brandName} onChange={(e) => setOnboardForm({...onboardForm, brandName: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl outline-none text-sm font-black uppercase focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all bg-white" />
                  </div>
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-4 flex items-center"><Crown size={12} className="mr-1.5"/> 2. Super Admin Credentials (Brand Owner)</h3>
                  
                  <div className="mb-4">
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Owner Name</label>
                    <input required type="text" placeholder="e.g. Upendra Yadav" value={onboardForm.ownerName} onChange={(e) => setOnboardForm({...onboardForm, ownerName: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl outline-none text-xs font-bold uppercase focus:border-indigo-500 bg-white" />
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
                  {isProcessing ? <Loader2 className="animate-spin" size={16}/> : "Deploy Brand & Assign 5-Digit ID"}
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
