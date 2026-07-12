"use client";
import { useState, useEffect } from "react";
import { useOutlet } from "../../context/OutletContext";
import { 
  ReceiptIndianRupee, Banknote, CreditCard, Smartphone, 
  Search, Printer, Loader2, ArrowUpRight, Filter, CalendarDays, 
  ChevronDown, ChevronUp, ShieldAlert, X, CheckCircle2
} from "lucide-react";

export default function LiveSalesPage() {
  const { selectedOutlet, outlets } = useOutlet();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Date Filters
  const [dateFilter, setDateFilter] = useState("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Expandable Row & Secure Actions
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<{ type: 'CANCEL' | 'SETTLE', order: any } | null>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [settleData, setSettleData] = useState({ paymentMode: "CASH", partCash: "", partCard: "" });

  useEffect(() => {
    fetchSalesData();
  }, [selectedOutlet, dateFilter, customStart, customEnd]);

  const fetchSalesData = async () => {
    if (dateFilter === "custom" && (!customStart || !customEnd)) return;
    setLoading(true);
    try {
      let query = `/api/brand/sales?outletId=${selectedOutlet}&date=${dateFilter}`;
      if (dateFilter === "custom") query += `&startDate=${customStart}&endDate=${customEnd}`;
      
      const res = await fetch(query);
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
    if (!actionModal || !adminPassword) return;
    setActionLoading(true);

    try {
      const res = await fetch("/api/brand/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionModal.type,
          orderId: actionModal.order.id,
          password: adminPassword,
          updateData: actionModal.type === 'SETTLE' ? settleData : {}
        })
      });
      const result = await res.json();
      
      if (result.success) {
        alert(`✅ ${result.message}`);
        setActionModal(null);
        setAdminPassword("");
        fetchSalesData(); // Refresh Ledger
      } else {
        alert(`❌ ${result.error}`);
      }
    } catch (err) {
      alert("Network Error. Try again.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Decrypting Financial Ledgers...</p>
      </div>
    );
  }

  const { orders, metrics } = data || { orders: [], metrics: {} };
  const filteredOrders = orders.filter((o: any) => 
    o.billNumber.toString().includes(searchQuery) || 
    (o.customer?.phone && o.customer.phone.includes(searchQuery))
  );

  const currentOutletName = selectedOutlet === "ALL" ? "All Outlets HQ" : outlets.find((o: any) => o.id === selectedOutlet)?.name || "Unknown Branch";

  return (
    <div className="max-w-[1400px] mx-auto animate-in fade-in duration-300 h-full flex flex-col pb-8 relative">
      
      {/* 🖨️ PRINT-ONLY LEDGER SUMMARY (Hidden on Screen, Visible on Print) */}
      <div className="hidden print:block mb-8">
        <div className="text-center mb-6 border-b-2 border-black pb-4">
          <h1 className="text-2xl font-black uppercase tracking-widest">Ramkesar Foods - Sales Ledger</h1>
          <p className="text-sm font-bold uppercase mt-1">Branch: {currentOutletName} | Date Filter: {dateFilter.toUpperCase()}</p>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-6 text-sm font-black border-b border-black pb-4">
          <div>Total Revenue: ₹{metrics.totalRevenue?.toLocaleString()}</div>
          <div>Total Bills: {metrics.totalOrders}</div>
          <div>Avg Bill Value: ₹{metrics.averageOrderValue}</div>
        </div>
        <h3 className="font-black text-sm uppercase mb-2 decoration-underline">Payment Breakdown</h3>
        <div className="grid grid-cols-3 gap-2 text-xs font-bold mb-8">
          {Object.entries(metrics.paymentBreakdown || {}).map(([mode, amt]: any) => (
             <div key={mode}>{mode}: ₹{amt.toLocaleString()}</div>
          ))}
        </div>
      </div>
      {/* END PRINT BLOCK */}

      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0 print:hidden">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
            <ReceiptIndianRupee className="mr-2 text-indigo-600" /> Sales & Billing
          </h1>
          <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">
            {selectedOutlet === "ALL" ? "Combined HQ View" : "Branch Specific Ledger"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Integrated Date Filter */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
            <CalendarDays size={14} className="text-indigo-600 mr-2" />
            <select 
              value={dateFilter} 
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent text-xs font-black text-slate-700 uppercase tracking-tight outline-none cursor-pointer"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="all">All Time</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {dateFilter === "custom" && (
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1 shadow-sm">
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="p-1 border-none bg-transparent outline-none text-[10px] font-bold text-slate-700" />
              <span className="text-slate-300 text-[10px] font-black">-</span>
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="p-1 border-none bg-transparent outline-none text-[10px] font-bold text-slate-700" />
            </div>
          )}

          <button onClick={() => window.print()} className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center transition-all shadow-md">
            <Printer size={14} className="mr-2" /> Print Ledger
          </button>
        </div>
      </div>

      {/* Dynamic Payment Metrics Row (Scrollable horizontally on small screens) */}
      <div className="flex gap-4 overflow-x-auto mb-6 shrink-0 custom-scrollbar pb-2 print:hidden">
        <div className="min-w-[200px] bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-center text-white shrink-0">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Net Revenue</span>
            <ReceiptIndianRupee size={16} className="text-emerald-400"/>
          </div>
          <p className="text-2xl font-mono font-black text-white">₹{metrics.totalRevenue?.toLocaleString()}</p>
          <p className="text-[10px] text-slate-500 font-bold mt-2 uppercase tracking-widest">{metrics.totalOrders} Bills</p>
        </div>

        {Object.entries(metrics.paymentBreakdown || {}).map(([mode, amt]: any) => (
          amt > 0 && (
            <div key={mode} className="min-w-[160px] bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center shrink-0">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{mode.replace("_", " ")}</span>
                <Banknote size={16} className="text-emerald-500"/>
              </div>
              <p className="text-xl font-mono font-black text-slate-900">₹{amt.toLocaleString()}</p>
            </div>
          )
        ))}
      </div>

      {/* Main Ledger Table */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0 print:hidden">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Search Bill No or Phone..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500 bg-white" 
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left print:text-xs">
            <thead className="bg-white sticky top-0 border-b border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400 z-10 shadow-sm">
              <tr>
                <th className="p-4">Bill No / Time</th>
                {selectedOutlet === "ALL" && <th className="p-4">Location</th>}
                <th className="p-4">Customer</th>
                <th className="p-4">Order Type</th>
                <th className="p-4 text-center">Payment</th>
                <th className="p-4 text-right">Amount</th>
                <th className="p-4 w-10 text-center print:hidden"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm font-bold text-slate-700">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">No Sales Records Found</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order: any) => (
                  <React.Fragment key={order.id}>
                    {/* Main Row */}
                    <tr 
                      className={`hover:bg-slate-50 transition-colors group cursor-pointer ${order.status === 'CANCELLED' ? 'opacity-50' : ''}`}
                      onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                    >
                      <td className="p-4">
                        <div className={`font-mono text-xs ${order.status === 'CANCELLED' ? 'text-red-500 line-through' : 'text-indigo-600'}`}>#{order.billNumber}</div>
                        <div className="text-[10px] text-slate-400 mt-1 uppercase font-black">
                          {new Date(order.createdAt).toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </td>
                      {selectedOutlet === "ALL" && <td className="p-4 text-[10px] text-slate-500 uppercase">{order.outlet?.name}</td>}
                      <td className="p-4">
                        <div className="text-xs uppercase text-slate-800">{order.customer?.name || "Walk-In"}</div>
                        <div className="text-[10px] font-mono text-slate-400">{order.customer?.phone || ""}</div>
                      </td>
                      <td className="p-4 text-[9px] uppercase tracking-widest">{order.orderType.replace("_", " ")}</td>
                      <td className="p-4 text-center text-[9px] uppercase tracking-widest font-black">{order.paymentMode}</td>
                      <td className="p-4 text-right font-mono text-base font-black">₹{order.totalAmount.toLocaleString()}</td>
                      <td className="p-4 text-center print:hidden">
                        <button className="text-slate-400 hover:text-indigo-600 transition-colors">
                          {expandedOrder === order.id ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Detail Row */}
                    {expandedOrder === order.id && (
                      <tr className="bg-slate-50 border-b border-slate-200 print:hidden">
                        <td colSpan={selectedOutlet === "ALL" ? 7 : 6} className="p-6">
                          <div className="flex flex-col lg:flex-row gap-6 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                            
                            {/* Bill Items Breakdown */}
                            <div className="flex-1">
                              <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-100 pb-2 mb-3">Order Items Breakdown</h4>
                              <ul className="space-y-2 mb-4">
                                {order.items?.map((item: any) => (
                                  <li key={item.id} className="flex justify-between text-xs font-bold text-slate-700">
                                    <span>{item.quantity}x {item.menuItem?.name || "Unknown Item"}</span>
                                    <span className="font-mono">₹{item.price * item.quantity}</span>
                                  </li>
                                ))}
                              </ul>
                              <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-500 uppercase">
                                <div className="flex justify-between"><span>Discount:</span><span className="text-red-500">-₹{order.discount}</span></div>
                                <div className="flex justify-between"><span>Packaging:</span><span>+₹{order.packingCharges}</span></div>
                                <div className="flex justify-between"><span>CGST:</span><span>+₹{order.cgst}</span></div>
                                <div className="flex justify-between"><span>SGST:</span><span>+₹{order.sgst}</span></div>
                              </div>
                            </div>

                            <div className="w-px bg-slate-200 hidden lg:block"></div>

                            {/* Action Panel */}
                            <div className="w-full lg:w-64 flex flex-col justify-between bg-slate-50 rounded-xl p-4 border border-slate-100">
                              <div>
                                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-3">Order Status</h4>
                                <div className={`inline-flex items-center px-3 py-1 rounded text-xs font-black uppercase ${order.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                  {order.status === 'COMPLETED' ? <CheckCircle2 size={14} className="mr-1"/> : <X size={14} className="mr-1"/>}
                                  {order.status}
                                </div>
                              </div>
                              
                              {order.status !== 'CANCELLED' && (
                                <div className="mt-6 flex flex-col gap-2">
                                  <button onClick={() => setActionModal({ type: 'SETTLE', order })} className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors">
                                    Update Payment / Settle
                                  </button>
                                  <button onClick={() => setActionModal({ type: 'CANCEL', order })} className="w-full py-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors">
                                    Cancel Bill
                                  </button>
                                </div>
                              )}
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

      {/* 🔒 SECURE ACTION OVERLAY MODAL */}
      {actionModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in duration-200">
            <div className={`p-6 text-center ${actionModal.type === 'CANCEL' ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
              <ShieldAlert size={40} className="mx-auto mb-3" />
              <h2 className="text-lg font-black uppercase tracking-tight">
                {actionModal.type === 'CANCEL' ? 'Cancel Bill' : 'Update Settlement'}
              </h2>
              <p className="text-[10px] font-bold mt-1 tracking-widest uppercase">Bill No: #{actionModal.order.billNumber}</p>
            </div>
            
            <form onSubmit={handleSecureAction} className="p-6 space-y-4">
              
              {/* Extra inputs for Settle Action */}
              {actionModal.type === 'SETTLE' && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3 mb-4">
                  <div>
                    <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">New Payment Mode</label>
                    <select required value={settleData.paymentMode} onChange={e=>setSettleData({...settleData, paymentMode: e.target.value})} className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold uppercase outline-none bg-white">
                      <option value="CASH">Cash</option><option value="CARD">Card</option><option value="UPI">UPI</option>
                      <option value="ZOMATO">Zomato</option><option value="SWIGGY">Swiggy</option><option value="RAMKESAR_DELIVERY">Ramkesar Delivery</option>
                      <option value="PART">Part Payment (Split)</option>
                    </select>
                  </div>
                  {settleData.paymentMode === "PART" && (
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="block text-[9px] font-black uppercase text-slate-500 mb-1">Cash Part</label><input type="number" required value={settleData.partCash} onChange={e=>setSettleData({...settleData, partCash: e.target.value})} className="w-full p-2 border border-slate-200 rounded-lg text-xs font-mono font-bold outline-none"/></div>
                      <div><label className="block text-[9px] font-black uppercase text-slate-500 mb-1">Card/UPI Part</label><input type="number" required value={settleData.partCard} onChange={e=>setSettleData({...settleData, partCard: e.target.value})} className="w-full p-2 border border-slate-200 rounded-lg text-xs font-mono font-bold outline-none"/></div>
                    </div>
                  )}
                </div>
              )}

              {/* Secure Password Input */}
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-2">Authorize Action (Admin Password)</label>
                <input required type="password" placeholder="Enter password to confirm..." value={adminPassword} onChange={e=>setAdminPassword(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm font-mono font-bold transition-all bg-slate-50" />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => {setActionModal(null); setAdminPassword("");}} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-widest transition-colors">Abort</button>
                <button disabled={actionLoading} type="submit" className={`flex-1 flex justify-center items-center py-3 rounded-xl text-white text-xs font-black uppercase tracking-widest shadow-md transition-all active:scale-95 ${actionModal.type === 'CANCEL' ? 'bg-red-600 hover:bg-red-700 shadow-red-500/30' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30'}`}>
                  {actionLoading ? <Loader2 size={16} className="animate-spin"/> : "Confirm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
