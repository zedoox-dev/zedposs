import { db } from "@/lib/prisma";
import { Radio, RefreshCw, ChefHat } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic"; // Live data ke liye caching disable

export default async function LiveOrdersPage({ params }: { params: { outletId: string } }) {
  // 🔥 STRICT ISOLATION: Fetch ONLY Active orders for this outlet
  const liveOrders = await db.order.findMany({
    where: {
      outletId: params.outletId,
      isDeleted: false,
      status: {
        not: "COMPLETED" // Sirf PENDING, PREPARING ya ACCEPTED orders
      }
    },
    include: { 
      items: { include: { menuItem: true } },
      customer: true 
    },
    orderBy: { createdAt: 'asc' } // Oldest active sabse pehle (FIFO)
  });

  return (
    <div className="p-6 h-full flex flex-col bg-slate-50">
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="bg-amber-500/10 p-3 rounded-xl text-amber-500">
            <Radio size={24} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-wider">Live Orders (KOT)</h1>
            <p className="text-xs text-slate-500 font-bold tracking-wide">Currently active and preparing orders</p>
          </div>
        </div>
        <Link href={`/pos/${params.outletId}/dashboard/live`} className="flex items-center px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-700 transition-colors active:scale-95">
          <RefreshCw size={14} className="mr-2" /> Refresh
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
        {liveOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <ChefHat size={48} className="mb-4 opacity-50" />
            <p className="font-black text-sm uppercase tracking-widest">Kitchen is Clear</p>
            <p className="text-xs font-bold mt-1">No active orders right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {liveOrders.map((order) => (
              <div key={order.id} className="bg-white border-2 border-amber-400 rounded-2xl shadow-md overflow-hidden flex flex-col">
                <div className="bg-amber-400 p-3 flex justify-between items-center text-amber-950">
                  <span className="font-black text-lg">#{order.billNumber}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest bg-amber-950/10 px-2 py-1 rounded">
                    {order.orderType.replace('_', ' ')}
                  </span>
                </div>
                
                <div className="p-4 flex-1">
                  <div className="text-xs font-bold text-slate-500 mb-2 border-b border-slate-100 pb-2">
                    Time: {new Date(order.createdAt).toLocaleTimeString()}
                    {order.tableNo && <span className="ml-2 text-orange-500">• Table: {order.tableNo}</span>}
                  </div>
                  <ul className="space-y-2 mt-3">
                    {order.items.map(item => (
                      <li key={item.id} className="flex justify-between items-start text-sm font-bold text-slate-800">
                        <span><span className="text-amber-600 mr-2">{item.quantity}x</span> {item.menuItem.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                   <span className="text-xs font-black text-slate-500 uppercase">{order.status}</span>
                   <button className="bg-emerald-500 text-white text-[10px] font-black uppercase px-4 py-2 rounded-lg hover:bg-emerald-600 transition-colors">
                     Mark Ready
                   </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
