"use client";
import { useState, useEffect, useMemo } from "react";
import { Radio, RefreshCw, ChefHat, Loader2, Search, LayoutGrid, ListTodo, User, Bike, Utensils, CheckCircle } from "lucide-react";
import { useParams } from "next/navigation";

type ViewMode = 'LIVE' | 'KOT';

export default function LiveOrdersPage() {
  const params = useParams();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // UI States
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

  // Handle Order Status Update (Mock function for UI, integrate your PUT API here)
  const handleStatusUpdate = async (orderId: string, currentStatus: string) => {
    console.log(`Updating order ${orderId} from ${currentStatus} to READY`);
    // Add API call here: await fetch(`/api/pos/orders/${orderId}/status`, { method: 'PUT', body: JSON.stringify({ status: 'READY' }) })
    fetchLiveOrders(); // Refresh after update
  };

  // --- Filtering & Search Logic ---
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // 1. Filter by Tab
      let tabMatch = false;
      if (activeFilter === "ALL") tabMatch = true;
      else if (activeFilter === "DINE IN") tabMatch = order.orderType === "DINE_IN";
      else if (activeFilter === "DELIVERY") tabMatch = order.orderType === "DELIVERY";
      else if (activeFilter === "PICK UP") tabMatch = order.orderType === "TAKEAWAY";
      else if (activeFilter === "ONLINE") tabMatch = order.orderType.startsWith("ONLINE_");
      else if (activeFilter === "SWIGGY") tabMatch = order.orderType === "ONLINE_SWIGGY";
      else if (activeFilter === "ZOMATO") tabMatch = order.orderType === "ONLINE_ZOMATO";
      else if (activeFilter === "RAMKESAR") tabMatch = ["OWN_APP", "OWN_WEB"].includes(order.orderType);

      if (!tabMatch) return false;

      // 2. Filter by Search Query
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

  const filters = ["ALL", "DINE IN", "DELIVERY", "PICK UP", "ONLINE", "SWIGGY", "ZOMATO", "RAMKESAR"];

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" size={40}/></div>;

  return (
    <div className="p-6 h-full flex flex-col bg-slate-50">
      
      {/* 1. TOP HEADER ROW */}
      <div className="flex justify-between items-center mb-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        
        {/* Toggle View */}
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

        {/* Global Search Bar */}
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

        {/* Refresh Button */}
        <button onClick={fetchLiveOrders} disabled={refreshing} className="flex items-center px-5 py-2.5 bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-700 transition-colors active:scale-95 disabled:opacity-50 shrink-0">
          <RefreshCw size={14} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* 2. FILTERS ROW */}
      <div className="flex space-x-2 mb-6 overflow-x-auto custom-scrollbar pb-2 shrink-0">
        {filters.map(filter => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all border ${
              activeFilter === filter 
              ? 'bg-amber-500 text-white border-amber-500 shadow-md' 
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* 3. MAIN CONTENT AREA */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <ChefHat size={48} className="mb-4 opacity-50" />
            <p className="font-black text-sm uppercase tracking-widest">Kitchen is Clear</p>
          </div>
        ) : (
          <div className={`grid gap-4 ${viewMode === 'LIVE' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4' : 'grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'}`}>
            
            {filteredOrders.map((order) => {
              
              // Helper to style platform badges
              const getPlatformStyle = (type: string) => {
                if (type.includes('ZOMATO')) return 'bg-red-100 text-red-700 border-red-200';
                if (type.includes('SWIGGY')) return 'bg-orange-100 text-orange-700 border-orange-200';
                if (type === 'DINE_IN') return 'bg-blue-100 text-blue-700 border-blue-200';
                if (type === 'DELIVERY') return 'bg-purple-100 text-purple-700 border-purple-200';
                return 'bg-slate-100 text-slate-700 border-slate-200'; // Own app/Takeaway
              };

              // --- KOT VIEW RENDER ---
              if (viewMode === 'KOT') {
                return (
                  <div key={order.id} className="bg-white border-2 border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col hover:border-amber-400 transition-colors">
                    <div className="bg-slate-100 p-3 flex justify-between items-center border-b border-slate-200">
                      <span className="font-black text-lg text-slate-800">#{order.billNumber}</span>
                      <span className={`text-[10px] font-black uppercase px-2 py-1 rounded border ${getPlatformStyle(order.orderType)}`}>
                        {order.orderType.replace('ONLINE_', '').replace('_', ' ')}
                      </span>
                    </div>
                    <div className="p-4 flex-1">
                      <div className="text-xs font-bold text-slate-500 mb-3 flex justify-between">
                        <span>{new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        <span className="text-amber-600">{order.status}</span>
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
                      <button onClick={() => handleStatusUpdate(order.id, order.status)} className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-colors">
                        Food Ready
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
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-1 bg-white/50 rounded-md">
                      {order.orderType.replace('ONLINE_', '').replace('_', ' ')}
                    </span>
                  </div>

                  {/* Customer / Table / Rider Info */}
                  <div className="p-4 bg-slate-50 border-b border-slate-100 space-y-2">
                    {/* Customer Info */}
                    <div className="flex items-start space-x-2">
                      <User size={14} className="text-slate-400 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-slate-700 truncate">{order.customer?.name || "Walk-in Customer"}</p>
                        <p className="text-[10px] font-bold text-slate-500">{order.customer?.phone || "No phone provided"}</p>
                      </div>
                    </div>
                    
                    {/* Table Info (Dine In) */}
                    {order.table && (
                      <div className="flex items-start space-x-2">
                        <Utensils size={14} className="text-amber-500 mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-black text-amber-700">Table: {order.table.tableNo} ({order.table.section})</p>
                        </div>
                      </div>
                    )}

                    {/* Rider Info (Delivery / Online) */}
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

                  {/* Items List (Flex-1 ensures footer stays at bottom) */}
                  <div className="p-4 flex-1 bg-white overflow-y-auto">
                    <div className="text-[10px] font-black uppercase text-slate-400 mb-2 border-b border-slate-100 pb-1 flex justify-between">
                      <span>Order Items</span>
                      <span>{new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
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

                  {/* Card Footer: Total & Status Button */}
                  <div className="p-4 bg-white border-t border-slate-100 mt-auto">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total</span>
                      <span className="text-lg font-black text-emerald-600">₹{order.totalAmount}</span>
                    </div>
                    <button 
                      onClick={() => handleStatusUpdate(order.id, order.status)} 
                      className="w-full flex items-center justify-center py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all active:scale-95"
                    >
                      <CheckCircle size={16} className="mr-2" /> Mark as Ready
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
