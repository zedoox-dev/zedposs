"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Loader2, ChefHat, LayoutList, History, CheckCheck, WifiOff } from "lucide-react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";

export default function KitchenKOTPage() {
  const params = useParams();
  const outletId = params.outletId as string;
  const { data: session } = useSession();

  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"LIVE" | "PREPARED" | "HISTORY">("LIVE");
  const [isOnline, setIsOnline] = useState(typeof window !== "undefined" ? navigator.onLine : true);

  // 🔒 Live Orders: API now fetches tenant/outlet ID securely from backend session
  const fetchOrders = () => {
    if (!session?.user || !navigator.onLine) return;

    fetch(`/api/kitchen`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setAllOrders(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Fetch Error:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); fetchOrders(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (session?.user) {
      fetchOrders();
      const interval = setInterval(fetchOrders, 10000);
      return () => {
        clearInterval(interval);
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, [session, outletId]);

  const markAsReady = async (orderId: string) => {
    if (!navigator.onLine) return alert("System Offline: Cannot mark order as ready.");
    
    // Optimistic UI Update
    setAllOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "SERVED" } : o));

    try {
      await fetch("/api/kitchen", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId })
      });
    } catch (error) {
      console.error("Error marking ready:", error);
      fetchOrders(); 
    }
  };

  const liveOrders = allOrders.filter(o => o.status === "COMPLETED").reverse(); 
  const preparedOrders = allOrders.filter(o => o.status === "SERVED"); 
  const displayOrders = activeTab === "LIVE" ? liveOrders : (activeTab === "PREPARED" ? preparedOrders : allOrders);

  return (
    <>
      {/* 🔥 MASSIVE SEO & PREMIUM META TAG INJECTION 🔥 */}
      <title>ZedPoss KDS | Smart Kitchen Display System</title>
      <meta name="description" content="Digital Kitchen Order Ticket (KOT) and Kitchen Display System (KDS) by ZedooX Technologies for seamless chef-to-server operations." />
      <meta name="keywords" content="ZedPoss KDS, Kitchen Display System, Digital KOT, Restaurant Kitchen Software, Cloud Kitchen KDS, Fast Food KOT, POS Order Display, Kitchen Ticket System, ZedooX Technologies, Chef Dashboard, Paperless Kitchen, Order Expediting Software, Smart Cafe Kitchen, Live KOT Tracking, BOH Software, Restaurant Backend Operations, QSR Kitchen Display, Dine-in KDS, Delivery Order Manager, Takeaway KOT, Seamless POS Integration, Kitchen Prep Timer, Chef Management POS, ZedPoss Cloud KDS" />

      <div className="p-6 h-full flex flex-col bg-slate-100 overflow-hidden relative">
        
        {/* HEADER SECTION */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center">
              <ChefHat className="mr-2 text-orange-500" /> Kitchen Display (KDS)
            </h1>
            <p className="text-slate-500 text-sm flex items-center mt-1">
              {!isOnline && <WifiOff size={14} className="text-red-500 mr-1"/>}
              {!isOnline ? <span className="text-red-500 font-bold">System Offline (Sync Paused)</span> : "Live orders to be prepared by the chef"}
            </p>
          </div>

          {/* TABS BUTTONS */}
          <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
            <button 
              onClick={() => setActiveTab("LIVE")} 
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "LIVE" ? "bg-orange-500 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"}`}
            >
              <LayoutList size={16} className="mr-2" /> Live KOT 
              {liveOrders.length > 0 && <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === "LIVE" ? "bg-white text-orange-600" : "bg-orange-100 text-orange-600"}`}>{liveOrders.length}</span>}
            </button>
            <button 
              onClick={() => setActiveTab("PREPARED")} 
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "PREPARED" ? "bg-green-500 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"}`}
            >
              <CheckCheck size={16} className="mr-2" /> Prepared
              {preparedOrders.length > 0 && <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === "PREPARED" ? "bg-white text-green-600" : "bg-green-100 text-green-600"}`}>{preparedOrders.length}</span>}
            </button>
            <button 
              onClick={() => setActiveTab("HISTORY")} 
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "HISTORY" ? "bg-slate-800 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"}`}
            >
              <History size={16} className="mr-2" /> All Today
            </button>
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="animate-spin text-orange-500" size={40} />
            </div>
          ) : displayOrders.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-full text-slate-400">
              <ChefHat size={60} className="mb-4 opacity-20" />
              <p className="font-bold text-xl text-slate-500">
                {activeTab === "LIVE" ? "Kitchen is all clear!" : activeTab === "PREPARED" ? "No orders prepared yet." : "No orders found today."}
              </p>
              <p className="text-sm mt-1">{activeTab === "LIVE" ? "Waiting for new orders..." : ""}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {displayOrders.map((order) => {
                const orderTime = new Date(order.createdAt);
                const now = new Date();
                const diffMins = Math.floor((now.getTime() - orderTime.getTime()) / 60000);
                
                const isDelayed = diffMins > 10 && order.status === "COMPLETED";

                return (
                  <div key={order.id} className={`bg-white rounded-2xl shadow-md border-t-8 p-5 flex flex-col transition-all ${
                    order.status === "SERVED" ? 'border-green-500 opacity-90' : (isDelayed ? 'border-red-500 shadow-red-100' : 'border-orange-500')
                  }`}>
                    
                    {/* Card Header */}
                    <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                      <div>
                        <span className="font-black text-2xl text-slate-800">#{order.billNumber}</span>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                          {order.orderType.replace("_", " ")} {order.tableNo ? `(T-${order.tableNo})` : ''}
                        </p>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1">
                        <div className={`flex items-center text-[11px] px-2 py-1 rounded-lg font-bold ${
                          order.status === "SERVED" ? 'bg-green-100 text-green-700' : (isDelayed ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500')
                        }`}>
                          <Clock size={12} className="mr-1" /> 
                          {diffMins === 0 ? 'Just now' : `${diffMins}m ago`}
                        </div>
                        
                        {activeTab === "HISTORY" && (
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${order.status === "SERVED" ? "bg-green-100 text-green-600" : (order.status === "CANCELLED" ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600")}`}>
                            {order.status}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Kitchen Items List */}
                    <ul className="space-y-3 flex-1 mb-6 text-lg font-bold text-slate-700">
                      {order.items.map((item: any) => (
                        <li key={item.id} className={`flex justify-between items-start border-b border-slate-50 pb-2 border-dashed ${order.status === 'SERVED' ? 'line-through text-slate-400' : ''}`}>
                          <span className="flex items-start">
                            <span className={`text-sm px-2 py-1 rounded mr-3 font-mono shrink-0 ${order.status === 'SERVED' ? 'bg-slate-100' : 'bg-orange-100 text-orange-700'}`}>{item.quantity}x</span> 
                            <span className="leading-tight mt-0.5 uppercase">{item.menuItem.name}</span>
                          </span>
                        </li>
                      ))}
                    </ul>

                    {order.status === "COMPLETED" && activeTab === "LIVE" && (
                      <button 
                        onClick={() => markAsReady(order.id)}
                        className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center space-x-2 transition-all active:scale-95 shadow-[0_5px_15px_rgba(34,197,94,0.3)]"
                      >
                        <CheckCircle2 size={20} /> <span>MARK READY</span>
                      </button>
                    )}
                    
                    {order.status === "SERVED" && activeTab === "PREPARED" && (
                      <div className="w-full bg-slate-50 border border-slate-100 text-slate-500 font-bold text-xs py-3 rounded-xl flex items-center justify-center space-x-2 uppercase tracking-wider">
                        <CheckCheck size={16} /> <span>Order Prepared</span>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
