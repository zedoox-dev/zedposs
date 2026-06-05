"use client";
import { useState, useEffect } from "react";
import { LayoutDashboard, Building2, IndianRupee, Activity, AlertCircle, RefreshCcw, Loader2, ArrowRight, Plus, TerminalSquare, ShieldCheck, Clock, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function SuperAdminDashboard() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/super-admin/dashboard");
      const data = await res.json();
      if (data.success) {
        setDashboardData(data);
      }
    } catch (e) {
      console.error("Failed to fetch dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading || !dashboardData) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
        <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest">Initializing Mainframe...</h2>
      </div>
    );
  }

  const { metrics, recentTenants, recentActivity } = dashboardData;

  return (
    <div className="max-w-[1400px] mx-auto h-full flex flex-col animate-in fade-in duration-300">
      
      {/* Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
            <LayoutDashboard className="mr-2 text-blue-600" /> SaaS Master Control
          </h1>
          <p className="text-xs text-slate-500 font-bold mt-1 tracking-wide">Welcome back. Here is the live status of the Ramkesar network.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button onClick={fetchDashboardData} className="p-2.5 bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors shadow-sm active:scale-95">
            <RefreshCcw size={18} />
          </button>
          <Link href="/super-admin/businesses" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center shadow-lg shadow-blue-500/30 active:scale-95 transition-all whitespace-nowrap">
            <Plus size={16} className="mr-1.5" /> Onboard Client
          </Link>
        </div>
      </div>

      {/* Top KPI Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8 shrink-0">
        
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center relative overflow-hidden group hover:border-blue-300 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block z-10">Total Network Volume (TPV)</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg z-10"><IndianRupee size={18}/></div>
          </div>
          <p className="text-3xl font-mono font-black text-slate-900 z-10">₹{(metrics.platformTPV / 100000).toFixed(2)}L</p>
          <div className="absolute -right-6 -bottom-6 opacity-[0.03] group-hover:opacity-10 transition-opacity"><IndianRupee size={100}/></div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center relative overflow-hidden group hover:border-indigo-300 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block z-10">Active Tenant Brands</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg z-10"><Building2 size={18}/></div>
          </div>
          <p className="text-3xl font-mono font-black text-slate-900 z-10">{metrics.activeTenants} <span className="text-sm text-slate-400">/ {metrics.totalTenants}</span></p>
          <div className="absolute -right-6 -bottom-6 opacity-[0.03] group-hover:opacity-10 transition-opacity"><Building2 size={100}/></div>
        </div>

        <Link href="/super-admin/support" className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center relative overflow-hidden group hover:border-red-300 transition-colors cursor-pointer">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block z-10">Unresolved Tickets</span>
            <div className={`p-2 rounded-lg z-10 ${metrics.openTickets > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
              {metrics.openTickets > 0 ? <AlertCircle size={18}/> : <CheckCircle2 size={18}/>}
            </div>
          </div>
          <p className={`text-3xl font-mono font-black z-10 ${metrics.openTickets > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{metrics.openTickets}</p>
          <div className="absolute -right-6 -bottom-6 opacity-[0.03] group-hover:opacity-10 transition-opacity"><AlertCircle size={100}/></div>
        </Link>

        <Link href="/super-admin/monitoring" className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-center relative overflow-hidden group cursor-pointer text-white">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block z-10">Hardware Node RAM</span>
            <div className="p-2 bg-slate-800 text-blue-400 rounded-lg z-10"><Activity size={18}/></div>
          </div>
          <p className="text-3xl font-mono font-black text-white z-10">{metrics.serverRam}%</p>
          <div className="w-full h-1.5 bg-slate-800 rounded-full mt-3 overflow-hidden z-10">
            <div className={`h-full rounded-full ${Number(metrics.serverRam) > 80 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${metrics.serverRam}%` }}></div>
          </div>
          <div className="absolute -right-6 -bottom-6 opacity-5 group-hover:opacity-10 transition-opacity"><Activity size={100}/></div>
        </Link>

      </div>

      {/* Main Content Split */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 overflow-hidden pb-10">
        
        {/* Left Col: Recent Onboardings */}
        <div className="lg:w-7/12 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center">
              <Building2 size={16} className="mr-2 text-indigo-500"/> Latest Client Deployments
            </h2>
            <Link href="/super-admin/businesses" className="text-[10px] font-black uppercase text-blue-600 hover:text-blue-700 flex items-center transition-colors">
              View Directory <ArrowRight size={14} className="ml-1"/>
            </Link>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {recentTenants.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <Building2 size={40} className="mb-3 opacity-20" />
                <p className="text-xs font-black uppercase tracking-widest">No Clients Yet</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <tbody className="divide-y divide-slate-100 text-sm font-bold text-slate-700">
                  {recentTenants.map((tenant: any) => (
                    <tr key={tenant.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="font-black text-slate-900 uppercase">{tenant.businessName}</div>
                        <div className="text-[10px] font-mono text-slate-500 mt-0.5">{tenant.ownerEmail}</div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded text-[9px] uppercase font-black tracking-wider border ${tenant.isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                          {tenant.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="p-4 text-right text-[10px] font-mono text-slate-400 uppercase">
                        {new Date(tenant.createdAt).toLocaleDateString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Col: System Activity Feed */}
        <div className="lg:w-5/12 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center">
              <TerminalSquare size={16} className="mr-2 text-blue-500"/> Live Audit Log
            </h2>
            <Link href="/super-admin/audit-logs" className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 transition-colors">
              View All
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
            {recentActivity.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <TerminalSquare size={40} className="mb-3 opacity-20" />
                <p className="text-xs font-black uppercase tracking-widest">No Recent Activity</p>
              </div>
            ) : (
              recentActivity.map((log: any) => (
                <div key={log.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-start gap-3">
                  <div className="p-2 bg-white rounded-lg border border-slate-200 shrink-0">
                    {log.action.includes("ERROR") || log.action.includes("FAIL") ? (
                      <AlertCircle size={14} className="text-red-500"/>
                    ) : (
                      <ShieldCheck size={14} className="text-emerald-500"/>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-800 truncate uppercase">{log.action}</p>
                    <p className="text-[10px] font-bold text-slate-500 line-clamp-1 mt-0.5">{log.description}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[9px] font-black uppercase text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                        {log.tenant?.businessName || "System"}
                      </span>
                      <span className="text-[9px] font-mono text-slate-400 flex items-center">
                        <Clock size={10} className="mr-1"/> {new Date(log.createdAt).toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
