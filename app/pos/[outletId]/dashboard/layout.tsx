"use client";
import { useState, useEffect } from "react";
import { 
  LayoutDashboard, ReceiptIndianRupee, PackageOpen, Settings, LogOut, 
  ChefHat, BarChart3, Users, UtensilsCrossed, WalletCards, Menu, X, 
  ArrowRight, PauseCircle, PackageSearch, Factory, Zap, Plus, Search, 
  Phone, Minus, Square, AlertTriangle, Globe, Wifi, WifiOff, CloudSync, Store,
  Bell, History, ShoppingBag, Radio, ToggleLeft, LifeBuoy, FileText
} from "lucide-react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const outletId = params.outletId as string;
  
  // --- 🔥 CORE NATIVE DB SESSION AUTHENTICATION ---
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push("/login"); // Strict redirect loop for security
    },
  });

  // --- UI & Navigation States ---
  const [showNavOverlay, setShowNavOverlay] = useState(false);
  const [heldOrders, setHeldOrders] = useState<any[]>([]);
  const [showHoldList, setShowHoldList] = useState(false);
  const [searchBillNo, setSearchBillNo] = useState("");
  const [generalSettings, setGeneralSettings] = useState<any>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  // --- 🔥 OFFLINE & SYNC ENGINE STATES ---
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // --- Support Ticket Mock State (Ready for Database Link) ---
  const [ticketData, setTicketData] = useState({ title: "", description: "", priority: "LOW" });

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;

    // ==========================================
    // 🔒 STRICT URL ISOLATION SECURITY CHECK
    // ==========================================
    const sessionOutletId = (session.user as any).outletId;
    if (sessionOutletId && sessionOutletId !== outletId) {
      console.warn("Security Alert: Unauthorized Outlet URL access blocked.");
      router.replace(`/pos/${sessionOutletId}/dashboard`);
      return;
    }

    const tenantId = (session.user as any).tenantId;

    setIsOnline(navigator.onLine);
    const handleOnline = () => {
      setIsOnline(true);
      triggerBackgroundSync(tenantId, outletId);
    };
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    triggerBackgroundSync(tenantId, outletId);

    const savedGeneral = localStorage.getItem(`zapped_general_config_${outletId}`);
    if (savedGeneral) setGeneralSettings(JSON.parse(savedGeneral));

    // Polling for Hold Orders
    const checkHolds = () => {
      const saved = localStorage.getItem(`zapped_held_orders_${outletId}`);
      if (saved) setHeldOrders(JSON.parse(saved));
      else setHeldOrders([]);
    };
    
    checkHolds();
    const interval = setInterval(checkHolds, 1000); 
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pathname, outletId, status, session, router]);

  const triggerBackgroundSync = async (tenantId: string, currentOutletId: string) => {
    if (!navigator.onLine) return;
    setIsSyncing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 150)); // Made it extremely fast (reduced from 800ms)
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const recallOrder = (order: any) => {
    const savedHolds = JSON.parse(localStorage.getItem(`zapped_held_orders_${outletId}`) || "[]");
    const filtered = savedHolds.filter((h: any) => h.holdId !== order.holdId);
    localStorage.setItem(`zapped_held_orders_${outletId}`, JSON.stringify(filtered));
    setHeldOrders(filtered); 

    const event = new CustomEvent("zapped_recall_order", { detail: order });
    window.dispatchEvent(event);
    setShowHoldList(false);
  };

  const handleNewOrder = () => {
    window.dispatchEvent(new CustomEvent("zapped_clear_cart"));
    router.push(`/pos/${outletId}/dashboard`);
    router.refresh();
  };

  // Real-time instantaneous character match push
  const handleLiveSearch = (value: string) => {
    setSearchBillNo(value);
    if (value.trim() !== "") {
      router.push(`/pos/${outletId}/dashboard/orders?search=${value}`);
    }
  };

  const executeLogout = async () => {
    setShowLogoutConfirm(false);
    await signOut({ callbackUrl: "/login" });
  };

  if (status === "loading" || !session?.user) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
        <style>{`
          @keyframes fillUpLogo {
            0% { clip-path: inset(100% 0 0 0); }
            50% { clip-path: inset(0 0 0 0); }
            100% { clip-path: inset(100% 0 0 0); }
          }
          .animate-fill-logo { animation: fillUpLogo 2s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
        `}</style>
        
        <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
          <Store size={64} className="text-slate-800 absolute" />
          <Store size={64} className="text-orange-500 absolute animate-fill-logo drop-shadow-[0_0_15px_rgba(249,115,22,0.5)]" />
        </div>
        
        <h2 className="text-white font-black uppercase tracking-widest text-sm">Verifying Terminal...</h2>
        <p className="text-slate-500 text-[10px] font-bold mt-2 uppercase tracking-wide">Syncing Security & Offline Core</p>
      </div>
    );
  }

  const outletName = session.user.name ? session.user.name.toUpperCase() : "ZEDPOSS OUTLET";
  const currentUserOutlet = outletId;

  const modules = [
    { name: "Billing Dashboard", path: "", icon: <LayoutDashboard size={26} />, desc: "Create bills & checkout", color: "bg-orange-500" },
    { name: "Kitchen (KOT)", path: "/kitchen", icon: <ChefHat size={26} />, desc: "Live kitchen display cards", color: "bg-amber-500" },
    { name: "Petty Cash", path: "/expenses", icon: <WalletCards size={26} />, desc: "Daily kharcha registry", color: "bg-red-500" },
    { name: "Sales & Production", path: "/production", icon: <Factory size={26} />, desc: "Wastage & leak mapping", color: "bg-teal-500" },
    { name: "Orders History", path: "/orders", icon: <ReceiptIndianRupee size={26} />, desc: "Track past bills & receipts", color: "bg-emerald-500" },
    { name: "Reports & Z-Bill", path: "/reports", icon: <BarChart3 size={26} />, desc: "Day closing accounts", color: "bg-violet-500" },
    { name: "Item Sales Velocity", path: "/item-sales", icon: <PackageSearch size={26} />, desc: "Product sales breakdown", color: "bg-fuchsia-500" },
    { name: "Inventory Stock", path: "/inventory", icon: <PackageOpen size={26} />, desc: "Raw materials management", color: "bg-blue-500" },
    { name: "Menu Creator", path: "/menu-manage", icon: <UtensilsCrossed size={26} />, desc: "Add items & GST settings", color: "bg-pink-500" },
    { name: "Customer CRM", path: "/customers", icon: <Users size={26} />, desc: "Loyalty points & profiles", color: "bg-cyan-500" },
    { name: "Integration Hub", path: "/integrations", icon: <Globe size={26} />, desc: "Zomato/Swiggy API Connect", color: "bg-indigo-500" },
    { name: "Outlet Settings", path: "/settings", icon: <Settings size={26} />, desc: "Configuration panels", color: "bg-slate-600" },
  ];

  return (
    <>
      <title>ZedPoss | Complete POS & Billing Management by ZedooX</title>
      <meta name="description" content="ZedPoss by ZedooX is the ultimate Cloud POS, Billing, and Restaurant Management software. Seamlessly manage multi-outlet billing, inventory, and KDS operations." />
      <meta name="keywords" content="ZedPoss, ZedooX, ZedPoss by ZedooX, POS Software, Retail POS, Restaurant POS, Cloud Billing, ZedPoss App, Smart POS, GST Billing Software, Outlet Management, Kitchen Display System, KDS, Fast Checkout POS, Inventory Management, Cafe POS Software, QSR POS, Offline POS Billing, Cloud Sync POS, ZedooX Technologies, SaaS POS, Multi-outlet POS, Restaurant Billing App, Food Court POS, Bakery POS Software, Touch Screen Billing, Mobile POS, Cloud Based Point of Sale, Omni-channel POS, Food Delivery Integration, Zomato Swiggy POS, Digital Billing System, Inventory Tracking, Retail Management Software, Web POS Management" />
      <meta name="author" content="ZedooX Technologies" />
      <meta name="robots" content="index, follow" />

      <div className="flex flex-col h-screen bg-slate-50 overflow-hidden relative font-sans">
        
        {/* 👑 WINDOW CONTROL BADGE (NAME | OUTLET ID) */}
        <div className="h-7 bg-slate-950 flex items-center justify-between px-4 select-none z-50 shrink-0">
          <div className="text-[10px] font-black tracking-widest uppercase text-slate-400 flex items-center overflow-hidden whitespace-nowrap">
            <span className={`${isOnline ? 'text-emerald-500' : 'text-red-500'} mr-2 animate-pulse shrink-0`}>●</span> 
            <span className="truncate">{outletName}</span> 
            <span className="opacity-40 mx-2 shrink-0">|</span> 
            <span className="shrink-0 text-orange-500">OUTLET ID: {currentUserOutlet}</span>
          </div>
          <div className="flex items-center space-x-4 text-slate-600 shrink-0">
            
            <div className="flex items-center mr-4 border-r border-slate-800 pr-4">
              {isSyncing ? (
                <span className="flex items-center text-orange-500"><CloudSync size={12} className="animate-spin mr-1"/> SYNCING</span>
              ) : isOnline ? (
                <span className="flex items-center text-emerald-500"><Wifi size={12} className="mr-1"/> ONLINE</span>
              ) : (
                <span className="flex items-center text-red-500"><WifiOff size={12} className="mr-1"/> OFFLINE MODE</span>
              )}
            </div>

            <Minus size={14} className="hover:text-white cursor-pointer transition-colors" />
            <Square size={11} className="hover:text-white cursor-pointer transition-colors" />
            <X size={14} className="hover:text-red-500 cursor-pointer transition-colors" />
          </div>
        </div>

        {/* 👑 MAIN HEADER */}
        <header className="h-16 bg-slate-900 px-2 sm:px-4 flex items-center justify-between border-b border-slate-800 shadow-lg z-40 shrink-0">
          
          {/* LEFT HUB */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Open Hamburger Layout - No Background Border & Shifted Further Left */}
            <button onClick={() => setShowNavOverlay(true)} className="h-10 w-8 flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-95 shrink-0 pl-0 ml-0">
              <Menu size={24} />
            </button>
            
            {/* 🔥 FIXED LOGO SIZE HERE */}
            <div className="flex items-center text-orange-500 shrink-0 cursor-pointer" onClick={() => router.push(`/pos/${outletId}/dashboard`)}>
              <img src="/favicon.ico" alt="Favicon" className="w-6 h-6 sm:w-7 sm:h-7 mr-1.5 object-contain drop-shadow-md" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
              <span className="font-black text-lg sm:text-xl tracking-widest drop-shadow-md">ZedPoss</span>
            </div>
            
            <div className="h-6 w-px bg-slate-700 mx-1 hidden md:block shrink-0"></div>
            
            <button onClick={handleNewOrder} className="h-10 hidden xl:flex bg-orange-500/20 text-orange-400 border border-orange-500/50 px-3 rounded-xl items-center text-xs font-black uppercase hover:bg-orange-500 hover:text-white transition-all active:scale-95 shrink-0">
              <Plus size={15} className="mr-1.5" /> New Order
            </button>

            {/* Live Synchronous Bill Search without Enter Trigger */}
            <div className="relative hidden lg:flex items-center h-10 shrink-0">
              <Search size={16} className="absolute left-3 text-slate-400" />
              <input 
                value={searchBillNo} 
                onChange={(e) => handleLiveSearch(e.target.value)} 
                placeholder="Search Bill No..." 
                className="h-full bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-xl pl-9 pr-3 outline-none focus:border-orange-500 w-36 focus:w-48 transition-all" 
              />
            </div>
          </div>

          {/* COMBINED QUICK LINKS & ACTIONS (Boxless Open Layout uniformly connected in one line) */}
          <div className="flex items-center shrink-0">
            <div className="flex items-center space-x-4 md:space-x-6">
              
              {/* Module Navigations */}
              <div className="hidden md:flex items-center space-x-6">
                <button onClick={() => router.push(`/pos/${outletId}/dashboard/recent`)} className="flex flex-col items-center justify-center text-slate-400 hover:text-orange-400 transition-colors bg-transparent border-0 p-0 shrink-0">
                  <History size={19} />
                  <span className="text-[9px] font-bold uppercase mt-1 tracking-wider">Recent</span>
                </button>

                <button onClick={() => router.push(`/pos/${outletId}/dashboard/orders`)} className="flex flex-col items-center justify-center text-slate-400 hover:text-emerald-400 transition-colors bg-transparent border-0 p-0 shrink-0">
                  <ReceiptIndianRupee size={19} />
                  <span className="text-[9px] font-bold uppercase mt-1 tracking-wider">Orders</span>
                </button>

                <button onClick={() => router.push(`/pos/${outletId}/dashboard/live`)} className="flex flex-col items-center justify-center text-slate-400 hover:text-amber-400 transition-colors bg-transparent border-0 p-0 shrink-0">
                  <Radio size={19} className="animate-pulse" />
                  <span className="text-[9px] font-bold uppercase mt-1 tracking-wider">Live Orders</span>
                </button>

                <button onClick={() => router.push(`/pos/${outletId}/dashboard/store`)} className="flex flex-col items-center justify-center text-slate-400 hover:text-blue-400 transition-colors bg-transparent border-0 p-0 shrink-0">
                  <Store size={19} />
                  <span className="text-[9px] font-bold uppercase mt-1 tracking-wider">Store</span>
                </button>

                <button onClick={() => router.push(`/pos/${outletId}/dashboard/item-toggle`)} className="flex flex-col items-center justify-center text-slate-400 hover:text-pink-400 transition-colors bg-transparent border-0 p-0 shrink-0">
                  <ToggleLeft size={19} />
                  <span className="text-[9px] font-bold uppercase mt-1 tracking-wider">Item On/Off</span>
                </button>
              </div>

              {/* Converted Header Actions (Hold, Alerts, Logout) connected directly with exact spacing */}
              <div className="flex items-center space-x-4 md:space-x-6">
                {/* HOLD QUEUE ICON */}
                <div className="relative flex flex-col items-center justify-center shrink-0">
                  <button 
                    onClick={() => setShowHoldList(!showHoldList)}
                    className={`flex flex-col items-center justify-center transition-colors bg-transparent border-0 p-0 ${heldOrders.length > 0 ? 'text-amber-500' : 'text-slate-400 hover:text-amber-400'}`}
                  >
                    <div className="relative">
                      <PauseCircle size={19} />
                      {heldOrders.length > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-slate-900 shadow-lg shadow-red-500/50">
                          {heldOrders.length}
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] font-bold uppercase mt-1 tracking-wider">Hold</span>
                  </button>

                  {showHoldList && (
                    <div className="absolute right-0 top-full mt-3 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 text-left">
                      <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                        <span className="font-black text-slate-800 text-xs uppercase tracking-widest">Hold Orders Queue</span>
                        <button onClick={() => setShowHoldList(false)} className="p-1 hover:bg-slate-200 rounded-full transition-colors"><X size={16} className="text-slate-500" /></button>
                      </div>
                      <div className="max-h-96 overflow-y-auto custom-scrollbar">
                        {heldOrders.length === 0 ? (
                          <div className="p-8 text-center text-slate-400 text-xs font-bold">No held bills found</div>
                        ) : (
                          heldOrders.map((h, idx) => (
                            <div key={idx} onClick={() => recallOrder(h)} className="p-4 border-b hover:bg-orange-50 cursor-pointer transition-colors group">
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-black text-slate-900 text-sm">#{h.holdId}</span>
                                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-500">{h.time}</span>
                              </div>
                              <p className="text-[11px] text-slate-600 font-medium uppercase truncate leading-tight">{h.cart?.map((i:any)=>i.name).join(", ")}</p>
                              <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100">
                                <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded uppercase">{h.orderType?.replace("_", " ")}</span>
                                <span className="text-xs font-black text-slate-800 group-hover:text-orange-600 flex items-center">Recall Order <ArrowRight size={12} className="ml-1"/></span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* ALERTS ROUTER TRIGGER ICON */}
                <button 
                  onClick={() => router.push(`/pos/${outletId}/dashboard/alerts`)}
                  className="flex flex-col items-center justify-center text-slate-400 hover:text-blue-400 transition-colors bg-transparent border-0 p-0 shrink-0" 
                  title="Notifications & Alerts"
                >
                  <Bell size={19} />
                  <span className="text-[9px] font-bold uppercase mt-1 tracking-wider">Alerts</span>
                </button>

                {/* LOGOUT */}
                <button 
                  onClick={() => setShowLogoutConfirm(true)} 
                  className="flex flex-col items-center justify-center text-slate-400 hover:text-red-400 transition-colors bg-transparent border-0 p-0 shrink-0" 
                  title="Sign Out Profile"
                >
                  <LogOut size={19} />
                  <span className="text-[9px] font-bold uppercase mt-1 tracking-wider">Logout</span>
                </button>
              </div>

            </div>

            {/* 🔥 SUPPORT PANEL & TICKET ROUTING REGISTRY */}
            <div className="hidden md:flex flex-col text-right pl-4 border-l border-slate-800 ml-4 md:ml-6">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">24/7 Support</span>
              <span className="text-xs font-bold text-white tracking-wider flex items-center justify-end">
                <Phone size={10} className="mr-1 text-emerald-500"/> 9990-787-533
              </span>
              <button 
                onClick={() => setShowSupportModal(true)} 
                className="text-[10px] text-orange-400 font-black tracking-wide uppercase hover:text-orange-300 mt-0.5 transition-colors text-right flex items-center justify-end group bg-transparent border-0 p-0"
              >
                Support Request <ArrowRight size={10} className="ml-1 transform group-hover:translate-x-0.5 transition-all"/>
              </button>
            </div>
            
          </div>
        </header>

        <div className="flex-1 overflow-hidden relative">{children}</div>

        {showNavOverlay && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md z-50 p-6 flex flex-col justify-center items-center">
            <div className="w-full max-w-6xl animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-3xl font-black text-white tracking-tight uppercase">Operations Control Hub</h2>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1 text-orange-500">Live Workspace Token: {currentUserOutlet}</p>
                </div>
                <button onClick={() => setShowNavOverlay(false)} className="p-3 text-slate-400 hover:text-white bg-slate-800 rounded-full border border-slate-700 transition-colors"><X size={24} /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {modules.map((m) => (
                  <button key={m.name} onClick={() => { router.push(`/pos/${currentUserOutlet}/dashboard${m.path}`); setShowNavOverlay(false); }} className={`p-5 rounded-2xl border text-left flex items-start space-x-4 transition-all duration-200 active:scale-95 group ${pathname === `/pos/${currentUserOutlet}/dashboard${m.path}` ? 'bg-slate-800 border-orange-500 ring-2 ring-orange-500/20' : 'bg-slate-900/90 border-slate-800 hover:bg-slate-800 hover:border-slate-700'}`}>
                    <div className={`p-3 rounded-xl text-white ${m.color} shadow-lg shrink-0`}>{m.icon}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white text-sm lg:text-base group-hover:text-orange-400 transition-colors flex justify-between items-center leading-tight mb-1"><span>{m.name}</span><ArrowRight size={14} className="text-slate-600 group-hover:text-white transform group-hover:translate-x-1 transition-all"/></h3>
                      <p className="text-slate-400 text-[10px] lg:text-xs font-medium truncate">{m.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-12 text-center border-t border-slate-800/80 pt-6">
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">© {new Date().getFullYear()} Copyright ZedPoss By ZedooX. All rights reserved.</p>
              </div>
            </div>
          </div>
        )}

        {showLogoutConfirm && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="bg-red-500/10 p-6 flex flex-col items-center text-center border-b border-slate-800">
                <div className="w-14 h-14 bg-red-500/20 rounded-2xl flex items-center justify-center mb-4 border border-red-500/30">
                  <AlertTriangle size={28} className="text-red-500" />
                </div>
                <h3 className="text-lg font-black text-white uppercase tracking-wider">End Active Session?</h3>
                <p className="text-xs text-slate-400 font-bold mt-2 leading-relaxed">
                  You are safe-closing terminal workspace <span className="text-white">[{outletName}]</span>. Active order states will reset securely.
                </p>
              </div>
              <div className="p-4 bg-slate-950/60 flex gap-3">
                <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-black uppercase tracking-widest py-3.5 rounded-xl transition-colors active:scale-95">Cancel</button>
                <button onClick={executeLogout} className="flex-1 bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-widest py-3.5 rounded-xl transition-colors active:scale-95 shadow-lg shadow-red-600/20">Logout</button>
              </div>
            </div>
          </div>
        )}

        {/* 🎫 DYNAMIC SUPPORT REQUEST MODAL CONTAINER (Mapped seamlessly with SupportTicket Columns) */}
        {showSupportModal && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
              
              <div className="p-6 bg-slate-950/40 border-b border-slate-800 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-orange-500/10 text-orange-400 rounded-xl border border-orange-500/20">
                    <LifeBuoy size={22} className="animate-spin-slow" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white uppercase tracking-wider">Support Ticket Control</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider">Tenant: {(session?.user as any)?.tenantId || 'Core'} | Outlet: {outletId}</p>
                  </div>
                </div>
                <button onClick={() => setShowSupportModal(false)} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all"><X size={20} /></button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                
                {/* Simulated database structured input form fields */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center"><FileText size={14} className="mr-2 text-orange-500" /> Create Support Incident</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Ticket Context Title</label>
                      <input 
                        type="text" 
                        placeholder="e.g., KOT Printer lag error"
                        value={ticketData.title}
                        onChange={(e) => setTicketData({...ticketData, title: e.target.value})}
                        className="w-full h-11 bg-slate-950 border border-slate-800 text-white text-xs font-bold rounded-xl px-4 outline-none focus:border-orange-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Priority Flag</label>
                      <select 
                        value={ticketData.priority}
                        onChange={(e) => setTicketData({...ticketData, priority: e.target.value})}
                        className="w-full h-11 bg-slate-950 border border-slate-800 text-slate-400 text-xs font-bold rounded-xl px-3 outline-none focus:border-orange-500 transition-colors"
                      >
                        <option value="LOW">LOW PRIORITY</option>
                        <option value="MEDIUM">MEDIUM FLOW</option>
                        <option value="CRITICAL">CRITICAL CRASH</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Detailed Issue Description</label>
                    <textarea 
                      rows={3}
                      value={ticketData.description}
                      onChange={(e) => setTicketData({...ticketData, description: e.target.value})}
                      placeholder="Explain what broke so operations team can troubleshoot immediately..."
                      className="w-full bg-slate-950 border border-slate-800 text-white text-xs font-bold rounded-xl p-4 outline-none focus:border-orange-500 transition-colors resize-none"
                    />
                  </div>
                </div>

                {/* Status Logs List (Corresponds directly with Outlet Wise History Rows) */}
                <div className="pt-4 border-t border-slate-800">
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-3">Active Outlet Ticket Status Stream</h4>
                  <div className="bg-slate-950/50 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-900">
                    <div className="p-3 flex justify-between items-center text-[11px]">
                      <div>
                        <span className="font-bold text-white block">#TK-8890 - Zomato Fetch Sync Failure</span>
                        <span className="text-[9px] text-slate-500 font-semibold uppercase">Created 2 hours ago</span>
                      </div>
                      <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-black px-2 py-0.5 rounded uppercase">Under Investigation</span>
                    </div>
                    <div className="p-3 flex justify-between items-center text-[11px]">
                      <div>
                        <span className="font-bold text-white block">#TK-8712 - Aggregated Day closing mismatch</span>
                        <span className="text-[9px] text-slate-500 font-semibold uppercase">Resolved Yesterday</span>
                      </div>
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black px-2 py-0.5 rounded uppercase">Closed / Resolved</span>
                    </div>
                  </div>
                </div>

              </div>

              <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex gap-3">
                <button onClick={() => setShowSupportModal(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-black uppercase tracking-widest py-3.5 rounded-xl transition-colors active:scale-95">Discard</button>
                <button onClick={() => { console.log("Payload Saved:", ticketData); setShowSupportModal(false); }} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-widest py-3.5 rounded-xl transition-colors active:scale-95 shadow-lg shadow-orange-500/20">File Support Ticket</button>
              </div>

            </div>
          </div>
        )}

      </div>
    </>
  );
}
