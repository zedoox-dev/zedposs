"use client";
import { useState, useEffect } from "react";
import { Timer, Search, Plus, Loader2, Play, CheckCircle2, XCircle, Clock, Calendar, Building2, Mail, Phone, ChevronRight, Zap, Filter, Award } from "lucide-react";

export default function TrialManagementPage() {
  const [trials, setTrials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ companyName: "", email: "", phone: "", trialDays: "14" });

  const [showExtendModal, setShowExtendModal] = useState(false);
  const [selectedTrial, setSelectedTrial] = useState<any>(null);
  const [extendDays, setExtendDays] = useState("7");

  useEffect(() => {
    fetchTrials();
  }, []);

  const fetchTrials = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/super-admin/trials");
      const data = await res.json();
      if (data.success) setTrials(data.trials);
    } catch (e) {
      console.error("Failed to load trials");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrial = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/super-admin/trials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`✅ Trial account for "${formData.companyName}" successfully initiated!`);
        setShowAddModal(false);
        setFormData({ companyName: "", email: "", phone: "", trialDays: "14" });
        fetchTrials();
      } else {
        alert(`⚠️ Error: ${data.error}`);
      }
    } catch (e) {
      alert("Network Error.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConvertTrial = async (id: string, companyName: string) => {
    if (!confirm(`Mark ${companyName} as a converted paid customer?`)) return;
    try {
      const res = await fetch("/api/super-admin/trials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "CONVERT" })
      });
      if (res.ok) {
        setTrials(trials.map(t => t.id === id ? { ...t, isConverted: true } : t));
        alert("🎉 Awesome! Lead successfully converted to Paid.");
      }
    } catch (e) {
      alert("Failed to convert trial.");
    }
  };

  const handleExtendTrial = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/super-admin/trials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedTrial.id, action: "EXTEND", extendDays })
      });
      if (res.ok) {
        setShowExtendModal(false);
        fetchTrials();
        alert(`Trial extended by ${extendDays} days!`);
      }
    } catch (e) {
      alert("Failed to extend trial.");
    } finally {
      setIsSaving(false);
    }
  };

  // Helper Functions
  const getTrialStatus = (trial: any) => {
    if (trial.isConverted) return "CONVERTED";
    const now = new Date();
    const endDate = new Date(trial.endDate);
    return endDate < now ? "EXPIRED" : "ACTIVE";
  };

  const getDaysLeft = (endDateStr: string) => {
    const end = new Date(endDateStr).getTime();
    const now = new Date().getTime();
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  // Metrics
  const activeTrials = trials.filter(t => getTrialStatus(t) === "ACTIVE").length;
  const expiredTrials = trials.filter(t => getTrialStatus(t) === "EXPIRED").length;
  const convertedTrials = trials.filter(t => getTrialStatus(t) === "CONVERTED").length;
  const conversionRate = trials.length > 0 ? ((convertedTrials / trials.length) * 100).toFixed(1) : "0.0";

  const filteredTrials = trials.filter(t => {
    const matchSearch = t.companyName.toLowerCase().includes(searchQuery.toLowerCase()) || t.email.toLowerCase().includes(searchQuery.toLowerCase());
    const status = getTrialStatus(t);
    const matchStatus = statusFilter === "ALL" || status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="max-w-[1400px] mx-auto h-full flex flex-col animate-in fade-in duration-300">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
            <Timer className="mr-2 text-blue-600" /> Trial Operations
          </h1>
          <p className="text-xs text-slate-500 font-bold mt-1 tracking-wide">Monitor ongoing free trials, expirations, and conversions.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Search companies or emails..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 shadow-sm" />
          </div>
          <div className="flex items-center space-x-2">
            <Filter size={14} className="text-slate-400"/>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="p-2 border border-slate-200 rounded-xl font-bold text-xs outline-none bg-white uppercase text-slate-700 focus:border-blue-500">
              <option value="ALL">All Status</option><option value="ACTIVE">Active Trials</option><option value="EXPIRED">Expired</option><option value="CONVERTED">Converted</option>
            </select>
          </div>
          <button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center shadow-lg shadow-blue-500/30 active:scale-95 transition-all whitespace-nowrap">
            <Play size={16} className="mr-1.5" /> Start New Trial
          </button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 shrink-0">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-start mb-2"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Processed</span><Building2 size={16} className="text-slate-400"/></div>
          <p className="text-2xl font-mono font-black text-slate-900">{trials.length}</p>
        </div>
        <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-start mb-2"><span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block">Active & Running</span><Timer size={16} className="text-blue-500"/></div>
          <p className="text-2xl font-mono font-black text-blue-700">{activeTrials}</p>
        </div>
        <div className="bg-red-50 p-5 rounded-2xl border border-red-100 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-start mb-2"><span className="text-[10px] font-black text-red-600 uppercase tracking-widest block">Expired (Action Needed)</span><XCircle size={16} className="text-red-500"/></div>
          <p className="text-2xl font-mono font-black text-red-700">{expiredTrials}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-5 rounded-2xl border border-emerald-400 shadow-md flex flex-col justify-center text-white">
          <div className="flex justify-between items-start mb-2"><span className="text-[10px] font-black text-emerald-100 uppercase tracking-widest block">Conversion Rate</span><Award size={16} className="text-white/80"/></div>
          <p className="text-2xl font-mono font-black text-white">{conversionRate}%</p>
        </div>
      </div>

      {/* Main Table */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex justify-center items-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>
        ) : filteredTrials.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <Timer size={60} className="mb-4 opacity-20" />
            <p className="font-black text-lg uppercase tracking-widest">No Trial Accounts Found</p>
          </div>
        ) : (
          <div className="overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 z-10">
                <tr className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <th className="p-4">Brand / Client</th>
                  <th className="p-4">Contact Details</th>
                  <th className="p-4 text-center">Start Date</th>
                  <th className="p-4 text-center w-64">Trial Progress & Expiry</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-bold text-slate-700">
                {filteredTrials.map((t) => {
                  const status = getTrialStatus(t);
                  const daysLeft = getDaysLeft(t.endDate);
                  
                  // Progress Bar Math (Assuming roughly 14 days default for UI visual, scaling safely)
                  const totalDuration = Math.ceil((new Date(t.endDate).getTime() - new Date(t.startDate).getTime()) / (1000 * 60 * 60 * 24));
                  const progressPct = status === "EXPIRED" || status === "CONVERTED" ? 100 : Math.max(0, 100 - ((daysLeft / totalDuration) * 100));

                  return (
                    <tr key={t.id} className={`hover:bg-slate-50 transition-colors ${status === 'EXPIRED' ? 'bg-red-50/20' : ''}`}>
                      <td className="p-4">
                        <div className="font-black text-slate-900 uppercase tracking-wide">{t.companyName}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center text-[10px] font-mono text-slate-600 mb-1"><Mail size={12} className="mr-1.5 text-slate-400"/> {t.email}</div>
                        <div className="flex items-center text-[10px] font-mono text-blue-600"><Phone size={12} className="mr-1.5 text-blue-400"/> {t.phone}</div>
                      </td>
                      <td className="p-4 text-center text-xs font-mono text-slate-500">
                        {new Date(t.startDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}
                      </td>
                      <td className="p-4 text-center">
                        {status === "CONVERTED" ? (
                          <span className="text-emerald-500 text-xs font-black uppercase">Paid Customer</span>
                        ) : (
                          <div className="w-full">
                            <div className="flex justify-between text-[9px] font-black uppercase text-slate-500 mb-1.5">
                              <span>Ends: {new Date(t.endDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}</span>
                              <span className={status === "EXPIRED" ? "text-red-500" : "text-blue-600"}>{status === "EXPIRED" ? "Expired" : `${daysLeft} Days Left`}</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${status === "EXPIRED" ? "bg-red-500" : daysLeft <= 3 ? "bg-orange-500" : "bg-blue-500"}`} style={{ width: `${progressPct}%` }}></div>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {status === "ACTIVE" && <span className="bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1 rounded text-[9px] uppercase font-black tracking-wider">Active</span>}
                        {status === "EXPIRED" && <span className="bg-red-100 text-red-700 border border-red-200 px-2.5 py-1 rounded text-[9px] uppercase font-black tracking-wider">Expired</span>}
                        {status === "CONVERTED" && <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded text-[9px] uppercase font-black tracking-wider">Converted</span>}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {status !== "CONVERTED" && (
                            <>
                              <button onClick={() => { setSelectedTrial(t); setShowExtendModal(true); }} className="px-3 py-1.5 rounded text-[10px] font-black uppercase transition-all bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 shadow-sm">
                                Extend
                              </button>
                              <button onClick={() => handleConvertTrial(t.id, t.companyName)} className="px-3 py-1.5 rounded text-[10px] font-black uppercase transition-all bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 shadow-sm flex items-center">
                                Convert <ChevronRight size={12} className="ml-1"/>
                              </button>
                            </>
                          )}
                          {status === "CONVERTED" && (
                            <span className="text-[10px] font-black text-emerald-500 uppercase flex items-center justify-end"><CheckCircle2 size={14} className="mr-1"/> Settled</span>
                          )}
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

      {/* --- ADD TRIAL MODAL --- */}
      {showAddModal && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border-t-8 border-blue-600 relative overflow-hidden">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center"><Play size={20} className="mr-2 text-blue-600"/> Initiate Free Trial</h2>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Start SaaS trial countdown</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full transition-colors"><X size={20}/></button>
            </div>

            <form onSubmit={handleCreateTrial} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Company / Brand Name</label>
                <input required type="text" placeholder="e.g. Burger King" value={formData.companyName} onChange={(e) => setFormData({...formData, companyName: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-sm font-bold uppercase focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Contact Email</label>
                <input required type="email" placeholder="client@brand.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-mono font-bold focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Mobile Number</label>
                  <input required type="tel" placeholder="Mobile" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/\D/g, '')})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-mono font-bold focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Trial Duration</label>
                  <select value={formData.trialDays} onChange={(e) => setFormData({...formData, trialDays: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-sm font-bold uppercase focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors">
                    <option value="7">7 Days</option>
                    <option value="14">14 Days</option>
                    <option value="30">30 Days</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button disabled={isSaving} type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest py-4 rounded-xl text-xs shadow-xl active:scale-95 transition-all flex justify-center items-center">
                  {isSaving ? <Loader2 className="animate-spin" size={18}/> : "Start System Trial"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EXTEND TRIAL MODAL --- */}
      {showExtendModal && selectedTrial && (
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border-t-8 border-indigo-500 relative overflow-hidden text-center">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center"><Calendar size={16} className="mr-2 text-indigo-500"/> Extend Trial Period</h2>
              <button onClick={() => setShowExtendModal(false)} className="text-slate-400 hover:bg-slate-100 p-1.5 rounded-full transition-colors"><X size={16}/></button>
            </div>
            
            <p className="text-lg font-black text-slate-900 uppercase mb-4">{selectedTrial.companyName}</p>
            
            <form onSubmit={handleExtendTrial} className="space-y-4 text-left">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Additional Days to Add</label>
                <select value={extendDays} onChange={(e) => setExtendDays(e.target.value)} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-base font-bold uppercase focus:border-indigo-500 bg-slate-50 focus:bg-white transition-colors text-center">
                  <option value="3">+3 Days Grace</option>
                  <option value="7">+7 Days Extension</option>
                  <option value="14">+14 Days Extension</option>
                </select>
              </div>
              <button disabled={isSaving} type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest py-3.5 rounded-xl text-xs shadow-lg active:scale-95 transition-all flex justify-center items-center">
                {isSaving ? <Loader2 className="animate-spin" size={16}/> : "Confirm Extension"}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
