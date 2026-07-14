"use client";
import React, { useState, useEffect } from "react";
import { useOutlet } from "../../context/OutletContext"; 
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { 
  ShoppingCart, Truck, FileText, Plus, Search, Loader2, X, IndianRupee, 
  Store, CheckCircle2, Trash2, Building2, CreditCard, Landmark, Smartphone,
  History, Wallet, AlertCircle, CalendarDays, Printer, ChevronDown, ChevronUp
} from "lucide-react";

const MAJOR_BANKS = [
  { id: "SBI", name: "State Bank of India", color: "bg-blue-600 text-white", border: "border-blue-700" },
  { id: "HDFC", name: "HDFC Bank", color: "bg-blue-900 text-white", border: "border-blue-950" },
  { id: "ICICI", name: "ICICI Bank", color: "bg-orange-600 text-white", border: "border-orange-700" },
  { id: "AXIS", name: "Axis Bank", color: "bg-rose-700 text-white", border: "border-rose-800" },
];

export default function ProcurementsAndVendorsPage() {
  const { selectedOutlet, outlets } = useOutlet();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [data, setData] = useState<{ purchases: any[], vendors: any[], inventory: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeView, setActiveView] = useState<"PURCHASES" | "VENDORS">("PURCHASES");

  // Filter & UI Controls
  const [dateFilter, setDateFilter] = useState("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [expandedPO, setExpandedPO] = useState<string | null>(null);

  // Modals Controller
  const [showAddPOModal, setShowAddPOModal] = useState(false);
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [showPayDueModal, setShowPayDueModal] = useState(false);
  const [showVendorHistoryModal, setShowVendorHistoryModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Forms States
  const [poForm, setPoForm] = useState({ vendorId: "", outletId: "", invoiceNumber: "", paymentMode: "CASH", notes: "" });
  const [poItems, setPoItems] = useState([{ inventoryId: "", quantity: "", costPrice: "", taxPercent: "0" }]);
  const [newVendor, setNewVendor] = useState({ name: "", contactPerson: "", phone: "", email: "", address: "", gstin: "", pan: "", bankName: "", accountNo: "", ifsc: "", outstandingAmt: "0", creditDays: "0" });
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [payDueData, setPayDueData] = useState({ amount: "", mode: "BANK", bankName: "SBI" });

  useEffect(() => {
    if (searchParams) {
      if (searchParams.get("date")) setDateFilter(searchParams.get("date") as string);
      if (searchParams.get("startDate")) setCustomStart(searchParams.get("startDate") as string);
      if (searchParams.get("endDate")) setCustomEnd(searchParams.get("endDate") as string);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchData();
    if (selectedOutlet !== "ALL") setPoForm(prev => ({ ...prev, outletId: selectedOutlet }));
  }, [selectedOutlet, dateFilter, customStart, customEnd]);

  const applyDateFilter = (type: string, start?: string, end?: string) => {
    setDateFilter(type);
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("date", type);
    if (type === "custom" && start && end) {
      params.set("startDate", start); params.set("endDate", end);
    } else if (type !== "custom") {
      params.delete("startDate"); params.delete("endDate");
      setCustomStart(""); setCustomEnd("");
    }
    if (type !== "custom" || (type === "custom" && start && end)) {
      router.push(`${pathname}?${params.toString()}`);
    }
  };

  const fetchData = async () => {
    if (dateFilter === "custom" && (!customStart || !customEnd)) return;
    setLoading(true);
    try {
      let url = `/api/brand/purchases?outletId=${selectedOutlet}&date=${dateFilter}`;
      if (dateFilter === "custom") url += `&startDate=${customStart}&endDate=${customEnd}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) setData(json);
    } catch (e) {
      console.error("Supply data processing sync failure.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddItemRow = () => setPoItems([...poItems, { inventoryId: "", quantity: "", costPrice: "", taxPercent: "0" }]);
  const handleRemoveItemRow = (index: number) => setPoItems(poItems.filter((_, i) => i !== index));
  const handleItemChange = (index: number, field: string, value: string) => {
    const newItems = [...poItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setPoItems(newItems);
  };

  const calculateSubtotal = () => poItems.reduce((sum, item) => sum + (parseFloat(item.quantity||"0") * parseFloat(item.costPrice||"0")), 0);
  const calculateTotalTax = () => poItems.reduce((sum, item) => sum + ((parseFloat(item.quantity||"0") * parseFloat(item.costPrice||"0")) * (parseFloat(item.taxPercent||"0")/100)), 0);

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poForm.vendorId || !poForm.outletId || !poItems[0].inventoryId) return alert("Fill all required parameters.");
    setIsProcessing(true);
    try {
      const res = await fetch("/api/brand/purchases", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ADD_PO", ...poForm, items: poItems })
      });
      const json = await res.json();
      if (res.ok && json.success) {
        alert("🎉 Inventory GRN Inflow Balanced Safely!");
        setShowAddPOModal(false);
        setPoForm({ vendorId: "", outletId: selectedOutlet !== "ALL" ? selectedOutlet : "", invoiceNumber: "", paymentMode: "CASH", notes: "" });
        setPoItems([{ inventoryId: "", quantity: "", costPrice: "", taxPercent: "0" }]);
        fetchData();
      } else alert(json.error || "System rejected GRN transaction.");
    } catch (e) { alert("Network Error"); } 
    finally { setIsProcessing(false); }
  };

  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const res = await fetch("/api/brand/purchases", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ADD_VENDOR", ...newVendor })
      });
      if (res.ok) {
        alert("🟢 Authorized Vendor Onboarded successfully!");
        setShowAddVendorModal(false);
        setNewVendor({ name: "", contactPerson: "", phone: "", email: "", address: "", gstin: "", pan: "", bankName: "", accountNo: "", ifsc: "", outstandingAmt: "0", creditDays: "0" });
        fetchData();
      }
    } catch (e) { alert("Network mapping timeout."); } 
    finally { setIsProcessing(false); }
  };

  const handleSettleDues = async () => {
    if (!payDueData.amount || parseFloat(payDueData.amount) <= 0) return alert("Enter valid settlement figure.");
    setIsProcessing(true);
    try {
      const res = await fetch("/api/brand/purchases", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SETTLE_VENDOR", vendorId: selectedVendor.id, amount: payDueData.amount, paymentMode: payDueData.mode, bankName: payDueData.mode === "BANK" ? payDueData.bankName : undefined })
      });
      if (res.ok) {
        alert(`✅ Payment processed smoothly via ${payDueData.mode}!`);
        setShowPayDueModal(false);
        setPayDueData({ amount: "", mode: "BANK", bankName: "SBI" });
        fetchData();
      }
    } catch (e) { alert("Clearing house connection timed out."); }
    finally { setIsProcessing(false); }
  };

  // 🟢 CALCULATE BULLETPROOF CHRONOLOGICAL LEDGER STRINGS
  const generateChronologicalLedger = (vendor: any) => {
    let timeline: any[] = [];
    
    // 1. Initial Opening Balance Base Injection
    if (parseFloat(vendor.outstandingAmt) !== 0) {
      // Back-calculating historical footprint based on payments & GRNs
      // to render real running balance trace
    }

    // 2. Loop Maal Inflows (Debits)
    vendor.purchases?.forEach((po: any) => {
      if (po.totalAmount > 0) {
        timeline.push({
          date: new Date(po.createdAt),
          particulars: `Maal Recd: GRN Invoice #${po.invoiceNumber || "N/A"}`,
          debit: po.totalAmount, // Increases Outstanding We Owe
          credit: 0
        });
      }
    });

    // 3. Loop All Payments Made (Credits)
    vendor.allPayments?.forEach((pay: any) => {
      timeline.push({
        date: new Date(pay.date),
        particulars: `Paid via: ${pay.paymentMode} ${pay.referenceNo ? `[GATEWAY:${pay.referenceNo}]` : ''}`,
        debit: 0,
        credit: pay.amount // Reduces Outstanding
      });
    });

    // Sort ascending chronologically
    return timeline.sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const triggerPrint = () => window.print();

  if (loading && !data) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Syncing Master Ledgers...</p>
      </div>
    );
  }

  const { purchases, vendors, inventory } = data || { purchases: [], vendors: [], inventory: [] };

  const filteredPurchases = purchases.filter((p: any) => 
    p.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.vendor?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredVendors = vendors.filter((v: any) => 
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) || v.phone?.includes(searchQuery)
  );

  const totalSpend = purchases.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalAccruedTax = purchases.reduce((sum, p) => sum + p.taxAmount, 0);
  const totalOutstanding = vendors.reduce((sum, v) => sum + v.outstandingAmt, 0);

  return (
    <div className="max-w-[1400px] mx-auto animate-in fade-in duration-300 h-full flex flex-col pb-8">
      
      {/* 💻 Header UI controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0 print:hidden">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
            {activeView === "PURCHASES" ? <Truck className="mr-2 text-indigo-600" /> : <Building2 className="mr-2 text-purple-600" />}
            {activeView === "PURCHASES" ? "Procurements & POs" : "Vendor Wallet Matrix"}
          </h1>
          <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Enterprise Ledger Console</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-1 shadow-sm flex items-center">
            <button onClick={()=>setActiveView("PURCHASES")} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${activeView === 'PURCHASES' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>Purchases (GRN)</button>
            <button onClick={()=>setActiveView("VENDORS")} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${activeView === 'VENDORS' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>Vendor Ledger Book</button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
              <CalendarDays size={15} className="text-indigo-600 mr-2" />
              <select value={dateFilter} onChange={(e) => applyDateFilter(e.target.value, customStart, customEnd)} className="bg-transparent text-[10px] font-black text-slate-700 uppercase tracking-widest outline-none cursor-pointer">
                <option value="today">Today</option><option value="yesterday">Yesterday</option><option value="all">All Time</option><option value="custom">Custom Range</option>
              </select>
            </div>
          </div>

          <button onClick={triggerPrint} className="bg-slate-950 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center transition-all shadow-md"><Printer size={14} className="mr-2"/> Print</button>
          
          {activeView === "PURCHASES" ? (
            <button onClick={() => setShowAddPOModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-md active:scale-95 transition-all"><Plus size={14} className="mr-1.5" /> New GRN Entry</button>
          ) : (
            <button onClick={() => setShowAddVendorModal(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-md active:scale-95 transition-all"><Plus size={14} className="mr-1.5" /> Register Vendor Account</button>
          )}
        </div>
      </div>

      {/* KPI Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 shrink-0 print:hidden">
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-center text-white">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Gross Expenditure</span>
          <p className="text-2xl font-mono font-black text-white mt-2">₹{totalSpend.toLocaleString()}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-center shadow-sm">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Invoices Logged</span>
          <p className="text-2xl font-mono font-black text-slate-800 mt-2">{purchases.length}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-center shadow-sm">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Accrued GST Input Pool</span>
          <p className="text-2xl font-mono font-black text-blue-600 mt-2">₹{totalAccruedTax.toLocaleString()}</p>
        </div>
        <div className="bg-red-50 p-5 rounded-2xl border border-red-100 flex flex-col justify-center shadow-sm">
          <span className="text-[9px] font-black uppercase tracking-widest text-red-500">Market Outstanding Udhaari</span>
          <p className="text-2xl font-mono font-black text-red-600 mt-2">₹{totalOutstanding.toLocaleString()}</p>
        </div>
      </div>

      {/* Tables container */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden print:border-0 print:shadow-none">
        <div className="p-4 border-b border-slate-100 bg-slate-50 shrink-0 print:hidden">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
            <input type="text" placeholder="Search Master Log Data Strings..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500 bg-white" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          
          {/* ================= DATA GRID 1: GRN PURCHASES ================= */}
          {activeView === "PURCHASES" && (
            <table className="w-full text-left print:text-xs">
              <thead className="bg-white sticky top-0 border-b border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400 z-10 shadow-sm">
                <tr><th>Date / Invoice No</th>{selectedOutlet === "ALL" && <th>Receiving Branch</th>}<th>Vendor Details</th><th className="text-center">Items Count</th><th className="text-right">Payment Status</th><th className="text-right">Net Value</th><th className="w-10 print:hidden"></th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm font-bold text-slate-700">
                {filteredPurchases.map((po: any) => (
                  <React.Fragment key={po.id}>
                    <tr className="hover:bg-slate-50 cursor-pointer" onClick={() => setExpandedPO(expandedPO === po.id ? null : po.id)}>
                      <td className="p-4"><div className="font-mono text-xs text-indigo-600 font-black">#{po.invoiceNumber}</div><span className="text-[10px] text-slate-400 font-black block mt-1">{new Date(po.createdAt).toLocaleDateString('en-IN')}</span></td>
                      {selectedOutlet === "ALL" && <td className="p-4 text-[10px] text-slate-500 uppercase">{po.outlet?.name}</td>}
                      <td className="p-4 uppercase text-xs font-black">{po.vendor?.name}</td>
                      <td className="p-4 text-center"><span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-black">{po._count?.items || 0} items</span></td>
                      <td className="p-4 text-right"><span className={`px-2 py-0.5 text-[9px] font-black rounded uppercase ${po.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>{po.paymentStatus}</span></td>
                      <td className="p-4 text-right font-mono font-black">₹{po.totalAmount.toLocaleString()}</td>
                      <td className="p-4 text-center print:hidden text-slate-400">{expandedPO === po.id ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</td>
                    </tr>
                    {expandedPO === po.id && (
                      <tr className="bg-slate-50 border-y print:hidden">
                        <td colSpan={7} className="p-4">
                          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                            <table className="w-full text-xs">
                              <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 border-b">
                                <tr><th className="p-3">Material Sku Name</th><th className="p-3 text-center">Volume Qty</th><th className="p-3 text-right">Cost Rate</th><th className="p-3 text-right">Tax Pool</th><th className="p-3 text-right">Total Net</th></tr>
                              </thead>
                              <tbody className="divide-y font-bold text-slate-700">
                                {po.items?.map((item: any) => (
                                  <tr key={item.id}>
                                    <td className="p-3 uppercase text-slate-900">{item.inventory?.itemName}</td>
                                    <td className="p-3 text-center font-mono">{item.quantity} {item.inventory?.unit}</td>
                                    <td className="p-3 text-right font-mono">₹{item.costPrice}</td>
                                    <td className="p-3 text-right font-mono text-slate-400">{item.taxPercent}%</td>
                                    <td className="p-3 text-right font-mono text-slate-900">₹{item.totalAmount}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}

          {/* ================= DATA GRID 2: VENDORS LEDGER WALLET ================= */}
          {activeView === "VENDORS" && (
            <table className="w-full text-left print:text-xs">
              <thead className="bg-slate-100/90 border-b border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-500 z-10 shadow-sm sticky top-0">
                <tr><th>Vendor Onboarded details</th><th>Bank Profile Node</th><th className="text-center">Cash Paid</th><th className="text-center">Bank Paid</th><th className="text-center">UPI Paid</th><th className="text-center">Cheque Paid</th><th className="text-center font-black bg-indigo-50 text-indigo-900 border-x">Total Settle Paid</th><th className="text-center bg-red-50 text-red-900">Outstanding Balance</th><th className="text-center w-28 print:hidden">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                {filteredVendors.map((v: any) => (
                  <tr key={v.id} className="hover:bg-slate-50/50">
                    <td className="p-4">
                      <div className="font-black text-slate-900 text-sm mb-1 uppercase">{v.name}</div>
                      <div className="text-[10px] text-indigo-600 font-mono">Ph: {v.phone}</div>
                      <div className="text-[9px] font-mono text-slate-400 uppercase mt-0.5">PAN: {v.pan || "N/A"}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-[10px] font-black uppercase text-slate-700 flex items-center mb-0.5"><Landmark size={12} className="mr-1 text-purple-600"/> {v.bankName || "N/A"}</div>
                      <div className="text-[9px] font-mono text-slate-400 leading-tight">AC: {v.accountNo || "N/A"}<br/>IFSC: {v.ifsc || "N/A"}</div>
                    </td>
                    <td className="p-4 text-center font-mono text-slate-600">₹{v.cashPaid?.toLocaleString() || 0}</td>
                    <td className="p-4 text-center font-mono text-slate-600">₹{v.bankPaid?.toLocaleString() || 0}</td>
                    <td className="p-4 text-center font-mono text-slate-600">₹{v.upiPaid?.toLocaleString() || 0}</td>
                    <td className="p-4 text-center font-mono text-slate-600">₹{v.chequePaid?.toLocaleString() || 0}</td>
                    <td className="p-4 text-center font-mono font-black text-indigo-700 bg-indigo-50/20 border-x">₹{v.totalPaid?.toLocaleString() || 0}</td>
                    <td className={`p-4 text-center font-mono font-black text-sm bg-red-50/20 ${v.outstandingAmt > 0 ? 'text-red-600' : 'text-emerald-600'}`}>₹{v.outstandingAmt?.toLocaleString() || 0}</td>
                    <td className="p-4 text-center space-y-1.5 print:hidden">
                      {v.outstandingAmt > 0 && <button onClick={()=>{setSelectedVendor(v); setPayDueData({amount: v.outstandingAmt.toString(), mode: "BANK", bankName: "SBI"}); setShowPayDueModal(true);}} className="w-full bg-emerald-600 text-white py-1.5 font-black uppercase rounded text-[9px] tracking-wider active:scale-95 shadow-xs transition-transform">Pay Due</button>}
                      <button onClick={()=>{setSelectedVendor(v); setShowVendorHistoryModal(true);}} className="w-full bg-slate-900 text-white py-1.5 font-black uppercase rounded text-[9px] tracking-wider hover:bg-black active:scale-95 shadow-xs transition-transform">Accounts Ledger</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ================= DYNAMIC MODALS MATRIX CLUSTER ================= */}

      {/* MODAL 1: Goods Received Note Entry Form */}
      {showAddPOModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[100] flex items-center justify-center p-4 print:hidden animate-in fade-in zoom-in duration-100">
          <div className="bg-white rounded-3xl p-6 w-full max-w-4xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] border-t-8 border-indigo-600">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-4 shrink-0">
              <div><h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center"><Truck size={20} className="mr-2 text-indigo-600"/> Goods Received Note (GRN)</h2><p className="text-[10px] font-bold text-slate-500 uppercase mt-1 tracking-widest">Master Procurement Inflow Sheet</p></div>
              <button onClick={() => setShowAddPOModal(false)} className="text-slate-400 p-2 bg-slate-100 rounded-full"><X size={18}/></button>
            </div>
            
            <form onSubmit={handleCreatePO} className="flex-1 overflow-y-auto custom-scrollbar pr-1 flex flex-col">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="col-span-2"><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Supplier / Vendor Entity <span className="text-red-500">*</span></label><select required value={poForm.vendorId} onChange={(e) => setPoForm({...poForm, vendorId: e.target.value})} className="w-full p-2.5 border rounded-xl outline-none text-xs font-bold uppercase bg-white focus:border-indigo-500 shadow-sm">{data?.vendors.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></div>
                <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Receiving Branch Location <span className="text-red-500">*</span></label><select required disabled={selectedOutlet !== "ALL"} value={poForm.outletId} onChange={(e) => setPoForm({...poForm, outletId: e.target.value})} className="w-full p-2.5 border rounded-xl outline-none text-xs font-bold uppercase bg-white focus:border-indigo-500 disabled:opacity-70">{outlets.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></div>
                <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Invoice Bill Number</label><input type="text" placeholder="e.g. BILL-9921" value={poForm.invoiceNumber} onChange={(e) => setPoForm({...poForm, invoiceNumber: e.target.value})} className="w-full p-2.5 border rounded-xl outline-none text-xs font-bold focus:border-indigo-500 bg-white" /></div>
              </div>

              <div className="mb-4 border border-indigo-100 rounded-2xl overflow-hidden shadow-xs">
                <div className="bg-indigo-50/50 p-3 border-b border-indigo-100 flex justify-between items-center"><h3 className="text-[10px] font-black uppercase text-indigo-800 tracking-widest">Inward Materials SKUs Rows</h3><button type="button" onClick={handleAddItemRow} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center transition-all shadow-xs"><Plus size={12} className="mr-1"/> Add Sku Row</button></div>
                <div className="p-3 space-y-3 bg-white max-h-[30vh] overflow-y-auto custom-scrollbar">
                  {poItems.map((item, index) => (
                    <div key={index} className="flex gap-2 items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <select required value={item.inventoryId} onChange={(e) => handleItemChange(index, "inventoryId", e.target.value)} className="flex-1 p-2 border rounded-lg text-xs font-bold uppercase bg-white focus:border-indigo-500 outline-none">
                        <option value="" disabled>Choose Raw Material SKU...</option>
                        {data?.inventory.filter((i: any) => poForm.outletId ? i.outletId === poForm.outletId : true).map((i: any) => <option key={i.id} value={i.id}>{i.itemName} ({i.unit})</option>)}
                      </select>
                      <input required type="number" min="0.001" step="any" placeholder="Qty Volume" value={item.quantity} onChange={(e) => handleItemChange(index, "quantity", e.target.value)} className="w-24 p-2 border rounded-lg text-xs font-mono font-black text-center outline-none focus:border-indigo-500 bg-white" />
                      <input required type="number" min="0" step="any" placeholder="Cost Price / Unit" value={item.costPrice} onChange={(e) => handleItemChange(index, "costPrice", e.target.value)} className="w-32 p-2 border rounded-lg text-xs font-mono font-black text-center text-emerald-600 outline-none focus:border-indigo-500 bg-white" />
                      <select value={item.taxPercent} onChange={(e) => handleItemChange(index, "taxPercent", e.target.value)} className="w-20 p-2 border rounded-lg text-xs font-bold bg-white focus:border-indigo-500 outline-none"><option value="0">0% GST</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option></select>
                      {poItems.length > 1 && <button type="button" onClick={() => handleRemoveItemRow(index)} className="p-2 bg-red-50 text-red-500 border border-red-100 rounded-lg"><Trash2 size={14}/></button>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Payment Mechanism Method</label><select value={poForm.paymentMode} onChange={(e) => setPoForm({...poForm, paymentMode: e.target.value})} className="w-full p-3 border rounded-xl text-xs font-bold bg-white outline-none focus:border-indigo-500 shadow-xs"><option value="CASH">CASH PAID ON COUNTER</option><option value="BANK">BANK WIRE (IMPS / RTGS)</option><option value="UPI">UPI SMART ACC TRANSFER</option><option value="CHEQUE">PHYSICAL PAPER CHEQUE</option><option value="CREDIT">ON CREDIT LEDGER (UDHAARI BOOK)</option></select></div>
                  <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">GRN Remarks</label><textarea rows={2} placeholder="Voucher specification entries..." value={poForm.notes} onChange={(e) => setPoForm({...poForm, notes: e.target.value})} className="w-full p-3 border rounded-xl text-xs font-bold bg-slate-50 resize-none outline-none focus:border-indigo-500" /></div>
                </div>
                <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-xl flex flex-col justify-center">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 border-b border-slate-800 pb-2 mb-3 tracking-widest">Financial Computation</h4>
                  <div className="space-y-1.5 font-mono text-xs text-slate-300">
                    <div className="flex justify-between"><span>Material Assessment:</span><span>₹{calculateSubtotal().toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Accrued GST Pool:</span><span>₹{calculateTotalTax().toFixed(2)}</span></div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center"><span className="text-sm font-black text-emerald-400 uppercase tracking-wider">Net Payable Amount</span><span className="text-3xl font-mono font-black text-emerald-400">₹{(calculateSubtotal() + calculateTotalTax()).toFixed(2)}</span></div>
                </div>
              </div>
              <button disabled={isProcessing} type="submit" className="w-full bg-indigo-600 text-white font-black uppercase tracking-widest py-4 rounded-xl text-xs shadow-lg mt-6 shrink-0 active:scale-95 transition-transform">{isProcessing ? <Loader2 className="animate-spin" size={16}/> : "Commit Inward Balance & Append Stock"}</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Vendor Wallet Settlement Payment Form */}
      {showPayDueModal && selectedVendor && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[100] flex items-center justify-center p-4 print:hidden animate-in fade-in zoom-in duration-100">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border-t-8 border-emerald-600 flex flex-col">
            <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-4"><h3 className="font-black text-slate-800 text-lg uppercase tracking-tight flex items-center"><Wallet size={20} className="mr-2 text-emerald-600"/> Settle Account Ledger</h3><button onClick={() => setShowPayDueModal(false)} className="text-slate-400 p-2 bg-slate-100 rounded-full"><X size={18}/></button></div>
            <div className="space-y-5">
              <div className="bg-slate-900 p-4 rounded-2xl flex justify-between items-center text-white"><div><span className="text-[10px] font-black uppercase text-slate-400 block">Current Debt Balance</span><span className="font-mono font-black text-2xl text-emerald-400">₹{selectedVendor.outstandingAmt?.toLocaleString()}</span></div><AlertCircle size={32} className="text-slate-700" /></div>
              <div>
                 <label className="block text-[10px] font-black uppercase text-slate-500 mb-2">Payment Disbursal Mechanism</label>
                 <div className="grid grid-cols-4 gap-2">
                   {['CASH', 'BANK', 'UPI', 'CHEQUE'].map(mode => (
                     <button key={mode} onClick={() => setPayDueData({...payDueData, mode})} className={`py-3 rounded-xl text-[10px] font-black uppercase flex flex-col items-center justify-center border-2 transition-all ${payDueData.mode === mode ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm scale-105' : 'border-slate-200 bg-white text-slate-400'}`}>
                        {mode === 'CASH' && <IndianRupee size={16} className="mb-1"/>}
                        {mode === 'BANK' && <Landmark size={16} className="mb-1"/>}
                        {mode === 'UPI' && <Smartphone size={16} className="mb-1"/>}
                        {mode === 'CHEQUE' && <FileText size={16} className="mb-1"/>}
                        {mode}
                     </button>
                   ))}
                 </div>
              </div>
              {payDueData.mode === "BANK" && (
                <div className="grid grid-cols-4 gap-2 animate-in fade-in">
                  {MAJOR_BANKS.map(bank => (
                    <button key={bank.id} onClick={() => setPayDueData({...payDueData, bankName: bank.id})} className={`p-2 rounded-lg border-2 text-[9px] font-black uppercase transition-all ${payDueData.bankName === bank.id ? `${bank.color} ${bank.border} shadow-sm` : 'bg-slate-50 text-slate-500 border-slate-200'}`}>{bank.id}</button>
                  ))}
                </div>
              )}
              <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Disbursal Amount Valuation (₹)</label><input type="number" step="any" min="1" max={selectedVendor.outstandingAmt} placeholder="0.00" value={payDueData.amount} onChange={(e)=>setPayDueData({...payDueData, amount: e.target.value})} className="w-full p-3.5 border-2 border-slate-200 rounded-xl font-mono font-black text-slate-900 text-xl text-center bg-slate-50 outline-none focus:border-emerald-500" /></div>
              <button disabled={isProcessing} onClick={handleSettleDues} className="w-full bg-emerald-600 text-white font-black uppercase tracking-widest py-4 rounded-xl text-xs flex justify-center items-center shadow-md active:scale-95 transition-transform">{isProcessing ? <Loader2 className="animate-spin" size={16}/> : `Disburse Safe ${payDueData.mode} Settlement`}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Master Double-Entry Grade Vendor Account Statement Ledger */}
      {showVendorHistoryModal && selectedVendor && (() => {
        const chronologicalLedger = generateChronologicalLedger(selectedVendor);
        let runningBalance = parseFloat(selectedVendor.outstandingAmt || "0") - chronologicalLedger.reduce((sum, entry) => sum + entry.debit - entry.credit, 0);

        return (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 print:hidden animate-in fade-in zoom-in duration-100">
            <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh] border-t-8 border-slate-950 overflow-hidden">
              <div className="p-5 border-b bg-slate-50 flex justify-between items-center shrink-0">
                <div>
                  <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center"><History size={18} className="mr-2 text-slate-700"/> Certified Statement of Account</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 tracking-wider">Vendor: {selectedVendor.name} • PAN: {selectedVendor.pan || "N/A"} • GST: {selectedVendor.gstin || "N/A"}</p>
                </div>
                <button onClick={() => setShowVendorHistoryModal(false)} className="text-slate-400 p-2 bg-white border border-slate-200 rounded-full"><X size={16}/></button>
              </div>
              
              {/* Payment Mode Badges Header */}
              <div className="bg-slate-900 text-white p-4 grid grid-cols-2 md:grid-cols-5 gap-3 shrink-0 text-center font-mono border-b border-slate-800">
                <div className="p-2 border border-slate-800 rounded-xl bg-slate-950/50"><span className="text-[9px] text-slate-400 font-bold block mb-1">CASH PAID</span><span className="text-xs font-black text-amber-500">₹{selectedVendor.cashPaid?.toLocaleString()}</span></div>
                <div className="p-2 border border-slate-800 rounded-xl bg-slate-950/50"><span className="text-[9px] text-slate-400 font-bold block mb-1">BANK TRANSFER</span><span className="text-xs font-black text-blue-400">₹{selectedVendor.bankPaid?.toLocaleString()}</span></div>
                <div className="p-2 border border-slate-800 rounded-xl bg-slate-950/50"><span className="text-[9px] text-slate-400 font-bold block mb-1">UPI SMART</span><span className="text-xs font-black text-purple-400">₹{selectedVendor.upiPaid?.toLocaleString()}</span></div>
                <div className="p-2 border border-slate-800 rounded-xl bg-slate-950/50"><span className="text-[9px] text-slate-400 font-bold block mb-1">CHEQUE CLEAR</span><span className="text-xs font-black text-indigo-400">₹{selectedVendor.chequePaid?.toLocaleString()}</span></div>
                <div className="p-2 border border-slate-800 rounded-xl bg-emerald-950/30"><span className="text-[9px] text-emerald-400 font-bold block mb-1">CUMULATIVE PAID</span><span className="text-sm font-black text-emerald-400">₹{selectedVendor.totalPaid?.toLocaleString()}</span></div>
              </div>

              <div className="overflow-y-auto flex-1 custom-scrollbar bg-white">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b z-10">
                    <tr><th className="p-4">Txn Value Date</th><th className="p-4">Particulars / Transaction Node Description</th><th className="p-4 text-right bg-red-50/50 text-red-900 border-l">Debit (+)</th><th className="p-4 text-right bg-emerald-50/50 text-emerald-900 border-l">Credit (-)</th><th className="p-4 text-right bg-slate-100 font-black text-slate-800 border-l">Running Balance</th></tr>
                  </thead>
                  <tbody className="divide-y font-bold text-slate-700 text-xs">
                    {chronologicalLedger.map((entry: any, i: number) => {
                      runningBalance += entry.debit - entry.credit;
                      return (
                        <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-4"><span className="block text-slate-800">{entry.date.toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'})}</span><span className="text-[9px] text-slate-400 font-mono font-normal">{entry.date.toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit'})}</span></td>
                          <td className="p-4 text-slate-800 uppercase tracking-tight max-w-sm font-sans">{entry.particulars}</td>
                          <td className="p-4 text-right font-mono font-black text-red-600 border-l bg-red-50/5">{entry.debit > 0 ? `₹${entry.debit.toLocaleString()}` : "-"}</td>
                          <td className="p-4 text-right font-mono font-black text-emerald-600 border-l bg-emerald-50/5">{entry.credit > 0 ? `₹${entry.credit.toLocaleString()}` : "-"}</td>
                          <td className="p-4 text-right font-mono font-black text-slate-900 border-l bg-slate-50/5">₹{runningBalance.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="p-5 bg-slate-900 text-white flex justify-between items-center shrink-0 border-t border-slate-800"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Closing Net Outstanding Udhaar Balance</span><span className="font-mono font-black text-red-400 text-2xl">₹{Number(selectedVendor.outstandingAmt || 0).toLocaleString()}</span></div>
            </div>
          </div>
        );
      })()}

      {/* MODAL 4: VENDOR REGISTRATION ONBOARDING SHEET */}
      {showAddVendorModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[100] p-4 print:hidden animate-in fade-in zoom-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] border-t-8 border-purple-600 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
              <div><h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center"><Building2 size={20} className="mr-2 text-purple-600"/> Onboard Vendor Account Profile</h2><p className="text-[10px] font-bold text-slate-500 uppercase mt-1 tracking-widest">Enterprise Supplier Identity Sheet</p></div>
              <button onClick={() => setShowAddVendorModal(false)} className="text-slate-400 p-2 bg-white rounded-full"><X size={18}/></button>
            </div>
            <div className="overflow-y-auto p-6 flex-1 custom-scrollbar">
              <form id="vendor-matrix-form" onSubmit={handleAddVendor} className="space-y-6">
                <div>
                  <h3 className="text-[10px] font-black uppercase text-purple-600 border-b border-purple-100 pb-2 mb-4">1. Enterprise Demographics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Company / Entity Title Name <span className="text-red-500">*</span></label><input required type="text" placeholder="e.g. BALAJI AGRO MILLS" value={newVendor.name} onChange={(e)=>setNewVendor({...newVendor, name:e.target.value})} className="w-full p-2.5 border rounded-xl font-bold uppercase text-xs outline-none bg-slate-50 focus:border-purple-500" /></div>
                    <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Contact Phone Gateway <span className="text-red-500">*</span></label><input required type="text" placeholder="Mobile 10-digit number" value={newVendor.phone} onChange={(e)=>setNewVendor({...newVendor, phone:e.target.value})} className="w-full p-2.5 border rounded-xl font-mono text-xs outline-none bg-slate-50 focus:border-purple-500" /></div>
                    <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Author Contact Name</label><input type="text" placeholder="Sales rep/Owner name" value={newVendor.contactPerson} onChange={(e)=>setNewVendor({...newVendor, contactPerson:e.target.value})} className="w-full p-2.5 border rounded-xl font-bold text-xs outline-none bg-slate-50 focus:border-purple-500" /></div>
                    <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Email Address</label><input type="email" placeholder="supplier@domain.com" value={newVendor.email} onChange={(e)=>setNewVendor({...newVendor, email:e.target.value})} className="w-full p-2.5 border rounded-xl font-mono text-xs outline-none bg-slate-50 focus:border-purple-500" /></div>
                    <div className="col-span-2"><label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Registered Address</label><textarea rows={2} placeholder="Complete manufacturing/warehouse address..." value={newVendor.address} onChange={(e)=>setNewVendor({...newVendor, address:e.target.value})} className="w-full p-2.5 border rounded-xl font-bold text-xs resize-none outline-none bg-slate-50 focus:border-purple-500" /></div>
                  </div>
                </div>
                <div>
                  <h3 className="text-[10px] font-black uppercase text-purple-600 border-b border-purple-100 pb-2 mb-4">2. Financial Compliance Nodes</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Bank Name Title</label><input type="text" placeholder="e.g. HDFC BANK" value={newVendor.bankName} onChange={(e)=>setNewVendor({...newVendor, bankName:e.target.value})} className="w-full p-2.5 border rounded-xl font-bold text-xs uppercase outline-none bg-slate-50 focus:border-purple-500" /></div>
                    <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Account Number Stream</label><input type="text" placeholder="AC Count digits" value={newVendor.accountNo} onChange={(e)=>setNewVendor({...newVendor, accountNo:e.target.value})} className="w-full p-2.5 border rounded-xl font-mono text-xs outline-none bg-slate-50 focus:border-purple-500" /></div>
                    <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1">IFSC Clear Branch Code</label><input type="text" placeholder="HDFC000XXXX" value={newVendor.ifsc} onChange={(e)=>setNewVendor({...newVendor, ifsc:e.target.value})} className="w-full p-2.5 border rounded-xl font-mono text-xs uppercase outline-none bg-slate-50 focus:border-purple-500" /></div>
                    <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1">PAN CARD ALPHANUMERIC <span className="text-red-500">*</span></label><input required type="text" placeholder="10-digit PAN Card Number" value={newVendor.pan} onChange={(e)=>setNewVendor({...newVendor, pan:e.target.value.toUpperCase()})} className="w-full p-2.5 border rounded-xl font-mono text-xs uppercase font-black outline-none bg-slate-50 focus:border-purple-500" /></div>
                    <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1">GSTIN Number</label><input type="text" placeholder="Gst Number Node" value={newVendor.gstin} onChange={(e)=>setNewVendor({...newVendor, gstin:e.target.value})} className="w-full p-2.5 border rounded-xl font-mono text-xs uppercase outline-none bg-slate-50 focus:border-purple-500" /></div>
                    <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Allowed Credit Days (Grace)</label><input type="number" min="0" placeholder="0 days" value={newVendor.creditDays} onChange={(e)=>setNewVendor({...newVendor, creditDays:e.target.value})} className="w-full p-2.5 border rounded-xl font-mono text-xs outline-none bg-slate-50 focus:border-purple-500" /></div>
                    <div className="col-span-3 bg-red-50 p-4 rounded-xl border border-red-200"><label className="block text-[10px] font-black uppercase text-red-600 mb-1.5">Opening Outstanding Udhaar Balance Liability (₹)</label><input type="number" step="any" min="0" value={newVendor.outstandingAmt} onChange={(e)=>setNewVendor({...newVendor, outstandingAmt:e.target.value})} className="w-full p-3 border-b-2 border-red-300 bg-transparent font-mono font-black text-xl text-red-700 outline-none focus:border-red-500" /></div>
                  </div>
                </div>
              </form>
            </div>
            <div className="p-5 border-t bg-slate-50 shrink-0"><button disabled={isProcessing} type="submit" form="vendor-matrix-form" className="w-full bg-purple-600 text-white font-black uppercase tracking-widest py-4 rounded-xl text-xs shadow-lg transition-transform active:scale-95">{isProcessing ? <Loader2 className="animate-spin" size={16}/> : "Launch Certified Vendor Profile Account"}</button></div>
          </div>
        </div>
      )}

    </div>
  );
}
