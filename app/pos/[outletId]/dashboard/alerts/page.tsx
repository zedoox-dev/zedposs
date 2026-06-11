"use client";
import { useState, useEffect } from "react";
import { Bell, AlertTriangle, PackageSearch, LifeBuoy, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";

export default function AlertsPage() {
  const params = useParams();
  const [data, setData] = useState({ lowStockAlerts: [], openTickets: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch(`/api/pos/${params.outletId}/alerts`);
        const json = await res.json();
        if (json.success) setData({ lowStockAlerts: json.lowStockAlerts, openTickets: json.openTickets });
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
  }, [params.outletId]);

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" size={40}/></div>;

  return (
    <div className="p-6 h-full flex flex-col bg-slate-50 overflow-y-auto">
      <div className="flex items-center space-x-3 mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="bg-red-500/10 p-3 rounded-xl text-red-500">
          <Bell size={24} className="animate-bounce" />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-800 uppercase tracking-wider">System Alerts</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-10">
        {/* Low Stock Alerts */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-orange-50 border-b border-orange-100 p-4 flex items-center space-x-2 text-orange-600">
            <AlertTriangle size={18} />
            <h2 className="text-sm font-black uppercase tracking-widest">Low Stock Warnings ({data.lowStockAlerts.length})</h2>
          </div>
          <div className="p-4 flex-1 overflow-y-auto max-h-96">
            {data.lowStockAlerts.length === 0 ? (
              <div className="text-center text-slate-400 py-10">
                <PackageSearch size={32} className="mx-auto mb-2 opacity-50"/>
                <p className="text-xs font-bold uppercase">All stock levels look good!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.lowStockAlerts.map((item:any) => (
                  <div key={item.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{item.itemName}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase">Min Limit: {item.minStock} {item.unit}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-red-500 font-black text-lg block leading-none">{item.stockLevel}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Support Tickets */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-slate-100 border-b border-slate-200 p-4 flex items-center space-x-2 text-slate-600">
            <LifeBuoy size={18} />
            <h2 className="text-sm font-black uppercase tracking-widest">Active Tickets ({data.openTickets.length})</h2>
          </div>
          <div className="p-4 flex-1 overflow-y-auto max-h-96">
            {data.openTickets.length === 0 ? (
              <div className="text-center text-slate-400 py-10"><p className="text-xs font-bold uppercase">No pending support issues.</p></div>
            ) : (
              <div className="space-y-3">
                {data.openTickets.map((ticket:any) => (
                  <div key={ticket.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-700">{ticket.subject}</p>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Status: {ticket.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
