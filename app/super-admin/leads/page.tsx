"use client";
import { useState, useEffect } from "react";
import { Users, Plus, Loader2, Mail, Phone, Building2, Calendar, MessageSquare, ChevronRight, CheckCircle2, XCircle, Search, Target, Filter, X } from "lucide-react";

const STAGES = [
  { id: "NEW", label: "New Leads", color: "border-blue-500", bg: "bg-blue-50", text: "text-blue-700" },
  { id: "FOLLOW_UP", label: "Follow Up", color: "border-amber-500", bg: "bg-amber-50", text: "text-amber-700" },
  { id: "DEMO_SCHEDULED", label: "Demo Booked", color: "border-purple-500", bg: "bg-purple-50", text: "text-purple-700" },
  { id: "TRIAL_STARTED", label: "Trial Active", color: "border-indigo-500", bg: "bg-indigo-50", text: "text-indigo-700" },
  { id: "CONVERTED", label: "Converted", color: "border-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700" },
  { id: "LOST", label: "Lost / Dropped", color: "border-red-500", bg: "bg-red-50", text: "text-red-700" }
];

export default function LeadsCRMPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    source: "WEBSITE",
    notes: ""
  });

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/super-admin/leads");
      const data = await res.json();
      if (data.success) {
        setLeads(data.leads);
      }
    } catch (e) {
      console.error("Failed to load leads");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const res = await fetch("/api/super-admin/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        alert(`✅ Lead "${formData.company}" added to the pipeline!`);
        setShowAddModal(false);
        setFormData({ name: "", company: "", email: "", phone: "", source: "WEBSITE", notes: "" });
        fetchLeads();
      } else {
        alert(`⚠️ Error: ${data.error}`);
      }
    } catch (e) {
      alert("Network Error.");
    } finally {
      setIsSaving(false);
    }
  };

  const updateLeadStatus = async (id: string, newStatus: string) => {
    // Optimistic UI Update
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));

    try {
      await fetch("/api/super-admin/leads", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus })
      });
    } catch (e) {
      alert("Failed to update status");
      fetchLeads(); // Revert on fail
    }
  };

  const filteredLeads = leads.filter(l => 
    l.company.toLowerCase().includes(searchQuery.toLowerCase()) || 
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.phone.includes(searchQuery)
  );

  return (
    <div className="max-w-[1600px] mx-auto h-full flex flex-col animate-in fade-in duration-300">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
            <Target className="mr-2 text-blue-600" /> Sales Pipeline & CRM
          </h1>
          <p className="text-xs text-slate-500 font-bold mt-1 tracking-wide">Track inbound inquiries, demos, and conversions.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Search by name, company, phone..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 shadow-sm" />
          </div>
          <button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center shadow-lg shadow-blue-500/30 active:scale-95 transition-all whitespace-nowrap">
            <Plus size={16} className="mr-1.5" /> Add Lead
          </button>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 shrink-0">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Total Pipeline</span>
          <p className="text-xl font-black text-slate-800">{leads.length}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm">
          <span className="text-[10px] font-black uppercase text-blue-600 block mb-1">New Inquiries</span>
          <p className="text-xl font-black text-blue-700">{leads.filter(l => l.status === "NEW").length}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 shadow-sm">
          <span className="text-[10px] font-black uppercase text-purple-600 block mb-1">Demos Scheduled</span>
          <p className="text-xl font-black text-purple-700">{leads.filter(l => l.status === "DEMO_SCHEDULED").length}</p>
        </div>
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 shadow-sm">
          <span className="text-[10px] font-black uppercase text-emerald-600 block mb-1">Total Converted</span>
          <p className="text-xl font-black text-emerald-700">{leads.filter(l => l.status === "CONVERTED").length}</p>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar pb-4">
        {loading ? (
          <div className="h-full flex justify-center items-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>
        ) : (
          <div className="flex h-full gap-4 min-w-[1400px]">
            {STAGES.map((stage) => {
              const stageLeads = filteredLeads.filter(l => l.status === stage.id);
              
              return (
                <div key={stage.id} className="flex-1 flex flex-col w-72 max-w-[320px] bg-slate-100/50 rounded-2xl border border-slate-200 overflow-hidden">
                  
                  {/* Stage Header */}
                  <div className={`p-3 border-b-2 ${stage.color} bg-white flex justify-between items-center shrink-0`}>
                    <h3 className={`font-black text-xs uppercase tracking-wider ${stage.text}`}>{stage.label}</h3>
                    <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-2 py-0.5 rounded-full">{stageLeads.length}</span>
                  </div>

                  {/* Stage Cards */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                    {stageLeads.map((lead) => (
                      <div key={lead.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group cursor-pointer relative">
                        
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-black text-slate-800 text-sm uppercase leading-tight pr-4">{lead.company}</h4>
                          <span className="text-[8px] font-black uppercase text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{lead.source}</span>
                        </div>
                        
                        <div className="space-y-1 mb-4">
                          <div className="flex items-center text-xs font-bold text-slate-600"><Users size={12} className="mr-1.5 text-slate-400"/> {lead.name}</div>
                          <div className="flex items-center text-xs font-bold text-blue-600"><Phone size={12} className="mr-1.5 text-blue-400"/> {lead.phone}</div>
                        </div>

                        {lead.notes && (
                          <div className="mb-4 bg-yellow-50/50 p-2 rounded-lg border border-yellow-100/50 text-[10px] font-bold text-slate-600 leading-relaxed line-clamp-2">
                            <MessageSquare size={10} className="inline mr-1 text-yellow-500 mb-0.5"/> {lead.notes}
                          </div>
                        )}

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[9px] font-bold text-slate-400 flex items-center">
                            <Calendar size={10} className="mr-1"/> {new Date(lead.createdAt).toLocaleDateString('en-IN', {month:'short', day:'numeric'})}
                          </span>
                          
                          {/* Inline Status Changer (Dropdown logic) */}
                          <select 
                            value={lead.status} 
                            onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                            className="text-[9px] font-black uppercase tracking-wider bg-slate-50 border border-slate-200 text-slate-600 rounded px-1.5 py-1 outline-none focus:border-blue-500"
                          >
                            {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                          </select>
                        </div>

                      </div>
                    ))}
                    {stageLeads.length === 0 && (
                      <div className="h-20 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Drop Here
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- ADD LEAD MODAL --- */}
      {showAddModal && (
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border-t-8 border-blue-600 relative overflow-hidden">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center"><Target size={20} className="mr-2 text-blue-600"/> Add New Lead</h2>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Enter prospect details into pipeline</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full transition-colors"><X size={20}/></button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Company / Brand Name</label>
                  <input required type="text" placeholder="e.g. Burger Cafe" value={formData.company} onChange={(e) => setFormData({...formData, company: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-sm font-bold uppercase focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Lead Source</label>
                  <select value={formData.source} onChange={(e) => setFormData({...formData, source: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-sm font-bold uppercase focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors">
                    <option value="WEBSITE">Website Form</option>
                    <option value="REFERRAL">Referral</option>
                    <option value="COLD_CALL">Cold Call</option>
                    <option value="SOCIAL_MEDIA">Social Media</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Contact Person</label>
                  <input required type="text" placeholder="Owner Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-bold focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Mobile Number</label>
                  <input required type="tel" placeholder="Mobile" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/\D/g, '')})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-mono font-bold focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Email Address</label>
                <input type="email" placeholder="contact@brand.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-mono font-bold focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors" />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Initial Notes / Requirements</label>
                <textarea rows={2} placeholder="Looking for 5 outlet setup..." value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-sm font-bold focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors resize-none" />
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button disabled={isSaving} type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest py-4 rounded-xl text-xs shadow-xl active:scale-95 transition-all flex justify-center items-center">
                  {isSaving ? <Loader2 className="animate-spin" size={18}/> : "Add To Pipeline"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
