"use client";
import { useState, useEffect } from "react";
import { 
  LayoutDashboard, ReceiptIndianRupee, PackageOpen, Settings, LogOut, 
  ChefHat, BarChart3, Users, UtensilsCrossed, WalletCards, Menu, X, 
  ArrowRight, PauseCircle, PackageSearch, Factory, Zap, Plus, Search, 
  Phone, Minus, Square, AlertTriangle, Globe, Wifi, WifiOff, CloudSync, Store
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

  // --- 🔥 OFFLINE & SYNC ENGINE STATES ---
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;

    // ==========================================
    // 🔒 STRICT URL ISOLATION SECURITY CHECK
    // ==========================================
    const sessionOutletId = (session.user as any).outletId;
    // Agar login kisi outlet ka hai, but URL kisi aur outlet ka open ho raha hai:
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
  }, [pathname, outletId, status, session, router]); // Added router to dependency

  const triggerBackgroundSync = async (tenantId: string, currentOutletId: string) => {
    if (!navigator.onLine) return;
    setIsSyncing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
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

  const handleBillSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchBillNo.trim() !== "") {
      router.push(`/pos/${outletId}/dashboard/orders?search=${searchBillNo}`);
      setSearchBillNo(""); 
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
      <title>ZedPoss | ZedPoss By ZedooX</title>
      <meta name="description" content="ZedPoss By ZedooX - The ultimate Cloud POS, Billing, and Restaurant Management software designed for modern outlets." />
      <meta name="keywords" content="ZedPoss, ZedooX, POS Software, Retail POS, Restaurant POS, Cloud Billing, ZedPoss App, Smart POS, FSSAI POS, GST Billing Software, Outlet Management, KDS, ZedooX Technologies, Fast Checkout, Inventory Management, Cafe POS, QSR POS, Offline POS, Cloud Sync POS" />
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
        <header className="h-16 bg-slate-900 px-4 sm:px-6 flex items-center justify-between border-b border-slate-800 shadow-lg z-40 shrink-0">
          
          {/* LEFT HUB */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            <button onClick={() => setShowNavOverlay(true)} className="h-10 w-10 flex items-center justify-center text-slate-400 hover:text-white bg-slate-800 rounded-xl border border-slate-700 transition-all active:scale-95 shrink-0">
              <Menu size={20} />
            </button>
            
            <div className="flex items-center text-orange-500 shrink-0 cursor-pointer" onClick={() => router.push(`/pos/${outletId}/dashboard`)}>
              <Zap size={22} className="mr-1.5 fill-orange-500" />
              <span className="font-black text-lg sm:text-xl tracking-wider">ZedPoss</span>
            </div>
            
            <div className="h-6 w-px bg-slate-700 mx-1 sm:mx-2 hidden md:block shrink-0"></div>
            
            <button onClick={handleNewOrder} className="h-10 hidden md:flex bg-orange-500/20 text-orange-400 border border-orange-500/50 px-4 rounded-xl items-center text-xs font-black uppercase hover:bg-orange-500 hover:text-white transition-all active:scale-95 shrink-0">
              <Plus size={16} className="mr-2" /> New Order
            </button>

            <form onSubmit={handleBillSearch} className="relative hidden lg:flex items-center h-10 shrink-0">
              <Search size={16} className="absolute left-3 text-slate-400" />
              <input 
                value={searchBillNo} 
                onChange={(e)=>setSearchBillNo(e.target.value)} 
                placeholder="Search Bill No..." 
                className="h-full bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-xl pl-9 pr-3 outline-none focus:border-orange-500 w-40 focus:w-56 transition-all" 
              />
            </form>
          </div>
          
          {/* RIGHT HUB */}
          <div className="flex items-center space-x-3 shrink-0">
            
            {/* HOLD QUEUE ICON */}
            <div className="relative">
              <button 
                onClick={() => setShowHoldList(!showHoldList)}
                className={`h-10 w-10 flex items-center justify-center rounded-xl transition-all ${heldOrders.length > 0 ? 'bg-amber-500/10 text-amber-500 border border-amber-500/50 hover:bg-amber-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white hover:bg-slate-700'}`}
              >
                <PauseCircle size={20} />
                {heldOrders.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-slate-900 shadow-lg shadow-red-500/50">
                    {heldOrders.length}
                  </span>
                )}
              </button>

              {showHoldList && (
                <div className="absolute right-0 mt-3 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
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

            <button onClick={() => setShowLogoutConfirm(true)} className="h-10 w-10 flex items-center justify-center text-red-400 hover:text-white bg-red-500/10 hover:bg-red-50 border border-red-500/20 rounded-xl transition-all active:scale-95 shrink-0" title="Sign Out Profile">
              <LogOut size={20} />
            </button>

            {/* 🔥 SUPPORT NUMBER */}
            <div className="hidden md:flex flex-col text-right pl-4 border-l border-slate-800 ml-1">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">24/7 Support</span>
              <span className="text-xs font-bold text-white tracking-wider flex items-center">
                <Phone size={10} className="mr-1 text-emerald-500"/> 9990-787-533
              </span>
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
      </div>
    </>
  );
}
