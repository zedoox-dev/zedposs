"use client";
import { useState, useEffect } from "react";
import { 
  MapPin, Map, Plus, Store, Loader2, Users, FileText,
  Settings, Building2, AlertTriangle, X, Mail, Key,
  CheckCircle2, XCircle, ShieldCheck, QrCode, ArrowRight, Clock, Phone
} from "lucide-react";

export default function OutletsAndRegionsPage() {
  const [data, setData] = useState<{ regions: any[], unassignedOutlets: any[], allOutlets: any[], tenantPlan: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals States
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [showOutletModal, setShowOutletModal] = useState(false);
  const [viewDetailsModal, setViewDetailsModal] = useState<any>(null); // For "View Details" logic
  const [isSaving, setIsSaving] = useState(false);

  // Onboarding Wizard States
  const [modalStep, setModalStep] = useState(1); 
  const [generatedOutletId, setGeneratedOutletId] = useState("");

  // Forms
  const [regionName, setRegionName] = useState("");
  const [outletForm, setOutletForm] = useState({
    name: "", address: "", city: "", state: "", pincode: "", 
    email: "", phone: "", password: "",
    gstin: "", fssaiNo: "", licenseNo: "",
    openTime: "08:00", closeTime: "22:00",
    regionId: "NONE", utrNumber: ""
  });

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

  const handleCreateOutlet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outletForm.utrNumber) return alert("Please enter the UTR Transaction ID after payment.");
    setIsSaving(true);
    try {
      const res = await fetch("/api/brand/outlets", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType: "CREATE_OUTLET", ...outletForm })
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setGeneratedOutletId(json.outlet.code); // Store the 7-digit ID for success screen
        setModalStep(3);
        fetchNetworkData();
      } else {
        alert(json.error || "Failed to create Outlet");
      }
    } catch (e) { alert("Network Error"); } 
    finally { setIsSaving(false); }
  };

  const resetAndCloseOutletModal = () => {
    setShowOutletModal(false);
    setModalStep(1);
    setGeneratedOutletId("");
    setOutletForm({ name: "", address: "", city: "", state: "", pincode: "", email: "", phone: "", password: "", gstin: "", fssaiNo: "", licenseNo: "", openTime: "08:00", closeTime: "22:00", regionId: "NONE", utrNumber: "" });
  };

  const getValidityDetails = (createdAt: string) => {
    const createdDate = new Date(createdAt);
    const validTill = new Date(createdDate.setDate(createdDate.getDate() + 30)); 
    const today = new Date();
    const diffTime = validTill.getTime() - today.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return daysLeft > 0 ? daysLeft : 0;
  };

  if (loading || !data) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Mapping Enterprise Network...</p>
      </div>
    );
  }

  const totalOutlets = data.allOutlets.length;
  const filteredAllOutlets = data.allOutlets.filter((o: any) => 
    o.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (o.code && o.code.includes(searchQuery))
  );

  // Dynamic Payment QR Data
  const planPrice = data.tenantPlan?.price || 2999; // Default if plan not loaded
  const upiUri = `upi://pay?pa=8650937216@yapl&pn=RamKesar%20SaaS&am=${planPrice}&tn=Outlet_Provision`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUri)}`;

  return (
    <div className="max-w-[1400px] mx-auto animate-in fade-in duration-300 h-full flex flex-col pb-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0">
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
            <Map className="mr-2" size={14} /> Add Region Zone
          </button>
          <button onClick={() => setShowOutletModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-sm shadow-indigo-500/30 transition-all active:scale-95">
            <Plus className="mr-1.5" size={16} /> Launch Branch
          </button>
        </div>
      </div>

      {/* Network Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 shrink-0">
        <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 flex items-center justify-between shadow-sm">
          <div><span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Total Active Outlets</span><p className="text-3xl font-mono font-black text-indigo-700 mt-1">{totalOutlets}</p></div>
          <Store size={32} className="text-indigo-200" />
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
          <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Defined Regions</span><p className="text-3xl font-mono font-black text-slate-800 mt-1">{data.regions.length}</p></div>
          <Map size={32} className="text-slate-200" />
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
          <div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Standalone Branches</span><p className="text-3xl font-mono font-black text-slate-800 mt-1">{data.unassignedOutlets.length}</p></div>
          <AlertTriangle size={32} className="text-slate-200" />
        </div>
      </div>

      <div className="flex-1 flex flex-col xl:flex-row gap-6 overflow-hidden">
        
        {/* Left Side: Regions Grid View */}
        <div className="w-full xl:w-1/3 flex flex-col h-full overflow-hidden">
          <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider mb-4 border-b border-slate-200 pb-2 shrink-0">Zones Mapping Grid</h3>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
            {data.regions.map((region) => (
              <div key={region.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-black text-slate-800 uppercase tracking-tight flex items-center"><Map className="mr-2 text-indigo-500" size={14}/> {region.name}</h3>
                  <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded uppercase tracking-widest border border-indigo-100">{region.outlets.length} Branches</span>
                </div>
                <div className="p-4 grid grid-cols-1 gap-3">
                  {region.outlets.length === 0 ? (
                    <p className="text-[10px] font-bold text-slate-400 p-3 border border-dashed border-slate-200 rounded-xl text-center">No branches assigned.</p>
                  ) : (
                    region.outlets.map((outlet: any) => (
                      <div key={outlet.id} className="p-3 border border-slate-200 rounded-xl bg-slate-50/50 flex items-center justify-between">
                        <div>
                           <h4 className="font-black text-xs text-slate-900 uppercase">{outlet.name}</h4>
                           <p className="text-[9px] font-bold text-slate-500 mt-0.5 truncate max-w-[200px] flex items-center"><MapPin size={10} className="mr-1"/> {outlet.address}</p>
                        </div>
                        {outlet.isActive ? <CheckCircle2 size={16} className="text-emerald-500"/> : <Clock size={16} className="text-amber-500"/>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}

            {data.unassignedOutlets.length > 0 && (
              <div className="bg-white rounded-2xl border border-amber-200 overflow-hidden shadow-sm border-t-4 border-t-amber-400">
                <div className="p-4 bg-amber-50 border-b border-amber-100 flex justify-between items-center">
                  <h3 className="font-black text-slate-800 uppercase tracking-tight flex items-center"><AlertTriangle className="mr-2 text-amber-500" size={14}/> Standalone Branches</h3>
                </div>
                <div className="p-4 grid grid-cols-1 gap-3">
                  {data.unassignedOutlets.map((outlet: any) => (
                    <div key={outlet.id} className="p-3 border border-slate-200 rounded-xl flex items-center justify-between">
                      <div>
                         <h4 className="font-black text-xs text-slate-900 uppercase">{outlet.name}</h4>
                         <p className="text-[9px] font-bold text-slate-500 mt-0.5 truncate max-w-[200px]"><MapPin size={10} className="inline mr-1"/> {outlet.address}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Detailed Master Data Table */}
        <div className="w-full xl:w-2/3 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Complete Outlet Roster</h3>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
              <input type="text" placeholder="Search Code or Name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500 bg-white" />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="bg-white sticky top-0 border-b border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400 z-10 shadow-sm">
                <tr>
                  <th className="p-4">Sys Code & Name</th>
                  <th className="p-4">Region Assigned</th>
                  <th className="p-4 text-center">Status / Days Left</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm font-bold text-slate-700">
                {filteredAllOutlets.length === 0 ? (
                  <tr><td colSpan={4} className="p-10 text-center"><Store size={40} className="mx-auto text-slate-200 mb-3"/><p className="text-xs font-black uppercase tracking-widest text-slate-400">No Branches Found</p></td></tr>
                ) : (
                  filteredAllOutlets.map((outlet: any) => {
                    const daysLeft = getValidityDetails(outlet.createdAt);
                    return (
                      <tr key={outlet.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-mono font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">#{outlet.code || "PENDING"}</span>
                            <span className="font-black text-slate-900 uppercase text-xs">{outlet.name}</span>
                          </div>
                          <p className="text-[9px] text-slate-400 font-bold truncate max-w-[250px]"><MapPin size={10} className="inline mr-1"/>{outlet.address}, {outlet.city}</p>
                        </td>
                        <td className="p-4 text-[9px] uppercase tracking-widest font-black text-slate-600">
                          {outlet.region?.name || <span className="text-amber-500">Standalone</span>}
                        </td>
                        <td className="p-4 text-center">
                          {outlet.isActive ? (
                            <span className="text-[9px] uppercase font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200"><CheckCircle2 size={10} className="inline mr-1" /> Active</span>
                          ) : (
                            <span className="text-[9px] uppercase font-black text-red-600 bg-red-50 px-2.5 py-1 rounded border border-red-200"><XCircle size={10} className="inline mr-1" /> Inactive / Pending</span>
                          )}
                          <div className={`text-[9px] font-black uppercase mt-1.5 ${daysLeft > 5 ? 'text-slate-400' : 'text-red-500 animate-pulse'}`}>{daysLeft} Days Valid</div>
                        </td>
                        <td className="p-4 text-right">
                          <button onClick={() => setViewDetailsModal(outlet)} className="bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors shadow-sm">View Details</button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ================= MODALS CLUSTER ================= */}

      {/* 1. ADD REGION MODAL */}
      {showRegionModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl relative border-t-8 border-indigo-600">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-3">
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center"><Map size={18} className="mr-2 text-indigo-600"/> New Zone</h2>
              <button onClick={() => setShowRegionModal(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full"><X size={18}/></button>
            </div>
            <form onSubmit={handleCreateRegion}>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-2">Zone / Area Name</label>
              <input required type="text" placeholder="e.g. South Delhi Hub" value={regionName} onChange={(e) => setRegionName(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl outline-none text-sm font-bold uppercase focus:border-indigo-500 bg-slate-50 mb-6" />
              <button disabled={isSaving} type="submit" className="w-full bg-slate-900 text-white font-black uppercase tracking-widest py-3.5 rounded-xl text-xs flex justify-center items-center active:scale-95 transition-transform shadow-lg">
                {isSaving ? <Loader2 className="animate-spin" size={16}/> : "Create Operational Zone"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. VIEW DETAILS MODAL */}
      {viewDetailsModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[150] p-4 animate-in fade-in zoom-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-6 bg-slate-900 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center"><Store size={20} className="mr-2 text-indigo-400"/> {viewDetailsModal.name}</h2>
                <div className="flex gap-2 mt-2">
                   <span className="bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded text-[10px] font-mono font-black border border-indigo-500/30">ID: #{viewDetailsModal.code || "PENDING"}</span>
                   <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${viewDetailsModal.isActive ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>{viewDetailsModal.isActive ? "ACTIVE & LIVE" : "INACTIVE / PENDING APPROVAL"}</span>
                </div>
              </div>
              <button onClick={() => setViewDetailsModal(null)} className="text-slate-400 hover:text-white p-2 rounded-full transition-colors"><X size={24}/></button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50">
               {/* Location Data */}
               <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 border-b border-indigo-100 pb-2 flex items-center"><MapPin size={12} className="mr-1.5"/> Location Data</h4>
                 <div><span className="block text-[9px] uppercase font-black text-slate-400">Address</span><span className="text-xs font-bold text-slate-800">{viewDetailsModal.address}</span></div>
                 <div className="grid grid-cols-2 gap-2">
                   <div><span className="block text-[9px] uppercase font-black text-slate-400">City</span><span className="text-xs font-bold text-slate-800">{viewDetailsModal.city || "N/A"}</span></div>
                   <div><span className="block text-[9px] uppercase font-black text-slate-400">Pincode</span><span className="text-xs font-mono font-bold text-slate-800">{viewDetailsModal.pincode || "N/A"}</span></div>
                 </div>
                 <div><span className="block text-[9px] uppercase font-black text-slate-400">State Zone</span><span className="text-xs font-bold text-slate-800">{viewDetailsModal.state || "N/A"}</span></div>
               </div>

               {/* Legal & Operations */}
               <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-600 border-b border-orange-100 pb-2 flex items-center"><FileText size={12} className="mr-1.5"/> Legal & Timing</h4>
                 <div><span className="block text-[9px] uppercase font-black text-slate-400">GSTIN Registration</span><span className="text-xs font-mono font-black text-slate-800">{viewDetailsModal.gstin || "N/A"}</span></div>
                 <div><span className="block text-[9px] uppercase font-black text-slate-400">FSSAI Number</span><span className="text-xs font-mono font-black text-slate-800">{viewDetailsModal.fssaiNo || "N/A"}</span></div>
                 <div className="grid grid-cols-2 gap-2">
                   <div><span className="block text-[9px] uppercase font-black text-slate-400">Opening Time</span><span className="text-xs font-mono font-bold text-slate-800">{viewDetailsModal.openTime || "N/A"}</span></div>
                   <div><span className="block text-[9px] uppercase font-black text-slate-400">Closing Time</span><span className="text-xs font-mono font-bold text-slate-800">{viewDetailsModal.closeTime || "N/A"}</span></div>
                 </div>
               </div>

               {/* Contact & Auth */}
               <div className="md:col-span-2 bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex flex-col md:flex-row justify-between items-center gap-4">
                 <div className="flex-1 w-full grid grid-cols-2 gap-4">
                   <div><span className="block text-[9px] uppercase font-black text-indigo-400">Branch Contact Phone</span><span className="text-sm font-mono font-black text-indigo-900 flex items-center"><Phone size={12} className="mr-1.5"/> {viewDetailsModal.phone || "N/A"}</span></div>
                   <div><span className="block text-[9px] uppercase font-black text-indigo-400">Branch Email</span><span className="text-sm font-mono font-black text-indigo-900 flex items-center"><Mail size={12} className="mr-1.5"/> {viewDetailsModal.email || "N/A"}</span></div>
                 </div>
                 <div className="bg-white p-3 rounded-xl border border-indigo-200 text-center w-full md:w-auto">
                   <span className="block text-[9px] uppercase font-black text-slate-400 mb-1">POS Master Password</span>
                   <span className="font-mono font-black tracking-widest text-slate-800 flex items-center justify-center"><Key size={12} className="mr-1.5 text-red-500"/> {viewDetailsModal.password || "Not Set"}</span>
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. MULTI-STEP OUTLET LAUNCH WIZARD */}
      {showOutletModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-in fade-in zoom-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden border-t-8 border-blue-600 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="bg-slate-50 border-b border-slate-100 p-5 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-black text-slate-800 flex items-center uppercase tracking-tight">
                  {modalStep === 1 ? <Store size={18} className="mr-2 text-blue-600" /> : modalStep === 2 ? <QrCode size={18} className="mr-2 text-blue-600" /> : <ShieldCheck size={18} className="mr-2 text-emerald-600" />}
                  {modalStep === 1 ? "Step 1: Configuration Matrix" : modalStep === 2 ? "Step 2: Provisioning Fee Auth" : "System Deployment Successful"}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Enterprise Network Expansion Wizard</p>
              </div>
              <button onClick={resetAndCloseOutletModal} className="text-slate-400 hover:text-slate-700 bg-white p-2 rounded-full border border-slate-200"><X size={16} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              
              {/* STEP 1: Details */}
              {modalStep === 1 && (
                <form onSubmit={handleProceedToPayment} className="space-y-6">
                  
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-indigo-600 border-b border-indigo-100 pb-2 mb-3">1. Primary Identifiers</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Branch Name <span className="text-red-500">*</span></label>
                        <input required type="text" value={outletForm.name} onChange={(e) => setOutletForm({...outletForm, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase outline-none focus:border-blue-500" placeholder="e.g. Lajpat Nagar Prime" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Operational Region Assignment</label>
                        <select value={outletForm.regionId} onChange={(e) => setOutletForm({...outletForm, regionId: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase outline-none focus:border-blue-500">
                          <option value="NONE">Standalone (Unassigned)</option>
                          {data.regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-black uppercase text-indigo-600 border-b border-indigo-100 pb-2 mb-3">2. Geolocation Parameters</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="col-span-1 md:col-span-3">
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Complete Address <span className="text-red-500">*</span></label>
                        <input required type="text" value={outletForm.address} onChange={(e) => setOutletForm({...outletForm, address: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500" placeholder="Plot No, Street Info..." />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">City</label>
                        <input type="text" value={outletForm.city} onChange={(e) => setOutletForm({...outletForm, city: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase outline-none focus:border-blue-500" placeholder="New Delhi" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">State</label>
                        <input type="text" value={outletForm.state} onChange={(e) => setOutletForm({...outletForm, state: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase outline-none focus:border-blue-500" placeholder="Delhi" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Pincode / Zip</label>
                        <input type="text" value={outletForm.pincode} onChange={(e) => setOutletForm({...outletForm, pincode: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none focus:border-blue-500" placeholder="110024" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-black uppercase text-indigo-600 border-b border-indigo-100 pb-2 mb-3">3. Legal & Operating Logic</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">GSTIN Registration</label>
                        <input type="text" value={outletForm.gstin} onChange={(e) => setOutletForm({...outletForm, gstin: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase outline-none focus:border-blue-500" placeholder="22AAAAA0000A1Z5"/>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">FSSAI Cert No.</label>
                        <input type="text" value={outletForm.fssaiNo} onChange={(e) => setOutletForm({...outletForm, fssaiNo: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase outline-none focus:border-blue-500" placeholder="1002001100XXXX"/>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Trade License Code</label>
                        <input type="text" value={outletForm.licenseNo} onChange={(e) => setOutletForm({...outletForm, licenseNo: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase outline-none focus:border-blue-500" placeholder="TRD-9901"/>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 flex items-center"><Clock size={10} className="mr-1"/> Shift Open Time</label>
                        <input type="time" value={outletForm.openTime} onChange={(e) => setOutletForm({...outletForm, openTime: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 flex items-center"><Clock size={10} className="mr-1"/> Shift Close Time</label>
                        <input type="time" value={outletForm.closeTime} onChange={(e) => setOutletForm({...outletForm, closeTime: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none focus:border-blue-500" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 flex items-center"><Key size={14} className="mr-2"/> Hardware Terminal Credentials</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <input type="email" placeholder="Branch Operations Email" value={outletForm.email} onChange={(e) => setOutletForm({...outletForm, email: e.target.value})} className="w-full px-4 py-3 bg-white/10 border border-slate-700 text-white rounded-xl text-xs font-mono font-bold outline-none focus:border-indigo-500 placeholder:text-slate-500" />
                      </div>
                      <div>
                        <input required type="text" placeholder="POS Master Password *" value={outletForm.password} onChange={(e) => setOutletForm({...outletForm, password: e.target.value})} className="w-full px-4 py-3 bg-white/10 border border-slate-700 text-white rounded-xl text-xs font-mono font-black tracking-widest outline-none focus:border-red-500 placeholder:text-slate-500" />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end shrink-0 border-t border-slate-100">
                    <button type="submit" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-600/30 px-8 py-4 flex items-center justify-center">
                      Authenticate & Proceed to Payment <ArrowRight size={16} className="ml-2"/>
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2: Payment & QR */}
              {modalStep === 2 && (
                <form onSubmit={handleCreateOutlet} className="flex flex-col items-center text-center space-y-6">
                  <div className="bg-amber-50 text-amber-800 p-5 rounded-2xl border border-amber-200 w-full shadow-sm">
                    <h4 className="font-black uppercase tracking-widest text-[10px] mb-2">New Branch Activation Fee (As Per Active Plan)</h4>
                    <p className="text-3xl font-mono font-black tracking-tight">₹{planPrice}</p>
                    <p className="text-[9px] font-bold mt-2 uppercase">Please scan the QR code to dispatch the activation ledger entry.</p>
                  </div>

                  <div className="p-4 bg-white border-4 border-slate-900 shadow-xl rounded-3xl relative">
                    <div className="absolute -top-3 -right-3 bg-blue-600 text-white px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest shadow-md">Verified Merchant</div>
                    <img src={qrCodeUrl} alt="UPI QR Code" className="w-52 h-52 object-contain" />
                  </div>
                  
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Direct UPI ID Routing</p>
                    <p className="font-mono text-base font-black text-slate-900 bg-slate-100 px-4 py-2 rounded-xl border border-slate-200">8650937216@yapl</p>
                  </div>

                  <div className="w-full max-w-sm mt-2">
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 text-left">Log Bank UTR / Transaction ID <span className="text-red-500">*</span></label>
                    <input required type="text" value={outletForm.utrNumber} onChange={(e) => setOutletForm({...outletForm, utrNumber: e.target.value})} className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-lg font-mono font-black focus:border-blue-600 outline-none text-center" placeholder="e.g. 312567890123" />
                  </div>

                  <div className="w-full flex justify-between pt-4 border-t border-slate-100 mt-auto shrink-0">
                    <button type="button" onClick={() => setModalStep(1)} className="px-6 py-3.5 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Back</button>
                    <button type="submit" disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-600/30 px-8 py-3.5 disabled:opacity-50 flex items-center">
                      {isSaving ? <Loader2 size={18} className="animate-spin mr-2" /> : <ShieldCheck size={18} className="mr-2" />} Verify Payment & Deploy
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 3: Success Screen */}
              {modalStep === 3 && (
                <div className="flex flex-col items-center justify-center py-12 space-y-5 text-center animate-in zoom-in duration-300">
                  <div className="w-24 h-24 bg-emerald-100 border-4 border-emerald-50 rounded-full flex items-center justify-center">
                    <CheckCircle2 size={50} className="text-emerald-600" />
                  </div>
                  
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-2">Network Expansion Confirmed!</h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest max-w-sm mx-auto leading-relaxed">
                      Payment authenticated and data node injected into the master ledger successfully.
                    </p>
                  </div>

                  <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 w-full max-w-sm mt-4 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    <span className="block text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">System Generated Outlet ID</span>
                    <span className="font-mono font-black text-4xl tracking-widest text-white block mb-4">#{generatedOutletId}</span>
                    
                    <div className="bg-white/10 p-4 rounded-xl border border-white/10 mt-2 text-left flex items-start gap-3">
                      <Phone className="text-blue-400 shrink-0" size={20}/>
                      <div>
                         <span className="block text-[9px] font-black uppercase text-blue-300 mb-0.5">Admin Hardware Setup Support</span>
                         <span className="font-mono font-black text-sm tracking-widest text-white">9990-969-838</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl w-full max-w-sm text-left">
                    <h4 className="text-[10px] font-black uppercase tracking-widest flex items-center mb-1.5"><AlertTriangle size={12} className="mr-1.5"/> Account Pending Status</h4>
                    <p className="text-[10px] font-bold leading-relaxed">This outlet terminal is currently <strong className="text-red-600">INACTIVE</strong>. It will be unlocked securely once the Super Admin verifies the UTR clearance within 24 hours.</p>
                  </div>
                  
                  <button onClick={resetAndCloseOutletModal} className="w-full max-w-sm mt-4 bg-slate-100 hover:bg-slate-200 text-slate-900 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
                    Return to Dashboard Matrix
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
