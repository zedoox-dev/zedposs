"use client";
import { useState, useEffect } from "react";
import { Zap, Loader2, Power, ShieldAlert, Monitor, Package, Users, ChefHat, QrCode, Calculator, Network, MessageSquare, UtensilsCrossed, WifiOff, AlertTriangle } from "lucide-react";

export default function FeatureManagementPage() {
  const [features, setFeatures] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    fetchFeatures();
  }, []);

  const fetchFeatures = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/super-admin/features");
      const data = await res.json();
      if (data.success) {
        setFeatures(data.features);
      }
    } catch (e) {
      console.error("Failed to load features");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (featureKey: string, currentStatus: boolean) => {
    const action = currentStatus ? "DISABLE" : "ENABLE";
    if (currentStatus && !confirm(`⚠️ WARNING: Disabling this feature will hide it from all clients globally. Proceed?`)) return;

    setToggling(featureKey);
    try {
      const res = await fetch("/api/super-admin/features", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureKey, isEnabled: !currentStatus })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeatures(data.features);
      } else {
        alert("Failed to update feature state.");
      }
    } catch (e) {
      alert("Network Error.");
    } finally {
      setToggling(null);
    }
  };

  if (loading || !features) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Loading Master Switches...</p>
      </div>
    );
  }

  // Define UI Metadata for dynamic mapping
  const featureList = [
    { key: "posBilling", name: "Core POS Billing", icon: <Monitor size={20}/>, desc: "The main billing terminal for cashiers." },
    { key: "inventorySystem", name: "Inventory Engine", icon: <Package size={20}/>, desc: "Stock, recipes, and PO management." },
    { key: "crmLoyalty", name: "CRM & Loyalty", icon: <Users size={20}/>, desc: "Customer points and profiles." },
    { key: "kitchenDisplay", name: "KDS (Kitchen Display)", icon: <ChefHat size={20}/>, desc: "Digital screens for kitchen chefs." },
    { key: "qrOrdering", name: "QR Table Ordering", icon: <QrCode size={20}/>, desc: "Scan to order functionality for dine-in." },
    { key: "whatsappAlerts", name: "WhatsApp Alerts", icon: <MessageSquare size={20}/>, desc: "Bill receipts and notifications via WA." },
    { key: "zomatoSwiggySync", name: "Aggregator Sync", icon: <UtensilsCrossed size={20}/>, desc: "Auto-accept Zomato/Swiggy orders." },
    { key: "franchiseModule", name: "Franchise Matrix", icon: <Network size={20}/>, desc: "Multi-outlet master control for brands." },
    { key: "accountingTally", name: "Accounting & Tally", icon: <Calculator size={20}/>, desc: "Financial ledgers and Tally ERP sync." },
    { key: "offlineMode", name: "Offline Sync (BETA)", icon: <WifiOff size={20}/>, desc: "Allow POS to work without internet.", isBeta: true }
  ];

  return (
    <div className="max-w-[1200px] mx-auto h-full flex flex-col animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
            <Zap className="mr-2 text-indigo-600" /> Feature Management (Kill Switches)
          </h1>
          <p className="text-xs text-slate-500 font-bold mt-1 tracking-wide">Globally enable or disable SaaS modules across all tenant accounts instantly.</p>
        </div>
        <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
          <ShieldAlert size={14} className="mr-1.5"/> Use With Extreme Caution
        </div>
      </div>

      {/* Switches Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {featureList.map((mod) => {
            const isEnabled = features[mod.key];
            const isProcessing = toggling === mod.key;

            return (
              <div key={mod.key} className={`relative bg-white rounded-2xl border-2 p-5 flex flex-col transition-all duration-300 ${isEnabled ? 'border-slate-200 shadow-sm' : 'border-dashed border-slate-300 bg-slate-50/50'}`}>
                
                {mod.isBeta && (
                  <span className="absolute top-0 right-4 transform -translate-y-1/2 bg-indigo-500 text-white text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-sm">
                    Beta Engine
                  </span>
                )}

                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-xl border ${isEnabled ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                    {mod.icon}
                  </div>
                  
                  {/* Modern Toggle Switch UI */}
                  <button 
                    onClick={() => handleToggle(mod.key, isEnabled)}
                    disabled={isProcessing}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isEnabled ? 'bg-emerald-500' : 'bg-slate-300'} ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isProcessing && <Loader2 size={12} className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white animate-spin z-10" />}
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'} shadow-sm`} />
                  </button>
                </div>

                <h3 className={`font-black uppercase tracking-tight text-sm mb-1.5 ${isEnabled ? 'text-slate-900' : 'text-slate-500'}`}>
                  {mod.name}
                </h3>
                <p className="text-xs font-bold text-slate-500 leading-relaxed mb-4 flex-1">
                  {mod.desc}
                </p>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded ${isEnabled ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-200 text-slate-500 border border-slate-300'}`}>
                    {isEnabled ? "Globally Active" : "System Offline"}
                  </span>
                  {!isEnabled && (
                    <AlertTriangle size={14} className="text-amber-500" />
                  )}
                </div>

              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
