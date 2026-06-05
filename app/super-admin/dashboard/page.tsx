"use client";
import { useEffect, useState } from "react";
import { Building2, Users, IndianRupee, Activity, TrendingUp, TrendingDown, Store, AlertTriangle, LifeBuoy, Loader2 } from "lucide-react";

export default function SuperAdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch("/api/super-admin/dashboard");
      const json = await res.json();
      if (json.success) {
        setData(json.kpis);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Enterprise Overview</h1>
        <p className="text-xs text-slate-500 font-bold mt-1 tracking-wide">High-level metrics across all connected businesses and tenants.</p>
      </div>

      {/* KPIs Grid 1: Revenue & Growth */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Today's Total Platform Revenue</span>
            <IndianRupee size={16} className="text-emerald-500"/>
          </div>
          <p className="text-3xl font-mono font-black text-slate-900">₹{Number(data?.todayRevenue || 0).toLocaleString()}</p>
          <div className="flex items-center text-[10px] text-emerald-600 font-black mt-2 bg-emerald-50 w-fit px-2 py-0.5 rounded uppercase">
            <TrendingUp size={10} className="mr-1"/> +12.5% vs Yesterday
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Monthly Recurring (MRR Estimate)</span>
            <Activity size={16} className="text-blue-500"/>
          </div>
          <p className="text-3xl font-mono font-black text-slate-900">₹{Number(data?.monthlyRevenue || 0).toLocaleString()}</p>
          <div className="flex items-center text-[10px] text-blue-600 font-black mt-2 bg-blue-50 w-fit px-2 py-0.5 rounded uppercase">
            Stable Growth
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Subscribed Businesses</span>
            <Building2 size={16} className="text-indigo-500"/>
          </div>
          <div className="flex items-end space-x-2">
            <p className="text-3xl font-mono font-black text-slate-900">{data?.totalBusinesses || 0}</p>
            <span className="text-xs font-bold text-slate-400 mb-1">Brands</span>
          </div>
          <div className="flex items-center text-[10px] text-emerald-600 font-black mt-2">
            {data?.activeBusinesses || 0} Active • 0 Trials
          </div>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-lg flex flex-col justify-center text-white relative overflow-hidden">
          <Users size={80} className="absolute -right-4 -bottom-4 text-white/5" />
          <div className="flex justify-between items-start mb-2 relative z-10">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Registered Users</span>
            <Users size={16} className="text-blue-400"/>
          </div>
          <p className="text-3xl font-mono font-black text-white relative z-10">{data?.totalUsers || 0}</p>
          <div className="flex items-center text-[10px] text-blue-300 font-black mt-2 relative z-10">
            Across {data?.totalOutlets || 0} Outlets
          </div>
        </div>

      </div>

      {/* Grid 2: Operational Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart Placeholder (Future) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-sm text-slate-800 uppercase tracking-wider">Revenue Growth Trajectory</h3>
            <select className="text-xs border border-slate-200 rounded p-1 font-bold outline-none text-slate-600"><option>This Year</option><option>Last 6 Months</option></select>
          </div>
          <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-xl bg-slate-50">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Chart.js / Recharts Component Area</p>
          </div>
        </div>

        {/* System Health / Quick Alerts */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="font-black text-xs text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex items-center"><Activity size={14} className="mr-2 text-blue-500"/> System Health</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-600">Active API Sessions</span>
                <span className="font-mono font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">24 Live</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-600">Database Load</span>
                <span className="font-mono font-black text-slate-800">12%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-600">Total Transactions</span>
                <span className="font-mono font-black text-slate-800">{data?.totalTransactions || 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-red-50 rounded-2xl border border-red-100 p-5 shadow-sm">
            <h3 className="font-black text-xs text-red-800 uppercase tracking-wider mb-4 border-b border-red-200 pb-2 flex items-center"><AlertTriangle size={14} className="mr-2 text-red-600"/> Attention Required</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-red-700">Expiring Trials</span>
                <span className="font-mono font-black text-white bg-red-600 px-2 py-0.5 rounded">0</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-red-700">Open Support Tickets</span>
                <span className="font-mono font-black text-red-600">0</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
