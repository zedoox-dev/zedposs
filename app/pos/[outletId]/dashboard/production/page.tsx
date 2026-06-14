"use client";
import { useState, useEffect } from "react";
import { Loader2, Factory, ClipboardList, GitMerge, Save, AlertTriangle, ArrowRightLeft, CheckCircle2, ChevronRight, Scale, History, Calculator, Printer, Settings2, XCircle, Percent, ArrowLeftRight, Calendar, TrendingUp, TrendingDown, WifiOff } from "lucide-react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { localDB } from "@/lib/localDb";

export default function MegaProductionERP() {
  const params = useParams();
  const outletId = params.outletId as string;
  const { data: session } = useSession();

  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"SALES" | "MAPPING" | "ENTRY" | "RECONCILIATION" | "HISTORY" | "BATCH_CALC" | "COMPARE">("SALES");
  const [isOnline, setIsOnline] = useState(typeof window !== "undefined" ? navigator.onLine : true);

  // Master Data
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [salesData, setSalesData] = useState<Record<string, {qty: number, revenue: number}>>({});
  const [history, setHistory] = useState<any[]>([]);
  
  // Filters
  const [dateFilter, setDateFilter] = useState("today"); 
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [printerConfig, setPrinterConfig] = useState<any>({ printerSize: "80mm", headerName: "RAMKESAR POS" });

  // Tab 2: Yield Mapping States
  const [mapItem, setMapItem] = useState("");
  const [mapBaseQty, setMapBaseQty] = useState("20"); 
  const [innerServingPieces, setInnerServingPieces] = useState("2"); 
  const [mapMaterials, setMapMaterials] = useState<{rawMaterialId: string, quantityUsed: string, wastageBuffer: string}[]>([]);
  const [isSavingMap, setIsSavingMap] = useState(false);

  // Tab 3: Production Entry States
  const [prodItem, setProdItem] = useState("");
  const [prodQty, setProdQty] = useState("");
  const [finishedWastage, setFinishedWastage] = useState(""); 
  const [actualRM, setActualRM] = useState<{rawMaterialId: string, name: string, unit: string, expected: number, actualUsed: string, rawWastage: string}[]>([]);
  const [isProducing, setIsProducing] = useState(false);

  // Tab 6: Batch Calc States
  const [calcItem, setCalcItem] = useState("");
  const [calcQty, setCalcQty] = useState("");

  // 🔥 TAB 7: Advanced Compare States
  const [compareItem, setCompareItem] = useState("");
  const [baseCompareDate, setBaseCompareDate] = useState("");
  const [targetCompareDate, setTargetCompareDate] = useState("");
  const [compareLogs, setCompareLogs] = useState<any>(null);
  const [isComparing, setIsComparing] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const handleOnline = () => { setIsOnline(true); triggerOfflineQueueSync(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [outletId]);

  useEffect(() => {
    if (session?.user) {
      fetchCoreERP();
      triggerOfflineQueueSync();
    }
  }, [dateFilter, customStartDate, customEndDate, outletId, session]);

  const triggerOfflineQueueSync = async () => {
    const secureOutletId = (session?.user as any)?.outletId || outletId;
    const savedQueue = localStorage.getItem(`zapped_offline_prod_queue_${secureOutletId}`);
    if (!savedQueue) return;
    const queue = JSON.parse(savedQueue);
    if (queue.length === 0) return;
    
    const remaining: any[] = [];
    for (const payload of queue) {
      try {
        const res = await fetch("/api/production", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (!res.ok) remaining.push(payload);
      } catch (err) { remaining.push(payload); }
    }
    
    if (remaining.length === 0) localStorage.removeItem(`zapped_offline_prod_queue_${secureOutletId}`);
    else localStorage.setItem(`zapped_offline_prod_queue_${secureOutletId}`, JSON.stringify(remaining));
    
    fetchCoreERP();
  };

  const fetchCoreERP = async () => {
    if (!session?.user) return;
    const secureTenantId = (session.user as any).tenantId;
    const secureOutletId = (session.user as any).outletId || outletId;

    setLoading(true);

    if (!navigator.onLine) {
      try {
        const localMenus = await localDB.menuItems.where('tenantId').equals(secureTenantId).toArray();
        const localOrders = await localDB.orders.where('outletId').equals(secureOutletId).toArray();
        setMenuItems(localMenus);
        
        const sData: Record<string, { qty: number, revenue: number }> = {};
        localOrders.forEach(order => {
          const isComp = order.paymentMode === "COMPLIMENTARY" || order.isComplementary;
          order.items?.forEach((item: any) => {
            if (!sData[item.menuItemId]) sData[item.menuItemId] = { qty: 0, revenue: 0 };
            sData[item.menuItemId].qty += item.quantity;
            if (!isComp) sData[item.menuItemId].revenue += (item.price * item.quantity);
          });
        });
        setSalesData(sData);
      } catch(e) {}
      setLoading(false);
      return;
    }

    let url = `/api/production?date=${dateFilter}`;
    if (dateFilter === "custom" && customStartDate && customEndDate) url += `&startDate=${customStartDate}&endDate=${customEndDate}`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setSalesData(data.salesData);
        setMenuItems(data.menuItems);
        setRawMaterials(data.rawMaterials);
        setRecipes(data.recipes);
        setHistory(data.productionBatches);
      }
    } catch (err) {
      console.error("ERP Sync Failed.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => { setTimeout(() => { window.print(); }, 150); };

  const loadExistingMapping = (menuId: string) => {
    setMapItem(menuId);
    setMapBaseQty("20");
    setInnerServingPieces("2");
    const existing = recipes.filter(r => r.finishedGoodId === menuId);
    if (existing.length > 0) {
      setMapMaterials(existing.map(e => ({ 
        rawMaterialId: e.rawMaterialId, 
        quantityUsed: (e.quantityUsed * 20).toString(), 
        wastageBuffer: "0" 
      })));
    } else {
      setMapMaterials([{ rawMaterialId: "", quantityUsed: "", wastageBuffer: "0" }]);
    }
  };

  const saveMapping = async () => {
    if (!mapItem || mapMaterials.some(m => !m.rawMaterialId || !m.quantityUsed) || parseFloat(mapBaseQty) <= 0) return alert("Complete formula variables.");
    setIsSavingMap(true);
    
    const adjustedMaterials = mapMaterials.map(m => {
      const baseQtyFactor = parseFloat(mapBaseQty);
      const rawQty = parseFloat(m.quantityUsed);
      const wastage = parseFloat(m.wastageBuffer || "0") / 100;
      const perUnitBase = (rawQty / baseQtyFactor) * (1 + wastage);
      return { rawMaterialId: m.rawMaterialId, quantityUsed: perUnitBase.toString() };
    });

    const payload = { action: "SAVE_MAPPING", mappingData: { menuItemId: mapItem, baseQty: "1", materials: adjustedMaterials } };

    if (!navigator.onLine) {
      const secureOutletId = (session?.user as any).outletId || outletId;
      const queue = JSON.parse(localStorage.getItem(`zapped_offline_prod_queue_${secureOutletId}`) || "[]");
      queue.push(payload);
      localStorage.setItem(`zapped_offline_prod_queue_${secureOutletId}`, JSON.stringify(queue));
      alert("✅ Offline Mode: Yield Recipe Formula queued for sync!");
      setIsSavingMap(false);
      return;
    }

    try {
      const res = await fetch("/api/production", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) { alert("✅ Yield Recipe Formula Locked!"); fetchCoreERP(); }
      else { alert(`⚠️ Save Failed: ${data.error}`); }
    } catch(e) { alert("Error saving BOM."); } finally { setIsSavingMap(false); }
  };

  const handleProdItemSelect = (menuId: string) => {
    setProdItem(menuId);
    setProdQty("");
    setFinishedWastage("");
    const mapped = recipes.filter(r => r.finishedGoodId === menuId);
    setActualRM(mapped.map(m => ({
      rawMaterialId: m.rawMaterialId,
      name: m.rawMaterial.itemName,
      unit: m.rawMaterial.unit,
      expected: m.quantityUsed, 
      actualUsed: "",
      rawWastage: ""
    })));
  };

  const handleProdQtyChange = (val: string) => {
    setProdQty(val);
    const qty = parseFloat(val) || 0;
    setActualRM(prev => prev.map(rm => ({ ...rm, actualUsed: (rm.expected * qty).toFixed(3), rawWastage: rm.rawWastage || "0" })));
  };

  const submitProductionEntry = async () => {
    if (!prodItem || parseFloat(prodQty) <= 0) return alert("Enter valid production quantity.");
    const sanitizedRM = actualRM.map(rm => ({ ...rm, actualUsed: rm.actualUsed || "0", rawWastage: rm.rawWastage || "0" }));
    setIsProducing(true);

    const payload = { 
      action: "RECORD_PRODUCTION", 
      productionData: { menuItemId: prodItem, producedQty: prodQty, finishedWastage: finishedWastage || "0", actualMaterialsUsed: sanitizedRM } 
    };

    if (!navigator.onLine) {
      const secureOutletId = (session?.user as any).outletId || outletId;
      const queue = JSON.parse(localStorage.getItem(`zapped_offline_prod_queue_${secureOutletId}`) || "[]");
      queue.push(payload);
      localStorage.setItem(`zapped_offline_prod_queue_${secureOutletId}`, JSON.stringify(queue));
      alert("🏭 Offline Mode: Batch Entry Queued! Inventory will deduct upon connection.");
      setProdItem(""); setProdQty(""); setFinishedWastage(""); setActualRM([]); 
      setIsProducing(false);
      return;
    }

    try {
      const res = await fetch("/api/production", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) { 
        alert("🏭 Batch Entry Recorded & Inventory Deducted Precisely!"); 
        setProdItem(""); setProdQty(""); setFinishedWastage(""); setActualRM([]); 
        fetchCoreERP(); 
      } else { alert(`⚠️ Batch Save Failed!\nReason: ${data.error}`); }
    } catch(e) { alert("Network Database Error."); } finally { setIsProducing(false); }
  };

  const parseWastageFromBatchNo = (batchStr: string) => {
    if (!batchStr) return 0;
    const match = batchStr.match(/\[WASTE:(.*?)\]/);
    return match ? parseFloat(match[1]) : 0;
  };

  const executeHistoricalComparison = async () => {
    if (!compareItem || !baseCompareDate || !targetCompareDate) return alert("Select Product and both dates.");
    if (!navigator.onLine) return alert("Cannot perform analytics offline. Connect to internet.");
    
    setIsComparing(true);

    try {
      const bRes = await fetch(`/api/production?date=custom&startDate=${baseCompareDate}&endDate=${baseCompareDate}`);
      const bData = await bRes.json();
      const tRes = await fetch(`/api/production?date=custom&startDate=${targetCompareDate}&endDate=${targetCompareDate}`);
      const tData = await tRes.json();
      
      const bBatches = bData.productionBatches.filter((b:any)=>b.mappedMenuItemId === compareItem || b.finishedGoodId === compareItem);
      const tBatches = tData.productionBatches.filter((b:any)=>b.mappedMenuItemId === compareItem || b.finishedGoodId === compareItem);

      setCompareLogs({
        base: {
          date: baseCompareDate,
          sold: bData.salesData[compareItem]?.qty || 0,
          revenue: bData.salesData[compareItem]?.revenue || 0,
          produced: bBatches.reduce((s:number, b:any) => s + b.quantityProduced, 0),
          wasted: bBatches.reduce((s:number, b:any) => s + parseWastageFromBatchNo(b.batchNumber), 0)
        },
        target: {
          date: targetCompareDate,
          sold: tData.salesData[compareItem]?.qty || 0,
          revenue: tData.salesData[compareItem]?.revenue || 0,
          produced: tBatches.reduce((s:number, b:any) => s + b.quantityProduced, 0),
          wasted: tBatches.reduce((s:number, b:any) => s + parseWastageFromBatchNo(b.batchNumber), 0)
        }
      });
    } catch(e) { alert("Error parsing analytics."); } finally { setIsComparing(false); }
  };

  const totalSalesRevenue = Object.values(salesData).reduce((sum, item) => sum + item.revenue, 0);

  return (
    <>
      <title>ZedPoss | Production, BOM & Yield ERP</title>
      <meta name="description" content="Enterprise Production and Manufacturing ERP by ZedPoss. Track BOM recipes, raw material consumption, yield, and wastage seamlessly." />

      <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden print:h-auto print:overflow-visible print:bg-white">
        
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            html, body, div, table, tbody, tr, td { height: auto !important; overflow: visible !important; background: white !important; color: black !important; }
            .print\\:hidden { display: none !important; }
            #enterprise-receipt-print-area { display: block !important; opacity: 1 !important; position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; z-index: 999999 !important; }
          }
        `}} />

        <div className="p-6 pb-0 bg-white border-b border-slate-200 shrink-0 print:hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5 gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
                <Factory className="mr-2 text-indigo-600" /> ERP: Sales & Production
                {!isOnline && <span className="ml-3 px-2 py-1 bg-red-100 text-red-600 text-[10px] rounded-lg flex items-center border border-red-200"><WifiOff size={12} className="mr-1"/> SYNC PAUSED</span>}
              </h1>
              <p className="text-xs text-slate-500 font-bold mt-1">Enterprise Manufacturing, Wastage & Scalability Hub</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="p-2.5 border border-slate-200 rounded-xl font-black text-xs uppercase tracking-wider bg-white outline-none focus:border-indigo-500">
                <option value="today">Today's Ledger</option><option value="yesterday">Yesterday's Ledger</option><option value="custom">Custom Range</option><option value="all_history">All Time History</option>
              </select>
              {dateFilter === "custom" && (
                <div className="flex items-center gap-2 animate-in fade-in">
                  <input type="date" value={customStartDate} onChange={(e)=>setCustomStartDate(e.target.value)} className="p-2 border border-slate-200 rounded-xl text-xs font-bold" />
                  <input type="date" value={customEndDate} onChange={(e)=>setCustomEndDate(e.target.value)} className="p-2 border border-slate-200 rounded-xl text-xs font-bold" />
                </div>
              )}
              <button onClick={handlePrint} className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center shadow-md transition-all active:scale-95"><Printer size={16} className="mr-1.5" /> Print Detailed Ledger</button>
            </div>
          </div>

          <div className="flex space-x-1 overflow-x-auto custom-scrollbar border-b border-slate-200">
            {[
              { id: "SALES", icon: <ClipboardList size={14}/>, label: "1. Item Sales" },
              { id: "MAPPING", icon: <GitMerge size={14}/>, label: "2. BOM Mapping Details" },
              { id: "ENTRY", icon: <Settings2 size={14}/>, label: "3. Daily Production Entry" },
              { id: "RECONCILIATION", icon: <ArrowRightLeft size={14}/>, label: "4. Sales vs Production" },
              { id: "HISTORY", icon: <History size={14}/>, label: "5. Recent History" },
              { id: "BATCH_CALC", icon: <Calculator size={14}/>, label: "6. Batch Production" },
              { id: "COMPARE", icon: <ArrowLeftRight size={14}/>, label: "7. Pro Compare Analytics" }
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`pb-3 px-4 flex items-center text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === tab.id ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}><span className="mr-1.5">{tab.icon}</span> {tab.label}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex justify-center items-center print:hidden"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>
        ) : (
          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar print:p-0 print:overflow-visible print:h-auto">

            {/* ================= TAB 1: ITEM SALES ================= */}
            {activeTab === "SALES" && (
              <div className="animate-in fade-in duration-200 print:hidden">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center"><h3 className="font-black text-white text-sm uppercase">Actual Counter Sales Movement</h3><span className="text-xs text-indigo-300 font-bold tracking-widest">Total: ₹{totalSalesRevenue.toFixed(2)}</span></div>
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100/50 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <tr><th className="p-4">Item Name</th><th className="p-4">Category</th><th className="p-4 text-center">Qty Sold</th><th className="p-4 w-48">Revenue % Share</th><th className="p-4 text-right">Net Revenue</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {menuItems.filter(m => salesData[m.id]?.qty > 0).map((item) => {
                        const revenue = salesData[item.id]?.revenue || 0;
                        const percent = totalSalesRevenue > 0 ? ((revenue / totalSalesRevenue) * 100).toFixed(1) : "0.0";
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                            <td className="p-4 font-black text-slate-800 uppercase">{item.name}</td>
                            <td className="p-4"><span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-1 rounded font-bold uppercase tracking-wider">{item.category?.name || "Uncategorized"}</span></td>
                            <td className="p-4 text-center font-mono font-black text-indigo-600 text-lg">{salesData[item.id]?.qty || 0}</td>
                            <td className="p-4">
                              <div className="flex items-center space-x-2">
                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-400 rounded-full" style={{width: `${percent}%`}}></div></div>
                                <span className="text-[10px] font-black text-slate-500 w-8 text-right">{percent}%</span>
                              </div>
                            </td>
                            <td className="p-4 text-right font-mono font-black text-emerald-600">₹{revenue.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 2: MAPPING DETAILS */}
            {activeTab === "MAPPING" && (
              <div className="animate-in fade-in duration-200 flex flex-col lg:flex-row gap-6 print:hidden">
                <div className="w-full lg:w-1/3 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[600px]">
                  <div className="p-4 bg-slate-50 border-b border-slate-200"><h3 className="font-black text-slate-800 text-xs uppercase tracking-wider">Select Product to Map</h3></div>
                  <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                    {menuItems.map(item => (
                      <button key={item.id} onClick={() => loadExistingMapping(item.id)} className={`w-full text-left p-4 flex justify-between items-center transition-colors ${mapItem === item.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : 'hover:bg-slate-50 border-l-4 border-transparent'}`}>
                        <div><span className="block font-black text-slate-800 uppercase text-xs">{item.name}</span><span className="text-[10px] text-slate-400 font-bold">{recipes.some(r=>r.finishedGoodId === item.id) ? '🟢 Yield Pattern Locked' : '🔴 Unmapped'}</span></div>
                        <ChevronRight size={16} className={mapItem === item.id ? 'text-indigo-600' : 'text-slate-300'}/>
                      </button>
                    ))}
                  </div>
                </div>

                {mapItem ? (
                  <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[600px]">
                    <div className="p-4 bg-slate-900 flex justify-between items-center shrink-0">
                      <h3 className="font-black text-white text-xs uppercase tracking-wider flex items-center"><GitMerge size={16} className="mr-2 text-indigo-400"/> Yield Breakdown Configurator</h3>
                    </div>
                    <div className="p-4 border-b border-slate-200 bg-slate-50/80 grid grid-cols-2 gap-4 shrink-0">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Serving Unit Definition</label>
                        <div className="flex items-center space-x-2"><span className="text-xs font-bold text-slate-600">1 Serving contains</span><input type="number" min="1" value={innerServingPieces} onChange={(e)=>setInnerServingPieces(e.target.value)} className="w-16 p-1.5 border border-slate-300 rounded font-mono font-black text-center text-xs outline-none" /><span className="text-xs font-bold text-slate-600">Pcs / Gsm</span></div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Target Bulk Prep Size</label>
                        <div className="flex items-center space-x-2"><span className="text-xs font-bold text-slate-600">Calculate for</span><input type="number" min="1" value={mapBaseQty} onChange={(e)=>setMapBaseQty(e.target.value)} className="w-16 p-1.5 border border-slate-300 rounded font-mono font-black text-center text-xs outline-none" /><span className="text-xs font-bold text-slate-600">Total Servings</span></div>
                      </div>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto bg-slate-50 custom-scrollbar space-y-3">
                      {mapMaterials.map((rm, idx) => (
                        <div key={idx} className="flex items-end gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                          <div className="flex-1"><label className="block text-[9px] font-black uppercase text-slate-500 mb-1">Raw Material</label><select value={rm.rawMaterialId} onChange={(e) => { const arr = [...mapMaterials]; arr[idx].rawMaterialId = e.target.value; setMapMaterials(arr); }} className="w-full p-2 border border-slate-200 rounded text-xs font-bold bg-white outline-none"><option value="" disabled>Select...</option>{rawMaterials.map(r => <option key={r.id} value={r.id}>{r.itemName} ({r.unit})</option>)}</select></div>
                          <div className="w-28"><label className="block text-[9px] font-black uppercase text-slate-500 mb-1">Bulk Qty Input</label><input type="number" step="any" min="0" placeholder="e.g. 4.00" value={rm.quantityUsed} onChange={(e) => { const arr = [...mapMaterials]; arr[idx].quantityUsed = e.target.value; setMapMaterials(arr); }} className="w-full p-2 border border-slate-200 rounded text-xs font-mono font-black outline-none" /></div>
                          <div className="w-24"><label className="block text-[9px] font-black uppercase text-slate-500 mb-1 flex items-center"><Percent size={10} className="mr-0.5"/> Wastage %</label><input type="number" min="0" max="50" placeholder="0" value={rm.wastageBuffer} onChange={(e) => { const arr = [...mapMaterials]; arr[idx].wastageBuffer = e.target.value; setMapMaterials(arr); }} className="w-full p-2 border border-slate-200 rounded text-xs font-mono font-black outline-none text-red-500" /></div>
                          <button onClick={() => setMapMaterials(mapMaterials.filter((_, i) => i !== idx))} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"><XCircle size={18}/></button>
                        </div>
                      ))}
                      <button onClick={() => setMapMaterials([...mapMaterials, { rawMaterialId: "", quantityUsed: "", wastageBuffer: "0" }])} className="text-xs font-black text-indigo-600 bg-indigo-50 border border-indigo-200 py-2 px-4 rounded-lg uppercase tracking-wider border-dashed w-full">+ Add Ingredient Component</button>
                    </div>
                    <div className="p-4 bg-white border-t border-slate-200 shrink-0"><button disabled={isSavingMap} onClick={saveMapping} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase py-3 rounded-xl text-xs flex justify-center items-center shadow-lg active:scale-95 disabled:opacity-50">{isSavingMap ? <Loader2 className="animate-spin" size={16}/> : "Lock Yield Formula"}</button></div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col justify-center items-center bg-slate-50 border border-slate-200 rounded-2xl border-dashed"><GitMerge size={60} className="text-slate-300 mb-4"/><h3 className="text-sm font-black text-slate-500 uppercase">No Product Selected</h3></div>
                )}
              </div>
            )}

            {/* TAB 3: DAILY ENTRY */}
            {activeTab === "ENTRY" && (
              <div className="animate-in fade-in duration-200 flex flex-col lg:flex-row gap-6 print:hidden">
                <div className="w-full lg:w-1/2 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[680px]">
                  <div className="p-4 bg-slate-900"><h3 className="font-black text-white text-xs uppercase tracking-wider flex items-center"><Factory size={16} className="mr-2 text-indigo-400"/> Log Shift Batch & Wastage</h3></div>
                  <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-5">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">What item was produced?</label>
                      <select value={prodItem} onChange={(e) => handleProdItemSelect(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 bg-white">
                        <option value="" disabled>Select Item...</option>
                        {menuItems.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                    {prodItem && (
                      <div className="animate-in fade-in slide-in-from-top-2 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-black uppercase text-indigo-600 mb-1.5">Servings Manufactured</label>
                            <input type="number" min="1" placeholder="0" value={prodQty} onChange={(e) => handleProdQtyChange(e.target.value)} className="w-full p-3 border-2 border-indigo-200 rounded-xl font-mono font-black text-indigo-700 text-lg outline-none bg-indigo-50/30" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black uppercase text-red-500 mb-1.5">Finished Goods Waste (Servings)</label>
                            <input type="number" min="0" placeholder="0" value={finishedWastage} onChange={(e) => setFinishedWastage(e.target.value)} className="w-full p-3 border-2 border-red-100 rounded-xl font-mono font-black text-red-600 text-lg outline-none bg-red-50/30" />
                          </div>
                        </div>

                        {parseFloat(prodQty) > 0 && actualRM.length > 0 && (
                          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            <div className="bg-slate-50 p-3 border-b border-slate-200 flex flex-col"><h4 className="text-[10px] font-black uppercase text-slate-800">Raw Material Deduction Mapping</h4><p className="text-[8px] text-slate-500 font-bold tracking-wider uppercase mt-1">Exact quantities shown below will be deducted directly from physical Inventory SKUs.</p></div>
                            <div className="p-4 space-y-4 bg-white">
                              {actualRM.map((rm, idx) => (
                                <div key={idx} className="grid grid-cols-3 gap-2 items-center border-b pb-2 last:border-0 last:pb-0">
                                  <div className="text-xs font-bold text-slate-800 uppercase truncate" title={`Inventory SKU Mapped: ${rm.rawMaterialId}`}>{rm.name} <span className="text-[9px] text-slate-400 block">({rm.unit})</span></div>
                                  <div>
                                    <span className="text-[8px] uppercase font-black text-emerald-600 block mb-0.5">Yield Consumed</span>
                                    <input type="number" step="any" value={rm.actualUsed} onChange={(e) => { setActualRM(prev => prev.map((item, i) => i === idx ? { ...item, actualUsed: e.target.value } : item)); }} className="w-full p-1.5 border border-emerald-200 rounded font-mono font-black text-xs text-right bg-emerald-50/20 text-emerald-800" />
                                  </div>
                                  <div>
                                    <span className="text-[8px] uppercase font-black text-red-500 block mb-0.5">Raw RM Wasted</span>
                                    <input type="number" step="any" value={rm.rawWastage} onChange={(e) => { setActualRM(prev => prev.map((item, i) => i === idx ? { ...item, rawWastage: e.target.value } : item)); }} className="w-full p-1.5 border border-red-200 text-red-600 rounded font-mono font-black text-xs text-right bg-red-50/30" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="p-4 border-t border-slate-200 bg-slate-50 shrink-0"><button disabled={isProducing || !prodItem || parseFloat(prodQty)<=0} onClick={submitProductionEntry} className="w-full bg-slate-900 text-white font-black uppercase py-3.5 rounded-xl text-xs flex justify-center items-center shadow-lg">{isProducing ? <Loader2 className="animate-spin" size={16}/> : "Log Batch & Deduct Exact Inventory"}</button></div>
                </div>

                <div className="w-full lg:w-1/2 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[650px]">
                  <div className="p-4 bg-slate-50 border-b border-slate-200"><h3 className="font-black text-slate-800 text-xs uppercase tracking-wider flex items-center"><History size={16} className="mr-2 text-slate-400"/> Active Shift Batches</h3></div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {history.slice(0, 50).map((h, i) => {
                      const waste = parseWastageFromBatchNo(h.batchNumber);
                      return (
                        <div key={i} className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex justify-between items-center">
                          <div>
                            <span className="text-xs font-black text-slate-800 uppercase block">{h.finishedGoodName || "Item"}</span>
                            <span className="text-[9px] text-slate-500 font-bold block">{new Date(h.date).toLocaleString('en-IN', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'})}</span>
                            <span className="text-[8px] text-slate-400 font-bold">{h.batchNumber.split("[")[0]}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-base font-mono font-black text-indigo-600 block">+{h.quantityProduced} Serv.</span>
                            {waste > 0 && <span className="text-[9px] font-black bg-red-100 text-red-700 px-1.5 py-0.5 rounded uppercase">Wasted: {waste}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: RECONCILIATION */}
            {activeTab === "RECONCILIATION" && (
              <div className="animate-in fade-in duration-200 print:hidden">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-900 text-[10px] font-black uppercase tracking-wider text-slate-300 border-b border-slate-800">
                      <tr><th>Product Name</th><th className="p-4 text-center">Total Manufactured</th><th className="p-4 text-center">Finished Wasted</th><th className="p-4 text-center">Total Sold</th><th className="p-4 text-center">Expected Closing Balance</th><th className="p-4 text-right">Operational Leakage %</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {menuItems.map((item) => {
                        const sold = salesData[item.id]?.qty || 0;
                        const batchLogs = history.filter(h => h.mappedMenuItemId === item.id);
                        const produced = batchLogs.reduce((s, h) => s + h.quantityProduced, 0);
                        const wasted = batchLogs.reduce((s, h) => s + parseWastageFromBatchNo(h.batchNumber), 0);
                        if (sold === 0 && produced === 0) return null;
                        
                        const closing = produced - sold - wasted;
                        const leakPercent = produced > 0 && closing < 0 ? ((Math.abs(closing) / produced) * 100).toFixed(1) : "0.0";

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                            <td className="p-4 font-black text-slate-800 uppercase">{item.name}</td>
                            <td className="p-4 text-center font-mono font-black text-indigo-600">{produced} Serv.</td>
                            <td className="p-4 text-center font-mono font-bold text-red-500">{wasted > 0 ? `${wasted} Serv.` : "-"}</td>
                            <td className="p-4 text-center font-mono font-black text-slate-600">{sold} Sold</td>
                            <td className={`p-4 text-center font-mono font-black ${closing < 0 ? 'text-red-600 bg-red-50' : 'text-emerald-600 bg-emerald-50'}`}>{closing} Units</td>
                            <td className="p-4 text-right">
                              {parseFloat(leakPercent) > 0 ? <span className="bg-red-50 text-red-600 border border-red-100 font-mono font-black px-2 py-1 rounded text-xs">{leakPercent}% Leak</span> : <span className="text-emerald-600 font-bold text-[10px] uppercase">Stable</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 5: RECENT HISTORY */}
            {activeTab === "HISTORY" && (
              <div className="animate-in fade-in duration-200 print:hidden">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100/50 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <tr><th className="p-4">Batch Timeline</th><th className="p-4">Item Formulated</th><th className="p-4 text-center">Net Yield</th><th className="p-4 text-center">Waste Lost</th><th className="p-4 text-center">Yield Efficiency</th><th className="p-4 text-right">Batch Status</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {history.map((h, i) => {
                        const waste = parseWastageFromBatchNo(h.batchNumber);
                        const totalMaterialAttempted = h.quantityProduced + waste;
                        const efficiency = totalMaterialAttempted > 0 ? ((h.quantityProduced / totalMaterialAttempted) * 100).toFixed(1) : "100.0";
                        
                        return (
                          <tr key={i} className="hover:bg-slate-50/50">
                            <td className="p-4">
                              <span className="font-black text-slate-800 block text-xs">{new Date(h.date).toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'})}</span>
                              <span className="text-[10px] text-slate-400 font-bold">{new Date(h.date).toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit'})} • {h.batchNumber.split("[")[0]}</span>
                            </td>
                            <td className="p-4 font-black text-slate-700 uppercase">{h.finishedGoodName || "Item"}</td>
                            <td className="p-4 text-center font-mono font-black text-emerald-600">+{h.quantityProduced}</td>
                            <td className="p-4 text-center font-mono font-bold text-red-500">{waste > 0 ? waste : "-"}</td>
                            <td className="p-4 text-center">
                              <span className="font-mono font-black text-slate-700 text-xs">{efficiency}%</span>
                              <div className="w-16 h-1.5 bg-slate-200 rounded-full mt-1 mx-auto overflow-hidden"><div className={`h-full ${parseFloat(efficiency) > 90 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{width: `${efficiency}%`}}></div></div>
                            </td>
                            <td className="p-4 text-right">
                              {waste > 0 ? <span className="bg-red-50 text-red-700 border border-red-200 text-[9px] px-2 py-1 rounded uppercase tracking-wider font-black">High Waste</span> : <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] px-2 py-1 rounded uppercase tracking-wider font-black">Perfect Batch</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 6: BATCH CALCULATOR */}
            {activeTab === "BATCH_CALC" && (
              <div className="animate-in fade-in duration-200 flex flex-col items-center print:hidden">
                <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
                  <div className="p-6 bg-slate-900 border-b border-slate-800 text-center">
                    <h3 className="font-black text-white text-xl uppercase tracking-widest">Production Recipe Ledger</h3>
                    <p className="text-xs text-slate-400 font-bold mt-1">Auto-scaled ingredient estimation parameters</p>
                  </div>
                  <div className="p-6 bg-indigo-50/50 border-b border-slate-200 flex gap-4">
                    <div className="flex-1"><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Target Product</label><select value={calcItem} onChange={(e) => setCalcItem(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-white"><option value="" disabled>Select Item...</option>{menuItems.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
                    <div className="w-48"><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Target Servings</label><input type="number" min="1" placeholder="e.g. 20" value={calcQty} onChange={(e) => setCalcQty(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl font-mono font-black text-indigo-700" /></div>
                  </div>
                  <div className="p-6 bg-white min-h-[250px]">
                    {calcItem && parseFloat(calcQty) > 0 ? (
                      <table className="w-full text-left">
                        <thead><tr className="text-[10px] font-black uppercase text-slate-400 border-b"><th>Raw Material Item</th><th className="text-right">Required Quantity Matrix</th></tr></thead>
                        <tbody className="divide-y font-mono text-sm">{recipes.filter(r => r.finishedGoodId === calcItem).map((rm, idx) => (<tr key={idx}><td className="py-3 font-bold text-slate-700 uppercase">{rm.rawMaterial?.itemName}</td><td className="py-3 text-right font-black text-slate-900">{(rm.quantityUsed * parseFloat(calcQty)).toFixed(3)} {rm.rawMaterial?.unit}</td></tr>))}</tbody>
                      </table>
                    ) : <div className="text-center text-slate-300 py-10 uppercase tracking-widest text-xs font-black">Awaiting yield matrix criteria</div>}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 7: ADVANCED COMPARE ANALYTICS */}
            {activeTab === "COMPARE" && (
              <div className="animate-in fade-in duration-200 space-y-6 print:hidden">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Select Product to Evaluate</label>
                    <select value={compareItem} onChange={(e) => setCompareItem(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold bg-white">
                      <option value="" disabled>Choose Item...</option>
                      {menuItems.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 flex items-center"><Calendar size={12} className="mr-1 text-indigo-500"/> Target Period (e.g. This Saturday)</label><input type="date" value={targetCompareDate} onChange={(e)=>setTargetCompareDate(e.target.value)} className="w-full p-2 border border-slate-200 rounded-xl text-xs font-bold" /></div>
                  <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 flex items-center"><Calendar size={12} className="mr-1 text-orange-500"/> Base Baseline (e.g. Last Sunday)</label><input type="date" value={baseCompareDate} onChange={(e)=>setBaseCompareDate(e.target.value)} className="w-full p-2 border border-slate-200 rounded-xl text-xs font-bold" /></div>
                  <button disabled={isComparing} onClick={executeHistoricalComparison} className="bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex justify-center items-center shadow-md transition-all active:scale-95">
                    {isComparing ? <Loader2 size={16} className="animate-spin" /> : "Compare Velocity Logs"}
                  </button>
                </div>

                {compareLogs && compareItem && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in zoom-in duration-100">
                    
                    {/* Base Period */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                      <div className="p-4 bg-slate-50 border-b border-slate-200"><h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex justify-between"><span>BASE TIMELINE</span> <span className="text-orange-600">{compareLogs.base.date}</span></h4></div>
                      <div className="p-5 space-y-4">
                        <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-500 uppercase">Items Sold</span><span className="text-lg font-mono font-black text-slate-800">{compareLogs.base.sold}</span></div>
                        <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-500 uppercase">Revenue</span><span className="text-lg font-mono font-black text-emerald-600">₹{compareLogs.base.revenue}</span></div>
                        <div className="flex justify-between items-center pt-4 border-t border-slate-100"><span className="text-xs font-bold text-slate-500 uppercase">Total Manufactured</span><span className="text-lg font-mono font-black text-indigo-600">{compareLogs.base.produced}</span></div>
                        <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-500 uppercase">Finished Waste</span><span className="text-lg font-mono font-black text-red-500">{compareLogs.base.wasted}</span></div>
                      </div>
                    </div>

                    {/* Variance Logic Analyzer */}
                    <div className="bg-indigo-900 rounded-2xl shadow-xl p-5 flex flex-col justify-center items-center relative overflow-hidden">
                      <ArrowLeftRight size={100} className="absolute text-white/5 right-[-20px] top-[-20px]"/>
                      <h3 className="text-white font-black text-sm uppercase tracking-widest mb-6 border-b border-indigo-700 pb-2 w-full text-center">Trend Trajectory</h3>
                      
                      {(() => {
                        const sDiff = compareLogs.target.sold - compareLogs.base.sold;
                        const sPct = compareLogs.base.sold > 0 ? ((sDiff / compareLogs.base.sold) * 100).toFixed(1) : "100.0";
                        const pDiff = compareLogs.target.produced - compareLogs.base.produced;
                        const pPct = compareLogs.base.produced > 0 ? ((pDiff / compareLogs.base.produced) * 100).toFixed(1) : "100.0";
                        
                        return (
                          <div className="w-full space-y-6">
                            <div className="text-center">
                              <span className="text-[10px] text-indigo-300 font-black uppercase tracking-wider block mb-1">Sales Volume Trend</span>
                              <div className={`text-3xl font-black font-mono flex items-center justify-center ${sDiff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {sDiff >= 0 ? <TrendingUp size={24} className="mr-2"/> : <TrendingDown size={24} className="mr-2"/>} {sDiff >= 0 ? '+' : ''}{sPct}%
                              </div>
                            </div>
                            <div className="text-center">
                              <span className="text-[10px] text-indigo-300 font-black uppercase tracking-wider block mb-1">Production Scaling Needs</span>
                              <div className={`text-xl font-black font-mono flex items-center justify-center ${pDiff >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
                                {pDiff >= 0 ? '+' : ''}{pPct}% Required
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Target Period */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                      <div className="p-4 bg-slate-50 border-b border-slate-200"><h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex justify-between"><span>TARGET TIMELINE</span> <span className="text-indigo-600">{compareLogs.target.date}</span></h4></div>
                      <div className="p-5 space-y-4">
                        <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-500 uppercase">Items Sold</span><span className="text-lg font-mono font-black text-slate-800">{compareLogs.target.sold}</span></div>
                        <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-500 uppercase">Revenue</span><span className="text-lg font-mono font-black text-emerald-600">₹{compareLogs.target.revenue}</span></div>
                        <div className="flex justify-between items-center pt-4 border-t border-slate-100"><span className="text-xs font-bold text-slate-500 uppercase">Total Manufactured</span><span className="text-lg font-mono font-black text-indigo-600">{compareLogs.target.produced}</span></div>
                        <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-500 uppercase">Finished Waste</span><span className="text-lg font-mono font-black text-red-500">{compareLogs.target.wasted}</span></div>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* ------------------- 🔥 ENTERPRISE HARDWARE DYNAMIC PRINT ENGINE ------------------- */}
        <div id="enterprise-receipt-print-area" className="hidden text-black font-mono p-4 w-full">
          <div className="text-center pb-2 border-b-2 border-black">
            <h2 className="font-black text-xl uppercase tracking-tight">
              {printerConfig.headerName} {
                activeTab === 'SALES' ? "SALES REPORT" :
                activeTab === 'MAPPING' ? "BOM MASTER FORMULAS" :
                activeTab === 'ENTRY' || activeTab === 'HISTORY' ? "BATCH PRODUCTION LOGS" :
                activeTab === 'BATCH_CALC' ? "RECIPE GENERATION LEDGER" :
                activeTab === 'COMPARE' ? "ANALYTICS COMPARISON LOG" : "YIELD RECONCILIATION SUMMARY"
              }
            </h2>
            <p className="text-[10px] font-bold mt-1">Period Range Log Filter: {dateFilter.toUpperCase()}</p>
            <p className="text-[9px] text-left mt-3">Timestamp Gate: {isMounted ? new Date().toLocaleString('en-IN') : ''}</p>
          </div>

          <div className="my-4">
            
            {/* TAB 1: SALES PRINT */}
            {activeTab === "SALES" && (
              <table className="w-full text-[11px] mt-2 border-collapse">
                <thead><tr className="border-b border-black text-left"><th>ITEM NAME</th><th className="text-center">QTY SOLD</th><th className="text-right">REVENUE</th></tr></thead>
                <tbody>
                  {menuItems.filter(m => salesData[m.id]?.qty > 0).map((item) => (
                    <tr key={item.id} className="border-b border-gray-200">
                      <td className="py-1 uppercase">{item.name}</td>
                      <td className="py-1 text-center font-black">{salesData[item.id]?.qty || 0}</td>
                      <td className="py-1 text-right font-black">₹{Number(salesData[item.id]?.revenue || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* TAB 4: RECONCILIATION PRINT */}
            {activeTab === "RECONCILIATION" && (
              <table className="w-full text-[11px] mt-2 border-collapse">
                <thead><tr className="border-b border-black text-left"><th>PRODUCT</th><th className="text-center">PRODUCED</th><th className="text-center">WASTE</th><th className="text-center">SOLD</th><th className="text-right">CLOSING BAL</th></tr></thead>
                <tbody>
                  {menuItems.map((item) => {
                    const sold = salesData[item.id]?.qty || 0;
                    const batchLogs = history.filter(h => h.mappedMenuItemId === item.id);
                    const produced = batchLogs.reduce((s, h) => s + h.quantityProduced, 0);
                    const wasted = batchLogs.reduce((s, h) => s + parseWastageFromBatchNo(h.batchNumber), 0);
                    if (sold === 0 && produced === 0) return null;
                    return (
                      <tr key={item.id} className="border-b border-gray-200">
                        <td className="py-1 uppercase">{item.name}</td>
                        <td className="py-1 text-center">{produced}</td>
                        <td className="py-1 text-center text-red-600">{wasted}</td>
                        <td className="py-1 text-center">{sold}</td>
                        <td className="py-1 text-right font-black">{produced - sold - wasted}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* TAB 5: RECENT HISTORY PRINT */}
            {activeTab === "HISTORY" && (
              <table className="w-full text-[11px] mt-2 border-collapse">
                <thead><tr className="border-b border-black text-left"><th>TIMESTAMP</th><th>ITEM NAME</th><th className="text-center">YIELD</th><th className="text-center">WASTE</th><th className="text-right">RM DEDUCTIONS</th></tr></thead>
                <tbody>
                  {history.map((h, i) => {
                    const waste = parseWastageFromBatchNo(h.batchNumber);
                    return (
                      <tr key={i} className="border-b border-gray-200">
                        <td className="py-1">{new Date(h.date).toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit'})}</td>
                        <td className="py-1 uppercase">{h.finishedGoodName || "Item"}</td>
                        <td className="py-1 text-center font-black">+{h.quantityProduced}</td>
                        <td className="py-1 text-center text-red-600">{waste > 0 ? waste : '-'}</td>
                        <td className="py-1 text-right text-[8px] uppercase">
                          {h.rawMaterialsLogged && h.rawMaterialsLogged.length > 0 ? (
                            h.rawMaterialsLogged.map((rm:any, idx:number) => (
                              <div key={idx}>{rm.name}: {rm.deducted} {rm.unit}</div>
                            ))
                          ) : "No RM Logs"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* TAB 6: BATCH CALCULATOR PRINT */}
            {activeTab === "BATCH_CALC" && calcItem && parseFloat(calcQty) > 0 && (
              <>
                <h3 className="text-sm font-black uppercase bg-gray-100 p-1 tracking-wider border-b border-black text-center mb-2">TARGET ESTIMATION: {menuItems.find(m=>m.id===calcItem)?.name} ({calcQty} SERVINGS)</h3>
                <table className="w-full text-[12px] mt-2 border-collapse">
                  <thead><tr className="border-b border-black text-left"><th>RAW MATERIAL INGREDIENT</th><th className="text-right">REQUIRED QUANTITY SCALE</th></tr></thead>
                  <tbody>
                    {recipes.filter(r => r.finishedGoodId === calcItem).map((rm, idx) => (
                      <tr key={idx} className="border-b border-gray-200">
                        <td className="py-2 uppercase font-black">{rm.rawMaterial?.itemName}</td>
                        <td className="py-2 text-right font-black text-lg">{(rm.quantityUsed * parseFloat(calcQty)).toFixed(3)} {rm.rawMaterial?.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {/* TAB 7: COMPARE PRINT */}
            {activeTab === "COMPARE" && compareLogs && (
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-black p-2">
                  <h4 className="font-black text-[10px] uppercase text-center border-b border-black pb-1 mb-1">BASE: {compareLogs.base.date}</h4>
                  <div className="flex justify-between text-[10px]"><span>Yield:</span><span className="font-black">{compareLogs.base.produced}</span></div>
                  <div className="flex justify-between text-[10px]"><span>Sales:</span><span className="font-black">{compareLogs.base.sold}</span></div>
                </div>
                <div className="border border-black p-2">
                  <h4 className="font-black text-[10px] uppercase text-center border-b border-black pb-1 mb-1">TARGET: {compareLogs.target.date}</h4>
                  <div className="flex justify-between text-[10px]"><span>Yield:</span><span className="font-black">{compareLogs.target.produced}</span></div>
                  <div className="flex justify-between text-[10px]"><span>Sales:</span><span className="font-black">{compareLogs.target.sold}</span></div>
                </div>
              </div>
            )}

          </div>
          <div className="text-center font-black mt-8 border-t border-black pt-2 text-[10px] tracking-widest uppercase">--- END OF LEDGER DATA EXTRACTION ---</div>
        </div>

      </div>
    </>
  );
}
