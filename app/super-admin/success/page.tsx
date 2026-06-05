"use client";
import { useState, useEffect } from "react";
import { LifeBuoy, Search, Loader2, HeartPulse, AlertTriangle, ShieldCheck, Mail, PhoneCall, Filter, ArrowRight, Building2, HeadphonesIcon, Clock, Activity } from "lucide-react";

export default function CustomerSuccessPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [healthFilter, setHealthFilter] = useState("ALL");

  useEffect(() => {
    fetchHealthData();
  }, []);

  const fetchHealthData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/super-admin/success");
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers);
      }
    } catch (e) {
      console.error("Failed to load customer success data");
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (email: string, actionType: string) => {
    if (actionType === "EMAIL") {
      window.location.href = `mailto:${email}?subject=Checking in on your ZedPoss Experience`;
    } else {
      alert(`Initiating CRM workflow for ${email}...`);
    }
  };

  // --- Metrics ---
  const criticalCount = customers.filter(c => c.healthStatus === "CRITICAL").length;
  const atRiskCount = customers.filter(c => c.healthStatus === "AT_RISK").length;
  const healthyCount = customers.filter(c => c.healthStatus === "HEALTHY").length;
  
  const avgHealthScore = customers.length > 0 
    ? Math.round(customers.reduce((sum, c) => sum + c.healthScore, 0) / customers.length)
    : 0;

  // --- UI Helpers ---
  const getHealthUI = (score: number) => {
    if (score >= 80) return { color: "bg-emerald-500", text: "text-emerald-600", bgLight: "bg-emerald-50", border: "border-emerald-200", icon: <ShieldCheck size={14}/> };
    if (score >= 50) return { color: "bg-amber-500", text: "text-amber-600", bgLight: "bg-amber-50", border: "border-amber-200", icon: <AlertTriangle size={14}/> };
    return { color: "bg-red-500", text: "text-red-600", bgLight: "bg-red-50", border: "border-red-200", icon: <HeartPulse size={14}/> };
  };

  const filteredCustomers = customers.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchHealth = healthFilter === "ALL" || c.healthStatus === healthFilter;
    return matchSearch && matchHealth;
  });

  return (
    <div className="max-w-[1400px] mx-auto h-full flex flex-col animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
            <LifeBuoy className="mr-2 text-indigo-600" /> Customer Success Hub
          </h1>
          <p className="text-xs text-slate-500 font-bold mt-1 tracking-wide">AI-driven health scoring to prevent churn and increase LTV.</p>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 shrink-0">
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-center text-white relative overflow-hidden">
          <HeartPulse size={80} className="absolute -right-4 -bottom-4 text-white/5" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Avg Global Health</span>
          <p className="text-3xl font-mono font-black text-white">{avgHealthScore}%</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 block mb-1">Healthy Tenants</span>
          <p className="text-3xl font-mono font-black text-emerald-600">{healthyCount}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 block mb-1">At Risk (Monitor)</span>
          <p className="text-3xl font-mono font-black text-amber-600">{atRiskCount}</p>
        </div>
        <div className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-center ${criticalCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
          <span className={`text-[10px] font-black uppercase tracking-widest block mb-1 ${criticalCount > 0 ? 'text-red-500' : 'text-slate-400'}`}>Critical Churn Risk</span>
          <p className={`text-3xl font-mono font-black ${criticalCount > 0 ? 'text-red-700' : 'text-slate-800'}`}>{criticalCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 shrink-0 bg-white p-3 border border-slate-200 rounded-2xl shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" placeholder="Search by Business Name or Email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 bg-slate-50 transition-colors" />
        </div>
        <div className="flex items-center space-x-2">
          <Filter size={14} className="text-slate-400"/>
          <select value={healthFilter} onChange={(e) => setHealthFilter(e.target.value)} className="p-2.5 border border-slate-200 rounded-xl font-bold text-xs outline-none bg-slate-50 uppercase text-slate-700 focus:border-indigo-500">
            <option value="ALL">All Health States</option>
            <option value="HEALTHY">Healthy (&gt;70%)</option>
            <option value="AT_RISK">At Risk (41-70%)</option>
            <option value="CRITICAL">Critical (0-40%)</option>
          </select>
        </div>
      </div>

      {/* Customers List */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0">
          <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider flex items-center"><Activity size={16} className="mr-2 text-indigo-500"/> Tenant Health Monitor Matrix</h3>
        </div>
        
        {loading ? (
          <div className="flex-1 flex justify-center items-center"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>
        ) : filteredCustomers.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
            <LifeBuoy size={60} className="mb-4 opacity-20" />
            <p className="font-black text-lg uppercase tracking-widest text-slate-500">No Customers Found</p>
          </div>
        ) : (
          <div className="overflow-y-auto custom-scrollbar p-4 space-y-4">
            {filteredCustomers.map((customer) => {
              const ui = getHealthUI(customer.healthScore);
              
              return (
                <div key={customer.id} className={`p-5 rounded-2xl border-2 flex flex-col lg:flex-row gap-6 items-start lg:items-center transition-all shadow-sm hover:shadow-md ${ui.border} ${ui.bgLight}`}>
                  
                  {/* Brand Details */}
                  <div className="w-full lg:w-1/4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className={`p-1.5 rounded-lg border ${ui.border} ${ui.text} bg-white`}>{ui.icon}</div>
                      <h3 className="font-black text-slate-900 uppercase text-base">{customer.name}</h3>
                    </div>
                    <p className="text-[10px] font-mono text-slate-500 uppercase flex items-center"><Mail size={10} className="mr-1"/> {customer.email}</p>
                    <span className="inline-block mt-2 bg-white text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-[9px] uppercase font-black tracking-wider">
                      {customer.plan} Plan
                    </span>
                  </div>

                  {/* Health Score Progress */}
                  <div className="w-full lg:w-1/3">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                      <span className="text-slate-500">Health Score</span>
                      <span className={`${ui.text} text-sm`}>{customer.healthScore}%</span>
                    </div>
                    <div className="w-full h-3 bg-white/50 border border-slate-200/50 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ${ui.color}`} style={{ width: `${customer.healthScore}%` }}></div>
                    </div>
                  </div>

                  {/* Risk Factors / Activity */}
                  <div className="w-full lg:flex-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">System Diagnostics</p>
                    <div className="space-y-1.5">
                      {customer.riskFactors.length > 0 ? (
                        customer.riskFactors.map((risk: string, i: number) => (
                          <div key={i} className="flex items-center text-xs font-bold text-red-600 bg-red-100/50 w-fit px-2 py-1 rounded border border-red-100">
                            <AlertTriangle size={12} className="mr-1.5 shrink-0"/> {risk}
                          </div>
                        ))
                      ) : (
                        <div className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-100/50 w-fit px-2 py-1 rounded border border-emerald-100">
                          <ShieldCheck size={12} className="mr-1.5 shrink-0"/> Optimal Usage Detected
                        </div>
                      )}
                      
                      <div className="flex items-center text-[10px] font-bold text-slate-500 mt-2">
                        <Clock size={12} className="mr-1"/> Last POS Activity: {customer.lastActivity ? new Date(customer.lastActivity).toLocaleDateString('en-IN') : "Never"}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="w-full lg:w-auto flex flex-row lg:flex-col gap-2 shrink-0">
                    <button onClick={() => handleActionClick(customer.email, "EMAIL")} className="flex-1 lg:flex-none bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center transition-colors shadow-sm">
                      <Mail size={14} className="mr-1.5"/> Email
                    </button>
                    {customer.healthScore <= 70 && (
                      <button onClick={() => handleActionClick(customer.email, "CALL")} className="flex-1 lg:flex-none bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center transition-colors shadow-sm shadow-indigo-500/30">
                        <PhoneCall size={14} className="mr-1.5"/> Log Call
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
