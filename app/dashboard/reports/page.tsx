"use client";
import { useState, useEffect } from "react";
import { useOutlet } from "../../context/OutletContext";
import { 
  BarChart4, Download, TrendingUp, TrendingDown, 
  Wallet, Receipt, Loader2, PieChart, Landmark, FileSpreadsheet
} from "lucide-react";

export default function FinancialReportsPage() {
  const { selectedOutlet, outlets } = useOutlet();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, [selectedOutlet]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/brand/reports?outletId=${selectedOutlet}`);
      const json = await res.json();
      if (json.success) setData(json);
    } catch (e) {
      console.error("Report Sync Failed");
    } finally {
      setLoading(false);
    }
  };

  // Basic CSV Export Functionality for CA
  const handleExportCSV = () => {
    if (!data) return;
    
    const headers = "Metric,Amount (INR)\n";
    const rows = [
      `Total Revenue,${data.metrics.totalRevenue}`,
      `Total Orders,${data.metrics.totalOrders}`,
      `GST Collected,${data.metrics.totalGSTCollected}`,
      `Procurement (B2B Purchases),${data.metrics.procurementCosts}`,
      `Daily Operations Exp,${data.metrics.operationalExpenses}`,
      `Total Expenses,${data.metrics.totalExpenses}`,
      `Net Profit/Loss,${data.metrics.netProfit}`
    ].join("\n");

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Financial_Report_${selectedOutlet === "ALL" ? "Brand" : "Branch"}_${new Date().toLocaleDateString('en-GB')}.csv`;
    a.click();
  };

  if (loading || !data) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Compiling Financial Statements...</p>
      </div>
    );
  }

  const { metrics, topItems } = data;
  const isProfitable = metrics.netProfit >= 0;

  return (
    <div className="max-w-[1400px] mx-auto animate-in fade-in duration-300 h-full flex flex-col pb-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
            <BarChart4 className="mr-2 text-indigo-600" /> Financial Reports & P&L
          </h1>
          <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">
            {selectedOutlet === "ALL" ? "Consolidated HQ Finance" : "Branch Specific Ledger"}
          </p>
        </div>
        
        <button onClick={handleExportCSV} className="bg-slate-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-lg active:scale-95 transition-all">
          <FileSpreadsheet className="mr-1.5" size={16} /> Export for CA
        </button>
      </div>

      {/* Primary KPI Grid (Profit & Loss) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 shrink-0">
        
        {/* Revenue */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Gross Revenue</span>
            <Wallet size={20} className="text-indigo-500"/>
          </div>
          <p className="text-4xl font-mono font-black text-slate-900">₹{metrics.totalRevenue.toLocaleString()}</p>
          <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">From {metrics.totalOrders} Orders</p>
        </div>

        {/* Expenses */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Expenses</span>
            <Receipt size={20} className="text-amber-500"/>
          </div>
          <p className="text-4xl font-mono font-black text-slate-900">₹{metrics.totalExpenses.toLocaleString()}</p>
          <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Procurement + Operations</p>
        </div>

        {/* Net Profit */}
        <div className={`p-6 rounded-3xl border shadow-sm flex flex-col justify-center relative overflow-hidden text-white ${isProfitable ? 'bg-slate-900 border-slate-800' : 'bg-red-600 border-red-700'}`}>
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 opacity-80">Net Profit / Loss</span>
            {isProfitable ? <TrendingUp size={20} className="text-emerald-400"/> : <TrendingDown size={20} className="text-white"/>}
          </div>
          <p className="text-4xl font-mono font-black">₹{Math.abs(metrics.netProfit).toLocaleString()}</p>
          <p className="text-[10px] font-bold mt-2 uppercase tracking-widest opacity-80">
            {isProfitable ? "Business is Profitable" : "Business is in Loss"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-[300px]">
        
        {/* Breakdown Panel */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col p-6">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-6 flex items-center border-b border-slate-100 pb-4">
            <PieChart size={16} className="mr-2 text-indigo-500"/> Financial Breakdown
          </h3>
          
          <div className="space-y-6 flex-1">
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Landmark size={16}/></div>
                <div>
                  <p className="text-xs font-black uppercase text-slate-800">GST Collected</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">CGST + SGST Combined</p>
                </div>
              </div>
              <span className="font-mono text-lg font-black text-slate-900">₹{metrics.totalGSTCollected.toLocaleString()}</span>
            </div>

            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><Wallet size={16}/></div>
                <div>
                  <p className="text-xs font-black uppercase text-slate-800">Raw Material Sourcing</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Purchase Orders (B2B)</p>
                </div>
              </div>
              <span className="font-mono text-lg font-black text-slate-900">₹{metrics.procurementCosts.toLocaleString()}</span>
            </div>

            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 text-red-600 rounded-lg"><Receipt size={16}/></div>
                <div>
                  <p className="text-xs font-black uppercase text-slate-800">Operational Expenses</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Daily Branch Kharcha</p>
                </div>
              </div>
              <span className="font-mono text-lg font-black text-slate-900">₹{metrics.operationalExpenses.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Analytics: Top Items */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col p-6">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-6 flex items-center border-b border-slate-100 pb-4">
            <TrendingUp size={16} className="mr-2 text-emerald-500"/> Top Performing Items
          </h3>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {topItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-300">
                <BarChart4 size={40} className="mb-2 opacity-50"/>
                <p className="text-[10px] font-black uppercase tracking-widest">Not Enough Sales Data</p>
              </div>
            ) : (
              <ul className="space-y-4">
                {topItems.map((item: any, index: number) => (
                  <li key={index} className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 flex items-center justify-center bg-slate-100 text-slate-500 font-black text-[10px] rounded-full border border-slate-200">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-xs font-black uppercase text-slate-800">{item.name}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{item.quantitySold} Units Sold</p>
                      </div>
                    </div>
                    <span className="font-mono text-sm font-black text-emerald-600">
                      ₹{item.revenueGenerated.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
