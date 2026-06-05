"use client";
import { useState, useEffect } from "react";
import { useOutlet } from "../../context/OutletContext"; // Safe path
import { 
  ChefHat, Clock, Loader2, CheckCircle2, 
  Flame, Utensils, Store, ArrowRight, RefreshCw
} from "lucide-react";

export default function KitchenDisplaySystemPage() {
  const { selectedOutlet } = useOutlet();
  const [liveOrders, setLiveOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null); // orderId being updated

  const fetchKDSData = async () => {
    try {
      const res = await fetch(`/api/brand/kds?outletId=${selectedOutlet}`);
      const json = await res.json();
      if (json.success) setLiveOrders(json.liveOrders);
    } catch (e) {
      console.error("KDS Sync Failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchKDSData();
    
    // 🔥 AUTO-REFRESH KDS EVERY 15 SECONDS (Kitchen Dashboard must be live!)
    const interval = setInterval(() => {
      fetchKDSData();
    }, 15000);

    return () => clearInterval(interval);
  }, [selectedOutlet]);

  const handleUpdateStatus = async (orderId: string, currentStatus: string) => {
    setIsUpdating(orderId);
    
    // Determine the next logical status in the kitchen workflow
    let newStatus = "COMPLETED";
    if (currentStatus === "PENDING") newStatus = "PREPARING";
    else if (currentStatus === "PREPARING") newStatus = "READY";
    else if (currentStatus === "READY") newStatus = "COMPLETED";

    try {
      const res = await fetch("/api/brand/kds", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, newStatus })
      });
      
      if (res.ok) {
        // Optimistic UI update: Remove order if completed, otherwise update its status locally
        if (newStatus === "COMPLETED") {
          setLiveOrders(prev => prev.filter(o => o.id !== orderId));
        } else {
          setLiveOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        }
      }
    } catch (e) {
      alert("Failed to update ticket status.");
    } finally {
      setIsUpdating(null);
    }
  };

  // Helper to format wait time
  const getWaitTime = (createdAt: string) => {
    const diff = Math.floor((new Date().getTime() - new Date(createdAt).getTime()) / 60000);
    return diff; // Returns minutes
  };

  if (loading && liveOrders.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-amber-500 mb-4" size={40} />
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Connecting to Kitchen Monitors...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto animate-in fade-in duration-300 h-full flex flex-col pb-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
            <ChefHat className="mr-2 text-amber-500" /> Live Kitchen (KDS)
          </h1>
          <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">
            {selectedOutlet === "ALL" ? "HQ View: All Branch Kitchens" : "Branch Specific KDS Screen"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchKDSData} className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-sm transition-all active:scale-95">
            <RefreshCw className="mr-1.5 text-slate-400" size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Ticket Grid Area */}
      {liveOrders.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-white border border-slate-200 rounded-3xl shadow-sm">
          <Utensils size={60} className="text-slate-200 mb-4" />
          <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">Kitchen is Clear</h3>
          <p className="text-xs font-bold text-slate-400 mt-1">No active orders in the queue.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            
            {liveOrders.map((order) => {
              const waitTime = getWaitTime(order.createdAt);
              // Determine styles based on status
              let cardStyle = "border-slate-200 bg-white";
              let headerStyle = "bg-slate-50 text-slate-700";
              let actionButton = "bg-amber-500 hover:bg-amber-600 text-white";
              let actionText = "Start Preparing";

              if (order.status === "PREPARING") {
                cardStyle = "border-amber-300 bg-amber-50/20";
                headerStyle = "bg-amber-100 text-amber-800";
                actionButton = "bg-emerald-500 hover:bg-emerald-600 text-white";
                actionText = "Mark as Ready";
              } else if (order.status === "READY") {
                cardStyle = "border-emerald-300 bg-emerald-50";
                headerStyle = "bg-emerald-100 text-emerald-800";
                actionButton = "bg-slate-900 hover:bg-black text-white";
                actionText = "Dispatch Order";
              }

              // Alert red if ticket is older than 15 minutes!
              const isDelayed = waitTime > 15 && order.status !== "READY";
              if (isDelayed) {
                cardStyle = "border-red-400 bg-red-50";
              }

              return (
                <div key={order.id} className={`flex flex-col border-2 rounded-2xl overflow-hidden shadow-sm transition-all ${cardStyle}`}>
                  
                  {/* Ticket Header */}
                  <div className={`p-3 border-b flex justify-between items-center ${headerStyle} ${isDelayed ? 'border-red-200' : 'border-slate-100'}`}>
                    <div>
                      <h3 className="font-black text-base uppercase leading-none">#{order.billNumber}</h3>
                      <span className="text-[9px] font-black uppercase tracking-widest opacity-70 mt-1 block">
                        {order.orderType.replace("_", " ")}
                      </span>
                    </div>
                    <div className={`flex flex-col items-end ${isDelayed ? 'text-red-600' : ''}`}>
                      <span className="text-xl font-mono font-black flex items-center">
                        <Clock size={14} className="mr-1"/> {waitTime}m
                      </span>
                      {isDelayed && <span className="text-[8px] font-black uppercase tracking-widest bg-red-600 text-white px-1.5 py-0.5 rounded mt-1 animate-pulse">Delayed</span>}
                    </div>
                  </div>

                  {/* Branch Tag (Visible only in HQ 'ALL' view) */}
                  {selectedOutlet === "ALL" && (
                    <div className="bg-slate-900 text-white px-3 py-1.5 flex items-center">
                      <Store size={10} className="mr-1.5 opacity-60"/> 
                      <span className="text-[9px] font-black uppercase tracking-widest">{order.outlet.name}</span>
                    </div>
                  )}

                  {/* Ticket Items */}
                  <div className="p-4 flex-1">
                    <ul className="space-y-3">
                      {order.items.map((item: any) => (
                        <li key={item.id} className="flex justify-between items-start border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                          <span className="text-sm font-bold text-slate-800 flex-1 pr-2 uppercase">
                            {item.menuItem.name}
                          </span>
                          <span className="text-sm font-black text-slate-900 bg-slate-100 px-2 rounded">
                            x{item.quantity}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Ticket Action Footer */}
                  <div className="p-3 bg-white/50 border-t border-slate-100">
                    <button 
                      disabled={isUpdating === order.id}
                      onClick={() => handleUpdateStatus(order.id, order.status)}
                      className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest flex justify-center items-center active:scale-95 transition-all ${actionButton} disabled:opacity-50`}
                    >
                      {isUpdating === order.id ? (
                        <Loader2 className="animate-spin" size={16}/>
                      ) : (
                        <>
                          {order.status === "PENDING" && <Flame size={14} className="mr-1.5" />}
                          {order.status === "PREPARING" && <CheckCircle2 size={14} className="mr-1.5" />}
                          {order.status === "READY" && <ArrowRight size={14} className="mr-1.5" />}
                          {actionText}
                        </>
                      )}
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
 
 );
}
