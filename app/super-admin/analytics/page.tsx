"use client";
import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, TrendingDown, IndianRupee, Users, Store, Activity, Loader2, RefreshCcw, Download, Filter, Crown, AlertTriangle, Building2, Zap } from "lucide-react";

export default function SaaSAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("ALL_TIME");

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/super-admin/analytics");
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (e) {
      console.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Compiling Big Data...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-50">
        <AlertTriangle className="text-red-500 mb-4" size={48} />
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Failed to generate reports</p>
      </div>
    );
  }

  const { metrics, topTenants } = data;

  return (
    <div className="max-w-[1400px] mx-auto h-full flex flex-col animate-in fade-in duration-300">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
            <BarChart3 className="mr-2 text-indigo-600" /> SaaS Analytics & Reports
          </h1>
          <p className="text-xs text-slate-500 font-bold mt-1 tracking-wide">Financial health, MRR, churn rates, and tenant performance matrix.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="p-2.5 border border-slate-200 rounded-xl font-bold text-xs outline-none bg-white uppercase text-slate-700 focus:border-indigo-500 shadow-sm">
            <option value="ALL_TIME">Lifetime Data</option>
            <option value="THIS_YEAR">This Year</option>
            <option value="THIS_MONTH">This Month</option>
          </select>
          <button onClick={fetchAnalytics} className="p-2.5 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors shadow-sm active:scale-95">
            <RefreshCcw size={18} />
          </button>
          <button className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center shadow-lg active:scale-95 transition-all whitespace-nowrap">
            <Download size={16} className="mr-1.5" /> Export Report
          </button>
        </div>
      </div>

      {/* Primary Financial KPIs (SaaS Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 shrink-0">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block z-10">MRR (Monthly Recurring)</span>
            <Activity size={16} className="text-indigo-500 z-10"/>
          </div>
          <p className="text-3xl font-mono font-black text-slate-900 z-10">₹{metrics.mrr.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          <div className="absolute -right-4 -bottom-4 opacity-5"><Activity size={80}/></div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block z-10">ARR (Annual Run Rate)</span>
            <Zap size={16} className="text-amber-500 z-10"/>
          </div>
          <p className="text-3xl font-mono font-black text-slate-900 z-10">₹{metrics.arr.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          <div className="absolute -right-4 -bottom-4 opacity-5"><Zap size={80}/></div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block z-10">Platform TPV (GTV)</span>
            <IndianRupee size={16} className="text-emerald-500 z-10"/>
          </div>
          <p className="text-3xl font-mono font-black text-emerald-600 z-10">₹{(metrics.tpv / 100000).toFixed(2)}L</p>
          <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase z-10">Total Processed Volume</p>
          <div className="absolute -right-4 -bottom-4 opacity-5"><IndianRupee size={80}/></div>
        </div>

        <div className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-center relative overflow-hidden ${parseFloat(metrics.churnRate) > 5 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
          <div className="flex justify-between items-start mb-2">
            <span className={`text-[10px] font-black uppercase tracking-widest block z-10 ${parseFloat(metrics.churnRate) > 5 ? 'text-red-700' : 'text-slate-400'}`}>Customer Churn Rate</span>
            {parseFloat(metrics.churnRate) > 5 ? <TrendingDown size={16} className="text-red-500 z-10"/> : <TrendingUp size={16} className="text-blue-500 z-10"/>}
          </div>
          <p className={`text-3xl font-mono font-black z-10 ${parseFloat(metrics.churnRate) > 5 ? 'text-red-600' : 'text-slate-900'}`}>{metrics.churnRate}%</p>
          <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase z-10">Target: {"< 5%"}</p>
        </div>
      </div>

      {/* Secondary Operational Metrics & Visuals */}
      <div className="flex flex-col lg:flex-row gap-6 mb-6 shrink-0">
        
        {/* Operational Stats */}
        <div className="w-full lg:w-1/3 grid grid-cols-2 gap-4">
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md text-white flex flex-col justify-center items-center text-center">
            <Building2 size={24} className="text-blue-400 mb-2"/>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Tenants</span>
            <span className="text-3xl font-mono font-black text-white">{metrics.activeTenants}</span>
            <span className="text-[9px] text-slate-500 font-bold mt-1 uppercase">Total: {metrics.totalTenants}</span>
          </div>
          <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 shadow-sm flex flex-col justify-center items-center text-center">
            <Store size={24} className="text-blue-500 mb-2"/>
            <span className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-1">Live Outlets</span>
            <span className="text-3xl font-mono font-black text-blue-600">{metrics.totalOutlets}</span>
          </div>
          <div className="col-span-2 bg-indigo-50 p-5 rounded-2xl border border-indigo-100 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black text-indigo-800 uppercase tracking-widest block mb-1">Total System Users</span>
              <span className="text-2xl font-mono font-black text-indigo-700">{metrics.totalUsers} Profiles</span>
            </div>
            <Users size={32} className="text-indigo-200"/>
          </div>
        </div>

        {/* Visual Chart Placeholder (CSS Driven) */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-sm text-slate-800 uppercase tracking-wider flex items-center"><BarChart3 size={16} className="mr-2 text-indigo-500"/> Revenue Growth Trajectory</h3>
          </div>
          <div className="flex-1 flex items-end justify-between gap-2 pt-10">
            {/* CSS Bar Chart Simulation */}
            {[40, 65, 45, 80, 55, 90, 75, 100, 85, 110, 95, 120].map((val, idx) => (
              <div key={idx} className="w-full bg-slate-100 rounded-t-md relative group flex flex-col justify-end" style={{ height: '100%' }}>
                <div className="w-full bg-indigo-500 rounded-t-md transition-all duration-500 group-hover:bg-indigo-400" style={{ height: `${val}%` }}></div>
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 text-[9px] font-black bg-slate-800 text-white px-1.5 py-0.5 rounded transition-opacity">
                  {val}k
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 pt-2 border-t border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest">
            <span>Jan</span><span>Mar</span><span>Jun</span><span>Sep</span><span>Dec</span>
          </div>
        </div>
      </div>

      {/* Top Performing Clients Table */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0">
          <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider flex items-center"><Crown size={16} className="mr-2 text-amber-500"/> Top Performing Tenants (By Platform TPV)</h3>
        </div>
        <div className="overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-slate-100/90 sticky top-0 z-10">
              <tr className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200">
                <th className="p-4 w-16 text-center">Rank</th>
                <th className="p-4">Tenant / Brand</th>
                <th className="p-4 text-center">Current Plan</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Lifetime GTV Processed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-bold text-slate-700">
              {topTenants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    <p className="font-black uppercase tracking-widest">No Sales Data Available</p>
                  </td>
                </tr>
              ) : (
                topTenants.map((t: any, idx: number) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-center">
                      {idx === 0 ? <Crown size={20} className="mx-auto text-amber-500"/> : <span className="font-mono text-slate-400">#{idx + 1}</span>}
                    </td>
                    <td className="p-4">
                      <div className="font-black text-slate-900 uppercase">{t.name}</div>
                      <div className="text-[10px] font-mono text-slate-500">{t.email}</div>
                    </td>
                    <td className="p-4 text-center">
                      <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-1 rounded text-[9px] uppercase font-black tracking-wider">
                        {t.plan}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {t.status === "ACTIVE" ? (
                        <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-1 rounded text-[9px] uppercase font-black tracking-wider">Active</span>
                      ) : (
                        <span className="bg-red-100 text-red-700 border border-red-200 px-2 py-1 rounded text-[9px] uppercase font-black tracking-wider">Churned</span>
                      )}
                    </td>
                    <td className="p-4 text-right font-mono font-black text-emerald-600 text-base">
                      ₹{t.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
