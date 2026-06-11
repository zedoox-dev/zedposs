"use client";
import { useState, useEffect } from "react";
import { Radio, RefreshCw, ChefHat, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";

export default function LiveOrdersPage() {
  const params = useParams();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLiveOrders = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/pos/${params.outletId}/live`);
      const json = await res.json();
      if (json.success) setOrders(json.data);
    } catch (error) {
      console.error("Error fetching live orders:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLiveOrders();
    const interval = setInterval(fetchLiveOrders, 10000); // Auto-refresh every 10 seconds
    return () => clearInterval(interval);
  }, [params.outletId]);

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" size={40}/></div>;

  return (
    <div className="p-6 h-full flex flex-col bg-slate-50">
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="bg-amber-500/10 p-3 rounded-xl text-amber-500">
            <Radio size={24} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-wider">Live Orders (KOT)</h1>
          </div>
        </div>
        <button onClick={fetchLiveOrders} disabled={refreshing} className="flex items-center px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-700 transition-colors active:scale-95 disabled:opacity-50">
          <RefreshCw size={14} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <ChefHat size={48} className="mb-4 opacity-50" />
            <p className="font-black text-sm uppercase tracking-widest">Kitchen is Clear</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white border-2 border-amber-400 rounded-2xl shadow-md overflow-hidden flex flex-col">
                <div className="bg-amber-400 p-3 flex justify-between items-center text-amber-950">
                  <span className="font-black text-lg">#{order.billNumber}</span>
                  <span className="text-[10px] font-black uppercase bg-amber-950/10 px-2 py-1 rounded">{order.orderType.replace('_', ' ')}</span>
                </div>
                <div className="p-4 flex-1">
                  <div className="text-xs font-bold text-slate-500 mb-2 border-b border-slate-100 pb-2">
                    Time: {new Date(order.createdAt).toLocaleTimeString()}
                  </div>
                  <ul className="space-y-2 mt-3">
                    {order.items.map((item:any) => (
                      <li key={item.id} className="text-sm font-bold text-slate-800">
                        <span className="text-amber-600 mr-2">{item.quantity}x</span> {item.menuItem.name}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
