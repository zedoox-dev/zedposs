"use client";
import { useState, useEffect } from "react";
import { History, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";

export default function RecentOrdersPage() {
  const params = useParams();
  const [orders, setOrders] = useState<any[]>([]);
  const [todaysTotal, setTodaysTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const res = await fetch(`/api/pos/${params.outletId}/recent`);
        const json = await res.json();
        if (json.success) {
          setOrders(json.data);
          setTodaysTotal(json.todaysTotal);
        }
      } catch (error) {
        console.error("Error fetching recent orders:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRecent();
  }, [params.outletId]);

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" size={40}/></div>;

  return (
    <div className="p-6 h-full flex flex-col bg-slate-50">
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="bg-orange-500/10 p-3 rounded-xl text-orange-500">
            <History size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-wider">Today's Recent Orders</h1>
            <p className="text-xs text-slate-500 font-bold tracking-wide">Live tracking of today's sales</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Today's Revenue</p>
          <p className="text-2xl font-black text-emerald-500">₹{todaysTotal.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto custom-scrollbar pb-20">
        {orders.length === 0 ? (
           <div className="col-span-full p-8 text-center text-slate-400 font-bold text-sm">No orders today yet.</div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-orange-500 transition-colors">
              <div className="flex justify-between items-start border-b border-slate-100 pb-3 mb-3">
                <div>
                  <span className="text-lg font-black text-slate-800">#{order.billNumber}</span>
                  <span className="block text-[10px] font-bold text-slate-400 mt-1 uppercase">{new Date(order.createdAt).toLocaleTimeString()}</span>
                </div>
                <span className="text-emerald-600 font-black text-lg">₹{order.totalAmount}</span>
              </div>
              <div className="text-xs font-semibold text-slate-600 mb-3 flex-1">
                {order.items.map((i:any) => `${i.quantity}x ${i.menuItem.name}`).join(", ")}
              </div>
              <div className="flex justify-between items-center pt-2">
                 <span className="text-[10px] font-black uppercase bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{order.orderType.replace('_', ' ')}</span>
                 <span className="text-[10px] font-black uppercase text-orange-500">{order.paymentMode}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
