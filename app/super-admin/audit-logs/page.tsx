"use client";
import { useState, useEffect } from "react";
import { Activity, Search, Filter, Loader2, ShieldAlert, Key, Server, User, RefreshCcw, Database, ShieldCheck, Clock } from "lucide-react";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState("ALL");
  const [actionFilter, setActionFilter] = useState("ALL");

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/super-admin/audit-logs");
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
      }
    } catch (e) {
      console.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  // Extract unique modules and actions for dynamic dropdowns
  const uniqueModules = Array.from(new Set(logs.map(l => l.module)));
  const uniqueActions = Array.from(new Set(logs.map(l => l.action)));

  const filteredLogs = logs.filter(l => {
    const matchSearch = l.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        l.tenant?.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        l.ipAddress?.includes(searchQuery);
    const matchModule = moduleFilter === "ALL" || l.module === moduleFilter;
    const matchAction = actionFilter === "ALL" || l.action === actionFilter;
    return matchSearch && matchModule && matchAction;
  });

  // UI Helpers for Modules & Actions
  const getModuleUI = (moduleName: string) => {
    switch(moduleName) {
      case "AUTH": return { color: "bg-purple-100 text-purple-700 border-purple-200", icon: <Key size={12} className="mr-1"/> };
      case "SUBSCRIPTION": return { color: "bg-amber-100 text-amber-700 border-amber-200", icon: <Server size={12} className="mr-1"/> };
      case "POS": return { color: "bg-blue-100 text-blue-700 border-blue-200", icon: <Database size={12} className="mr-1"/> };
      case "SYSTEM": return { color: "bg-slate-200 text-slate-700 border-slate-300", icon: <Activity size={12} className="mr-1"/> };
      default: return { color: "bg-slate-100 text-slate-600 border-slate-200", icon: <Server size={12} className="mr-1"/> };
    }
  };

  const getActionColor = (actionName: string) => {
    if (actionName.includes("FAIL") || actionName.includes("ERROR") || actionName.includes("DELETE")) return "text-red-600 bg-red-50 border-red-100";
    if (actionName.includes("LOGIN") || actionName.includes("SUCCESS") || actionName.includes("CREATE")) return "text-emerald-600 bg-emerald-50 border-emerald-100";
    if (actionName.includes("CHANGE") || actionName.includes("UPDATE")) return "text-orange-600 bg-orange-50 border-orange-100";
    return "text-slate-600 bg-slate-50 border-slate-200";
  };

  return (
    <div className="max-w-[1400px] mx-auto h-full flex flex-col animate-in fade-in duration-300">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
            <ShieldAlert className="mr-2 text-slate-700" /> Security Audit Logs
          </h1>
          <p className="text-xs text-slate-500 font-bold mt-1 tracking-wide">Track system-wide activity, logins, and permission changes.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg">
            <ShieldCheck size={14} className="mr-1.5"/> System Monitoring Active
          </div>
          <button onClick={fetchLogs} className="p-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors shadow-md active:scale-95">
            <RefreshCcw size={16} />
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 shrink-0 bg-white p-3 border border-slate-200 rounded-2xl shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" placeholder="Search by Business Name, Description, or IP Address..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-slate-800 bg-slate-50 transition-colors" />
        </div>
        <div className="flex items-center space-x-2">
          <Filter size={14} className="text-slate-400"/>
          <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} className="p-2 border border-slate-200 rounded-xl font-bold text-xs outline-none bg-slate-50 uppercase text-slate-700 focus:border-slate-800 w-40">
            <option value="ALL">All Modules</option>
            {uniqueModules.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="p-2 border border-slate-200 rounded-xl font-bold text-xs outline-none bg-slate-50 uppercase text-slate-700 focus:border-slate-800 w-40">
            <option value="ALL">All Actions</option>
            {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex justify-center items-center"><Loader2 className="animate-spin text-slate-800" size={40} /></div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
            <Activity size={60} className="mb-4 opacity-20" />
            <p className="font-black text-lg uppercase tracking-widest text-slate-500">No Logs Recorded</p>
            <p className="text-xs font-bold mt-1">System activity will appear here in real-time.</p>
          </div>
        ) : (
          <div className="overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead className="bg-slate-900 sticky top-0 z-10">
                <tr className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                  <th className="p-4 w-48 border-r border-slate-800">Timestamp</th>
                  <th className="p-4 text-center border-r border-slate-800">Module</th>
                  <th className="p-4 text-center border-r border-slate-800">Action Type</th>
                  <th className="p-4 border-r border-slate-800">Tenant / Business</th>
                  <th className="p-4">Activity Description</th>
                  <th className="p-4 text-right">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-bold text-slate-700">
                {filteredLogs.map((log) => {
                  const moduleUI = getModuleUI(log.module);
                  const actionColor = getActionColor(log.action);

                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-mono text-[11px] text-slate-500 flex items-center">
                        <Clock size={12} className="mr-1.5 text-slate-400"/> {new Date(log.createdAt).toLocaleString('en-IN')}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center border px-2.5 py-1 rounded text-[9px] uppercase font-black tracking-wider ${moduleUI.color}`}>
                          {moduleUI.icon} {log.module}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center border px-2.5 py-1 rounded text-[9px] uppercase font-black tracking-wider ${actionColor}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-4">
                        {log.tenant ? (
                          <>
                            <div className="font-black text-slate-800 uppercase text-xs flex items-center mb-0.5"><User size={12} className="mr-1 text-slate-400"/> {log.tenant.businessName}</div>
                            <div className="text-[10px] font-mono text-slate-500">{log.tenant.ownerEmail}</div>
                          </>
                        ) : (
                          <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">System Admin</span>
                        )}
                      </td>
                      <td className="p-4 text-xs text-slate-600">
                        {log.description}
                      </td>
                      <td className="p-4 text-right font-mono text-[10px] text-slate-500">
                        {log.ipAddress || "N/A"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
