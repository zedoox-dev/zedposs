"use client";
import { useState, useEffect } from "react";
import { Store, Printer, Users, ShieldCheck, Save, Loader2, X, UserCircle2, ToggleLeft, ToggleRight, ReceiptText, MessageSquare, Smartphone, Trash2, KeyRound, MonitorSmartphone, Lock, AlertTriangle, Percent, Clock, Settings2, WifiOff, MapPin, AlignLeft, Hash, Phone, Download, MonitorPlay, CheckCircle2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";

const defaultPrinterConfig = {
  printerSize: "80mm", 
  headerName: "RAMKESAR POS",
  headerSize: "text-lg",
  subHeader: "Premium Quality Snacks",
  subHeaderSize: "text-[10px]",
  gstNo: "",
  gstSize: "text-[9px]",
  footerMsg: "Thank You! Visit Again.",
  footerSize: "text-[10px]",
  
  kotDineIn: true,
  kotDelivery: true,
  kotPickUp: false,
  
  enableWhatsapp: false,
  whatsappNumber: "",
  whatsappApiKey: "",
  
  enableSms: false,
  smsGatewayUrl: "",
  smsApiKey: "",
  smsSenderId: "",

  triggerBilling: true,
  triggerCrmWelcome: true,
  triggerCrmPoints: true,
  triggerCrmMarketing: true,
};

const defaultGeneralConfig = {
  autoRoundOff: true,
  lowStockAlerts: true,
  showAllFilter: true,
  
  requirePinForCancel: true,
  requirePinForDiscount: true,
  autoLogoutMins: "30"
};

export default function SettingsPage() {
  const params = useParams();
  const outletId = params.outletId as string;
  const { data: session } = useSession();

  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("general"); 
  const [printerSubTab, setPrinterSubTab] = useState<"LAYOUT" | "KDS_ROUTING">("LAYOUT");
  const [isOnline, setIsOnline] = useState(typeof window !== "undefined" ? navigator.onLine : true);
  
  const [generalSettings, setGeneralSettings] = useState(defaultGeneralConfig);
  const [outletMasterData, setOutletMasterData] = useState<any>({});
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);

  const [staffList, setStaffList] = useState<any[]>([]);
  const [doarList, setDoarList] = useState<string[]>([]); // Strict Array Initialization
  const [newDoarInput, setNewDoarInput] = useState("");
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSavingStaff, setIsSavingStaff] = useState(false);
  const [formData, setFormData] = useState({ id: "", name: "", pin: "", role: "CASHIER" });
  
  const [printerSettings, setPrinterSettings] = useState(defaultPrinterConfig);
  const [isSavingPrinter, setIsSavingPrinter] = useState(false);

  const [kdsConfigs, setKdsConfigs] = useState([{ name: "Main Kitchen", ipAddress: "192.168.1.100", type: "USB" }]);

  // --- NEW: PWA Installation States ---
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    setIsMounted(true); 

    // --- NEW: PWA Install Detection Logic ---
    if (typeof window !== 'undefined') {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      setIsAppInstalled(isStandalone);

      const handleBeforeInstall = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstall);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      };
    }
  }, [outletId, session]);

  useEffect(() => {
    if (session?.user) {
      fetchSettingsFromDB();
    }
  }, [session, isOnline]);

  const fetchSettingsFromDB = async () => {
    if (!session?.user) return;
    const secureOutletId = (session.user as any).outletId || outletId;

    // 🔥 FIX: 100% Crash-Proof Local Storage Reading
    const savedDoars = localStorage.getItem(`zapped_doars_${secureOutletId}`);
    if (savedDoars) {
      try {
        const parsed = JSON.parse(savedDoars);
        setDoarList(Array.isArray(parsed) ? parsed : ["Admin", "Manager", "Deepak"]);
      } catch(e) {
        setDoarList(["Admin", "Manager", "Deepak"]);
      }
    } else {
      setDoarList(["Admin", "Manager", "Deepak"]);
    }

    if (!navigator.onLine) {
      try {
        const savedGeneral = localStorage.getItem(`zapped_general_config_${secureOutletId}`);
        if (savedGeneral) {
           const parsed = JSON.parse(savedGeneral);
           setGeneralSettings({ ...defaultGeneralConfig, ...(typeof parsed === 'object' ? parsed : {}) });
        }

        const savedPrinter = localStorage.getItem(`zapped_printer_config_${secureOutletId}`);
        if (savedPrinter) {
           const parsed = JSON.parse(savedPrinter);
           setPrinterSettings({ ...defaultPrinterConfig, ...(typeof parsed === 'object' ? parsed : {}) });
        }

        const savedStaff = localStorage.getItem(`zapped_staff_list_${secureOutletId}`);
        if (savedStaff) {
           const parsed = JSON.parse(savedStaff);
           setStaffList(Array.isArray(parsed) ? parsed : []);
        }
      } catch(e) {}
      return;
    }

    try {
      const res = await fetch(`/api/settings`);
      const data = await res.json();
      
      if (data.success) {
        if (data.outletMaster) {
           setOutletMasterData(data.outletMaster);
        }
        
        // Safely set Doar List from REAL database (Ensures Array)
        if (data.doarList && Array.isArray(data.doarList)) {
            setDoarList(data.doarList.length > 0 ? data.doarList : ["Admin", "Manager"]);
        }

        if (data.generalSettings) {
          const safeGeneral = typeof data.generalSettings === 'string' ? JSON.parse(data.generalSettings) : data.generalSettings;
          const mergedGeneral = { ...defaultGeneralConfig, ...(typeof safeGeneral === 'object' ? safeGeneral : {}) };
          setGeneralSettings(mergedGeneral);
          localStorage.setItem(`zapped_general_config_${secureOutletId}`, JSON.stringify(mergedGeneral));
          localStorage.setItem(`zapped_show_all_filter`, String(mergedGeneral.showAllFilter));
        }

        if (data.printerSettings) {
          const safePrinter = typeof data.printerSettings === 'string' ? JSON.parse(data.printerSettings) : data.printerSettings;
          const mergedPrinter = { ...defaultPrinterConfig, ...(typeof safePrinter === 'object' ? safePrinter : {}) };
          setPrinterSettings(mergedPrinter);
          localStorage.setItem(`zapped_printer_config_${secureOutletId}`, JSON.stringify(mergedPrinter));
        }

        if (data.staffList && Array.isArray(data.staffList)) {
          setStaffList(data.staffList);
          localStorage.setItem(`zapped_staff_list_${secureOutletId}`, JSON.stringify(data.staffList));
        }
      }
    } catch (error) {
      console.error("Failed to load settings from DB.");
    }
  };

  const handleSaveGeneralSettings = async () => {
    setIsSavingGeneral(true);
    const secureOutletId = (session?.user as any)?.outletId || outletId;
    localStorage.setItem(`zapped_general_config_${secureOutletId}`, JSON.stringify(generalSettings));
    localStorage.setItem(`zapped_show_all_filter`, String(generalSettings.showAllFilter));
    
    if (!navigator.onLine) {
      setTimeout(() => {
        setIsSavingGeneral(false);
        alert("Offline Mode: General Configurations saved locally.");
      }, 400);
      return;
    }

    try {
      await fetch("/api/settings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SAVE_GENERAL", payload: generalSettings })
      });
      alert("Enterprise General Configurations & Workflows Locked Successfully!");
    } catch(e) {
      alert("Failed to sync with cloud.");
    } finally {
      setIsSavingGeneral(false);
    }
  };

  const handleSavePrinterSettings = async () => {
    setIsSavingPrinter(true);
    const secureOutletId = (session?.user as any)?.outletId || outletId;
    localStorage.setItem(`zapped_printer_config_${secureOutletId}`, JSON.stringify(printerSettings));
    
    if (!navigator.onLine) {
      setTimeout(() => {
        setIsSavingPrinter(false);
        alert("Offline Mode: Hardware Settings saved locally.");
      }, 400);
      return;
    }

    try {
      await fetch("/api/settings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SAVE_PRINTER", payload: printerSettings })
      });
      alert("Hardware & API Gateways Locked Successfully!");
    } catch(e) {
      alert("Failed to sync with cloud.");
    } finally {
      setIsSavingPrinter(false);
    }
  };

  const handleAddDoar = async () => {
    if (!newDoarInput.trim()) return;
    try {
        const res = await fetch("/api/settings", {
           method: "POST", headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ action: "ADD_DOAR", doarName: newDoarInput.trim() })
        });
        const data = await res.json();
        if(res.ok) {
            const updated = [...doarList, newDoarInput.trim()];
            setDoarList(updated);
            setNewDoarInput("");
        } else {
            alert(data.error || "Failed to add operator. Database missing.");
        }
    } catch(e) { alert("Failed to add operator."); }
  };

  const handleRemoveDoar = async (doarName: string) => {
    try {
        const res = await fetch(`/api/settings?action=DELETE_DOAR&doarName=${doarName}`, { method: "DELETE" });
        if(res.ok) {
            setDoarList(doarList.filter(d => d !== doarName));
        }
    } catch(e) { alert("Failed to remove operator."); }
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.pin.length !== 4) {
      return alert("PIN must be exactly 4 digits.");
    }

    if (!navigator.onLine) return alert("You must be online to register new staff.");

    setIsSavingStaff(true);
    const secureOutletId = (session?.user as any)?.outletId || outletId;

    try {
      const res = await fetch("/api/settings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ADD_STAFF", payload: formData })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        const updatedList = [...staffList, data.staff];
        setStaffList(updatedList);
        localStorage.setItem(`zapped_staff_list_${secureOutletId}`, JSON.stringify(updatedList));
        
        setFormData({ id: "", name: "", pin: "", role: "CASHIER" });
        setShowAddModal(false);
        alert("Staff Member Added Successfully! They can now login using this PIN.");
      } else {
        alert("Failed to add staff.");
      }
    } catch (e) {
      alert("Network Error.");
    } finally {
      setIsSavingStaff(false);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm("Are you sure you want to revoke access for this staff member?")) return;
    if (!navigator.onLine) return alert("You must be online to revoke staff access.");

    const secureOutletId = (session?.user as any)?.outletId || outletId;

    try {
      const updatedList = staffList.filter(s => s.id !== id);
      if (updatedList.length === 0) return alert("You cannot delete all users. Keep at least one Admin.");
      
      const res = await fetch(`/api/settings?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setStaffList(updatedList);
        localStorage.setItem(`zapped_staff_list_${secureOutletId}`, JSON.stringify(updatedList));
      }
    } catch(e) {
      alert("Network Error.");
    }
  };

  // --- NEW: App Installation Handler ---
  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsAppInstalled(true);
      }
    } else {
      alert("Install prompt is not ready. You might need to click the 'Install' icon in your browser's address bar.");
    }
  };

  if (!isMounted) {
    return <div className="flex h-full items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-orange-500" size={40} /></div>;
  }

  return (
    <>
      <title>ZedPoss | System Settings & Hardware Configurations</title>
      <meta name="description" content="Configure POS Printers, Store Identity, Staff Access Roles, and Automation Rules seamlessly with ZedPoss Settings Manager." />

      <div className="p-6 h-full flex flex-col bg-slate-50 overflow-y-auto custom-scrollbar">
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">System Settings</h1>
            <p className="text-slate-500 text-sm">Manage enterprise hardware, advanced workflows, and API security</p>
          </div>
          {!isOnline && <span className="bg-red-100 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-black uppercase flex items-center shadow-sm"><WifiOff size={14} className="mr-1.5"/> OFFLINE MODE</span>}
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* TABS */}
          <div className="w-full lg:w-64 bg-white rounded-2xl shadow-sm border border-slate-100 p-4 h-fit shrink-0">
            <nav className="space-y-2">
              <button onClick={() => setActiveTab("general")} className={`w-full flex items-center space-x-3 p-3 font-semibold rounded-xl text-left ${activeTab === 'general' ? 'bg-orange-50 text-orange-600 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}><Settings2 size={20} /> <span>General & Options</span></button>
              <button onClick={() => setActiveTab("printer")} className={`w-full flex items-center space-x-3 p-3 font-semibold rounded-xl text-left ${activeTab === 'printer' ? 'bg-orange-50 text-orange-600 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}><Printer size={20} /> <span>Printer Layout</span></button>
              <button onClick={() => setActiveTab("ebill")} className={`w-full flex items-center space-x-3 p-3 font-semibold rounded-xl text-left ${activeTab === 'ebill' ? 'bg-orange-50 text-orange-600 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}><MessageSquare size={20} /> <span>E-Bill & Comm.</span></button>
              <button onClick={() => setActiveTab("staff")} className={`w-full flex items-center space-x-3 p-3 font-semibold rounded-xl text-left ${activeTab === 'staff' ? 'bg-orange-50 text-orange-600 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}><ShieldCheck size={20} /> <span>Staff & Security</span></button>
              
              {/* --- NEW: Installation Tab Button --- */}
              <button onClick={() => setActiveTab("installation")} className={`w-full flex items-center space-x-3 p-3 font-semibold rounded-xl text-left ${activeTab === 'installation' ? 'bg-orange-50 text-orange-600 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}><Download size={20} /> <span>App Installation</span></button>
            </nav>
          </div>

          {/* CONTENT */}
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 min-h-[600px]">
            
            {/* 1. GENERAL OPTIONS & ADVANCED POS WORKFLOW TAB */}
            {activeTab === "general" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h2 className="text-xl font-bold text-slate-800 flex items-center"><Store className="mr-2 text-orange-500" /> Identity & Operational Flow</h2>
                  <button onClick={handleSaveGeneralSettings} disabled={isSavingGeneral} className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center shadow-md active:scale-95 transition-all">
                    {isSavingGeneral ? <Loader2 size={18} className="animate-spin mr-2" /> : <Save size={18} className="mr-2" />} Save Settings
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Identity Module (Strictly Read Only from DB) */}
                  <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                    <div className="flex justify-between items-center">
                       <h3 className="font-black text-slate-800 uppercase tracking-wider text-xs">Business Profile Master</h3>
                       <span className="text-[9px] bg-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded uppercase">Read Only</span>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1 flex items-center"><Store size={10} className="mr-1"/> Outlet / Brand Name</label>
                      <input type="text" value={outletMasterData.name || "N/A"} readOnly className="w-full p-2.5 border border-slate-200 rounded-lg outline-none font-bold text-sm text-slate-500 bg-slate-100/50 cursor-not-allowed" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1 flex items-center"><MapPin size={10} className="mr-1"/> Complete Address</label>
                      <textarea value={outletMasterData.address || "N/A"} readOnly rows={3} className="w-full p-2.5 border border-slate-200 rounded-lg outline-none font-bold text-sm text-slate-500 bg-slate-100/50 cursor-not-allowed resize-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                       <div>
                         <label className="block text-[10px] font-bold text-slate-600 mb-1 flex items-center"><Phone size={10} className="mr-1"/> Contact Number</label>
                         <input type="text" value={outletMasterData.phone || "N/A"} readOnly className="w-full p-2.5 border border-slate-200 rounded-lg outline-none font-mono text-sm text-slate-500 bg-slate-100/50 cursor-not-allowed" />
                       </div>
                       <div>
                         <label className="block text-[10px] font-bold text-slate-600 mb-1 flex items-center"><Hash size={10} className="mr-1"/> GSTIN</label>
                         <input type="text" value={outletMasterData.gstin || "N/A"} readOnly className="w-full p-2.5 border border-slate-200 rounded-lg outline-none font-mono text-sm text-slate-500 bg-slate-100/50 cursor-not-allowed" />
                       </div>
                    </div>
                  </div>

                  {/* Operational Settings Module */}
                  <div className="space-y-4 bg-orange-50/50 p-5 rounded-2xl border border-orange-100">
                    <h3 className="font-black text-orange-800 uppercase tracking-wider text-xs flex items-center"><MonitorSmartphone size={16} className="mr-2 text-orange-500"/> Advanced POS Workflow Engine</h3>
                    
                    <div className="grid grid-cols-1 gap-4">
                      {/* ALL CATEGORY FILTER TOGGLE */}
                      <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                        <div>
                          <h4 className="font-bold text-sm text-slate-800">'ALL' Menu Filter</h4>
                          <p className="text-[9px] font-bold text-slate-400 mt-0.5">Show "ALL" category button in billing screen.</p>
                        </div>
                        <button onClick={() => setGeneralSettings({...generalSettings, showAllFilter: !generalSettings.showAllFilter})}>
                          {generalSettings.showAllFilter ? <ToggleRight className="text-orange-500" size={32} /> : <ToggleLeft className="text-slate-300" size={32} />}
                        </button>
                      </div>

                      {/* Auto Round Off */}
                      <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                        <div>
                          <h4 className="font-bold text-sm text-slate-800">Auto Round-off</h4>
                          <p className="text-[9px] font-bold text-slate-400 mt-0.5">Round grand total to nearest ₹1.</p>
                        </div>
                        <button onClick={() => setGeneralSettings({...generalSettings, autoRoundOff: !generalSettings.autoRoundOff})}>
                          {generalSettings.autoRoundOff ? <ToggleRight className="text-orange-500" size={32} /> : <ToggleLeft className="text-slate-300" size={32} />}
                        </button>
                      </div>

                      {/* Inventory Alerts */}
                      <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                        <div>
                          <h4 className="font-bold text-sm text-slate-800 flex items-center"><AlertTriangle size={12} className="mr-1 text-red-500"/> Stock Alerts</h4>
                          <p className="text-[9px] font-bold text-slate-400 mt-0.5">Warn if item hits minimum threshold.</p>
                        </div>
                        <button onClick={() => setGeneralSettings({...generalSettings, lowStockAlerts: !generalSettings.lowStockAlerts})}>
                          {generalSettings.lowStockAlerts ? <ToggleRight className="text-orange-500" size={32} /> : <ToggleLeft className="text-slate-300" size={32} />}
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* 2. PRINTER & KOT TAB */}
            {activeTab === "printer" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h2 className="text-xl font-bold text-slate-800 flex items-center"><Printer className="mr-2 text-orange-500" /> Hardware & Print Customization</h2>
                  <button onClick={handleSavePrinterSettings} disabled={isSavingPrinter} className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center shadow-md active:scale-95 transition-all">
                    {isSavingPrinter ? <Loader2 size={18} className="animate-spin mr-2" /> : <Save size={18} className="mr-2" />} Save Layout
                  </button>
                </div>

                {/* Sub Tab Switcher */}
                <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                   <button onClick={() => setPrinterSubTab("LAYOUT")} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-colors ${printerSubTab === 'LAYOUT' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-500 hover:text-slate-700'}`}>Bill Layout Editor</button>
                   <button onClick={() => setPrinterSubTab("KDS_ROUTING")} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-colors ${printerSubTab === 'KDS_ROUTING' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-500 hover:text-slate-700'}`}>Multi-Printer & KOT Routing</button>
                </div>

                {printerSubTab === "LAYOUT" && (
                   <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 animate-in slide-in-from-left-2 mt-4">
                     {/* Hardware */}
                     <div className="space-y-5">
                       <h3 className="font-black text-slate-800 uppercase tracking-wider text-xs flex items-center text-orange-600">1. Physical Hardware Roll Size</h3>
                       <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                         <label className="block text-xs font-bold text-slate-600 mb-1">Terminal Printer Roll</label>
                         <select value={printerSettings.printerSize} onChange={(e) => setPrinterSettings({...printerSettings, printerSize: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white outline-none font-bold text-slate-800 focus:border-orange-500 text-sm">
                           <option value="58mm">2-Inch (58mm) Mini Thermal</option><option value="80mm">3-Inch (80mm) Standard POS</option><option value="100mm">4-Inch (100mm) Label Roll</option><option value="125mm">5-Inch (125mm) Wide Format</option>
                         </select>
                       </div>

                       <h3 className="font-black text-slate-800 uppercase tracking-wider text-xs flex items-center text-orange-600 pt-2">2. Dynamic KOT Routing Engine</h3>
                       <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                         <div className="flex justify-between items-center"><div><h4 className="font-bold text-slate-800 text-xs">DINE IN KOT</h4><p className="text-[10px] text-slate-500">Table orders token.</p></div><button onClick={() => setPrinterSettings({...printerSettings, kotDineIn: !printerSettings.kotDineIn})}>{printerSettings.kotDineIn ? <ToggleRight className="text-orange-500" size={32} /> : <ToggleLeft className="text-slate-300" size={32} />}</button></div>
                         <div className="flex justify-between items-center border-t border-slate-200 pt-2"><div><h4 className="font-bold text-slate-800 text-xs">DELIVERY KOT</h4><p className="text-[10px] text-slate-500">Zomato/Swiggy slip.</p></div><button onClick={() => setPrinterSettings({...printerSettings, kotDelivery: !printerSettings.kotDelivery})}>{printerSettings.kotDelivery ? <ToggleRight className="text-orange-500" size={32} /> : <ToggleLeft className="text-slate-300" size={32} />}</button></div>
                         <div className="flex justify-between items-center border-t border-slate-200 pt-2"><div><h4 className="font-bold text-slate-800 text-xs">PICK UP KOT</h4><p className="text-[10px] text-slate-500">Takeaway slip.</p></div><button onClick={() => setPrinterSettings({...printerSettings, kotPickUp: !printerSettings.kotPickUp})}>{printerSettings.kotPickUp ? <ToggleRight className="text-orange-500" size={32} /> : <ToggleLeft className="text-slate-300" size={32} />}</button></div>
                       </div>
                     </div>

                     {/* Custom Receipt Text & Font Size Editors */}
                     <div className="space-y-4">
                       <h3 className="font-black text-slate-800 uppercase tracking-wider text-xs flex items-center text-orange-600"><ReceiptText size={14} className="mr-1"/> 3. Custom Bill Layout Styling</h3>
                       
                       {/* Header Row */}
                       <div className="flex space-x-2">
                         <div className="flex-1">
                           <label className="block text-[10px] font-bold text-slate-600 mb-1">Header Name (Brand)</label>
                           <input type="text" value={printerSettings.headerName} onChange={(e) => setPrinterSettings({...printerSettings, headerName: e.target.value})} className="w-full p-2 border border-slate-200 rounded-lg outline-none font-black text-sm uppercase text-slate-900 focus:border-orange-500" />
                         </div>
                         <div className="w-1/3">
                           <label className="block text-[10px] font-bold text-slate-600 mb-1">Size</label>
                           <select value={printerSettings.headerSize} onChange={(e) => setPrinterSettings({...printerSettings, headerSize: e.target.value})} className="w-full p-2 border border-slate-200 rounded-lg outline-none text-xs bg-white focus:border-orange-500 font-bold">
                             <option value="text-sm">Small</option><option value="text-base">Normal</option><option value="text-lg">Large</option><option value="text-xl">XL</option><option value="text-2xl">2XL</option>
                             <option value="text-3xl">3XL</option><option value="text-4xl">4XL</option><option value="text-5xl">5XL</option><option value="text-6xl">6XL</option><option value="text-7xl">7XL</option>
                           </select>
                         </div>
                       </div>

                       <div className="flex space-x-2">
                         <div className="flex-1"><label className="block text-[10px] font-bold text-slate-600 mb-1">Sub-Header</label><input type="text" value={printerSettings.subHeader} onChange={(e) => setPrinterSettings({...printerSettings, subHeader: e.target.value})} className="w-full p-2 border border-slate-200 rounded-lg outline-none text-sm font-bold focus:border-orange-500" /></div>
                         <div className="w-1/3"><label className="block text-[10px] font-bold text-slate-600 mb-1">Size</label><select value={printerSettings.subHeaderSize} onChange={(e) => setPrinterSettings({...printerSettings, subHeaderSize: e.target.value})} className="w-full p-2 border border-slate-200 rounded-lg outline-none text-xs bg-white"><option value="text-[10px]">Small</option><option value="text-xs">Normal</option><option value="text-sm">Large</option></select></div>
                       </div>

                       <div className="flex space-x-2">
                         <div className="flex-1"><label className="block text-[10px] font-bold text-slate-600 mb-1">GSTIN</label><input type="text" value={printerSettings.gstNo} onChange={(e) => setPrinterSettings({...printerSettings, gstNo: e.target.value.toUpperCase()})} className="w-full p-2 border border-slate-200 rounded-lg outline-none text-sm font-bold uppercase focus:border-orange-500" /></div>
                         <div className="w-1/3"><label className="block text-[10px] font-bold text-slate-600 mb-1">Size</label><select value={printerSettings.gstSize} onChange={(e) => setPrinterSettings({...printerSettings, gstSize: e.target.value})} className="w-full p-2 border border-slate-200 rounded-lg outline-none text-xs bg-white"><option value="text-[9px]">Small</option><option value="text-[10px]">Normal</option><option value="text-xs">Large</option></select></div>
                       </div>

                       <div className="flex space-x-2">
                         <div className="flex-1"><label className="block text-[10px] font-bold text-slate-600 mb-1">Footer Message</label><input type="text" value={printerSettings.footerMsg} onChange={(e) => setPrinterSettings({...printerSettings, footerMsg: e.target.value})} className="w-full p-2 border border-slate-200 rounded-lg outline-none text-sm font-bold focus:border-orange-500" /></div>
                         <div className="w-1/3"><label className="block text-[10px] font-bold text-slate-600 mb-1">Size</label><select value={printerSettings.footerSize} onChange={(e) => setPrinterSettings({...printerSettings, footerSize: e.target.value})} className="w-full p-2 border border-slate-200 rounded-lg outline-none text-xs bg-white"><option value="text-[10px]">Small</option><option value="text-xs">Normal</option><option value="text-sm">Large</option></select></div>
                       </div>
                     </div>
                   </div>
                )}

                {printerSubTab === "KDS_ROUTING" && (
                   <div className="mt-4 animate-in slide-in-from-right-2">
                      <div className="bg-orange-50/50 p-6 rounded-2xl border border-orange-100 flex flex-col items-center justify-center text-center space-y-3 min-h-[300px]">
                         <Printer size={48} className="text-orange-300" />
                         <h3 className="font-black text-orange-800 text-lg uppercase tracking-wider">Multi-Printer Setup Active</h3>
                         <p className="text-xs text-orange-600/80 font-bold max-w-md">KDS Nodes and specific category routing (e.g. Bar printer, Kitchen 1) are configured and managed centrally. Terminal is ready for remote silent printing commands over WebUSB & Local IP.</p>
                         <div className="mt-4 w-full max-w-lg bg-white p-4 rounded-xl border border-orange-200 shadow-sm text-left">
                            <h4 className="text-[10px] font-black uppercase text-slate-400 mb-3 border-b pb-2">Configured Nodes</h4>
                            {kdsConfigs.map((node, i) => (
                               <div key={i} className="flex justify-between items-center text-xs font-bold text-slate-700 bg-slate-50 p-2 rounded-lg mb-2 last:mb-0">
                                  <span>{node.name}</span>
                                  <div className="flex space-x-4">
                                     <span className="font-mono text-indigo-500">{node.ipAddress}</span>
                                     <span className="text-orange-500">{node.type}</span>
                                  </div>
                               </div>
                            ))}
                            <button className="w-full mt-2 py-2 border-2 border-dashed border-slate-300 text-slate-400 font-bold text-xs rounded-lg hover:border-orange-500 hover:text-orange-500 transition-colors">+ Add Hardware Printer Route</button>
                         </div>
                      </div>
                   </div>
                )}
              </div>
            )}

            {/* 3. E-BILL MESSAGING TAB */}
            {activeTab === "ebill" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center"><MessageSquare className="mr-2 text-orange-500" /> Enterprise E-Bill API Gateways</h2>
                    <p className="text-[10px] text-slate-500 font-bold mt-1">Configure your providers and select where messages should automatically dispatch.</p>
                  </div>
                  <button onClick={handleSavePrinterSettings} disabled={isSavingPrinter} className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center shadow-md active:scale-95 transition-all">
                    {isSavingPrinter ? <Loader2 size={18} className="animate-spin mr-2" /> : <Save size={18} className="mr-2" />} Save Setup
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* APIs Column */}
                  <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* PROFESSIONAL SMS API PANEL */}
                    <div className={`p-5 rounded-2xl border transition-all ${printerSettings.enableSms ? 'bg-blue-50/40 border-blue-200 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-80'}`}>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-black text-slate-800 flex items-center"><Smartphone size={16} className={`mr-2 ${printerSettings.enableSms ? 'text-blue-500' : 'text-slate-400'}`}/> SMS Gateway</h3>
                          <p className="text-[9px] text-slate-500 font-bold mt-1">Msg91, Twilio, Gupshup etc.</p>
                        </div>
                        <button onClick={() => setPrinterSettings({...printerSettings, enableSms: !printerSettings.enableSms})}>{printerSettings.enableSms ? <ToggleRight className="text-blue-500" size={32} /> : <ToggleLeft className="text-slate-300" size={32} />}</button>
                      </div>
                      <div className={`space-y-3 ${printerSettings.enableSms ? 'opacity-100 pointer-events-auto' : 'opacity-40 pointer-events-none'}`}>
                        <div><label className="block text-[9px] font-bold text-slate-600 mb-0.5 uppercase tracking-wider">Gateway URL Endpoint</label><input type="text" placeholder="https://api.msg91.com/api/v5/sendsms" value={printerSettings.smsGatewayUrl || ""} onChange={(e) => setPrinterSettings({...printerSettings, smsGatewayUrl: e.target.value})} className="w-full p-2 border border-blue-200 rounded-lg outline-none font-mono text-[10px] text-slate-800 bg-white shadow-sm" /></div>
                        <div><label className="block text-[9px] font-bold text-slate-600 mb-0.5 uppercase tracking-wider">API Auth Key</label><input type="password" placeholder="API Key / Token" value={printerSettings.smsApiKey || ""} onChange={(e) => setPrinterSettings({...printerSettings, smsApiKey: e.target.value})} className="w-full p-2 border border-blue-200 rounded-lg outline-none font-mono text-[10px] text-slate-800 bg-white shadow-sm" /></div>
                        <div><label className="block text-[9px] font-bold text-slate-600 mb-0.5 uppercase tracking-wider">Sender ID (6 Chars)</label><input type="text" maxLength={6} placeholder="ZAPPED" value={printerSettings.smsSenderId || ""} onChange={(e) => setPrinterSettings({...printerSettings, smsSenderId: e.target.value.toUpperCase()})} className="w-full p-2 border border-blue-200 rounded-lg outline-none font-bold text-xs text-slate-800 bg-white uppercase shadow-sm" /></div>
                      </div>
                    </div>

                    {/* WHATSAPP API PANEL */}
                    <div className={`p-5 rounded-2xl border transition-all ${printerSettings.enableWhatsapp ? 'bg-green-50/40 border-green-200 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-80'}`}>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-black text-slate-800 flex items-center"><MessageSquare size={16} className={`mr-2 ${printerSettings.enableWhatsapp ? 'text-green-500' : 'text-slate-400'}`}/> Meta WhatsApp</h3>
                          <p className="text-[9px] text-slate-500 font-bold mt-1">Official WA Cloud API integration.</p>
                        </div>
                        <button onClick={() => setPrinterSettings({...printerSettings, enableWhatsapp: !printerSettings.enableWhatsapp})}>{printerSettings.enableWhatsapp ? <ToggleRight className="text-green-500" size={32} /> : <ToggleLeft className="text-slate-300" size={32} />}</button>
                      </div>
                      <div className={`space-y-3 ${printerSettings.enableWhatsapp ? 'opacity-100 pointer-events-auto' : 'opacity-40 pointer-events-none'}`}>
                        <div><label className="block text-[9px] font-bold text-slate-600 mb-0.5 uppercase tracking-wider">Phone Number ID</label><input type="tel" placeholder="e.g. 104928274..." value={printerSettings.whatsappNumber || ""} onChange={(e) => setPrinterSettings({...printerSettings, whatsappNumber: e.target.value.replace(/\D/g, '')})} className="w-full p-2 border border-green-200 rounded-lg outline-none font-mono text-[10px] text-slate-800 bg-white shadow-sm" /></div>
                        <div><label className="block text-[9px] font-bold text-slate-600 mb-0.5 uppercase tracking-wider">Bearer Token</label><input type="password" placeholder="EAABwzX0..." value={printerSettings.whatsappApiKey || ""} onChange={(e) => setPrinterSettings({...printerSettings, whatsappApiKey: e.target.value})} className="w-full p-2 border border-green-200 rounded-lg outline-none font-mono text-[10px] text-slate-800 bg-white shadow-sm" /></div>
                      </div>
                    </div>
                  </div>

                  {/* Triggers Column */}
                  <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-lg text-white">
                    <h3 className="font-black flex items-center uppercase text-xs tracking-wider text-orange-400 mb-4 pb-2 border-b border-slate-700">
                      <ToggleRight className="mr-2" size={18}/> Automation Triggers
                    </h3>
                    
                    <div className={`space-y-4 ${(printerSettings.enableSms || printerSettings.enableWhatsapp) ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                      <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                        <div><h4 className="font-bold text-sm text-slate-200">Billing E-Receipts</h4><p className="text-[9px] text-slate-400 mt-0.5">Send links when order saves.</p></div>
                        <button onClick={() => setPrinterSettings({...printerSettings, triggerBilling: !printerSettings.triggerBilling})}>{printerSettings.triggerBilling ? <ToggleRight className="text-orange-500" size={28} /> : <ToggleLeft className="text-slate-600" size={28} />}</button>
                      </div>

                      <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                        <div><h4 className="font-bold text-sm text-slate-200">CRM VIP Welcome</h4><p className="text-[9px] text-slate-400 mt-0.5">Auto-greet new registrations.</p></div>
                        <button onClick={() => setPrinterSettings({...printerSettings, triggerCrmWelcome: !printerSettings.triggerCrmWelcome})}>{printerSettings.triggerCrmWelcome ? <ToggleRight className="text-orange-500" size={28} /> : <ToggleLeft className="text-slate-600" size={28} />}</button>
                      </div>

                      <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                        <div><h4 className="font-bold text-sm text-slate-200">Points & Coupons</h4><p className="text-[9px] text-slate-400 mt-0.5">Updates on redeem/earning.</p></div>
                        <button onClick={() => setPrinterSettings({...printerSettings, triggerCrmPoints: !printerSettings.triggerCrmPoints})}>{printerSettings.triggerCrmPoints ? <ToggleRight className="text-orange-500" size={28} /> : <ToggleLeft className="text-slate-600" size={28} />}</button>
                      </div>

                      <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                        <div><h4 className="font-bold text-sm text-slate-200">Ad Campaigns</h4><p className="text-[9px] text-slate-400 mt-0.5">Allow Bulk Marketing send.</p></div>
                        <button onClick={() => setPrinterSettings({...printerSettings, triggerCrmMarketing: !printerSettings.triggerCrmMarketing})}>{printerSettings.triggerCrmMarketing ? <ToggleRight className="text-orange-500" size={28} /> : <ToggleLeft className="text-slate-600" size={28} />}</button>
                      </div>
                      
                      {!(printerSettings.enableSms || printerSettings.enableWhatsapp) && (
                        <p className="text-[9px] text-center text-red-400 font-bold uppercase mt-2">Enable at least 1 provider to unlock triggers.</p>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* 4. STAFF & SECURITY ACCESS TAB */}
            {activeTab === "staff" && (
              <div className="animate-in fade-in duration-200 flex flex-col h-full">
                 
                 <div className="flex justify-between items-center border-b border-slate-100 pb-3 shrink-0">
                   <div>
                     <h2 className="text-xl font-bold text-slate-800 flex items-center"><ShieldCheck className="mr-2 text-orange-500" /> Role-Based Access Control</h2>
                     <p className="text-[10px] text-slate-500 font-bold mt-1">Manage PINs for system login and restricted permissions.</p>
                   </div>
                   <div className="flex items-center space-x-3">
                     <button onClick={handleSaveGeneralSettings} disabled={isSavingGeneral} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider active:scale-95 flex items-center transition-all border border-slate-200">
                       {isSavingGeneral ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />} Save Policies
                     </button>
                     <button onClick={() => setShowAddModal(true)} className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider active:scale-95 shadow-md flex items-center">
                       <UserCircle2 size={16} className="mr-2"/> Add Staff
                     </button>
                   </div>
                 </div>

                 <div className="flex-1 overflow-y-auto pr-2 mt-6 space-y-8">
                   
                   {/* Staff Table */}
                   <div>
                     <table className="w-full text-left border-collapse">
                       <thead className="bg-slate-50 sticky top-0">
                         <tr className="text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200">
                           <th className="p-4 rounded-tl-xl">Staff Name</th>
                           <th className="p-4 text-center">Auth PIN</th>
                           <th className="p-4 text-center">Role / Access</th>
                           <th className="p-4 text-right rounded-tr-xl">Action</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100 text-sm font-bold text-slate-700">
                         {staffList.map((staff) => (
                           <tr key={staff.id} className="hover:bg-slate-50/50">
                             <td className="p-4">
                               <div className="flex items-center">
                                 <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-black text-xs mr-3 uppercase">{staff.name.substring(0, 2)}</div>
                                 <span className="uppercase text-slate-900">{staff.name}</span>
                               </div>
                             </td>
                             <td className="p-4 text-center">
                               <span className="font-mono tracking-widest bg-slate-100 px-3 py-1 rounded-lg text-slate-600">••••</span>
                               <span className="text-[9px] text-slate-400 block mt-1">({staff.pin})</span> 
                             </td>
                             <td className="p-4 text-center">
                               <span className={`text-[9px] px-3 py-1 rounded-full uppercase tracking-widest border ${staff.role === 'ADMIN' ? 'bg-amber-100 border-amber-300 text-amber-700' : staff.role === 'MANAGER' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-slate-100 border-slate-300 text-slate-600'}`}>
                                 {staff.role}
                               </span>
                             </td>
                             <td className="p-4 text-right">
                               <button onClick={() => handleDeleteStaff(staff.id)} className="text-red-500 hover:text-red-700 p-2 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                                 <Trash2 size={16}/>
                               </button>
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>

                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* 🔥 Advanced Security Policies Engine */}
                      <div className="bg-red-50/30 p-5 rounded-2xl border border-red-100 h-fit">
                         <h3 className="font-black text-red-800 uppercase tracking-wider text-xs flex items-center mb-4"><Lock size={16} className="mr-2 text-red-500"/> Security & Authorization Policies</h3>
                         <div className="grid grid-cols-1 gap-4">
                           
                           <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                             <div>
                               <h4 className="font-bold text-sm text-slate-800 flex items-center"><Trash2 size={12} className="mr-1 text-slate-400"/> Void/Cancel Checks</h4>
                               <p className="text-[9px] font-bold text-slate-400 mt-0.5">Require Admin PIN to cancel bills.</p>
                             </div>
                             <button onClick={() => setGeneralSettings({...generalSettings, requirePinForCancel: !generalSettings.requirePinForCancel})}>
                               {generalSettings.requirePinForCancel ? <ToggleRight className="text-red-500" size={32} /> : <ToggleLeft className="text-slate-300" size={32} />}
                             </button>
                           </div>

                           <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                             <div>
                               <h4 className="font-bold text-sm text-slate-800 flex items-center"><Percent size={12} className="mr-1 text-slate-400"/> Manual Discounts</h4>
                               <p className="text-[9px] font-bold text-slate-400 mt-0.5">Require Admin PIN for discounts.</p>
                             </div>
                             <button onClick={() => setGeneralSettings({...generalSettings, requirePinForDiscount: !generalSettings.requirePinForDiscount})}>
                               {generalSettings.requirePinForDiscount ? <ToggleRight className="text-red-500" size={32} /> : <ToggleLeft className="text-slate-300" size={32} />}
                             </button>
                           </div>

                           <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
                             <div className="flex-1">
                               <h4 className="font-bold text-sm text-slate-800 flex items-center"><Clock size={12} className="mr-1 text-slate-400"/> Session Timeout</h4>
                               <p className="text-[9px] font-bold text-slate-400 mt-0.5">Auto-lock POS after inactivity.</p>
                             </div>
                             <div className="w-16">
                               <select value={generalSettings.autoLogoutMins} onChange={(e) => setGeneralSettings({...generalSettings, autoLogoutMins: e.target.value})} className="w-full p-2 border border-slate-200 rounded-lg outline-none text-xs bg-white font-black text-slate-800 text-center">
                                 <option value="15">15m</option><option value="30">30m</option><option value="60">1Hr</option><option value="OFF">OFF</option>
                               </select>
                             </div>
                           </div>

                         </div>
                      </div>

                      {/* 🔥 Operators (DOARS) Management */}
                      <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100 h-fit">
                         <h3 className="font-black text-indigo-800 uppercase tracking-wider text-xs flex items-center mb-4"><Users size={16} className="mr-2 text-indigo-500"/> Operator (Doars) List Management</h3>
                         <p className="text-[10px] font-bold text-indigo-600/70 mb-4">Add authorized names to display in Petty Cash and Purchase (GRN) operator dropdowns.</p>
                         
                         <div className="flex items-center space-x-2 mb-4">
                           <input 
                             type="text" 
                             placeholder="E.g. Cashier Rahul" 
                             value={newDoarInput} 
                             onChange={(e) => setNewDoarInput(e.target.value)} 
                             className="flex-1 p-2.5 border border-indigo-200 rounded-xl outline-none font-bold text-xs"
                           />
                           <button onClick={handleAddDoar} className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase px-4 py-3 rounded-xl transition-all shadow-sm">Add Doar</button>
                         </div>

                         <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                           {doarList.map((doar, idx) => (
                              <div key={idx} className="flex justify-between items-center bg-white border border-slate-200 p-2.5 rounded-xl shadow-sm">
                                 <span className="font-bold text-xs text-slate-700 capitalize">{doar}</span>
                                 <button onClick={() => handleRemoveDoar(doar)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"><Trash2 size={14}/></button>
                              </div>
                           ))}
                           {doarList.length === 0 && <p className="text-xs font-bold text-slate-400 text-center italic py-2">No operators configured.</p>}
                         </div>
                      </div>
                   </div>

                 </div>
              </div>
            )}

            {/* 5. --- NEW: APP INSTALLATION TAB --- */}
            {activeTab === "installation" && (
              <div className="animate-in fade-in duration-200 flex flex-col h-full items-center justify-center">
                <div className="max-w-md w-full bg-slate-50 border border-slate-200 rounded-3xl p-8 shadow-sm text-center">
                  
                  {isAppInstalled ? (
                    <div className="space-y-4">
                      <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 size={40} />
                      </div>
                      <h2 className="text-2xl font-black text-slate-800 tracking-tight">App Installed</h2>
                      <p className="text-sm font-bold text-slate-500">
                        ZedPoss is currently running as a standalone offline app on this device. Smooth and fast billing is active!
                      </p>
                      <button disabled className="mt-6 w-full bg-slate-200 text-slate-500 py-3 rounded-xl font-black uppercase text-xs cursor-not-allowed">
                        Already Installed
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                        <MonitorPlay size={40} />
                        <span className="absolute -bottom-2 -right-2 bg-white text-orange-600 rounded-full p-1 shadow-sm border border-orange-100">
                           <Download size={16} />
                        </span>
                      </div>
                      <h2 className="text-2xl font-black text-slate-800 tracking-tight">Install ZedPoss Desktop App</h2>
                      <p className="text-sm font-bold text-slate-500 px-4">
                        Download this app directly to your computer or billing PC. It runs smoothly offline, caches your billing data instantly, and auto-updates when you reconnect!
                      </p>
                      
                      <div className="pt-4 space-y-3">
                        <button 
                          onClick={handleInstallClick} 
                          className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3.5 rounded-xl font-black uppercase tracking-wider text-xs shadow-lg active:scale-95 transition-all flex justify-center items-center"
                        >
                          <Download size={18} className="mr-2" /> Download & Install Now
                        </button>
                        
                        {!deferredPrompt && (
                           <p className="text-[10px] text-slate-400 font-bold px-2">
                             If the button doesn't work, look for the install icon (🖥️ or ⬇️) in your browser's address bar at the top right!
                           </p>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}

          </div>
        </div>

        {/* STAFF ADD MODAL */}
        {showAddModal && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 print:hidden animate-in fade-in">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border-t-8 border-slate-900">
              <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-3">
                <h2 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center"><KeyRound size={18} className="mr-1.5 text-orange-500"/> Grant Access</h2>
                <button onClick={() => {setShowAddModal(false); setFormData({ id: "", name: "", pin: "", role: "CASHIER" });}} className="text-slate-400 p-1.5 bg-slate-100 rounded-full transition-all hover:bg-slate-200"><X size={16}/></button>
              </div>
              <form onSubmit={handleSaveStaff} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Full Name</label>
                  <input required type="text" placeholder="e.g., Deepak" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-sm font-bold uppercase focus:border-orange-500 bg-slate-50 focus:bg-white transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Login PIN (4 Digits)</label>
                  <input required type="text" maxLength={4} pattern="[0-9]{4}" placeholder="0000" value={formData.pin} onChange={(e) => setFormData({...formData, pin: e.target.value.replace(/\D/g, '')})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xl font-mono text-center font-black focus:border-orange-500 bg-slate-50 focus:bg-white transition-all tracking-[0.5em]" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Permission Level</label>
                  <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-bold text-slate-800 focus:border-orange-500 bg-slate-50 focus:bg-white transition-all">
                    <option value="CASHIER">Cashier (Billing Only)</option>
                    <option value="MANAGER">Manager (Billing, Orders & CRM)</option>
                    <option value="ADMIN">System Admin (Full Access)</option>
                  </select>
                </div>

                <button disabled={isSavingStaff} type="submit" className="w-full mt-4 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest py-3.5 rounded-xl text-xs shadow-lg flex justify-center items-center active:scale-95 transition-all">
                  {isSavingStaff ? <Loader2 className="animate-spin" size={18} /> : "Create Staff Profile"}
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
