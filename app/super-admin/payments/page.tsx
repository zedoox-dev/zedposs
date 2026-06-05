"use client";
import { useState, useEffect } from "react";
import { CreditCard, Loader2, Search, Filter, CheckCircle2, XCircle, Clock, RotateCcw, Download, IndianRupee, ShieldAlert, ArrowRightLeft } from "lucide-react";

export default function PaymentManagementPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [gatewayFilter, setGatewayFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/super-admin/payments");
      const data = await res.json();
      if (data.success) {
        setPayments(data.payments);
      }
    } catch (e) {
      console.error("Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async (id: string, currentStatus: string) => {
    if (currentStatus !== "SUCCESS") return alert("Only successful transactions can be refunded.");
    if (!confirm("Are you sure you want to issue a refund? This action will reverse the gateway charge.")) return;

    // Optimistic Update
    setPayments(prev => prev.map(p => p.id === id ? { ...p, status: "REFUNDED" } : p));

    try {
      await fetch("/api/super-admin/payments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "REFUNDED" })
      });
      alert("Refund initiated successfully!");
    } catch (e) {
      alert("Failed to initiate refund. Check Gateway API.");
      fetchPayments(); // Rollback
    }
  };

  // --- Derived Metrics ---
  const totalVolume = payments.filter(p => p.status === "SUCCESS").reduce((sum, p) => sum + p.amount, 0);
  const successCount = payments.filter(p => p.status === "SUCCESS").length;
  const successRate = payments.length > 0 ? ((successCount / payments.length) * 100).toFixed(1) : "0.0";
  const failedCount = payments.filter(p => p.status === "FAILED").length;
  const pendingCount = payments.filter(p => p.status === "PENDING").length;

  // --- Filtering Logic ---
  const filteredPayments = payments.filter(p => {
    const matchSearch = p.id.toLowerCase().includes(searchQuery.toLowerCase()) || p.tenantName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchGateway = gatewayFilter === "ALL" || p.gateway === gatewayFilter;
    const matchStatus = statusFilter === "ALL" || p.status === statusFilter;
    return matchSearch && matchGateway && matchStatus;
  });

  return (
    <div className="max-w-[1400px] mx-auto h-full flex flex-col animate-in fade-in duration-300">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
            <CreditCard className="mr-2 text-blue-600" /> Gateway Logs
          </h1>
          <p className="text-xs text-slate-500 font-bold mt-1 tracking-wide">Monitor SaaS subscription payments and refunds.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center shadow-lg active:scale-95 transition-all whitespace-nowrap">
            <Download size={16} className="mr-1.5" /> Export Logs
          </button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 shrink-0">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Processed (Success)</span>
            <IndianRupee size={16} className="text-emerald-500"/>
          </div>
          <p className="text-2xl font-mono font-black text-slate-900">₹{totalVolume.toLocaleString()}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Transaction Success Rate</span>
            <CheckCircle2 size={16} className="text-blue-500"/>
          </div>
          <p className="text-2xl font-mono font-black text-slate-900">{successRate}%</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Failed Attempts</span>
            <ShieldAlert size={16} className="text-red-500"/>
          </div>
          <p className="text-2xl font-mono font-black text-red-600">{failedCount} Declines</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Pending Approvals</span>
            <Clock size={16} className="text-amber-500"/>
          </div>
          <p className="text-2xl font-mono font-black text-amber-600">{pendingCount} Awaiting</p>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 shrink-0 bg-white p-3 border border-slate-200 rounded-2xl shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" placeholder="Search Transaction ID or Client Name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 bg-slate-50 transition-colors" />
        </div>
        <div className="flex items-center space-x-2">
          <Filter size={14} className="text-slate-400"/>
          <select value={gatewayFilter} onChange={(e) => setGatewayFilter(e.target.value)} className="p-2 border border-slate-200 rounded-xl font-bold text-xs outline-none bg-slate-50 uppercase text-slate-700 focus:border-blue-500">
            <option value="ALL">All Gateways</option>
            <option value="RAZORPAY">Razorpay</option>
            <option value="STRIPE">Stripe</option>
            <option value="CASHFREE">Cashfree</option>
            <option value="PAYU">PayU</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="p-2 border border-slate-200 rounded-xl font-bold text-xs outline-none bg-slate-50 uppercase text-slate-700 focus:border-blue-500">
            <option value="ALL">All Statuses</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILED">Failed</option>
            <option value="PENDING">Pending</option>
            <option value="REFUNDED">Refunded</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex justify-center items-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>
        ) : filteredPayments.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <ArrowRightLeft size={60} className="mb-4 opacity-20" />
            <p className="font-black text-lg uppercase tracking-widest">No Transactions Found</p>
          </div>
        ) : (
          <div className="overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 z-10">
                <tr className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <th className="p-4">Transaction Details</th>
                  <th className="p-4">Client (Tenant)</th>
                  <th className="p-4 text-center">Gateway</th>
                  <th className="p-4 text-center">Amount</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-bold text-slate-700">
                {filteredPayments.map((p) => {
                  
                  // Status Styles
                  let statusUI = { color: "", icon: <Clock size={12}/> };
                  if (p.status === "SUCCESS") statusUI = { color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle2 size={12} className="mr-1"/> };
                  else if (p.status === "FAILED") statusUI = { color: "bg-red-100 text-red-700 border-red-200", icon: <XCircle size={12} className="mr-1"/> };
                  else if (p.status === "PENDING") statusUI = { color: "bg-amber-100 text-amber-700 border-amber-200", icon: <Clock size={12} className="mr-1"/> };
                  else if (p.status === "REFUNDED") statusUI = { color: "bg-slate-200 text-slate-600 border-slate-300", icon: <RotateCcw size={12} className="mr-1"/> };

                  // Gateway Styles
                  let gatewayUI = "bg-slate-100 text-slate-600";
                  if (p.gateway === "RAZORPAY") gatewayUI = "bg-blue-50 text-blue-600 border-blue-200";
                  else if (p.gateway === "STRIPE") gatewayUI = "bg-indigo-50 text-indigo-600 border-indigo-200";
                  else if (p.gateway === "CASHFREE") gatewayUI = "bg-orange-50 text-orange-600 border-orange-200";
                  else if (p.gateway === "PAYU") gatewayUI = "bg-emerald-50 text-emerald-600 border-emerald-200";

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="p-4">
                        <div className="font-mono text-slate-900 font-black">{p.id}</div>
                        <div className="text-[10px] text-slate-500 uppercase mt-0.5">{new Date(p.date).toLocaleString('en-IN')}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-black text-slate-800 uppercase">{p.tenantName}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{p.plan} Plan</div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded border ${gatewayUI}`}>
                          {p.gateway}
                        </span>
                      </td>
                      <td className="p-4 text-center font-mono font-black text-slate-800 text-lg">
                        ₹{p.amount.toFixed(2)}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center border px-2.5 py-1 rounded text-[9px] uppercase font-black tracking-wider ${statusUI.color}`}>
                          {statusUI.icon} {p.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => handleRefund(p.id, p.status)} 
                          disabled={p.status !== "SUCCESS"}
                          className={`px-3 py-1.5 rounded text-[10px] font-black uppercase transition-all inline-flex items-center ${p.status === "SUCCESS" ? 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 shadow-sm active:scale-95' : 'bg-slate-50 text-slate-300 cursor-not-allowed'}`}
                        >
                          <RotateCcw size={12} className="mr-1.5"/> Issue Refund
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

    </div>
  );
}
