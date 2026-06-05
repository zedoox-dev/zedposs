"use client";
import { useState, useEffect } from "react";
import { Megaphone, Search, Plus, Loader2, Mail, Smartphone, MessageCircle, Play, CheckCircle2, Clock, Filter, Users, X, Send } from "lucide-react";

export default function MarketingCenterPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "EMAIL",
    targetTier: "ALL",
    messageBody: ""
  });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/super-admin/marketing");
      const data = await res.json();
      if (data.success) setCampaigns(data.campaigns);
    } catch (e) {
      console.error("Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/super-admin/marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("✅ Campaign draft created successfully! You can launch it now.");
        setShowAddModal(false);
        setFormData({ name: "", type: "EMAIL", targetTier: "ALL", messageBody: "" });
        fetchCampaigns();
      } else {
        alert(`⚠️ Error: ${data.error}`);
      }
    } catch (e) {
      alert("Network Error.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLaunchCampaign = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to broadcast "${name}" to all targeted tenants?`)) return;
    
    // Optimistic UI Update to Loading State
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: "PROCESSING" } : c));

    try {
      const res = await fetch("/api/super-admin/marketing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "COMPLETED" })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCampaigns(prev => prev.map(c => c.id === id ? data.campaign : c));
        alert("🚀 Broadcast launched successfully to all active tenants!");
      }
    } catch (e) {
      alert("Failed to launch campaign.");
      fetchCampaigns(); // Revert on fail
    }
  };

  // --- Helpers & Metrics ---
  const filteredCampaigns = campaigns.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.messageBody.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = typeFilter === "ALL" || c.type === typeFilter;
    return matchSearch && matchType;
  });

  const getCampaignIcon = (type: string) => {
    switch(type) {
      case "EMAIL": return <Mail size={16} className="text-blue-500" />;
      case "SMS": return <Smartphone size={16} className="text-purple-500" />;
      case "WHATSAPP": return <MessageCircle size={16} className="text-emerald-500" />;
      default: return <Megaphone size={16} className="text-slate-500" />;
    }
  };

  const totalBroadcasts = campaigns.filter(c => c.status === "COMPLETED").reduce((sum, c) => sum + c.sentCount, 0);

  return (
    <div className="max-w-[1400px] mx-auto h-full flex flex-col animate-in fade-in duration-300">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
            <Megaphone className="mr-2 text-blue-600" /> Marketing & Broadcasts
          </h1>
          <p className="text-xs text-slate-500 font-bold mt-1 tracking-wide">Communicate with tenants, send renewal reminders, and alerts.</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center shadow-lg shadow-blue-500/30 active:scale-95 transition-all whitespace-nowrap">
          <Plus size={16} className="mr-1.5" /> Compose Broadcast
        </button>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 shrink-0">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Total Campaigns</span>
          <p className="text-2xl font-mono font-black text-slate-800">{campaigns.length}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-black uppercase text-blue-600 block mb-1">Emails Sent</span>
          <p className="text-2xl font-mono font-black text-blue-700">
            {campaigns.filter(c => c.type === "EMAIL" && c.status === "COMPLETED").reduce((sum, c) => sum + c.sentCount, 0)}
          </p>
        </div>
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-black uppercase text-emerald-600 block mb-1">WhatsApp Delivered</span>
          <p className="text-2xl font-mono font-black text-emerald-700">
            {campaigns.filter(c => c.type === "WHATSAPP" && c.status === "COMPLETED").reduce((sum, c) => sum + c.sentCount, 0)}
          </p>
        </div>
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm flex flex-col justify-center text-white">
          <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Total Network Reach</span>
          <p className="text-2xl font-mono font-black text-white">{totalBroadcasts} Businesses</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 shrink-0 bg-white p-3 border border-slate-200 rounded-2xl shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" placeholder="Search campaign name or content..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 bg-slate-50 transition-colors" />
        </div>
        <div className="flex items-center space-x-2">
          <Filter size={14} className="text-slate-400"/>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="p-2 border border-slate-200 rounded-xl font-bold text-xs outline-none bg-slate-50 uppercase text-slate-700 focus:border-blue-500">
            <option value="ALL">All Formats</option>
            <option value="EMAIL">Email Newsletters</option>
            <option value="SMS">SMS Alerts</option>
            <option value="WHATSAPP">WhatsApp Broadcasts</option>
          </select>
        </div>
      </div>

      {/* Campaigns Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
        {loading ? (
          <div className="h-full flex justify-center items-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-white border border-slate-200 rounded-2xl">
            <Megaphone size={60} className="mb-4 opacity-20" />
            <p className="font-black text-lg uppercase tracking-widest">No Campaigns Found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredCampaigns.map((c) => (
              <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg">
                      {getCampaignIcon(c.type)}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{c.type}</span>
                  </div>
                  {c.status === "COMPLETED" ? (
                    <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-1 rounded text-[9px] uppercase font-black flex items-center">
                      <CheckCircle2 size={10} className="mr-1"/> Sent
                    </span>
                  ) : c.status === "PROCESSING" ? (
                    <span className="bg-amber-100 text-amber-700 border border-amber-200 px-2 py-1 rounded text-[9px] uppercase font-black flex items-center">
                      <Loader2 size={10} className="mr-1 animate-spin"/> Queued
                    </span>
                  ) : (
                    <span className="bg-slate-100 text-slate-600 border border-slate-300 px-2 py-1 rounded text-[9px] uppercase font-black flex items-center">
                      <Clock size={10} className="mr-1"/> Draft
                    </span>
                  )}
                </div>
                
                <h3 className="font-black text-slate-900 uppercase text-sm mb-2 line-clamp-1">{c.name}</h3>
                <p className="text-xs font-bold text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100 line-clamp-3 mb-4 flex-1 whitespace-pre-wrap">
                  {c.messageBody}
                </p>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-auto">
                  <div className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <Users size={12} className="mr-1"/> {c.status === "COMPLETED" ? `${c.sentCount} Reached` : `Target: ${c.targetTier}`}
                  </div>
                  
                  {c.status === "DRAFT" && (
                    <button onClick={() => handleLaunchCampaign(c.id, c.name)} className="bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center transition-colors">
                      <Play size={12} className="mr-1 fill-blue-600"/> Launch Now
                    </button>
                  )}
                  {c.status === "COMPLETED" && (
                    <span className="text-[9px] font-bold text-slate-400">{new Date(c.updatedAt).toLocaleDateString('en-IN')}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- ADD CAMPAIGN MODAL --- */}
      {showAddModal && (
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xl shadow-2xl border-t-8 border-blue-600 relative overflow-hidden">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center"><Send size={20} className="mr-2 text-blue-600"/> Compose Broadcast</h2>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Create a draft to send to your network</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full transition-colors"><X size={20}/></button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Campaign Title</label>
                <input required type="text" placeholder="e.g. Server Maintenance Notice" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-sm font-bold uppercase focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Channel / Format</label>
                  <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-sm font-bold uppercase focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors">
                    <option value="EMAIL">Email</option>
                    <option value="SMS">SMS Message</option>
                    <option value="WHATSAPP">WhatsApp</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Target Audience</label>
                  <select value={formData.targetTier} onChange={(e) => setFormData({...formData, targetTier: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-sm font-bold uppercase focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors">
                    <option value="ALL">All Active Businesses</option>
                    <option value="TRIAL">Trial Accounts Only</option>
                    <option value="EXPIRED">Expired Subscriptions</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Message Content</label>
                <textarea required rows={5} placeholder="Hello {OwnerName}, your system will undergo maintenance..." value={formData.messageBody} onChange={(e) => setFormData({...formData, messageBody: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-sm font-bold focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors resize-none" />
                <p className="text-[9px] font-bold text-slate-400 mt-1">Note: Tags like {'{OwnerName}'} or {'{BrandName}'} will be auto-replaced.</p>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button disabled={isSaving} type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest py-4 rounded-xl text-xs shadow-xl active:scale-95 transition-all flex justify-center items-center">
                  {isSaving ? <Loader2 className="animate-spin" size={18}/> : "Save Draft Campaign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
