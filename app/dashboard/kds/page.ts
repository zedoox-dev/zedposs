"use client";
import { useState, useEffect } from "react";
import { useOutlet } from "../../context/OutletContext";
import { useSearchParams } from "next/navigation";
import { 
  ChefHat, Clock, Loader2, CheckCircle2, 
  Flame, Utensils, Store, ArrowRight, RefreshCw, MonitorPlay, X, Copy
} from "lucide-react";

export default function KitchenDisplaySystemPage() {
  const { selectedOutlet } = useOutlet();
  const searchParams = useSearchParams();
  
  const [liveOrders, setLiveOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  
  // 🟢 Filter State
  const [statusFilter, setStatusFilter] = useState("ALL");
  
  // 🟢 TV Mode States
  const [isTvMode, setIsTvMode] = useState(false);
  const [tvToken, setTvToken] = useState("");
  const [tvOutlet, setTvOutlet] = useState("");
  const [showTvModal, setShowTvModal] = useState(false);

  // Check if loaded in TV Mode
  useEffect(() => {
    if (searchParams?.get("tvMode") === "true") {
      setIsTvMode(true);
      setTvToken(searchParams.get("token") || "");
      setTvOutlet(searchParams.get("outletId") || "");
    }
  }, [searchParams]);

  const activeOutletId = isTvMode ? tvOutlet : selectedOutlet;

  const fetchKDSData = async () => {
    try {
      let url = `/api/brand/kds?outletId=${activeOutletId}`;
      if (isTvMode && tvToken) url += `&token=${tvToken}`;
      
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) setLiveOrders(json.liveOrders);
    } catch (e) {
      console.error("KDS Sync Failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!activeOutletId) return;
    setLoading(true);
    fetchKDSData();
    
    // 🔥 AUTO-REFRESH KDS EVERY 15 SECONDS
    const interval = setInterval(() => {
      fetchKDSData();
    }, 15000);

    return () => clearInterval(interval);
  }, [activeOutletId, isTvMode]);

  const handleUpdateStatus = async (orderId: string, currentStatus: string) => {
    setIsUpdating(orderId);
    
    let newStatus = "COMPLETED";
    if (currentStatus === "PENDING") newStatus = "PREPARING";
    else if (currentStatus === "PREPARING") newStatus = "READY";
    else if (currentStatus === "READY") newStatus = "COMPLETED";

    try {
      const payload: any = { orderId, newStatus };
      if (isTvMode) {
        payload.token = tvToken;
        payload.outletId = tvOutlet;
      }

      const res = await fetch("/api/brand/kds", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        if (newStatus === "COMPLETED") {
          setLiveOrders(prev => prev.filter(o => o.id !== orderId));
        } else {
          setLiveOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        }
      } else {
        alert("Action Denied. Ensure TV Token is valid.");
      }
    } catch (e) {
      alert("Failed to update ticket status.");
    } finally {
      setIsUpdating(null);
    }
  };

  const getWaitTime = (createdAt: string) => {
    return Math.floor((new Date().getTime() - new Date(createdAt).getTime()) / 60000);
  };

  const generateTvLink = () => {
    if (selectedOutlet === "ALL") {
      alert("Please select a specific branch to generate a kitchen display link.");
      return;
    }
    const token = btoa(`${selectedOutlet}:ZAPPED_KDS_SECURE_2026`);
    const link = `${window.location.origin}/dashboard/kds?tvMode=true&outletId=${selectedOutlet}&token=${token}`;
    return link;
  };

  const copyTvLink = () => {
    const link = generateTvLink();
    if (link) {
      navigator.clipboard.writeText(link);
      alert("✅ TV Link copied! Open this URL on your Smart TV Browser or Kitchen iPad.");
      setShowTvModal(false);
    }
  };

  // Filter Logic
  const filteredOrders = liveOrders.filter(o => statusFilter === "ALL" ? true : o.status === statusFilter);

  // ==========================================
  // 📺 FULL SCREEN TV MODE (OVERRIDES DASHBOARD)
  // ==========================================
  if (isTvMode) {
    return (
      <div className="fixed inset-0 z-[99999] bg-slate-950 text-slate-100 flex flex-col p-4 overflow-hidden">
        {/* TV Header */}
        <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
          <h1 className="text-2xl md:text-4xl font-black uppercase text-amber-500 tracking-tight flex items-center">
            <Flame className="mr-3 animate-pulse" size={32}/> LIVE KITCHEN DISPLAY
          </h1>
          
          <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
            {["ALL", "PENDING", "PREPARING", "READY"].map(status => (
              <button 
                key={status} onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-xs md:text-sm font-black uppercase tracking-widest transition-all ${statusFilter === status ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* TV Grid */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          {loading && filteredOrders.length === 0 ? (
            <div className="flex justify-center items-center h-full"><Loader2 size={60} className="animate-spin text-amber-500"/></div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-full text-slate-600">
              <CheckCircle2 size={100} className="mb-4 opacity-20"/>
              <h2 className="text-3xl font-black uppercase tracking-widest">Kitchen Clear</h2>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 pb-10">
              {filteredOrders.map(order => {
                const waitTime = getWaitTime(order.createdAt);
                const isDelayed = waitTime > 15 && order.status !== "READY";
                
                let cardColor = "bg-slate-900 border-slate-800";
                let btnColor = "bg-amber-500 text-slate-950";
                if (order.status === "PREPARING") { cardColor = "bg-indigo-950/40 border-indigo-900/50"; btnColor = "bg-emerald-500 text-slate-950"; }
                else if (order.status === "READY") { cardColor = "bg-emerald-950/40 border-emerald-900/50"; btnColor = "bg-slate-700 text-white"; }
                if (isDelayed) cardColor = "bg-red-950/40 border-red-900/50";

                return (
                  <div key={order.id} className={`border-2 rounded-2xl p-4 flex flex-col shadow-lg transition-all ${cardColor}`}>
                    <div className="flex justify-between items-start mb-4 border-b border-white/10 pb-3">
                      <div>
                        <h2 className="text-2xl font-black text-white leading-none">#{order.billNumber}</h2>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1 block">{order.orderType.replace("_", " ")}</span>
                      </div>
                      <div className={`text-right ${isDelayed ? 'text-red-500' : 'text-amber-400'}`}>
                        <span className="text-2xl font-mono font-black flex items-center"><Clock size={16} className="mr-1"/>{waitTime}m</span>
                        {isDelayed && <span className="text-[9px] font-black uppercase bg-red-600 text-white px-1.5 py-0.5 rounded animate-pulse">DELAYED</span>}
                      </div>
                    </div>
                    <div className="flex-1 mb-4">
                      <ul className="space-y-3">
                        {order.items.map((item: any) => (
                          <li key={item.id} className="flex justify-between items-start text-lg font-bold text-slate-200 border-b border-white/5 pb-2 last:border-0">
                            <span className="pr-3 leading-tight">{item.menuItem.name}</span>
                            <span className="bg-slate-800 text-white px-2 py-0.5 rounded-md font-black">x{item.quantity}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <button 
                      disabled={isUpdating === order.id}
                      onClick={() => handleUpdateStatus(order.id, order.status)}
                      className={`w-full py-4 rounded-xl text-base font-black uppercase tracking-widest flex justify-center items-center active:scale-95 transition-transform ${btnColor} disabled:opacity-50`}
                    >
                      {isUpdating === order.id ? <Loader2 className="animate-spin" size={24}/> : (order.status === "PENDING" ? "Start Preparing" : order.status === "PREPARING" ? "Mark Ready" : "Dispatch")}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // 💻 STANDARD DASHBOARD KDS VIEW
  // ==========================================
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
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
            <ChefHat className="mr-2 text-amber-500" /> Live Kitchen (KDS)
          </h1>
          <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">
            {selectedOutlet === "ALL" ? "HQ View: All Branch Kitchens" : "Branch Specific KDS Screen"}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* 🟢 Status Toggles */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            {["ALL", "PENDING", "PREPARING", "READY"].map(status => (
              <button 
                key={status} onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === status ? 'bg-amber-100 text-amber-700' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                {status}
              </button>
            ))}
          </div>

          <button onClick={() => setShowTvModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-md transition-all active:scale-95">
            <MonitorPlay className="mr-1.5" size={14} /> Connect Display
          </button>

          <button onClick={fetchKDSData} className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-sm transition-all active:scale-95">
            <RefreshCw className="mr-1.5 text-slate-400" size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Ticket Grid Area */}
      {filteredOrders.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-white border border-slate-200 rounded-3xl shadow-sm">
          <Utensils size={60} className="text-slate-200 mb-4" />
          <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">Kitchen is Clear</h3>
          <p className="text-xs font-bold text-slate-400 mt-1">No {statusFilter !== "ALL" ? statusFilter.toLowerCase() : "active"} orders in the queue.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredOrders.map((order) => {
              const waitTime = getWaitTime(order.createdAt);
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

              const isDelayed = waitTime > 15 && order.status !== "READY";
              if (isDelayed) cardStyle = "border-red-400 bg-red-50";

              return (
                <div key={order.id} className={`flex flex-col border-2 rounded-2xl overflow-hidden shadow-sm transition-all ${cardStyle}`}>
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

                  {selectedOutlet === "ALL" && (
                    <div className="bg-slate-900 text-white px-3 py-1.5 flex items-center">
                      <Store size={10} className="mr-1.5 opacity-60"/> 
                      <span className="text-[9px] font-black uppercase tracking-widest">{order.outlet.name}</span>
                    </div>
                  )}

                  <div className="p-4 flex-1">
                    <ul className="space-y-3">
                      {order.items.map((item: any) => (
                        <li key={item.id} className="flex justify-between items-start border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                          <span className="text-sm font-bold text-slate-800 flex-1 pr-2 uppercase leading-tight">
                            {item.menuItem.name}
                          </span>
                          <span className="text-sm font-black text-slate-900 bg-slate-100 px-2 rounded">
                            x{item.quantity}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 bg-white/50 border-t border-slate-100">
                    <button 
                      disabled={isUpdating === order.id}
                      onClick={() => handleUpdateStatus(order.id, order.status)}
                      className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest flex justify-center items-center active:scale-95 transition-transform ${actionButton} disabled:opacity-50`}
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

      {/* 🟢 TV LINK GENERATOR MODAL */}
      {showTvModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black uppercase text-slate-900 flex items-center">
                <MonitorPlay size={18} className="text-indigo-600 mr-2"/> Setup Kitchen Display
              </h3>
              <button onClick={() => setShowTvModal(false)} className="text-slate-400 hover:text-red-500 bg-slate-100 p-1.5 rounded-full transition-colors"><X size={16}/></button>
            </div>
            
            <p className="text-xs font-bold text-slate-500 mb-5">
              Open the link below on your Smart TV Browser or Tablet. It is fully secured, runs in full-screen dark mode, and bypasses the main dashboard to show ONLY live orders.
            </p>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Your Secure TV URL</p>
              <div className="break-all font-mono text-[10px] text-slate-800 leading-relaxed font-bold selection:bg-indigo-100">
                {selectedOutlet === "ALL" ? "⚠️ Please select a specific outlet from the top left dropdown to generate a TV link." : generateTvLink()}
              </div>
            </div>

            <button 
              disabled={selectedOutlet === "ALL"}
              onClick={copyTvLink} 
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-3.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center transition-all shadow-md active:scale-95"
            >
              <Copy size={16} className="mr-2"/> Copy Secure Link
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
