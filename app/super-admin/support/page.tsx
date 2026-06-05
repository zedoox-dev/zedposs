"use client";
import { useState, useEffect } from "react";
import { HeadphonesIcon, Search, Loader2, Filter, AlertTriangle, AlertCircle, Clock, CheckCircle2, Building2, Mail, MessageSquare, ChevronRight, X } from "lucide-react";

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");

  // Modal State
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/super-admin/support");
      const data = await res.json();
      if (data.success) {
        setTickets(data.tickets);
      }
    } catch (e) {
      console.error("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch("/api/super-admin/support", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus })
      });
      if (res.ok) {
        setTickets(tickets.map(t => t.id === id ? { ...t, status: newStatus } : t));
        setSelectedTicket((prev: any) => ({ ...prev, status: newStatus }));
        alert("✅ Ticket status updated successfully.");
      }
    } catch (e) {
      alert("Failed to update ticket.");
    } finally {
      setIsUpdating(false);
    }
  };

  // --- Filtering Logic ---
  const filteredTickets = tickets.filter(t => {
    const matchSearch = t.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        t.ticketNumber.toString().includes(searchQuery) ||
                        t.tenant?.businessName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === "ALL" || t.status === statusFilter;
    const matchPriority = priorityFilter === "ALL" || t.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  // --- Metrics ---
  const openCount = tickets.filter(t => t.status === "OPEN").length;
  const inProgressCount = tickets.filter(t => t.status === "IN_PROGRESS").length;
  const resolvedCount = tickets.filter(t => t.status === "RESOLVED").length;
  const criticalCount = tickets.filter(t => t.priority === "CRITICAL" && t.status !== "CLOSED" && t.status !== "RESOLVED").length;

  // --- UI Helpers ---
  const getStatusUI = (status: string) => {
    switch(status) {
      case "OPEN": return { color: "bg-red-100 text-red-700 border-red-200", icon: <AlertCircle size={12} className="mr-1"/>, label: "Open" };
      case "IN_PROGRESS": return { color: "bg-amber-100 text-amber-700 border-amber-200", icon: <Clock size={12} className="mr-1"/>, label: "In Progress" };
      case "RESOLVED": return { color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle2 size={12} className="mr-1"/>, label: "Resolved" };
      case "CLOSED": return { color: "bg-slate-100 text-slate-600 border-slate-200", icon: <CheckCircle2 size={12} className="mr-1"/>, label: "Closed" };
      default: return { color: "bg-slate-100 text-slate-600", icon: null, label: status };
    }
  };

  const getPriorityUI = (priority: string) => {
    switch(priority) {
      case "CRITICAL": return "bg-red-500 text-white shadow-red-500/30";
      case "HIGH": return "bg-orange-500 text-white shadow-orange-500/30";
      case "MEDIUM": return "bg-blue-500 text-white shadow-blue-500/30";
      case "LOW": return "bg-slate-400 text-white shadow-slate-400/30";
      default: return "bg-slate-200 text-slate-600";
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto h-full flex flex-col animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
            <HeadphonesIcon className="mr-2 text-blue-600" /> Support Desk
          </h1>
          <p className="text-xs text-slate-500 font-bold mt-1 tracking-wide">Manage tenant issues, technical bugs, and billing queries.</p>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 shrink-0">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Needs Action (Open)</span>
          <p className="text-2xl font-mono font-black text-red-600">{openCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Working (In Progress)</span>
          <p className="text-2xl font-mono font-black text-amber-600">{inProgressCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Resolved Tickets</span>
          <p className="text-2xl font-mono font-black text-emerald-600">{resolvedCount}</p>
        </div>
        <div className={`p-4 rounded-xl border shadow-sm flex flex-col justify-center ${criticalCount > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
          <span className={`text-[10px] font-black uppercase tracking-widest block mb-1 ${criticalCount > 0 ? 'text-red-500' : 'text-slate-400'}`}>Active Critical Issues</span>
          <p className={`text-2xl font-mono font-black ${criticalCount > 0 ? 'text-red-700' : 'text-slate-500'}`}>{criticalCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 shrink-0 bg-white p-3 border border-slate-200 rounded-2xl shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" placeholder="Search by Ticket #, Subject or Client..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 bg-slate-50 transition-colors" />
        </div>
        <div className="flex items-center space-x-2">
          <Filter size={14} className="text-slate-400"/>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="p-2 border border-slate-200 rounded-xl font-bold text-xs outline-none bg-slate-50 uppercase text-slate-700 focus:border-blue-500">
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="p-2 border border-slate-200 rounded-xl font-bold text-xs outline-none bg-slate-50 uppercase text-slate-700 focus:border-blue-500">
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Tickets List */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex justify-center items-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>
        ) : filteredTickets.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <HeadphonesIcon size={60} className="mb-4 opacity-20" />
            <p className="font-black text-lg uppercase tracking-widest">No Tickets Found</p>
          </div>
        ) : (
          <div className="overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 z-10">
                <tr className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <th className="p-4 w-24">Ticket #</th>
                  <th className="p-4">Subject & Details</th>
                  <th className="p-4">Tenant (Client)</th>
                  <th className="p-4 text-center">Priority</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-bold text-slate-700">
                {filteredTickets.map((t) => {
                  const uiStatus = getStatusUI(t.status);
                  const prioColor = getPriorityUI(t.priority);

                  return (
                    <tr key={t.id} onClick={() => setSelectedTicket(t)} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                      <td className="p-4 font-mono text-slate-500 font-black">
                        #{t.ticketNumber}
                      </td>
                      <td className="p-4">
                        <div className="font-black text-slate-900 mb-0.5 group-hover:text-blue-600 transition-colors">{t.subject}</div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Category: {t.category} • {new Date(t.createdAt).toLocaleDateString('en-IN')}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center font-black text-slate-700 uppercase text-xs mb-0.5"><Building2 size={12} className="mr-1.5 text-slate-400"/> {t.tenant?.businessName || "Unknown"}</div>
                        <div className="flex items-center font-mono text-[9px] text-slate-500"><Mail size={10} className="mr-1"/> {t.tenant?.ownerEmail || "N/A"}</div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded shadow-sm ${prioColor}`}>
                          {t.priority}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center border px-2.5 py-1 rounded text-[9px] uppercase font-black tracking-wider ${uiStatus.color}`}>
                          {uiStatus.icon} {uiStatus.label}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button className="p-2 text-slate-400 group-hover:text-blue-600 transition-colors bg-slate-50 group-hover:bg-blue-50 rounded-lg">
                          <ChevronRight size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- TICKET DETAIL & ACTION MODAL --- */}
      {selectedTicket && (
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border-t-8 border-blue-600 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-start shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono font-black text-slate-500 text-sm">#{selectedTicket.ticketNumber}</span>
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${getPriorityUI(selectedTicket.priority)}`}>{selectedTicket.priority}</span>
                  <span className={`inline-flex items-center border px-2 py-0.5 rounded text-[9px] uppercase font-black tracking-wider ${getStatusUI(selectedTicket.status).color}`}>
                    {getStatusUI(selectedTicket.status).label}
                  </span>
                </div>
                <h2 className="text-xl font-black text-slate-900">{selectedTicket.subject}</h2>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full transition-colors"><X size={20}/></button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-6 bg-slate-50">
              
              {/* Client Info Strip */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Tenant Details</p>
                  <p className="font-black text-slate-800 flex items-center"><Building2 size={14} className="mr-1.5 text-blue-500"/> {selectedTicket.tenant?.businessName}</p>
                  <p className="text-xs font-mono text-slate-500 flex items-center mt-1"><Mail size={12} className="mr-1.5"/> {selectedTicket.tenant?.ownerEmail}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Category & Time</p>
                  <p className="font-bold text-xs text-slate-700 uppercase bg-slate-100 px-2 py-1 rounded inline-block">{selectedTicket.category}</p>
                  <p className="text-[10px] font-bold text-slate-500 mt-1">{new Date(selectedTicket.createdAt).toLocaleString('en-IN')}</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-xs font-black uppercase text-slate-800 mb-2 flex items-center"><MessageSquare size={14} className="mr-1.5 text-slate-400"/> Issue Description</h4>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-sm font-bold text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {selectedTicket.description}
                </div>
              </div>

              {/* Action Controls */}
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <h4 className="text-[10px] font-black uppercase text-blue-800 tracking-widest mb-3">Update Status & Resolution</h4>
                <div className="flex items-center gap-3">
                  <select 
                    value={selectedTicket.status} 
                    onChange={(e) => handleUpdateStatus(selectedTicket.id, e.target.value)}
                    disabled={isUpdating}
                    className="flex-1 p-3 rounded-xl border-2 border-blue-200 text-sm font-black uppercase tracking-wider text-blue-800 outline-none bg-white focus:border-blue-500 transition-colors"
                  >
                    <option value="OPEN">Open (Needs Action)</option>
                    <option value="IN_PROGRESS">In Progress (Working)</option>
                    <option value="RESOLVED">Resolved (Fixed)</option>
                    <option value="CLOSED">Closed (Archived)</option>
                  </select>
                  {isUpdating && <Loader2 className="animate-spin text-blue-600" size={24}/>}
                </div>
                <p className="text-[9px] font-bold text-blue-600/70 mt-2">Changing the status will notify the tenant automatically in the future pipeline.</p>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
