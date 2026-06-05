"use client";
import { useState, useEffect } from "react";
import { Settings, Mail, CreditCard, MessageSquare, Save, Loader2, ShieldCheck, Server, Eye, EyeOff, Globe } from "lucide-react";

export default function GlobalSettingsPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("GENERAL");
  const [showSecrets, setShowSecrets] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/super-admin/settings");
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
      }
    } catch (e) {
      console.error("Failed to load platform config");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/super-admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("✅ Master Configuration Saved Successfully!");
      } else {
        alert("⚠️ Failed to save settings.");
      }
    } catch (e) {
      alert("Network Error.");
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (key: string, value: string) => {
    setConfig({ ...config, [key]: value });
  };

  if (loading || !config) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Decrypting Master Configuration...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto h-full flex flex-col animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
            <Settings className="mr-2 text-slate-700" /> Platform Configuration
          </h1>
          <p className="text-xs text-slate-500 font-bold mt-1 tracking-wide">Manage global variables, SMTP email, and Payment Gateway API keys.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg">
            <ShieldCheck size={14} className="mr-1.5"/> File-System Protected
          </div>
          <button onClick={handleSaveConfig} disabled={isSaving} className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center shadow-lg active:scale-95 transition-all">
            {isSaving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />} 
            {isSaving ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 flex-1 overflow-hidden">
        
        {/* Navigation Sidebar */}
        <div className="w-full md:w-64 shrink-0 flex flex-col gap-2">
          <button onClick={() => setActiveTab("GENERAL")} className={`px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center transition-all ${activeTab === "GENERAL" ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>
            <Globe size={16} className="mr-2.5"/> General Info
          </button>
          <button onClick={() => setActiveTab("EMAIL_SMTP")} className={`px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center transition-all ${activeTab === "EMAIL_SMTP" ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>
            <Mail size={16} className="mr-2.5"/> Email (SMTP)
          </button>
          <button onClick={() => setActiveTab("PAYMENT_GATEWAYS")} className={`px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center transition-all ${activeTab === "PAYMENT_GATEWAYS" ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>
            <CreditCard size={16} className="mr-2.5"/> Gateways (Keys)
          </button>
          <button onClick={() => setActiveTab("COMMUNICATION")} className={`px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center transition-all ${activeTab === "COMMUNICATION" ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>
            <MessageSquare size={16} className="mr-2.5"/> SMS & WhatsApp
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-y-auto custom-scrollbar p-6">
          <form className="space-y-6">

            {/* --- GENERAL INFO TAB --- */}
            {activeTab === "GENERAL" && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-6 border-b border-slate-100 pb-2">Global Platform Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Platform / Brand Name</label>
                    <input type="text" value={config.platformName} onChange={(e) => updateField("platformName", e.target.value)} className="w-full lg:w-2/3 p-3 border-2 border-slate-100 rounded-xl outline-none text-sm font-bold focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:w-2/3">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Support Email Address</label>
                      <input type="email" value={config.supportEmail} onChange={(e) => updateField("supportEmail", e.target.value)} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-sm font-mono font-bold focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Support Phone Number</label>
                      <input type="text" value={config.supportPhone} onChange={(e) => updateField("supportPhone", e.target.value)} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-sm font-mono font-bold focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* --- EMAIL SMTP TAB --- */}
            {activeTab === "EMAIL_SMTP" && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-6 border-b border-slate-100 pb-2 flex items-center">
                  <Server className="mr-2 text-slate-400" size={16}/> SMTP Mail Server Configuration
                </h3>
                <div className="space-y-4 lg:w-2/3">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">SMTP Host</label>
                      <input type="text" placeholder="e.g. smtp.gmail.com" value={config.smtpHost} onChange={(e) => updateField("smtpHost", e.target.value)} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-sm font-mono font-bold focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">SMTP Port</label>
                      <input type="text" placeholder="587 or 465" value={config.smtpPort} onChange={(e) => updateField("smtpPort", e.target.value)} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-sm font-mono font-bold focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">SMTP Username (Email)</label>
                    <input type="text" value={config.smtpUser} onChange={(e) => updateField("smtpUser", e.target.value)} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-sm font-mono font-bold focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">SMTP App Password</label>
                    <div className="relative">
                      <input type={showSecrets ? "text" : "password"} value={config.smtpPass} onChange={(e) => updateField("smtpPass", e.target.value)} className="w-full p-3 pr-10 border-2 border-slate-100 rounded-xl outline-none text-sm font-mono font-bold focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors" />
                      <button type="button" onClick={() => setShowSecrets(!showSecrets)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showSecrets ? <EyeOff size={16}/> : <Eye size={16}/>}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* --- PAYMENT GATEWAYS TAB --- */}
            {activeTab === "PAYMENT_GATEWAYS" && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center">
                    <ShieldCheck className="mr-2 text-emerald-500" size={16}/> Master API Keys (Financial)
                  </h3>
                  <button type="button" onClick={() => setShowSecrets(!showSecrets)} className="text-[10px] font-black uppercase text-blue-600 flex items-center bg-blue-50 px-2 py-1 rounded">
                    {showSecrets ? <EyeOff size={12} className="mr-1"/> : <Eye size={12} className="mr-1"/>} {showSecrets ? "Hide Keys" : "Reveal Keys"}
                  </button>
                </div>

                <div className="space-y-6 lg:w-3/4">
                  {/* Razorpay */}
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                    <h4 className="font-black uppercase text-xs text-blue-700 mb-4 tracking-wider">Razorpay Configuration</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Key ID</label>
                        <input type="text" placeholder="rzp_live_XXXXXX" value={config.razorpayKey} onChange={(e) => updateField("razorpayKey", e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl outline-none text-sm font-mono font-bold focus:border-blue-500 bg-white" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Key Secret</label>
                        <input type={showSecrets ? "text" : "password"} placeholder="Enter Secret" value={config.razorpaySecret} onChange={(e) => updateField("razorpaySecret", e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl outline-none text-sm font-mono font-bold focus:border-blue-500 bg-white" />
                      </div>
                    </div>
                  </div>

                  {/* Stripe */}
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                    <h4 className="font-black uppercase text-xs text-indigo-700 mb-4 tracking-wider">Stripe Configuration</h4>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Secret Key</label>
                      <input type={showSecrets ? "text" : "password"} placeholder="sk_live_XXXXXX" value={config.stripeKey} onChange={(e) => updateField("stripeKey", e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl outline-none text-sm font-mono font-bold focus:border-indigo-500 bg-white" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* --- COMMUNICATION TAB --- */}
            {activeTab === "COMMUNICATION" && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-6 border-b border-slate-100 pb-2">SMS & WhatsApp APIs</h3>
                <div className="space-y-6 lg:w-2/3">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest flex items-center"><MessageSquare size={12} className="mr-1.5 text-emerald-500"/> Meta WhatsApp Business Token</label>
                    <div className="relative">
                      <input type={showSecrets ? "text" : "password"} placeholder="EAAG..." value={config.whatsappApiToken} onChange={(e) => updateField("whatsappApiToken", e.target.value)} className="w-full p-3 pr-10 border-2 border-slate-100 rounded-xl outline-none text-sm font-mono font-bold focus:border-emerald-500 bg-slate-50 focus:bg-white transition-colors" />
                      <button type="button" onClick={() => setShowSecrets(!showSecrets)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showSecrets ? <EyeOff size={16}/> : <Eye size={16}/>}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">MSG91 / Fast2SMS Auth Key</label>
                    <div className="relative">
                      <input type={showSecrets ? "text" : "password"} value={config.msg91Key} onChange={(e) => updateField("msg91Key", e.target.value)} className="w-full p-3 pr-10 border-2 border-slate-100 rounded-xl outline-none text-sm font-mono font-bold focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors" />
                      <button type="button" onClick={() => setShowSecrets(!showSecrets)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showSecrets ? <EyeOff size={16}/> : <Eye size={16}/>}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </form>
        </div>
      </div>

    </div>
  );
}
