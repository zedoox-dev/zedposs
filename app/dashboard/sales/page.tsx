"use client";
import { useState, useEffect } from "react";
import { useOutlet } from "../../context/OutletContext";
import { 
  ReceiptIndianRupee, Banknote, CreditCard, Smartphone, 
  Search, Download, Loader2, ArrowUpRight, Filter, Calendar 
} from "lucide-react";

export default function LiveSalesPage() {
  const { selectedOutlet, outlets } = useOutlet();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchSalesData();
  }, [selectedOutlet]); // Runs automatically when outlet dropdown changes in Header!

  const fetchSalesData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/brand/sales?outletId=${selectedOutlet}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (e) {
      console.error("Sales Sync Failed");
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Decrypting Financial Ledgers...</p>
      </div>
    );
  }

  const { orders, metrics } = data;

  // Search Filter (By Bill Number or Customer Phone)
  const filteredOrders = orders.filter((o: any) => 
    o.billNumber.toString().includes(searchQuery) || 
    (o.customer?.phone && o.customer.phone.includes(searchQuery))
  );

  return (
    <div className="max-w-[1400px] mx-auto animate-in fade-in duration-300 h-full flex flex-col pb-8">
      
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
            <ReceiptIndianRupee className="mr-2 text-indigo-600" /> Sales & Billing
          </h1>
          <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">
            {selectedOutlet === "ALL" ? "Combined HQ View" : "Branch Specific Ledger"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center transition-all shadow-sm">
            <Calendar size={14} className="mr-2" /> Date Filter
          </button>
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center transition-all shadow-sm shadow-indigo-500/30">
            <Download size={14} className="mr-2" /> Export CSV
          </button>
        </div>
      </div>

      {/* Payment Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 shrink-0">
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-center text-white relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Net Revenue</span>
            <ReceiptIndianRupee size={16} className="text-emerald-400"/>
          </div>
          <p className="text-2xl font-mono font-black text-white">₹{metrics.totalRevenue.toLocaleString()}</p>
          <p className="text-[10px] text-slate-500 font-bold mt-2 uppercase tracking-widest">{metrics.totalOrders} Bills Generated</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Cash Collections</span>
            <Banknote size={16} className="text-emerald-500"/>
          </div>
          <p className="text-2xl font-mono font-black text-slate-900">₹{metrics.paymentBreakdown.CASH.toLocaleString()}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">UPI / QR Scans</span>
            <Smartphone size={16} className="text-blue-500"/>
          </div>
          <p className="text-2xl font-mono font-black text-slate-900">₹{metrics.paymentBreakdown.UPI.toLocaleString()}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Avg. Order Value (AOV)</span>
            <ArrowUpRight size={16} className="text-indigo-500"/>
          </div>
          <p className="text-2xl font-mono font-black text-slate-900">₹{metrics.averageOrderValue}</p>
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        
        {/* Table Controls */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
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
          <button className="text-slate-400 hover:text-indigo-600 transition-colors"><Filter size={18} /></button>
        </div>

        {/* Scrollable Table Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead className="bg-white sticky top-0 border-b border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400 z-10 shadow-sm">
              <tr>
                <th className="p-4">Bill No / Time</th>
                {selectedOutlet === "ALL" && <th className="p-4">Location</th>}
                <th className="p-4">Customer Details</th>
                <th className="p-4">Order Type</th>
                <th className="p-4 text-center">Payment Mode</th>
                <th className="p-4 text-right">Total Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm font-bold text-slate-700">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center">
                    <ReceiptIndianRupee size={40} className="mx-auto text-slate-200 mb-3" />
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">No Sales Records Found</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order: any) => (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="p-4">
                      <div className="font-mono text-xs text-indigo-600">#{order.billNumber}</div>
                      <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-black">
                        {new Date(order.createdAt).toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </td>
                    
                    {selectedOutlet === "ALL" && (
                      <td className="p-4 text-[10px] text-slate-500 uppercase tracking-widest">
                        {order.outlet?.name}
                      </td>
                    )}
                    
                    <td className="p-4">
                      {order.customer ? (
                        <>
                          <div className="text-xs uppercase text-slate-800">{order.customer.name || "Walk-In"}</div>
                          <div className="text-[10px] font-mono text-slate-400">{order.customer.phone}</div>
                        </>
                      ) : (
                        <span className="text-[10px] uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Walk-In</span>
                      )}
                    </td>

                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-[9px] uppercase tracking-widest border ${order.orderType === 'DINE_IN' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                        {order.orderType.replace("_", " ")}
                      </span>
                    </td>

                    <td className="p-4 text-center">
                      <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-1 rounded text-[9px] uppercase tracking-widest font-black">
                        {order.paymentMode}
                      </span>
                    </td>

                    <td className="p-4 text-right font-mono text-base font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                      ₹{order.totalAmount.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
