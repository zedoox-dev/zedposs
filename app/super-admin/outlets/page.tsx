"use client";

import { useState, useEffect } from "react";
import { 
  Store, Plus, Search, MapPin, Mail, 
  Building2, Loader2, CheckCircle2, XCircle, CreditCard, Calendar, Crown, Settings, Edit2, QrCode, ArrowRight, ShieldCheck, Clock, Key, RotateCcw
} from "lucide-react";

interface Outlet {
  id: string;
  name: string;
  code: string | null;
  address: string;
  city: string | null;
  state: string | null;
  pincode: string | null;
  email: string | null;
  phone: string | null;
  password: string | null;
  gstin: string | null;
  fssaiNo: string | null;
  licenseNo: string | null;
  openTime: string | null;
  closeTime: string | null;
  isActive: boolean;
  tenant: {
    id: string;
    businessName: string;
    ownerEmail: string;
    plan?: { id: string; name: string; maxOutlets: number; price: number; } | null;
  };
  createdAt: string;
}

interface Tenant { id: string; businessName: string; }
interface SubscriptionPlan { id: string; name: string; price: number; maxOutlets: number; }

export default function OutletsPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState(1); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [editOutletData, setEditOutletData] = useState<Outlet | null>(null);

  // Reactivation states
  const [isReactivateModalOpen, setIsReactivateModalOpen] = useState(false);
  const [reactivateStep, setReactivateStep] = useState(1); // 1: Plan, 2: QR, 3: UTR, 4: Success
  const [reactivateData, setReactivateData] = useState<Outlet | null>(null);
  const [reactivateForm, setReactivateForm] = useState({ planId: "", utrNumber: "" });

  const [formData, setFormData] = useState({
    tenantId: "", planId: "",
    name: "", code: "", address: "", city: "", state: "", pincode: "",
    email: "", phone: "", password: "",
    gstin: "", fssaiNo: "", licenseNo: "",
    openTime: "08:00", closeTime: "22:00",
    utrNumber: ""
  });

  const [editFormData, setEditFormData] = useState({
    name: "", address: "", email: "", password: "", phone: "", gst: "", fssai: "", isActive: true
  });

  useEffect(() => {
    fetchInitialData();
    fetchTenants();
  }, []);

  const fetchInitialData = async () => {
    try {
      const res = await fetch("/api/super-admin/outlets");
      const data = await res.json();
      if (data.success) {
        setOutlets(data.outlets);
        setPlans(data.subscriptionPlans || []); 
      }
    } catch (error) {
      console.error("Failed to load outlets");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      const res = await fetch("/api/super-admin/tenants");
      const data = await res.json();
      if (data.success) setTenants(data.tenants);
    } catch (error) {
      console.error("Failed to fetch tenants");
    }
  };

  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.phone) {
      alert("Email, Phone, and Password are required for POS Login.");
      return;
    }
    setModalStep(2);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/super-admin/outlets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      
      if (data.success) {
        setModalStep(4);
        fetchInitialData();
      } else {
        alert("⚠️ Error: " + data.error);
        setModalStep(3);
      }
    } catch (error) {
      alert("Network Connection Refused");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateOutlet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editOutletData) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/super-admin/outlets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editOutletData.id, ...editFormData }),
      });
      const data = await res.json();
      if (data.success) {
        setEditOutletData(null);
        fetchInitialData();
        alert("✅ Configuration customized successfully.");
      } else {
        alert("⚠️ Update Denied: " + data.error);
      }
    } catch (error) {
      alert("Network sync timeout error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReactivateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reactivateData) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/super-admin/outlets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: reactivateData.id,
          tenantId: reactivateData.tenant.id,
          planId: reactivateForm.planId,
          utrNumber: reactivateForm.utrNumber,
          reactivate: true
        }),
      });
      const data = await res.json();
      if (data.success) {
        setReactivateStep(4); // Success pop-up
        fetchInitialData();
      } else {
        alert("⚠️ Error: " + data.error);
        setReactivateStep(3);
      }
    } catch (error) {
      alert("Network Connection Refused");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (outlet: Outlet) => {
    setEditFormData({
      name: outlet.name,
      address: outlet.address,
      email: outlet.email || "",
      password: outlet.password || "",
      phone: outlet.phone || "",
      gst: outlet.gstin || "",
      fssai: outlet.fssaiNo || "",
      isActive: outlet.isActive
    });
    setEditOutletData(outlet);
  };

  const resetAndCloseModal = () => {
    setFormData({
      tenantId: "", planId: "", name: "", code: "", address: "", city: "", state: "", pincode: "",
      email: "", phone: "", password: "", gstin: "", fssaiNo: "", licenseNo: "", openTime: "08:00", closeTime: "22:00", utrNumber: ""
    });
    setModalStep(1);
    setIsModalOpen(false);
  };

  const resetReactivateModal = () => {
    setReactivateData(null);
    setReactivateForm({ planId: "", utrNumber: "" });
    setReactivateStep(1);
    setIsReactivateModalOpen(false);
  };

  const selectedPlan = plans.find(p => p.id === formData.planId);
  const upiId = "8650937216@yapl";
  const upiUri = `upi://pay?pa=${upiId}&pn=RamKesar%20SaaS&am=${selectedPlan?.price || 0}&tn=Plan_${selectedPlan?.id || ''}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUri)}`;

  const reactivateSelectedPlan = plans.find(p => p.id === reactivateForm.planId);
  const reactivateUpiUri = `upi://pay?pa=${upiId}&pn=RamKesar%20SaaS&am=${reactivateSelectedPlan?.price || 0}&tn=Plan_${reactivateSelectedPlan?.id || ''}`;
  const reactivateQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(reactivateUpiUri)}`;

  const getValidityDetails = (createdAt: string) => {
    const createdDate = new Date(createdAt);
    const validTill = new Date(createdDate.setDate(createdDate.getDate() + 30)); 
    const today = new Date();
    const diffTime = validTill.getTime() - today.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      validTill: validTill.toLocaleDateString('en-GB'),
      daysLeft: daysLeft > 0 ? daysLeft : 0,
      isActive: daysLeft > 0
    };
  };

  const filteredOutlets = outlets.filter(o => 
    o.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    o.id.includes(searchQuery) ||
    o.tenant?.businessName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) return (
    <div className="w-full h-screen flex flex-col items-center justify-center">
      <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
      <p className="text-xs font-black uppercase tracking-widest text-slate-500">Mapping Outlet Network...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-300">
      
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center uppercase tracking-tight">
            <Store className="mr-3 text-blue-600" size={28} />
            Global Outlets
          </h1>
          <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">
            Manage physical stores & enforce SaaS limits.
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center transition-all shadow-lg active:scale-95">
          <Plus size={16} className="mr-2" /> Provision New Outlet
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex items-center justify-between">
        <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-slate-500">
          <span className="bg-slate-100 px-3 py-1.5 rounded-lg mr-3 border border-slate-200">
            Total Active Outlets: <span className="text-blue-600 ml-1">{outlets.filter(o => o.isActive).length}</span>
          </span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" placeholder="Search Outlet ID, Name or Brand..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-72 pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 transition-all" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-widest font-black text-slate-500">
              <th className="p-4">Outlet Details</th>
              <th className="p-4">Linked Brand (Tenant)</th>
              <th className="p-4">SaaS Subscription</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm font-semibold text-slate-700 divide-y divide-slate-100">
            {filteredOutlets.map((outlet) => {
              const validity = getValidityDetails(outlet.createdAt);
              return (
                <tr key={outlet.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">{outlet.id}</span>
                      <p className="font-black text-slate-900 uppercase text-xs">{outlet.name} {outlet.code && `(${outlet.code})`}</p>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 flex items-start font-bold">
                      <MapPin size={10} className="mr-1 mt-0.5 shrink-0" /> {outlet.address}
                    </p>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col items-start gap-1">
                      <span className="flex items-center text-[10px] bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-100 font-black uppercase tracking-widest">
                        <Building2 size={12} className="mr-1.5" /> {outlet.tenant?.businessName}
                      </span>
                      <span className="text-[9px] font-mono font-bold text-slate-500 flex items-center">
                        <Mail size={9} className="mr-1"/> {outlet.email}
                      </span>
                      <span className="text-[9px] font-mono font-bold text-slate-500 flex items-center">
                        <Key size={9} className="mr-1"/> {outlet.password}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col items-start gap-1.5">
                      <span className={`flex items-center text-[9px] px-2 py-1 rounded font-black uppercase tracking-widest border ${outlet.tenant?.plan?.name === 'PRO' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                        <CreditCard size={10} className="mr-1" /> {outlet.tenant?.plan?.name || "N/A"} PLAN
                      </span>
                      <span className="flex items-center text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                        <Calendar size={10} className="mr-1"/> Ends: {validity.validTill}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      {outlet.isActive ? (
                        <span className="flex items-center text-[9px] uppercase font-black tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full">
                          <CheckCircle2 size={10} className="mr-1" /> Active
                        </span>
                      ) : (
                        <span className="flex items-center text-[9px] uppercase font-black tracking-widest text-red-600 bg-red-50 border border-red-100 px-2 py-1 rounded-full">
                          <XCircle size={10} className="mr-1" /> Inactive
                        </span>
                      )}
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                        {validity.daysLeft} Days Left
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2 w-full">
                      {!outlet.isActive && (
                        <button onClick={() => { setReactivateData(outlet); setIsReactivateModalOpen(true); }} className="px-3 py-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center text-[10px] font-black uppercase tracking-widest border border-emerald-200">
                          <RotateCcw size={14} className="mr-1" /> Reactivate
                        </button>
                      )}
                      <button onClick={() => openEditModal(outlet)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center text-[10px] font-black uppercase tracking-widest">
                        <Edit2 size={14} /> Edit
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* --- REACTIVATION MODAL --- */}
      {isReactivateModalOpen && reactivateData && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden border-t-8 border-emerald-500 flex flex-col max-h-[90vh]">
            <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-black text-slate-800 flex items-center uppercase tracking-tight">
                  <RotateCcw size={18} className="mr-2 text-emerald-600" /> 
                  {reactivateStep === 1 ? "Step 1: Select Plan" : reactivateStep === 2 ? "Step 2: Pay to Reactivate" : reactivateStep === 3 ? "Step 3: Verify UTR" : "Reactivation Successful"}
                </h3>
                <p className="text-[10px] font-mono text-indigo-600 font-bold mt-1 bg-indigo-50 w-fit px-2 py-0.5 rounded border border-indigo-100">OUTLET ID: {reactivateData.id}</p>
              </div>
              <button onClick={resetReactivateModal} className="text-slate-400 hover:text-slate-700 bg-white p-2 rounded-full border border-slate-200"><XCircle size={16} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar">
              {reactivateStep === 1 && (
                <form onSubmit={(e) => { e.preventDefault(); setReactivateStep(2); }} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-emerald-800 mb-1.5 flex items-center">
                      <CreditCard size={12} className="mr-1"/> Select Plan to Reactivate *
                    </label>
                    <select required value={reactivateForm.planId} onChange={(e) => setReactivateForm({...reactivateForm, planId: e.target.value})} className="w-full px-4 py-3 bg-white border border-emerald-200 rounded-xl text-xs font-bold uppercase outline-none focus:border-emerald-500">
                      <option value="" disabled>Select Plan...</option>
                      {plans.map(p => <option key={p.id} value={p.id}>{p.name} (₹{p.price})</option>)}
                    </select>
                  </div>
                  <div className="pt-4 flex justify-end border-t border-slate-100">
                    <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg px-8 py-3 flex items-center">
                      Proceed to Pay <ArrowRight size={14} className="ml-2"/>
                    </button>
                  </div>
                </form>
              )}

              {reactivateStep === 2 && (
                <div className="flex flex-col items-center text-center space-y-6">
                  <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl border border-emerald-200 w-full">
                    <h4 className="font-black uppercase tracking-widest text-xs mb-1">Total Payable</h4>
                    <p className="text-xl font-black">₹{reactivateSelectedPlan?.price}</p>
                  </div>
                  <div className="p-4 bg-white border-2 border-slate-200 shadow-sm rounded-3xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={reactivateQrUrl} alt="UPI QR Code" className="w-48 h-48 rounded-xl object-contain" />
                  </div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Scan to pay via UPI</p>
                  <div className="w-full flex justify-between pt-4 border-t border-slate-100">
                    <button type="button" onClick={() => setReactivateStep(1)} className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Back</button>
                    <button type="button" onClick={() => setReactivateStep(3)} className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-600/20 px-8 py-3 flex items-center">
                      Proceed to UTR Verification <ArrowRight size={14} className="ml-2" />
                    </button>
                  </div>
                </div>
              )}

              {reactivateStep === 3 && (
                <form onSubmit={handleReactivateSubmit} className="space-y-6">
                  <div className="w-full max-w-md mx-auto">
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 text-center">Enter Payment UTR / Transaction ID *</label>
                    <input required type="text" value={reactivateForm.utrNumber} onChange={(e) => setReactivateForm({...reactivateForm, utrNumber: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl text-sm font-mono font-black focus:border-emerald-500 outline-none text-center" placeholder="12-Digit UTR Number" />
                  </div>
                  <div className="w-full flex justify-between pt-4 border-t border-slate-100">
                    <button type="button" onClick={() => setReactivateStep(2)} className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Back to QR</button>
                    <button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-600/20 px-8 py-3 disabled:opacity-50 flex items-center">
                      {isSubmitting ? <Loader2 size={16} className="animate-spin mr-2" /> : <ShieldCheck size={16} className="mr-2" />} Submit & Reactivate
                    </button>
                  </div>
                </form>
              )}

              {reactivateStep === 4 && (
                <div className="flex flex-col items-center justify-center py-10 space-y-4 text-center">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center animate-bounce">
                    <CheckCircle2 size={40} className="text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Outlet Reactivated!</h2>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">30-day billing cycle successfully reset.</p>
                  <div className="mt-8">
                    <button onClick={resetReactivateModal} className="bg-slate-900 hover:bg-black text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                      Go to Dashboard
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- ONBOARDING WIZARD MODAL (Rest code remains perfectly untouched) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden border-t-8 border-blue-600 flex flex-col max-h-[90vh]">
            
            <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-black text-slate-800 flex items-center uppercase tracking-tight">
                  {modalStep === 1 ? <Store size={18} className="mr-2 text-blue-600" /> : modalStep === 2 ? <QrCode size={18} className="mr-2 text-blue-600" /> : <ShieldCheck size={18} className="mr-2 text-emerald-600" />}
                  {modalStep === 1 ? "Step 1: Details & Credentials" : modalStep === 2 ? "Step 2: Plan Payment" : modalStep === 3 ? "Step 3: UTR Verification" : "Deployment Successful"}
                </h3>
              </div>
              <button onClick={resetAndCloseModal} className="text-slate-400 hover:text-slate-700 bg-white p-2 rounded-full border border-slate-200"><XCircle size={16} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar">
              {/* STEP 1: Details */}
              {modalStep === 1 && (
                <form onSubmit={handleProceedToPayment} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-blue-800 mb-1.5 flex items-center">
                        <Building2 size={12} className="mr-1"/> 1. Link to Brand ID *
                      </label>
                      <select required value={formData.tenantId} onChange={(e) => setFormData({...formData, tenantId: e.target.value})} className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl text-xs font-mono font-bold outline-none">
                        <option value="" disabled>Select Brand...</option>
                        {tenants.map(t => <option key={t.id} value={t.id}>{t.businessName} (ID: {t.id})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-blue-800 mb-1.5 flex items-center">
                        <CreditCard size={12} className="mr-1"/> 2. Choose Subscription *
                      </label>
                      <select required value={formData.planId} onChange={(e) => setFormData({...formData, planId: e.target.value})} className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl text-xs font-bold uppercase outline-none">
                        <option value="" disabled>Select Plan...</option>
                        {plans.map(p => <option key={p.id} value={p.id}>{p.name} (₹{p.price})</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Outlet Name *</label>
                      <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase outline-none" placeholder="e.g. Lajpat Nagar Branch" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Store Code</label>
                      <input type="text" value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase outline-none" placeholder="LN-001" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Login Email *</label>
                      <input required type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none" placeholder="store@ramkesar.com" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Login Password *</label>
                      <input required type="text" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none" placeholder="Passcode" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Store Phone *</label>
                      <input required type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none" placeholder="+91..." />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="col-span-3">
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Address *</label>
                      <input required type="text" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none" placeholder="Street Info..." />
                    </div>
                    <div><input type="text" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none" placeholder="City" /></div>
                    <div><input type="text" value={formData.state} onChange={(e) => setFormData({...formData, state: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none" placeholder="State" /></div>
                    <div><input type="text" value={formData.pincode} onChange={(e) => setFormData({...formData, pincode: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none" placeholder="Pincode" /></div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                    <div><input type="text" value={formData.gstin} onChange={(e) => setFormData({...formData, gstin: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase outline-none" placeholder="GSTIN" /></div>
                    <div><input type="text" value={formData.fssaiNo} onChange={(e) => setFormData({...formData, fssaiNo: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase outline-none" placeholder="FSSAI NO" /></div>
                    <div><input type="text" value={formData.licenseNo} onChange={(e) => setFormData({...formData, licenseNo: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none" placeholder="Trade License" /></div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button type="submit" className="bg-slate-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg px-8 py-3 flex items-center">
                      Generate QR <ArrowRight size={14} className="ml-2"/>
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2: Only QR Code */}
              {modalStep === 2 && (
                <div className="flex flex-col items-center text-center space-y-6">
                  <div className="bg-amber-50 text-amber-700 p-4 rounded-xl border border-amber-200 w-full max-w-sm">
                    <h4 className="font-black uppercase tracking-widest text-xs mb-1">Total Payable</h4>
                    <p className="text-xl font-black">₹{selectedPlan?.price}</p>
                  </div>

                  <div className="p-4 bg-white border-2 border-slate-200 shadow-sm rounded-3xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrCodeUrl} alt="UPI QR Code" className="w-48 h-48 rounded-xl object-contain" />
                  </div>
                  
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Scan to pay via UPI</p>

                  <div className="w-full flex justify-between pt-4 border-t border-slate-100">
                    <button type="button" onClick={() => setModalStep(1)} className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Back</button>
                    <button type="button" onClick={() => setModalStep(3)} className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-600/20 px-8 py-3 flex items-center">
                      Proceed to UTR Verification <ArrowRight size={14} className="ml-2" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Details Summary & UTR Entry */}
              {modalStep === 3 && (
                <form onSubmit={handleFinalSubmit} className="space-y-6">
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 border-b border-slate-200 pb-2">Outlet Deployment Summary</h4>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm font-bold text-slate-600">
                      <div><span className="text-[10px] text-slate-400 block uppercase">Outlet Name:</span> {formData.name}</div>
                      <div><span className="text-[10px] text-slate-400 block uppercase">Brand Linked:</span> {tenants.find(t => t.id === formData.tenantId)?.businessName}</div>
                      <div><span className="text-[10px] text-slate-400 block uppercase">Login Email:</span> {formData.email}</div>
                      <div><span className="text-[10px] text-slate-400 block uppercase">Plan Selected:</span> {selectedPlan?.name} (₹{selectedPlan?.price})</div>
                    </div>
                  </div>

                  <div className="w-full max-w-md mx-auto">
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 text-center">Enter Payment UTR / Transaction ID *</label>
                    <input required type="text" value={formData.utrNumber} onChange={(e) => setFormData({...formData, utrNumber: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl text-sm font-mono font-black focus:border-blue-500 outline-none text-center" placeholder="12-Digit UTR Number" />
                  </div>

                  <div className="w-full flex justify-between pt-4 border-t border-slate-100">
                    <button type="button" onClick={() => setModalStep(2)} className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Back to QR</button>
                    <button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-600/20 px-8 py-3 disabled:opacity-50 flex items-center">
                      {isSubmitting ? <Loader2 size={16} className="animate-spin mr-2" /> : <ShieldCheck size={16} className="mr-2" />} Submit & Deploy
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 4: Success Pop-up */}
              {modalStep === 4 && (
                <div className="flex flex-col items-center justify-center py-10 space-y-4 text-center">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center animate-bounce">
                    <CheckCircle2 size={40} className="text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">System Deployed!</h2>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Outlet generated with unique 7-digit ID. Login credentials active.</p>
                  
                  <div className="mt-8">
                    <button onClick={resetAndCloseModal} className="bg-slate-900 hover:bg-black text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                      Go to Dashboard
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- RESTORED: EDIT / CONFIGURATION MODAL --- */}
      {editOutletData && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden border-t-8 border-amber-500 flex flex-col max-h-[90vh]">
            <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-black text-slate-800 flex items-center uppercase tracking-tight">
                  <Settings size={18} className="mr-2 text-amber-500" /> Manage Configurations
                </h3>
                <p className="text-[10px] font-mono text-indigo-600 font-bold mt-1 bg-indigo-50 w-fit px-2 py-0.5 rounded border border-indigo-100">OUTLET ID: {editOutletData.id}</p>
              </div>
              <button onClick={() => setEditOutletData(null)} className="text-slate-400 hover:text-slate-700 bg-white p-2 rounded-full border border-slate-200"><XCircle size={16} /></button>
            </div>
            
            <form onSubmit={handleUpdateOutlet} className="p-6 overflow-y-auto custom-scrollbar space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Outlet Name</label>
                  <input required type="text" value={editFormData.name} onChange={(e) => setEditFormData({...editFormData, name: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs font-bold uppercase outline-none focus:border-amber-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">POS Login Password</label>
                  <input type="text" value={editFormData.password} onChange={(e) => setEditFormData({...editFormData, password: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none focus:border-amber-500" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Full Address</label>
                <textarea required rows={2} value={editFormData.address} onChange={(e) => setEditFormData({...editFormData, address: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-amber-500 resize-none" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Contact Email</label>
                  <input type="email" value={editFormData.email} onChange={(e) => setEditFormData({...editFormData, email: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-amber-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Store Phone</label>
                  <input type="text" value={editFormData.phone} onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none focus:border-amber-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">GST Number</label>
                  <input type="text" value={editFormData.gst} onChange={(e) => setEditFormData({...editFormData, gst: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase outline-none focus:border-amber-500" />
                </div>
              </div>

              <div className="pt-4 flex justify-between items-center border-t border-slate-100">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={editFormData.isActive} onChange={(e) => setEditFormData({...editFormData, isActive: e.target.checked})} className="w-5 h-5 text-amber-600 rounded border-slate-300 focus:ring-amber-500" />
                  <div>
                    <span className="text-xs font-black uppercase text-slate-800 block">Outlet Operations Status</span>
                    <span className="text-[9px] font-bold text-slate-400 tracking-widest uppercase">Toggle to suspend operations</span>
                  </div>
                </label>
                
                <div className="flex gap-3">
                  <button type="button" onClick={() => setEditOutletData(null)} className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg px-8 py-3 disabled:opacity-50 flex items-center">
                    {isSubmitting ? <Loader2 size={16} className="animate-spin mr-2" /> : null} Save Details
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
