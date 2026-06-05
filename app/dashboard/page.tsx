"use client";
import { useState, useEffect } from "react";
import { useOutlet } from "../context/OutletContext"; // Adjust path if needed
import { 
  IndianRupee, ShoppingCart, Users, AlertTriangle, 
  TrendingUp, ArrowRight, Package, Clock, Loader2 
} from "lucide-react";

export default function BrandDashboardPage() {
  const { selectedOutlet, outlets } = useOutlet();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedOutlet]); // 🔥 Reloads instantly when outlet changes!

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/brand/dashboard?outletId=${selectedOutlet}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (e) {
      console.error("Dashboard Sync Failed");
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Syncing POS Data...</p>
      </div>
    );
  }

  const { metrics, recentOrders, lowStockItems } = data;

  // Find Outlet Name for Display
  const currentOutletName = selectedOutlet === "ALL" 
    ? "All Outlets HQ" 
    : outlets.find((o: any) => o.id === selectedOutlet)?.name || "Unknown Branch";

  return (
    <div className="max-w-[1400px] mx-auto animate-in fade-in duration-300">
      
      {/* Dynamic Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Business Overview</h1>
        <p className="text-xs font-bold text-slate-500 mt-1 flex items-center">
          Currently viewing data for: <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded uppercase tracking-wider font-black">{currentOutletName}</span>
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-indigo-300 transition-all">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total TPV</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><IndianRupee size={16}/></div>
          </div>
          <p className="text-3xl font-mono font-black text-slate-900">₹{metrics.totalRevenue.toLocaleString()}</p>
          <p className="text-xs font-bold text-emerald-500 mt-2 flex items-center"><TrendingUp size={14} className="mr-1"/> Today: ₹{metrics.todaysRevenue}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-all">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Completed Orders</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><ShoppingCart size={16}/></div>
          </div>
          <p className="text-3xl font-mono font-black text-slate-900">{metrics.totalOrders}</p>
          <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Across {selectedOutlet === "ALL" ? "All Branches" : "This Branch"}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-amber-300 transition-all">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Staff / Team</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Users size={16}/></div>
          </div>
          <p className="text-3xl font-mono font-black text-slate-900">{metrics.staffCount}</p>
          <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Active Employees</p>
        </div>

        <div className="bg-red-50 p-6 rounded-2xl border border-red-100 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Low Stock Alerts</span>
            <div className="p-2 bg-red-100 text-red-600 rounded-lg"><AlertTriangle size={16}/></div>
          </div>
          <p className="text-3xl font-mono font-black text-red-600">{lowStockItems.length}</p>
          <p className="text-[10px] font-bold text-red-500 mt-2 uppercase tracking-widest">Requires Attention</p>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Transactions Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-800 flex items-center">
              <Clock size={16} className="mr-2 text-indigo-500"/> Live Orders
            </h2>
            <button className="text-[10px] font-black text-indigo-600 uppercase flex items-center hover:text-indigo-800">
              View Sales Book <ArrowRight size={14} className="ml-1"/>
            </button>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white border-b border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="p-4">Bill No</th>
                  {selectedOutlet === "ALL" && <th className="p-4">Branch</th>}
                  <th className="p-4">Amount</th>
                  <th className="p-4">Payment</th>
                  <th className="p-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm font-bold text-slate-700">
                {recentOrders.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-400 text-xs">No orders generated yet.</td></tr>
                ) : (
                  recentOrders.map((order: any) => (
                    <tr key={order.id} className="hover:bg-slate-50">
                      <td className="p-4 font-mono text-xs">#{order.billNumber}</td>
                      {selectedOutlet === "ALL" && <td className="p-4 text-xs text-slate-500 uppercase">{order.outlet?.name}</td>}
                      <td className="p-4 font-black">₹{order.totalAmount}</td>
                      <td className="p-4">
                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[9px] uppercase tracking-widest">{order.paymentMode}</span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-emerald-500 flex items-center justify-end text-[10px] uppercase tracking-widest">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></span> {order.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Inventory Critical Alerts */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-red-50/50 rounded-t-2xl">
            <h2 className="text-xs font-black uppercase tracking-widest text-red-800 flex items-center">
              <Package size={16} className="mr-2 text-red-500"/> Critical Stock
            </h2>
          </div>
          <div className="p-4 space-y-3">
            {lowStockItems.length === 0 ? (
              <div className="text-center p-6">
                <AlertTriangle size={30} className="mx-auto text-slate-200 mb-2" />
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">All Stock Optimal</p>
              </div>
            ) : (
              lowStockItems.map((item: any) => (
                <div key={item.id} className="p-3 bg-white border border-red-100 rounded-xl flex justify-between items-center shadow-sm">
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase">{item.itemName}</h4>
                    {selectedOutlet === "ALL" && <p className="text-[9px] font-bold text-slate-400 mt-0.5">{item.outlet?.name}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono font-black text-red-600">{item.stockLevel} {item.unit}</p>
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mt-0.5">Left</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
