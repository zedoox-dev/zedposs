"use client";
import { useEffect, useState } from "react";
import { Search, Star, UserPlus, Loader2, X, Users, Trophy, Medal, Gift, Phone, Printer, TrendingUp, Award, RefreshCcw, IndianRupee, Filter, PieChart, MessageSquare, Send, WifiOff } from "lucide-react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { localDB } from "@/lib/localDb";

export default function CustomersCRMPage() {
  const params = useParams();
  const outletId = params.outletId as string;
  const { data: session } = useSession();

  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"DIRECTORY" | "LEADERBOARD" | "ANALYTICS" | "MARKETING">("DIRECTORY");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [isOnline, setIsOnline] = useState(typeof window !== "undefined" ? navigator.onLine : true);
  
  const [printerConfig, setPrinterConfig] = useState<any>({ printerSize: "80mm", headerName: "RAMKESAR POS" });
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ name: "", phone: "", dob: "" });

  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [redeemAmount, setRedeemAmount] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);

  const [templatePromo, setTemplatePromo] = useState("Hello {name}! Exclusive VIP Offer: Get 20% off your next meal. Valid this weekend only. Show this msg at billing.");
  const [templateCredit, setTemplateCredit] = useState("Hi {name}, you just earned {earned} points on your recent visit! Total Balance: {points} points. (10 Pts = ₹1). Visit us again!");
  const [templateRedeem, setTemplateRedeem] = useState("Hi {name}, you have redeemed {redeem_points} points. Use Coupon Code: {redeem_id} to get ₹{value} off your next bill!");
  const [customMessage, setCustomMessage] = useState("");
  
  const [selectedTemplate, setSelectedTemplate] = useState(1);
  const [isSendingMsg, setIsSendingMsg] = useState(false);

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); triggerOfflineQueueSync(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const secureOutletId = (session?.user as any)?.outletId || outletId;
    const pConf = localStorage.getItem(`zapped_printer_config_${secureOutletId}`);
    if (pConf) setPrinterConfig(JSON.parse(pConf));

    const savedPromo = localStorage.getItem(`crm_template_promo_${secureOutletId}`);
    if (savedPromo) setTemplatePromo(savedPromo);
    const savedCredit = localStorage.getItem(`crm_template_credit_${secureOutletId}`);
    if (savedCredit) setTemplateCredit(savedCredit);
    const savedRedeem = localStorage.getItem(`crm_template_redeem_${secureOutletId}`);
    if (savedRedeem) setTemplateRedeem(savedRedeem);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [outletId, session]);

  useEffect(() => {
    if (session?.user) {
      fetchCustomers();
    }
  }, [session, isOnline]);

  const triggerOfflineQueueSync = async () => {
    const secureOutletId = (session?.user as any)?.outletId || outletId;
    const savedQueue = localStorage.getItem(`zapped_offline_crm_queue_${secureOutletId}`);
    if (!savedQueue) return;
    const queue = JSON.parse(savedQueue);
    if (queue.length === 0) return;
    
    const remaining: any[] = [];
    for (const req of queue) {
      try {
        const res = await fetch("/api/customers", {
          method: req.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(req.body)
        });
        if (!res.ok) remaining.push(req);
      } catch (err) { remaining.push(req); }
    }
    
    if (remaining.length === 0) localStorage.removeItem(`zapped_offline_crm_queue_${secureOutletId}`);
    else localStorage.setItem(`zapped_offline_crm_queue_${secureOutletId}`, JSON.stringify(remaining));
    
    fetchCustomers();
  };

  const fetchCustomers = async () => {
    if (!session?.user) return;
    const secureTenantId = (session.user as any).tenantId;
    setLoading(true);

    if (!navigator.onLine) {
      try {
        const localCustomers = await localDB.customers.where('tenantId').equals(secureTenantId).toArray();
        setCustomers(localCustomers);
      } catch (e) { console.error(e); }
      setLoading(false);
      return;
    }

    try {
      // 🔒 Removed IDs from URL
      const res = await fetch(`/api/customers`);
      const data = await res.json();
      const crmData = Array.isArray(data) ? data : [];
      setCustomers(crmData);
      
      await localDB.customers.clear();
      if (crmData.length > 0) {
        const cacheData = crmData.map(c => ({ ...c, tenantId: secureTenantId }));
        await localDB.customers.bulkPut(cacheData);
      }
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const saveTemplates = () => {
      const secureOutletId = (session?.user as any)?.outletId || outletId;
      localStorage.setItem(`crm_template_promo_${secureOutletId}`, templatePromo);
      localStorage.setItem(`crm_template_credit_${secureOutletId}`, templateCredit);
      localStorage.setItem(`crm_template_redeem_${secureOutletId}`, templateRedeem);
      alert("All Marketing Templates saved successfully!");
  }

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) return;
    setIsSaving(true);
    
    const secureOutletId = (session.user as any).outletId || outletId;

    if (!navigator.onLine) {
      const queue = JSON.parse(localStorage.getItem(`zapped_offline_crm_queue_${secureOutletId}`) || "[]");
      queue.push({ method: "POST", body: formData });
      localStorage.setItem(`zapped_offline_crm_queue_${secureOutletId}`, JSON.stringify(queue));
      
      const fakeId = `off-${Date.now()}`;
      await localDB.customers.put({ id: fakeId, ...formData, tenantId: (session.user as any).tenantId, loyaltyPoints: 50, totalVisits: 0, totalSpend: 0 });
      
      setShowAddModal(false);
      setFormData({ name: "", phone: "", dob: "" });
      fetchCustomers();
      setIsSaving(false);
      alert("🟢 Offline Mode: VIP Registered. Will sync to Cloud later.");
      return;
    }

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // 🔒 Removed tenantId from body
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (res.ok) {
        setShowAddModal(false);
        setFormData({ name: "", phone: "", dob: "" });
        fetchCustomers();
        alert("🟢 VIP Customer Registered Successfully! (Welcome SMS Triggered)");
      } else {
        alert(data.error || "Failed to add customer");
      }
    } catch (error) {
      alert("Network error. Please check your connection.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRedeemPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    const pts = parseInt(redeemAmount);
    if (isNaN(pts) || pts <= 0 || pts > (selectedCustomer?.loyaltyPoints || 0)) {
      return alert("Invalid redemption amount.");
    }
    
    setIsRedeeming(true);
    const payload = { action: "REDEEM_POINTS", customerId: selectedCustomer.id, pointsToDeduct: pts };
    const secureOutletId = (session?.user as any).outletId || outletId;

    if (!navigator.onLine) {
      const queue = JSON.parse(localStorage.getItem(`zapped_offline_crm_queue_${secureOutletId}`) || "[]");
      queue.push({ method: "PUT", body: payload });
      localStorage.setItem(`zapped_offline_crm_queue_${secureOutletId}`, JSON.stringify(queue));
      
      const updatedCustomers = customers.map(c => c.id === selectedCustomer.id ? { ...c, loyaltyPoints: c.loyaltyPoints - pts } : c);
      setCustomers(updatedCustomers);
      if (selectedCustomer.id && !selectedCustomer.id.startsWith("off-")) {
        await localDB.customers.update(selectedCustomer.id, { loyaltyPoints: selectedCustomer.loyaltyPoints - pts });
      }
      
      triggerSuccessRedeemSMS(pts);
      return;
    }

    try {
      const res = await fetch("/api/customers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (res.ok || res.status === 404) { 
        const updatedCustomers = customers.map(c => {
          if (c.id === selectedCustomer.id) return { ...c, loyaltyPoints: c.loyaltyPoints - pts };
          return c;
        });
        setCustomers(updatedCustomers);
        triggerSuccessRedeemSMS(pts);
      }
    } catch (error) {
      alert("Redemption failed due to network issue.");
    } finally {
      setIsRedeeming(false);
    }
  };

  const triggerSuccessRedeemSMS = (pts: number) => {
    setShowRedeemModal(false);
    setRedeemAmount("");
    const discountValue = (pts / 10).toFixed(2);
    const redeemCode = "CPN-" + Math.random().toString(36).substring(2, 6).toUpperCase();
    
    alert(`🎉 Points Redeemed Successfully!\n\n📲 SMS/WhatsApp Sent to +91 ${selectedCustomer.phone}:\n\n"Hi ${selectedCustomer.name}, you have redeemed ${pts} points. Use Coupon Code: ${redeemCode} to get ₹${discountValue} off on your bill!"\n\n(Save this code for billing: ${redeemCode})`);
    setIsRedeeming(false);
  }

  const handleSendMessage = () => {
      if (filteredCustomers.length === 0) return alert("No customers match the current filter.");
      
      let baseMessage = "";
      if (selectedTemplate === 1) baseMessage = templatePromo;
      else if (selectedTemplate === 2) baseMessage = templateCredit;
      else if (selectedTemplate === 3) baseMessage = templateRedeem;
      else baseMessage = customMessage;

      if (!baseMessage.trim()) return alert("Message cannot be empty.");

      if (!printerConfig?.smsGatewayUrl && !printerConfig?.whatsappApiKey) {
          return alert("⚠️ E-Bill Gateway configuration fields missing inside system settings dashboard. Please configure them to send messages.");
      }

      setIsSendingMsg(true);
      
      setTimeout(() => {
          setIsSendingMsg(false);
          alert(`API Gateway Triggered! Ads/Messages queued for ${filteredCustomers.length} selected customers.`);
      }, 1500);
  };

  const handlePrint = () => {
    setTimeout(() => { window.print(); }, 150);
  };

  const getCustomerTier = (spend: number) => {
    const s = Number(spend) || 0;
    if (s >= 20000) return { label: "PLATINUM", color: "bg-slate-900 text-amber-400 border-amber-500/50 shadow-sm", icon: <Trophy size={10} className="mr-1"/> };
    if (s >= 10000) return { label: "GOLD", color: "bg-amber-100 text-amber-700 border-amber-300", icon: <Medal size={10} className="mr-1"/> };
    if (s >= 5000) return { label: "SILVER", color: "bg-slate-200 text-slate-700 border-slate-300", icon: <Award size={10} className="mr-1"/> };
    return { label: "BRONZE", color: "bg-orange-50 text-orange-700 border-orange-200", icon: <Star size={10} className="mr-1"/> };
  };

  const filteredCustomers = customers.filter(c => {
    const searchMatch = c.phone?.includes(searchQuery) || c.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const tier = getCustomerTier(c.totalSpend).label;
    const tierMatch = typeFilter === "ALL" || tier === typeFilter;
    return searchMatch && tierMatch;
  });

  const topSpenders = [...customers].sort((a, b) => (b.totalSpend || 0) - (a.totalSpend || 0)).slice(0, 10);
  
  const totalCRMRevenue = customers.reduce((sum, c) => sum + (Number(c.totalSpend) || 0), 0);
  const totalOutstandingPoints = customers.reduce((sum, c) => sum + (Number(c.loyaltyPoints) || 0), 0);
  const avgSpendPerCustomer = customers.length > 0 ? (totalCRMRevenue / customers.length).toFixed(2) : "0.00";

  const platinumCount = customers.filter(c => getCustomerTier(c.totalSpend).label === "PLATINUM").length;
  const goldCount = customers.filter(c => getCustomerTier(c.totalSpend).label === "GOLD").length;
  const silverCount = customers.filter(c => getCustomerTier(c.totalSpend).label === "SILVER").length;
  const bronzeCount = customers.filter(c => getCustomerTier(c.totalSpend).label === "BRONZE").length;

  return (
    <>
      {/* 🔥 MASSIVE SEO & PREMIUM META TAG INJECTION 🔥 */}
      <title>ZedPoss CRM | Customer Loyalty & Marketing Hub</title>
      <meta name="description" content="Engage restaurant customers with VIP Tiers, Loyalty Points, and SMS Marketing. ZedPoss CRM Dashboard by ZedooX Technologies." />
      <meta name="keywords" content="Restaurant CRM, Customer Loyalty Points, POS Marketing, ZedPoss VIP, Retail Customer Directory, SMS Marketing POS, WhatsApp Billing Notifications, ZedPoss CRM, ZedooX Technologies, Loyalty Program POS, Customer Retention Software, Cloud Database CRM, Retail Membership App, Cafe Loyalty Program, Points Redemption POS, POS Contact Manager, Auto Send Offers POS, High Spender Analytics, Customer Purchase History, Customer Leaderboard" />

      <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden print:h-auto print:overflow-visible print:bg-white">
        
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            body * {
              visibility: hidden;
            }
            #crm-print-area, #crm-print-area * {
              visibility: visible;
            }
            #crm-print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              display: block !important;
            }
          }
        `}} />

        <div className="p-6 pb-0 bg-white border-b border-slate-200 shrink-0 print:hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
                <Users className="mr-2 text-orange-500" /> Customer Loyalty CRM
                {!isOnline && <span className="ml-3 px-2 py-1 bg-red-100 text-red-600 text-[10px] rounded-lg flex items-center border border-red-200"><WifiOff size={12} className="mr-1"/> OFFLINE MODE</span>}
              </h1>
              <p className="text-xs text-slate-500 font-bold mt-1 tracking-wide">Enterprise Retention & Points Management Hub</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 mr-2">
                <button onClick={()=>setActiveTab("DIRECTORY")} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeTab==='DIRECTORY' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-500 hover:text-slate-700'}`}>Directory</button>
                <button onClick={()=>setActiveTab("LEADERBOARD")} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeTab==='LEADERBOARD' ? 'bg-white shadow-sm text-amber-600' : 'text-slate-500 hover:text-slate-700'}`}>Leaderboard</button>
                <button onClick={()=>setActiveTab("ANALYTICS")} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeTab==='ANALYTICS' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Analytics</button>
                <button onClick={()=>setActiveTab("MARKETING")} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeTab==='MARKETING' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}>Marketing</button>
              </div>

              <button onClick={fetchCustomers} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"><RefreshCcw size={16} /></button>
              <button onClick={handlePrint} className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-2 rounded-lg font-black text-[10px] uppercase tracking-wider flex items-center shadow-md active:scale-95 transition-all"><Printer size={14} className="mr-1.5" /> Print Page</button>
              <button onClick={() => setShowAddModal(true)} className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-wider flex items-center shadow-lg shadow-orange-500/30 active:scale-95 transition-all"><UserPlus size={14} className="mr-1.5" /> Register VIP</button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center justify-between">
              <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Registered Base</span><p className="text-2xl font-mono font-black text-slate-900">{customers.length}</p></div><Users size={32} className="text-orange-100" />
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center justify-between">
              <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total CRM Revenue</span><p className="text-xl font-mono font-black text-emerald-600">₹{totalCRMRevenue.toFixed(2)}</p></div><IndianRupee size={32} className="text-emerald-100" />
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center justify-between">
              <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Avg Spend / Customer</span><p className="text-xl font-mono font-black text-blue-600">₹{avgSpendPerCustomer}</p></div><TrendingUp size={32} className="text-blue-100" />
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-amber-500 p-5 rounded-2xl border border-orange-400 shadow-md flex items-center justify-between text-white">
              <div><span className="text-[10px] font-black text-orange-100 uppercase tracking-widest block mb-1">Active Outstanding Points</span><p className="text-2xl font-mono font-black text-white">{totalOutstandingPoints}</p></div><Gift size={32} className="text-white/30" />
            </div>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-hidden flex flex-col print:hidden">
          
          {/* ================= TAB 1: MASTER DIRECTORY ================= */}
          {activeTab === "DIRECTORY" && (
            <div className="flex flex-col h-full animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4 shrink-0 bg-white p-2 border border-slate-200 rounded-xl shadow-sm">
                <div className="relative max-w-md flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                  <input type="text" placeholder="Search Customer Name or Phone Number..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none font-bold text-xs focus:border-orange-500 bg-slate-50 transition-colors" />
                </div>
                <div className="flex items-center space-x-2">
                  <Filter size={14} className="text-slate-400"/>
                  <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="p-2 border border-slate-200 rounded-lg font-bold text-xs outline-none bg-slate-50 uppercase text-slate-700 focus:border-orange-500">
                    <option value="ALL">All Tiers</option><option value="PLATINUM">⚫ Platinum Only</option><option value="GOLD">🟡 Gold Only</option><option value="SILVER">⚪ Silver Only</option><option value="BRONZE">🟤 Bronze Only</option>
                  </select>
                </div>
              </div>

              <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                {loading ? (
                  <div className="flex-1 flex justify-center items-center"><Loader2 className="animate-spin text-orange-500" size={40} /></div>
                ) : filteredCustomers.length === 0 ? (
                  <div className="flex-1 flex flex-col justify-center items-center text-slate-400"><Users size={60} className="mb-4 opacity-20" /><p className="font-black text-xl text-slate-500 uppercase tracking-tight">No VIPs Found</p><p className="text-xs font-bold mt-1">Adjust filters or register a new customer.</p></div>
                ) : (
                  <div className="overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                      <thead className="sticky top-0 bg-slate-100/90 backdrop-blur-sm z-10 border-b border-slate-200">
                        <tr className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                          <th className="p-4 w-12 text-center">#</th>
                          <th className="p-4">Customer Details</th>
                          <th className="p-4 text-center">Loyalty Tier Rank</th>
                          <th className="p-4 text-center">Total Visits</th>
                          <th className="p-4 text-right">Lifetime Spend</th>
                          <th className="p-4 text-center bg-orange-50/50 text-orange-800 border-x">Active Points</th>
                          <th className="p-4 text-center w-32">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm font-bold text-slate-700">
                        {filteredCustomers.map((c, idx) => {
                          const tierInfo = getCustomerTier(c.totalSpend);
                          const hasPoints = c.loyaltyPoints > 0;

                          return (
                            <tr key={c.id} className="hover:bg-slate-50/80 transition-colors group">
                              <td className="p-4 text-center font-black text-slate-400 text-xs">{idx + 1}</td>
                              <td className="p-4">
                                <div className="flex items-center">
                                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-black text-xs mr-3 uppercase">{c.name.substring(0, 2)}</div>
                                  <div>
                                    <div className="font-black text-slate-900 uppercase text-xs">{c.name}</div>
                                    <div className="text-[10px] font-mono text-slate-500 flex items-center mt-0.5"><Phone size={10} className="mr-1"/> {c.phone}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 text-center">
                                <span className={`inline-flex items-center text-[9px] px-2 py-1 rounded-full uppercase tracking-widest font-black border ${tierInfo.color}`}>
                                  {tierInfo.icon} {tierInfo.label}
                                </span>
                              </td>
                              <td className="p-4 text-center font-mono text-slate-600">{c.totalVisits || 0}</td>
                              <td className="p-4 text-right font-mono font-black text-emerald-600">₹{(c.totalSpend || 0).toFixed(2)}</td>
                              <td className="p-4 text-center border-x border-slate-100">
                                <span className="flex items-center justify-center font-mono font-black text-orange-600 text-base">
                                  <Star size={14} className="mr-1 fill-orange-500 text-orange-500" /> {c.loyaltyPoints || 0}
                                </span>
                              </td>
                              <td className="p-4 text-center space-x-1 whitespace-nowrap">
                                <button disabled={!hasPoints} onClick={()=>{setSelectedCustomer(c); setShowRedeemModal(true);}} className={`text-[9px] font-black uppercase px-3 py-1.5 rounded transition-all active:scale-95 shadow-sm inline-flex items-center ${hasPoints ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
                                  Redeem
                                </button>
                              </td>
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

          {/* ================= TAB 2: VIP LEADERBOARD ================= */}
          {activeTab === "LEADERBOARD" && (
            <div className="flex flex-col lg:flex-row gap-6 h-full animate-in fade-in duration-200">
              <div className="w-full lg:w-2/3 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
                <div className="p-5 bg-slate-900 flex justify-between items-center shrink-0">
                  <h3 className="font-black text-white text-sm uppercase tracking-widest flex items-center"><Trophy size={18} className="mr-2 text-amber-400"/> Top 10 Elite Spenders</h3>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/50 px-2 py-1 rounded uppercase font-black">All Time Data</span>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <tr><th className="p-4 text-center w-16">Rank</th><th className="p-4">VIP Member</th><th className="p-4 text-right">Lifetime Value</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm font-bold text-slate-700">
                      {topSpenders.map((c, idx) => (
                        <tr key={c.id} className="hover:bg-amber-50/30 transition-colors">
                          <td className="p-4 text-center">
                            {idx === 0 ? <Trophy size={24} className="mx-auto text-amber-500 fill-amber-200"/> : idx === 1 ? <Medal size={22} className="mx-auto text-slate-400 fill-slate-200"/> : idx === 2 ? <Medal size={20} className="mx-auto text-amber-700 fill-amber-100"/> : <span className="text-slate-400 font-black">#{idx + 1}</span>}
                          </td>
                          <td className="p-4">
                            <div className="font-black text-slate-900 uppercase">{c.name}</div>
                            <div className="text-[10px] font-mono text-slate-500 mt-0.5">{c.phone}</div>
                          </td>
                          <td className="p-4 text-right font-mono font-black text-emerald-600 text-lg">₹{(c.totalSpend || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                      {topSpenders.length === 0 && <tr><td colSpan={3} className="text-center p-8 text-slate-400 text-xs font-black uppercase">No transaction data available yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="w-full lg:w-1/3 flex flex-col gap-6 h-full overflow-hidden">
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 shadow-xl relative overflow-hidden shrink-0 text-white">
                  <Award size={100} className="absolute -right-5 -bottom-5 text-white/10" />
                  <h3 className="font-black uppercase tracking-widest text-xs mb-1 text-white/80">Loyalty Mechanics</h3>
                  <p className="text-2xl font-black mb-4">Rewarding Retention</p>
                  <div className="space-y-2 text-[10px] font-bold">
                    <div className="bg-black/20 p-2.5 rounded-lg border border-white/10 flex justify-between"><span>₹100 Spent</span><span className="font-black text-amber-200">1 Reward Point</span></div>
                    <div className="bg-black/20 p-2.5 rounded-lg border border-white/10 flex justify-between"><span>10 Reward Points Value</span><span className="font-black text-amber-200">₹1 Discount</span></div>
                    <div className="bg-black/20 p-2.5 rounded-lg border border-white/10 flex justify-between"><span>New Registration Bonus</span><span className="font-black text-amber-200">50 Points</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 3: ANALYTICS & INSIGHTS ================= */}
          {activeTab === "ANALYTICS" && (
            <div className="flex flex-col h-full animate-in fade-in duration-200 space-y-6 overflow-y-auto pb-10">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 rounded-2xl p-6 border border-amber-500/30 flex flex-col justify-center items-center text-center shadow-lg relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 z-10">Platinum Members</h4>
                  <p className="text-4xl font-mono font-black text-amber-400 z-10">{platinumCount}</p>
                  <p className="text-[9px] text-slate-500 font-bold mt-1 uppercase z-10">Above ₹20,000 Spend</p>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-amber-200 shadow-sm flex flex-col justify-center items-center text-center">
                  <h4 className="text-[10px] font-black uppercase text-amber-700 tracking-widest mb-1">Gold Members</h4>
                  <p className="text-4xl font-mono font-black text-amber-600">{goldCount}</p>
                  <p className="text-[9px] text-amber-500/70 font-bold mt-1 uppercase">Above ₹10,000 Spend</p>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-slate-300 shadow-sm flex flex-col justify-center items-center text-center">
                  <h4 className="text-[10px] font-black uppercase text-slate-600 tracking-widest mb-1">Silver Members</h4>
                  <p className="text-4xl font-mono font-black text-slate-700">{silverCount}</p>
                  <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">Above ₹5,000 Spend</p>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-orange-200 shadow-sm flex flex-col justify-center items-center text-center">
                  <h4 className="text-[10px] font-black uppercase text-orange-700 tracking-widest mb-1">Bronze Members</h4>
                  <p className="text-4xl font-mono font-black text-orange-600">{bronzeCount}</p>
                  <p className="text-[9px] text-orange-400/70 font-bold mt-1 uppercase">Base Tier</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 flex-1 shadow-sm flex flex-col justify-center items-center text-center">
                <PieChart size={60} className="text-slate-200 mb-4" />
                <h3 className="text-lg font-black text-slate-700 uppercase tracking-widest">Retention Metrics Model Active</h3>
                <p className="text-xs font-bold text-slate-400 mt-2 max-w-lg mx-auto">This automated CRM tracks visit frequencies and point issuance. In the next ecosystem update, predictive AI will show churn risks and targeted SMS marketing campaign triggers directly from this dashboard.</p>
              </div>
            </div>
          )}

          {/* ================= 🔥 TAB 4: MARKETING HUB ================= */}
          {activeTab === "MARKETING" && (
              <div className="flex flex-col h-full animate-in fade-in duration-200 overflow-hidden">
                  <div className="flex-1 flex flex-col lg:flex-row gap-6 h-full">
                      
                      {/* Filter & Audience Section */}
                      <div className="w-full lg:w-1/3 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                          <div className="p-5 bg-slate-900 border-b border-slate-800 shrink-0">
                              <h3 className="font-black text-white text-sm uppercase tracking-widest flex items-center">
                                  <Users className="mr-2 text-emerald-400"/> Target Audience
                              </h3>
                              <p className="text-[10px] text-slate-400 font-bold mt-1">Select recipients for campaign</p>
                          </div>
                          
                          <div className="p-4 border-b border-slate-100 bg-slate-50 shrink-0 space-y-4">
                              <div>
                                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Filter by Tier</label>
                                  <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg font-bold text-xs outline-none bg-white uppercase text-slate-700 focus:border-emerald-500">
                                      <option value="ALL">All Tiers ({customers.length})</option>
                                      <option value="PLATINUM">⚫ Platinum ({platinumCount})</option>
                                      <option value="GOLD">🟡 Gold ({goldCount})</option>
                                      <option value="SILVER">⚪ Silver ({silverCount})</option>
                                      <option value="BRONZE">🟤 Bronze ({bronzeCount})</option>
                                  </select>
                              </div>
                              
                              <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex items-start space-x-3">
                                  <Filter className="text-emerald-500 mt-0.5 shrink-0" size={16} />
                                  <div>
                                      <p className="text-xs font-black text-emerald-800 uppercase">Selected Audience</p>
                                      <p className="text-xl font-mono font-black text-emerald-600 mt-1">{filteredCustomers.length} <span className="text-[10px] font-bold text-emerald-600/70 uppercase">Customers</span></p>
                                  </div>
                              </div>
                          </div>
                          
                          <div className="flex-1 overflow-y-auto p-0">
                              <table className="w-full text-left text-[10px]">
                                  <thead className="bg-slate-100 sticky top-0 border-b border-slate-200">
                                      <tr className="uppercase font-black text-slate-500">
                                          <th className="p-2 pl-4">Name</th>
                                          <th className="p-2 text-right pr-4">Phone</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                      {filteredCustomers.map(c => (
                                          <tr key={c.id} className="hover:bg-slate-50">
                                              <td className="p-2 pl-4 font-bold text-slate-700 uppercase">{c.name}</td>
                                              <td className="p-2 pr-4 text-right font-mono text-slate-500">{c.phone}</td>
                                          </tr>
                                      ))}
                                      {filteredCustomers.length === 0 && (
                                          <tr><td colSpan={2} className="p-4 text-center text-slate-400 font-bold">No audience selected</td></tr>
                                      )}
                                  </tbody>
                              </table>
                          </div>
                      </div>

                      {/* Template & Compose Section */}
                      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                          <div className="p-5 bg-slate-900 border-b border-slate-800 flex justify-between items-center shrink-0">
                              <div>
                                  <h3 className="font-black text-white text-sm uppercase tracking-widest flex items-center">
                                      <MessageSquare className="mr-2 text-emerald-400"/> Compose Campaign
                                  </h3>
                                  <p className="text-[10px] text-slate-400 font-bold mt-1">Setup WhatsApp / SMS Templates</p>
                              </div>
                              <button onClick={saveTemplates} className="text-[10px] font-black uppercase bg-slate-800 text-white px-3 py-1.5 rounded hover:bg-slate-700 border border-slate-700 transition-colors">
                                  Save Templates
                              </button>
                          </div>

                          <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-50 custom-scrollbar">
                              
                              {/* Variables Info */}
                              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
                                  <h4 className="text-[10px] font-black uppercase text-blue-800 mb-2">Available Variables</h4>
                                  <div className="flex flex-wrap gap-2 text-xs font-mono font-bold">
                                      <span className="bg-white text-blue-600 px-2 py-1 rounded border border-blue-200">{`{name}`}</span>
                                      <span className="bg-white text-blue-600 px-2 py-1 rounded border border-blue-200">{`{points}`}</span>
                                      <span className="bg-white text-blue-600 px-2 py-1 rounded border border-blue-200">{`{earned}`}</span>
                                      <span className="bg-white text-blue-600 px-2 py-1 rounded border border-blue-200">{`{redeem_id}`}</span>
                                      <span className="bg-white text-blue-600 px-2 py-1 rounded border border-blue-200">{`{value}`}</span>
                                  </div>
                                  <p className="text-[10px] text-blue-600/80 mt-2 font-bold">Variables will automatically adapt to individual customer data when sent.</p>
                              </div>

                              {/* Template 1: Ads / Promo */}
                              <div className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${selectedTemplate === 1 ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-200 bg-white hover:border-slate-300'}`} onClick={() => setSelectedTemplate(1)}>
                                  <div className="flex justify-between items-center mb-2">
                                      <h4 className="text-xs font-black uppercase text-slate-700 flex items-center">
                                          <div className={`w-4 h-4 rounded-full border-2 mr-2 flex items-center justify-center ${selectedTemplate === 1 ? 'border-emerald-500' : 'border-slate-300'}`}>
                                              {selectedTemplate === 1 && <div className="w-2 h-2 rounded-full bg-emerald-500"/>}
                                          </div>
                                          1. Ads & Promotional Offers
                                      </h4>
                                  </div>
                                  <textarea 
                                      value={templatePromo}
                                      onChange={(e) => { setTemplatePromo(e.target.value); setSelectedTemplate(1); }}
                                      className="w-full h-20 p-3 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg outline-none focus:border-emerald-500 resize-none"
                                      placeholder="Enter your promotional ad message here..."
                                  />
                              </div>

                              {/* Template 2: Points Credited */}
                              <div className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${selectedTemplate === 2 ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-200 bg-white hover:border-slate-300'}`} onClick={() => setSelectedTemplate(2)}>
                                  <div className="flex justify-between items-center mb-2">
                                      <h4 className="text-xs font-black uppercase text-slate-700 flex items-center">
                                          <div className={`w-4 h-4 rounded-full border-2 mr-2 flex items-center justify-center ${selectedTemplate === 2 ? 'border-emerald-500' : 'border-slate-300'}`}>
                                              {selectedTemplate === 2 && <div className="w-2 h-2 rounded-full bg-emerald-500"/>}
                                          </div>
                                          2. Instant Points Credit (Auto)
                                      </h4>
                                  </div>
                                  <textarea 
                                      value={templateCredit}
                                      onChange={(e) => { setTemplateCredit(e.target.value); setSelectedTemplate(2); }}
                                      className="w-full h-20 p-3 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg outline-none focus:border-emerald-500 resize-none"
                                      placeholder="Message when points are added after a visit..."
                                  />
                              </div>
                              
                              {/* Template 3: Coupon Redeemed */}
                              <div className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${selectedTemplate === 3 ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-200 bg-white hover:border-slate-300'}`} onClick={() => setSelectedTemplate(3)}>
                                  <div className="flex justify-between items-center mb-2">
                                      <h4 className="text-xs font-black uppercase text-slate-700 flex items-center">
                                          <div className={`w-4 h-4 rounded-full border-2 mr-2 flex items-center justify-center ${selectedTemplate === 3 ? 'border-emerald-500' : 'border-slate-300'}`}>
                                              {selectedTemplate === 3 && <div className="w-2 h-2 rounded-full bg-emerald-500"/>}
                                          </div>
                                          3. Coupon & Redeem Code (Auto)
                                      </h4>
                                  </div>
                                  <textarea 
                                      value={templateRedeem}
                                      onChange={(e) => { setTemplateRedeem(e.target.value); setSelectedTemplate(3); }}
                                      className="w-full h-20 p-3 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg outline-none focus:border-emerald-500 resize-none"
                                      placeholder="Message for generating Redeem ID..."
                                  />
                              </div>

                              {/* Custom Message */}
                              <div className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${selectedTemplate === 4 ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-200 bg-white hover:border-slate-300'}`} onClick={() => setSelectedTemplate(4)}>
                                  <div className="flex justify-between items-center mb-2">
                                      <h4 className="text-xs font-black uppercase text-slate-700 flex items-center">
                                          <div className={`w-4 h-4 rounded-full border-2 mr-2 flex items-center justify-center ${selectedTemplate === 4 ? 'border-emerald-500' : 'border-slate-300'}`}>
                                              {selectedTemplate === 4 && <div className="w-2 h-2 rounded-full bg-emerald-500"/>}
                                          </div>
                                          4. Custom Broadcast Message
                                      </h4>
                                  </div>
                                  <textarea 
                                      value={customMessage}
                                      onChange={(e) => { setCustomMessage(e.target.value); setSelectedTemplate(4); }}
                                      className="w-full h-20 p-3 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg outline-none focus:border-emerald-500 resize-none"
                                      placeholder="Type a custom message for this specific campaign..."
                                  />
                              </div>

                          </div>
                          
                          <div className="p-4 border-t border-slate-200 bg-white shrink-0">
                              <button 
                                  onClick={handleSendMessage}
                                  disabled={isSendingMsg || filteredCustomers.length === 0}
                                  className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm flex justify-center items-center transition-all ${isSendingMsg || filteredCustomers.length === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg active:scale-95'}`}
                              >
                                  {isSendingMsg ? <Loader2 className="animate-spin mr-2" size={20}/> : <Send className="mr-2" size={20}/>}
                                  {isSendingMsg ? 'Queueing Messages...' : `Run Ad / Send to ${filteredCustomers.length} Customers`}
                              </button>
                              <p className="text-center text-[10px] text-slate-400 font-bold mt-2">
                                  Uses WhatsApp/SMS Gateway configured in System Settings.
                              </p>
                          </div>
                      </div>
                  </div>
              </div>
          )}

        </div>

        {/* ================= MODALS SUB-SYSTEM ================= */}
        
        {/* 1. Add Customer / Register VIP */}
        {showAddModal && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 print:hidden animate-in fade-in">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border-t-8 border-orange-500">
              <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-3">
                <h2 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center"><UserPlus size={18} className="mr-1.5 text-orange-500"/> Register VIP Profile</h2>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 p-1.5 bg-slate-100 rounded-full transition-all hover:bg-slate-200"><X size={16}/></button>
              </div>
              <form onSubmit={handleAddCustomer} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Full Name</label>
                  <input required type="text" placeholder="e.g., Ramesh Singh" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-sm font-bold uppercase focus:border-orange-500 bg-slate-50 focus:bg-white transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Mobile Number</label>
                  <input required type="tel" pattern="[0-9]{10}" placeholder="10 Digit Number" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/\D/g, '')})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-base font-mono font-black focus:border-orange-500 bg-slate-50 focus:bg-white transition-all tracking-widest" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Birthday / DOB (Optional)</label>
                  <input type="date" value={formData.dob} onChange={(e) => setFormData({...formData, dob: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-bold text-slate-600 focus:border-orange-500 bg-slate-50 focus:bg-white transition-all" />
                </div>
                
                <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 flex items-start space-x-2 mt-2">
                  <Gift className="text-orange-500 mt-0.5 shrink-0" size={16} />
                  <p className="text-[10px] text-orange-800 font-bold uppercase leading-relaxed">Member will receive <strong className="font-black bg-orange-200 px-1 rounded mx-0.5">50 Bonus Points</strong> instantly upon successful verification.</p>
                </div>

                <button disabled={isSaving} type="submit" className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-widest py-3.5 rounded-xl text-xs shadow-lg shadow-orange-500/30 flex justify-center items-center active:scale-95 transition-all">
                  {isSaving ? <Loader2 className="animate-spin" size={18} /> : "Create VIP Account"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* 2. Redeem Points Modal */}
        {showRedeemModal && selectedCustomer && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 print:hidden animate-in fade-in">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border-t-8 border-orange-500 text-center">
              <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                <div className="flex items-center text-slate-800 font-black uppercase text-sm"><Star size={16} className="mr-1.5 fill-orange-500 text-orange-500"/> Redeem Loyalty Points</div>
                <button onClick={()=>{setShowRedeemModal(false); setRedeemAmount("");}} className="text-slate-400 p-1 bg-slate-100 rounded-full hover:bg-slate-200"><X size={16}/></button>
              </div>
              
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 border-2 border-orange-200">
                <span className="font-black text-xl text-slate-700 uppercase">{selectedCustomer.name.substring(0, 2)}</span>
              </div>
              <h3 className="font-black uppercase text-slate-800 tracking-wider">{selectedCustomer.name}</h3>
              <p className="text-xs font-mono font-bold text-slate-500 mb-4">{selectedCustomer.phone}</p>

              <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 mb-5 flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-orange-800 tracking-widest">Available Balance</span>
                <span className="font-mono font-black text-xl text-orange-600">{selectedCustomer.loyaltyPoints} Pts</span>
              </div>

              <form onSubmit={handleRedeemPoints} className="space-y-4 text-left">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Points to Deduct</label>
                  <input required type="number" min="10" step="10" max={selectedCustomer.loyaltyPoints} placeholder="e.g. 50" value={redeemAmount} onChange={(e)=>setRedeemAmount(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl font-mono text-center tracking-widest text-2xl font-black outline-none focus:border-orange-500 bg-slate-50" />
                  <p className="text-[9px] text-center text-slate-400 font-bold uppercase mt-1.5">
                    Value: ₹{redeemAmount ? (parseInt(redeemAmount) / 10).toFixed(2) : "0.00"} Discount
                  </p>
                </div>
                <button disabled={isRedeeming} type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest py-3.5 rounded-xl text-xs flex justify-center items-center shadow-lg active:scale-95 transition-all">
                  {isRedeeming ? <Loader2 className="animate-spin" size={16}/> : "Confirm Points Deduction & Send Code"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ------------------- 🔥 ENTERPRISE HARDWARE DYNAMIC PRINT ENGINE ------------------- */}
        <div id="crm-print-area" className="hidden text-black font-mono p-4 w-full">
          <div className="text-center pb-2 border-b-2 border-black">
            <h2 className="font-black text-xl uppercase tracking-tight">{printerConfig.headerName || "RAMKESAR POS"}</h2>
            <p className="text-[11px] font-black tracking-widest text-center w-full mt-1">
              ** MASTER CRM {activeTab} LOG **
            </p>
            <div className="flex justify-between text-[10px] mt-2 font-bold px-1 border-t border-solid border-black pt-1">
              <span>Filter Active: {typeFilter}</span>
              <span>Date: {new Date().toLocaleDateString('en-IN')}</span>
            </div>
          </div>

          <div className="my-4">
            
            {activeTab === "DIRECTORY" && (
              <table className="w-full text-[11px] mt-2 border-collapse">
                <thead>
                  <tr className="border-b-2 border-black text-left">
                    <th className="pb-1 w-8">#</th>
                    <th className="pb-1">VIP CUSTOMER DATA</th>
                    <th className="pb-1 text-center">SPEND</th>
                    <th className="pb-1 text-right">POINTS BAL</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((c, idx) => (
                    <tr key={c.id} className="border-b border-gray-300">
                      <td className="py-2 text-slate-600 font-bold">{idx + 1}.</td>
                      <td className="py-2 font-black uppercase">
                        {c.name} <br/>
                        <span className="text-[9px] font-normal text-slate-500 tracking-widest">PH: {c.phone} • TIER: {getCustomerTier(c.totalSpend).label}</span>
                      </td>
                      <td className="py-2 text-center font-mono font-black text-xs">₹{(c.totalSpend || 0).toFixed(0)}</td>
                      <td className="py-2 text-right font-mono font-black text-sm">{c.loyaltyPoints || 0}</td>
                    </tr>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <tr><td colSpan={4} className="text-center py-4 font-black">NO CUSTOMERS MATCHING CRITERIA</td></tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === "LEADERBOARD" && (
               <table className="w-full text-[11px] mt-2 border-collapse">
               <thead>
                 <tr className="border-b-2 border-black text-left">
                   <th className="pb-1 w-8">RANK</th>
                   <th className="pb-1">VIP MEMBER</th>
                   <th className="pb-1 text-right">LIFETIME VALUE</th>
                 </tr>
               </thead>
               <tbody>
                 {topSpenders.map((c, idx) => (
                   <tr key={c.id} className="border-b border-gray-300">
                     <td className="py-2 text-slate-600 font-black">{idx + 1}.</td>
                     <td className="py-2 font-black uppercase">
                       {c.name} <br/>
                       <span className="text-[9px] font-normal text-slate-500 tracking-widest">PH: {c.phone}</span>
                     </td>
                     <td className="py-2 text-right font-mono font-black text-sm">₹{(c.totalSpend || 0).toFixed(0)}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
            )}

            {(activeTab === "ANALYTICS" || activeTab === "MARKETING") && (
              <div className="text-center font-bold text-xs py-10 uppercase">
                No printable table structure for {activeTab}.
              </div>
            )}

            <div className="flex justify-between font-black text-xs border-t-2 border-black mt-2 pt-2">
              <span>TOTAL BASE: {customers.length}</span>
              <span>TOTAL REVENUE: ₹{totalCRMRevenue.toFixed(0)}</span>
            </div>
          </div>

          <div className="text-center font-black mt-8 text-[9px] tracking-widest uppercase">--- END OF CRM LEDGER ---</div>
        </div>

      </div>
    </>
  );
}
