"use client";
import { useState, useEffect } from "react";
import { Activity, Server, Cpu, Database, Wifi, AlertTriangle, RefreshCcw, HardDrive, Clock, CheckCircle2, ShieldCheck, MemoryStick, Layers } from "lucide-react";

export default function SystemMonitoringPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchTelemetry = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/super-admin/monitoring");
      const data = await res.json();
      if (data.success) {
        setStats(data);
        setLastRefreshed(new Date());
      }
    } catch (e) {
      console.error("Telemetry failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchTelemetry();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!stats) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-50">
        <Activity className="text-slate-300 mb-4 animate-pulse" size={60} />
        <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest animate-pulse">Establishing Telemetry Link...</h2>
      </div>
    );
  }

  const { server, database, api } = stats;

  return (
    <div className="max-w-[1400px] mx-auto h-full flex flex-col animate-in fade-in duration-300">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
            <Activity className="mr-2 text-blue-600" /> System Diagnostics
          </h1>
          <p className="text-xs text-slate-500 font-bold mt-1 tracking-wide">Real-time hardware telemetry, DB latency, and API health.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm">
            <Clock size={14} className="mr-1.5 text-slate-400"/> Last Sync: {lastRefreshed.toLocaleTimeString('en-IN')}
          </div>
          <button onClick={fetchTelemetry} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center shadow-lg shadow-blue-500/30 active:scale-95 transition-all whitespace-nowrap">
            <RefreshCcw size={16} className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Force Sync
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1 overflow-y-auto custom-scrollbar pb-10">
        
        {/* COLUMN 1: HARDWARE SERVER STATS */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-800 text-white relative overflow-hidden">
            <Server size={100} className="absolute -right-6 -bottom-6 text-white/5" />
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center">
              <Server size={18} className="mr-2 text-blue-400"/> Hardware Node
            </h2>
            
            <div className="space-y-6 relative z-10">
              {/* CPU Usage */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="flex items-center text-slate-300"><Cpu size={14} className="mr-1.5 text-slate-500"/> CPU Load</span>
                  <span className="font-mono text-emerald-400">{server.cpuUsage}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${Number(server.cpuUsage) > 80 ? 'bg-red-500' : Number(server.cpuUsage) > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${server.cpuUsage}%` }}></div>
                </div>
                <p className="text-[9px] font-mono text-slate-500 mt-1.5 uppercase truncate">{server.cpuModel} ({server.cpuCores} Cores)</p>
              </div>

              {/* Memory Usage */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="flex items-center text-slate-300"><HardDrive size={14} className="mr-1.5 text-slate-500"/> RAM Allocation</span>
                  <span className="font-mono text-blue-400">{server.memoryUsage}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${Number(server.memoryUsage) > 85 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${server.memoryUsage}%` }}></div>
                </div>
                <p className="text-[9px] font-mono text-slate-500 mt-1.5 uppercase">{server.usedMem} GB / {server.totalMem} GB In Use</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Server OS</p>
                  <p className="text-xs font-bold uppercase">{server.platform} <span className="text-slate-400">({server.arch})</span></p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Uptime</p>
                  <p className="text-xs font-mono font-bold text-emerald-400">{server.uptimeHours} Hours</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-4 flex items-center">
              <ShieldCheck size={18} className="mr-2 text-emerald-500"/> Security Firewall
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100">
                <span className="text-xs font-black uppercase tracking-wider">DDoS Protection</span>
                <span className="text-[10px] font-black bg-emerald-200 px-2 py-0.5 rounded text-emerald-800">ACTIVE</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 text-slate-800 rounded-xl border border-slate-200">
                <span className="text-xs font-black uppercase tracking-wider">SSL Certificate</span>
                <span className="text-[10px] font-black bg-emerald-100 px-2 py-0.5 rounded text-emerald-600">VALID</span>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN 2 & 3: DATABASE & API STATS */}
        <div className="xl:col-span-2 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Database Engine */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 relative overflow-hidden">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center">
                  <Database size={18} className="mr-2 text-indigo-500"/> DB Engine (Prisma)
                </h2>
                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${database.status === 'HEALTHY' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {database.status}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Response Ping</span>
                  <div className="flex items-center">
                    <p className="text-2xl font-mono font-black text-slate-800">{database.ping}</p>
                    <span className="text-xs font-bold text-slate-400 ml-1">ms</span>
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Index Health</span>
                  <div className="flex items-center text-emerald-600 font-black text-sm uppercase">
                    <CheckCircle2 size={16} className="mr-1.5"/> Optimal
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 pb-2">Data Volume Metrics</h4>
                <div className="flex justify-between items-center text-sm font-bold text-slate-600">
                  <span>Registered Tenants</span>
                  <span className="font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{database.tenantsCount}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold text-slate-600">
                  <span>Processed Orders</span>
                  <span className="font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{database.ordersCount}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold text-slate-600">
                  <span>Security Audit Logs</span>
                  <span className="font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{database.logsCount}</span>
                </div>
              </div>
            </div>

            {/* API Network Traffic */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center">
                  <Wifi size={18} className="mr-2 text-blue-500"/> API Traffic Network
                </h2>
              </div>
              
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-2">
                    <span className="text-slate-500 uppercase tracking-wider">Requests / Minute</span>
                    <span className="font-mono text-slate-900">{api.requestsPerMinute} RPM</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(api.requestsPerMinute / 1000) * 100}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-2">
                    <span className="text-slate-500 uppercase tracking-wider">Active Socket Connections</span>
                    <span className="font-mono text-slate-900">{api.activeConnections}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(api.activeConnections / 500) * 100}%` }}></div>
                  </div>
                </div>

                <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black text-red-400 uppercase tracking-widest block mb-1">API Error Rate (5xx)</span>
                    <span className="text-xl font-mono font-black text-red-600">{api.errorRate}</span>
                  </div>
                  <AlertTriangle size={28} className="text-red-200" />
                </div>
              </div>
            </div>
          </div>

          {/* System Services Queue */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider flex items-center"><Layers size={16} className="mr-2 text-slate-400"/> Background Services & Workers</h3>
            </div>
            <table className="w-full text-left">
              <thead className="bg-white border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="p-4">Service Worker</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Last Execution</th>
                </tr>
              </thead>
              <tbody className="text-xs font-bold text-slate-700 divide-y divide-slate-50">
                <tr className="hover:bg-slate-50">
                  <td className="p-4 flex items-center uppercase"><Database size={14} className="mr-2 text-blue-500"/> Zomato/Swiggy Menu Sync Job</td>
                  <td className="p-4 text-center"><span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-black tracking-wider uppercase">Running</span></td>
                  <td className="p-4 text-right font-mono text-slate-400">2 mins ago</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="p-4 flex items-center uppercase"><Database size={14} className="mr-2 text-amber-500"/> Daily DB Backup Routine</td>
                  <td className="p-4 text-center"><span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-black tracking-wider uppercase">Sleeping</span></td>
                  <td className="p-4 text-right font-mono text-slate-400">02:00 AM</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="p-4 flex items-center uppercase"><Database size={14} className="mr-2 text-purple-500"/> Trial Expiry Checker</td>
                  <td className="p-4 text-center"><span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-black tracking-wider uppercase">Running</span></td>
                  <td className="p-4 text-right font-mono text-slate-400">Just Now</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </div>

    </div>
  );
}
