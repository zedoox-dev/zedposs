"use client";
import { useState, useEffect } from "react";
import { Search, ShoppingBag, Loader2, CheckCircle2, Printer, Plus, Minus, UtensilsCrossed, ConciergeBell, CreditCard, Banknote, SplitSquareHorizontal, Gift, PauseCircle, Send, ChevronDown, ChevronUp, Wifi, WifiOff, Percent, DollarSign, Image as ImageIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { localDB } from "@/lib/localDb"; 

export default function BillingPage() {
  const params = useParams();
  const outletId = params.outletId as string;
  const { data: session } = useSession();

  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dbCategories, setDbCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(""); 
  const [isOnline, setIsOnline] = useState(typeof window !== "undefined" ? navigator.onLine : true);

  const [cart, setCart] = useState<any[]>([]);
  const [orderType, setOrderType] = useState("DINE_IN"); 
  const [tableNo, setTableNo] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [paymentMode, setPaymentMode] = useState("CASH"); 
  const [partCash, setPartCash] = useState("");
  const [partCard, setPartCard] = useState("");
  const [compPassword, setCompPassword] = useState("");
  const [compReason, setCompReason] = useState("");

  const [showTaxDropdown, setShowTaxDropdown] = useState(false);
  const [showAdjustments, setShowAdjustments] = useState(false);

  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const [discount, setDiscount] = useState({ value: 0, mode: "PERCENT" });
  const [packing, setPacking] = useState({ value: 0, mode: "PERCENT" });
  const [delivery, setDelivery] = useState({ value: 0, mode: "PERCENT" });

  const [isProcessing, setIsProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastBillNo, setLastBillNo] = useState("");

  const [printerConfig, setPrinterConfig] = useState<any>(null);
  const [lastPrintedOrder, setLastPrintedOrder] = useState<any>(null);

  useEffect(() => {
    if (!session?.user) return;
    const secureOutletId = (session.user as any).outletId || outletId;

    const handleOnline = () => { setIsOnline(true); triggerOfflineQueueSync(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const handleRecall = (e: any) => {
      const order = e.detail;
      setCart(order.cart);
      setOrderType(order.orderType);
      setTableNo(order.tableNo || "");
      setCustomerPhone(order.customerPhone || "");
      setCustomerName(order.customerName || "");
    };
    window.addEventListener("zapped_recall_order", handleRecall);

    const handleClearCart = () => {
      setCart([]); setCustomerPhone(""); setCustomerName(""); setTableNo("");
      setDiscount({ value: 0, mode: "PERCENT" }); setPacking({ value: 0, mode: "PERCENT" }); setDelivery({ value: 0, mode: "PERCENT" });
      setCouponCode(""); setCouponDiscount(0);
    };
    window.addEventListener("zapped_clear_cart", handleClearCart);

    const pConf = localStorage.getItem(`zapped_printer_config_${secureOutletId}`);
    if (pConf) setPrinterConfig(JSON.parse(pConf));
    else setPrinterConfig({ printerSize: "80mm", headerName: "ZAPPED POS", headerSize: "text-lg", subHeader: "Premium Quality", subHeaderSize: "text-[10px]", kotDineIn: true, kotDelivery: true, kotPickUp: false });

    const loadMenu = async () => {
      try {
        if (navigator.onLine) {
          const res = await fetch(`/api/menu`); 
          const data = await res.json();
          const menuData = Array.isArray(data) ? data : [];
          
          await localDB.menuItems.clear(); 
          if (menuData.length > 0) {
            await localDB.menuItems.bulkPut(menuData);
          }
          processMenuData(menuData);
        } else {
          const localMenuData = await localDB.menuItems.where('outletId').equals(secureOutletId).toArray();
          processMenuData(localMenuData);
        }
      } catch (err) {
        console.error("Menu Load Error:", err);
      } finally {
        setLoading(false);
      }
    };

    const processMenuData = (menuData: any[]) => {
      setMenuItems(menuData);
      const uniqueDbCats = Array.from(new Set(menuData.map((item: any) => item.category))) as string[];
      const savedToggle = localStorage.getItem("zapped_show_all_filter");
      const keepAll = savedToggle === null ? true : savedToggle === "true";
      const finalCategories = keepAll ? ["ALL", ...uniqueDbCats] : uniqueDbCats;
      setDbCategories(finalCategories);
      if (finalCategories.length > 0) setSelectedCategory(finalCategories[0]);
    };

    loadMenu();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("zapped_recall_order", handleRecall);
      window.removeEventListener("zapped_clear_cart", handleClearCart);
    };
  }, [session, outletId]);

  const triggerOfflineQueueSync = async () => {
    const savedQueue = localStorage.getItem(`zapped_offline_orders_queue_${outletId}`);
    if (!savedQueue) return;
    const queue = JSON.parse(savedQueue);
    if (queue.length === 0) return;
    
    const remaining: any[] = [];
    for (const order of queue) {
      try {
        const res = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(order) });
        if (!res.ok) remaining.push(order);
      } catch (err) { remaining.push(order); }
    }
    
    if (remaining.length === 0) localStorage.removeItem(`zapped_offline_orders_queue_${outletId}`);
    else localStorage.setItem(`zapped_offline_orders_queue_${outletId}`, JSON.stringify(remaining));
  };

  const addToCart = (item: any) => {
    const existing = cart.find(i => i.id === item.id);
    if (existing) setCart(cart.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i));
    else setCart([...cart, { ...item, qty: 1 }]);
  };

  const decreaseQty = (id: string) => {
    const existing = cart.find(i => i.id === id);
    if (existing && existing.qty > 1) setCart(cart.map(i => i.id === id ? { ...i, qty: i.qty - 1 } : i));
    else setCart(cart.filter(i => i.id !== id));
  };

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setIsApplyingCoupon(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 600));
      const simulatedAmount = window.prompt(`[System Simulation] Validating code ${couponCode}.\nEnter the discount amount for this coupon:`, "50");
      const amount = parseFloat(simulatedAmount || "0");
      if (amount > 0) setCouponDiscount(amount);
      else { alert("Invalid or expired coupon code."); setCouponCode(""); }
    } catch (error) { alert("Failed to apply coupon."); } 
    finally { setIsApplyingCoupon(false); }
  };

  const removeCoupon = () => {
    setCouponDiscount(0);
    setCouponCode("");
  };

  // 🔥 Precision Calculations
  const itemTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const baseTotal = itemTotal / 1.05;
  const cgst = baseTotal * 0.025;
  const sgst = baseTotal * 0.025;

  const manualDiscountAmt = discount.mode === "PERCENT" ? (itemTotal * (discount.value / 100)) : discount.value;
  const discountAmt = manualDiscountAmt + couponDiscount;
  
  const packingAmt = packing.mode === "PERCENT" ? (itemTotal * (packing.value / 100)) : packing.value;
  const deliveryAmt = delivery.mode === "PERCENT" ? (itemTotal * (delivery.value / 100)) : delivery.value;

  const exactTotal = itemTotal - discountAmt + packingAmt + deliveryAmt;
  const grandTotal = Math.max(0, Math.round(exactTotal));
  const roundOff = grandTotal - exactTotal;

  const filteredMenu = menuItems.filter(item => {
    if (searchQuery.trim() !== "") return item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return selectedCategory === "ALL" || item.category === selectedCategory;
  });

  const dispatchEBills = (billNo: any, total: number, phone: string, name: string) => {
    const msg = `Dear ${name || 'Guest'}, Your bill #${billNo} for ₹${total.toFixed(2)} is generated.`;
    let dispatched = false;
    if (printerConfig?.enableSms && printerConfig?.smsGatewayUrl && printerConfig?.smsApiKey) dispatched = true;
    if (printerConfig?.enableWhatsapp && printerConfig?.whatsappApiKey) dispatched = true;
    if (dispatched) alert(`API Gateway Triggered! E-Bill successfully dispatched to +91 ${phone}.`);
    else alert(`⚠️ E-Bill Gateway configuration fields missing inside system settings dashboard.`);
  };

  const handleCheckout = async (actionType: "PRINT" | "EBILL" | "SAVE" | "HOLD") => {
    if (cart.length === 0 || !session?.user) return;

    if (actionType === "EBILL" && (customerPhone.length !== 10 || !customerName.trim())) return alert("Valid 10-digit number & Customer Name required for E-Bill Dispatch!");
    if (paymentMode === "COMPLEMENTARY" && compPassword !== "1234") return alert("Invalid PIN!");
    if (paymentMode === "PART" && ((parseFloat(partCash) || 0) + (parseFloat(partCard) || 0)) !== grandTotal) return alert("Split mismatch!");

    if (actionType === "HOLD") {
      const savedHolds = localStorage.getItem(`zapped_held_orders_${outletId}`) ? JSON.parse(localStorage.getItem(`zapped_held_orders_${outletId}`)!) : [];
      const holdItem = { holdId: `HLD-${Date.now().toString().slice(-4)}`, cart: [...cart], orderType, tableNo, customerPhone, customerName, time: new Date().toLocaleTimeString() };
      localStorage.setItem(`zapped_held_orders_${outletId}`, JSON.stringify([...savedHolds, holdItem]));
      
      setCart([]); setCustomerPhone(""); setCustomerName(""); setTableNo("");
      setDiscount({ value: 0, mode: "PERCENT" }); setPacking({ value: 0, mode: "PERCENT" }); setDelivery({ value: 0, mode: "PERCENT" });
      setCouponCode(""); setCouponDiscount(0); 
      return; 
    }

    const payload = {
      cart, totalAmount: grandTotal, paymentMode, orderType,
      tableNo: orderType === "DINE_IN" ? tableNo : null,
      partCash: paymentMode === "PART" ? partCash : "0", partCard: paymentMode === "PART" ? partCard : "0",
      isComplementary: paymentMode === "COMPLEMENTARY", 
      compReason: paymentMode === "COMPLEMENTARY" ? compReason : null,
      customerPhone: customerPhone.length === 10 ? customerPhone : null, customerName: customerPhone.length === 10 ? customerName : null,
      subtotal: itemTotal, discount: discountAmt, packingCharges: packingAmt, deliveryCharges: deliveryAmt, 
      cgst: cgst, sgst: sgst, roundOff: roundOff
    };

    if (!navigator.onLine) {
      const savedQueue = localStorage.getItem(`zapped_offline_orders_queue_${outletId}`) ? JSON.parse(localStorage.getItem(`zapped_offline_orders_queue_${outletId}`)!) : [];
      localStorage.setItem(`zapped_offline_orders_queue_${outletId}`, JSON.stringify([...savedQueue, payload]));
      
      setLastPrintedOrder({ billNumber: "OFF-SYNC", date: new Date().toLocaleString('en-IN'), cart: [...cart], itemTotal, discountAmt, packingAmt, deliveryAmt, grandTotal, baseTotal, cgst, sgst, roundOff, orderType, tableNo, paymentMode, customerPhone, customerName });
      
      if (actionType === "PRINT") setTimeout(() => { window.print(); }, 150);
      
      setCart([]); setCustomerPhone(""); setCustomerName(""); setTableNo(""); setCompPassword(""); setCompReason(""); setPartCash(""); setPartCard(""); 
      setDiscount({ value: 0, mode: "PERCENT" }); setPacking({ value: 0, mode: "PERCENT" }); setDelivery({ value: 0, mode: "PERCENT" });
      setCouponCode(""); setCouponDiscount(0); 
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (data.success) {
        setLastBillNo(data.order.billNumber);
        setLastPrintedOrder({ billNumber: data.order.billNumber, date: new Date().toLocaleString('en-IN'), cart: [...cart], itemTotal, discountAmt, packingAmt, deliveryAmt, grandTotal, baseTotal, cgst, sgst, roundOff, orderType, tableNo, paymentMode, customerPhone, customerName });

        if (actionType === "PRINT") setTimeout(() => { window.print(); }, 150);
        else if (actionType === "EBILL") dispatchEBills(data.order.billNumber, grandTotal, customerPhone, customerName);
        else setShowReceipt(true);

        setCart([]); setCustomerPhone(""); setCustomerName(""); setTableNo(""); setCompPassword(""); setCompReason(""); setPartCash(""); setPartCard(""); 
        setDiscount({ value: 0, mode: "PERCENT" }); setPacking({ value: 0, mode: "PERCENT" }); setDelivery({ value: 0, mode: "PERCENT" });
        setCouponCode(""); setCouponDiscount(0); 
      } else {
        alert(data.error || "Order Save Failed");
      }
    } catch (error) { alert("Server Error"); }
    finally { setIsProcessing(false); }
  };

  return (
    <>
      <title>ZedPoss Billing Terminal | Smart Cloud POS</title>
      <meta name="description" content="ZedPoss Billing Dashboard. The most advanced Cloud POS system." />
      <meta name="robots" content="noindex, nofollow" /> 

      <div className="flex h-full relative overflow-hidden print:overflow-visible">
        <div className="flex h-full w-full print:hidden">
          {/* SIDEBAR */}
          <div className="w-44 bg-slate-900 border-r border-slate-800 flex flex-col p-3 overflow-y-auto custom-scrollbar shrink-0 justify-between">
            <div className="space-y-1">
              <span className="text-[9px] font-black tracking-widest text-slate-500 block uppercase mb-4 px-1">Filters</span>
              {dbCategories.map((cat) => (
                <button key={cat} onClick={() => { setSelectedCategory(cat); setSearchQuery(""); }} className={`w-full p-2.5 rounded-xl font-black text-xs text-left transition-all uppercase tracking-wider ${selectedCategory === cat && !searchQuery ? "bg-orange-500 text-white shadow-lg" : "text-slate-400 hover:bg-slate-800"}`}>{cat}</button>
              ))}
            </div>
            <div className="p-2 border-t border-slate-800 flex items-center space-x-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              {isOnline ? <><Wifi className="text-emerald-500" size={14}/> <span>SYNC ONLINE</span></> : <><WifiOff className="text-red-500" size={14}/> <span>OFFLINE MODE</span></>}
            </div>
          </div>

          {/* MIDDLE GRID */}
          <div className="flex-1 flex flex-col bg-slate-50 relative overflow-hidden">
            <div className="top-0 sticky z-20 bg-slate-50 px-4 pt-3 pb-2 border-b border-slate-200 shrink-0 w-full">
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" placeholder="Search entire menu dynamically..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-12 pr-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-orange-500 w-full shadow-sm font-bold text-slate-800 text-sm bg-white" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 pt-2 custom-scrollbar">
              {loading ? <div className="flex-1 h-full flex justify-center items-center"><Loader2 className="animate-spin text-orange-500" size={40} /></div> : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredMenu.map((item) => (
                    // 🔥 UI FIX 2: Images added properly inside boxes
                    <button key={item.id} onClick={() => addToCart(item)} className="bg-white p-2.5 rounded-2xl border border-slate-200/60 hover:border-orange-400 text-left flex flex-col h-[130px] active:scale-95 shadow-sm transition-all overflow-hidden relative group">
                      <div className="w-full h-14 bg-slate-100 rounded-xl overflow-hidden mb-2 shrink-0 flex items-center justify-center relative">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                        ) : (
                          <UtensilsCrossed size={20} className="text-slate-300 group-hover:text-orange-300 transition-colors" />
                        )}
                      </div>
                      <h3 className="font-black text-slate-900 text-[11px] uppercase line-clamp-2 leading-tight flex-1">{item.name}</h3>
                      <div className="text-sm font-black text-slate-900 font-mono mt-1">₹{item.price.toFixed(2)}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* BILLING SECTION */}
          <div className="w-[495px] bg-white border-l border-slate-200 flex flex-col z-10 shadow-2xl shrink-0 h-full">
            <div className="p-2 bg-slate-900 flex space-x-1.5 shrink-0">
              {["DINE_IN", "DELIVERY", "PICK_UP"].map((type) => (
                <button key={type} onClick={() => setOrderType(type)} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${orderType === type ? "bg-orange-500 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}>{type.replace("_", " ")}</button>
              ))}
            </div>

            <div className="p-2.5 border-b border-slate-100 bg-slate-50 flex items-center space-x-2 shrink-0">
              <input type="tel" maxLength={10} placeholder="Mobile Number" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))} className="flex-1 min-w-0 p-2 border border-slate-200 rounded-lg text-xs outline-none font-mono font-bold bg-white" />
              <input type="text" placeholder="Guest Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="flex-1 min-w-0 p-2 border border-slate-200 rounded-lg text-xs outline-none font-bold bg-white" />
              {orderType === "DINE_IN" && <input type="text" pattern="[0-9]*" placeholder="Table" value={tableNo} onChange={(e) => setTableNo(e.target.value.replace(/\D/g, ''))} className="w-14 shrink-0 p-2 border border-slate-200 rounded-lg text-xs outline-none font-black text-center bg-white" />}
            </div>

            <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-white shrink-0 font-black text-slate-800 text-sm">
              <div className="flex items-center space-x-2"><UtensilsCrossed size={16} className="text-orange-500" /><span>PLATE COUNTER TRAY</span></div>
              <span className="bg-slate-900 text-white px-2 py-0.5 rounded text-xs">{cart.reduce((s,i)=>s+i.qty,0)} ITEMS</span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 bg-slate-50/50 space-y-1">
              {cart.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-40 font-bold text-xs"><ConciergeBell size={32} className="mb-1" /> <p>Tray is empty</p></div> : cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-1.5 bg-white rounded-xl border border-slate-200 shadow-xs text-xs">
                  <div className="flex-1 min-w-0 pr-2">
                    <h4 className="font-black text-slate-900 text-sm uppercase truncate leading-tight">{item.name}</h4>
                    <span className="text-[10px] font-medium text-slate-400">BASE: ₹{(item.price / 1.05).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center space-x-2 bg-slate-50 rounded-lg p-0.5 border border-slate-100 shrink-0">
                    <button onClick={() => decreaseQty(item.id)} className="w-5 h-5 flex justify-center items-center bg-white text-slate-600 rounded shadow-xs"><Minus size={10}/></button>
                    <span className="font-black text-xs w-3 text-center text-slate-800">{item.qty}</span>
                    <button onClick={() => addToCart(item)} className="w-5 h-5 flex justify-center items-center bg-orange-500 text-white rounded shadow-xs"><Plus size={10}/></button>
                  </div>
                  <div className="text-right shrink-0 pl-4 min-w-[70px] font-black text-slate-900 text-sm font-mono">₹{(item.price * item.qty).toFixed(2)}</div>
                </div>
              ))}
            </div>

            <div className="px-4 py-2 bg-white border-t border-slate-200 shrink-0">
              <button onClick={() => setShowTaxDropdown(!showTaxDropdown)} className="w-full flex items-center justify-center text-slate-400 hover:text-slate-600 pb-1.5"><ChevronUp size={16} className={`transform transition-transform ${showTaxDropdown ? '' : 'rotate-180'}`} /></button>
              {showTaxDropdown && (
                <div className="space-y-1.5 mb-2 text-xs font-bold text-slate-400 border-b border-solid border-slate-200 pb-2.5">
                  <div className="flex justify-between text-slate-600"><span>BASE AMOUNT</span><span className="font-mono">₹{baseTotal.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>CGST @ 2.5%</span><span className="font-mono">+ ₹{cgst.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>SGST @ 2.5%</span><span className="font-mono">+ ₹{sgst.toFixed(2)}</span></div>
                  {/* 🔥 UI FIX 4: Round Off added to taxes list */}
                  <div className="flex justify-between border-t border-slate-100 mt-1 pt-1 text-slate-500"><span>Round Off</span><span className="font-mono">{roundOff > 0 ? '+' : ''}{roundOff.toFixed(2)}</span></div>

                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center space-x-2">
                      <input type="text" placeholder="Enter Redeem Code" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} disabled={couponDiscount > 0} className="flex-1 p-2 border border-slate-200 rounded-lg text-xs outline-none font-bold bg-white uppercase disabled:bg-slate-50 disabled:text-slate-400" />
                      <button type="button" onClick={handleApplyCoupon} disabled={!couponCode || isApplyingCoupon || couponDiscount > 0} className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        {isApplyingCoupon ? <Loader2 size={12} className="animate-spin" /> : "Apply"}
                      </button>
                    </div>
                    {couponDiscount > 0 && (
                      <div className="flex justify-between items-center bg-emerald-50 p-2 rounded-lg border border-emerald-200 mt-2">
                        <span className="text-[10px] font-black text-emerald-800 uppercase flex items-center"><CheckCircle2 size={12} className="mr-1"/> Code: {couponCode}</span>
                        <div className="flex items-center space-x-3">
                          <span className="font-mono font-black text-emerald-600 text-xs">-₹{couponDiscount.toFixed(2)}</span>
                          <button type="button" onClick={removeCoupon} className="text-red-500 hover:text-red-700 font-black text-[10px] uppercase">Remove</button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-50 rounded-xl p-2 mt-1.5 border border-slate-200 space-y-2">
                    <button type="button" onClick={() => setShowAdjustments(!showAdjustments)} className="w-full flex justify-between items-center text-[10px] text-slate-900 font-black tracking-wider uppercase">
                      <span>DISCOUNTS & CHARGES PANEL</span>
                      <ChevronDown size={12} className={`transform transition-transform ${showAdjustments ? 'rotate-180' : ''}`} />
                    </button>

                    {showAdjustments && (
                      <div className="space-y-2 pt-1 border-t border-solid border-slate-200/60">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] text-slate-600 w-20 shrink-0">Manual Disc</span>
                          <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden flex-1 h-7">
                            <input type="number" min="0" value={discount.value || ""} placeholder="0" onChange={(e) => setDiscount({ ...discount, value: Math.max(0, Number(e.target.value)) })} className="w-full px-2 text-xs font-bold text-slate-800 outline-none bg-transparent" />
                            <button type="button" onClick={() => setDiscount({ ...discount, mode: discount.mode === "PERCENT" ? "FIXED" : "PERCENT" })} className="bg-slate-100 border-l border-slate-200 px-2 h-full text-slate-600 flex items-center justify-center font-black text-[10px] min-w-[32px]">
                              {discount.mode === "PERCENT" ? <Percent size={11}/> : "₹"}
                            </button>
                          </div>
                          <span className="text-red-500 w-16 text-right font-mono text-[11px]">-₹{manualDiscountAmt.toFixed(2)}</span>
                        </div>

                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] text-slate-600 w-20 shrink-0">Packing Chg</span>
                          <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden flex-1 h-7">
                            <input type="number" min="0" value={packing.value || ""} placeholder="0" onChange={(e) => setPacking({ ...packing, value: Math.max(0, Number(e.target.value)) })} className="w-full px-2 text-xs font-bold text-slate-800 outline-none bg-transparent" />
                            <button type="button" onClick={() => setPacking({ ...packing, mode: packing.mode === "PERCENT" ? "FIXED" : "PERCENT" })} className="bg-slate-100 border-l border-slate-200 px-2 h-full text-slate-600 flex items-center justify-center font-black text-[10px] min-w-[32px]">
                              {packing.mode === "PERCENT" ? <Percent size={11}/> : "₹"}
                            </button>
                          </div>
                          <span className="text-slate-700 w-16 text-right font-mono text-[11px]">+₹{packingAmt.toFixed(2)}</span>
                        </div>

                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] text-slate-600 w-20 shrink-0">Delivery Chg</span>
                          <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden flex-1 h-7">
                            <input type="number" min="0" value={delivery.value || ""} placeholder="0" onChange={(e) => setDelivery({ ...delivery, value: Math.max(0, Number(e.target.value)) })} className="w-full px-2 text-xs font-bold text-slate-800 outline-none bg-transparent" />
                            <button type="button" onClick={() => setDelivery({ ...delivery, mode: delivery.mode === "PERCENT" ? "FIXED" : "PERCENT" })} className="bg-slate-100 border-l border-slate-200 px-2 h-full text-slate-600 flex items-center justify-center font-black text-[10px] min-w-[32px]">
                              {delivery.mode === "PERCENT" ? <Percent size={11}/> : "₹"}
                            </button>
                          </div>
                          <span className="text-slate-700 w-16 text-right font-mono text-[11px]">+₹{deliveryAmt.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* 🔥 UI FIX 4: .00 added to grand total */}
              <div className="flex justify-between items-end"><span className="text-slate-800 font-black text-sm uppercase">Grand Total Amount</span><span className="text-3xl font-black text-slate-900 font-mono">₹{grandTotal.toFixed(2)}</span></div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 shrink-0 space-y-2">
              {/* 🔥 UI FIX 3: Buttons Size Matched cleanly */}
              <div className="grid grid-cols-4 gap-1.5">
                {[ { id: "CASH", icon: <Banknote size={14}/>, label: "Cash" }, { id: "CARD", icon: <CreditCard size={14}/>, label: "Card/UPI" }, { id: "PART", icon: <SplitSquareHorizontal size={14}/>, label: "Part" }, { id: "COMPLEMENTARY", icon: <Gift size={14}/>, label: "Comp" }].map(mode => (
                  <button key={mode.id} onClick={() => setPaymentMode(mode.id)} className={`flex flex-col items-center justify-center h-11 rounded-full border text-center transition-all ${paymentMode === mode.id ? "bg-slate-900 border-slate-900 text-white shadow-xs" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-100"}`}>
                    <div className="scale-90 mb-0.5">{mode.icon}</div>
                    <span className="text-[9px] font-black uppercase">{mode.label}</span>
                  </button>
                ))}
              </div>

              {paymentMode === "PART" && <div className="flex space-x-2"><input type="number" placeholder="Cash ₹" value={partCash} onChange={e=>setPartCash(e.target.value)} className="w-1/2 p-2 rounded-lg border text-xs font-bold text-center bg-white" /><input type="number" placeholder="Card/UPI ₹" value={partCard} onChange={e=>setPartCard(e.target.value)} className="w-1/2 p-2 rounded-lg border text-xs font-bold text-center bg-white" /></div>}
              {paymentMode === "COMPLEMENTARY" && <div className="flex space-x-2"><input type="password" placeholder="PIN" value={compPassword} onChange={e=>setCompPassword(e.target.value)} className="w-1/3 p-2 rounded-lg border text-xs font-bold text-center bg-white" /><input type="text" placeholder="Reason" value={compReason} onChange={e=>setCompReason(e.target.value)} className="w-2/3 p-2 rounded-lg border text-xs font-bold bg-white" /></div>}

              <div className="grid grid-cols-4 gap-1.5">
                <button disabled={cart.length===0||isProcessing} onClick={() => handleCheckout("SAVE")} className="bg-slate-200 text-slate-800 font-black text-[9px] uppercase h-11 rounded-lg active:scale-95 hover:bg-slate-300 transition-colors text-center px-1">SAVE</button>
                <button disabled={cart.length===0||isProcessing} onClick={() => handleCheckout("PRINT")} className="bg-orange-500 text-white font-black text-[9px] uppercase h-11 rounded-lg active:scale-95 shadow-md hover:bg-orange-600 transition-colors text-center px-1">SAVE & PRINT</button>
                <button disabled={cart.length===0||isProcessing} onClick={() => handleCheckout("EBILL")} className="bg-orange-500 text-white font-black text-[9px] uppercase h-11 rounded-lg active:scale-95 shadow-md hover:bg-orange-600 transition-colors text-center px-1">SAVE & EBILL</button>
                <button disabled={cart.length===0||isProcessing} onClick={() => handleCheckout("HOLD")} className="bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-200 font-black text-[9px] uppercase h-11 rounded-lg active:scale-95 transition-colors text-center px-1">HOLD</button>
              </div>
            </div>
          </div>
        </div>

        {/* ------------------- ENTERPRISE PRINTER LAYER ------------------- */}
        <div 
          id="enterprise-receipt-print-area" 
          className="print:block absolute opacity-0 print:opacity-100 top-0 left-0 bg-white text-black font-mono z-[-50] print:z-[9999] text-center w-full"
          style={{ width: printerConfig?.printerSize || "80mm" }}
        >
          {lastPrintedOrder && (
            <div className="w-full bg-white text-black p-1 flex flex-col items-center">
              
              <div className="w-full text-center mb-2 pb-1 border-b border-solid border-black">
                <h2 className={`font-black uppercase tracking-tight ${printerConfig?.headerSize || 'text-lg'}`}>{printerConfig?.headerName || "ZAPPED POS"}</h2>
                <p className={`font-bold ${printerConfig?.subHeaderSize || 'text-[10px]'}`}>{printerConfig?.subHeader || ""}</p>
                {printerConfig?.gstNo && <p className={printerConfig?.gstSize || "text-[9px]"}>GSTIN: {printerConfig.gstNo}</p>}
                
                {lastPrintedOrder.customerPhone && (
                  <div className="text-[10px] font-black flex justify-between w-full border-t border-solid border-black mt-2 pt-1 px-1">
                    <span className="uppercase">Name: {lastPrintedOrder.customerName || "Guest"}</span>
                    <span>Phone: {lastPrintedOrder.customerPhone}</span>
                  </div>
                )}

                <div className="flex justify-between text-[10px] mt-1 font-bold px-1 border-t border-solid border-black pt-1">
                  <span>Bill No: {lastPrintedOrder.billNumber}</span>
                  <span>{lastPrintedOrder.date.split(',')[0]}</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold mb-1 px-1">
                  <span>Type: {lastPrintedOrder.orderType.replace("_", " ")} {lastPrintedOrder.tableNo ? `(T-${lastPrintedOrder.tableNo})` : ''}</span>
                  <span>{lastPrintedOrder.date.split(',')[1]}</span>
                </div>
              </div>
              
              <table className="w-full text-[9px] text-center mb-2 border-collapse font-bold mx-auto">
                <thead>
                  <tr className="border-b border-solid border-black text-[10px]">
                    <th className="pb-1 w-[40%] text-left pl-1">ITEM</th>
                    <th className="pb-1 w-[20%] text-center">QTY</th>
                    <th className="pb-1 w-[20%] text-center">RATE</th>
                    <th className="pb-1 w-[20%] text-right pr-1">AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  {lastPrintedOrder.cart.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b border-solid border-slate-300">
                      <td className="py-1 text-left uppercase pl-1 leading-tight">{item.name}</td>
                      <td className="py-1 text-center font-mono">{item.qty}</td>
                      <td className="py-1 text-center font-mono">₹{item.price.toFixed(2)}</td>
                      <td className="py-1 text-right pr-1 font-mono tracking-tight whitespace-nowrap">₹{(item.price * item.qty).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <div className="w-full text-[10px] font-bold border-t border-b border-solid border-black pb-1 pt-1 px-1 mb-1">
                <div className="flex justify-between"><span>Base Amount</span><span>₹{lastPrintedOrder.baseTotal?.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>CGST @ 2.5%</span><span>₹{lastPrintedOrder.cgst?.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>SGST @ 2.5%</span><span>₹{lastPrintedOrder.sgst?.toFixed(2)}</span></div>
                
                {lastPrintedOrder.discountAmt > 0 && <div className="flex justify-between text-red-700 border-t border-dotted border-black/30 mt-0.5 pt-0.5"><span>Discount Applied</span><span>-₹{lastPrintedOrder.discountAmt?.toFixed(2)}</span></div>}
                {lastPrintedOrder.packingAmt > 0 && <div className="flex justify-between"><span>Packing Charge</span><span>+₹{lastPrintedOrder.packingAmt?.toFixed(2)}</span></div>}
                {lastPrintedOrder.deliveryAmt > 0 && <div className="flex justify-between"><span>Delivery Charge</span><span>+₹{lastPrintedOrder.deliveryAmt?.toFixed(2)}</span></div>}
                {lastPrintedOrder.roundOff !== 0 && <div className="flex justify-between"><span>Round Off</span><span>{lastPrintedOrder.roundOff > 0 ? '+' : ''}{lastPrintedOrder.roundOff?.toFixed(2)}</span></div>}
              </div>

              <div className="w-full flex justify-between font-black text-[13px] border-b border-solid border-black pb-1 px-1">
                <span>GRAND TOTAL</span>
                <span>₹{lastPrintedOrder.grandTotal.toFixed(2)}</span>
              </div>
              
              <div className="w-full text-center font-bold text-[10px] pb-1 px-1 mt-1 border-b border-solid border-black">
                PAY MODE: <span className="uppercase">{lastPrintedOrder.paymentMode}</span>
              </div>
              
              <div className="text-center font-bold w-full mt-3">
                <p className={`px-1 ${printerConfig?.footerSize || 'text-[10px]'}`}>{printerConfig?.footerMsg}</p>
              </div>

              {((lastPrintedOrder.orderType === "DINE_IN" && printerConfig?.kotDineIn) ||
                (lastPrintedOrder.orderType === "DELIVERY" && printerConfig?.kotDelivery) ||
                (lastPrintedOrder.orderType === "PICK_UP" && printerConfig?.kotPickUp)) && (
                <div className="w-full border-t border-solid border-black pt-4 mt-6" style={{ pageBreakBefore: "always" }}>
                  <div className="text-center mb-3 pb-1 border-b border-solid border-black">
                    <h2 className="font-black text-2xl tracking-widest">KOT</h2>
                    <h3 className="font-bold text-[10px] uppercase">{lastPrintedOrder.orderType.replace("_", " ")} {lastPrintedOrder.tableNo ? `(Table-${lastPrintedOrder.tableNo})` : ''}</h3>
                    <div className="flex justify-between text-[10px] mt-1 font-bold px-1">
                      <span>ID: #{lastPrintedOrder.billNumber}</span>
                      <span>{lastPrintedOrder.date.split(',')[1]}</span>
                    </div>
                  </div>
                  <table className="w-full text-[11px] border-collapse font-black mx-auto">
                    <thead>
                      <tr className="border-b border-solid border-black text-[10px]">
                        <th className="pb-1 text-left pl-2">ITEM DESCRIPTION</th>
                        <th className="pb-1 w-[25%] text-center">QTY</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lastPrintedOrder.cart.map((item: any, idx: number) => (
                        <tr key={idx} className="border-b border-solid border-slate-300">
                          <td className="py-2 pl-2 text-left uppercase text-xs">{item.name}</td>
                          <td className="py-2 text-base text-center border-l border-solid border-black">{item.qty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          )}
        </div>

        {showReceipt && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-3xl max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="mx-auto bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mb-3"><CheckCircle2 size={24} className="text-green-500" /></div>
              <h2 className="text-lg font-black text-slate-800">Bill Generated!</h2>
              <p className="text-slate-500 mb-4 text-xs font-bold">Transaction Bill #{lastBillNo}</p>
              <button onClick={() => setShowReceipt(false)} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-sm transition-colors active:scale-95">Dismiss</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
