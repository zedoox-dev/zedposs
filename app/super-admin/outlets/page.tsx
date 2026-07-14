"use client";

import { useState, useEffect } from "react";
import { 
  Store, Plus, Search, MapPin, Building2, Loader2, CheckCircle2, 
  XCircle, CreditCard, Calendar, Crown, Settings, Edit2, QrCode, ArrowRight, ShieldCheck, Clock
} from "lucide-react";
import Image from "next/image";

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
  const [modalStep, setModalStep] = useState(1); // 1: Details, 2: Payment, 3: Success
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editOutletData, setEditOutletData] = useState<Outlet | null>(null);

  // Expanded Form Data matching Prisma DB
  const [formData, setFormData] = useState({
    tenantId: "", planId: "",
    name: "", code: "", address: "", city: "", state: "", pincode: "",
    email: "", phone: "", password: "",
    gstin: "", fssaiNo: "", licenseNo: "",
    openTime: "08:00", closeTime: "22:00",
    utrNumber: ""
  });

  const [editFormData, setEditFormData] = useState({
    name: "", code: "", address: "", city: "", state: "", pincode: "",
    email: "", phone: "", password: "",
    gstin: "", fssaiNo: "", licenseNo: "",
    openTime: "", closeTime: "", isActive: true
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
    if (!formData.tenantId || !formData.planId || !formData.name || !formData.address) {
      alert("Please fill all required basic details first.");
      return;
    }
    setModalStep(2);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.utrNumber) {
      alert("Please enter the UTR / Transaction ID after payment.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/super-admin/outlets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      
      if (data.success) {
        setModalStep(3); // Go to success popup
        fetchInitialData();
      } else {
        alert("⚠️ Error: " + data.error);
        setModalStep(1); // Go back if error
      }
    } catch (error) {
      alert("Network Connection Refused");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndCloseModal = () => {
    setFormData({
      tenantId: "", planId: "", name: "", code: "", address: "", city: "", state: "", pincode: "",
      email: "", phone: "", password: "", gstin: "", fssaiNo: "", licenseNo: "", openTime: "08:00", closeTime: "22:00", utrNumber: ""
    });
    setModalStep(1);
    setIsModalOpen(false);
  };

  // Generate UPI URI & QR dynamically based on selected plan
  const selectedPlan = plans.find(p => p.id === formData.planId);
  const upiId = "8650937216@yapl";
  const upiUri = `upi://pay?pa=${upiId}&pn=RamKesar%20SaaS&am=${selectedPlan?.price || 0}&tn=Plan_${selectedPlan?.id || ''}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUri)}`;

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
      
      {/* Header Section */}
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

      {/* Main Table View */}
      {/* ... (Keep your existing Table View code here, it is perfectly fine) ... */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex items-center justify-between">
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
                    <p className="text-[10px] text-slate-500 mt-1.5 flex items-start font-bold">
                      <MapPin size={10} className="mr-1 mt-0.5 shrink-0" /> {outlet.address}, {outlet.city}
                    </p>
                  </td>
                  <td className="p-4">
                    <span className="flex w-fit items-center text-[10px] bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-100 font-black uppercase tracking-widest">
                      <Building2 size={12} className="mr-1.5" /> {outlet.tenant?.businessName}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="flex w-fit items-center text-[9px] bg-amber-50 text-amber-600 px-2 py-1 rounded border border-amber-200 font-black uppercase tracking-widest">
                      <CreditCard size={10} className="mr-1" /> {outlet.tenant?.plan?.name || "N/A"} PLAN
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    {outlet.isActive ? (
                      <span className="text-[9px] uppercase font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full"><CheckCircle2 size={10} className="inline mr-1" /> Active</span>
                    ) : (
                      <span className="text-[9px] uppercase font-black text-red-600 bg-red-50 px-2 py-1 rounded-full"><XCircle size={10} className="inline mr-1" /> Inactive</span>
                    )}
                    <div className="text-[8px] font-black uppercase text-slate-400 mt-1">{validity.daysLeft} Days Left</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* --- ONBOARDING WIZARD MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden border-t-8 border-blue-600 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-black text-slate-800 flex items-center uppercase tracking-tight">
                  {modalStep === 1 ? <Store size={18} className="mr-2 text-blue-600" /> : modalStep === 2 ? <QrCode size={18} className="mr-2 text-blue-600" /> : <ShieldCheck size={18} className="mr-2 text-emerald-600" />}
                  {modalStep === 1 ? "Step 1: Outlet Configuration" : modalStep === 2 ? "Step 2: Plan Payment" : "Deployment Successful"}
                </h3>
              </div>
              <button onClick={resetAndCloseModal} className="text-slate-400 hover:text-slate-700 bg-white p-2 rounded-full border border-slate-200"><XCircle size={16} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar">
              {/* STEP 1: Details */}
              {modalStep === 1 && (
                <form onSubmit={handleProceedToPayment} className="space-y-4">
                  {/* Linked Brand & Plan */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-blue-800 mb-1.5 flex items-center">
                        <Building2 size={12} className="mr-1"/> 1. Link to Brand ID *
                      </label>
                      <select required value={formData.tenantId} onChange={(e) => setFormData({...formData, tenantId: e.target.value})} className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl text-xs font-mono font-bold outline-none">
                        <option value="" disabled>Select Brand...</option>
                        {tenants.map(t => <option key={t.id} value={t.id}>{t.businessName}</option>)}
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

                  {/* Basic Details */}
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

                  {/* Location Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="col-span-3">
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Address *</label>
                      <input required type="text" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none" placeholder="Street Info..." />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">City</label>
                      <input type="text" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none" placeholder="New Delhi" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">State</label>
                      <input type="text" value={formData.state} onChange={(e) => setFormData({...formData, state: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none" placeholder="Delhi" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Pincode</label>
                      <input type="text" value={formData.pincode} onChange={(e) => setFormData({...formData, pincode: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none" placeholder="110024" />
                    </div>
                  </div>

                  {/* Legal & Operations Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">GSTIN</label>
                      <input type="text" value={formData.gstin} onChange={(e) => setFormData({...formData, gstin: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">FSSAI No</label>
                      <input type="text" value={formData.fssaiNo} onChange={(e) => setFormData({...formData, fssaiNo: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Trade License</label>
                      <input type="text" value={formData.licenseNo} onChange={(e) => setFormData({...formData, licenseNo: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5"><Clock size={10} className="inline"/> Open Time</label>
                      <input type="time" value={formData.openTime} onChange={(e) => setFormData({...formData, openTime: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5"><Clock size={10} className="inline"/> Close Time</label>
                      <input type="time" value={formData.closeTime} onChange={(e) => setFormData({...formData, closeTime: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none" />
                    </div>
                     <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">POS Password</label>
                      <input type="text" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none" placeholder="Passcode" />
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button type="submit" className="bg-slate-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg px-8 py-3 flex items-center">
                      Proceed to Payment <ArrowRight size={14} className="ml-2"/>
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2: Payment & QR */}
              {modalStep === 2 && (
                <form onSubmit={handleFinalSubmit} className="flex flex-col items-center text-center space-y-6">
                  <div className="bg-amber-50 text-amber-700 p-4 rounded-xl border border-amber-200 w-full">
                    <h4 className="font-black uppercase tracking-widest text-xs mb-1">Plan Activated: {selectedPlan?.name}</h4>
                    <p className="text-xl font-black">₹{selectedPlan?.price} / month</p>
                  </div>

                  <div className="p-4 bg-white border-2 border-slate-200 shadow-sm rounded-3xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrCodeUrl} alt="UPI QR Code" className="w-48 h-48 rounded-xl object-contain" />
                  </div>
                  
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Scan to pay via UPI</p>
                    <p className="font-mono text-sm font-black text-slate-800 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">{upiId}</p>
                  </div>

                  <div className="w-full max-w-sm mt-4">
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 text-left">Enter UTR / Transaction ID *</label>
                    <input required type="text" value={formData.utrNumber} onChange={(e) => setFormData({...formData, utrNumber: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-black focus:border-blue-500 outline-none text-center" placeholder="12-Digit UTR Number" />
                  </div>

                  <div className="w-full flex justify-between pt-4 border-t border-slate-100">
                    <button type="button" onClick={() => setModalStep(1)} className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Back</button>
                    <button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-600/20 px-8 py-3 disabled:opacity-50 flex items-center">
                      {isSubmitting ? <Loader2 size={16} className="animate-spin mr-2" /> : <ShieldCheck size={16} className="mr-2" />} Verify & Provision Outlet
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 3: Success Pop-up */}
              {modalStep === 3 && (
                <div className="flex flex-col items-center justify-center py-10 space-y-4 text-center">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center animate-bounce">
                    <CheckCircle2 size={40} className="text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Outlet Deployed!</h2>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Database entry, SaaS linkage, and Payment Log created successfully.</p>
                  
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
    </div>
  );
}
