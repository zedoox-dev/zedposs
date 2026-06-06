"use client";
import { useState, useEffect } from "react";
import { 
  Search, UserPlus, ShoppingCart, Trash2, 
  CreditCard, Banknote, UtensilsCrossed, MonitorPlay, Loader2, CheckCircle2
} from "lucide-react";

export default function POSTerminal() {
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [outletId, setOutletId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Cart & Order State
  const [cart, setCart] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [orderType, setOrderType] = useState("DINE_IN");
  const [paymentMode, setPaymentMode] = useState("CASH");
  
  // Customer State
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);
  const [lastBill, setLastBill] = useState<number | null>(null);

  useEffect(() => {
    initPOS();
  }, []);

  const initPOS = async () => {
    try {
      const res = await fetch("/api/pos/checkout");
      const json = await res.json();
      if (json.success) {
        setMenuItems(json.menuItems);
        setCustomers(json.customers);
        setOutletId(json.outletId);
      } else {
        alert(json.error);
      }
    } catch (e) {
      console.error("POS Init Failed");
    } finally {
      setLoading(false);
    }
  };

  // Cart Functions
  const addToCart = (item: any) => {
    const existing = cart.find(c => c.id === item.id);
    if (existing) {
      setCart(cart.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCart([...cart, { ...item, qty: 1 }]);
    }
  };

  const updateQty = (id: string, delta: number) => {
    setCart(cart.map(c => {
      if (c.id === id) return { ...c, qty: Math.max(1, c.qty + delta) };
      return c;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(c => c.id !== id));
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  // Auto-fill Customer Name if Phone exists
  useEffect(() => {
    if (customerPhone.length === 10) {
      const found = customers.find(c => c.phone === customerPhone);
      if (found) setCustomerName(found.name);
    }
  }, [customerPhone, customers]);

  // Checkout Protocol
  const handleCheckout = async () => {
    if (cart.length === 0) return alert("Cart is empty!");
    setIsProcessing(true);

    try {
      const res = await fetch("/api/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId,
          cart,
          totalAmount,
          paymentMode,
          orderType,
          customerPhone,
          customerName
        })
      });
      const json = await res.json();
      
      if (res.ok && json.success) {
        setLastBill(json.order.billNumber);
        setCart([]);
        setCustomerPhone("");
        setCustomerName("");
        
        // Hide success message after 3 seconds
        setTimeout(() => setLastBill(null), 3000);
      } else {
        alert("Checkout Failed: " + json.error);
      }
    } catch (e) {
      alert("Network Error during checkout");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredMenu = menuItems.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <Loader2 className="animate-spin text-indigo-500 mb-4" size={50} />
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-300">Initializing Secure POS Terminal...</h2>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      
      {/* LEFT PANEL: Menu & Catalog */}
      <div className="flex-1 flex flex-col h-full bg-slate-100/50">
        
        {/* Top Header */}
        <div className="bg-white p-4 flex items-center justify-between border-b border-slate-200 shrink-0">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white mr-3 shadow-lg shadow-indigo-600/20">
              <MonitorPlay size={20} />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight">Live POS Terminal</h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Store Branch ID: {outletId?.slice(0,8)}</p>
            </div>
          </div>
          
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" placeholder="Search menu (Shortcut: F2)" 
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
            />
          </div>
        </div>

        {/* Categories (Quick Filters) */}
        <div className="p-4 flex gap-2 overflow-x-auto custom-scrollbar shrink-0">
          {["ALL", "SNACKS", "BEVERAGES", "SWEETS", "COMBOS"].map(cat => (
            <button key={cat} onClick={() => setSearchQuery(cat === "ALL" ? "" : cat)} className="bg-white border border-slate-200 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-indigo-400 hover:text-indigo-600 transition-colors whitespace-nowrap">
              {cat}
            </button>
          ))}
        </div>

        {/* Menu Grid */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="grid grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {filteredMenu.map(item => (
              <button 
                key={item.id} 
                onClick={() => addToCart(item)}
                className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-indigo-500 hover:shadow-lg transition-all flex flex-col items-center justify-center text-center group active:scale-95 min-h-[120px]"
              >
                <div className="text-xs font-black text-slate-900 uppercase mb-2 group-hover:text-indigo-600">{item.name}</div>
                <div className="text-sm font-mono font-black text-slate-500">₹{item.price}</div>
              </button>
            ))}
          </div>
        </div>
      </div>


      {/* RIGHT PANEL: Cart & Checkout */}
      <div className="w-[400px] bg-white border-l border-slate-200 flex flex-col shadow-2xl z-10">
        
        {/* Order Details Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50 shrink-0 space-y-3">
          <div className="flex justify-between items-center gap-2">
            <button onClick={() => setOrderType("DINE_IN")} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${orderType === "DINE_IN" ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-500 hover:bg-slate-100'}`}>Dine In</button>
            <button onClick={() => setOrderType("TAKEAWAY")} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${orderType === "TAKEAWAY" ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-500 hover:bg-slate-100'}`}>Takeaway</button>
            <button onClick={() => setOrderType("DELIVERY")} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${orderType === "DELIVERY" ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-500 hover:bg-slate-100'}`}>Delivery</button>
          </div>
          
          <div className="flex gap-2">
            <input 
              type="text" maxLength={10} placeholder="Phone (For Loyalty)" 
              value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
              className="w-1/2 p-2 border border-slate-200 rounded-lg text-xs font-mono font-bold outline-none focus:border-indigo-500" 
            />
            <input 
              type="text" placeholder="Name" 
              value={customerName} onChange={(e) => setCustomerName(e.target.value)}
              className="w-1/2 p-2 border border-slate-200 rounded-lg text-xs font-bold uppercase outline-none focus:border-indigo-500" 
            />
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/30">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300">
              <ShoppingCart size={60} className="mb-4 opacity-50" />
              <p className="text-xs font-black uppercase tracking-widest">Cart is Empty</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {cart.map(item => (
                <li key={item.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="text-xs font-black text-slate-800 uppercase line-clamp-1">{item.name}</h4>
                    <p className="text-[10px] font-mono text-slate-500 mt-1">₹{item.price} x {item.qty}</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-slate-100 rounded-lg border border-slate-200 overflow-hidden">
                      <button onClick={() => updateQty(item.id, -1)} className="px-2 py-1 text-slate-600 hover:bg-slate-200 font-black">-</button>
                      <span className="px-2 text-xs font-black w-6 text-center">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="px-2 py-1 text-slate-600 hover:bg-slate-200 font-black">+</button>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={16}/></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Checkout Section */}
        <div className="p-4 bg-white border-t border-slate-200 shrink-0">
          
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-black text-slate-500 uppercase tracking-widest">Grand Total</span>
            <span className="text-3xl font-mono font-black text-indigo-600">₹{totalAmount.toLocaleString()}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <button onClick={() => setPaymentMode("CASH")} className={`py-3 rounded-xl flex items-center justify-center text-[10px] font-black uppercase tracking-widest transition-all border ${paymentMode === "CASH" ? 'bg-emerald-50 text-emerald-600 border-emerald-500' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}>
              <Banknote size={14} className="mr-2" /> Cash
            </button>
            <button onClick={() => setPaymentMode("UPI")} className={`py-3 rounded-xl flex items-center justify-center text-[10px] font-black uppercase tracking-widest transition-all border ${paymentMode === "UPI" ? 'bg-blue-50 text-blue-600 border-blue-500' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}>
              <CreditCard size={14} className="mr-2" /> UPI / Card
            </button>
          </div>

          {lastBill ? (
            <div className="w-full bg-emerald-500 text-white font-black uppercase tracking-widest py-4 rounded-xl text-xs flex justify-center items-center shadow-lg animate-in slide-in-from-bottom-2">
              <CheckCircle2 size={16} className="mr-2" /> Bill #{lastBill} Generated & Sent to KDS
            </div>
          ) : (
            <button 
              disabled={cart.length === 0 || isProcessing}
              onClick={handleCheckout}
              className="w-full bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest py-4 rounded-xl text-xs flex justify-center items-center shadow-2xl shadow-slate-900/50 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
            >
              {isProcessing ? <Loader2 className="animate-spin" size={18} /> : "Print Bill & Send to Kitchen"}
            </button>
          )}

        </div>
      </div>

    </div>
  );
}
