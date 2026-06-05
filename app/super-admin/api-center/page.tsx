"use client";
import { useState, useEffect } from "react";
import { Code2, Webhook, Key, Plus, Trash2, Copy, Save, Loader2, EyeOff, Eye, ShieldAlert, Link2, CheckCircle2, X } from "lucide-react";

export default function ApiCenterPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // States for API Keys
  const [showAddKeyModal, setShowAddKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/super-admin/api-center");
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
      }
    } catch (e) {
      console.error("Failed to load API config");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWebhooks = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/super-admin/api-center", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhooks: config.webhooks })
      });
      if (res.ok) alert("✅ Webhooks saved securely!");
    } catch (e) {
      alert("Failed to save webhooks.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const res = await fetch("/api/super-admin/api-center", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setConfig(data.config);
        setShowAddKeyModal(false);
        setNewKeyName("");
      }
    } catch (e) {
      alert("Failed to generate API key.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevokeKey = async (id: string, name: string) => {
    if (!confirm(`⚠️ WARNING: Revoking the "${name}" key will instantly break all integrations using it. Proceed?`)) return;
    try {
      const res = await fetch("/api/super-admin/api-center", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setConfig(data.config);
      }
    } catch (e) {
      alert("Failed to revoke key.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (loading || !config) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Accessing Secure Vault...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto h-full flex flex-col animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
            <Code2 className="mr-2 text-indigo-600" /> Developer API & Webhooks
          </h1>
          <p className="text-xs text-slate-500 font-bold mt-1 tracking-wide">Manage system API access keys and external webhook integrations.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 overflow-hidden pb-10">
        
        {/* COLUMN 1: API KEYS */}
        <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center">
              <Key size={16} className="mr-2 text-indigo-500"/> Master API Keys
            </h2>
            <button onClick={() => setShowAddKeyModal(true)} className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-wider flex items-center shadow-sm active:scale-95 transition-all">
              <Plus size={14} className="mr-1.5" /> Generate Key
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
            {config.apiKeys.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <Key size={48} className="mb-4 opacity-20" />
                <p className="font-black text-sm uppercase tracking-widest">No API Keys Generated</p>
                <p className="text-[10px] font-bold mt-1">Create a key to grant external ERP access.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {config.apiKeys.map((k: any) => (
                  <div key={k.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm hover:border-indigo-200 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-black text-slate-800 uppercase text-xs">{k.name}</h3>
                        <p className="text-[9px] font-mono text-slate-400 mt-0.5">Created: {new Date(k.createdAt).toLocaleDateString('en-IN')}</p>
                      </div>
                      <button onClick={() => handleRevokeKey(k.id, k.name)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md transition-colors" title="Revoke Key">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-slate-50 text-slate-700 font-mono text-xs px-3 py-2 rounded-lg border border-slate-200 truncate">
                        {k.key}
                      </code>
                      <button onClick={() => copyToClipboard(k.key)} className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 p-2 rounded-lg transition-colors border border-indigo-100 flex items-center justify-center">
                        {copiedKey === k.key ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 2: WEBHOOKS */}
        <div className="flex-1 flex flex-col bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden relative">
          <Webhook size={120} className="absolute -right-8 -bottom-8 text-white/5" />
          
          <div className="p-5 border-b border-slate-800 flex justify-between items-center shrink-0 relative z-10">
            <h2 className="text-sm font-black uppercase tracking-widest text-white flex items-center">
              <Link2 size={16} className="mr-2 text-blue-400"/> System Webhooks
            </h2>
            <button type="button" onClick={() => setShowSecret(!showSecret)} className="text-[10px] font-black uppercase text-slate-400 hover:text-white flex items-center transition-colors">
              {showSecret ? <EyeOff size={14} className="mr-1"/> : <Eye size={14} className="mr-1"/>} {showSecret ? "Hide" : "Reveal"}
            </button>
          </div>

          <form onSubmit={handleSaveWebhooks} className="p-5 flex-1 overflow-y-auto custom-scrollbar relative z-10 space-y-6">
            
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-widest flex items-center">
                Slack Alert Endpoint
              </label>
              <input 
                type="url" 
                placeholder="https://hooks.slack.com/services/..." 
                value={config.webhooks.slackAlertsUrl} 
                onChange={(e) => setConfig({...config, webhooks: {...config.webhooks, slackAlertsUrl: e.target.value}})} 
                className="w-full p-3 bg-slate-800/50 border border-slate-700 rounded-xl outline-none text-xs font-mono font-bold text-white focus:border-blue-500 transition-colors" 
              />
              <p className="text-[9px] font-bold text-slate-500 mt-1">Used to send critical system errors to your Slack channel.</p>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-widest flex items-center">
                Zapier / Make.com Webhook
              </label>
              <input 
                type="url" 
                placeholder="https://hooks.zapier.com/hooks/catch/..." 
                value={config.webhooks.zapierIntegrationUrl} 
                onChange={(e) => setConfig({...config, webhooks: {...config.webhooks, zapierIntegrationUrl: e.target.value}})} 
                className="w-full p-3 bg-slate-800/50 border border-slate-700 rounded-xl outline-none text-xs font-mono font-bold text-white focus:border-blue-500 transition-colors" 
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-widest flex items-center">
                Razorpay Webhook Secret
              </label>
              <input 
                type={showSecret ? "text" : "password"} 
                placeholder="Enter Secret" 
                value={config.webhooks.razorpayWebhookSecret} 
                onChange={(e) => setConfig({...config, webhooks: {...config.webhooks, razorpayWebhookSecret: e.target.value}})} 
                className="w-full p-3 bg-slate-800/50 border border-slate-700 rounded-xl outline-none text-xs font-mono font-bold text-white focus:border-blue-500 transition-colors" 
              />
              <p className="text-[9px] font-bold text-slate-500 mt-1">Required to verify payment signatures from Razorpay securely.</p>
            </div>

            <div className="pt-6 border-t border-slate-800">
              <button disabled={isSaving} type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest py-3.5 rounded-xl text-xs shadow-lg shadow-blue-900/50 active:scale-95 transition-all flex justify-center items-center">
                {isSaving ? <Loader2 className="animate-spin" size={16}/> : "Update Webhook Targets"}
              </button>
            </div>
          </form>

        </div>
      </div>

      {/* --- ADD KEY MODAL --- */}
      {showAddKeyModal && (
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border-t-8 border-indigo-600 relative overflow-hidden">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center"><Key size={18} className="mr-2 text-indigo-600"/> Generate API Key</h2>
              </div>
              <button onClick={() => setShowAddKeyModal(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full transition-colors"><X size={18}/></button>
            </div>

            <form onSubmit={handleGenerateKey} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">Identifier / App Name</label>
                <input required type="text" placeholder="e.g. Tally ERP Sync" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-sm font-bold uppercase focus:border-indigo-500 bg-slate-50 focus:bg-white transition-colors" />
              </div>

              <div className="pt-2">
                <button disabled={isGenerating} type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest py-3.5 rounded-xl text-xs shadow-xl active:scale-95 transition-all flex justify-center items-center">
                  {isGenerating ? <Loader2 className="animate-spin" size={16}/> : "Generate Key"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
