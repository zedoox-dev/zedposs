"use client";
import { useState, useEffect } from "react";
import { 
  MapPin, Map, Plus, Store, Loader2, Users, FileText, QrCode, CreditCard,
  Settings, Building2, AlertTriangle, X, Mail, Key, ShieldCheck, ArrowRight, Phone, Clock, CheckCircle2, XCircle
} from "lucide-react";

export default function OutletsAndRegionsPage() {
  const [data, setData] = useState<{ regions: any[], unassignedOutlets: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [showOutletWizard, setShowOutletWizard] = useState(false);
  const [modalStep, setModalStep] = useState(1); // 1: Details, 2: Payment, 3: Success
  const [isSaving, setIsSaving] = useState(false);
  
  // Details Modal State
  const [selectedOutletDetails, setSelectedOutletDetails] = useState<any>(null);

  // Forms
  const [regionName, setRegionName] = useState("");
  const [outletForm, setOutletForm] = useState({
    name: "", address: "", city: "", state: "", pincode: "", email: "", phone: "", 
    password: "", gstin: "", fssaiNo: "", licenseNo: "", openTime: "08:00", closeTime: "22:00", 
    regionId: "NONE", utrNumber: ""
  });
  
  const [generatedCode, setGeneratedCode] = useState("");

  useEffect(() => {
    fetchNetworkData();
  }, []);

  const fetchNetworkData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/brand/outlets");
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (e) {
      console.error("Network Sync Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRegion = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/brand/outlets", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType: "CREATE_REGION", name: regionName })
      });
      if (res.ok) {
        setShowRegionModal(false);
        setRegionName("");
        fetchNetworkData();
      }
    } catch (e) { alert("Failed to create Region"); } 
    finally { setIsSaving(false); }
  };

  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setModalStep(2);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outletForm.utrNumber) return alert("Please enter the UTR / Transaction ID after payment.");
    
    setIsSaving(true);
    try {
      const res = await fetch("/api/brand/outlets", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType: "CREATE_OUTLET", ...outletForm })
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        setGeneratedCode(resData.outlet.code); // The 7 digit code
        setModalStep(3); // Success Screen
        fetchNetworkData();
      } else {
        alert("⚠️ Error: " + resData.error);
        setModalStep(1);
      }
    } catch (error) { alert("Network Connection Refused"); } 
    finally { setIsSaving(false); }
  };

  const resetAndCloseModal = () => {
    setOutletForm({ name: "", address: "", city: "", state: "", pincode: "", email: "", phone: "", password: "", gstin: "", fssaiNo: "", licenseNo: "", openTime: "08:00", closeTime: "22:00", regionId: "NONE", utrNumber: "" });
    setModalStep(1);
    setShowOutletWizard(false);
    setGeneratedCode("");
  };

  const getValidityDetails = (createdAt: string, isActive: boolean) => {
    const createdDate = new Date(createdAt);
    const validTill = new Date(createdDate.setDate(createdDate.getDate() + 30)); 
    const today = new Date();
    const diffTime = validTill.getTime() - today.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // If days left is <= 0 or the backend says it's inactive
    const isLive = daysLeft > 0 && isActive;
    return {
      validTill: validTill.toLocaleDateString('en-GB'),
      daysLeft: daysLeft > 0 ? daysLeft : 0,
      isLive
    };
  };

  if (loading || !data) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Mapping Enterprise Network...</p>
      </div>
    );
  }

  const totalOutlets = data.regions.reduce((acc, r) => acc + r.outlets.length, 0) + data.unassignedOutlets.length;
  const upiUri = `upi://pay?pa=8650937216@yapl&pn=RamKesar%20SaaS&tn=Branch_Activation_Fee`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUri)}`;

  return (
    <div className="max-w-[1400px] mx-auto animate-in fade-in duration-300 h-full flex flex-col pb-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
            <Building2 className="mr-2 text-indigo-600" /> Network Architecture
          </h1>
          <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">
            Manage operational zones and physical store locations.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={() => setShowRegionModal(true)} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-sm transition-all active:scale-95">
            <Map className="mr-2" size={14} /> Add Region
          </button>
          <button onClick={() => setShowOutletWizard(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-sm shadow-indigo-500/30 transition-all active:scale-95">
            <Plus className="mr-1.5" size={16} /> Launch Branch
          </button>
        </div>
      </div>

      {/* Network Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 shrink-0">
        <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 flex items-center justify-between">
          <div><span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Total Monitored Outlets</span><p className="text-3xl font-mono font-black text-indigo-700 mt-1">{totalOutlets}</p></div><Store size={32} className="text-indigo-200" />
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
          <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Defined Regions</span><p className="text-3xl font-mono font-black text-slate-800 mt-1">{data.regions.length}</p></div><Map size={32} className="text-slate-200" />
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
          <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Standalone Branches</span><p className="text-3xl font-mono font-black text-slate-800 mt-1">{data.unassignedOutlets.length}</p></div><AlertTriangle size={32} className="text-slate-200" />
        </div>
      </div>

      {/* Regions & Outlets Mapping */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6">
        
        {/* Regions Mapping */}
        {data.regions.map((region) => (
          <div key={region.id} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-black text-slate-800 uppercase tracking-tight flex items-center">
                <Map className="mr-2 text-indigo-500" size={16}/> {region.name}
              </h3>
              <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded uppercase tracking-widest border border-indigo-100">
                {region.outlets.length} Branches
              </span>
            </div>
            
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {region.outlets.length === 0 ? (
                <p className="text-xs font-bold text-slate-400 p-4 border-2 border-dashed border-slate-100 rounded-xl text-center col-span-full">No branches assigned to this region yet.</p>
              ) : (
                region.outlets.map((outlet: any) => {
                  const validity = getValidityDetails(outlet.createdAt, outlet.isActive);
                  return (
                    <div key={outlet.id} className="p-5 border border-slate-200 rounded-2xl hover:border-indigo-300 transition-colors group relative flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                            <Store size={18} />
                          </div>
                          {validity.isLive ? (
                            <div className="text-right">
                              <span className="text-[9px] uppercase font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-200"><CheckCircle2 size={10} className="inline mr-1" /> Active</span>
                              <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1.5">{validity.daysLeft} Days Left</div>
                            </div>
                          ) : (
                            <div className="text-right">
                              <span className="text-[9px] uppercase font-black text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200"><XCircle size={10} className="inline mr-1" /> Inactive</span>
                              <div className="text-[9px] font-black uppercase tracking-widest text-red-400 mt-1.5">Awaiting Sync</div>
                            </div>
                          )}
                        </div>
                        <h4 className="font-black text-sm text-slate-900 uppercase leading-tight">{outlet.name}</h4>
                        <p className="text-[10px] font-mono font-bold text-indigo-500 mt-0.5">ID: {outlet.code}</p>
                        <p className="text-[10px] font-bold text-slate-500 mt-2 truncate flex items-center">
                          <MapPin size={10} className="mr-1 shrink-0"/> {outlet.address}, {outlet.city}
                        </p>
                      </div>
                      <button onClick={() => setSelectedOutletDetails(outlet)} className="mt-4 w-full bg-slate-50 hover:bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest py-2 rounded-lg border border-slate-200 transition-colors">
                        View Full Profile
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}

        {/* Unassigned / Standalone Outlets */}
        {data.unassignedOutlets.length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm border-t-4 border-t-amber-400">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-black text-slate-800 uppercase tracking-tight flex items-center">
                <AlertTriangle className="mr-2 text-amber-500" size={16}/> Standalone Branches
              </h3>
              <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-1 rounded uppercase tracking-widest border border-amber-200">
                {data.unassignedOutlets.length} Unmapped
              </span>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.unassignedOutlets.map((outlet: any) => {
                const validity = getValidityDetails(outlet.createdAt, outlet.isActive);
                return (
                  <div key={outlet.id} className="p-5 border border-slate-200 rounded-2xl hover:border-amber-300 transition-colors group relative flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                          <Store size={18} />
                        </div>
                        {validity.isLive ? (
                          <div className="text-right">
                            <span className="text-[9px] uppercase font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-200"><CheckCircle2 size={10} className="inline mr-1" /> Active</span>
                            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1.5">{validity.daysLeft} Days Left</div>
                          </div>
                        ) : (
                          <div className="text-right">
                            <span className="text-[9px] uppercase font-black text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200"><XCircle size={10} className="inline mr-1" /> Inactive</span>
                            <div className="text-[9px] font-black uppercase tracking-widest text-red-400 mt-1.5">Awaiting Sync</div>
                          </div>
                        )}
                      </div>
                      <h4 className="font-black text-sm text-slate-900 uppercase leading-tight">{outlet.name}</h4>
                      <p className="text-[10px] font-mono font-bold text-amber-600 mt-0.5">ID: {outlet.code}</p>
                      <p className="text-[10px] font-bold text-slate-500 mt-2 truncate flex items-center">
                        <MapPin size={10} className="mr-1 shrink-0"/> {outlet.address}, {outlet.city}
                      </p>
                    </div>
                    <button onClick={() => setSelectedOutletDetails(outlet)} className="mt-4 w-full bg-slate-50 hover:bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest py-2 rounded-lg border border-slate-200 transition-colors">
                      View Full Profile
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* ================= MODALS ================= */}

      {/* 1. OUTLET DETAILS PROFILE MODAL */}
      {selectedOutletDetails && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-in fade-in zoom-in duration-100">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight flex items-center"><Store size={20} className="mr-2 text-indigo-400"/> {selectedOutletDetails.name}</h2>
                <p className="text-[10px] font-mono font-bold text-slate-400 mt-1 uppercase tracking-widest">System ID: {selectedOutletDetails.code}</p>
              </div>
              <button onClick={() => setSelectedOutletDetails(null)} className="text-slate-400 hover:text-white p-2 rounded-full transition-colors"><X size={18}/></button>
            </div>
            
            <div className="overflow-y-auto p-6 flex-1 custom-scrollbar space-y-6">
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200 pb-1 mb-3">Geographic Identity</h3>
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs font-bold text-slate-700">
                  <div className="flex flex-col"><span className="text-[9px] uppercase text-slate-400">Full Address</span><span className="uppercase text-slate-900">{selectedOutletDetails.address}</span></div>
                  <div className="flex flex-col"><span className="text-[9px] uppercase text-slate-400">City / State</span><span className="uppercase text-slate-900">{selectedOutletDetails.city}, {selectedOutletDetails.state}</span></div>
                  <div className="flex flex-col"><span className="text-[9px] uppercase text-slate-400">Pincode</span><span className="font-mono text-slate-900">{selectedOutletDetails.pincode || "N/A"}</span></div>
                  <div className="flex flex-col"><span className="text-[9px] uppercase text-slate-400">Mapped Region</span><span className="uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded w-fit">{data.regions.find(r=>r.id === selectedOutletDetails.regionId)?.name || "Standalone Unassigned"}</span></div>
                </div>
              </div>
              
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200 pb-1 mb-3">Communication & Legal Info</h3>
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs font-bold text-slate-700">
                  <div className="flex flex-col"><span className="text-[9px] uppercase text-slate-400">Contact Email</span><span className="font-mono text-slate-900">{selectedOutletDetails.email || "N/A"}</span></div>
                  <div className="flex flex-col"><span className="text-[9px] uppercase text-slate-400">Support Phone</span><span className="font-mono text-slate-900">{selectedOutletDetails.phone || "N/A"}</span></div>
                  <div className="flex flex-col"><span className="text-[9px] uppercase text-slate-400">GSTIN Node</span><span className="font-mono text-slate-900 uppercase">{selectedOutletDetails.gstin || "N/A"}</span></div>
                  <div className="flex flex-col"><span className="text-[9px] uppercase text-slate-400">FSSAI / License</span><span className="font-mono text-slate-900 uppercase">{selectedOutletDetails.fssaiNo || "N/A"}</span></div>
                </div>
              </div>

              <div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200 pb-1 mb-3">POS Operations Data</h3>
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs font-bold text-slate-700">
                  <div className="flex flex-col"><span className="text-[9px] uppercase text-slate-400">Operating Hours</span><span className="font-mono text-slate-900">{selectedOutletDetails.openTime} to {selectedOutletDetails.closeTime}</span></div>
                  <div className="flex flex-col"><span className="text-[9px] uppercase text-slate-400">Terminal Secret Key</span><span className="font-mono text-slate-900 px-2 py-0.5 bg-slate-100 rounded w-fit blur-sm hover:blur-none transition-all cursor-pointer select-all">{selectedOutletDetails.password || "N/A"}</span></div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 bg-slate-50 shrink-0">
               {getValidityDetails(selectedOutletDetails.createdAt, selectedOutletDetails.isActive).isLive ? (
                 <div className="w-full text-center py-3 bg-emerald-50 text-emerald-700 font-black uppercase tracking-widest text-xs rounded-xl border border-emerald-200"><CheckCircle2 size={14} className="inline mr-1.5 mb-0.5"/> This Outlet is live & authenticated</div>
               ) : (
                 <div className="w-full text-center py-3 bg-red-50 text-red-600 font-black uppercase tracking-widest text-xs rounded-xl border border-red-200"><XCircle size={14} className="inline mr-1.5 mb-0.5"/> Outlet is Inactive / Pending Admin Approval</div>
               )}
            </div>
          </div>
        </div>
      )}

      {/* 2. REGION MODAL */}
      {showRegionModal && (
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl relative overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center"><Map size={18} className="mr-2 text-indigo-600"/> New Region Zone</h2>
              <button onClick={() => setShowRegionModal(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full"><X size={18}/></button>
            </div>
            <form onSubmit={handleCreateRegion}>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-2">Zone / Area Name</label>
              <input required type="text" placeholder="e.g. South Delhi" value={regionName} onChange={(e) => setRegionName(e.target.value)} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-sm font-bold uppercase focus:border-indigo-500 bg-slate-50 mb-6" />
              <button disabled={isSaving} type="submit" className="w-full bg-slate-900 text-white font-black uppercase tracking-widest py-3.5 rounded-xl text-xs flex justify-center items-center active:scale-95 transition-transform shadow-lg">
                {isSaving ? <Loader2 className="animate-spin" size={16}/> : "Create Logical Zone"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. 🟢 ONBOARDING WIZARD MODAL */}
      {showOutletWizard && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in zoom-in duration-100">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden border-t-8 border-indigo-600 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-black text-slate-800 flex items-center uppercase tracking-tight text-lg">
                  {modalStep === 1 ? <Store size={20} className="mr-2 text-indigo-600" /> : modalStep === 2 ? <QrCode size={20} className="mr-2 text-indigo-600" /> : <ShieldCheck size={20} className="mr-2 text-emerald-600" />}
                  {modalStep === 1 ? "Step 1: Branch Configuration Profile" : modalStep === 2 ? "Step 2: Authenticate & Pay Setup Fee" : "Deployment Successful"}
                </h3>
              </div>
              <button onClick={resetAndCloseModal} className="text-slate-400 hover:text-red-500 bg-white p-2 rounded-full border border-slate-200 transition-colors"><X size={16} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              
              {/* STEP 1: Details */}
              {modalStep === 1 && (
                <form onSubmit={handleProceedToPayment} className="space-y-6">
                  
                  {/* Basic Details */}
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-indigo-600 tracking-widest border-b border-indigo-100 pb-1 mb-3">1. Branch Identity</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Outlet Formal Name <span className="text-red-500">*</span></label>
                        <input required type="text" value={outletForm.name} onChange={(e) => setOutletForm({...outletForm, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase outline-none focus:border-indigo-500" placeholder="e.g. Lajpat Nagar Branch" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Map to Enterprise Region <span className="text-red-500">*</span></label>
                        <select required value={outletForm.regionId} onChange={(e) => setOutletForm({...outletForm, regionId: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase outline-none focus:border-indigo-500">
                          <option value="NONE">Standalone (Unassigned)</option>
                          {data.regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Location Details */}
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-indigo-600 tracking-widest border-b border-indigo-100 pb-1 mb-3">2. Geographic Coordinates</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="col-span-3 md:col-span-3">
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Full Physical Address <span className="text-red-500">*</span></label>
                        <input required type="text" value={outletForm.address} onChange={(e) => setOutletForm({...outletForm, address: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500" placeholder="Plot No, Street Info..." />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">City</label>
                        <input type="text" value={outletForm.city} onChange={(e) => setOutletForm({...outletForm, city: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 uppercase" placeholder="New Delhi" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">State</label>
                        <input type="text" value={outletForm.state} onChange={(e) => setOutletForm({...outletForm, state: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 uppercase" placeholder="Delhi" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Pincode</label>
                        <input type="text" value={outletForm.pincode} onChange={(e) => setOutletForm({...outletForm, pincode: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none focus:border-indigo-500" placeholder="110024" />
                      </div>
                    </div>
                  </div>

                  {/* Legal & Operations Details */}
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-indigo-600 tracking-widest border-b border-indigo-100 pb-1 mb-3">3. Operations & Legal Compliance</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">GSTIN Reg.</label>
                        <input type="text" value={outletForm.gstin} onChange={(e) => setOutletForm({...outletForm, gstin: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase outline-none focus:border-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">FSSAI No</label>
                        <input type="text" value={outletForm.fssaiNo} onChange={(e) => setOutletForm({...outletForm, fssaiNo: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase outline-none focus:border-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Trade License</label>
                        <input type="text" value={outletForm.licenseNo} onChange={(e) => setOutletForm({...outletForm, licenseNo: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none focus:border-indigo-500" />
                      </div>
                      <div className="col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                        <div className="col-span-2 md:col-span-1">
                          <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5"><Clock size={10} className="inline mr-1"/> Open Time</label>
                          <input type="time" value={outletForm.openTime} onChange={(e) => setOutletForm({...outletForm, openTime: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none focus:border-indigo-500" />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                          <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5"><Clock size={10} className="inline mr-1"/> Close Time</label>
                          <input type="time" value={outletForm.closeTime} onChange={(e) => setOutletForm({...outletForm, closeTime: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none focus:border-indigo-500" />
                        </div>
                        <div className="col-span-2">
                           <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5"><Key size={10} className="inline mr-1"/> POS Security Terminal Password <span className="text-red-500">*</span></label>
                           <input required type="text" value={outletForm.password} onChange={(e) => setOutletForm({...outletForm, password: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none focus:border-indigo-500" placeholder="Terminal Passcode" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 flex justify-end shrink-0">
                    <button type="submit" className="bg-slate-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg px-8 py-3.5 flex items-center active:scale-95">
                      Verify & Proceed to Setup Fee <ArrowRight size={14} className="ml-2"/>
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2: Payment & QR */}
              {modalStep === 2 && (
                <form onSubmit={handleFinalSubmit} className="flex flex-col items-center text-center space-y-6">
                  <div className="bg-amber-50 text-amber-700 p-5 rounded-2xl border border-amber-200 w-full max-w-sm">
                    <h4 className="font-black uppercase tracking-widest text-xs mb-1">Standard Outlet Setup Fee</h4>
                    <p className="text-3xl font-black font-mono">₹1,000</p>
                  </div>

                  <div className="p-4 bg-white border-2 border-slate-200 shadow-sm rounded-3xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrCodeUrl} alt="UPI QR Code" className="w-48 h-48 rounded-xl object-contain" />
                  </div>
                  
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Scan to pay securely via UPI</p>
                    <p className="font-mono text-sm font-black text-slate-800 bg-slate-100 px-4 py-2 rounded-xl border border-slate-200 tracking-wider">8650937216@yapl</p>
                  </div>

                  <div className="w-full max-w-sm mt-4">
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 text-left">Enter 12-Digit Bank UTR / Transaction ID *</label>
                    <input required type="text" value={outletForm.utrNumber} onChange={(e) => setOutletForm({...outletForm, utrNumber: e.target.value})} className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-300 rounded-xl text-lg font-mono font-black focus:border-indigo-500 outline-none text-center transition-colors" placeholder="e.g. 312345678901" />
                  </div>

                  <div className="w-full flex justify-between pt-6 border-t border-slate-100 shrink-0">
                    <button type="button" onClick={() => setModalStep(1)} className="px-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Go Back</button>
                    <button type="submit" disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-600/20 px-8 py-3.5 disabled:opacity-50 flex items-center active:scale-95">
                      {isSaving ? <Loader2 size={16} className="animate-spin mr-2" /> : <ShieldCheck size={16} className="mr-2" />} Authenticate Setup Fee
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 3: Success Pop-up */}
              {modalStep === 3 && (
                <div className="flex flex-col items-center justify-center py-10 space-y-6 text-center animate-in zoom-in duration-200">
                  <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center border-4 border-emerald-50">
                    <CheckCircle2 size={48} className="text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Database Synced!</h2>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">Outlet setup recorded. Awaiting final Admin Verification.</p>
                  </div>
                  
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 w-full max-w-sm mt-4">
                    <p className="text-[10px] font-black uppercase text-indigo-600 tracking-widest mb-2">System Generated Outlet ID</p>
                    <p className="text-4xl font-mono font-black text-slate-900 mb-6">{generatedCode}</p>
                    
                    <div className="border-t border-slate-200 pt-4">
                      <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">For Setup Configuration, Contact Support:</p>
                      <p className="text-lg font-black font-mono text-slate-800 flex items-center justify-center"><Phone size={16} className="mr-2 text-emerald-600"/> 9990-969-838</p>
                    </div>
                  </div>
                  
                  <div className="mt-8 shrink-0">
                    <button onClick={resetAndCloseModal} className="bg-slate-900 hover:bg-black text-white px-10 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl">
                      Return to Network Matrix
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
