"use client";
import { useState, useEffect } from "react";
import { Loader2, TrendingUp, Wallet, ShoppingCart, XCircle, ArrowRightLeft, FilePieChart, Printer, AlertTriangle, ChevronDown, ChevronUp, Gift, ShieldCheck, WalletCards, Activity, WifiOff } from "lucide-react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";

export default function ReportsPage() {
  const params = useParams();
  const outletId = params.outletId as string;
  const { data: session } = useSession(); // 🔥 Session Context

  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [dateFilter, setDateFilter] = useState("today"); 
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [printerConfig, setPrinterConfig] = useState<any>(null);
  
  const [expandedAgg, setExpandedAgg] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(typeof window !== "undefined" ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); if(session?.user) fetchReportStats(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const pConf = localStorage.getItem(`zapped_printer_config_${outletId}`);
    if (pConf) setPrinterConfig(JSON.parse(pConf));
    else setPrinterConfig({ printerSize: "80mm", headerName: "ZAPPED POS", headerSize: "text-lg", subHeader: "Premium Quality Outlet", subHeaderSize: "text-[10px]" });
    
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [outletId, session]);

  useEffect(() => {
    if (session?.user) {
      fetchReportStats();
    }
  }, [dateFilter, customStartDate, customEndDate, session]);

  const fetchReportStats = async () => {
    if (!session?.user) return;
    const tenantId = (session.user as any).tenantId;

    if (!navigator.onLine) {
      // Basic Offline fallback logic. Can read latest generated report from LocalStorage if needed.
      const cached = localStorage.getItem(`zap_last_report_${outletId}_${dateFilter}`);
      if (cached) {
        setReportData(JSON.parse(cached));
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    let url = `/api/reports?outletId=${outletId}&tenantId=${tenantId}&date=${dateFilter}`;
    if (dateFilter === "custom" && customStartDate && customEndDate) {
      url += `&startDate=${customStartDate}&endDate=${customEndDate}`;
    }
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setReportData(data);
        localStorage.setItem(`zap_last_report_${outletId}_${dateFilter}`, JSON.stringify(data)); // Offline cache
      }
    } catch (err) {
      alert("Error generating analytical logs!");
    } finally {
      setLoading(false);
    }
  };

  const handlePrintZReport = () => {
    if (!reportData) return;
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const toggleAgg = (agg: string) => {
    setExpandedAgg(expandedAgg === agg ? null : agg);
  };

  // Pre-calculated Pro Metrics
  const drawerCash = (reportData?.payments?.cash || 0) - (reportData?.summary?.totalExpenses || 0);
  const netCashFlow = drawerCash + (reportData?.payments?.card || 0);
  
  // Ultra Pro Analytics: Cash vs Digital Trend
  const totalDigitalSettled = (reportData?.payments?.card || 0) + (reportData?.aggregators?.zomato?.total || 0) + (reportData?.aggregators?.swiggy?.total || 0) + (reportData?.aggregators?.ourApp?.total || 0);
  const absoluteTotalCollected = (reportData?.payments?.cash || 0) + totalDigitalSettled;
  const cashPercentage = absoluteTotalCollected > 0 ? Math.round(((reportData?.payments?.cash || 0) / absoluteTotalCollected) * 100) : 0;
  const digitalPercentage = absoluteTotalCollected > 0 ? 100 - cashPercentage : 0;
  
  // Ultra Pro Analytics: Tax Liability
  const totalGovtTaxLiability = (reportData?.summary?.totalCgst || 0) + (reportData?.summary?.totalSgst || 0);

  return (
    <div className="flex h-full relative overflow-hidden bg-slate-50 print:overflow-visible">
      
      {/* ------------------- INTERFACE VIEW SCREEN MONITOR LAYER (Hidden on print) ------------------- */}
      <div className="flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar print:hidden">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-5 mb-6 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Reports & Analytics</h1>
              {isOnline ? (
                <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center shadow-sm">
                  <Activity size={12} className="mr-1"/> Live Sync
                </span>
              ) : (
                <span className="bg-red-100 text-red-700 border border-red-200 text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center shadow-sm">
                  <WifiOff size={12} className="mr-1"/> Offline (Cached)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-bold mt-0.5">Real-time enterprise financial dashboard and Z-Report logs</p>
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
              type="button" 
              disabled={loading || !reportData} 
              onClick={handlePrintZReport}
              className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center shadow-md active:scale-95 transition-all"
            >
              <Printer size={16} className="mr-1.5" /> Print Z-Report
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex justify-center items-center"><Loader2 className="animate-spin text-orange-500" size={40} /></div>
        ) : !reportData ? (
          <p className="text-center font-bold text-slate-400 p-8">Analytical engine compile error setup parameters.</p>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* 🔥 CORE STATUS CARDS (Strictly 5 in one row with icons - Card 2 Updated to Expected Cash) */}
            <div className="overflow-x-auto pb-2 custom-scrollbar">
              <div className="grid grid-cols-5 gap-4 min-w-[1100px]">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex flex-col justify-center">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">POS Gross Sales</span>
                    <TrendingUp size={16} className="text-orange-500"/>
                  </div>
                  <p className="text-2xl font-mono font-black text-slate-900">₹{Number(reportData?.summary?.grossSales || 0).toFixed(2)}</p>
                </div>

                {/* 🔥 EXPECTED CASH DRAWER */}
                <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
                  <WalletCards size={80} className="absolute -right-4 -bottom-4 text-emerald-500/10"/>
                  <div className="flex items-center justify-between mb-2 relative z-10">
                    <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest block">Expected Cash (Drawer)</span>
                    <Wallet size={16} className="text-emerald-600"/>
                  </div>
                  <p className="text-2xl font-mono font-black text-emerald-700 relative z-10">₹{Number(drawerCash).toFixed(2)}</p>
                </div>

                <div className="bg-purple-50 p-5 rounded-2xl border border-purple-100 shadow-xs flex flex-col justify-center">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest block">Complementary</span>
                    <Gift size={16} className="text-purple-500"/>
                  </div>
                  <p className="text-2xl font-mono font-black text-purple-700">₹{Number(reportData?.exceptions?.complementaryValue || 0).toFixed(2)}</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex flex-col justify-center">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">POS Invoices</span>
                    <ShoppingCart size={16} className="text-blue-500"/>
                  </div>
                  <p className="text-2xl font-mono font-black text-blue-600">{reportData?.summary?.orderCount || 0} Bills</p>
                </div>

                <div className="bg-red-50 p-5 rounded-2xl border border-red-100 shadow-xs flex flex-col justify-center">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-red-500 uppercase tracking-widest block">Voided Value</span>
                    <XCircle size={16} className="text-red-500"/>
                  </div>
                  <p className="text-2xl font-mono font-black text-red-600">₹{Number(reportData?.exceptions?.cancelledValue || 0).toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* BREAKDOWNS MATRIX GRID AREA */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              
              {/* 🔥 Payment Settlement Matrix (Pure Sales + Business Trend) */}
              <div className="bg-white p-5 border border-slate-200/60 rounded-2xl shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center"><Wallet size={16} className="mr-1.5 text-orange-500" /> Payment & App Settlement</h3>
                  <div className="space-y-3 font-bold text-sm">
                    <div className="flex justify-between p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100"><span>Direct Cash Sales</span><span className="font-mono text-base font-black">₹{Number(reportData?.payments?.cash || 0).toFixed(2)}</span></div>
                    <div className="flex justify-between p-3 bg-blue-50 text-blue-800 rounded-xl border border-blue-100"><span>Card & UPI Settled</span><span className="font-mono text-base font-black">₹{Number(reportData?.payments?.card || 0).toFixed(2)}</span></div>
                    <div className="flex justify-between p-3 border border-slate-100 rounded-xl text-slate-600 text-xs"><span>Zomato Aggregator Total</span><span className="font-mono font-black">₹{Number(reportData?.aggregators?.zomato?.total || 0).toFixed(2)}</span></div>
                    <div className="flex justify-between p-3 border border-slate-100 rounded-xl text-slate-600 text-xs"><span>Swiggy Aggregator Total</span><span className="font-mono font-black">₹{Number(reportData?.aggregators?.swiggy?.total || 0).toFixed(2)}</span></div>
                    <div className="flex justify-between p-3 border border-slate-100 rounded-xl text-slate-600 text-xs"><span>Our App Internal</span><span className="font-mono font-black">₹{Number(reportData?.aggregators?.ourApp?.total || 0).toFixed(2)}</span></div>
                  </div>
                </div>

                {/* Ultra Pro Feature: Business Trend Analytics */}
                <div className="mt-5 pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Business Trend: Cash vs Digital</span>
                    <span className="font-mono text-xs font-black text-slate-600">{absoluteTotalCollected > 0 ? '100%' : '0%'} Vol.</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                    <div className="h-full bg-emerald-400 transition-all duration-500" style={{ width: `${cashPercentage}%` }}></div>
                    <div className="h-full bg-blue-400 transition-all duration-500" style={{ width: `${digitalPercentage}%` }}></div>
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{cashPercentage}% Cash</span>
                    <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{digitalPercentage}% Digital</span>
                  </div>
                </div>
              </div>

              {/* Order Channels Split WITH EXPANDABLE AGGREGATORS */}
              <div className="bg-white p-5 border border-slate-200/60 rounded-2xl shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center"><FilePieChart size={16} className="mr-1.5 text-orange-500" /> Revenue By Channel</h3>
                  <div className="space-y-2 font-bold text-sm">
                    <div className="flex justify-between py-2 border-b border-slate-100"><span>Dine In Operations</span><span className="font-mono text-slate-900">₹{Number(reportData?.channels?.dineIn || 0).toFixed(2)}</span></div>
                    <div className="flex justify-between py-2 border-b border-slate-100"><span>Takeaway (Pick Up)</span><span className="font-mono text-slate-900">₹{Number(reportData?.channels?.pickUp || 0).toFixed(2)}</span></div>
                    <div className="flex justify-between py-2 border-b border-slate-100"><span>Direct Delivery</span><span className="font-mono text-slate-900">₹{Number(reportData?.channels?.delivery || 0).toFixed(2)}</span></div>
                    
                    {/* Expandable Zomato */}
                    <div className="flex flex-col border-b border-slate-100">
                      <button onClick={() => toggleAgg('zomato')} className="flex justify-between py-2 w-full text-left items-center outline-none hover:text-orange-600 transition-colors">
                        <span className="flex items-center">Zomato Details {expandedAgg === 'zomato' ? <ChevronUp size={14} className="ml-1"/> : <ChevronDown size={14} className="ml-1"/>}</span>
                        <span className="font-mono text-slate-900">₹{Number(reportData?.aggregators?.zomato?.total || 0).toFixed(2)}</span>
                      </button>
                      {expandedAgg === 'zomato' && (
                        <div className="pl-4 pb-3 pt-1 text-[10px] text-slate-500 space-y-1.5 animate-in slide-in-from-top-1 bg-slate-50 rounded-b-xl border border-slate-100 border-t-0">
                          <div className="flex justify-between px-2"><span>Platform Gross</span><span className="font-mono">₹{Number(reportData?.aggregators?.zomato?.total || 0).toFixed(2)}</span></div>
                          <div className="flex justify-between px-2"><span>Taxes Computed</span><span className="font-mono">₹{Number(reportData?.aggregators?.zomato?.tax || 0).toFixed(2)}</span></div>
                          <div className="flex justify-between px-2 text-red-500"><span>Discounts (-)</span><span className="font-mono">- ₹{Number(reportData?.aggregators?.zomato?.discount || 0).toFixed(2)}</span></div>
                        </div>
                      )}
                    </div>

                    {/* Expandable Swiggy */}
                    <div className="flex flex-col border-b border-slate-100">
                      <button onClick={() => toggleAgg('swiggy')} className="flex justify-between py-2 w-full text-left items-center outline-none hover:text-orange-600 transition-colors">
                        <span className="flex items-center">Swiggy Details {expandedAgg === 'swiggy' ? <ChevronUp size={14} className="ml-1"/> : <ChevronDown size={14} className="ml-1"/>}</span>
                        <span className="font-mono text-slate-900">₹{Number(reportData?.aggregators?.swiggy?.total || 0).toFixed(2)}</span>
                      </button>
                      {expandedAgg === 'swiggy' && (
                        <div className="pl-4 pb-3 pt-1 text-[10px] text-slate-500 space-y-1.5 animate-in slide-in-from-top-1 bg-slate-50 rounded-b-xl border border-slate-100 border-t-0">
                          <div className="flex justify-between px-2"><span>Platform Gross</span><span className="font-mono">₹{Number(reportData?.aggregators?.swiggy?.total || 0).toFixed(2)}</span></div>
                          <div className="flex justify-between px-2"><span>Taxes Computed</span><span className="font-mono">₹{Number(reportData?.aggregators?.swiggy?.tax || 0).toFixed(2)}</span></div>
                          <div className="flex justify-between px-2 text-red-500"><span>Discounts (-)</span><span className="font-mono">- ₹{Number(reportData?.aggregators?.swiggy?.discount || 0).toFixed(2)}</span></div>
                        </div>
                      )}
                    </div>

                    {/* Expandable Our App */}
                    <div className="flex flex-col">
                      <button onClick={() => toggleAgg('ourapp')} className="flex justify-between py-2 w-full text-left items-center outline-none hover:text-orange-600 transition-colors">
                        <span className="flex items-center">Our Online App {expandedAgg === 'ourapp' ? <ChevronUp size={14} className="ml-1"/> : <ChevronDown size={14} className="ml-1"/>}</span>
                        <span className="font-mono text-slate-900">₹{Number(reportData?.aggregators?.ourApp?.total || 0).toFixed(2)}</span>
                      </button>
                      {expandedAgg === 'ourapp' && (
                        <div className="pl-4 pb-3 pt-1 text-[10px] text-slate-500 space-y-1.5 animate-in slide-in-from-top-1 bg-slate-50 rounded-b-xl border border-slate-100 border-t-0">
                          <div className="flex justify-between px-2"><span>Platform Gross</span><span className="font-mono">₹{Number(reportData?.aggregators?.ourApp?.total || 0).toFixed(2)}</span></div>
                          <div className="flex justify-between px-2"><span>Taxes Computed</span><span className="font-mono">₹{Number(reportData?.aggregators?.ourApp?.tax || 0).toFixed(2)}</span></div>
                          <div className="flex justify-between px-2 text-red-500"><span>Discounts (-)</span><span className="font-mono">- ₹{Number(reportData?.aggregators?.ourApp?.discount || 0).toFixed(2)}</span></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Exceptions Quick View */}
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500"><span className="flex items-center"><AlertTriangle size={12} className="mr-1 text-red-400"/> Voided / Cancelled Invoices</span> <span className="text-red-500 font-mono">{reportData?.exceptions?.cancelledCount || 0} Bills</span></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* ISOLATED POS Tax & Financial Summary PRO LEVEL */}
              <div className="bg-white p-5 border border-slate-200/60 rounded-2xl shadow-xs">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center"><ArrowRightLeft size={16} className="mr-1.5 text-orange-500" /> POS Financial Breakdown (Excl. Aggregators)</h3>
                
                <div className="space-y-2 text-sm font-bold text-slate-700">
                  <div className="flex justify-between py-2 border-b border-slate-100 text-blue-700 bg-blue-50 px-2 rounded-lg mb-2"><span>POS Avg Order Value (Ticket Size)</span><span className="font-mono font-black">₹{Number(reportData?.summary?.aov || 0).toFixed(2)}</span></div>
                  <div className="flex justify-between py-2 border-b border-slate-100"><span>POS CGST Collected</span><span className="font-mono text-slate-900">₹{Number(reportData?.summary?.totalCgst || 0).toFixed(2)}</span></div>
                  <div className="flex justify-between py-2 border-b border-slate-100"><span>POS SGST Collected</span><span className="font-mono text-slate-900">₹{Number(reportData?.summary?.totalSgst || 0).toFixed(2)}</span></div>
                  
                  {/* Ultra Pro Feature: Net Taxable Liability Warning */}
                  <div className="flex justify-between py-2 border-b border-orange-100 bg-orange-50/50 px-2 rounded-lg text-orange-800"><span>Total Govt Tax Liability</span><span className="font-mono font-black">₹{Number(totalGovtTaxLiability).toFixed(2)}</span></div>
                  
                  <div className="flex justify-between py-2 border-b border-slate-100 mt-2"><span>Packaging Surcharges</span><span className="font-mono text-slate-900">₹{Number(reportData?.summary?.totalPacking || 0).toFixed(2)}</span></div>
                  <div className="flex justify-between py-2 border-b border-slate-100"><span>Delivery Surcharges</span><span className="font-mono text-slate-900">₹{Number(reportData?.summary?.totalDelivery || 0).toFixed(2)}</span></div>
                  <div className="flex justify-between py-2 text-red-500 font-black"><span>Discounts Deducted (-)</span><span className="font-mono">- ₹{Number(reportData?.summary?.totalDiscount || 0).toFixed(2)}</span></div>
                </div>
              </div>

              {/* 🔥 CASH DRAWER AUDIT & RECONCILIATION */}
              <div className="bg-slate-900 p-5 border border-slate-800 rounded-2xl shadow-xl relative overflow-hidden flex flex-col justify-between">
                <ShieldCheck size={100} className="absolute -right-4 -bottom-4 text-white/5" />
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4 flex items-center"><WalletCards size={16} className="mr-1.5 text-emerald-400" /> Cash Drawer Audit (Reconciliation)</h3>
                  <p className="text-xs text-slate-400 font-bold mb-4 border-b border-slate-800 pb-4">Used for End-of-Day physical cash tallying in the register.</p>
                  
                  <div className="space-y-3 font-bold text-sm">
                    <div className="flex justify-between p-3 bg-slate-800 text-slate-200 rounded-xl"><span>Total Cash Sale Inflow</span><span className="font-mono text-white">₹{Number(reportData?.payments?.cash || 0).toFixed(2)}</span></div>
                    <div className="flex justify-between p-3 bg-red-900/30 text-red-400 rounded-xl border border-red-900/50"><span>Petty Cash Expenses Deducted (-)</span><span className="font-mono">- ₹{Number(reportData?.summary?.totalExpenses || 0).toFixed(2)}</span></div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-800">
                  <div className="flex justify-between items-center p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
                    <span className="uppercase tracking-widest text-xs font-black">Final Expected Cash in Drawer</span>
                    <span className="font-mono text-3xl font-black">₹{Number(drawerCash).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* ------------------- ENTERPRISE HARDWARE CLOSED Z-REPORT PRINT LAYER ------------------- */}
      <div 
        id="enterprise-receipt-print-area" 
        className="print:block absolute opacity-0 print:opacity-100 top-0 left-0 bg-white text-black font-mono z-[-50] print:z-[9999] text-center w-full"
        style={{ width: printerConfig?.printerSize || "80mm" }}
      >
        {reportData && (
          <div className="w-full bg-white text-black p-1 flex flex-col items-center">
            
            <div className="w-full text-center mb-2 pb-1 border-b border-solid border-black">
              <h2 className={`font-black uppercase tracking-tight ${printerConfig?.headerSize || 'text-lg'}`}>{printerConfig?.headerName || "ZAPPED POS"}</h2>
              <p className={`font-bold ${printerConfig?.subHeaderSize || 'text-[10px]'}`}>{printerConfig?.subHeader || ""}</p>
              
              <div className="text-[12px] font-black tracking-widest text-center w-full border-t border-solid border-black mt-2 pt-1 px-1">
                ** Z-REPORT CLOSED BILL **
              </div>

              <div className="flex justify-between text-[10px] mt-2 font-bold px-1 border-t border-solid border-black pt-1">
                <span>Range Selector: {dateFilter.toUpperCase()}</span>
                <span>{new Date().toLocaleDateString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-[10px] font-bold mb-1 px-1">
                <span>Terminal Outlet: {outletId}</span>
                <span>{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

            {/* SEGMENT 1: POS ISOLATED SALES LEDGER MATRIX */}
            <table className="w-full text-[10px] text-center mb-2 border-collapse font-bold mx-auto">
              <thead>
                <tr className="border-b border-solid border-black">
                  <th className="pb-1 text-left pl-1">POS FINANCIAL SUMMARY</th>
                  <th className="pb-1 text-right pr-1">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-solid border-slate-200">
                  <td className="py-1 text-left pl-1">POS GROSS SALES</td>
                  <td className="py-1 text-right pr-1 font-mono">₹{Number(reportData?.summary?.grossSales || 0).toFixed(2)}</td>
                </tr>
                <tr className="border-b border-solid border-slate-200">
                  <td className="py-1 text-left pl-1">POS NET SALES (EXCL TAX)</td>
                  <td className="py-1 text-right pr-1 font-mono">₹{Number(reportData?.summary?.netBaseSales || 0).toFixed(2)}</td>
                </tr>
                <tr className="border-b border-solid border-slate-200">
                  <td className="py-1 text-left pl-1">POS AVG ORDER VALUE (AOV)</td>
                  <td className="py-1 text-right pr-1 font-mono text-slate-600">₹{Number(reportData?.summary?.aov || 0).toFixed(2)}</td>
                </tr>
                <tr className="border-b border-solid border-slate-200">
                  <td className="py-1 text-left pl-1">POS CGST @ 2.5%</td>
                  <td className="py-1 text-right pr-1 font-mono">₹{Number(reportData?.summary?.totalCgst || 0).toFixed(2)}</td>
                </tr>
                <tr className="border-b border-solid border-slate-200">
                  <td className="py-1 text-left pl-1">POS SGST @ 2.5%</td>
                  <td className="py-1 text-right pr-1 font-mono">₹{Number(reportData?.summary?.totalSgst || 0).toFixed(2)}</td>
                </tr>
                <tr className="border-b border-solid border-slate-200 font-black">
                  <td className="py-1 text-left pl-1">TOTAL TAX LIABILITY</td>
                  <td className="py-1 text-right pr-1 font-mono">₹{Number(totalGovtTaxLiability).toFixed(2)}</td>
                </tr>
                {(reportData?.summary?.totalPacking || 0) > 0 && (
                  <tr className="border-b border-solid border-slate-200">
                    <td className="py-1 text-left pl-1">PACKING CHARGES</td>
                    <td className="py-1 text-right pr-1 font-mono">₹{Number(reportData.summary.totalPacking).toFixed(2)}</td>
                  </tr>
                )}
                {(reportData?.summary?.totalDelivery || 0) > 0 && (
                  <tr className="border-b border-solid border-slate-200">
                    <td className="py-1 text-left pl-1">DELIVERY CHARGES</td>
                    <td className="py-1 text-right pr-1 font-mono">₹{Number(reportData.summary.totalDelivery).toFixed(2)}</td>
                  </tr>
                )}
                {(reportData?.summary?.totalDiscount || 0) > 0 && (
                  <tr className="border-b border-solid border-slate-200 text-slate-500">
                    <td className="py-1 text-left pl-1">TOTAL DISCOUNTS</td>
                    <td className="py-1 text-right pr-1 font-mono">-₹{Number(reportData.summary.totalDiscount).toFixed(2)}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* 🔥 SEGMENT 2: PAYMENT & APP SETTLEMENT (PURE SALES) */}
            <div className="w-full text-center text-[10px] font-black border-t border-solid border-black py-1 uppercase tracking-wider bg-slate-100">PAYMENT & APP SETTLEMENT</div>
            <table className="w-full text-[10px] text-center mb-2 border-collapse font-bold mx-auto border-b border-solid border-black">
              <tbody>
                <tr className="border-b border-solid border-slate-200">
                  <td className="py-1 text-left pl-1">DIRECT CASH SALES</td>
                  <td className="py-1 text-right pr-1 font-mono">₹{Number(reportData?.payments?.cash || 0).toFixed(2)}</td>
                </tr>
                <tr className="border-b border-solid border-slate-200 mt-2">
                  <td className="py-1 text-left pl-1">CARD & UPI SETTLED</td>
                  <td className="py-1 text-right pr-1 font-mono font-black">₹{Number(reportData?.payments?.card || 0).toFixed(2)}</td>
                </tr>
                <tr className="border-b border-solid border-slate-200">
                  <td className="py-1 text-left pl-1 text-slate-500">ZOMATO AGGREGATOR</td>
                  <td className="py-1 text-right pr-1 font-mono">₹{Number(reportData?.aggregators?.zomato?.total || 0).toFixed(2)}</td>
                </tr>
                <tr className="border-b border-solid border-slate-200">
                  <td className="py-1 text-left pl-1 text-slate-500">SWIGGY AGGREGATOR</td>
                  <td className="py-1 text-right pr-1 font-mono">₹{Number(reportData?.aggregators?.swiggy?.total || 0).toFixed(2)}</td>
                </tr>
                <tr className="border-b border-solid border-slate-200">
                  <td className="py-1 text-left pl-1 text-slate-500">OUR ONLINE APP</td>
                  <td className="py-1 text-right pr-1 font-mono">₹{Number(reportData?.aggregators?.ourApp?.total || 0).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            {/* SEGMENT 3: POS REVENUE BY CHANNEL */}
            <div className="w-full text-center text-[10px] font-black py-1 uppercase tracking-wider bg-slate-100 border-b border-solid border-slate-300">POS REVENUE BY CHANNEL</div>
            <table className="w-full text-[10px] text-center mb-2 border-collapse font-bold mx-auto border-b border-solid border-black">
              <tbody>
                <tr className="border-b border-solid border-slate-200">
                  <td className="py-1 text-left pl-1">DINE IN OPERATIONS</td>
                  <td className="py-1 text-right pr-1 font-mono">₹{Number(reportData?.channels?.dineIn || 0).toFixed(2)}</td>
                </tr>
                <tr className="border-b border-solid border-slate-200">
                  <td className="py-1 text-left pl-1">TAKEAWAY (PICK UP)</td>
                  <td className="py-1 text-right pr-1 font-mono">₹{Number(reportData?.channels?.pickUp || 0).toFixed(2)}</td>
                </tr>
                <tr className="border-b border-solid border-slate-200">
                  <td className="py-1 text-left pl-1">DIRECT DELIVERY</td>
                  <td className="py-1 text-right pr-1 font-mono">₹{Number(reportData?.channels?.delivery || 0).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            {/* 🔥 SEGMENT 4: CASH DRAWER RECONCILIATION */}
            <div className="w-full text-center text-[10px] font-black py-1 uppercase tracking-wider bg-slate-100 border-b border-solid border-slate-300">CASH DRAWER RECONCILIATION</div>
            <table className="w-full text-[10px] text-center mb-2 border-collapse font-bold mx-auto border-b border-solid border-black">
              <tbody>
                <tr className="border-b border-solid border-slate-200">
                  <td className="py-1 text-left pl-1">TOTAL CASH SALES</td>
                  <td className="py-1 text-right pr-1 font-mono">₹{Number(reportData?.payments?.cash || 0).toFixed(2)}</td>
                </tr>
                <tr className="border-b border-solid border-slate-300">
                  <td className="py-1 text-left pl-1 text-red-600">PETTY EXPENSES (-)</td>
                  <td className="py-1 text-right pr-1 font-mono text-red-600">-₹{Number(reportData?.summary?.totalExpenses || 0).toFixed(2)}</td>
                </tr>
                <tr className="border-b border-solid border-slate-200">
                  <td className="py-1 text-left pl-1 font-black">FINAL DRAWER CASH</td>
                  <td className="py-1 text-right pr-1 font-mono font-black text-emerald-600">₹{Number(drawerCash).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            {/* SEGMENT 5: EXCEPTIONS AND VOIDS */}
            <div className="w-full text-center text-[10px] font-black py-1 uppercase tracking-wider bg-slate-100 border-b border-solid border-slate-300">EXCEPTIONS & VOIDS</div>
            <table className="w-full text-[10px] text-center mb-2 border-collapse font-bold mx-auto">
              <tbody>
                <tr className="border-b border-solid border-slate-200">
                  <td className="py-1 text-left pl-1 font-black">COMPLEMENTARY GOODS VALUE</td>
                  <td className="py-1 text-right pr-1 font-mono">₹{Number(reportData?.exceptions?.complementaryValue || 0).toFixed(2)}</td>
                </tr>
                <tr className="border-b border-solid border-slate-200">
                  <td className="py-1 text-left pl-1">CANCELLED / VOID VALUE</td>
                  <td className="py-1 text-right pr-1 font-mono text-red-600">₹{Number(reportData?.exceptions?.cancelledValue || 0).toFixed(2)}</td>
                </tr>
                <tr className="border-b border-solid border-slate-200">
                  <td className="py-1 text-left pl-1">TOTAL INVOICES GENERATED</td>
                  <td className="py-1 text-right pr-1 font-mono">{reportData?.summary?.orderCount || 0} Bills</td>
                </tr>
                <tr>
                  <td className="py-1 text-left pl-1">TOTAL VOIDED INVOICES</td>
                  <td className="py-1 text-right pr-1 font-mono">{reportData?.exceptions?.cancelledCount || 0} Bills</td>
                </tr>
              </tbody>
            </table>

            {/* END OF FILE STATEMENT WITHOUT EXTRA LINES */}
            <div className="text-center font-black w-full mt-4 border-t border-solid border-black pt-2 text-[10px] tracking-widest uppercase">
              --- END OF REPORT CLOSING ---
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
