"use client";
import React, { useState, useEffect } from "react";
import { useOutlet } from "../../context/OutletContext"; 
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { 
  ShoppingCart, Truck, FileText, Plus, Search, 
  Loader2, X, IndianRupee, Store, CheckCircle2, 
  Trash2, Building2, CreditCard, Landmark, Star, 
  History, Wallet, AlertCircle, CalendarDays, Printer, ChevronDown, ChevronUp, Users, FileSpreadsheet
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

  // Filters
  const [dateFilter, setDateFilter] = useState("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [expandedPO, setExpandedPO] = useState<string | null>(null);

  // Modals & Forms
  const [showAddPOModal, setShowAddPOModal] = useState(false);
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [showPayDueModal, setShowPayDueModal] = useState(false);
  const [showVendorHistoryModal, setShowVendorHistoryModal] = useState(false);
  
  const [isProcessing, setIsProcessing] = useState(false);
  
  // PO Form
  const [poForm, setPoForm] = useState({
    vendorId: "", outletId: "", invoiceNumber: "", paymentMode: "CASH", notes: ""
  });
  const [poItems, setPoItems] = useState([{ inventoryId: "", quantity: "", costPrice: "", taxPercent: "0" }]);

  // Vendor Form
  const [newVendor, setNewVendor] = useState({
    name: "", contactPerson: "", phone: "", email: "", address: "", 
    gstin: "", pan: "", bankName: "", accountNo: "", ifsc: "", outstandingAmt: "0", creditDays: "0"
  });

  // Pay Dues Form
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
      console.error("Fetch failed");
    } finally {
      setLoading(false);
    }
  };

  // --- PO Operations ---
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
    if (!poForm.vendorId || !poForm.outletId || !poItems[0].inventoryId) return alert("Fill all required fields");
    setIsProcessing(true);
    try {
      const res = await fetch("/api/brand/purchases", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ADD_PO", ...poForm, items: poItems })
      });
      const json = await res.json();
      if (res.ok && json.success) {
        alert("✅ GRN Generated & Inventory Updated Successfully!");
        setShowAddPOModal(false);
        setPoForm({ vendorId: "", outletId: selectedOutlet !== "ALL" ? selectedOutlet : "", invoiceNumber: "", paymentMode: "CASH", notes: "" });
        setPoItems([{ inventoryId: "", quantity: "", costPrice: "", taxPercent: "0" }]);
        fetchData();
      } else alert(json.error || "Failed to create GRN");
    } catch (e) { alert("Network Error"); } 
    finally { setIsProcessing(false); }
  };

  // --- Vendor Operations ---
  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const res = await fetch("/api/brand/purchases", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ADD_VENDOR", ...newVendor })
      });
      if (res.ok) {
        alert("✅ Vendor Profile Created Successfully!");
        setShowAddVendorModal(false);
        setNewVendor({ name: "", contactPerson: "", phone: "", email: "", address: "", gstin: "", pan: "", bankName: "", accountNo: "", ifsc: "", outstandingAmt: "0", creditDays: "0" });
        fetchData();
      }
    } catch (e) { alert("Network Error"); } 
    finally { setIsProcessing(false); }
  };

  const handleSettleDues = async () => {
    if (!payDueData.amount || parseFloat(payDueData.amount) <= 0) return alert("Enter valid amount");
    setIsProcessing(true);
    try {
      const res = await fetch("/api/brand/purchases", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SETTLE_VENDOR", vendorId: selectedVendor.id, amount: payDueData.amount, paymentMode: payDueData.mode, bankName: payDueData.mode === "BANK" ? payDueData.bankName : undefined })
      });
      if (res.ok) {
        if (payDueData.mode === "BANK") {
          window.open(`https://www.npci.org.in/upi?amount=${payDueData.amount}`, "_blank");
        }
        setTimeout(() => {
          alert(`✅ Payment of ₹${payDueData.amount} processed and Ledger updated!`);
          setShowPayDueModal(false);
          setPayDueData({ amount: "", mode: "BANK", bankName: "SBI" });
          fetchData();
          setIsProcessing(false);
        }, 1000);
      }
    } catch (e) { alert("Network Error"); setIsProcessing(false); }
  };

  // 🟢 Generate Complete Ledger Entries Chronologically
  const generateVendorLedger = (vendor: any) => {
    let ledger: any[] = [];
    
    // Add Purchases (Debits - Money we owe them)
    vendor.purchases?.forEach((po: any) => {
      // Don't show dummy settlement POs as separate purchases in ledger details if total is 0
      if (po.totalAmount > 0) {
        ledger.push({
          id: po.id,
          date: new Date(po.date),
          type: "PURCHASE",
          ref: po.invoiceNumber || "GRN Invoice",
          debit: po.totalAmount, // Increases Outstanding
          credit: 0,
          details: po.items?.map((i:any) => `${i.quantity}${i.inventory?.unit} ${i.inventory?.itemName}`).join(', ')
        });
      }
      
      // Add Payments (Credits - Money we paid them)
      po.payments?.forEach((pay: any) => {
        ledger.push({
          id: pay.id,
          date: new Date(pay.date),
          type: "PAYMENT",
          ref: pay.referenceNo ? `${pay.paymentMode} (${pay.referenceNo})` : pay.paymentMode,
          debit: 0,
          credit: pay.amount, // Reduces Outstanding
          details: `Payment Settlement`
        });
      });
    });

    // Sort by date ascending
    return ledger.sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const triggerPrint = () => window.print();

  if (loading && !data) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Retrieving Supply Chain & Ledger...</p>
      </div>
    );
  }

  const { purchases, vendors, inventory } = data || { purchases: [], vendors: [], inventory: [] };

  const filteredPurchases = purchases.filter((p: any) => 
    p.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.vendor?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredVendors = vendors.filter((v: any) => 
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.phone?.includes(searchQuery)
  );

  const totalSpend = purchases.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalAccruedTax = purchases.reduce((sum, p) => sum + p.taxAmount, 0);
  const totalOutstanding = vendors.reduce((sum, v) => sum + v.outstandingAmt, 0);

  return (
    <div className="max-w-[1400px] mx-auto animate-in fade-in duration-300 h-full flex flex-col pb-8">
      
      {/* 🖨️ PRINT HEADER */}
      <div className="hidden print:block mb-8 text-center border-b-2 border-black pb-4">
        <h1 className="text-3xl font-black uppercase tracking-tight">RamKesar Foods - Supply Ledger</h1>
        <div className="flex justify-between items-center mt-4">
          <p className="text-sm font-bold uppercase">Outlet: <span className="font-black">{selectedOutlet === "ALL" ? "ALL BRANCHES" : outlets.find((o:any)=>o.id===selectedOutlet)?.name}</span></p>
          <p className="text-sm font-bold uppercase">Date Period: <span className="font-black">{dateFilter}</span></p>
          <p className="text-sm font-bold uppercase">View: <span className="font-black">{activeView}</span></p>
        </div>
      </div>

      {/* 💻 Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0 print:hidden">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
            {activeView === "PURCHASES" ? <Truck className="mr-2 text-indigo-600" /> : <Building2 className="mr-2 text-purple-600" />}
            {activeView === "PURCHASES" ? "Procurements & POs" : "Vendor Accounts Ledger"}
          </h1>
          <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">
            {selectedOutlet === "ALL" ? "Global Brand Supply Chain" : "Local Branch Purchases"}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-1 shadow-sm flex items-center">
            <button onClick={()=>setActiveView("PURCHASES")} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${activeView === 'PURCHASES' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-900'}`}>Purchases (GRN)</button>
            <button onClick={()=>setActiveView("VENDORS")} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${activeView === 'VENDORS' ? 'bg-purple-600 text-white' : 'text-slate-500 hover:text-slate-900'}`}>Vendors Ledger</button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
              <CalendarDays size={15} className="text-slate-500 mr-2" />
              <select value={dateFilter} onChange={(e) => applyDateFilter(e.target.value, customStart, customEnd)} className="bg-transparent text-[10px] font-black text-slate-700 uppercase tracking-widest outline-none cursor-pointer">
                <option value="today">Today</option><option value="yesterday">Yesterday</option><option value="all">All Time</option><option value="custom">Custom Range</option>
              </select>
            </div>
            {dateFilter === "custom" && (
              <div className="flex items-center bg-white border border-slate-200 rounded-xl px-2 py-1.5 shadow-sm">
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="text-[10px] p-1 font-bold outline-none bg-transparent"/>
                <span className="mx-1 text-slate-300">-</span>
                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="text-[10px] p-1 font-bold outline-none bg-transparent"/>
                <button onClick={() => applyDateFilter("custom", customStart, customEnd)} disabled={!customStart || !customEnd} className="ml-2 px-2 py-1 bg-indigo-600 text-white rounded text-[9px] font-black uppercase disabled:opacity-50">GO</button>
              </div>
            )}
          </div>

          <button onClick={triggerPrint} className="bg-slate-900 hover:bg-black text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center transition-all shadow-md">
            <Printer size={14} className="mr-2" /> Print
          </button>
          
          {activeView === "PURCHASES" ? (
            <button onClick={() => setShowAddPOModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-md active:scale-95 transition-all">
              <Plus size={14} className="mr-1.5" /> Entry GRN
            </button>
          ) : (
            <button onClick={() => setShowAddVendorModal(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-md active:scale-95 transition-all">
              <Plus size={14} className="mr-1.5" /> Add Vendor
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 shrink-0 print:hidden">
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-center text-white relative overflow-hidden">
          <div className="flex justify-between items-start mb-2"><span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Gross Expenditure</span><IndianRupee size={16} className="text-emerald-400"/></div>
          <p className="text-2xl font-mono font-black text-white">₹{totalSpend.toLocaleString()}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-center shadow-sm">
          <div className="flex justify-between items-start mb-2"><span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Invoices (GRN)</span><FileText size={16} className="text-indigo-400"/></div>
          <p className="text-2xl font-mono font-black text-slate-800">{purchases.length}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-center shadow-sm">
          <div className="flex justify-between items-start mb-2"><span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Accrued Tax (ITC)</span><Landmark size={16} className="text-blue-400"/></div>
          <p className="text-2xl font-mono font-black text-blue-600">₹{totalAccruedTax.toLocaleString()}</p>
        </div>
        <div className="bg-red-50 p-5 rounded-2xl border border-red-100 flex flex-col justify-center shadow-sm">
          <div className="flex justify-between items-start mb-2"><span className="text-[9px] font-black uppercase tracking-widest text-red-500">Total Vendor Debt</span><CreditCard size={16} className="text-red-400"/></div>
          <p className="text-2xl font-mono font-black text-red-600">₹{totalOutstanding.toLocaleString()}</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden print:border-0 print:shadow-none">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0 print:hidden">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" placeholder={activeView === "PURCHASES" ? "Search Invoice or Vendor..." : "Search Vendor Name..."} 
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500 bg-white" 
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar print:overflow-visible">
          
          {/* ================= VIEW 1: PURCHASES (GRN) ================= */}
          {activeView === "PURCHASES" && (
            <table className="w-full text-left print:border-collapse print:text-xs">
              <thead className="bg-white sticky top-0 border-b border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400 z-10 shadow-sm print:shadow-none print:border-black print:border-b-2">
                <tr>
                  <th className="p-4 print:py-2">Date / Invoice No</th>
                  {selectedOutlet === "ALL" && <th className="p-4 print:py-2">Receiving Branch</th>}
                  <th className="p-4 print:py-2">Vendor Details</th>
                  <th className="p-4 text-center print:py-2">Items</th>
                  <th className="p-4 text-right print:py-2">Payment</th>
                  <th className="p-4 text-right print:py-2">Net Value</th>
                  <th className="p-4 w-10 print:hidden"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm font-bold text-slate-700 print:divide-slate-300">
                {filteredPurchases.length === 0 ? (
                  <tr><td colSpan={7} className="p-10 text-center"><ShoppingCart size={40} className="mx-auto text-slate-200 mb-3" /><p className="text-xs font-black uppercase tracking-widest text-slate-400">No Purchase Orders Found</p></td></tr>
                ) : (
                  filteredPurchases.map((po: any) => (
                    <React.Fragment key={po.id}>
                      <tr className={`hover:bg-slate-50 transition-colors cursor-pointer ${expandedPO === po.id ? 'bg-indigo-50/20' : ''}`} onClick={() => setExpandedPO(expandedPO === po.id ? null : po.id)}>
                        <td className="p-4 print:py-2">
                          <div className="font-mono text-xs text-indigo-600 font-black print:text-black">{po.invoiceNumber || "N/A"}</div>
                          <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-black">
                            {new Date(po.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                          </div>
                        </td>
                        {selectedOutlet === "ALL" && <td className="p-4 text-[10px] text-slate-600 uppercase tracking-widest font-black print:py-2">{po.outlet?.name}</td>}
                        <td className="p-4 font-black text-slate-800 uppercase text-xs print:py-2">{po.vendor?.name}</td>
                        <td className="p-4 text-center print:py-2"><span className="bg-slate-100 text-slate-500 px-2.5 py-1 rounded text-[10px] font-black print:bg-transparent print:p-0">{po._count?.items || 0} Items</span></td>
                        <td className="p-4 text-right print:py-2">
                           <span className={`px-2 py-1 rounded text-[9px] uppercase tracking-widest font-black print:bg-transparent print:p-0 ${po.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-600' : po.paymentStatus === 'PARTIAL' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
                             {po.paymentStatus}
                           </span>
                        </td>
                        <td className="p-4 text-right font-mono font-black text-slate-900 print:py-2">₹{po.totalAmount.toLocaleString()}</td>
                        <td className="p-4 text-center print:hidden text-indigo-600">{expandedPO === po.id ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}</td>
                      </tr>
                      {expandedPO === po.id && (
                        <tr className="bg-slate-50 border-y border-indigo-100 print:hidden animate-in fade-in slide-in-from-top-2">
                          <td colSpan={7} className="p-5">
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                              <table className="w-full text-left">
                                <thead className="bg-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200">
                                  <tr><th className="p-3">SKU Item</th><th className="p-3 text-center">Qty</th><th className="p-3 text-right">Rate</th><th className="p-3 text-right">Tax (%)</th><th className="p-3 text-right">Total</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 text-xs font-bold text-slate-700">
                                  {po.items?.map((item: any) => (
                                    <tr key={item.id} className="hover:bg-slate-50">
                                      <td className="p-3 uppercase">{item.inventory?.itemName}</td>
                                      <td className="p-3 text-center font-mono">{item.quantity} <span className="text-[9px] text-slate-400">{item.inventory?.unit}</span></td>
                                      <td className="p-3 text-right font-mono">₹{item.costPrice.toFixed(2)}</td>
                                      <td className="p-3 text-right font-mono text-slate-400">{item.taxPercent}%</td>
                                      <td className="p-3 text-right font-mono text-slate-900">₹{((item.quantity * item.costPrice) * (1 + item.taxPercent/100)).toFixed(2)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Notes: {po.notes || "N/A"}</span>
                                <div className="text-right">
                                  <div className="text-[10px] font-black uppercase text-slate-500 mb-1">Tax Accrued: ₹{po.taxAmount.toFixed(2)}</div>
                                  <div className="text-sm font-black uppercase text-indigo-700">Grand Total: <span className="font-mono text-lg">₹{po.totalAmount.toFixed(2)}</span></div>
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
          )}

          {/* ================= VIEW 2: VENDORS LEDGER ================= */}
          {activeView === "VENDORS" && (
            <table className="w-full text-left print:border-collapse print:text-xs">
              <thead className="bg-slate-100/90 sticky top-0 border-b border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-500 z-10 shadow-sm print:shadow-none print:border-black print:border-b-2">
                <tr><th className="p-4 print:py-2">Vendor Details</th><th className="p-4 print:py-2">Bank / Tax Info</th><th className="p-4 text-center print:py-2">GRNs</th><th className="p-4 text-center print:py-2 bg-red-50 text-red-900 border-x">Outstanding Balance</th><th className="p-4 text-center w-48 print:hidden">Operations</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700 print:divide-slate-300">
                {filteredVendors.length === 0 ? (
                  <tr><td colSpan={5} className="p-10 text-center"><Building2 size={40} className="mx-auto text-slate-200 mb-3"/><p className="text-xs font-black uppercase tracking-widest text-slate-400">No Vendors Found</p></td></tr>
                ) : (
                  filteredVendors.map((v: any) => (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 print:py-2">
                        <div className="font-black text-slate-900 uppercase text-sm mb-1">{v.name}</div>
                        <div className="text-[10px] font-mono text-indigo-600 mb-0.5">Ph: {v.phone}</div>
                        <div className="text-[9px] text-slate-400 truncate max-w-[200px] uppercase">{v.address || "No Address"}</div>
                      </td>
                      <td className="p-4 print:py-2">
                        <div className="text-[10px] font-black uppercase text-slate-600 mb-1 flex items-center"><Landmark size={12} className="mr-1 text-purple-500"/> {v.bankName || "N/A"} (AC: {v.accountNo || "N/A"})</div>
                        <div className="text-[9px] font-mono text-slate-400 uppercase">GSTIN: {v.gstin || "N/A"} | PAN: {v.pan || "N/A"}</div>
                      </td>
                      <td className="p-4 text-center print:py-2 font-mono">{v._count?.purchases || 0}</td>
                      <td className={`p-4 text-center font-mono font-black text-base border-x print:py-2 print:border-none ${v.outstandingAmt > 0 ? 'text-red-600 bg-red-50/30' : 'text-emerald-600'}`}>
                        ₹{Number(v.outstandingAmt || 0).toLocaleString()}
                      </td>
                      <td className="p-4 text-center space-y-2 print:hidden">
                        {v.outstandingAmt > 0 && <button onClick={()=>{setSelectedVendor(v); setPayDueData({amount: v.outstandingAmt.toString(), mode: "BANK", bankName: "SBI"}); setShowPayDueModal(true);}} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase px-2 py-2 rounded flex items-center justify-center shadow-sm active:scale-95 transition-all"><CreditCard size={12} className="mr-1.5"/> Settle Dues</button>}
                        <button onClick={() => {setSelectedVendor(v); setShowVendorHistoryModal(true);}} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[9px] font-black uppercase px-2 py-2 rounded flex items-center justify-center shadow-sm active:scale-95 transition-all"><History size={12} className="mr-1.5"/> Accounts Ledger</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ================= MODALS ================= */}
      
      {/* 1. ADD GRN (PO) MODAL */}
      {showAddPOModal && (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-[100] p-4 print:hidden animate-in fade-in zoom-in duration-150">
          <div className="bg-white rounded-3xl p-6 w-full max-w-4xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] border-t-8 border-indigo-600">
            <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-4 shrink-0">
              <div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center"><Truck size={20} className="mr-2 text-indigo-600"/> Goods Received Note (GRN)</h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase mt-1 tracking-widest">Master Procurement Entry</p>
              </div>
              <button onClick={() => setShowAddPOModal(false)} className="text-slate-400 p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"><X size={18}/></button>
            </div>
            
            <form onSubmit={handleCreatePO} className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="col-span-2">
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Select Vendor <span className="text-red-500">*</span></label>
                  <select required value={poForm.vendorId} onChange={(e) => setPoForm({...poForm, vendorId: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl outline-none text-xs font-bold uppercase focus:border-indigo-500 bg-slate-50">
                    <option value="" disabled>Choose Supplier...</option>
                    {data?.vendors.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Receiving Branch <span className="text-red-500">*</span></label>
                  <select required disabled={selectedOutlet !== "ALL"} value={poForm.outletId} onChange={(e) => setPoForm({...poForm, outletId: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl outline-none text-xs font-bold uppercase focus:border-indigo-500 bg-slate-50 disabled:opacity-70">
                    <option value="" disabled>Select Branch...</option>
                    {outlets.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Invoice No (Optional)</label>
                  <input type="text" placeholder="e.g. INV-2026" value={poForm.invoiceNumber} onChange={(e) => setPoForm({...poForm, invoiceNumber: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl outline-none text-xs font-bold focus:border-indigo-500 bg-slate-50" />
                </div>
              </div>

              <div className="mb-6 border border-indigo-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-indigo-50/50 p-3 border-b border-indigo-100 flex justify-between items-center">
                  <h3 className="text-[10px] font-black uppercase text-indigo-800 tracking-widest">Inward SKUs</h3>
                  <button type="button" onClick={handleAddItemRow} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center transition-colors"><Plus size={12} className="mr-1"/> Add Item</button>
                </div>
                <div className="p-3 space-y-3 bg-white">
                  {poItems.map((item, index) => (
                    <div key={index} className="flex flex-wrap md:flex-nowrap gap-3 items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="w-full md:flex-1">
                        <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">SKU Item <span className="text-red-500">*</span></label>
                        <select required value={item.inventoryId} onChange={(e) => handleItemChange(index, "inventoryId", e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg outline-none text-xs font-bold uppercase focus:border-indigo-500 bg-white">
                          <option value="" disabled>Select Raw Material...</option>
                          {data?.inventory.filter((i: any) => poForm.outletId ? i.outletId === poForm.outletId : true).map((i: any) => <option key={i.id} value={i.id}>{i.itemName} ({i.unit})</option>)}
                        </select>
                      </div>
                      <div className="w-24">
                        <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Qty <span className="text-red-500">*</span></label>
                        <input required type="number" min="0.1" step="any" placeholder="0" value={item.quantity} onChange={(e) => handleItemChange(index, "quantity", e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg outline-none text-xs font-mono font-bold focus:border-indigo-500 text-center" />
                      </div>
                      <div className="w-32">
                        <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Rate (₹) <span className="text-red-500">*</span></label>
                        <input required type="number" min="0" step="any" placeholder="0.00" value={item.costPrice} onChange={(e) => handleItemChange(index, "costPrice", e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg outline-none text-xs font-mono font-bold text-emerald-600 focus:border-indigo-500 text-center" />
                      </div>
                      <div className="w-24">
                        <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">GST %</label>
                        <select value={item.taxPercent} onChange={(e) => handleItemChange(index, "taxPercent", e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg outline-none text-xs font-bold focus:border-indigo-500 bg-white"><option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option></select>
                      </div>
                      {poItems.length > 1 && (
                        <div className="w-auto mt-4 md:mt-0 pt-1">
                          <button type="button" onClick={() => handleRemoveItemRow(index)} className="p-2.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors"><Trash2 size={16}/></button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Payment Settlement Mode</label>
                    <select value={poForm.paymentMode} onChange={(e) => setPoForm({...poForm, paymentMode: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl outline-none text-xs font-bold uppercase focus:border-indigo-500 bg-white shadow-sm">
                      <option value="CASH">Cash Paid Instantly</option>
                      <option value="BANK">Bank Transfer (IMPS/RTGS)</option>
                      <option value="UPI">UPI / Online Transfer</option>
                      <option value="CHEQUE">Bank Cheque</option>
                      <option value="CREDIT">Add to Vendor Credit (Udhaar)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Remarks / Notes</label>
                    <textarea rows={2} placeholder="Any specific instructions..." value={poForm.notes} onChange={(e) => setPoForm({...poForm, notes: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl outline-none text-xs font-bold focus:border-indigo-500 bg-slate-50 resize-none" />
                  </div>
                </div>

                {/* Live Bill Calculator */}
                <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-xl flex flex-col justify-center">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-700 pb-2 mb-3">Live Bill Valuation</h4>
                  <div className="space-y-2 text-xs font-bold font-mono">
                    <div className="flex justify-between text-slate-300"><span>Subtotal:</span><span>₹{calculateSubtotal().toFixed(2)}</span></div>
                    <div className="flex justify-between text-slate-300"><span>Accrued Tax (GST):</span><span>₹{calculateTotalTax().toFixed(2)}</span></div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-700 flex justify-between items-center">
                    <span className="text-sm font-black uppercase text-emerald-400">Grand Total</span>
                    <span className="text-3xl font-mono font-black text-emerald-400">₹{(calculateSubtotal() + calculateTotalTax()).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 shrink-0 mt-auto border-t border-slate-100">
                <button disabled={isProcessing} type="submit" className="w-full bg-indigo-600 text-white font-black uppercase tracking-widest py-4 rounded-xl text-sm flex justify-center items-center shadow-xl active:scale-95 transition-all disabled:opacity-50">
                  {isProcessing ? <Loader2 className="animate-spin" size={18}/> : "Commit GRN & Inject into Ledger"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. ADD VENDOR MODAL */}
      {showAddVendorModal && (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-[100] p-4 print:hidden animate-in fade-in zoom-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] border-t-8 border-purple-600 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-black text-slate-800 uppercase flex items-center tracking-tight"><Building2 size={20} className="mr-2 text-purple-600"/> Vendor Registration Matrix</h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase mt-1 tracking-widest">Onboard new supplier to HQ</p>
              </div>
              <button onClick={() => setShowAddVendorModal(false)} className="text-slate-400 p-2 bg-white hover:bg-slate-200 rounded-full transition-colors shadow-sm"><X size={18}/></button>
            </div>
            <div className="overflow-y-auto p-6 flex-1 custom-scrollbar">
              <form id="vendor-form" onSubmit={handleAddVendor} className="space-y-6">
                <div>
                  <h3 className="text-[10px] font-black uppercase text-purple-600 border-b border-purple-100 pb-2 mb-4 tracking-widest">1. Corporate Identity</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Company Name <span className="text-red-500">*</span></label><input required type="text" placeholder="e.g. BALAJI MILLS" value={newVendor.name} onChange={(e)=>setNewVendor({...newVendor, name:e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl font-bold uppercase text-xs outline-none focus:border-purple-500 bg-slate-50" /></div>
                    <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Contact Phone <span className="text-red-500">*</span></label><input required type="text" placeholder="Mobile / Landline" value={newVendor.phone} onChange={(e)=>setNewVendor({...newVendor, phone:e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl font-mono text-xs focus:border-purple-500 outline-none bg-slate-50" /></div>
                    <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Contact Person</label><input type="text" placeholder="Sales Manager Name" value={newVendor.contactPerson} onChange={(e)=>setNewVendor({...newVendor, contactPerson:e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl font-bold text-xs focus:border-purple-500 outline-none bg-slate-50" /></div>
                    <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Email Address</label><input type="email" placeholder="vendor@domain.com" value={newVendor.email} onChange={(e)=>setNewVendor({...newVendor, email:e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl font-mono text-xs focus:border-purple-500 outline-none bg-slate-50" /></div>
                    <div className="col-span-1 md:col-span-2"><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Corporate Address</label><textarea rows={2} placeholder="Complete physical address..." value={newVendor.address} onChange={(e)=>setNewVendor({...newVendor, address:e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl font-bold text-xs resize-none focus:border-purple-500 outline-none bg-slate-50" /></div>
                  </div>
                </div>
                <div>
                  <h3 className="text-[10px] font-black uppercase text-purple-600 border-b border-purple-100 pb-2 mb-4 tracking-widest">2. Financial & Tax Logic</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Bank Name</label><input type="text" placeholder="HDFC, SBI, etc." value={newVendor.bankName} onChange={(e)=>setNewVendor({...newVendor, bankName:e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl font-bold text-xs uppercase focus:border-purple-500 outline-none bg-slate-50" /></div>
                    <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Account Number</label><input type="text" placeholder="XXXX XXXX XXXX" value={newVendor.accountNo} onChange={(e)=>setNewVendor({...newVendor, accountNo:e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl font-mono font-black tracking-widest text-xs focus:border-purple-500 outline-none bg-slate-50" /></div>
                    <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">IFSC Code</label><input type="text" placeholder="HDFC0001234" value={newVendor.ifsc} onChange={(e)=>setNewVendor({...newVendor, ifsc:e.target.value.toUpperCase()})} className="w-full p-3 border border-slate-200 rounded-xl font-mono text-xs uppercase focus:border-purple-500 outline-none bg-slate-50" /></div>
                    <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">PAN NUMBER <span className="text-red-500">*</span></label><input required type="text" placeholder="ABCDE1234F" value={newVendor.pan} onChange={(e)=>setNewVendor({...newVendor, pan:e.target.value.toUpperCase()})} className="w-full p-3 border border-slate-200 rounded-xl font-mono text-xs uppercase focus:border-purple-500 outline-none bg-slate-50" /></div>
                    <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">GSTIN Reg.</label><input type="text" placeholder="22AAAAA0000A1Z5" value={newVendor.gstin} onChange={(e)=>setNewVendor({...newVendor, gstin:e.target.value.toUpperCase()})} className="w-full p-3 border border-slate-200 rounded-xl font-mono text-xs uppercase focus:border-purple-500 outline-none bg-slate-50" /></div>
                    <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Credit Days Allowed</label><input type="number" min="0" value={newVendor.creditDays} onChange={(e)=>setNewVendor({...newVendor, creditDays:e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl font-mono font-black text-xs focus:border-purple-500 outline-none bg-slate-50" /></div>
                    <div className="col-span-1 md:col-span-3 bg-red-50 p-4 rounded-xl border border-red-200">
                      <label className="block text-[10px] font-black uppercase text-red-600 mb-1.5">Opening Balance Debt (₹)</label>
                      <input type="number" step="any" min="0" value={newVendor.outstandingAmt} onChange={(e)=>setNewVendor({...newVendor, outstandingAmt:e.target.value})} className="w-full p-3 border-b-2 border-red-300 bg-transparent text-red-700 font-mono font-black text-2xl outline-none focus:border-red-500" />
                      <p className="text-[9px] text-red-500 font-bold uppercase mt-1 tracking-widest">Initial amount you owe to this vendor.</p>
                    </div>
                  </div>
                </div>
              </form>
            </div>
            <div className="p-5 border-t border-slate-100 bg-slate-50 shrink-0">
              <button disabled={isProcessing} type="submit" form="vendor-form" className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-black uppercase tracking-widest py-4 rounded-xl text-xs shadow-xl transition-all active:scale-95 flex items-center justify-center">
                {isProcessing ? <Loader2 className="animate-spin" size={16}/> : "Verify & Launch Vendor Profile"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. SETTLE DUES MODAL */}
      {showPayDueModal && selectedVendor && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[200] p-4 print:hidden animate-in fade-in zoom-in duration-150">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border-t-8 border-emerald-600 flex flex-col">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight flex items-center"><Wallet size={20} className="mr-2 text-emerald-600"/> Settle Account Ledger</h3>
                <p className="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-wider">{selectedVendor.name}</p>
              </div>
              <button onClick={() => setShowPayDueModal(false)} className="text-slate-400 p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"><X size={18}/></button>
            </div>
            
            <div className="space-y-6">
              <div className="bg-slate-900 p-5 rounded-2xl flex items-center justify-between shadow-xl">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Total Due Liability</span>
                  <span className="font-mono font-black text-3xl text-emerald-400">₹{Number(selectedVendor.outstandingAmt || 0).toLocaleString()}</span>
                </div>
                <AlertCircle size={40} className="text-slate-700 opacity-50" />
              </div>

              <div>
                 <label className="block text-[10px] font-black uppercase text-slate-500 mb-2">Select Transfer Mechanism</label>
                 <div className="grid grid-cols-3 gap-2">
                   <button onClick={() => setPayDueData({...payDueData, mode: 'CASH'})} className={`py-3 px-2 rounded-xl text-[10px] font-black uppercase flex flex-col items-center justify-center border-2 transition-all ${payDueData.mode === 'CASH' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md' : 'border-slate-200 bg-white text-slate-400 hover:bg-slate-50'}`}>
                      <IndianRupee size={16} className="mb-1.5"/> Cash
                   </button>
                   <button onClick={() => setPayDueData({...payDueData, mode: 'BANK'})} className={`py-3 px-2 rounded-xl text-[10px] font-black uppercase flex flex-col items-center justify-center border-2 transition-all ${payDueData.mode === 'BANK' ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md' : 'border-slate-200 bg-white text-slate-400 hover:bg-slate-50'}`}>
                      <Landmark size={16} className="mb-1.5"/> Bank
                   </button>
                   <button onClick={() => setPayDueData({...payDueData, mode: 'UPI'})} className={`py-3 px-2 rounded-xl text-[10px] font-black uppercase flex flex-col items-center justify-center border-2 transition-all ${payDueData.mode === 'UPI' ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-md' : 'border-slate-200 bg-white text-slate-400 hover:bg-slate-50'}`}>
                      <Smartphone size={16} className="mb-1.5"/> UPI
                   </button>
                 </div>
              </div>

              {payDueData.mode === "BANK" && (
                <div className="animate-in slide-in-from-bottom-2 fade-in">
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-2">Select Debit Bank Gateway</label>
                  <div className="grid grid-cols-4 gap-2">
                     {MAJOR_BANKS.map(bank => (
                       <button key={bank.id} onClick={() => setPayDueData({...payDueData, bankName: bank.id})} className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${payDueData.bankName === bank.id ? `${bank.color} ${bank.border} shadow-lg scale-105 z-10` : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                         <Landmark size={16} className="mb-1.5 opacity-80"/>
                         <span className="text-[8px] font-black uppercase tracking-wider text-center">{bank.id}</span>
                       </button>
                     ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-2">Debit Amount Request (₹)</label>
                <input type="number" step="any" min="1" max={selectedVendor.outstandingAmt} placeholder="0.00" value={payDueData.amount} onChange={(e)=>setPayDueData({...payDueData, amount: e.target.value})} className="w-full p-4 border-2 border-slate-200 rounded-xl font-mono font-black text-slate-900 text-2xl text-center outline-none focus:border-emerald-500 bg-slate-50" />
              </div>
              
              <button disabled={isProcessing} onClick={handleSettleDues} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest py-4 rounded-xl text-sm shadow-xl flex items-center justify-center active:scale-95 transition-transform disabled:opacity-70">
                {isProcessing ? <><Loader2 className="animate-spin mr-2" size={18}/> Routing via API...</> : <>Secure Transfer ₹{payDueData.amount || "0"}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. VENDOR LEDGER HISTORY MODAL (CA / ACCOUNTANT GRADE) */}
      {showVendorHistoryModal && selectedVendor && (() => {
        // Calculate unified chronological ledger
        let ledger: any[] = [];
        
        selectedVendor.purchases?.forEach((po: any) => {
          if (po.totalAmount > 0) {
            ledger.push({
              id: `PO-${po.id}`, date: new Date(po.createdAt), type: "DEBIT",
              particulars: `Purchase GRN #${po.invoiceNumber || 'N/A'}\n${po.items?.map((i:any)=>`${i.quantity}${i.inventory?.unit} ${i.inventory?.itemName}`).join(', ')}`,
              amount: po.totalAmount
            });
          }
          po.payments?.forEach((pay: any) => {
            ledger.push({
              id: `PAY-${pay.id}`, date: new Date(pay.date), type: "CREDIT",
              particulars: `Payment Made via ${pay.paymentMode} ${pay.referenceNo ? `(${pay.referenceNo})` : ''}`,
              amount: pay.amount
            });
          });
        });
        ledger.sort((a, b) => a.date.getTime() - b.date.getTime());

        return (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[200] p-4 print:hidden animate-in fade-in zoom-in duration-150">
            <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh] border-t-8 border-slate-900 overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                <div>
                  <h2 className="text-xl font-black text-slate-800 uppercase flex items-center tracking-tight"><History size={20} className="mr-2 text-slate-600"/> Complete Accounts Ledger</h2>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Vendor: {selectedVendor.name} • PAN: {selectedVendor.pan || "N/A"} • GST: {selectedVendor.gstin || "N/A"}</p>
                </div>
                <button onClick={() => setShowVendorHistoryModal(false)} className="text-slate-400 p-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-full transition-colors"><X size={16}/></button>
              </div>
              
              <div className="overflow-y-auto p-0 flex-1 custom-scrollbar bg-white">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-100/95 backdrop-blur z-10 border-b border-slate-200">
                    <tr className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      <th className="p-4">Transaction Date</th>
                      <th className="p-4">Particulars / Description</th>
                      <th className="p-4 text-right bg-red-50 text-red-800 border-l border-slate-200">Debit (We Owe)</th>
                      <th className="p-4 text-right bg-emerald-50 text-emerald-800 border-x border-slate-200">Credit (We Paid)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm font-bold text-slate-700">
                    {ledger.length > 0 ? (
                      ledger.map((log: any) => (
                        <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4">
                            <span className="text-xs font-black text-slate-800 block uppercase">{log.date.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</span>
                            <span className="text-[9px] font-bold text-slate-400">{log.date.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-xs text-slate-700 block whitespace-pre-line">{log.particulars}</span>
                          </td>
                          <td className="p-4 text-right font-mono font-black text-red-600 text-sm border-l border-slate-100 bg-red-50/10">
                            {log.type === "DEBIT" ? `₹${log.amount.toLocaleString()}` : "-"}
                          </td>
                          <td className="p-4 text-right font-mono font-black text-emerald-600 text-sm border-x border-slate-100 bg-emerald-50/10">
                            {log.type === "CREDIT" ? `₹${log.amount.toLocaleString()}` : "-"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-10 text-center text-slate-400">
                          <History size={40} className="mx-auto mb-3 opacity-20"/>
                          <p className="font-black text-sm uppercase tracking-widest">No Transactions Logged</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="p-6 bg-slate-900 border-t border-slate-800 flex justify-between items-center shrink-0">
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Net Current Outstanding Balance</span>
                 <span className="font-mono font-black text-red-400 text-2xl">₹{Number(selectedVendor.outstandingAmt || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
