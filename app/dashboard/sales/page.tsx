"use client";
import React, { useState, useEffect } from "react";
import { useOutlet } from "../../context/OutletContext";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { 
  ReceiptIndianRupee, Banknote, CreditCard, Smartphone, 
  Search, Printer, Loader2, ArrowUpRight, Filter, CalendarDays, 
  ChevronDown, ChevronUp, Lock, X, CheckCircle, ShieldAlert, FileText
} from "lucide-react";

export default function LiveSalesPage() {
  const { selectedOutlet, outlets } = useOutlet();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // 🟢 State for Filters & Expand (Synced with URL)
  const [dateFilter, setDateFilter] = useState("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // 🟢 Security Modal States
  const [authModal, setAuthModal] = useState<{isOpen: boolean, action: 'CANCEL' | 'SETTLE' | null, order: any}>({ isOpen: false, action: null, order: null });
  const [adminPassword, setAdminPassword] = useState("");
  const [settleMode, setSettleMode] = useState("CASH");
  const [partCash, setPartCash] = useState("");
  const [partCard, setPartCard] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // 🟢 Read initial date from URL (If coming from Dashboard)
  useEffect(() => {
    if (searchParams) {
      if (searchParams.get("date")) setDateFilter(searchParams.get("date") as string);
      if (searchParams.get("startDate")) setCustomStart(searchParams.get("startDate") as string);
      if (searchParams.get("endDate")) setCustomEnd(searchParams.get("endDate") as string);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchSalesData();
  }, [selectedOutlet, dateFilter, customStart, customEnd]);

  const applyDateFilter = (type: string, start?: string, end?: string) => {
    setDateFilter(type);
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("date", type);
    
    if (type === "custom" && start && end) {
      params.set("startDate", start);
      params.set("endDate", end);
    } else if (type !== "custom") {
      params.delete("startDate");
      params.delete("endDate");
      setCustomStart("");
      setCustomEnd("");
    }
    
    if (type !== "custom" || (type === "custom" && start && end)) {
      router.push(`${pathname}?${params.toString()}`);
    }
  };

  const fetchSalesData = async () => {
    if (dateFilter === "custom" && (!customStart || !customEnd)) return;
    setLoading(true);
    try {
      let url = `/api/brand/sales?outletId=${selectedOutlet}&date=${dateFilter}`;
      if (dateFilter === "custom") url += `&startDate=${customStart}&endDate=${customEnd}`;
      
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) setData(json);
    } catch (e) {
      console.error("Sales Sync Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSecureAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword) return alert("Password required!");
    setIsProcessing(true);

    try {
      const res = await fetch(`/api/brand/sales`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: authModal.order.id,
          action: authModal.action,
          password: adminPassword,
          paymentMode: settleMode,
          partCash: partCash || 0,
          partCard: partCard || 0
        })
      });
      const json = await res.json();
      if (json.success) {
        alert(`✅ ${json.message}`);
        setAuthModal({ isOpen: false, action: null, order: null });
        setAdminPassword("");
        fetchSalesData(); // Refresh Data
      } else {
        alert(`❌ ${json.error}`);
      }
    } catch (error) {
      alert("Network Error");
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerPrint = () => window.print();

  if (loading && !data) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Decrypting Financial Ledgers...</p>
      </div>
    );
  }

  const { orders, metrics } = data || { orders: [], metrics: { paymentBreakdown: {}, platformBreakdown: {} } };

  const filteredOrders = orders.filter((o: any) => 
    o.billNumber.toString().includes(searchQuery) || 
    (o.customer?.phone && o.customer.phone.includes(searchQuery))
  );

  return (
    <div className="max-w-[1400px] mx-auto animate-in fade-in duration-300 h-full flex flex-col pb-8">
      
      {/* 🖨️ PROFESSIONAL PRINT-ONLY HEADER */}
      <div className="hidden print:block mb-8 text-center border-b-2 border-black pb-4">
        <h1 className="text-3xl font-black uppercase tracking-tight">RamKesar Foods - Sales Ledger</h1>
        <div className="flex justify-between items-center mt-4">
          <p className="text-sm font-bold uppercase">Outlet: <span className="font-black">{selectedOutlet === "ALL" ? "ALL BRANCHES" : outlets.find((o:any)=>o.id===selectedOutlet)?.name}</span></p>
          <p className="text-sm font-bold uppercase">Date Period: <span className="font-black">{dateFilter}</span></p>
          <p className="text-sm font-bold uppercase">Printed On: <span className="font-black">{new Date().toLocaleString()}</span></p>
        </div>
      </div>

      {/* 💻 Header & Export Actions (Hidden on Print) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0 print:hidden">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
            <ReceiptIndianRupee className="mr-2 text-indigo-600" /> Sales & Billing
          </h1>
          <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">
            {selectedOutlet === "ALL" ? "Combined HQ View" : "Branch Specific Ledger"}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Page Level Date Filter */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
              <CalendarDays size={15} className="text-indigo-600 mr-2" />
              <select 
                value={dateFilter} 
                onChange={(e) => applyDateFilter(e.target.value, customStart, customEnd)}
                className="bg-transparent text-[10px] font-black text-slate-700 uppercase tracking-widest outline-none cursor-pointer"
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="all">All Time</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
            {dateFilter === "custom" && (
              <div className="flex items-center bg-white border border-slate-200 rounded-xl px-2 py-1.5 shadow-sm">
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="text-[10px] p-1 font-bold outline-none bg-transparent"/>
                <span className="mx-1 text-slate-300">-</span>
                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="text-[10px] p-1 font-bold outline-none bg-transparent"/>
                <button 
                  onClick={() => applyDateFilter("custom", customStart, customEnd)}
                  disabled={!customStart || !customEnd}
                  className="ml-2 px-2 py-1 bg-indigo-600 text-white rounded text-[9px] font-black uppercase disabled:opacity-50"
                >
                  GO
                </button>
              </div>
            )}
          </div>

          <button onClick={triggerPrint} className="bg-slate-900 hover:bg-black text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center transition-all shadow-md">
            <Printer size={14} className="mr-2" /> Print Ledger
          </button>
        </div>
      </div>

      {/* 📊 Payment Metrics Row (Visible on Screen & Perfectly aligned on Print) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6 shrink-0 print:grid-cols-5 print:gap-4 print:mb-8">
        <div className="bg-slate-900 print:bg-white print:text-black print:border-black p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-center text-white relative overflow-hidden print:shadow-none print:border-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 print:text-slate-600">Total Net Revenue</span>
          <p className="text-2xl font-mono font-black text-white print:text-black mt-2">₹{metrics.totalRevenue?.toLocaleString() || 0}</p>
          <p className="text-[10px] text-emerald-400 print:text-slate-500 font-bold mt-1 uppercase tracking-widest">{metrics.totalOrders || 0} Bills Generated</p>
        </div>
        <div className="bg-white print:border-black p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center print:shadow-none print:border-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 print:text-slate-600">Cash Collections</span>
          <p className="text-xl font-mono font-black text-emerald-600 print:text-black mt-2">₹{metrics.paymentBreakdown?.CASH?.toLocaleString() || 0}</p>
        </div>
        <div className="bg-white print:border-black p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center print:shadow-none print:border-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 print:text-slate-600">UPI / Cards</span>
          <p className="text-xl font-mono font-black text-blue-600 print:text-black mt-2">
            ₹{((metrics.paymentBreakdown?.UPI || 0) + (metrics.paymentBreakdown?.CARD || 0)).toLocaleString()}
          </p>
        </div>
        <div className="bg-white print:border-black p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center print:shadow-none print:border-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 print:text-slate-600">Zomato / Swiggy</span>
          <p className="text-xl font-mono font-black text-amber-600 print:text-black mt-2">
            ₹{((metrics.platformBreakdown?.ZOMATO || 0) + (metrics.platformBreakdown?.SWIGGY || 0)).toLocaleString()}
          </p>
        </div>
        <div className="bg-white print:border-black p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center print:shadow-none print:border-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 print:text-slate-600">App Delivery</span>
          <p className="text-xl font-mono font-black text-indigo-600 print:text-black mt-2">₹{metrics.platformBreakdown?.RAMKESAR_APP?.toLocaleString() || 0}</p>
        </div>
      </div>

      {/* 🧾 Main Ledger Table */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden print:border-0 print:shadow-none">
        
        {/* Table Controls (Hidden on Print) */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0 print:hidden">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Search Bill No or Phone..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all bg-white" 
            />
          </div>
        </div>

        {/* Scrollable Table Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar print:overflow-visible">
          <table className="w-full text-left print:border-collapse">
            <thead className="bg-white sticky top-0 border-b border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400 z-10 shadow-sm print:shadow-none print:border-b-2 print:border-black">
              <tr>
                <th className="p-4 print:py-2 print:px-1">Bill No / Time</th>
                {selectedOutlet === "ALL" && <th className="p-4 print:py-2 print:px-1">Location</th>}
                <th className="p-4 print:py-2 print:px-1">Customer / Platform</th>
                <th className="p-4 print:py-2 print:px-1">Order Type</th>
                <th className="p-4 print:py-2 print:px-1 text-center">Payment Mode</th>
                <th className="p-4 print:py-2 print:px-1 text-right">Total Amount</th>
                <th className="p-4 w-10 print:hidden text-center">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm font-bold text-slate-700 print:divide-slate-300">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center">
                    <ReceiptIndianRupee size={40} className="mx-auto text-slate-200 mb-3" />
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">No Sales Records Found</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order: any) => (
                  <React.Fragment key={order.id}>
                    <tr 
                      className={`hover:bg-slate-50 transition-colors group cursor-pointer ${order.status === "CANCELLED" ? "opacity-50" : ""} ${expandedRow === order.id ? 'bg-indigo-50/20' : ''}`} 
                      onClick={() => setExpandedRow(expandedRow === order.id ? null : order.id)}
                    >
                      <td className="p-4 print:py-2 print:px-1">
                        <div className={`font-mono text-xs ${order.status === 'CANCELLED' ? 'text-red-500 line-through print:text-black' : 'text-indigo-600 print:text-black'}`}>#{order.billNumber}</div>
                        <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-black">
                          {new Date(order.createdAt).toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </td>
                      
                      {selectedOutlet === "ALL" && (
                        <td className="p-4 print:py-2 print:px-1 text-[10px] text-slate-500 uppercase tracking-widest">
                          {order.outlet?.name}
                        </td>
                      )}
                      
                      <td className="p-4 print:py-2 print:px-1">
                        <div className="text-xs uppercase text-slate-800">{order.customer?.name || order.platform || "Walk-In"}</div>
                        {order.customer?.phone && <div className="text-[10px] font-mono text-slate-400">{order.customer.phone}</div>}
                      </td>

                      <td className="p-4 print:py-2 print:px-1">
                        <span className={`px-2 py-1 rounded text-[9px] uppercase tracking-widest border print:border-0 print:p-0 print:bg-transparent ${order.orderType === 'DINE_IN' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                          {order.orderType.replace("_", " ")}
                        </span>
                      </td>

                      <td className="p-4 print:py-2 print:px-1 text-center">
                        <span className="bg-slate-100 text-slate-600 border border-slate-200 print:border-0 print:p-0 print:bg-transparent px-2 py-1 rounded text-[9px] uppercase tracking-widest font-black">
                          {order.paymentMode}
                        </span>
                      </td>

                      <td className="p-4 print:py-2 print:px-1 text-right font-mono text-base font-black text-slate-900">
                        ₹{order.totalAmount.toLocaleString()}
                      </td>

                      <td className="p-4 print:hidden text-center text-indigo-600">
                        {expandedRow === order.id ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                      </td>
                    </tr>
                    
                    {/* 🟢 EXPANDED DETAILED ROW (Extremely Professional) */}
                    {expandedRow === order.id && (
                      <tr className="bg-slate-50 border-y border-indigo-100 print:hidden animate-in fade-in slide-in-from-top-2">
                        <td colSpan={7} className="p-6">
                          <div className="flex flex-col lg:flex-row gap-6">
                            
                            {/* Items List */}
                            <div className="flex-1 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                              <h4 className="text-[10px] font-black uppercase text-indigo-800 tracking-widest mb-4 border-b border-indigo-100 pb-2 flex items-center">
                                <FileText size={14} className="mr-2"/> Order Items Details
                              </h4>
                              <ul className="space-y-3">
                                {order.items?.map((item: any) => (
                                  <li key={item.id} className="flex justify-between items-center text-xs font-bold text-slate-700 pb-2 border-b border-slate-50 last:border-0">
                                    <span className="flex items-center gap-2">
                                      <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px]">{item.quantity}x</span>
                                      {item.menuItem?.name || "Unknown Item"}
                                    </span>
                                    <span className="font-mono text-slate-900">₹{item.price * item.quantity}</span>
                                  </li>
                                ))}
                              </ul>
                              
                              <div className="mt-5 pt-4 border-t-2 border-dashed border-slate-200 grid grid-cols-2 gap-y-3 gap-x-4 text-[10px] uppercase font-black tracking-widest text-slate-500">
                                <div className="flex justify-between">Subtotal: <span className="font-mono text-slate-800">₹{(order.totalAmount - order.cgst - order.sgst - order.packingCharges + order.discount).toFixed(2)}</span></div>
                                <div className="flex justify-between">Taxes (GST): <span className="font-mono text-slate-800">₹{(order.cgst + order.sgst).toFixed(2)}</span></div>
                                <div className="flex justify-between">Packing: <span className="font-mono text-slate-800">₹{order.packingCharges}</span></div>
                                <div className="flex justify-between">Discount: <span className="font-mono text-red-500">-₹{order.discount}</span></div>
                                <div className="col-span-2 flex justify-between items-center mt-2 pt-2 border-t border-slate-200">
                                  <span className="text-xs text-indigo-700">Grand Total</span>
                                  <span className="font-mono text-lg text-indigo-700">₹{order.totalAmount.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Action Panel */}
                            <div className="w-full lg:w-72 bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm flex flex-col justify-between">
                              <div>
                                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-4 flex items-center">
                                  <ShieldAlert size={14} className="mr-2"/> Secure Admin Actions
                                </h4>
                                <div className="space-y-3">
                                  {order.status !== "CANCELLED" && (
                                    <>
                                      <button onClick={() => setAuthModal({ isOpen: true, action: 'SETTLE', order })} className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center shadow-sm">
                                        <CheckCircle size={14} className="mr-2"/> Settle / Update Pay
                                      </button>
                                      <button onClick={() => setAuthModal({ isOpen: true, action: 'CANCEL', order })} className="w-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center shadow-sm">
                                        <X size={14} className="mr-2"/> Cancel Bill
                                      </button>
                                    </>
                                  )}
                                  {order.status === "CANCELLED" && (
                                    <div className="text-center p-4 bg-slate-50 border border-slate-200 rounded-xl text-[10px] text-red-500 font-black uppercase tracking-widest">
                                      This Bill is Voided / Cancelled
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🟢 PASSWORD PROTECTION MODAL (Requires Admin Auth to Update) */}
      {authModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black uppercase text-slate-900 flex items-center">
                <Lock size={16} className="text-indigo-600 mr-2"/> Authorize Action
              </h3>
              <button onClick={() => setAuthModal({isOpen: false, action: null, order: null})} className="text-slate-400 hover:text-red-500 bg-slate-100 p-1 rounded-full"><X size={16}/></button>
            </div>
            
            <p className="text-xs font-bold text-slate-500 mb-5">
              You are about to <strong className={`uppercase ${authModal.action === 'CANCEL' ? 'text-red-600' : 'text-emerald-600'}`}>{authModal.action}</strong> Bill #{authModal.order?.billNumber}. This action is logged.
            </p>

            <form onSubmit={handleSecureAction} className="space-y-5">
              {authModal.action === "SETTLE" && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-2">Select Payment Mode</label>
                  <select value={settleMode} onChange={(e) => setSettleMode(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold bg-white mb-2 outline-none focus:border-indigo-500">
                    <option value="CASH">CASH</option>
                    <option value="UPI">UPI (QR)</option>
                    <option value="CARD">CREDIT/DEBIT CARD</option>
                    <option value="PART">PART PAYMENT</option>
                  </select>
                  {settleMode === "PART" && (
                    <div className="grid grid-cols-2 gap-3 mt-3 animate-in fade-in">
                      <input type="number" placeholder="Cash ₹" value={partCash} onChange={(e)=>setPartCash(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500" />
                      <input type="number" placeholder="Card/UPI ₹" value={partCard} onChange={(e)=>setPartCard(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500" />
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-2">Admin Password</label>
                <input 
                  type="password" required 
                  placeholder="Enter your login password" 
                  value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} 
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm font-mono focus:border-indigo-500 outline-none transition-colors"
                />
              </div>

              <button disabled={isProcessing} type="submit" className={`w-full text-white py-3.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center transition-all shadow-md active:scale-95 ${authModal.action === 'CANCEL' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                {isProcessing ? <Loader2 size={16} className="animate-spin"/> : `Confirm & ${authModal.action}`}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
