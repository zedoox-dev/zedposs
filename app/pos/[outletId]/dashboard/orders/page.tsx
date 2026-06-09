"use client";
import { useState, useEffect } from "react";
import { Search, Loader2, Calendar, Filter, Eye, Printer, XCircle, ChevronRight, CheckCircle2, AlertCircle, WifiOff } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { localDB } from "@/lib/localDb";

export default function OrdersHistoryPage() {
  const params = useParams();
  const searchParamsUrl = useSearchParams();
  const outletId = params.outletId as string;
  const { data: session } = useSession();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState(searchParamsUrl.get("search") || "");
  const [isOnline, setIsOnline] = useState(typeof window !== "undefined" ? navigator.onLine : true);
  
  const [dateFilter, setDateFilter] = useState("today"); 
  const [statusFilter, setStatusFilter] = useState("ALL"); 
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  
  const [pinModal, setPinModal] = useState<{ isOpen: boolean; action: "CANCEL" | "REPRINT" | null }>({ isOpen: false, action: null });
  const [authPin, setAuthPin] = useState("");
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [printerConfig, setPrinterConfig] = useState<any>(null);
  const [lastReprintOrder, setLastReprintOrder] = useState<any>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Dynamic secure outlet check
    const secureOutletId = (session?.user as any)?.outletId || outletId;

    const pConf = localStorage.getItem(`zapped_printer_config_${secureOutletId}`);
    if (pConf) setPrinterConfig(JSON.parse(pConf));
    else setPrinterConfig({ printerSize: "80mm", headerName: "ZAPPED POS", headerSize: "text-lg", subHeader: "Premium Quality", subHeaderSize: "text-[10px]", footerMsg: "Thank You! Visit Again." });
    
    const query = searchParamsUrl.get("search");
    if (query) setSearchQuery(query);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [searchParamsUrl, outletId, session]);

  useEffect(() => {
    if (session?.user) {
      fetchOrders();
    }
  }, [dateFilter, customStartDate, customEndDate, session, isOnline]);

  const fetchOrders = async () => {
    setLoading(true);
    const secureOutletId = (session?.user as any)?.outletId || outletId;

    // 🔥 OFFLINE FETCHING
    if (!navigator.onLine) {
      try {
        const offlineOrders = await localDB.orders.where('outletId').equals(secureOutletId).reverse().toArray();
        setOrders(offlineOrders);
      } catch (err) {
        console.error("Local DB fetch failed");
      } finally {
        setLoading(false);
      }
      return;
    }

    // 🔒 ONLINE FETCHING (Secure session handles Outlet ID)
    let url = `/api/orders?date=${dateFilter}`;
    if (dateFilter === "custom" && customStartDate && customEndDate) {
      url += `&startDate=${customStartDate}&endDate=${customEndDate}`;
    }
    
    try {
      const res = await fetch(url);
      const data = await res.json();
      const fetchedOrders = Array.isArray(data) ? data : [];
      setOrders(fetchedOrders);

      if (fetchedOrders.length > 0) {
        await localDB.orders.bulkPut(fetchedOrders);
      }
    } catch (error) {
      console.error("Error fetching secure orders");
    } finally {
      setLoading(false);
    }
  };

  const displayedOrders = orders.filter(order => {
    const customerNumber = order.customer?.phone || order.customerPhone || "";
    const matchSearch = order.billNumber.toString().includes(searchQuery) || customerNumber.includes(searchQuery);
    
    const isComp = order.isComplementary || order.paymentMode === "COMPLEMENTARY";
    const matchStatus = statusFilter === "ALL" || 
                        (statusFilter === "COMPLEMENTARY" && isComp) ||
                        (order.status === statusFilter && !isComp && statusFilter !== "COMPLEMENTARY");
    return matchSearch && matchStatus;
  });

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    
    if (pinModal.action === "REPRINT") {
      if (authPin !== "1234") return alert("Invalid Authorization PIN for Reprint!");
      
      setLastReprintOrder({ ...selectedOrder }); 
      setPinModal({ isOpen: false, action: null });
      setAuthPin("");
      
      setTimeout(() => { window.print(); }, 200);
      return;
    }

    if (!navigator.onLine) {
      return alert("System is offline! Cancellations require server verification. Please connect to internet.");
    }

    setIsActionLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: selectedOrder.id, pin: authPin, action: "CANCEL" })
      });
      const data = await res.json();
      if (data.success) {
        alert("Bill Cancelled Successfully!");
        setPinModal({ isOpen: false, action: null });
        setAuthPin("");
        setSelectedOrder(null);
        fetchOrders();
      } else {
        alert(data.error || "Failed to cancel invoice data.");
      }
    } catch (error) {
      alert("Network Error");
    } finally {
      setIsActionLoading(false);
    }
  };

  const getStatusBadge = (order: any) => {
    if (order.status === "CANCELLED") return <span className="bg-red-100 text-red-600 px-2 py-1 rounded font-black text-[10px] uppercase tracking-wide">Cancelled</span>;
    if (order.isComplementary || order.paymentMode === "COMPLEMENTARY") return <span className="bg-purple-100 text-purple-600 px-2 py-1 rounded font-black text-[10px] uppercase tracking-wide">Complementary</span>;
    return <span className="bg-emerald-100 text-emerald-600 px-2 py-1 rounded font-black text-[10px] uppercase tracking-wide">Completed</span>;
  };

  return (
    <>
      <title>ZedPoss | Orders & Billing History</title>
      <meta name="description" content="Manage your past invoices, KOTs, and billing history dynamically with ZedPoss cloud technology." />
      <meta name="keywords" content="POS History, Restaurant Billing History, Cloud Invoice App, ZedPoss, ZedooX Technologies, Secure Invoices, KOT Reprint, E-Bill Records, Store Analytics, POS Records, Retail Cloud Billing, POS Reporting, Cash Register Logs, Cancel Bill POS, Fast Search POS" />

      <div className="flex h-full relative overflow-hidden bg-slate-50 print:overflow-visible">
        <div className="flex h-full w-full print:hidden">
          
          <div className="flex-1 flex flex-col p-6 overflow-hidden">
            <div className="mb-6 space-y-4">
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
                Orders History
                {!isOnline && <span className="ml-3 px-2 py-1 bg-red-100 text-red-600 text-[10px] rounded-lg flex items-center border border-red-200"><WifiOff size={12} className="mr-1"/> VIEWING OFFLINE LOGS</span>}
              </h1>
              <div className="flex flex-col xl:flex-row gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                  <input type="text" placeholder="Search Bill No or Phone..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl outline-none font-bold text-sm" />
                </div>
                <div className="flex gap-2">
                  <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="p-2 border border-slate-200 rounded-xl font-bold text-sm outline-none bg-white">
                    <option value="today">Today</option><option value="yesterday">Yesterday</option><option value="custom">Custom Date</option>
                  </select>
                  {dateFilter === "custom" && (
                    <div className="flex gap-2 animate-in fade-in duration-100">
                      <input type="date" value={customStartDate} onChange={(e)=>setCustomStartDate(e.target.value)} className="p-2 border border-slate-200 rounded-xl text-sm font-bold" />
                      <input type="date" value={customEndDate} onChange={(e)=>setCustomEndDate(e.target.value)} className="p-2 border border-slate-200 rounded-xl text-sm font-bold" />
                    </div>
                  )}
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="p-2 border border-slate-200 rounded-xl font-bold text-sm outline-none bg-white">
                    <option value="ALL">All Status</option><option value="COMPLETED">Success</option><option value="CANCELLED">Cancelled</option><option value="COMPLEMENTARY">Complementary</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              {loading ? <div className="flex-1 flex justify-center items-center"><Loader2 className="animate-spin text-orange-500" size={40} /></div> : (
                <div className="overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-slate-100/90 backdrop-blur-sm z-10 border-b border-slate-200">
                      <tr className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        <th className="p-4">Bill No</th><th className="p-4">Time</th><th className="p-4">Type</th><th className="p-4">Amount</th><th className="p-4">Status</th><th className="p-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayedOrders.length === 0 ? (
                        <tr><td colSpan={6} className="p-8 text-center text-slate-400 font-bold">No orders found for selected filters</td></tr>
                      ) : displayedOrders.map((order) => (
                        <tr key={order.id} className={`hover:bg-orange-50/50 transition-colors cursor-pointer ${selectedOrder?.id === order.id ? 'bg-orange-50' : ''}`} onClick={() => setSelectedOrder(order)}>
                          <td className="p-4 font-black text-slate-800">#{order.billNumber}</td>
                          <td className="p-4 font-bold text-xs text-slate-600">{new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                          <td className="p-4"><span className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded text-slate-600 uppercase">{order.orderType.replace("_", " ")}</span></td>
                          <td className="p-4 font-mono font-black text-slate-900">₹{(order.isComplementary || order.paymentMode === "COMPLEMENTARY") ? "0.00" : Number(order.totalAmount).toFixed(2)}</td>
                          <td className="p-4">{getStatusBadge(order)}</td>
                          <td className="p-4 text-center"><button type="button" className="text-orange-500 hover:text-orange-600"><ChevronRight size={20} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SIDE PANEL: DETAILS VIEW */}
          <div className="w-[450px] bg-white border-l border-slate-200 shadow-xl z-20 flex flex-col">
            {!selectedOrder ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 opacity-50 p-8 text-center">
                <Eye size={48} className="mb-4" />
                <h3 className="font-black text-lg">SELECT AN ORDER</h3>
                <p className="text-xs font-bold mt-2">Click on any bill from the list to view its complete breakdown.</p>
              </div>
            ) : (
              <>
                <div className="p-5 border-b border-slate-100 bg-slate-900 text-white shrink-0">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h2 className="text-xl font-black tracking-tight">BILL #{selectedOrder.billNumber}</h2>
                      <p className="text-xs text-slate-400 font-bold">{new Date(selectedOrder.createdAt).toLocaleString('en-IN')}</p>
                    </div>
                    {getStatusBadge(selectedOrder)}
                  </div>
                  <div className="flex items-center space-x-2 text-xs font-bold mt-3 bg-slate-800 p-2 rounded-lg">
                    <span className="text-orange-400 uppercase">{selectedOrder.orderType?.replace("_", " ")}</span>
                    {selectedOrder.tableNo && <span className="text-slate-300">| Table {selectedOrder.tableNo}</span>}
                    <span className="text-slate-300">| {selectedOrder.paymentMode}</span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                  {(selectedOrder.customer?.phone || selectedOrder.customer?.name || selectedOrder.customerPhone) && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <h4 className="text-[10px] font-black uppercase text-slate-500 mb-2 border-b pb-1">Customer Profile</h4>
                      <div className="flex flex-col space-y-1">
                        <p className="font-bold text-sm text-slate-800">Name: <span className="text-slate-600 ml-1">{selectedOrder.customer?.name || selectedOrder.customerName || "Guest"}</span></p>
                        <p className="font-bold text-sm text-slate-800">Phone: <span className="text-slate-600 ml-1">+91 {selectedOrder.customer?.phone || selectedOrder.customerPhone || "N/A"}</span></p>
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-[10px] font-black uppercase text-slate-500 mb-2 border-b pb-1">Items Summary</h4>
                    <div className="space-y-2">
                      {selectedOrder.items?.map((item: any) => (
                        <div key={item.id} className="flex justify-between items-start text-xs font-bold">
                          <div className="flex-1"><span className="uppercase text-slate-800">{item.menuItem?.name || item.name || 'Unknown Item'}</span> <span className="text-slate-400 ml-1">x{item.quantity}</span></div>
                          <div className="font-mono text-slate-900">₹{(item.price * item.quantity).toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100 space-y-2">
                    <h4 className="text-[10px] font-black uppercase text-orange-600 mb-2 border-b border-orange-200 pb-1">Financial Breakdown</h4>
                    {(() => {
                      const itemsTotal = selectedOrder.items?.reduce((s:number, i:any) => s + (i.price * i.quantity), 0) || 0;
                      const baseAmt = itemsTotal / 1.05;
                      const cgstAmt = selectedOrder.cgst > 0 ? selectedOrder.cgst : baseAmt * 0.025;
                      const sgstAmt = selectedOrder.sgst > 0 ? selectedOrder.sgst : baseAmt * 0.025;
                      return (
                        <>
                          <div className="flex justify-between text-xs font-bold text-slate-600"><span>Base Amount</span><span className="font-mono">₹{baseAmt.toFixed(2)}</span></div>
                          <div className="flex justify-between text-[10px] font-bold text-slate-500"><span>CGST @ 2.5%</span><span className="font-mono">+ ₹{cgstAmt.toFixed(2)}</span></div>
                          <div className="flex justify-between text-[10px] font-bold text-slate-500"><span>SGST @ 2.5%</span><span className="font-mono">+ ₹{sgstAmt.toFixed(2)}</span></div>
                        </>
                      )
                    })()}
                    {selectedOrder.packingCharges > 0 && <div className="flex justify-between text-[10px] font-bold text-slate-500"><span>Packing Charge</span><span className="font-mono">+ ₹{Number(selectedOrder.packingCharges).toFixed(2)}</span></div>}
                    {selectedOrder.deliveryCharges > 0 && <div className="flex justify-between text-[10px] font-bold text-slate-500"><span>Delivery Charge</span><span className="font-mono">+ ₹{Number(selectedOrder.deliveryCharges).toFixed(2)}</span></div>}
                    {selectedOrder.discount > 0 && <div className="flex justify-between text-[10px] font-bold text-emerald-600"><span>Discount</span><span className="font-mono">- ₹{Number(selectedOrder.discount).toFixed(2)}</span></div>}
                    <div className="border-t border-orange-200 pt-2 mt-2 flex justify-between items-end">
                      <span className="font-black text-slate-800 text-sm uppercase">Grand Total</span>
                      <span className="text-xl font-black text-slate-900 font-mono">
                        ₹{(selectedOrder.isComplementary || selectedOrder.paymentMode === "COMPLEMENTARY") ? "0.00" : Number(selectedOrder.totalAmount).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {selectedOrder.paymentMode === "PART" && (
                    <div className="flex gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
                      <div className="flex-1">Part Cash: <span className="font-mono text-slate-900">₹{selectedOrder.partCash}</span></div>
                      <div className="flex-1">Part Card: <span className="font-mono text-slate-900">₹{selectedOrder.partCard}</span></div>
                    </div>
                  )}
                  {(selectedOrder.isComplementary || selectedOrder.paymentMode === "COMPLEMENTARY") && (
                    <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs font-bold text-purple-800 flex items-start">
                      <AlertCircle size={14} className="mr-2 mt-0.5 shrink-0" />
                      <div><span className="block uppercase text-[9px] mb-0.5 opacity-70">Complementary Reason</span>{selectedOrder.compReason || 'N/A'}</div>
                    </div>
                  )}
                </div>

                {selectedOrder.status !== "CANCELLED" && (
                  <div className="p-5 border-t border-slate-100 bg-white grid grid-cols-2 gap-3 shrink-0">
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setPinModal({ isOpen: true, action: "CANCEL" }); }} 
                      className="flex justify-center items-center py-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-black text-[10px] uppercase rounded-xl transition-all active:scale-95"
                    >
                      <XCircle size={16} className="mr-2" /> Cancel Bill
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setPinModal({ isOpen: true, action: "REPRINT" }); }} 
                      className="flex justify-center items-center py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase rounded-xl shadow-md transition-all active:scale-95"
                    >
                      <Printer size={16} className="mr-2" /> Reprint Bill
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ---------- AUTH PIN MODAL ---------- */}
        {pinModal.isOpen && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in duration-150">
              <h2 className="text-xl font-black text-slate-800 mb-2 uppercase tracking-tight text-center">Authorization Required</h2>
              <p className="text-xs font-bold text-slate-500 text-center mb-6">Enter Admin PIN to {pinModal.action?.toLowerCase()} this bill.</p>
              <form onSubmit={handleAuthAction}>
                <input type="password" required maxLength={4} placeholder="••••" value={authPin} onChange={(e) => setAuthPin(e.target.value.replace(/\D/g, ''))} className="w-full p-4 border border-slate-200 rounded-xl text-center text-2xl tracking-widest font-mono font-black mb-4 outline-none focus:border-orange-500" />
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => { setPinModal({isOpen: false, action: null}); setAuthPin(""); }} className="py-3 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm">Close</button>
                  <button type="submit" disabled={isActionLoading || authPin.length !== 4} className={`py-3 font-bold rounded-xl text-sm text-white ${pinModal.action === 'CANCEL' ? 'bg-red-600' : 'bg-slate-900'}`}>
                    {isActionLoading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Confirm'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ---------- PETPOOJA STANDARD HARDWARE DUPLICATE REPRINT ENGINE ---------- */}
        <div 
          id="enterprise-receipt-print-area" 
          className="print:block absolute opacity-0 print:opacity-100 top-0 left-0 bg-white text-black font-mono z-[-50] print:z-[9999] text-center w-full"
          style={{ width: printerConfig?.printerSize || "80mm" }}
        >
          {lastReprintOrder && (
            <div className="w-full bg-white text-black p-1 flex flex-col items-center">
              
              <div className="w-full text-center mb-2 pb-1 border-b border-solid border-black">
                <h2 className={`font-black uppercase tracking-tight ${printerConfig?.headerSize || 'text-lg'}`}>{printerConfig?.headerName || "ZAPPED POS"}</h2>
                <p className={`font-bold ${printerConfig?.subHeaderSize || 'text-[10px]'}`}>{printerConfig?.subHeader || ""}</p>
                {printerConfig?.gstNo && <p className={printerConfig?.gstSize || "text-[9px]"}>GSTIN: {printerConfig.gstNo}</p>}
                
                <div className="text-[11px] font-black tracking-widest text-center w-full border-t border-solid border-black mt-2 pt-1 px-1">** DUPLICATE **</div>

                {(lastReprintOrder.customer?.phone || lastReprintOrder.customerPhone) && (
                  <div className="text-[10px] font-black flex justify-between w-full border-t border-solid border-black mt-2 pt-1 px-1">
                    <span className="uppercase">Name: {lastReprintOrder.customer?.name || lastReprintOrder.customerName || "Guest"}</span>
                    <span>Phone: {lastReprintOrder.customer?.phone || lastReprintOrder.customerPhone}</span>
                  </div>
                )}

                <div className="flex justify-between text-[10px] mt-1 font-bold px-1 border-t border-solid border-black pt-1">
                  <span>Bill No: {lastReprintOrder.billNumber}</span>
                  <span>{new Date(lastReprintOrder.createdAt).toLocaleDateString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold mb-1 px-1">
                  <span>Type: {lastReprintOrder.orderType?.replace("_", " ")} {lastReprintOrder.tableNo ? `(T-${lastReprintOrder.tableNo})` : ''}</span>
                  <span>{new Date(lastReprintOrder.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
              
              <table className="w-full text-[10px] text-center mb-2 border-collapse font-bold mx-auto">
                <thead>
                  <tr className="border-b border-solid border-black">
                    <th className="pb-1 w-[45%] text-left pl-1">ITEM</th>
                    <th className="pb-1 w-[15%] text-center">QTY</th>
                    <th className="pb-1 w-[20%] text-right">RATE</th>
                    <th className="pb-1 w-[20%] text-right pr-1">AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  {lastReprintOrder.items?.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b border-solid border-slate-300">
                      <td className="py-1 text-left uppercase pl-1 leading-tight">{item.menuItem?.name || item.name || 'Item'}</td>
                      <td className="py-1 text-center">{item.quantity}</td>
                      <td className="py-1 text-right font-mono">₹{Number(item.price).toFixed(2)}</td>
                      <td className="py-1 text-right pr-1 font-mono">₹{Number(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <div className="w-full text-[10px] font-bold border-t border-b border-solid border-black pb-1 pt-1 px-1 mb-1">
                {(() => {
                  const repItemsTotal = lastReprintOrder.items?.reduce((s:number, i:any) => s + (i.price * i.quantity), 0) || 0;
                  const repBaseAmt = repItemsTotal / 1.05;
                  const repCgstAmt = lastReprintOrder.cgst > 0 ? lastReprintOrder.cgst : repBaseAmt * 0.025;
                  const repSgstAmt = lastReprintOrder.sgst > 0 ? lastReprintOrder.sgst : repBaseAmt * 0.025;
                  return (
                    <>
                      <div className="flex justify-between"><span>Base Amount</span><span>₹{repBaseAmt.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span>CGST @ 2.5%</span><span>₹{Number(repCgstAmt).toFixed(2)}</span></div>
                      <div className="flex justify-between"><span>SGST @ 2.5%</span><span>₹{Number(repSgstAmt).toFixed(2)}</span></div>
                    </>
                  )
                })()}
                {lastReprintOrder.packingCharges > 0 && <div className="flex justify-between"><span>Packing Charge</span><span>+ ₹{Number(lastReprintOrder.packingCharges).toFixed(2)}</span></div>}
                {lastReprintOrder.deliveryCharges > 0 && <div className="flex justify-between"><span>Delivery Charge</span><span>+ ₹{Number(lastReprintOrder.deliveryCharges).toFixed(2)}</span></div>}
                {lastReprintOrder.discount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>- ₹{Number(lastReprintOrder.discount).toFixed(2)}</span></div>}
              </div>

              <div className="w-full flex justify-between font-black text-[13px] border-b border-solid border-black pb-1 px-1">
                <span>GRAND TOTAL</span>
                <span>₹{(lastReprintOrder.isComplementary || lastReprintOrder.paymentMode === "COMPLEMENTARY") ? "0.00" : Number(lastReprintOrder.totalAmount).toFixed(2)}</span>
              </div>
              
              <div className="w-full text-center font-bold text-[10px] pb-1 px-1 mt-1 border-b border-solid border-black">
                PAY MODE: <span className="uppercase">{lastReprintOrder.paymentMode}</span>
              </div>
              
              <div className="text-center font-bold w-full mt-3">
                <p className={`px-1 ${printerConfig?.footerSize || 'text-[10px]'}`}>{printerConfig?.footerMsg}</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </>
  );
}
