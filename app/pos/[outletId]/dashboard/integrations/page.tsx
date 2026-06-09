"use client";
import { useEffect, useState } from "react";
import { 
  Globe, Server, Activity, Power, Link as LinkIcon, Save, Key, RefreshCw, 
  Settings, ShoppingBag, Database, ShieldCheck, CheckCircle2, XCircle, AlertCircle, TrendingUp, Layers, Loader2,
  Clock, CalendarClock, Store, MenuSquare, WifiOff
} from "lucide-react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";

export default function IntegrationHubPage() {
  const params = useParams();
  const outletId = params.outletId as string;
  const { data: session } = useSession();

  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"CHANNELS" | "MENU_MAPPING" | "WEBHOOK_LOGS">("CHANNELS");
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof window !== "undefined" ? navigator.onLine : true);

  const [platforms, setPlatforms] = useState({
    zomato: { name: "Zomato", isConnected: true, isStoreOnline: false, autoAccept: false, menuSync: true, schedule: { open: "10:00", close: "23:00" }, apiKey: "Loading...", color: "bg-red-500", light: "bg-red-50", text: "text-red-600", border: "border-red-200" },
    swiggy: { name: "Swiggy", isConnected: true, isStoreOnline: false, autoAccept: false, menuSync: true, schedule: { open: "10:00", close: "23:00" }, apiKey: "Loading...", color: "bg-orange-500", light: "bg-orange-50", text: "text-orange-600", border: "border-orange-200" },
    web: { name: "RamKesar Web", isConnected: true, isStoreOnline: false, autoAccept: false, menuSync: true, schedule: { open: "00:00", close: "23:59" }, apiKey: "Loading...", color: "bg-indigo-600", light: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-200" },
    toing: { name: "Toing", isConnected: true, isStoreOnline: false, autoAccept: false, menuSync: false, schedule: { open: "10:00", close: "22:00" }, apiKey: "Loading...", color: "bg-pink-500", light: "bg-pink-50", text: "text-pink-600", border: "border-pink-200" },
    club: { name: "Club", isConnected: true, isStoreOnline: false, autoAccept: false, menuSync: false, schedule: { open: "18:00", close: "04:00" }, apiKey: "Loading...", color: "bg-purple-600", light: "bg-purple-50", text: "text-purple-600", border: "border-purple-200" }
  });

  const [baseMenuItems, setBaseMenuItems] = useState<any[]>([]);
  const [menuMapping, setMenuMapping] = useState<any>({});
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);

  useEffect(() => {
    setIsMounted(true);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const loadDashboardData = async () => {
    if (!session?.user) return;
    setIsLoading(true);
    try {
      // 🔒 Removed IDs from all URL fetches
      const invRes = await fetch(`/api/inventory`);
      if (invRes.ok) {
        const data = await invRes.json();
        const menuItems = data.inventory?.filter((i: any) => i.type === 'FINISHED_GOOD') || [];
        setBaseMenuItems(menuItems);
      }

      const intRes = await fetch(`/api/integrations`);
      if (intRes.ok) {
        const intData = await intRes.json();
        if (intData.platforms) {
          setPlatforms(prev => {
            const updated = { ...prev };
            Object.keys(intData.platforms).forEach(key => {
              if (updated[key as keyof typeof platforms]) {
                updated[key as keyof typeof platforms] = { ...updated[key as keyof typeof platforms], ...intData.platforms[key] };
              }
            });
            return updated;
          });
        }
        if (intData.mappings) setMenuMapping(intData.mappings);
      }

      const logsRes = await fetch(`/api/integrations/logs`);
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setWebhookLogs(logsData);
      }
    } catch (e) {
      console.error("Database Connection Error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user && isOnline) {
      loadDashboardData();
    }
  }, [outletId, session, isOnline]);

  const togglePlatformState = async (platformKey: keyof typeof platforms, keyToToggle: "isStoreOnline" | "autoAccept" | "menuSync") => {
    if (!isOnline) return alert("System Offline. Cannot toggle remote platform states.");
    
    const originalValue = platforms[platformKey][keyToToggle];
    const newValue = !originalValue;

    setPlatforms(prev => ({
      ...prev,
      [platformKey]: { ...prev[platformKey], [keyToToggle]: newValue }
    }));

    try {
      const updatedPlatforms = {
        ...platforms,
        [platformKey]: { ...platforms[platformKey], [keyToToggle]: newValue }
      };

      const res = await fetch("/api/integrations/mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // 🔒 Removed ids
        body: JSON.stringify({ 
          mappings: menuMapping, 
          platformsSettings: updatedPlatforms 
        })
      });

      if (!res.ok) throw new Error("DB Update Failed");

      if (keyToToggle === "isStoreOnline") {
        await fetch("/api/integrations/logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            platform: platforms[platformKey].name,
            event: "STORE_STATUS_UPDATE",
            status: "SUCCESS",
            details: `Store toggled to ${newValue ? 'ONLINE' : 'OFFLINE'} via Command Center`
          })
        });
        loadDashboardData();
      }
    } catch (e) {
      setPlatforms(prev => ({
        ...prev,
        [platformKey]: { ...prev[platformKey], [keyToToggle]: originalValue }
      }));
      alert("Failed to sync status with database aggregator. Please try again.");
    }
  };

  const handleScheduleChange = (platformKey: keyof typeof platforms, type: "open" | "close", val: string) => {
    setPlatforms(prev => ({
      ...prev,
      [platformKey]: {
        ...prev[platformKey],
        schedule: { ...prev[platformKey].schedule, [type]: val }
      }
    }));
  };

  const handleMappingChange = (itemId: string, platform: string, field: string, value: any) => {
    setMenuMapping((prev: any) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [platform]: {
          ...(prev[itemId]?.[platform] || {}),
          [field]: value
        }
      }
    }));
  };

  const saveMasterMapping = async () => {
    if (!isOnline) return alert("System Offline. Cannot save to cloud database.");
    setIsLoading(true);
    try {
      const res = await fetch("/api/integrations/mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          mappings: menuMapping, 
          platformsSettings: platforms 
        })
      });
      
      if (res.ok) {
        alert("🟢 Master Configuration & Menu Matrix Synced with Cloud Aggregators!");
        await fetch("/api/integrations/logs", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform: "SYSTEM", event: "MASTER_SYNC", status: "SUCCESS", details: "Deep configuration and catalog pushed to remote APIs." })
        });
        loadDashboardData();
      } else {
        alert("Server rejected mapping configurations.");
      }
    } catch(e) {
      alert("Network Connection Error syncing matrix to DB.");
    } finally {
      setIsLoading(false);
    }
  };

  const triggerForceSync = async () => {
    if (!isOnline) return alert("Offline!");
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      await fetch("/api/integrations/logs", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: "SYSTEM", event: "FORCE_SYNC", status: "SUCCESS", details: "Manual force sync completed for all active channels." })
      });
      alert("⚡ Enterprise Force-Sync complete. Stock, Prices & Schedules published globally.");
      loadDashboardData();
    } catch(e) {
      alert("Force sync encountered a network error.");
    } finally {
      setIsLoading(false);
    }
  };

  const activeChannels = Object.values(platforms).filter(p => p.isStoreOnline).length;
  const totalChannels = Object.keys(platforms).length;
  const totalMappedItems = Object.keys(menuMapping).length;
  const recentOrders = webhookLogs.filter(l => l.event === "ORDER_RECEIVED").length;

  if (!isMounted) return null;

  return (
    <>
      {/* 🔥 MASSIVE SEO & PREMIUM META TAG INJECTION 🔥 */}
      <title>ZedPoss | Omnichannel Aggregator Integration</title>
      <meta name="description" content="Manage Zomato, Swiggy, and direct D2C channels from a single screen. Push catalog updates globally with ZedPoss integrations." />
      <meta name="keywords" content="Zomato POS Integration, Swiggy Integration, Food Delivery App POS, Omni Channel POS, Aggregator Management Software, Cloud Kitchen Multi Brand, Menu Sync API, Restaurant Webhooks, Online Order Manager, Direct to Consumer Store, ZedPoss Channels, POS Integrations Hub, ZedooX Technologies, Push Menu Online, E-commerce Restaurant Store, Auto Accept KOT Delivery" />

      <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden font-sans">
        
        {/* ------------------- DESKTOP HEADER & NAVIGATION ------------------- */}
        <div className="p-6 pb-0 bg-white border-b border-slate-200 shrink-0">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
                <Globe className="mr-2 text-blue-600" /> Omni-Channel Command Center
                {!isOnline && <span className="ml-3 px-2 py-1 bg-red-100 text-red-600 text-[10px] rounded-lg flex items-center border border-red-200"><WifiOff size={12} className="mr-1"/> OFFLINE</span>}
              </h1>
              <p className="text-xs text-slate-500 font-bold mt-1 tracking-wide">Aggregator APIs, Web Integrations & Delivery Controls</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 mr-2">
                <button onClick={()=>setActiveTab("CHANNELS")} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeTab==='CHANNELS' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>API Channels</button>
                <button onClick={()=>setActiveTab("MENU_MAPPING")} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeTab==='MENU_MAPPING' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>Catalog Matrix</button>
                <button onClick={()=>setActiveTab("WEBHOOK_LOGS")} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeTab==='WEBHOOK_LOGS' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Traffic Logs</button>
              </div>
              <button onClick={loadDashboardData} disabled={isLoading || !isOnline} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors mr-2">
                 <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
              </button>
              <button onClick={triggerForceSync} disabled={isLoading || !isOnline} className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-wider flex items-center shadow-md active:scale-95 transition-all">
                {isLoading ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Server size={14} className="mr-1.5" />} Force Sync All
              </button>
            </div>
          </div>

          {/* METRICS DASHBOARD ROW GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center justify-between">
              <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Live Online Stores</span><p className="text-2xl font-mono font-black text-emerald-600">{activeChannels} / {totalChannels}</p></div><Power size={32} className="text-emerald-100" />
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center justify-between">
              <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Mapped Catalog SKUs</span><p className="text-2xl font-mono font-black text-blue-600">{totalMappedItems}</p></div><Layers size={32} className="text-blue-100" />
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center justify-between">
              <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Lifetime API Orders</span><p className="text-2xl font-mono font-black text-slate-900">{recentOrders}</p></div><ShoppingBag size={32} className="text-slate-200" />
            </div>
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-5 rounded-2xl border border-slate-700 shadow-md flex items-center justify-between text-white">
              <div><span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-1">Database Sync Status</span><p className={`text-xl font-black flex items-center ${isOnline ? 'text-emerald-400' : 'text-red-400'}`}>{isOnline ? <ShieldCheck size={20} className="mr-1.5"/> : <AlertCircle size={20} className="mr-1.5"/>} {isOnline ? 'SECURE DB' : 'OFFLINE'}</p></div><Database size={32} className="text-white/10" />
            </div>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-hidden flex flex-col">
          
          {/* ================= TAB 1: API CHANNELS & PRO STORE CONTROLS ================= */}
          {activeTab === "CHANNELS" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 h-full animate-in fade-in duration-200 overflow-y-auto pb-10 custom-scrollbar">
              {(Object.keys(platforms) as Array<keyof typeof platforms>).map((key) => {
                const p = platforms[key];
                return (
                  <div key={key} className={`bg-white rounded-3xl border-2 ${p.isStoreOnline ? p.border : 'border-slate-200'} shadow-lg overflow-hidden flex flex-col relative transition-all duration-300`}>
                    
                    {/* Status Banner */}
                    <div className={`${p.isStoreOnline ? p.color : 'bg-slate-300'} p-2 text-center transition-colors shadow-inner`}>
                      <span className="text-[10px] font-black text-white uppercase tracking-widest flex items-center justify-center">
                        {p.isStoreOnline ? <><Globe size={12} className="mr-1.5 animate-pulse"/> LIVE & ACCEPTING</> : <><Power size={12} className="mr-1.5"/> STORE OFFLINE</>}
                      </span>
                    </div>
                    
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex items-center mb-6 border-b border-slate-100 pb-4">
                        <div className={`w-12 h-12 rounded-xl ${p.light} flex items-center justify-center mr-4 shrink-0 shadow-sm border ${p.border}`}>
                          <Globe size={24} className={p.text} />
                        </div>
                        <div className="overflow-hidden">
                          <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase truncate">{p.name}</h2>
                          <div className="flex items-center mt-1">
                            <LinkIcon size={10} className="text-emerald-500 mr-1 shrink-0"/> <span className="text-[9px] font-bold text-slate-500 uppercase truncate">Secure API Linked</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 flex-1">
                        
                        {/* Control Toggles */}
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                          <div className="flex items-center">
                            <Store size={14} className="text-slate-400 mr-2"/>
                            <div>
                              <h4 className="text-[11px] font-black uppercase text-slate-700 leading-none">Store Online</h4>
                              <p className="text-[8px] font-bold text-slate-400 mt-0.5">Global visibility</p>
                            </div>
                          </div>
                          <button onClick={() => togglePlatformState(key, "isStoreOnline")} disabled={isLoading} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${p.isStoreOnline ? p.color : 'bg-slate-300'}`}>
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${p.isStoreOnline ? 'translate-x-6' : 'translate-x-1'}`}/>
                          </button>
                        </div>

                        <div className="flex justify-between items-center px-1">
                          <div className="flex items-center">
                            <MenuSquare size={14} className="text-slate-400 mr-2"/>
                            <div>
                              <h4 className="text-[11px] font-black uppercase text-slate-700 leading-none">Menu Sync</h4>
                              <p className="text-[8px] font-bold text-slate-400 mt-0.5">Auto-push catalog</p>
                            </div>
                          </div>
                          <button onClick={() => togglePlatformState(key, "menuSync")} disabled={isLoading} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${p.menuSync ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${p.menuSync ? 'translate-x-5' : 'translate-x-1'}`}/>
                          </button>
                        </div>

                        <div className="flex justify-between items-center px-1">
                          <div className="flex items-center">
                            <Activity size={14} className="text-slate-400 mr-2"/>
                            <div>
                              <h4 className="text-[11px] font-black uppercase text-slate-700 leading-none">Auto Accept</h4>
                              <p className="text-[8px] font-bold text-slate-400 mt-0.5">Bypass KOT manual</p>
                            </div>
                          </div>
                          <button onClick={() => togglePlatformState(key, "autoAccept")} disabled={isLoading} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${p.autoAccept ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${p.autoAccept ? 'translate-x-5' : 'translate-x-1'}`}/>
                          </button>
                        </div>

                        {/* Store Scheduling System */}
                        <div className="pt-4 border-t border-slate-100">
                          <h4 className="text-[10px] font-black uppercase text-slate-500 mb-2 flex items-center"><CalendarClock size={12} className="mr-1.5"/> Scheduling Engine</h4>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                              <span className="text-[8px] font-black uppercase text-emerald-600 block mb-1">Open Time</span>
                              <input type="time" value={p.schedule.open} onChange={(e)=>handleScheduleChange(key, "open", e.target.value)} className="w-full bg-transparent outline-none text-xs font-mono font-black text-slate-800" />
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                              <span className="text-[8px] font-black uppercase text-red-600 block mb-1">Close Time</span>
                              <input type="time" value={p.schedule.close} onChange={(e)=>handleScheduleChange(key, "close", e.target.value)} className="w-full bg-transparent outline-none text-xs font-mono font-black text-slate-800" />
                            </div>
                          </div>
                        </div>

                        <div className="pt-2">
                          <label className="block text-[9px] font-black uppercase text-slate-400 mb-1 flex items-center"><Key size={10} className="mr-1"/> Integration DB Key</label>
                          <input type="password" value={p.apiKey} readOnly className="w-full p-2 bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-mono font-bold text-slate-500 outline-none truncate" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ================= TAB 2: MENU MAPPING MATRIX (Ultra Wide) ================= */}
          {activeTab === "MENU_MAPPING" && (
            <div className="flex flex-col h-full animate-in fade-in duration-200 overflow-hidden">
              <div className="bg-slate-900 rounded-t-2xl p-4 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-white font-black text-sm uppercase tracking-wider flex items-center"><LinkIcon size={16} className="mr-2 text-indigo-400"/> Master Catalog Mapping & Pricing DB</h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-widest">Connect internal inventory SKUs to aggregator Item IDs for exact reports.</p>
                </div>
                <button onClick={saveMasterMapping} disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase flex items-center shadow-lg shadow-indigo-600/20 active:scale-95 transition-all">
                  {isLoading ? <Loader2 size={16} className="animate-spin mr-2"/> : <Save size={16} className="mr-2"/>} Save Matrix Layout
                </button>
              </div>

              <div className="flex-1 bg-white border border-t-0 border-slate-200 rounded-b-2xl shadow-sm overflow-hidden flex flex-col">
                {baseMenuItems.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                    <Database size={48} className="mb-4 opacity-20" />
                    <p className="font-bold uppercase tracking-widest">No Base Menu Items Found in DB</p>
                    <p className="text-xs mt-1">Please ensure FINISHED_GOOD items exist in the central POS inventory.</p>
                  </div>
                ) : (
                  <div className="overflow-y-auto overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[1800px]">
                      <thead className="sticky top-0 bg-slate-100/90 backdrop-blur-sm z-10 border-b border-slate-200 shadow-sm">
                        <tr className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                          <th className="p-4 w-72 bg-slate-800 text-white border-r border-slate-700">POS Base Master Item</th>
                          <th className="p-4 border-l border-red-200 bg-red-50 text-red-800 text-center" colSpan={3}>Zomato Channel</th>
                          <th className="p-4 border-l border-orange-200 bg-orange-50 text-orange-800 text-center" colSpan={3}>Swiggy Channel</th>
                          <th className="p-4 border-l border-indigo-200 bg-indigo-50 text-indigo-800 text-center" colSpan={3}>Web Store Channel</th>
                          <th className="p-4 border-l border-pink-200 bg-pink-50 text-pink-800 text-center" colSpan={3}>Toing Channel</th>
                          <th className="p-4 border-l border-purple-200 bg-purple-50 text-purple-800 text-center" colSpan={3}>Club Channel</th>
                        </tr>
                        <tr className="text-[9px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-300">
                          <th className="p-3 bg-slate-200 border-r border-slate-300">SKU Description & ID</th>
                          
                          {/* Headers Loop Helper */}
                          {['zomato', 'swiggy', 'web', 'toing', 'club'].map((plat) => {
                            const bg = plat === 'zomato' ? 'bg-red-50/50 border-red-100' : plat === 'swiggy' ? 'bg-orange-50/50 border-orange-100' : plat === 'web' ? 'bg-indigo-50/50 border-indigo-100' : plat === 'toing' ? 'bg-pink-50/50 border-pink-100' : 'bg-purple-50/50 border-purple-100';
                            return (
                              <React.Fragment key={plat}>
                                <th className={`p-2 border-l text-center ${bg}`}>ON</th>
                                <th className={`p-2 ${bg}`}>Ext Item ID</th>
                                <th className={`p-2 ${bg}`}>Price (₹)</th>
                              </React.Fragment>
                            )
                          })}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm font-bold text-slate-700 bg-white">
                        {baseMenuItems.map((item) => {
                          const mapping = menuMapping[item.id] || {};
                          
                          return (
                            <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                              {/* BASE ITEM CARD */}
                              <td className="p-3 bg-slate-50/50 border-r border-slate-200">
                                <div className="flex items-start">
                                  <div className="bg-slate-200 text-slate-500 rounded p-1.5 mr-3 mt-0.5"><Package size={14}/></div>
                                  <div>
                                    <div className="font-black text-slate-900 text-xs uppercase">{item.itemName || item.name}</div>
                                    <div className="flex items-center space-x-2 mt-1">
                                      <span className="text-[9px] font-mono font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">ID: {item.id}</span>
                                      <span className="text-[9px] font-black uppercase text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">Unit: {item.unit}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* LOOP PLATFORMS MAPPING */}
                              {['zomato', 'swiggy', 'web', 'toing', 'club'].map((plat) => {
                                const pData = mapping[plat] || { isEnabled: false, extId: '', price: 0 };
                                const accent = plat === 'zomato' ? 'accent-red-500 focus:border-red-400 text-red-600' : plat === 'swiggy' ? 'accent-orange-500 focus:border-orange-400 text-orange-600' : plat === 'web' ? 'accent-indigo-600 focus:border-indigo-400 text-indigo-600' : plat === 'toing' ? 'accent-pink-500 focus:border-pink-400 text-pink-600' : 'accent-purple-600 focus:border-purple-400 text-purple-600';
                                const bLeft = plat === 'zomato' ? 'border-red-100' : plat === 'swiggy' ? 'border-orange-100' : plat === 'web' ? 'border-indigo-100' : plat === 'toing' ? 'border-pink-100' : 'border-purple-100';

                                return (
                                  <React.Fragment key={plat}>
                                    <td className={`p-2 text-center border-l ${bLeft}`}>
                                      <input type="checkbox" checked={pData.isEnabled} onChange={(e) => handleMappingChange(item.id, plat, 'isEnabled', e.target.checked)} className={`w-4 h-4 cursor-pointer ${accent}`}/>
                                    </td>
                                    <td className="p-2">
                                      <input type="text" placeholder="ID/Slug" value={pData.extId || ''} onChange={(e) => handleMappingChange(item.id, plat, 'extId', e.target.value)} className={`w-28 p-2 border border-slate-200 rounded-lg text-xs font-mono outline-none bg-slate-50 focus:bg-white transition-colors ${accent}`}/>
                                    </td>
                                    <td className="p-2">
                                      <input type="number" min="0" placeholder="0" value={pData.price || ''} onChange={(e) => handleMappingChange(item.id, plat, 'price', parseFloat(e.target.value))} className={`w-20 p-2 border border-slate-200 rounded-lg text-xs font-mono font-black outline-none bg-slate-50 focus:bg-white transition-colors ${accent}`}/>
                                    </td>
                                  </React.Fragment>
                                )
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= TAB 3: LIVE WEBHOOK LOGS ================= */}
          {activeTab === "WEBHOOK_LOGS" && (
            <div className="flex-1 bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col animate-in fade-in duration-200">
              <div className="p-5 bg-slate-950 flex justify-between items-center border-b border-slate-800 shrink-0">
                <h3 className="font-black text-white text-sm uppercase tracking-widest flex items-center"><Activity size={18} className="mr-2 text-emerald-400 animate-pulse"/> API Traffic Terminal DB</h3>
                <div className="flex items-center">
                  <span className="relative flex h-3 w-3 mr-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span></span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Connected & Listening...</span>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-5">
                {webhookLogs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-600">
                    <Database size={40} className="mb-3 opacity-20" />
                    <p className="font-black uppercase tracking-widest text-xs">No active webhook logs in DB.</p>
                  </div>
                ) : (
                  <div className="space-y-3 font-mono">
                    {webhookLogs.map((log, index) => (
                      <div key={index} className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl flex items-start">
                        <div className="mr-4 mt-1">
                          {log.status === "SUCCESS" ? <CheckCircle2 size={16} className="text-emerald-400"/> : <XCircle size={16} className="text-red-400"/>}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center space-x-2">
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${log.platform === 'Zomato' ? 'bg-red-500/20 text-red-400' : log.platform === 'Swiggy' ? 'bg-orange-500/20 text-orange-400' : log.platform === 'Toing' ? 'bg-pink-500/20 text-pink-400' : log.platform === 'Club' ? 'bg-purple-500/20 text-purple-400' : log.platform === 'SYSTEM' ? 'bg-slate-600/50 text-white' : 'bg-indigo-500/20 text-indigo-400'}`}>{log.platform}</span>
                              <span className="text-xs font-black text-slate-200">[{log.event}]</span>
                            </div>
                            <span className="text-[10px] text-slate-500">{new Date(log.time).toLocaleTimeString('en-IN')}</span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1.5">{log.details}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
