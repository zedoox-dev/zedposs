"use client";
import { useState, useEffect } from "react";
import { useOutlet } from "../../context/OutletContext";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { 
  Package, AlertTriangle, Plus, Search, Filter, Loader2, 
  X, CheckCircle2, CalendarDays, Printer, Trash2, ShieldCheck, LockKeyhole
} from "lucide-react";

export default function InventoryMatrixPage() {
  const { selectedOutlet, outlets } = useOutlet();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [inventory, setInventory] = useState<any[]>([]);
  const [inwardLogs, setInwardLogs] = useState<any[]>([]);
  const [consumeLogs, setConsumeLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // 🟢 State for Filters & Toggles
  const [dateFilter, setDateFilter] = useState("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [stockLedgerView, setStockLedgerView] = useState<"LIVE" | "OPENING" | "INWARD" | "CONSUMED" | "CLOSING">("LIVE");

  // 🟢 Modals State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteAuthModal, setShowDeleteAuthModal] = useState(false);
  const [deleteItemTarget, setDeleteItemTarget] = useState<any>(null);
  const [securityPasswordInput, setSecurityPasswordInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // 🟢 Forms (Units set to short form)
  const [newItem, setNewItem] = useState({ 
    itemName: "", 
    classification: "RAW_MATERIAL", 
    unit: "KG", 
    stockLevel: "", 
    minStock: "", 
    outletId: "" 
  });

  useEffect(() => {
    if (searchParams) {
      if (searchParams.get("date")) setDateFilter(searchParams.get("date") as string);
      if (searchParams.get("startDate")) setCustomStart(searchParams.get("startDate") as string);
      if (searchParams.get("endDate")) setCustomEnd(searchParams.get("endDate") as string);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchInventory();
    if (selectedOutlet !== "ALL") setNewItem(prev => ({ ...prev, outletId: selectedOutlet }));
    else if (outlets.length > 0) setNewItem(prev => ({ ...prev, outletId: outlets[0].id }));
  }, [selectedOutlet, outlets, dateFilter, customStart, customEnd]);

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

  const fetchInventory = async () => {
    if (dateFilter === "custom" && (!customStart || !customEnd)) return;
    setLoading(true);
    try {
      let url = `/api/brand/inventory?outletId=${selectedOutlet}&date=${dateFilter}`;
      if (dateFilter === "custom") url += `&startDate=${customStart}&endDate=${customEnd}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setInventory(data.inventory);
        setInwardLogs(data.inwardLogs);
        setConsumeLogs(data.consumeLogs);
      }
    } catch (e) {
      console.error("Inventory Fetch Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const res = await fetch("/api/brand/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem)
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewItem({ ...newItem, itemName: "", stockLevel: "", minStock: "" });
        fetchInventory();
      }
    } catch (e) {
      alert("Failed to add SKU");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteSKU = async () => {
    if (!securityPasswordInput) return alert("Password Required!");
    setIsProcessing(true);
    try {
      const res = await fetch("/api/brand/inventory", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteItemTarget.id, password: securityPasswordInput })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("✅ SKU Deleted Successfully");
        setShowDeleteAuthModal(false);
        setSecurityPasswordInput("");
        fetchInventory();
      } else {
        alert(`❌ ${data.error}`);
      }
    } catch (e) {
      alert("Network Error");
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerPrint = () => window.print();

  // 🟢 Helper Calculations
  const calculateInwardQty = (id: string) => {
    return inwardLogs.filter(l => l.inventoryId === id).reduce((sum, l) => sum + l.quantity, 0);
  };
  const calculateConsumeQty = (id: string) => {
    return consumeLogs.filter(l => l.inventoryId === id).reduce((sum, l) => sum + l.quantityDeducted, 0);
  };

  const filteredInventory = inventory.filter(item => 
    item.itemName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockCount = inventory.filter(i => i.stockLevel > 0 && i.stockLevel <= i.minStock).length;
  const outOfStockCount = inventory.filter(i => i.stockLevel <= 0).length;

  if (loading && inventory.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Scanning Warehouses...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto animate-in fade-in duration-300 h-full flex flex-col pb-8 relative overflow-hidden print:h-auto print:overflow-visible print:bg-white">
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          html, body, div, table, tbody, tr, td, header, nav { height: auto !important; overflow: visible !important; background: white !important; color: black !important; }
          .print\\:hidden { display: none !important; }
        }
      `}} />

      {/* 🖨️ PRINT HEADER */}
      <div className="hidden print:block mb-8 text-center border-b-2 border-black pb-4">
        <h1 className="text-3xl font-black uppercase tracking-tight">RamKesar Foods - Inventory Ledger</h1>
        <div className="flex justify-between items-center mt-4">
          <p className="text-sm font-bold uppercase">Outlet: <span className="font-black">{selectedOutlet === "ALL" ? "ALL BRANCHES" : outlets.find((o:any)=>o.id===selectedOutlet)?.name}</span></p>
          <p className="text-sm font-bold uppercase">Date Period: <span className="font-black">{dateFilter}</span></p>
          <p className="text-sm font-bold uppercase">Ledger View: <span className="font-black">{stockLedgerView}</span></p>
        </div>
      </div>

      {/* 💻 Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0 print:hidden">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
            <Package className="mr-2 text-indigo-600" /> Inventory Matrix
          </h1>
          <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">
            {selectedOutlet === "ALL" ? "HQ Combined Warehouse View" : "Local Branch Stock View"}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Date Filter */}
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
                <button onClick={() => applyDateFilter("custom", customStart, customEnd)} disabled={!customStart || !customEnd} className="ml-2 px-2 py-1 bg-indigo-600 text-white rounded text-[9px] font-black uppercase disabled:opacity-50">GO</button>
              </div>
            )}
          </div>

          <button onClick={triggerPrint} className="bg-slate-900 hover:bg-black text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center transition-all shadow-md">
            <Printer size={14} className="mr-2" /> Print Ledger
          </button>
          <button onClick={() => setShowAddModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-sm shadow-indigo-500/30 transition-all active:scale-95">
            <Plus className="mr-1.5" size={16} /> Add New Sku
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 shrink-0 print:hidden">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Vault SKU Items</span>
            <p className="text-3xl font-mono font-black text-slate-800 mt-1">{inventory.length}</p>
          </div>
          <Package size={32} className="text-indigo-100" />
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Optimal Stock</span>
            <p className="text-3xl font-mono font-black text-emerald-600 mt-1">{inventory.length - lowStockCount - outOfStockCount}</p>
          </div>
          <CheckCircle2 size={32} className="text-emerald-100" />
        </div>
        <div className="bg-red-50 p-5 rounded-2xl border border-red-100 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Critical Low Stocks</span>
            <p className="text-3xl font-mono font-black text-red-600 mt-1">{lowStockCount + outOfStockCount}</p>
          </div>
          <AlertTriangle size={32} className="text-red-200" />
        </div>
      </div>

      {/* Main Table Container */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden print:border-0 print:shadow-none">
        
        {/* Controls */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 shrink-0 print:hidden">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Search SKUs..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500 bg-white" 
            />
          </div>
          
          <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm w-full sm:w-auto overflow-x-auto">
            {['LIVE', 'OPENING', 'INWARD', 'CONSUMED', 'CLOSING'].map(v => (
              <button 
                key={v} 
                onClick={()=>setStockLedgerView(v as any)} 
                className={`flex-1 px-4 py-2 text-[9px] font-black uppercase tracking-wider rounded-lg transition-colors whitespace-nowrap ${stockLedgerView === v ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto custom-scrollbar print:overflow-visible">
          <table className="w-full text-left border-collapse print:text-xs">
            <thead className="bg-white sticky top-0 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400 z-10 shadow-sm print:shadow-none print:border-black print:border-b-2">
              <tr>
                <th className="p-4 w-12 text-center print:py-2">#</th>
                <th className="p-4 print:py-2">SKU IDENTIFIER</th>
                {selectedOutlet === "ALL" && <th className="p-4 print:py-2">Branch Location</th>}
                
                {stockLedgerView === 'LIVE' && (<><th className="p-4 text-center print:py-2">Alert Barrier</th><th className="p-4 text-center bg-indigo-50 text-indigo-800 border-x border-slate-200 print:py-2">Live Quantity Stock</th><th className="p-4 text-center print:py-2">Health Status</th></>)}
                {stockLedgerView === 'OPENING' && <th className="p-4 text-center bg-blue-50 text-blue-800 print:py-2">Opening Volume</th>}
                {stockLedgerView === 'INWARD' && <th className="p-4 text-center bg-emerald-50 text-emerald-800 print:py-2">Inward Procurement (GRN)</th>}
                {stockLedgerView === 'CONSUMED' && <th className="p-4 text-center bg-orange-50 text-orange-800 print:py-2">BOM Consumption</th>}
                {stockLedgerView === 'CLOSING' && <th className="p-4 text-center bg-indigo-50 text-indigo-800 print:py-2">Closing Balance</th>}
                
                <th className="p-4 text-right w-32 print:hidden">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm font-bold text-slate-700 print:divide-slate-300">
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center">
                    <Package size={40} className="mx-auto text-slate-200 mb-3" />
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">No Inventory Found</p>
                  </td>
                </tr>
              ) : (
                filteredInventory.map((item, idx) => {
                  const isOutOfStock = item.stockLevel <= 0;
                  const isLowStock = item.stockLevel > 0 && item.stockLevel <= item.minStock;
                  
                  const inwardQty = calculateInwardQty(item.id);
                  const consumedQty = calculateConsumeQty(item.id);
                  const calculatedOpening = item.stockLevel - inwardQty + consumedQty;

                  return (
                    <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${stockLedgerView==='LIVE' && isOutOfStock ? 'bg-red-50/20' : stockLedgerView==='LIVE' && isLowStock ? 'bg-orange-50/20' : ''}`}>
                      <td className="p-4 text-center font-black text-slate-400 print:py-2">{idx + 1}</td>
                      <td className="p-4 print:py-2">
                        <div className="font-black text-xs text-slate-900 uppercase flex items-center">
                          {item.itemName}
                          {stockLedgerView === 'LIVE' && isLowStock && <AlertTriangle size={12} className="text-red-500 ml-2 print:hidden" />}
                        </div>
                        <div className="text-[9px] text-slate-400 mt-1 uppercase tracking-widest font-black">
                          {item.type.replace("_", " ")}
                        </div>
                      </td>
                      
                      {selectedOutlet === "ALL" && (
                        <td className="p-4 text-[10px] text-indigo-600 uppercase tracking-widest font-black print:py-2">
                          {item.outlet?.name}
                        </td>
                      )}
                      
                      {stockLedgerView === 'LIVE' && (
                        <>
                          <td className="p-4 text-center font-mono text-slate-500 print:py-2">{item.minStock} {item.unit}</td>
                          <td className={`p-4 text-center font-mono font-black text-sm border-x border-slate-100 print:py-2 print:border-none ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-orange-600' : 'text-indigo-600'}`}>
                            {parseFloat(item.stockLevel).toFixed(3)} <span className="text-[9px] uppercase font-bold text-slate-400">{item.unit}</span>
                          </td>
                          <td className="p-4 text-center print:py-2">
                            {isOutOfStock ? <span className="bg-red-100 text-red-700 border border-red-200 print:border-none text-[9px] px-2 py-0.5 rounded uppercase font-black">Out of Stock</span> 
                            : isLowStock ? <span className="bg-orange-100 text-orange-700 border border-orange-200 print:border-none text-[9px] px-2 py-0.5 rounded uppercase font-black">Low Stock</span> 
                            : <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 print:border-none text-[9px] px-2 py-0.5 rounded uppercase font-black">Healthy</span>}
                          </td>
                        </>
                      )}
                      
                      {stockLedgerView === 'OPENING' && <td className="p-4 text-center font-mono font-black text-blue-600 text-sm print:py-2 print:text-black">{calculatedOpening.toFixed(3)} {item.unit}</td>}
                      {stockLedgerView === 'INWARD' && <td className="p-4 text-center font-mono font-black text-emerald-600 text-sm print:py-2 print:text-black">+{inwardQty.toFixed(3)} {item.unit}</td>}
                      {stockLedgerView === 'CONSUMED' && <td className="p-4 text-center font-mono font-black text-orange-600 text-sm print:py-2 print:text-black">-{consumedQty.toFixed(3)} {item.unit}</td>}
                      {stockLedgerView === 'CLOSING' && <td className="p-4 text-center font-mono font-black text-indigo-600 text-sm print:py-2 print:text-black">{parseFloat(item.stockLevel).toFixed(3)} {item.unit}</td>}

                      <td className="p-4 text-right print:hidden">
                        <button 
                          onClick={() => { setDeleteItemTarget(item); setShowDeleteAuthModal(true); }}
                          className="bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-100 px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all inline-flex items-center shadow-sm"
                        >
                          <Trash2 size={12} className="mr-1.5"/> Delete
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🟢 ADD NEW SKU MODAL */}
      {showAddModal && (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-[100] p-4 print:hidden animate-in fade-in zoom-in duration-150">
          <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl relative overflow-hidden border-t-8 border-indigo-600">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center">
                <Package size={20} className="mr-2 text-indigo-600"/> Add New Sku
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"><X size={18}/></button>
            </div>
            
            <form onSubmit={handleAddItem} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">SKU / Item Name</label>
                <input required type="text" placeholder="e.g. Samosa Maida, Onion" value={newItem.itemName} onChange={(e) => setNewItem({...newItem, itemName: e.target.value})} className="w-full p-3.5 border-2 border-slate-100 rounded-xl outline-none text-sm font-bold uppercase focus:border-indigo-500 transition-colors" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Classification Type</label>
                  <select value={newItem.classification} onChange={(e) => setNewItem({...newItem, classification: e.target.value})} className="w-full p-3.5 border-2 border-slate-100 rounded-xl text-xs font-bold bg-white uppercase focus:border-indigo-500 outline-none transition-colors">
                    <option value="RAW_MATERIAL">Raw Material</option>
                    <option value="PACKAGING">Packaging</option>
                    <option value="VEGETABLES">Vegetables</option>
                    <option value="DAIRY">Dairy</option>
                    <option value="SPICES">Spices</option>
                    <option value="DISPOSIBLE">Disposible</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">UOM Units</label>
                  <select value={newItem.unit} onChange={(e) => setNewItem({...newItem, unit: e.target.value})} className="w-full p-3.5 border-2 border-slate-100 rounded-xl text-xs font-bold bg-white uppercase focus:border-indigo-500 outline-none transition-colors">
                    <option value="KG">Kilograms (KG)</option>
                    <option value="LTR">Litres (LTR)</option>
                    <option value="PCS">Pieces (PCS)</option>
                    <option value="GM">Grams (GM)</option>
                    <option value="PKT">Packet (PKT)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-2">Opening Stock</label>
                  <input required type="number" step="any" min="0" value={newItem.stockLevel} onChange={(e) => setNewItem({...newItem, stockLevel: e.target.value})} className="w-full p-2 border-b-2 border-slate-300 bg-transparent text-center font-mono font-black text-indigo-600 text-2xl outline-none focus:border-indigo-500" />
                </div>
                <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                  <label className="block text-[10px] font-black uppercase text-orange-600 mb-2">Low Alert Trigger</label>
                  <input required type="number" step="any" min="0" value={newItem.minStock} onChange={(e) => setNewItem({...newItem, minStock: e.target.value})} className="w-full p-2 border-b-2 border-orange-300 bg-transparent text-center font-mono font-black text-orange-700 text-2xl outline-none focus:border-orange-500" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Assign Branch</label>
                <select disabled={selectedOutlet !== "ALL"} value={newItem.outletId} onChange={(e) => setNewItem({...newItem, outletId: e.target.value})} className="w-full p-3.5 border-2 border-slate-100 rounded-xl outline-none text-xs font-bold uppercase focus:border-indigo-500 bg-slate-50 disabled:opacity-60">
                  {outlets.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>

              <button disabled={isProcessing} type="submit" className="w-full mt-4 bg-indigo-600 text-white font-black uppercase tracking-widest py-4 rounded-xl text-xs flex justify-center items-center shadow-xl active:scale-95 transition-transform">
                {isProcessing ? <Loader2 className="animate-spin" size={18}/> : "Register New SKU Profile"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 🟢 DELETE SKU SECURITY MODAL */}
      {showDeleteAuthModal && deleteItemTarget && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[200] p-4 print:hidden animate-in fade-in zoom-in duration-150">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border-t-8 border-red-600 text-center relative overflow-hidden">
            <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-4">
              <div className="flex items-center text-red-700 font-black uppercase text-sm">
                <LockKeyhole size={18} className="mr-2"/> Security Auth Required
              </div>
              <button onClick={()=>{setShowDeleteAuthModal(false); setSecurityPasswordInput("");}} className="text-slate-400 p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"><X size={16}/></button>
            </div>
            
            <p className="text-xs font-bold text-slate-500 text-left mb-6 uppercase tracking-widest">
              Deleting SKU: <br/><span className="text-slate-900 font-black text-lg">{deleteItemTarget.itemName}</span>
            </p>
            
            <div className="space-y-5">
              <div className="text-left">
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Enter Admin Terminal Password</label>
                <input 
                  required type="password" placeholder="••••••••" 
                  value={securityPasswordInput} onChange={(e)=>setSecurityPasswordInput(e.target.value)} 
                  className="w-full p-4 border-2 border-slate-200 rounded-xl font-mono text-center tracking-widest text-lg outline-none focus:border-red-500 bg-slate-50 transition-colors" 
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={()=>{setShowDeleteAuthModal(false); setSecurityPasswordInput("");}} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3.5 rounded-xl text-xs font-black uppercase transition-colors">Cancel</button>
                <button disabled={isProcessing} onClick={handleDeleteSKU} className="flex-[2] bg-red-600 hover:bg-red-700 text-white py-3.5 rounded-xl text-xs font-black uppercase flex items-center justify-center shadow-lg shadow-red-600/30 transition-colors">
                  {isProcessing ? <Loader2 size={16} className="animate-spin"/> : <><ShieldCheck size={16} className="mr-2"/> Confirm Delete</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
