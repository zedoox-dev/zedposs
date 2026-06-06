"use client";
import { useState, useEffect } from "react";
import { useOutlet } from "../../context/OutletContext"; // Fixed Absolute Path
import { 
  Settings, Store, FileText, Printer, ShieldCheck, 
  Loader2, Save, MapPin, Mail, Key, Receipt, Network
} from "lucide-react";

export default function BranchSettingsPage() {
  const { selectedOutlet } = useOutlet();
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("PROFILE");

  // Form States
  const [outletData, setOutletData] = useState({
    name: "", address: "", email: "", password: "",
  });
  
  const [generalSettings, setGeneralSettings] = useState({
    phone: "", gstNumber: "", fssaiNumber: "", taxPercentage: "5", includeTaxInPrice: true
  });

  const [printerSettings, setPrinterSettings] = useState({
    printerIp: "192.168.1.100", paperSize: "80mm", autoPrintBill: true, printKOT: true
  });

  useEffect(() => {
    if (selectedOutlet !== "ALL") {
      fetchOutletSettings();
    }
  }, [selectedOutlet]);

  const fetchOutletSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/brand/settings?outletId=${selectedOutlet}`);
      const json = await res.json();
      
      if (json.success && json.outlet) {
        const o = json.outlet;
        setOutletData({
          name: o.name || "",
          address: o.address || "",
          email: o.email || "",
          password: o.password || ""
        });
        
        if (o.generalSettings) {
          setGeneralSettings(prev => ({ ...prev, ...o.generalSettings }));
        }
        if (o.printerSettings) {
          setPrinterSettings(prev => ({ ...prev, ...o.printerSettings }));
        }
      }
    } catch (e) {
      console.error("Failed to fetch settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/brand/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId: selectedOutlet,
          ...outletData,
          generalSettings,
          printerSettings
        })
      });
      const json = await res.json();
      if (res.ok && json.success) {
        alert("✅ Branch Settings Updated Successfully!");
      } else {
        alert("Error saving settings.");
      }
    } catch (e) {
      alert("Network Error");
    } finally {
      setIsSaving(false);
    }
  };

  // ⚠️ Block UI if "ALL" is selected
  if (selectedOutlet === "ALL") {
    return (
      <div className="h-full flex flex-col items-center justify-center animate-in fade-in">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center max-w-md">
          <Store size={60} className="mx-auto text-indigo-200 mb-4" />
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">Select a Branch</h2>
          <p className="text-sm font-bold text-slate-500 mb-6">
            Hardware configurations and taxes are location-specific. Please select a physical branch from the top dropdown to configure its settings.
          </p>
          <div className="inline-flex items-center text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
            <MapPin size={14} className="mr-1.5" /> Use Top Dropdown
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Retrieving Configurations...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto animate-in fade-in duration-300 h-full flex flex-col pb-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
            <Settings className="mr-2 text-indigo-600" /> Branch Configuration
          </h1>
          <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest flex items-center">
            Editing settings for: <span className="ml-1.5 px-2 py-0.5 bg-slate-200 text-slate-800 rounded font-black">{outletData.name}</span>
          </p>
        </div>
        <button disabled={isSaving} onClick={handleSaveSettings} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-lg shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-50">
          {isSaving ? <Loader2 className="animate-spin mr-2" size={16}/> : <Save className="mr-2" size={16} />}
          Save Changes
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6 flex-1 overflow-hidden">
        
        {/* Settings Navigation Sidebar */}
        <div className="w-full md:w-64 flex flex-col gap-2 shrink-0">
          <button onClick={() => setActiveTab("PROFILE")} className={`flex items-center px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "PROFILE" ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700'}`}>
            <Store size={16} className="mr-3" /> Basic Profile
          </button>
          <button onClick={() => setActiveTab("BILLING")} className={`flex items-center px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "BILLING" ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700'}`}>
            <FileText size={16} className="mr-3" /> Taxes & Receipts
          </button>
          <button onClick={() => setActiveTab("HARDWARE")} className={`flex items-center px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === "HARDWARE" ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700'}`}>
            <Printer size={16} className="mr-3" /> POS Hardware
          </button>
        </div>

        {/* Settings Content Area */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-y-auto custom-scrollbar p-6">
          <form className="space-y-6">
            
            {/* TAB: PROFILE */}
            {activeTab === "PROFILE" && (
              <div className="space-y-6 animate-in fade-in">
                <div className="border-b border-slate-100 pb-4 mb-4">
                  <h3 className="text-sm font-black uppercase text-slate-800 tracking-widest flex items-center"><Store size={16} className="mr-2 text-indigo-500"/> Physical Location</h3>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">Details used for internal mapping and branch identification.</p>
                </div>
                
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Branch Name</label>
                  <input type="text" value={outletData.name} onChange={(e) => setOutletData({...outletData, name: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-bold uppercase focus:border-indigo-500 bg-slate-50" />
                </div>
                
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Full Address (e.g. Lajpat Nagar, New Delhi)</label>
                  <textarea rows={3} value={outletData.address} onChange={(e) => setOutletData({...outletData, address: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-bold focus:border-indigo-500 bg-slate-50 custom-scrollbar" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 flex items-center"><Mail size={12} className="mr-1"/> Branch Email (Login)</label>
                    <input type="email" value={outletData.email} onChange={(e) => setOutletData({...outletData, email: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-mono font-bold focus:border-indigo-500 bg-slate-50" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 flex items-center"><Key size={12} className="mr-1"/> POS Access Password</label>
                    <input type="text" value={outletData.password} onChange={(e) => setOutletData({...outletData, password: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-mono font-bold tracking-widest focus:border-indigo-500 bg-slate-50" />
                  </div>
                </div>
              </div>
            )}

            {/* TAB: BILLING & TAXES */}
            {activeTab === "BILLING" && (
              <div className="space-y-6 animate-in fade-in">
                <div className="border-b border-slate-100 pb-4 mb-4">
                  <h3 className="text-sm font-black uppercase text-slate-800 tracking-widest flex items-center"><ShieldCheck size={16} className="mr-2 text-indigo-500"/> Legal & Taxes</h3>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">Identifiers printed on customer receipts.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">GSTIN Number</label>
                    <input type="text" placeholder="e.g. 07XXXXX1234X1ZX" value={generalSettings.gstNumber} onChange={(e) => setGeneralSettings({...generalSettings, gstNumber: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-mono font-bold uppercase focus:border-indigo-500 bg-slate-50" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">FSSAI License No.</label>
                    <input type="text" placeholder="14-digit FSSAI" value={generalSettings.fssaiNumber} onChange={(e) => setGeneralSettings({...generalSettings, fssaiNumber: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-mono font-bold focus:border-indigo-500 bg-slate-50" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Contact Phone (For Bill)</label>
                    <input type="text" placeholder="+91 98..." value={generalSettings.phone} onChange={(e) => setGeneralSettings({...generalSettings, phone: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-mono font-bold focus:border-indigo-500 bg-slate-50" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Default Tax Rate (%)</label>
                    <input type="number" step="0.1" value={generalSettings.taxPercentage} onChange={(e) => setGeneralSettings({...generalSettings, taxPercentage: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-mono font-bold focus:border-indigo-500 bg-slate-50" />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors w-fit">
                    <input type="checkbox" checked={generalSettings.includeTaxInPrice} onChange={(e) => setGeneralSettings({...generalSettings, includeTaxInPrice: e.target.checked})} className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-800 block">Prices are Inclusive of Tax</span>
                      <span className="text-[9px] text-slate-400 font-bold">Menu prices already include GST.</span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* TAB: HARDWARE & PRINTERS */}
            {activeTab === "HARDWARE" && (
              <div className="space-y-6 animate-in fade-in">
                <div className="border-b border-slate-100 pb-4 mb-4">
                  <h3 className="text-sm font-black uppercase text-slate-800 tracking-widest flex items-center"><Network size={16} className="mr-2 text-indigo-500"/> POS Hardware Routing</h3>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">Configure thermal printers and KOT network endpoints.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 flex items-center"><Printer size={12} className="mr-1"/> Thermal Printer IP</label>
                    <input type="text" placeholder="192.168.1.100" value={printerSettings.printerIp} onChange={(e) => setPrinterSettings({...printerSettings, printerIp: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-mono font-bold focus:border-indigo-500 bg-slate-50" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Paper Width</label>
                    <select value={printerSettings.paperSize} onChange={(e) => setPrinterSettings({...printerSettings, paperSize: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-bold uppercase focus:border-indigo-500 bg-slate-50">
                      <option value="58mm">58mm (Small)</option>
                      <option value="80mm">80mm (Standard)</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-4 border-t border-slate-100">
                  <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors w-fit">
                    <input type="checkbox" checked={printerSettings.autoPrintBill} onChange={(e) => setPrinterSettings({...printerSettings, autoPrintBill: e.target.checked})} className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-800 block">Auto-Print Receipts</span>
                      <span className="text-[9px] text-slate-400 font-bold">Print customer bill immediately after payment.</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors w-fit">
                    <input type="checkbox" checked={printerSettings.printKOT} onChange={(e) => setPrinterSettings({...printerSettings, printKOT: e.target.checked})} className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-800 block flex items-center"><Receipt size={12} className="mr-1"/> Print KOT (Kitchen Ticket)</span>
                      <span className="text-[9px] text-slate-400 font-bold">Generate a physical ticket for the kitchen.</span>
                    </div>
                  </label>
                </div>
              </div>
            )}

          </form>
        </div>
      </div>
    </div>
  );
}
