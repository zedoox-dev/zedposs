"use client";
import { useState, useEffect, useMemo } from "react";
import { Radio, RefreshCw, ChefHat, Loader2, Search, LayoutGrid, ListTodo, User, Bike, Utensils, CheckCircle, Clock, Play } from "lucide-react";
import { useParams } from "next/navigation";

type ViewMode = 'LIVE' | 'KOT';

export default function LiveOrdersPage() {
  const params = useParams();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [viewMode, setViewMode] = useState<ViewMode>('LIVE');
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL");

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
    const interval = setInterval(fetchLiveOrders, 10000); 
    return () => clearInterval(interval);
  }, [params.outletId]);

  // Handle Real Database Status Update
  const handleStatusUpdate = async (orderId: string, currentStatus: string) => {
    let nextStatus = "COMPLETED"; // Default fallback
    if (currentStatus === "PENDING" || currentStatus === "COMPLETED") nextStatus = "PREPARING";
    else if (currentStatus === "PREPARING") nextStatus = "READY";
    else if (currentStatus === "READY") nextStatus = "COMPLETED";

    // Optimistic UI Update (Turant UI change, baad me API call)
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o));

    try {
      await fetch(`/api/pos/${params.outletId}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      // Optionally fetch again to ensure sync
      fetchLiveOrders();
    } catch (error) {
      console.error("Status update failed:", error);
      fetchLiveOrders(); // Revert back on fail
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      let tabMatch = false;
      if (activeFilter === "ALL") tabMatch = true;
      else if (activeFilter === "DINE IN") tabMatch = order.orderType === "DINE_IN";
      else if (activeFilter === "DELIVERY") tabMatch = order.orderType === "DELIVERY";
      else if (activeFilter === "TAKEAWAY") tabMatch = order.orderType === "TAKEAWAY";
      else if (activeFilter === "ONLINE") tabMatch = order.orderType.startsWith("ONLINE_");
      else if (activeFilter === "SWIGGY") tabMatch = order.orderType === "ONLINE_SWIGGY";
      else if (activeFilter === "ZOMATO") tabMatch = order.orderType === "ONLINE_ZOMATO";
      else if (activeFilter === "RAMKESAR") tabMatch = ["OWN_APP", "OWN_WEB"].includes(order.orderType);

      if (!tabMatch) return false;

      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      
      const matchBill = order.billNumber.toString().includes(q);
      const matchId = order.id.toLowerCase().includes(q);
      const matchPlatform = order.platform?.toLowerCase().includes(q) || order.externalPlatform?.toLowerCase().includes(q);
      const matchCustomer = order.customer?.name?.toLowerCase().includes(q) || order.customer?.phone?.includes(q);
      const matchRider = order.deliveryOrder?.deliveryBoyName?.toLowerCase().includes(q);

      return matchBill || matchId || matchPlatform || matchCustomer || matchRider;
    });
  }, [orders, activeFilter, searchQuery]);

  // Changed PICK UP to TAKEAWAY
  const filters = ["ALL", "DINE IN", "DELIVERY", "TAKEAWAY", "ONLINE", "SWIGGY", "ZOMATO", "RAMKESAR"];

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" size={40}/></div>;

  return (
    <div className="p-6 h-full flex flex-col bg-slate-50">
      
      {/* HEADER & SEARCH */}
      <div className="flex justify-between items-center mb-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setViewMode('LIVE')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition-all ${viewMode === 'LIVE' ? 'bg-white shadow-sm text-amber-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <LayoutGrid size={16} /> <span>Live View</span>
          </button>
          <button 
            onClick={() => setViewMode('KOT')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition-all ${viewMode === 'KOT' ? 'bg-white shadow-sm text-amber-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <ListTodo size={16} /> <span>KOT View</span>
          </button>
        </div>

        <div className="flex-1 max-w-xl mx-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by Bill No, Order ID, Customer, Rider, Zomato..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        <button onClick={fetchLiveOrders} disabled={refreshing} className="flex items-center px-5 py-2.5 bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-700 transition-colors active:scale-95 disabled:opacity-50 shrink-0">
          <RefreshCw size={14} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* FILTERS */}
      <div className="flex space-x-2 mb-6 overflow-x-auto custom-scrollbar pb-2 shrink-0">
        {filters.map(filter => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all border ${
              activeFilter === filter 
              ? 'bg-amber-500 text-white border-amber-500 shadow-md' 
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <ChefHat size={48} className="mb-4 opacity-50" />
            <p className="font-black text-sm uppercase tracking-widest">Kitchen is Clear</p>
          </div>
        ) : (
          <div className={`grid gap-4 ${viewMode === 'LIVE' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4' : 'grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'}`}>
            
            {filteredOrders.map((order) => {
              
              // Platform Styling Logic
              const getPlatformStyle = (type: string) => {
                if (type === 'ONLINE_ZOMATO') return 'bg-red-50 text-red-700 border-red-200';
                if (type === 'ONLINE_SWIGGY') return 'bg-orange-50 text-orange-700 border-orange-200';
                if (type === 'DINE_IN') return 'bg-blue-50 text-blue-700 border-blue-200';
                if (type === 'DELIVERY') return 'bg-purple-50 text-purple-700 border-purple-200';
                return 'bg-slate-50 text-slate-700 border-slate-200';
              };

              // Platform Logo Logic - Only text now, with brand colors and bold
              const renderPlatformLogo = (type: string) => {
                if (type === 'ONLINE_ZOMATO') return <span className="font-black text-red-600 tracking-wider">ZOMATO</span>;
                if (type === 'ONLINE_SWIGGY') return <span className="font-black text-orange-600 tracking-wider">SWIGGY</span>;
                return <span className="font-black tracking-wider">{type.replace('ONLINE_', '').replace('_', ' ')}</span>;
              };

              // Dynamic Status Button Data
              let btnText = "Start Preparing";
              let btnColor = "bg-blue-600 hover:bg-blue-700 text-white";
              let btnIcon = <Play size={16} className="mr-2" />;
              
              if (order.status === "PREPARING") {
                btnText = "Food is Ready";
                btnColor = "bg-amber-500 hover:bg-amber-600 text-white";
                btnIcon = <CheckCircle size={16} className="mr-2" />;
              } else if (order.status === "READY") {
                btnText = "Complete Order";
                btnColor = "bg-emerald-600 hover:bg-emerald-700 text-white";
                btnIcon = <CheckCircle size={16} className="mr-2" />;
              } else if (order.status === "COMPLETED") {
                btnText = "Restart (Completed)";
                btnColor = "bg-slate-200 hover:bg-slate-300 text-slate-600";
                btnIcon = <RefreshCw size={16} className="mr-2" />;
              }

              // --- KOT VIEW RENDER ---
              if (viewMode === 'KOT') {
                return (
                  <div key={order.id} className="bg-white border-2 border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col hover:border-amber-400 transition-colors">
                    <div className="bg-slate-100 p-3 flex justify-between items-center border-b border-slate-200">
                      <span className="font-black text-lg text-slate-800">#{order.billNumber}</span>
                      <span className={`text-[10px] uppercase px-2 py-1 rounded border ${getPlatformStyle(order.orderType)} flex items-center`}>
                        {renderPlatformLogo(order.orderType)}
                      </span>
                    </div>
                    <div className="p-4 flex-1">
                      <div className="text-xs font-bold text-slate-500 mb-3 flex justify-between items-center">
                        <span className="flex items-center"><Clock size={12} className="mr-1"/> {new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        <span className="text-slate-800 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-widest text-[9px]">{order.status}</span>
                      </div>
                      <ul className="space-y-3">
                        {order.items.map((item:any) => (
                          <li key={item.id} className="text-sm font-bold text-slate-800 flex items-start leading-tight">
                            <span className="text-amber-500 mr-2 bg-amber-50 px-1.5 py-0.5 rounded">{item.quantity}x</span> 
                            <div>
                              <span>{item.menuItem.name}</span>
                              {item.modifiers && item.modifiers.length > 0 && (
                                <span className="block text-[10px] text-slate-500 mt-0.5 font-medium">
                                  {item.modifiers.map((m:any) => `+${m.modifier.name}`).join(", ")}
                                </span>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-3 bg-slate-50 border-t border-slate-100">
                      <button onClick={() => handleStatusUpdate(order.id, order.status)} className={`w-full py-2.5 flex items-center justify-center font-black text-[11px] uppercase tracking-wider rounded-xl transition-colors ${btnColor}`}>
                         {btnIcon} {btnText}
                      </button>
                    </div>
                  </div>
                );
              }

              // --- LIVE VIEW RENDER (Detailed) ---
              return (
                <div key={order.id} className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden flex flex-col hover:shadow-lg transition-all relative">
                  
                  {/* Card Header */}
                  <div className={`p-3 flex justify-between items-center border-b ${getPlatformStyle(order.orderType)}`}>
                    <div className="flex items-center space-x-2">
                      <span className="font-black text-lg">#{order.billNumber}</span>
                      <span className="bg-white text-slate-600 px-2 py-0.5 rounded-full text-[9px] font-black uppercase shadow-sm tracking-wider">{order.status}</span>
                    </div>
                    <span className="text-[10px] uppercase px-2 py-1 bg-white/80 shadow-sm rounded-md flex items-center">
                       {renderPlatformLogo(order.orderType)}
                    </span>
                  </div>

                  {/* Customer / Table / Rider Info */}
                  <div className="p-4 bg-slate-50 border-b border-slate-100 space-y-2">
                    <div className="flex items-start space-x-2">
                      <User size={14} className="text-slate-400 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-slate-700 truncate">{order.customer?.name || "Walk-in Customer"}</p>
                        <p className="text-[10px] font-bold text-slate-500">{order.customer?.phone || "No phone provided"}</p>
                      </div>
                    </div>
                    
                    {order.table && (
                      <div className="flex items-start space-x-2">
                        <Utensils size={14} className="text-amber-500 mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-black text-amber-700">Table: {order.table.tableNo} ({order.table.section})</p>
                        </div>
                      </div>
                    )}

                    {order.deliveryOrder?.deliveryBoyName && (
                      <div className="flex items-start space-x-2">
                        <Bike size={14} className="text-purple-500 mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black text-purple-700 truncate">Rider: {order.deliveryOrder.deliveryBoyName}</p>
                          <p className="text-[10px] font-bold text-purple-500">{order.deliveryOrder.deliveryBoyPhone || "Waiting for rider"}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Items List */}
                  <div className="p-4 flex-1 bg-white overflow-y-auto">
                    <div className="text-[10px] font-black uppercase text-slate-400 mb-2 border-b border-slate-100 pb-1 flex justify-between">
                      <span>Order Items</span>
                      <span className="flex items-center"><Clock size={10} className="mr-1"/>{new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <ul className="space-y-2">
                      {order.items.map((item:any) => (
                        <li key={item.id} className="text-sm font-bold text-slate-800 flex justify-between items-start">
                          <div className="flex items-start">
                            <span className="text-amber-500 w-6 shrink-0">{item.quantity}x</span> 
                            <div>
                              <span>{item.menuItem.name}</span>
                              {item.modifiers && item.modifiers.length > 0 && (
                                <span className="block text-[10px] text-slate-500 mt-0.5">
                                  {item.modifiers.map((m:any) => `+ ${m.modifier.name}`).join(", ")}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-slate-400 font-bold ml-2">₹{item.totalPrice}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Card Footer */}
                  <div className="p-4 bg-white border-t border-slate-100 mt-auto">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total</span>
                      <span className="text-lg font-black text-emerald-600">₹{order.totalAmount}</span>
                    </div>
                    <button 
                      onClick={() => handleStatusUpdate(order.id, order.status)} 
                      className={`w-full flex items-center justify-center py-2.5 font-black text-xs uppercase tracking-widest rounded-xl transition-all active:scale-95 ${btnColor}`}
                    >
                      {btnIcon} {btnText}
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
