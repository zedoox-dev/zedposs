"use client";
import { useState, useEffect } from "react";
import { History, Loader2, Eye, X, Utensils, Bike, ShoppingBag, Receipt, User, Clock } from "lucide-react";
import { useParams, useRouter } from "next/navigation"; // useRouter added

export default function RecentOrdersPage() {
  const params = useParams();
  const router = useRouter(); // For closing the page
  
  const [orders, setOrders] = useState<any[]>([]);
  const [todaysTotal, setTodaysTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Animation state for the main page drawer
  const [isPageOpen, setIsPageOpen] = useState(false);
  
  // States for Tabs and Details Drawer
  const [activeTab, setActiveTab] = useState<'DINE_IN' | 'DELIVERY' | 'PICKUP'>('DINE_IN');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  useEffect(() => {
    // Trigger slide-in animation on mount
    setIsPageOpen(true);

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

  // Tab Filtering Logic
  const filteredOrders = orders.filter((order) => {
    if (activeTab === 'DINE_IN') return order.orderType === 'DINE_IN';
    if (activeTab === 'DELIVERY') return order.orderType === 'DELIVERY';
    if (activeTab === 'PICKUP') return !['DINE_IN', 'DELIVERY'].includes(order.orderType); 
    return true;
  });

  // Handle closing the main page drawer
  const handleClosePage = () => {
    setIsPageOpen(false);
    setTimeout(() => router.back(), 300); // Wait for animation to finish, then go back
  };

  return (
    /* OUTERMOST WRAPPER - Makes the whole page a blurred background overlay */
    <div 
      className={`fixed inset-0 z-40 flex justify-end bg-slate-900/30 backdrop-blur-sm transition-opacity duration-300 ${isPageOpen ? 'opacity-100' : 'opacity-0'}`}
      onClick={handleClosePage} // Clicking outside closes the page
    >
      
      /* MAIN PAGE DRAWER (Half screen, right side) */
      <div 
        className={`w-full max-w-4xl bg-slate-50 h-full shadow-2xl flex flex-col transform transition-transform duration-300 ease-out relative ${isPageOpen ? 'translate-x-0' : 'translate-x-full'}`}
        onClick={(e) => e.stopPropagation()} // Prevent clicks inside from closing the page
      >
        
        {loading ? (
          <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" size={40}/></div>
        ) : (
          <div className="p-6 h-full flex flex-col overflow-hidden">
            {/* Top Header */}
            <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="bg-orange-500/10 p-3 rounded-xl text-orange-500">
                  <History size={24} />
                </div>
                <div>
                  <h1 className="text-xl font-black text-slate-800 uppercase tracking-wider">Today's Orders</h1>
                  <p className="text-xs text-slate-500 font-bold tracking-wide">Live terminal tracking</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right border-r border-slate-200 pr-6">
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Today's Revenue</p>
                  <p className="text-2xl font-black text-emerald-500">₹{todaysTotal.toFixed(2)}</p>
                </div>
                <button onClick={handleClosePage} className="p-2 bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-500 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-4 mb-6 shrink-0">
              <button 
                onClick={() => setActiveTab('DINE_IN')}
                className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-bold transition-all duration-200 ${activeTab === 'DINE_IN' ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
              >
                <Utensils size={18} /> <span>Dine In</span>
              </button>
              <button 
                onClick={() => setActiveTab('DELIVERY')}
                className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-bold transition-all duration-200 ${activeTab === 'DELIVERY' ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
              >
                <Bike size={18} /> <span>Delivery</span>
              </button>
              <button 
                onClick={() => setActiveTab('PICKUP')}
                className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-bold transition-all duration-200 ${activeTab === 'PICKUP' ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
              >
                <ShoppingBag size={18} /> <span>Pickup / Online</span>
              </button>
            </div>

            {/* Orders Table View */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
              <div className="overflow-auto custom-scrollbar flex-1">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-100 z-10 shadow-sm">
                    <tr className="text-slate-500 text-xs uppercase tracking-wider font-bold">
                      <th className="p-4 border-b border-slate-200">Bill No.</th>
                      <th className="p-4 border-b border-slate-200">Time</th>
                      <th className="p-4 border-b border-slate-200">Order ID / Source</th>
                      <th className="p-4 border-b border-slate-200">Status</th>
                      <th className="p-4 border-b border-slate-200">Amount</th>
                      <th className="p-4 border-b border-slate-200 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">No orders found for this category today.</td>
                      </tr>
                    ) : (
                      filteredOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-orange-50/50 transition-colors border-b border-slate-100 last:border-0 group">
                          <td className="p-4 font-black text-slate-800">#{order.billNumber}</td>
                          <td className="p-4 text-sm font-semibold text-slate-600">{new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                          <td className="p-4">
                            <div className="text-sm font-bold text-slate-700">{order.id.slice(-6).toUpperCase()}</div>
                            <div className="text-[10px] font-black text-orange-500 uppercase">{order.orderType.replace('_', ' ')}</div>
                          </td>
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              order.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                              order.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="p-4 font-black text-slate-800 text-lg">₹{order.totalAmount}</td>
                          <td className="p-4 text-center">
                            <button 
                              onClick={() => setSelectedOrder(order)}
                              className="p-2 bg-slate-100 text-slate-500 hover:bg-orange-500 hover:text-white rounded-lg transition-colors inline-flex items-center justify-center"
                            >
                              <Eye size={18} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* DETAILS DRAWER (Nested Drawer for single order view) */}
        <div 
          className={`absolute top-0 right-0 z-50 w-full max-w-md bg-white h-full shadow-[-10px_0_30px_rgba(0,0,0,0.1)] flex flex-col transform transition-transform duration-300 ease-out border-l border-slate-200 ${selectedOrder ? 'translate-x-0' : 'translate-x-full'}`}
          onClick={(e) => e.stopPropagation()}
        >
          {selectedOrder && (
            <>
              {/* Drawer Header */}
              <div className="bg-white px-6 py-4 border-b border-slate-200 flex justify-between items-center shrink-0">
                <div>
                  <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    <Receipt size={24} className="text-orange-500" />
                    Bill #{selectedOrder.billNumber}
                  </h2>
                  <p className="text-xs text-slate-500 font-bold mt-1">ID: {selectedOrder.id}</p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-2 bg-slate-100 hover:bg-red-100 hover:text-red-600 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Drawer Body (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                
                {/* Meta Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-center">
                    <div className="flex items-center space-x-2 mb-1">
                      <Clock size={14} className="text-slate-400" />
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Time</p>
                    </div>
                    <p className="text-sm font-bold text-slate-700 leading-tight">{new Date(selectedOrder.createdAt).toLocaleTimeString()}</p>
                    <p className="text-xs text-slate-500 mt-1">{new Date(selectedOrder.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-center">
                    <div className="flex items-center space-x-2 mb-1">
                      <User size={14} className="text-slate-400" />
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Customer</p>
                    </div>
                    <p className="text-sm font-bold text-slate-700 leading-tight truncate">{selectedOrder.customer?.name || 'Walk-in'}</p>
                    <p className="text-xs text-slate-500 mt-1">{selectedOrder.customer?.phone || 'No Phone'}</p>
                  </div>
                </div>

                {selectedOrder.table && (
                  <div className="bg-orange-50 border border-orange-100 p-3 rounded-xl flex items-center space-x-2 text-orange-800 font-bold text-sm">
                    <Utensils size={16}/> <span>Table: {selectedOrder.table.tableNo} ({selectedOrder.table.section})</span>
                  </div>
                )}

                {/* Items List */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-xs font-black text-slate-500 uppercase">Items Ordered</div>
                  <div className="divide-y divide-slate-100">
                    {selectedOrder.items.map((item: any) => (
                      <div key={item.id} className="p-4 flex justify-between items-start">
                        <div>
                          <p className="font-bold text-slate-800">{item.menuItem.name}</p>
                          <p className="text-xs text-slate-500 font-semibold">{item.quantity} x ₹{item.unitPrice}</p>
                          
                          {/* Item Modifiers */}
                          {item.modifiers && item.modifiers.length > 0 && (
                            <div className="mt-1 space-y-1 text-[11px] text-slate-500 font-medium">
                              {item.modifiers.map((mod: any) => (
                                <div key={mod.id} className="flex space-x-1">
                                  <span>+ {mod.name}</span>
                                  {mod.extraPrice > 0 && <span>(₹{mod.extraPrice})</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <p className="font-black text-slate-800 mt-1">₹{item.totalPrice}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bill Summary */}
                <div className="bg-slate-800 text-white rounded-xl p-5 shadow-inner">
                  <div className="space-y-2 text-sm font-medium">
                    <div className="flex justify-between text-slate-300">
                      <span>Subtotal</span>
                      <span>₹{selectedOrder.subtotal.toFixed(2)}</span>
                    </div>
                    {selectedOrder.discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-400">
                        <span>Discount</span>
                        <span>- ₹{selectedOrder.discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    {(selectedOrder.cgst > 0 || selectedOrder.sgst > 0) && (
                      <div className="flex justify-between text-slate-400 text-xs pt-2 border-t border-slate-600/50">
                        <span>Taxes (CGST + SGST)</span>
                        <span>₹{(selectedOrder.cgst + selectedOrder.sgst).toFixed(2)}</span>
                      </div>
                    )}
                    {selectedOrder.packingCharges > 0 && (
                      <div className="flex justify-between text-slate-300">
                        <span>Packing Charges</span>
                        <span>₹{selectedOrder.packingCharges.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-slate-600 mt-4 pt-4 flex justify-between items-center">
                    <span className="text-lg font-black uppercase tracking-wider">Grand Total</span>
                    <span className="text-2xl font-black text-orange-500">₹{selectedOrder.totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Payment Detail Footer */}
                <div className="flex justify-between items-center bg-slate-100 p-4 rounded-xl font-bold text-sm text-slate-600 mb-4">
                  <span className="uppercase text-xs tracking-widest">Payment Mode</span>
                  <span className={`px-3 py-1 rounded-md text-white text-xs tracking-wider uppercase ${selectedOrder.paymentMode === 'CASH' ? 'bg-emerald-500' : 'bg-blue-500'}`}>
                    {selectedOrder.paymentMode}
                  </span>
                </div>

              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
