"use client";
import { useEffect, useState } from "react";
import { WalletCards, Plus, Loader2, ReceiptText, ArrowRightLeft, UserCircle, Upload, FileText, QrCode, Phone, RefreshCw, Trash2, X } from "lucide-react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";

export default function ExpensesPage() {
  const params = useParams();
  const outletId = params.outletId as string;
  const { data: session } = useSession();

  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Date Filters
  const [dateFilter, setDateFilter] = useState("today"); 
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Report Metrics
  const [cashCollected, setCashCollected] = useState(0);

  // Forms Management States
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ expenseType: "", amount: "", paidTo: "", narration: "", doar: "", proofUrl: "" });
  
  const [expenseTypes, setExpenseTypes] = useState<string[]>([]);
  const [doars, setDoars] = useState<string[]>([]);
  
  const [newMasterType, setNewMasterType] = useState("");
  const [newMasterDoar, setNewMasterDoar] = useState("");

  const [isAddingType, setIsAddingType] = useState(false);
  const [isAddingDoar, setIsAddingDoar] = useState(false);

  const [isFormOnlyMode, setIsFormOnlyMode] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [qrSalt, setQrSalt] = useState<string>(""); 
  const [isCheckingRoute, setIsCheckingRoute] = useState(true);

  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("view") === "form-only") {
        setIsFormOnlyMode(true);
        const urlSalt = searchParams.get("salt");
        const activeSalt = localStorage.getItem(`zap_qr_salt_${outletId}`);
        if (activeSalt && urlSalt !== activeSalt) {
          setIsExpired(true);
        }
      } else {
        let activeSalt = localStorage.getItem(`zap_qr_salt_${outletId}`);
        if (!activeSalt) {
          activeSalt = Date.now().toString();
          localStorage.setItem(`zap_qr_salt_${outletId}`, activeSalt);
        }
        setQrSalt(activeSalt);
        const currentUrl = `${window.location.origin}${window.location.pathname}?view=form-only&salt=${activeSalt}`;
        setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(currentUrl)}`);
      }
      setIsCheckingRoute(false);
    }

    const savedTypes = localStorage.getItem(`zapped_exp_types_${outletId}`);
    const savedDoars = localStorage.getItem(`zapped_doars_${outletId}`);
    
    if (savedTypes) setExpenseTypes(JSON.parse(savedTypes));
    else setExpenseTypes(["STAFF FOOD", "RAW MATERIAL", "MAINTENANCE", "ELECTRICITY", "GENERAL"]);

    if (savedDoars) setDoars(JSON.parse(savedDoars));
    else setDoars(["Admin", "Manager", "Deepak", "Chotu", "Varinder", "Raju"]);
  }, [outletId]);

  useEffect(() => {
    if (!isFormOnlyMode && !isCheckingRoute && session?.user) {
      fetchExpensesAndCash();
    } else if (isFormOnlyMode) {
      setLoading(false);
    }
  }, [dateFilter, customStartDate, customEndDate, outletId, isFormOnlyMode, isCheckingRoute, session]);

  const fetchExpensesAndCash = async () => {
    if (!session?.user) return;
    setLoading(true);
    try {
      let queryParams = `?outletId=${outletId}&date=${dateFilter}`;
      if (dateFilter === "custom" && customStartDate && customEndDate) {
        queryParams += `&startDate=${customStartDate}&endDate=${customEndDate}`;
      }

      const expRes = await fetch(`/api/expenses${queryParams}`);
      const expData = await expRes.json();
      
      if (expData.success) {
        setExpenses(expData.expenses || []);
        setCashCollected(expData.cashCollected || 0);
      } else {
        setExpenses(Array.isArray(expData) ? expData : []);
      }
    } catch (err) {
      console.error("Error connecting metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.expenseType || !formData.doar) return alert("Please select Type and Doar");
    
    setIsSaving(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, outletId })
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        alert("🎉 Expense Recorded Successfully!");
        setFormData({ expenseType: "", amount: "", paidTo: "", narration: "", doar: "", proofUrl: "" });
        if (!isFormOnlyMode) fetchExpensesAndCash(); 
      } else {
        alert(`⚠️ Save Failed: ${data.error || "Validation error."}`);
      }
    } catch (error) {
      alert("Network Error");
    } finally {
      setIsSaving(false);
    }
  };

  const simulateImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, proofUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const addMasterDataInline = (type: "TYPE" | "DOAR") => {
    if (type === "TYPE" && newMasterType.trim()) {
      const updated = [...expenseTypes, newMasterType.trim().toUpperCase()];
      setExpenseTypes(updated);
      localStorage.setItem(`zapped_exp_types_${outletId}`, JSON.stringify(updated));
      setFormData({ ...formData, expenseType: newMasterType.trim().toUpperCase() });
      setNewMasterType("");
    } else if (type === "DOAR" && newMasterDoar.trim()) {
      const updated = [...doars, newMasterDoar.trim()];
      setDoars(updated);
      localStorage.setItem(`zapped_doars_${outletId}`, JSON.stringify(updated));
      setFormData({ ...formData, doar: newMasterDoar.trim() });
      setNewMasterDoar("");
    }
  };

  const removeMasterItem = (type: "TYPE" | "DOAR", val: string) => {
    if (!val) return;
    if (type === "TYPE") {
      const updated = expenseTypes.filter(t => t !== val);
      setExpenseTypes(updated);
      localStorage.setItem(`zapped_exp_types_${outletId}`, JSON.stringify(updated));
      setFormData({ ...formData, expenseType: "" });
    } else if (type === "DOAR") {
      const updated = doars.filter(d => d !== val);
      setDoars(updated);
      localStorage.setItem(`zapped_doars_${outletId}`, JSON.stringify(updated));
      setFormData({ ...formData, doar: "" });
    }
  };

  const handleRegenerateQr = () => {
    const newSalt = Date.now().toString();
    setQrSalt(newSalt);
    localStorage.setItem(`zap_qr_salt_${outletId}`, newSalt);
    const currentUrl = `${window.location.origin}${window.location.pathname}?view=form-only&salt=${newSalt}`;
    setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(currentUrl)}`);
    alert("🔄 Old QR links expired! Brand fresh secure URL parameters sync locked.");
  };

  const totalExpense = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const availableBalance = cashCollected - totalExpense;

  if (isCheckingRoute) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-900 flex flex-col items-center justify-center p-4">
        <Loader2 className="animate-spin text-white mb-2" size={32} />
        <p className="text-xs font-bold text-slate-400 tracking-wider uppercase">Verifying Terminal Path...</p>
      </div>
    );
  }

  if (isFormOnlyMode) {
    if (isExpired) {
      return (
        <div className="fixed inset-0 z-[9999] bg-slate-900 flex flex-col items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center animate-in fade-in zoom-in">
            <X size={50} className="mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Link Expired</h2>
            <p className="text-sm font-bold text-slate-500">This entry link is no longer valid. Please contact your manager for a new QR code.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-[9999] bg-slate-900 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in my-auto">
          <div className="text-center mb-6 border-b border-slate-100 pb-3">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center justify-center">
              <Phone size={20} className="mr-2 text-red-500 animate-pulse"/> ZAP Mobile Entry
            </h2>
            <p className="text-slate-400 text-xs font-bold mt-1">Terminal ID Connection Activated</p>
          </div>

          <form onSubmit={handleAddExpense} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Expenses Type</label>
                <select required value={formData.expenseType} onChange={(e) => setFormData({...formData, expenseType: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold bg-white">
                  <option value="" disabled>Select Type...</option>
                  {expenseTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Doar (Exp By)</label>
                <select required value={formData.doar} onChange={(e) => setFormData({...formData, doar: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold bg-white">
                  <option value="" disabled>Select Person...</option>
                  {doars.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Amount (₹)</label><input required type="number" min="1" step="any" placeholder="0.00" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-red-500 font-mono font-black text-red-600 text-lg" /></div>
            <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Paid To</label><input required type="text" placeholder="Vendor / Staff Name" value={formData.paidTo} onChange={(e) => setFormData({...formData, paidTo: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold" /></div>
            <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Narration</label><textarea required rows={2} placeholder="Reason detail..." value={formData.narration} onChange={(e) => setFormData({...formData, narration: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold resize-none" /></div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Upload Receipt Image</label>
              <label className="flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-3 cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                <Upload size={16} className="text-slate-400 mr-2"/><span className="text-xs font-bold text-slate-500">{formData.proofUrl ? "Proof Image Loaded ✔" : "Take Photo / Choose File"}</span>
                <input type="file" accept="image/*" onChange={simulateImageUpload} className="hidden" />
              </label>
            </div>

            <button disabled={isSaving} type="submit" className="w-full bg-slate-900 text-white font-black uppercase tracking-wider py-3.5 rounded-xl text-xs flex justify-center items-center">
              {isSaving ? <Loader2 className="animate-spin" size={16} /> : "Submit Mobile Entry"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      <title>ZedPoss | Petty Cash & Expense Manager</title>
      <meta name="description" content="Track your restaurant's daily expenses, petty cash, and vendor payouts dynamically. Secure expense logging by ZedooX Technologies." />
      
      <div className="flex h-full relative overflow-hidden bg-slate-50">
        
        {/* LEFT PANEL */}
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-5 mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center"><WalletCards className="mr-2 text-red-500" /> Petty Cash Registry</h1>
              <p className="text-xs text-slate-500 font-bold mt-0.5">Enterprise Expense Ledger & Smart Sync Matrix</p>
            </div>
            
            <div className="flex items-center gap-2">
              <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="p-2.5 border border-slate-200 rounded-xl font-black text-xs uppercase tracking-wider bg-white shadow-xs outline-none focus:border-red-500">
                <option value="today">Today Accounts</option><option value="yesterday">Yesterday Closed</option><option value="custom">Custom Range Lookup</option>
              </select>
              {dateFilter === "custom" && (
                <div className="flex items-center gap-2 animate-in fade-in">
                  <input type="date" value={customStartDate} onChange={(e)=>setCustomStartDate(e.target.value)} className="p-2 border border-slate-200 rounded-xl text-xs font-bold" />
                  <input type="date" value={customEndDate} onChange={(e)=>setCustomEndDate(e.target.value)} className="p-2 border border-slate-200 rounded-xl text-xs font-bold" />
                </div>
              )}
            </div>
          </div>

          {/* FINANCIAL DATA STATS */}
          <div className="flex flex-col xl:flex-row gap-4 mb-6">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex flex-col justify-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Cash Collected</span>
                <p className="text-xl font-mono font-black text-slate-900">₹{Number(cashCollected).toFixed(2)}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-xs flex flex-col justify-center">
                <span className="text-[10px] font-black text-red-400 uppercase tracking-widest block mb-1">Total Expenses</span>
                <p className="text-xl font-mono font-black text-red-600">- ₹{Number(totalExpense).toFixed(2)}</p>
              </div>
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-md flex flex-col justify-center">
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-1">Drawer Balance</span>
                <p className="text-2xl font-mono font-black text-emerald-400">₹{Number(availableBalance).toFixed(2)}</p>
              </div>
            </div>
            
            {/* QR CODE BLOCK */}
            {qrCodeUrl && (
              <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200 shrink-0 flex items-center space-x-3 shadow-xs relative group">
                <img src={qrCodeUrl} alt="Scan to Enter Kharcha" className="w-[75px] h-[75px] border border-slate-100 rounded" />
                <div className="max-w-[130px]">
                  <span className="text-[9px] font-black uppercase text-orange-600 tracking-wider flex items-center"><QrCode size={12} className="mr-1"/> Mobile Scan</span>
                  <p className="text-[9px] font-bold text-slate-400 mt-0.5 leading-tight">Log vouchers from camera device instantly.</p>
                  <button type="button" onClick={handleRegenerateQr} className="mt-1.5 px-2 py-1 bg-slate-900 text-white font-black text-[8px] uppercase rounded flex items-center hover:bg-red-600 transition-all active:scale-95">
                    <RefreshCw size={8} className="mr-1 animate-spin duration-1000"/> Regenerate QR
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* TABULAR LAYOUT GRIDS */}
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            {loading ? (
              <div className="flex-1 flex justify-center items-center"><Loader2 className="animate-spin text-red-500" size={40} /></div>
            ) : expenses.length === 0 ? (
              <div className="flex-1 flex flex-col justify-center items-center text-slate-400">
                <ReceiptText size={60} className="mb-4 opacity-20" />
                <p className="font-black text-xl text-slate-500 uppercase tracking-tight">No Expenses Found</p>
              </div>
            ) : (
              <div className="overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-100/90 backdrop-blur-sm z-10 border-b border-slate-200">
                    <tr className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      <th className="p-4 w-20">Exp ID</th>
                      <th className="p-4 w-44">Date & Time</th>
                      <th className="p-4 w-32">Expenses Type</th>
                      <th className="p-4">Narration / Reason</th>
                      <th className="p-4 w-32">Paid To</th>
                      <th className="p-4 w-28">Doar (By)</th>
                      <th className="p-4 w-20 text-center">Attachment</th>
                      <th className="p-4 w-28 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                    {expenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-black text-slate-800">#{exp.expenseId}</td>
                        <td className="p-4 font-bold text-slate-500">{new Date(exp.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</td>
                        <td className="p-4"><span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">{exp.expenseType}</span></td>
                        <td className="p-4 font-bold text-slate-800">{exp.narration}</td>
                        <td className="p-4 font-bold text-slate-600">{exp.paidTo}</td>
                        <td className="p-4 font-bold text-slate-500">{exp.doar}</td>
                        <td className="p-4 text-center">
                          {exp.proofUrl ? (
                            <button type="button" onClick={() => setPreviewImage(exp.proofUrl)} className="text-blue-500 hover:underline font-black text-[10px] flex items-center justify-center mx-auto"><FileText size={14} className="mr-0.5"/> VIEW</button>
                          ) : <span className="text-slate-300 font-bold">-</span>}
                        </td>
                        <td className="p-4 font-black text-red-600 text-right font-mono text-sm">- ₹{Number(exp.amount).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ----------------- RIGHT INPUT PANEL ----------------- */}
        <div className="w-[400px] bg-white border-l border-slate-200 shadow-xl z-20 flex flex-col overflow-y-auto custom-scrollbar">
          <div className="p-6 flex-1">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center mb-6"><Plus size={18} className="mr-2 text-red-500"/> Record New Expense</h2>

            <form onSubmit={handleAddExpense} className="space-y-5">
              
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 space-y-2">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-black uppercase text-slate-600 tracking-wider">Expenses Type</label>
                  <button type="button" onClick={() => setIsAddingType(!isAddingType)} className="text-[9px] font-bold text-blue-600 uppercase hover:underline">
                    {isAddingType ? "Select Existing" : "+ Add New"}
                  </button>
                </div>
                
                {isAddingType ? (
                  <div className="flex gap-1">
                    <input type="text" placeholder="Add Custom Type..." value={newMasterType} onChange={(e) => setNewMasterType(e.target.value)} className="flex-1 p-2 border border-slate-200 rounded-xl text-xs font-bold uppercase outline-none focus:border-red-500 bg-white" />
                    <button type="button" onClick={() => { addMasterDataInline("TYPE"); setIsAddingType(false); }} className="bg-slate-900 text-white px-4 rounded-xl font-black text-[10px] uppercase active:scale-95 transition-transform">Add</button>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    <select required={!isAddingType} value={formData.expenseType} onChange={(e) => setFormData({...formData, expenseType: e.target.value})} className="flex-1 p-2 border border-slate-200 rounded-xl text-xs font-bold outline-none bg-white focus:border-red-500">
                      <option value="" disabled>Choose...</option>
                      {expenseTypes.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                    {formData.expenseType && !["STAFF FOOD", "RAW MATERIAL", "MAINTENANCE", "ELECTRICITY", "GENERAL"].includes(formData.expenseType) && (
                      <button type="button" onClick={() => removeMasterItem("TYPE", formData.expenseType)} className="p-2 text-red-500 bg-white hover:bg-red-50 rounded-xl border border-slate-200 shadow-xs"><Trash2 size={13}/></button>
                    )}
                  </div>
                )}
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 space-y-2">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-black uppercase text-slate-600 tracking-wider">Doar (Exp By)</label>
                  <button type="button" onClick={() => setIsAddingDoar(!isAddingDoar)} className="text-[9px] font-bold text-blue-600 uppercase hover:underline">
                    {isAddingDoar ? "Select Existing" : "+ Add New"}
                  </button>
                </div>
                
                {isAddingDoar ? (
                  <div className="flex gap-1">
                    <input type="text" placeholder="Add Custom Doar..." value={newMasterDoar} onChange={(e) => setNewMasterDoar(e.target.value)} className="flex-1 p-2 border border-slate-200 rounded-xl text-xs font-bold capitalize outline-none focus:border-red-500 bg-white" />
                    <button type="button" onClick={() => { addMasterDataInline("DOAR"); setIsAddingDoar(false); }} className="bg-slate-900 text-white px-4 rounded-xl font-black text-[10px] uppercase active:scale-95 transition-transform">Add</button>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    <select required={!isAddingDoar} value={formData.doar} onChange={(e) => setFormData({...formData, doar: e.target.value})} className="flex-1 p-2 border border-slate-200 rounded-xl text-xs font-bold outline-none bg-white focus:border-red-500">
                      <option value="" disabled>Choose...</option>
                      {doars.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    {formData.doar && !["Admin", "Manager", "Deepak"].includes(formData.doar) && (
                      <button type="button" onClick={() => removeMasterItem("DOAR", formData.doar)} className="p-2 text-red-500 bg-white hover:bg-red-50 rounded-xl border border-slate-200 shadow-xs"><Trash2 size={13}/></button>
                    )}
                  </div>
                )}
              </div>

              <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Amount (₹)</label><input required type="number" min="1" step="any" placeholder="0.00" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl outline-none font-mono font-black text-red-600 text-lg" /></div>
              <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Paid To</label><input required type="text" placeholder="Vendor / Person name" value={formData.paidTo} onChange={(e) => setFormData({...formData, paidTo: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold" /></div>
              <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Narration</label><textarea required rows={2} placeholder="Reason specification..." value={formData.narration} onChange={(e) => setFormData({...formData, narration: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold resize-none" /></div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Upload Receipt Image</label>
                <label className="flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-2.5 cursor-pointer bg-slate-50 hover:bg-slate-100 shadow-xs">
                  <Upload size={14} className="text-slate-400 mr-2" /><span className="text-[11px] font-bold text-slate-500">{formData.proofUrl ? "Proof Image Attached ✔" : "Choose Image File"}</span>
                  <input type="file" accept="image/*" onChange={simulateImageUpload} className="hidden" />
                </label>
              </div>

              <button disabled={isSaving} type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black uppercase py-3.5 rounded-xl text-[11px] tracking-wider flex justify-center items-center transition-all shadow-md">{isSaving ? <Loader2 className="animate-spin" size={16} /> : "Process Deduction"}</button>
            </form>
          </div>
        </div>

        {/* OVERLAY PROOF PREVIEW MODAL */}
        {previewImage && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex flex-col items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-4 max-w-lg w-full shadow-2xl relative animate-in zoom-in duration-200">
              <div className="flex justify-between items-center mb-3 border-b pb-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800">Petty Cash Receipt Voucher Proof</span>
                <button type="button" onClick={() => setPreviewImage(null)} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors"><X size={16}/></button>
              </div>
              <div className="w-full max-h-[70vh] overflow-y-auto rounded-2xl bg-slate-50 border border-slate-200 p-2 flex justify-center items-center">
                {previewImage.startsWith("data:image/") ? (
                  <img src={previewImage} alt="Voucher Attachment" className="max-w-full h-auto rounded-xl object-contain shadow" />
                ) : (
                  <div className="p-8 text-center text-slate-500 text-xs font-bold space-y-2">
                    <FileText size={40} className="mx-auto text-slate-300"/>
                    <p>Cloud URL String Node:</p>
                    <p className="font-mono bg-slate-200 p-2 rounded text-[10px] break-all">{previewImage}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
