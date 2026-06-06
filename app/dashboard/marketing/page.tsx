"use client";
import { useState, useEffect } from "react";
import { useOutlet } from "../../context/OutletContext"; // Fixed absolute path
import { 
  Megaphone, MessageSquare, Mail, Send, 
  Loader2, X, Users, Activity, CheckCircle2,
  Smartphone, BarChart3, AlertTriangle
} from "lucide-react";

export default function MarketingHubPage() {
  const { selectedOutlet } = useOutlet();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal & Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [campaignForm, setCampaignForm] = useState({
    name: "",
    type: "WHATSAPP", // EMAIL, SMS, WHATSAPP
    targetTier: "ALL", // ALL, VIP
    messageBody: "",
    status: "DRAFT" // DRAFT, SCHEDULED, COMPLETED
  });

  useEffect(() => {
    fetchCampaigns();
  }, []); // Marketing is global, doesn't depend on outlet dropdown heavily

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/brand/marketing");
      const json = await res.json();
      if (json.success) setCampaigns(json.campaigns);
    } catch (e) {
      console.error("Campaign Sync Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const res = await fetch("/api/brand/marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(campaignForm)
      });
      const json = await res.json();
      
      if (res.ok && json.success) {
        setShowAddModal(false);
        setCampaignForm({ name: "", type: "WHATSAPP", targetTier: "ALL", messageBody: "", status: "DRAFT" });
        fetchCampaigns();
        if (json.campaign.status === "COMPLETED") {
          alert(`✅ Blast Successful! Message sent to ${json.targetedCount} customers.`);
        }
      } else {
        alert("Error creating campaign.");
      }
    } catch (e) {
      alert("Network Error");
    } finally {
      setIsProcessing(false);
    }
  };

  const totalSent = campaigns.reduce((sum, c) => sum + (c.sentCount || 0), 0);

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Loading Marketing Matrix...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto animate-in fade-in duration-300 h-full flex flex-col pb-8">
      
      {/* Warning for Outlet Switcher */}
      {selectedOutlet !== "ALL" && (
        <div className="mb-4 bg-indigo-50 border border-indigo-100 p-3 rounded-xl flex items-center shadow-sm">
          <AlertTriangle size={14} className="text-indigo-600 mr-2" />
          <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">
            Marketing Hub is a Global feature. Campaigns created here target the entire Brand CRM network.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
            <Megaphone className="mr-2 text-indigo-600" /> Marketing Hub
          </h1>
          <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">
            Broadcast offers & retain customers via SMS/WhatsApp.
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-sm shadow-indigo-500/30 transition-all active:scale-95">
          <Send className="mr-1.5" size={14} /> New Campaign
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 shrink-0">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Campaigns</span>
            <Activity size={20} className="text-indigo-500"/>
          </div>
          <p className="text-4xl font-mono font-black text-slate-900">{campaigns.length}</p>
        </div>

        <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 shadow-sm flex flex-col justify-center relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Messages Delivered</span>
            <CheckCircle2 size={20} className="text-emerald-500"/>
          </div>
          <p className="text-4xl font-mono font-black text-emerald-700">{totalSent.toLocaleString()}</p>
        </div>

        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-center relative overflow-hidden text-white">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active Audience</span>
            <Users size={20} className="text-slate-400"/>
          </div>
          <p className="text-4xl font-mono font-black text-white">Brand CRM</p>
        </div>
      </div>

      {/* Campaigns List */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-800 flex items-center">
            <BarChart3 size={16} className="mr-2 text-indigo-500" /> Campaign History
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {campaigns.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300">
              <Megaphone size={50} className="mb-4 opacity-50" />
              <p className="text-xs font-black uppercase tracking-widest">No Campaigns Launched Yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {campaigns.map((camp: any) => (
                <div key={camp.id} className="border border-slate-200 p-5 rounded-2xl hover:shadow-md transition-shadow relative overflow-hidden flex flex-col">
                  
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-black text-slate-900 uppercase tracking-tight text-sm flex items-center">
                        {camp.type === "WHATSAPP" && <MessageSquare size={14} className="mr-1.5 text-emerald-500"/>}
                        {camp.type === "SMS" && <Smartphone size={14} className="mr-1.5 text-blue-500"/>}
                        {camp.type === "EMAIL" && <Mail size={14} className="mr-1.5 text-red-500"/>}
                        {camp.name}
                      </h3>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-1">
                        {new Date(camp.createdAt).toLocaleDateString('en-GB')} • Target: {camp.targetTier}
                      </p>
                    </div>
                    
                    <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border ${
                      camp.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                      camp.status === 'SCHEDULED' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                      'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      {camp.status}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-600 font-medium mb-4 flex-1 line-clamp-3 italic">
                    "{camp.messageBody}"
                  </div>

                  <div className="border-t border-slate-100 pt-3 flex justify-between items-center mt-auto">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Delivered To:
                    </span>
                    <span className="font-mono text-sm font-black text-indigo-600">
                      {camp.sentCount} Customers
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* --- CREATE CAMPAIGN MODAL --- */}
      {showAddModal && (
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl relative overflow-hidden border-t-8 border-indigo-600">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center"><Send size={18} className="mr-2 text-indigo-600"/> Launch Broadcast</h2>
                <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Send offers directly to CRM database.</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full"><X size={18}/></button>
            </div>
            
            <form onSubmit={handleCreateCampaign} className="space-y-4">
              
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Campaign Name</label>
                <input required type="text" placeholder="e.g. Diwali Mega Sale 2026" value={campaignForm.name} onChange={(e) => setCampaignForm({...campaignForm, name: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-bold uppercase focus:border-indigo-500 bg-slate-50" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Platform</label>
                  <select value={campaignForm.type} onChange={(e) => setCampaignForm({...campaignForm, type: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-bold uppercase focus:border-indigo-500 bg-slate-50">
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="SMS">SMS Text</option>
                    <option value="EMAIL">Email</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Target Audience</label>
                  <select value={campaignForm.targetTier} onChange={(e) => setCampaignForm({...campaignForm, targetTier: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-bold uppercase focus:border-indigo-500 bg-slate-50">
                    <option value="ALL">All CRM Customers</option>
                    <option value="VIP">VIP (Loyal Customers Only)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Message / Offer Body</label>
                <textarea required rows={4} placeholder="Hi! Get 20% off on your next order at RamKesar Foods. Use code: TASTY20" value={campaignForm.messageBody} onChange={(e) => setCampaignForm({...campaignForm, messageBody: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-bold focus:border-indigo-500 bg-slate-50 custom-scrollbar" />
              </div>

              <div className="flex items-center gap-4 mt-2">
                 <label className="text-[10px] font-black uppercase text-slate-500">Action Type:</label>
                  <select value={campaignForm.status} onChange={(e) => setCampaignForm({...campaignForm, status: e.target.value})} className="p-2 border-2 border-slate-100 rounded-xl outline-none text-xs font-bold uppercase focus:border-indigo-500 bg-slate-50">
                    <option value="COMPLETED">Blast Now (Live)</option>
                    <option value="DRAFT">Save as Draft</option>
                    <option value="SCHEDULED">Schedule for Later</option>
                  </select>
              </div>

              <button disabled={isProcessing} type="submit" className="w-full mt-4 bg-slate-900 text-white font-black uppercase tracking-widest py-3.5 rounded-xl text-xs flex justify-center items-center shadow-lg active:scale-95 transition-all disabled:opacity-50">
                {isProcessing ? <Loader2 className="animate-spin" size={16}/> : "Confirm & Execute Campaign"}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
