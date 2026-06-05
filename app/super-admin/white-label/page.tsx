"use client";
import { useState, useEffect } from "react";
import { Paintbrush, Search, Loader2, Globe, Palette, Edit2, Image as ImageIcon, CheckCircle2, ShieldCheck, X, Building2, MonitorSmartphone } from "lucide-react";

export default function WhiteLabelPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    customDomain: "",
    logoUrl: "",
    themeColor: "#000000",
    appName: ""
  });

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/super-admin/white-label");
      const data = await res.json();
      if (data.success) {
        setTenants(data.tenants);
      }
    } catch (e) {
      console.error("Failed to load white-label data");
    } finally {
      setLoading(false);
    }
  };

  const openConfigModal = (tenant: any) => {
    setSelectedTenant(tenant);
    setFormData({
      customDomain: tenant.whiteLabelConfig?.customDomain || "",
      logoUrl: tenant.whiteLabelConfig?.logoUrl || "",
      themeColor: tenant.whiteLabelConfig?.themeColor || "#000000",
      appName: tenant.whiteLabelConfig?.appName || ""
    });
    setShowConfigModal(true);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const res = await fetch("/api/super-admin/white-label", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: selectedTenant.id,
          ...formData
        })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        alert(`✅ White-label settings updated for ${selectedTenant.businessName}!`);
        setShowConfigModal(false);
        fetchTenants(); // Refresh data to show changes
      } else {
        alert(`⚠️ Error: ${data.error}`);
      }
    } catch (e) {
      alert("Network Error.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- Metrics ---
  const activeWhiteLabels = tenants.filter(t => t.whiteLabelConfig !== null).length;
  const customDomainsCount = tenants.filter(t => t.whiteLabelConfig?.customDomain).length;

  const filteredTenants = tenants.filter(t => 
    t.businessName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.ownerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.whiteLabelConfig?.customDomain || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-[1400px] mx-auto h-full flex flex-col animate-in fade-in duration-300">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
            <Paintbrush className="mr-2 text-indigo-600" /> Premium White Label
          </h1>
          <p className="text-xs text-slate-500 font-bold mt-1 tracking-wide">Configure custom domains and branding for enterprise clients.</p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6 shrink-0">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Total SaaS Clients</span>
            <Building2 size={16} className="text-slate-400"/>
          </div>
          <p className="text-2xl font-mono font-black text-slate-800">{tenants.length}</p>
        </div>
        <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 block">Branded Accounts</span>
            <Palette size={16} className="text-indigo-500"/>
          </div>
          <p className="text-2xl font-mono font-black text-indigo-700">{activeWhiteLabels}</p>
        </div>
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm flex flex-col justify-center text-white">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Active Custom Domains</span>
            <Globe size={16} className="text-white/60"/>
          </div>
          <p className="text-2xl font-mono font-black text-white">{customDomainsCount} Live</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 shrink-0 bg-white p-3 border border-slate-200 rounded-2xl shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" placeholder="Search by Business Name, Email or Domain..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 bg-slate-50 transition-colors" />
        </div>
      </div>

      {/* Grid of Tenants */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
        {loading ? (
          <div className="h-full flex justify-center items-center"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>
        ) : filteredTenants.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-white border border-slate-200 rounded-2xl">
            <Paintbrush size={60} className="mb-4 opacity-20" />
            <p className="font-black text-lg uppercase tracking-widest">No Clients Found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredTenants.map((tenant) => {
              const hasConfig = tenant.whiteLabelConfig !== null;
              const config = tenant.whiteLabelConfig || {};
              const tColor = config.themeColor || "#0f172a";

              return (
                <div key={tenant.id} className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden shadow-sm flex flex-col transition-all hover:shadow-md hover:border-indigo-200">
                  
                  {/* Theme Header Strip */}
                  <div className="h-3 w-full" style={{ backgroundColor: hasConfig ? tColor : '#e2e8f0' }}></div>
                  
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-black text-slate-900 uppercase text-lg line-clamp-1">{tenant.businessName}</h3>
                        <p className="text-[10px] font-mono text-slate-500 mt-0.5">{tenant.ownerEmail}</p>
                      </div>
                      {hasConfig ? (
                        <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider border border-indigo-100 flex items-center">
                          <CheckCircle2 size={10} className="mr-1"/> Branded
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider border border-slate-200">
                          Standard
                        </span>
                      )}
                    </div>

                    <div className="space-y-3 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100 flex-1">
                      <div className="flex items-center text-xs font-bold text-slate-600">
                        <Globe size={14} className="mr-2 text-slate-400"/> 
                        {config.customDomain ? <span className="text-blue-600 font-mono">{config.customDomain}</span> : <span className="text-slate-400 italic">No Domain Linked</span>}
                      </div>
                      <div className="flex items-center text-xs font-bold text-slate-600">
                        <MonitorSmartphone size={14} className="mr-2 text-slate-400"/> 
                        {config.appName ? <span>{config.appName}</span> : <span className="text-slate-400 italic">Default App Name</span>}
                      </div>
                      <div className="flex items-center text-xs font-bold text-slate-600">
                        <Palette size={14} className="mr-2 text-slate-400"/> 
                        <div className="w-4 h-4 rounded shadow-sm border border-slate-200 mr-2" style={{ backgroundColor: hasConfig ? tColor : '#e2e8f0' }}></div>
                        <span className="font-mono text-[10px] uppercase text-slate-500">{hasConfig ? tColor : 'None'}</span>
                      </div>
                    </div>

                    <button onClick={() => openConfigModal(tenant)} className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl text-xs font-black uppercase tracking-wider flex justify-center items-center transition-colors">
                      <Edit2 size={14} className="mr-1.5"/> {hasConfig ? "Edit Branding" : "Setup White Label"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- WHITE LABEL CONFIG MODAL --- */}
      {showConfigModal && selectedTenant && (
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border-t-8 border-indigo-600 relative overflow-hidden">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center"><Paintbrush size={20} className="mr-2 text-indigo-600"/> Branding Studio</h2>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Editing settings for {selectedTenant.businessName}</p>
              </div>
              <button onClick={() => setShowConfigModal(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full transition-colors"><X size={20}/></button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest flex items-center"><Globe size={12} className="mr-1"/> Custom Domain</label>
                <div className="flex items-center">
                  <span className="bg-slate-100 border-y-2 border-l-2 border-slate-100 text-slate-500 font-mono text-xs px-3 py-3 rounded-l-xl font-bold">https://</span>
                  <input type="text" placeholder="pos.yourclient.com" value={formData.customDomain} onChange={(e) => setFormData({...formData, customDomain: e.target.value})} className="flex-1 p-3 border-y-2 border-r-2 border-slate-100 rounded-r-xl outline-none text-sm font-bold focus:border-indigo-500 bg-slate-50 focus:bg-white transition-colors lowercase" />
                </div>
                <p className="text-[9px] font-bold text-slate-400 mt-1.5">DNS requires a CNAME record pointing to zedposs.com</p>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest flex items-center"><MonitorSmartphone size={12} className="mr-1"/> Custom App/System Name</label>
                <input type="text" placeholder="e.g. BurgerHub ERP" value={formData.appName} onChange={(e) => setFormData({...formData, appName: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-sm font-bold focus:border-indigo-500 bg-slate-50 focus:bg-white transition-colors" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest flex items-center"><ImageIcon size={12} className="mr-1"/> Brand Logo URL</label>
                  <input type="url" placeholder="https://..." value={formData.logoUrl} onChange={(e) => setFormData({...formData, logoUrl: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-mono font-bold focus:border-indigo-500 bg-slate-50 focus:bg-white transition-colors" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest flex items-center"><Palette size={12} className="mr-1"/> Primary Theme Color</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={formData.themeColor} onChange={(e) => setFormData({...formData, themeColor: e.target.value})} className="w-12 h-11 p-1 bg-white border-2 border-slate-100 rounded-lg cursor-pointer" />
                    <input type="text" value={formData.themeColor} onChange={(e) => setFormData({...formData, themeColor: e.target.value})} className="flex-1 p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-mono font-bold uppercase focus:border-indigo-500 bg-slate-50 focus:bg-white transition-colors" />
                  </div>
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="p-4 rounded-xl border-2 border-dashed border-slate-200 mt-2">
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-3 text-center">Login Screen Preview</p>
                <div className="w-full h-12 rounded-lg flex items-center justify-center font-black uppercase text-white tracking-widest text-xs shadow-md transition-colors" style={{ backgroundColor: formData.themeColor }}>
                  Sign in to {formData.appName || "Software"}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button disabled={isSaving} type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest py-4 rounded-xl text-xs shadow-xl active:scale-95 transition-all flex justify-center items-center">
                  {isSaving ? <Loader2 className="animate-spin" size={18}/> : "Save Brand Settings"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
