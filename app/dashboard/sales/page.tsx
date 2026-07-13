"use client";
import React, { useState, useEffect } from "react";
import { useOutlet } from "../../context/OutletContext";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { 
  ReceiptIndianRupee, Banknote, CreditCard, Smartphone, 
  Search, Printer, Loader2, Filter, CalendarDays, 
  Lock, X, CheckCircle, ShieldAlert, FileText, ArrowRight, User
} from "lucide-react";

export default function LiveSalesPage() {
  const { selectedOutlet, outlets } = useOutlet();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // 🟢 State for Filters
  const [dateFilter, setDateFilter] = useState("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  
  // 🟢 Order Details Modal
  const [detailsModal, setDetailsModal] = useState<any | null>(null);

  // 🟢 Security Modal States
  const [authModal, setAuthModal] = useState<{isOpen: boolean, action: 'CANCEL' | 'SETTLE' | null, order: any}>({ isOpen: false, action: null, order: null });
  const [adminPassword, setAdminPassword] = useState("");
  const [settleMode, setSettleMode] = useState("CASH");
  const [partCash, setPartCash] = useState("");
  const [partCard, setPartCard] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

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
        // Close modals and refresh
        setAuthModal({ isOpen: false, action: null, order: null });
        setDetailsModal(null);
        setAdminPassword("");
        fetchSalesData();
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

      {/* 📊 Payment Metrics Row */}
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
            ₹{((metrics.platformBreakdown?.ONLINE_ZOMATO || 0) + (metrics.platformBreakdown?.ONLINE_SWIGGY || 0)).toLocaleString()}
          </p>
        </div>
        <div className="bg-white print:border-black p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center print:shadow-none print:border-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 print:text-slate-600">App Delivery</span>
          <p className="text-xl font-mono font-black text-indigo-600 print:text-black mt-2">₹{metrics.platformBreakdown?.OWN_APP?.toLocaleString() || 0}</p>
        </div>
      </div>

      {/* 🧾 Main Ledger Table */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden print:border-0 print:shadow-none">
        
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
                <th className="p-4 w-10 print:hidden text-center">Action</th>
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
                  <tr key={order.id} className={`hover:bg-slate-50 transition-colors ${order.status === "CANCELLED" ? "opacity-50" : ""}`}>
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

                    <td className="p-4 print:hidden text-center">
                      <button 
                        onClick={() => setDetailsModal(order)}
                        className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 p-2 rounded-lg transition-colors flex items-center mx-auto"
                        title="View Details"
                      >
                        <ArrowRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🟢 FULL SCREEN ORDER DETAILS MODAL */}
      {detailsModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-slate-50 w-full max-w-5xl rounded-3xl shadow-2xl flex flex-col animate-in zoom-in-95 max-h-[90vh] overflow-hidden border border-slate-200">
            
            {/* Modal Header */}
            <div className="bg-white px-6 py-4 flex justify-between items-center border-b border-slate-200 shrink-0">
              <div>
                <h2 className="text-xl font-black text-slate-900 flex items-center uppercase tracking-tight">
                  <FileText className="mr-2 text-indigo-600" /> Order Details <span className="text-indigo-600 ml-2">#{detailsModal.billNumber}</span>
                </h2>
                <p className="text-xs font-bold text-slate-500 mt-1 flex items-center uppercase tracking-widest">
                  {new Date(detailsModal.createdAt).toLocaleString('en-IN', {dateStyle: 'medium', timeStyle: 'short'})} 
                  <span className="mx-2">•</span> 
                  {detailsModal.outlet?.name}
                </p>
              </div>
              <button onClick={() => setDetailsModal(null)} className="p-2 bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body (Grid Layout) */}
            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar flex flex-col lg:flex-row gap-6">
              
              {/* Left Column: Items Table */}
              <div className="flex-[2] bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <div className="bg-slate-100 px-4 py-3 border-b border-slate-200">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">Order Items</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-white border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <tr>
                        <th className="p-4">Item Name</th>
                        <th className="p-4 text-center">Qty</th>
                        <th className="p-4 text-right">Rate</th>
                        <th className="p-4 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-sm font-bold text-slate-700">
                      {detailsModal.items?.map((item: any) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="p-4 text-xs uppercase text-slate-800">{item.menuItem?.name || "Unknown Item"}</td>
                          <td className="p-4 text-center">
                            <span className="bg-slate-100 px-2 py-1 rounded font-black text-slate-900">{item.quantity}</span>
                          </td>
                          {/* 🟢 Using unitPrice from schema to fix NaN */}
                          <td className="p-4 text-right font-mono text-slate-500">₹{item.unitPrice?.toFixed(2) || 0}</td>
                          {/* 🟢 Using totalPrice from schema */}
                          <td className="p-4 text-right font-mono text-slate-900">₹{item.totalPrice?.toFixed(2) || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Column: Summaries & Actions */}
              <div className="flex-1 flex flex-col gap-6">
                
                {/* Customer Info */}
                <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center border-b border-slate-100 pb-2">
                    <User size={14} className="mr-2" /> Customer & Order Info
                  </h3>
                  <div className="space-y-2 text-xs font-bold text-slate-700">
                    <div className="flex justify-between"><span>Name:</span> <span className="uppercase text-slate-900">{detailsModal.customer?.name || detailsModal.platform || "Walk-In"}</span></div>
                    {detailsModal.customer?.phone && <div className="flex justify-between"><span>Phone:</span> <span className="font-mono text-slate-900">{detailsModal.customer.phone}</span></div>}
                    <div className="flex justify-between mt-2 pt-2 border-t border-slate-50"><span>Order Type:</span> <span className="uppercase text-indigo-600 bg-indigo-50 px-2 rounded">{detailsModal.orderType.replace("_", " ")}</span></div>
                    <div className="flex justify-between"><span>Payment:</span> <span className="uppercase text-emerald-600 bg-emerald-50 px-2 rounded">{detailsModal.paymentMode}</span></div>
                    <div className="flex justify-between"><span>Status:</span> <span className={`uppercase px-2 rounded ${detailsModal.status === 'COMPLETED' ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>{detailsModal.status}</span></div>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="bg-slate-900 text-white p-5 border border-slate-800 rounded-2xl shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 border-b border-slate-700 pb-2">Financial Summary</h3>
                  
                  <div className="space-y-3 text-xs font-bold text-slate-300">
                    <div className="flex justify-between"><span>Subtotal</span> <span className="font-mono text-white">₹{detailsModal.subtotal?.toFixed(2) || 0}</span></div>
                    <div className="flex justify-between"><span>Taxes (CGST + SGST)</span> <span className="font-mono text-white">₹{((detailsModal.cgst || 0) + (detailsModal.sgst || 0)).toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Packing / Delivery</span> <span className="font-mono text-white">₹{((detailsModal.packingCharges || 0) + (detailsModal.deliveryCharges || 0)).toFixed(2)}</span></div>
                    <div className="flex justify-between text-red-400"><span>Discounts</span> <span className="font-mono">-₹{detailsModal.discountAmount?.toFixed(2) || 0}</span></div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-slate-700 flex justify-between items-center">
                    <span className="text-sm font-black uppercase tracking-widest text-emerald-400">Grand Total</span>
                    <span className="text-3xl font-mono font-black text-emerald-400">₹{detailsModal.totalAmount?.toFixed(2) || 0}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center">
                    <ShieldAlert size={14} className="mr-2" /> Admin Actions
                  </h3>
                  <div className="space-y-3">
                    {detailsModal.status !== "CANCELLED" ? (
                      <>
                        <button onClick={() => setAuthModal({ isOpen: true, action: 'SETTLE', order: detailsModal })} className="w-full bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 hover:border-emerald-600 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center shadow-sm">
                          <CheckCircle size={16} className="mr-2"/> Update Settlement
                        </button>
                        <button onClick={() => setAuthModal({ isOpen: true, action: 'CANCEL', order: detailsModal })} className="w-full bg-red-50 hover:bg-red-600 text-red-700 hover:text-white border border-red-200 hover:border-red-600 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center shadow-sm">
                          <X size={16} className="mr-2"/> Void / Cancel Bill
                        </button>
                      </>
                    ) : (
                      <div className="text-center py-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-red-500 font-black uppercase tracking-widest">
                        This Bill is Voided
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🟢 SECURITY / PASSWORD MODAL */}
      {authModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black uppercase text-slate-900 flex items-center">
                <Lock size={16} className="text-indigo-600 mr-2"/> Authorize Action
              </h3>
              <button onClick={() => setAuthModal({isOpen: false, action: null, order: null})} className="text-slate-400 hover:text-red-500 bg-slate-100 p-1 rounded-full"><X size={16}/></button>
            </div>
            
            <p className="text-xs font-bold text-slate-500 mb-5">
              You are about to <strong className={`uppercase ${authModal.action === 'CANCEL' ? 'text-red-600' : 'text-emerald-600'}`}>{authModal.action}</strong> Bill #{authModal.order?.billNumber}.
            </p>

            <form onSubmit={handleSecureAction} className="space-y-5">
              {authModal.action === "SETTLE" && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-2">Select Payment Mode</label>
                  <select value={settleMode} onChange={(e) => setSettleMode(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold bg-white mb-2 outline-none focus:border-indigo-500">
                    <option value="CASH">CASH</option>
                    <option value="UPI">UPI (QR)</option>
                    <option value="CARD">CREDIT/DEBIT CARD</option>
                    {/* 🟢 Using MIXED directly to match Schema */}
                    <option value="MIXED">PART PAYMENT / MIXED</option>
                  </select>
                  {settleMode === "MIXED" && (
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
