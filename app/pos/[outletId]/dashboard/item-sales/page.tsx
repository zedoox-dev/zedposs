"use client";
import { useState, useEffect } from "react";
import { Loader2, PackageSearch, Flame, AlertTriangle, TrendingUp, Printer, Search, PieChart, Layers, WifiOff } from "lucide-react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";

export default function ItemSalesPage() {
  const params = useParams();
  const outletId = params.outletId as string;
  const { data: session } = useSession();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  
  const [dateFilter, setDateFilter] = useState("today"); 
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  
  const [printerConfig, setPrinterConfig] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(typeof window !== "undefined" ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); if(session?.user) fetchItemStats(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const pConf = localStorage.getItem(`zapped_printer_config_${outletId}`);
    if (pConf) setPrinterConfig(JSON.parse(pConf));
    else setPrinterConfig({ printerSize: "80mm", headerName: "RAMKESAR POS", headerSize: "text-lg", subHeader: "Premium Quality Outlet", subHeaderSize: "text-[10px]" });
    
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [outletId, session]);

  useEffect(() => {
    if (session?.user) {
      fetchItemStats();
    }
  }, [dateFilter, customStartDate, customEndDate, session]);

  const fetchItemStats = async () => {
    if (!session?.user) return;
    const tenantId = (session.user as any).tenantId;

    if (!navigator.onLine) {
      const cached = localStorage.getItem(`zap_item_sales_${outletId}_${dateFilter}`);
      if (cached) {
        setData(JSON.parse(cached));
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    let url = `/api/reports/items?outletId=${outletId}&tenantId=${tenantId}&date=${dateFilter}`;
    if (dateFilter === "custom" && customStartDate && customEndDate) {
      url += `&startDate=${customStartDate}&endDate=${customEndDate}`;
    }
    try {
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setData(json);
        localStorage.setItem(`zap_item_sales_${outletId}_${dateFilter}`, JSON.stringify(json));
      }
    } catch (err) {
      alert("Error generating item analytics!");
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReport = () => {
    if (!data) return;
    setTimeout(() => { window.print(); }, 150);
  };

  // Filter Data
  const categories = Array.from(new Set(data?.items?.map((i: any) => i.category) || []));
  const filteredItems = data?.items?.filter((item: any) => {
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = selectedCategory === "ALL" || item.category === selectedCategory;
    return matchSearch && matchCat;
  }) || [];

  // Identify High/Low velocity metrics safely
  const topSeller = data?.items?.length > 0 ? data.items[0] : null;
  const deadStockCount = data?.items?.filter((i: any) => i.qty <= 2).length || 0;

  return (
    <div className="flex h-full relative overflow-hidden bg-slate-50 print:overflow-visible">
      
      {/* ------------------- DESKTOP UI LAYER ------------------- */}
      <div className="flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar print:hidden">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-5 mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
              <PackageSearch className="mr-2 text-orange-500" /> Item Velocity Report
              {!isOnline && <span className="ml-3 px-2 py-1 bg-red-100 text-red-600 text-[10px] rounded-lg flex items-center border border-red-200"><WifiOff size={12} className="mr-1"/> OFFLINE CACHE</span>}
            </h1>
            <p className="text-xs text-slate-500 font-bold mt-0.5">Product-wise sales contribution and inventory movement analysis</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="p-2.5 border border-slate-200 rounded-xl font-black text-xs uppercase tracking-wider bg-white shadow-xs outline-none focus:border-orange-500">
              <option value="today">Today Accounts</option>
              <option value="yesterday">Yesterday Closed</option>
              <option value="custom">Custom Range Lookup</option>
            </select>

            {dateFilter === "custom" && (
              <div className="flex items-center gap-2 animate-in fade-in duration-100">
                <input type="date" value={customStartDate} onChange={(e)=>setCustomStartDate(e.target.value)} className="p-2 border border-slate-200 rounded-xl text-xs font-bold" />
                <span className="text-xs font-bold text-slate-400">TO</span>
                <input type="date" value={customEndDate} onChange={(e)=>setCustomEndDate(e.target.value)} className="p-2 border border-slate-200 rounded-xl text-xs font-bold" />
              </div>
            )}

            <button 
              type="button" disabled={loading || !data} onClick={handlePrintReport}
              className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center shadow-md active:scale-95 transition-all"
            >
              <Printer size={16} className="mr-1.5" /> Print Velocity
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex justify-center items-center"><Loader2 className="animate-spin text-orange-500" size={40} /></div>
        ) : !data ? (
          <p className="text-center font-bold text-slate-400 p-8">Analytical engine compile error setup parameters.</p>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-200 flex-1 flex flex-col">
            
            {/* 🔥 ULTRA PRO CARDS (5 Matrix Layout) */}
            <div className="overflow-x-auto pb-2 custom-scrollbar shrink-0">
              <div className="grid grid-cols-5 gap-4 min-w-[1100px]">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex flex-col justify-center">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Products Sold</span>
                    <Layers size={16} className="text-blue-500"/>
                  </div>
                  <p className="text-2xl font-mono font-black text-slate-900">{data.summary.totalItemsSold} Qty</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex flex-col justify-center">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Items Net Revenue</span>
                    <TrendingUp size={16} className="text-emerald-500"/>
                  </div>
                  <p className="text-2xl font-mono font-black text-slate-900">₹{Number(data.summary.totalRevenue).toFixed(2)}</p>
                </div>

                <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100 shadow-xs flex flex-col justify-center">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest block">Top Selling Item</span>
                    <Flame size={16} className="text-orange-500"/>
                  </div>
                  <p className="text-lg font-black text-orange-700 uppercase truncate" title={topSeller?.name}>{topSeller?.name || "N/A"}</p>
                  <span className="text-[10px] font-bold text-orange-600/80">{topSeller?.qty || 0} Units Sold</span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex flex-col justify-center">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Category Leader</span>
                    <PieChart size={16} className="text-indigo-500"/>
                  </div>
                  <p className="text-xl font-black text-indigo-700 uppercase truncate">{data.summary.topCategory}</p>
                </div>

                <div className="bg-red-50 p-5 rounded-2xl border border-red-100 shadow-xs flex flex-col justify-center">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-red-500 uppercase tracking-widest block">Dead Stock Alert</span>
                    <AlertTriangle size={16} className="text-red-500"/>
                  </div>
                  <p className="text-2xl font-mono font-black text-red-600">{deadStockCount} Items</p>
                  <span className="text-[9px] font-bold text-red-500/80 uppercase">Moved ≤ 2 Units</span>
                </div>
              </div>
            </div>

            {/* 🔥 FILTER & SEARCH BAR */}
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" placeholder="Search product name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none font-bold text-sm focus:border-orange-500 transition-colors" />
              </div>
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="p-3 border border-slate-200 rounded-xl font-bold text-sm outline-none bg-white min-w-[200px] uppercase text-slate-700">
                <option value="ALL">All Categories</option>
                {categories.map((cat: any) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            {/* 🔥 HIGH-TECH ITEM MATRIX TABLE */}
            <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-100/90 backdrop-blur-sm z-10 border-b border-slate-200">
                    <tr className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      <th className="p-4 w-16 text-center">Rank</th>
                      <th className="p-4">Item Name</th>
                      <th className="p-4">Category</th>
                      <th className="p-4 text-center">Qty Sold</th>
                      <th className="p-4">Sales Contribution</th>
                      <th className="p-4 text-right">Revenue Generated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredItems.length === 0 ? (
                      <tr><td colSpan={6} className="p-8 text-center text-slate-400 font-bold">No products match your filter parameters.</td></tr>
                    ) : filteredItems.map((item: any, idx: number) => {
                      // Contribution logic
                      const percentage = data.summary.totalRevenue > 0 ? ((item.revenue / data.summary.totalRevenue) * 100).toFixed(1) : "0.0";
                      
                      // Smart Tags Logic
                      let tag = null;
                      if (idx < 3 && item.qty > 5) tag = <span className="ml-2 bg-orange-100 text-orange-700 border border-orange-200 text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider font-black flex items-center inline-flex"><Flame size={10} className="mr-0.5"/> Hot</span>;
                      else if (item.qty <= 2) tag = <span className="ml-2 bg-red-50 text-red-600 border border-red-100 text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider font-black flex items-center inline-flex">Dead Stock</span>;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 text-center font-black text-slate-400">#{idx + 1}</td>
                          <td className="p-4 font-black text-slate-800 uppercase flex items-center">{item.name} {tag}</td>
                          <td className="p-4"><span className="text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded bg-slate-100 text-slate-600">{item.category}</span></td>
                          <td className="p-4 text-center font-mono font-black text-slate-900">{item.qty}</td>
                          
                          {/* Contribution Progress Bar */}
                          <td className="p-4 w-48">
                            <div className="flex items-center space-x-2">
                              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 rounded-full" style={{width: `${percentage}%`}}></div></div>
                              <span className="text-[10px] font-black text-slate-500 w-8 text-right">{percentage}%</span>
                            </div>
                          </td>
                          
                          <td className="p-4 text-right font-mono font-black text-emerald-600 text-base">₹{Number(item.revenue).toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* ------------------- THERMAL PRINT LAYER FOR KITCHEN / AUDIT ------------------- */}
      <div 
        id="enterprise-receipt-print-area" 
        className="print:block absolute opacity-0 print:opacity-100 top-0 left-0 bg-white text-black font-mono z-[-50] print:z-[9999] text-center w-full"
        style={{ width: printerConfig?.printerSize || "80mm" }}
      >
        {data && (
          <div className="w-full bg-white text-black p-1 flex flex-col items-center">
            
            <div className="w-full text-center mb-2 pb-1 border-b border-solid border-black">
              <h2 className={`font-black uppercase tracking-tight ${printerConfig?.headerSize || 'text-lg'}`}>{printerConfig?.headerName || "RAMKESAR POS"}</h2>
              <p className={`font-bold ${printerConfig?.subHeaderSize || 'text-[10px]'}`}>{printerConfig?.subHeader || ""}</p>
              
              <div className="text-[11px] font-black tracking-widest text-center w-full border-t border-solid border-black mt-2 pt-1 px-1">
                ** PRODUCT VELOCITY REPORT **
              </div>

              <div className="flex justify-between text-[10px] mt-2 font-bold px-1 border-t border-solid border-black pt-1">
                <span>Period: {dateFilter.toUpperCase()}</span>
                <span>{new Date().toLocaleDateString('en-IN')}</span>
              </div>
            </div>

            {/* KEY METRICS SUMMARY */}
            <table className="w-full text-[10px] text-center mb-2 border-collapse font-bold mx-auto border-b border-solid border-black">
              <tbody>
                <tr className="border-b border-solid border-slate-200">
                  <td className="py-1 text-left pl-1">TOTAL PRODUCTS SOLD</td>
                  <td className="py-1 text-right pr-1 font-mono">{data.summary.totalItemsSold} QTY</td>
                </tr>
                <tr className="border-b border-solid border-slate-200">
                  <td className="py-1 text-left pl-1">ITEMS NET REVENUE</td>
                  <td className="py-1 text-right pr-1 font-mono">₹{Number(data.summary.totalRevenue).toFixed(2)}</td>
                </tr>
                <tr className="border-b border-solid border-slate-200">
                  <td className="py-1 text-left pl-1">CATEGORY LEADER</td>
                  <td className="py-1 text-right pr-1 font-black uppercase">{data.summary.topCategory}</td>
                </tr>
              </tbody>
            </table>

            <div className="w-full text-center text-[10px] font-black py-1 uppercase tracking-wider bg-slate-100 border-b border-solid border-black">ITEM WISE BREAKDOWN</div>
            
            {/* FULL MATRIX TABLE FOR PRINT */}
            <table className="w-full text-[10px] text-center mb-2 border-collapse font-bold mx-auto">
              <thead>
                <tr className="border-b border-solid border-black">
                  <th className="pb-1 text-left pl-1 w-[50%]">ITEM NAME</th>
                  <th className="pb-1 text-center w-[20%]">QTY</th>
                  <th className="pb-1 text-right pr-1 w-[30%]">REVENUE</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item: any, idx: number) => (
                  <tr key={item.id} className="border-b border-solid border-slate-300">
                    <td className="py-1 text-left uppercase pl-1 truncate max-w-[120px]">{idx + 1}. {item.name}</td>
                    <td className="py-1 text-center font-mono">{item.qty}</td>
                    <td className="py-1 text-right pr-1 font-mono">₹{Number(item.revenue).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="text-center font-black w-full mt-4 border-t border-solid border-black pt-2 text-[10px] tracking-widest uppercase">
              --- END OF VELOCITY LOG ---
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
