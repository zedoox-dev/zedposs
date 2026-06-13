"use client";
import { useEffect, useState } from "react";
import { Package, Plus, AlertCircle, Loader2, X, Scale, Search, Filter, Printer, Layers, RefreshCcw, CheckCircle2, AlertTriangle, ArrowRightLeft, Building2, Truck, QrCode, Lock, ShieldAlert, FileSpreadsheet, Calculator, History, IndianRupee, Tag, UserCheck, CreditCard, Upload, FileText, Star, Activity, LineChart, PieChart, Coins, Trash2, LockKeyhole, ShieldCheck } from "lucide-react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { localDB } from "@/lib/localDb";

export default function InventoryAndPurchaseERP() {
  const params = useParams();
  const outletId = params.outletId as string;
  const { data: session } = useSession();

  // --- Core States ---
  const [isMounted, setIsMounted] = useState(false);
  const [activeView, setActiveView] = useState<"INVENTORY" | "PURCHASE" | "VENDORS" | "PURCHASE_ANALYTICS">("INVENTORY");
  const [inventory, setInventory] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(typeof window !== "undefined" ? navigator.onLine : true);
  const [printerConfig, setPrinterConfig] = useState<any>({ printerSize: "80mm", headerName: "RAMKESAR POS" });

  // --- Date Filters ---
  const [dateFilter, setDateFilter] = useState("today"); 
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // --- Inventory Filters & Modals ---
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [stockLedgerView, setStockLedgerView] = useState<"LIVE" | "OPENING" | "INWARD" | "CONSUMED" | "CLOSING">("LIVE");
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({ itemName: "", type: "RAW_MATERIAL", unit: "KG", stockLevel: "", minStock: "" });

  const [showIndentModal, setShowIndentModal] = useState(false);
  const [indentItem, setIndentItem] = useState<any>(null);
  const [indentQty, setIndentQty] = useState("");
  const [indentUrgency, setIndentUrgency] = useState("NORMAL");
  const [indentLogs, setIndentLogs] = useState<any[]>([]);

  const [showDeleteAuthModal, setShowDeleteAuthModal] = useState(false);
  const [deleteItemTarget, setDeleteItemTarget] = useState<any>(null);
  const [securityPasswordInput, setSecurityPasswordInput] = useState("");

  // --- Purchase Module States ---
  const [purchaseItem, setPurchaseItem] = useState("");
  const [purchaseQty, setPurchaseQty] = useState("");
  const [purchaseRate, setPurchaseRate] = useState("");
  const [purchaseGst, setPurchaseGst] = useState("0"); 
  const [purchaseVendor, setPurchaseVendor] = useState("");
  const [purchaseDoar, setPurchaseDoar] = useState("");
  const [purchasePayment, setPurchasePayment] = useState("CASH");
  const [purchaseRef, setPurchaseRef] = useState("");
  const [purchaseNotes, setPurchaseNotes] = useState(""); 
  const [isUrgent, setIsUrgent] = useState(false); 
  const [proofUrl, setProofUrl] = useState(""); 
  const [isHQ, setIsHQ] = useState(false);
  const [purchaseLogs, setPurchaseLogs] = useState<any[]>([]);
  
  const [vendors, setVendors] = useState<string[]>([]);
  const [vendorList, setVendorList] = useState<any[]>([]);
  const [staffDoars, setStaffDoars] = useState<string[]>([]); 

  const [isMobileMode, setIsMobileMode] = useState(false);
  const [mobileAccessDenied, setMobileAccessDenied] = useState(false);
  const [mobileOutletName, setMobileOutletName] = useState("");
  const [qrToken, setQrToken] = useState("");
  const [qrImageUrl, setQrImageUrl] = useState("");

  const [vendorSearch, setVendorSearch] = useState("");
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [newVendorData, setNewVendorData] = useState({ name: "", contactPerson: "", phone: "", address: "", outstanding: "0", gstin: "", rating: "5", terms: "NET_0" });
  const [showPayDueModal, setShowPayDueModal] = useState(false);
  const [selectedVendorForPay, setSelectedVendorForPay] = useState<any>(null);
  const [payDueAmount, setPayDueAmount] = useState("");

  useEffect(() => {
    setIsMounted(true);
    const handleOnline = () => { setIsOnline(true); triggerOfflineQueueSync(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const pConf = localStorage.getItem(`zapped_printer_config_${outletId}`);
    if (pConf) setPrinterConfig(JSON.parse(pConf));
    
    const savedDoars = localStorage.getItem(`zapped_doars_${outletId}`);
    if (savedDoars) setStaffDoars(JSON.parse(savedDoars));
    else setStaffDoars(["Admin", "Manager", "Deepak", "Chotu", "Varinder", "Raju"]);
    
    const savedIndents = localStorage.getItem(`zapped_indent_requests_${outletId}`);
    if (savedIndents) setIndentLogs(JSON.parse(savedIndents));

    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("view") === "purchase_mobile") {
        setIsMobileMode(true);
        const passedToken = urlParams.get("token");
        
        // Mobile Auth verification against API
        fetch(`/api/inventory?formOnly=true&outletId=${outletId}&token=${passedToken}`)
          .then(res => res.json())
          .then(data => {
            if (data.expired) setMobileAccessDenied(true);
            else {
              setMobileOutletName(data.outletName);
              setQrToken(passedToken || "");
              setInventory(data.inventory || []);
              setVendors(data.vendors?.map((v:any) => v.name) || []);
              setLoading(false);
            }
          }).catch(() => setMobileAccessDenied(true));
      } else {
        generateOrLoadQRToken();
      }
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [outletId]);

  useEffect(() => {
    if (!isMobileMode && session?.user) {
      fetchInventoryAndProduction();
    }
  }, [session, outletId, dateFilter, customStartDate, customEndDate, isOnline, isMobileMode]);

  const triggerOfflineQueueSync = async () => {
    console.log("Syncing offline cache logic running...");
  };

  const generateOrLoadQRToken = async (forceNew = false) => {
    if (typeof window === "undefined") return;
    let token = localStorage.getItem(`zapped_qr_token_${outletId}`);
    
    if (!token || forceNew) {
      token = Math.random().toString(36).substring(2, 15);
      localStorage.setItem(`zapped_qr_token_${outletId}`, token);
      
      // Update Backend to expire old links instantly
      await fetch("/api/inventory", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REGENERATE_TOKEN", newToken: token, outletId })
      });
    }
    setQrToken(token);
    const currentUrl = `${window.location.origin}${window.location.pathname}?view=purchase_mobile&token=${token}`;
    setQrImageUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(currentUrl)}&margin=1`);
  };

  const fetchInventoryAndProduction = async () => {
    if (!session?.user) return;
    setLoading(true);

    if (!navigator.onLine) {
      setLoading(false);
      return;
    }

    try {
      // 🔒 FETCH URL CLEANED (Backend pulls IDs from secure session token)
      const res = await fetch(`/api/inventory`);
      const data = await res.json();
      
      setInventory(data.inventory || []);
      setVendorList(data.vendors || []);
      setVendors(data.vendors?.map((v:any) => v.name) || []);
      setPurchaseLogs(data.purchaseLogs || []);

      let prodUrl = `/api/production?date=${dateFilter}`;
      if (dateFilter === "custom" && customStartDate && customEndDate) prodUrl += `&startDate=${customStartDate}&endDate=${customEndDate}`;
      
      const prodRes = await fetch(prodUrl);
      const prodData = await prodRes.json();
      if (prodData.success) {
        setRecipes(prodData.recipes || []);
        setHistory(prodData.productionBatches || []);
      }
    } catch (err) { alert("Failed to sync supply chain databases."); } finally { setLoading(false); }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) return;
    setIsSaving(true);
    
    let safeType = formData.type;
    if (["VEGETABLES", "DAIRY", "SPICES"].includes(formData.type)) {
      safeType = "RAW_MATERIAL";
    }

    const sanitizedPayload = {
      action: "ADD_SKU",
      itemName: formData.itemName.toUpperCase(), 
      type: safeType,
      unit: formData.unit,
      stockLevel: formData.stockLevel,
      minStock: formData.minStock
    };

    try {
      const res = await fetch("/api/inventory", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sanitizedPayload)
      });
      if (res.ok) {
        setShowAddModal(false);
        setFormData({ itemName: "", type: "RAW_MATERIAL", unit: "KG", stockLevel: "", minStock: "" });
        fetchInventoryAndProduction(); 
      } else alert("Server rejected verification schema rules.");
    } catch (err) { alert("Network Error mapping parameters."); } finally { setIsSaving(false); }
  };

  const submitPurchaseEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMobileMode && !session?.user) return;
    if (!purchaseItem || parseFloat(purchaseQty) <= 0 || !purchaseDoar) return alert("Select item, quantity and operator verification dropdown.");
    
    setIsSaving(true);
    const targetVendorName = isHQ ? "HQ" : purchaseVendor;
    const subTotal = parseFloat(purchaseQty) * parseFloat(purchaseRate || "0");
    const gstAmount = subTotal * (parseFloat(purchaseGst) / 100);
    const billTotal = isHQ ? 0 : (subTotal + gstAmount);

    const payload = {
      action: "ADD_PURCHASE",
      itemId: purchaseItem,
      outletId,
      isMobileEntry: isMobileMode,
      token: qrToken,
      purchaseData: {
        rate: isHQ ? "0" : purchaseRate,
        qty: purchaseQty,
        vendorName: targetVendorName,
        invoiceNo: isHQ ? "HQ-TRANS" : purchaseRef,
        paymentMode: purchasePayment,
        totalAmount: billTotal.toString()
      }
    };

    try {
      const res = await fetch("/api/inventory", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("GRN Confirmed & Stock Incremented via Cloud!");
        setPurchaseItem(""); setPurchaseQty(""); setPurchaseRate(""); setPurchaseGst("0");
        setPurchaseRef(""); setPurchaseNotes(""); setProofUrl(""); setIsUrgent(false);
        setPurchaseDoar(""); setPurchaseVendor(""); setPurchasePayment("CASH");
        if (!isMobileMode) fetchInventoryAndProduction();
      } else {
        alert(data.error || "Purchase Registration Failed.");
      }
    } catch (err) { alert("Network Error."); } finally { setIsSaving(false); }
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) return;
    if (!newVendorData.name || !newVendorData.phone) return alert("Vendor Name and Phone required.");
    
    const payload = {
      action: "ADD_VENDOR",
      vendorData: newVendorData
    };

    try {
      const res = await fetch("/api/inventory", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if(res.ok) {
        setShowAddVendorModal(false);
        setNewVendorData({ name: "", contactPerson: "", phone: "", address: "", outstanding: "0", gstin:"", rating:"5", terms:"NET_0" });
        fetchInventoryAndProduction();
        alert("🟢 Approved Vendor Account Registered via Cloud!");
      }
    } catch (e) { alert("Error connecting to server."); }
  };

  const handleDeleteSKU = async (itemId: string, itemName: string) => {
    const adminPasswordInput = prompt(`⚠️ SECURE RECONCILIATION AUTHORIZATION KEY REQUIRED!\nAre you sure you want to delete "${itemName}" permanently?\nEnter your active POS Login Password to authorize removal:`);
    const realTerminalSavedPass = localStorage.getItem("zapped_pos_login_password") || "RamKesarAdmin786";
    if (adminPasswordInput === realTerminalSavedPass) {
      setLoading(true);
      setInventory(inventory.filter(i => i.id !== itemId));
      alert("🟢 SKU Removed from terminal configurations cache successfully!");
      setLoading(false);
    } else if (adminPasswordInput !== null) {
      alert("❌ ACCESS DENIED! Invalid Terminal Security Authorization Credentials provided.");
    }
  };

  const submitInternalIndentRequest = () => {
    if (!indentQty || parseFloat(indentQty) <= 0) return alert("Enter valid quantity descriptor.");
    const newIndent = { id: Date.now(), timestamp: new Date().toISOString(), itemName: indentItem.itemName, qty: indentQty, unit: indentItem.unit, urgency: indentUrgency, status: "PENDING_GRN" };
    const updated = [newIndent, ...indentLogs];
    setIndentLogs(updated);
    localStorage.setItem(`zapped_indent_requests_${outletId}`, JSON.stringify(updated));
    alert("🚀 Procurement Internal Requisition Indent Dispatched!");
    setShowIndentModal(false); setIndentQty("");
  };

  const handlePayOutstandingDues = async () => {
    if(!payDueAmount || parseFloat(payDueAmount) <= 0) return alert("Enter valid amount");
    try {
      const res = await fetch("/api/inventory", {
        method: "PUT", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ action: "PAY_VENDOR_DUE", vendorId: selectedVendorForPay.id, payAmount: payDueAmount })
      });
      if(res.ok) {
        alert("💸 Vendor Ledger Outstandings Settled & Logged!");
        setShowPayDueModal(false); setPayDueAmount("");
        fetchInventoryAndProduction();
      }
    } catch(e) { alert("Failed to settle dues."); }
  };

  const isLogWithinDate = (dateStr: string) => {
    const logDate = new Date(dateStr);
    const today = new Date();
    if (dateFilter === "today") return logDate.toDateString() === today.toDateString();
    if (dateFilter === "yesterday") {
      const yest = new Date(today); yest.setDate(yest.getDate() - 1);
      return logDate.toDateString() === yest.toDateString();
    }
    if (dateFilter === "custom" && customStartDate && customEndDate) {
      const s = new Date(customStartDate); s.setHours(0,0,0,0);
      const e = new Date(customEndDate); e.setHours(23,59,59,999);
      return logDate >= s && logDate <= e;
    }
    return true; 
  };

  const filteredPurchaseLogs = purchaseLogs.filter(log => isLogWithinDate(log.date));

  const parseWastageFromBatchNo = (batchStr: string) => {
    if (!batchStr) return 0;
    const match = batchStr.match(/\[WASTE:(.*?)\]/);
    return match ? parseFloat(match[1]) : 0;
  };

  const parseMenuIdFromBatchNo = (batchStr: string) => {
    if (!batchStr) return "";
    const match = batchStr.match(/\[MENU:(.*?)\]/);
    return match ? match[1] : "";
  };

  const calculateConsumedQuantity = (itemName: string) => {
    let totalConsumedVolume = 0;
    const currentInventoryAsset = inventory.find(i => i.itemName === itemName);
    if (!currentInventoryAsset) return 0;

    history.forEach(batch => {
      const realMenuItemId = parseMenuIdFromBatchNo(batch.batchNumber) || batch.finishedGoodId;
      const linkedBOMRecipeItems = recipes.filter(r => r.finishedGoodId === realMenuItemId);
      linkedBOMRecipeItems.forEach(recipe => {
        if (recipe.rawMaterialId === currentInventoryAsset.id || recipe.rawMaterial?.itemName === itemName) {
          const totalProducedYield = batch.quantityProduced + parseWastageFromBatchNo(batch.batchNumber);
          totalConsumedVolume += (recipe.quantityUsed * totalProducedYield);
        }
      });
    });
    return totalConsumedVolume;
  };

  const calculateInwardQuantity = (itemName: string) => {
    return filteredPurchaseLogs.filter(l => l.itemName === itemName).reduce((sum, l) => sum + parseFloat(l.qty || "0"), 0);
  };

  const simulateInvoiceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProofUrl(`https://cloud.zapped.in/inv_${Date.now()}.pdf`);
    }
  };

  const handlePrint = () => { setTimeout(() => { window.print(); }, 150); };

  const filteredInventory = inventory.filter(item => {
    const matchSearch = item.itemName.toLowerCase().includes(searchQuery.toLowerCase());
    if (typeFilter === "LOW_STOCK") return matchSearch && (item.stockLevel > 0 && item.stockLevel <= item.minStock);
    if (typeFilter === "OUT_OF_STOCK") return matchSearch && (item.stockLevel <= 0);
    const matchType = typeFilter === "ALL" || item.type === typeFilter || item.itemName.includes(`[${typeFilter}]`);
    return matchSearch && matchType;
  });

  const totalSKUs = inventory.length;
  const lowStockCount = inventory.filter(i => i.stockLevel > 0 && i.stockLevel <= i.minStock).length;
  const outOfStockCount = inventory.filter(i => i.stockLevel <= 0).length;
  const totalProcurementFiltered = filteredPurchaseLogs.reduce((sum, log) => sum + log.total, 0);
  const totalMarketUdhaari = vendorList.reduce((sum, v) => sum + v.outstanding, 0);
  
  const accruedGstTaxPool = filteredPurchaseLogs.reduce((sum, log) => {
    const rate = parseFloat(log.rate) || 0;
    const qty = parseFloat(log.qty) || 0;
    return sum + ((rate * qty) * (parseFloat(log.gst || "0") / 100));
  }, 0);

  const spendByCash = filteredPurchaseLogs.filter(l => l.paymentMode === "CASH").reduce((s, l) => s + l.total, 0);
  const spendByCredit = filteredPurchaseLogs.filter(l => l.paymentMode === "CREDIT").reduce((s, l) => s + l.total, 0);
  const urgentConsignmentsCount = filteredPurchaseLogs.filter(l => l.isUrgent).length;

  const itemSpendMap: Record<string, number> = {};
  filteredPurchaseLogs.forEach(l => { itemSpendMap[l.itemName] = (itemSpendMap[l.itemName] || 0) + l.total; });
  const topSpendLeaderSKU = Object.keys(itemSpendMap).length > 0 
    ? Object.entries(itemSpendMap).reduce((a, b) => b[1] > a[1] ? b : a)[0] 
    : "NONE";

  // 🔥 PUBLIC MOBILE ENTRY FORM (QR SCANNED)
  if (isMobileMode) {
    if (mobileAccessDenied) {
      return (
        <div className="min-h-[100dvh] bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
          <ShieldAlert size={80} className="text-red-500 mb-6 animate-pulse"/>
          <h1 className="text-2xl font-black text-white uppercase tracking-widest mb-2">Access Token Expired</h1>
          <p className="text-slate-400 font-bold text-sm">Security matrix has invalidated this QR session. Please request the Manager to regenerate the QR code on the desktop terminal.</p>
        </div>
      );
    }
    
    if (loading) return <div className="h-screen bg-slate-900 flex justify-center items-center"><Loader2 className="animate-spin text-white" size={40}/></div>;

    return (
      <div className="min-h-[100dvh] w-full overflow-y-auto bg-slate-100 p-4 font-sans pb-40">
        <div className="bg-white rounded-3xl p-5 shadow-xl border border-slate-200 mb-20">
          <div className="text-center mb-6 border-b border-slate-100 pb-4">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex justify-center items-center"><Truck size={20} className="mr-2 text-indigo-600"/> {mobileOutletName} GRN</h2>
            <p className="text-[10px] text-slate-400 font-bold mt-1 tracking-widest">SECURE MOBILE PURCHASE GATEWAY</p>
          </div>
          <form onSubmit={submitPurchaseEntry} className="space-y-4">
            <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 flex justify-between items-center mb-2">
              <span className="text-[10px] font-black uppercase text-indigo-800 tracking-wider">Central HQ Supply Route</span>
              <input type="checkbox" checked={isHQ} onChange={(e) => setIsHQ(e.target.checked)} className="w-5 h-5 accent-indigo-600 cursor-pointer" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Select Received SKU</label>
              <select required value={purchaseItem} onChange={(e) => setPurchaseItem(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl text-xs font-bold outline-none bg-white focus:border-indigo-500">
                <option value="" disabled>Choose material...</option>
                {inventory.map(i => <option key={i.id} value={i.id}>{i.itemName}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Received Qty</label>
                <div className="flex items-center">
                  <input required type="number" step="any" min="0.01" placeholder="0" value={purchaseQty} onChange={(e) => setPurchaseQty(e.target.value)} className="w-full p-3 border border-slate-200 rounded-l-xl text-lg font-mono font-black outline-none focus:border-indigo-500" />
                  <span className="bg-slate-100 border border-l-0 border-slate-200 p-3 rounded-r-xl text-[10px] font-black uppercase text-slate-400">{purchaseItem ? inventory.find(i=>i.id===purchaseItem)?.unit : "UNIT"}</span>
                </div>
              </div>
              {!isHQ && (
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Rate / Unit (₹)</label>
                  <input required type="number" step="any" min="0" placeholder="0.00" value={purchaseRate} onChange={(e) => setPurchaseRate(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl text-lg font-mono font-black text-emerald-600 outline-none focus:border-indigo-500" />
                </div>
              )}
            </div>
            {!isHQ && (
              <>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Supplier / Vendor</label>
                  <select required value={purchaseVendor} onChange={(e) => setPurchaseVendor(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl text-xs font-bold outline-none bg-white focus:border-indigo-500">
                    <option value="" disabled>Select Vendor...</option>
                    {vendors.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Payment Mode</label>
                    <select value={purchasePayment} onChange={(e) => setPurchasePayment(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl text-xs font-bold bg-white outline-none focus:border-indigo-500">
                      <option value="CASH">Cash Paid</option><option value="UPI">UPI / Online</option><option value="CREDIT">On Credit</option><option value="CHEQUE">Bank Cheque</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Ref / Bill No.</label>
                    <input type="text" placeholder="Invoice ID" value={purchaseRef} onChange={(e) => setPurchaseRef(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500" />
                  </div>
                </div>
              </>
            )}
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Operator Name (Doar)</label>
              <select required value={purchaseDoar} onChange={(e) => setPurchaseDoar(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl text-xs font-bold bg-white focus:border-indigo-500 shadow-sm outline-none">
                <option value="" disabled>Choose Personnel...</option>
                {staffDoars.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            {!isHQ && parseFloat(purchaseQty)>0 && parseFloat(purchaseRate)>0 && (
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-center"><span className="text-[10px] uppercase font-black text-emerald-600 block mb-1">Total Bill Value</span><span className="text-2xl font-mono font-black text-emerald-700">₹{((parseFloat(purchaseQty) * parseFloat(purchaseRate)) * (1 + parseFloat(purchaseGst)/100)).toFixed(2)}</span></div>
            )}
            <button disabled={isSaving} type="submit" className="w-full bg-slate-900 text-white font-black uppercase tracking-widest py-4 rounded-xl text-xs flex justify-center items-center shadow-xl active:scale-95 transition-transform mt-6 mb-10">
              {isSaving ? <Loader2 className="animate-spin" size={18}/> : "Submit Secure Mobile GRN"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      <title>ZedPoss | Inventory & Supply Chain Management</title>
      <meta name="description" content="Master Inventory Control, Stock Ledger, GRN Purchase Orders, and Vendor Accounts for your restaurant. Secure cloud supply chain by ZedooX Technologies." />

      <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden print:h-auto print:overflow-visible print:bg-white">
        
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            html, body, div, table, tbody, tr, td, header, nav { height: auto !important; overflow: visible !important; background: white !important; color: black !important; }
            .print\\:hidden { display: none !important; }
            #enterprise-receipt-print-area { display: block !important; opacity: 1 !important; position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; z-index: 999999 !important; }
          }
        `}} />

        {/* ------------------- DESKTOP HEADER & TRIP-AXIS NAVIGATION PANEL ------------------- */}
        <div className="p-6 pb-0 bg-white border-b border-slate-200 shrink-0 print:hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
                <Package className="mr-2 text-blue-600" /> Supply Chain Hub
              </h1>
              <p className="text-xs text-slate-500 font-bold mt-1">Enterprise Stock Balancing & Central Procurement Architecture</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              {/* GLOBAL DATE FILTERS CONTROL BAR */}
              <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="p-2 border border-slate-200 rounded-lg font-black text-[10px] uppercase tracking-wider bg-white outline-none focus:border-indigo-500 shadow-sm mr-2">
                <option value="today">Today's Ledger</option><option value="yesterday">Yesterday's Ledger</option><option value="custom">Custom Range</option>
              </select>
              {dateFilter === "custom" && (
                <div className="flex items-center gap-1 mr-2">
                  <input type="date" value={customStartDate} onChange={(e)=>setCustomStartDate(e.target.value)} className="p-1.5 border border-slate-200 rounded-lg text-[10px] font-bold" />
                  <input type="date" value={customEndDate} onChange={(e)=>setCustomEndDate(e.target.value)} className="p-1.5 border border-slate-200 rounded-lg text-[10px] font-bold" />
                </div>
              )}

              {/* QUAD-TAB PANEL INTERFACE HEADERS */}
              <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 mr-2">
                <button onClick={()=>setActiveView("INVENTORY")} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeView==='INVENTORY' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Stock Ledger</button>
                <button onClick={()=>setActiveView("PURCHASE")} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeView==='PURCHASE' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>Purchase Desk</button>
                <button onClick={()=>setActiveView("PURCHASE_ANALYTICS")} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeView==='PURCHASE_ANALYTICS' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}>Analytics Logs</button>
                <button onClick={()=>setActiveView("VENDORS")} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeView==='VENDORS' ? 'bg-white shadow-sm text-purple-600' : 'text-slate-500 hover:text-slate-700'}`}>Vendor Accounts</button>
              </div>

              {/* Contextual Action Buttons */}
              {activeView === "INVENTORY" && (
                <>
                  <button onClick={fetchInventoryAndProduction} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg"><RefreshCcw size={16} /></button>
                  <button onClick={handlePrint} className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-3 py-2 rounded-lg font-black text-[10px] uppercase tracking-wider flex items-center shadow-xs"><Printer size={14} className="mr-1.5" /> Print Ledger</button>
                  <button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-black text-[10px] uppercase tracking-wider flex items-center shadow-md shadow-blue-500/20"><Plus size={14} className="mr-1.5" /> New SKU</button>
                </>
              )}
              {activeView === "PURCHASE" && <button onClick={handlePrint} className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-2 rounded-lg font-black text-[10px] uppercase tracking-wider flex items-center shadow-md"><Printer size={14} className="mr-1.5" /> Print GRN Ticket</button>}
              {activeView === "PURCHASE_ANALYTICS" && <button onClick={handlePrint} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg font-black text-[10px] uppercase tracking-wider flex items-center shadow-md"><Printer size={14} className="mr-1.5" /> Print Analytics Report</button>}
              {activeView === "VENDORS" && (
                <>
                  <button onClick={handlePrint} className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-3 py-2 rounded-lg font-black text-[10px] uppercase tracking-wider flex items-center shadow-xs"><Printer size={14} className="mr-1.5" /> Print Credit Statement</button>
                  <button onClick={() => setShowAddVendorModal(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg font-black text-[10px] uppercase tracking-wider flex items-center shadow-md shadow-purple-500/20"><Plus size={14} className="mr-1.5" /> Add Vendor Account</button>
                </>
              )}
            </div>
          </div>

          {/* METRICS ROW STATUS CARDS STRIP */}
          {(activeView === "INVENTORY" || activeView === "VENDORS") && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center justify-between"><div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Vault SKU Items</span><p className="text-2xl font-mono font-black text-slate-900">{totalSKUs}</p></div><Layers size={32} className="text-blue-100" /></div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center justify-between"><div><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Procurement Spent Capital</span><p className="text-xl font-mono font-black text-emerald-600">₹{totalProcurementFiltered.toFixed(2)}</p></div><Truck size={32} className="text-emerald-100" /></div>
              <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100 shadow-xs flex items-center justify-between"><div><span className="text-[10px] font-black text-orange-500 uppercase tracking-widest block mb-1">Market Credit Dues Balance</span><p className="text-xl font-mono font-black text-orange-600">₹{totalMarketUdhaari.toFixed(2)}</p></div><IndianRupee size={32} className="text-orange-200" /></div>
              <div className="bg-red-50 p-5 rounded-2xl border border-red-100 shadow-xs flex items-center justify-between"><div><span className="text-[10px] font-black text-red-500 uppercase tracking-widest block mb-1">Critical Low Stocks</span><p className="text-2xl font-mono font-black text-red-600">{lowStockCount + outOfStockCount} SKUs</p></div><AlertTriangle size={32} className="text-red-200" /></div>
            </div>
          )}
        </div>

        <div className="flex-1 p-6 overflow-hidden flex flex-col print:hidden">
          
          {/* ================= VIEW 1: INVENTORY STOCK LEDGER ================= */}
          {activeView === "INVENTORY" && (
            <div className="flex flex-col h-full animate-in fade-in">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4 shrink-0 bg-white p-2 border border-slate-200 rounded-xl shadow-sm">
                <div className="flex items-center flex-1 w-full gap-3">
                  <div className="relative max-w-xs flex-1"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} /><input type="text" placeholder="Search SKU..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg outline-none font-bold text-xs focus:border-blue-500 bg-slate-50" /></div>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-lg border">
                  {['LIVE', 'OPENING', 'INWARD', 'CONSUMED', 'CLOSING'].map(v => (
                    <button key={v} onClick={()=>setStockLedgerView(v as any)} className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded transition-colors ${stockLedgerView === v ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{v} VIEW</button>
                  ))}
                </div>
              </div>

              <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[950px]">
                    <thead className="sticky top-0 bg-slate-100/90 backdrop-blur-sm z-10 border-b border-slate-200">
                      <tr className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        <th className="p-4 w-12 text-center">#</th><th className="p-4">SKU Description Identifier</th>
                        {stockLedgerView === 'LIVE' && (<><th className="p-4 text-center">Alert Barrier</th><th className="p-4 text-center bg-blue-50/50 text-blue-800 border-x border-slate-200">Live Quantity Stock</th><th className="p-4 text-center">Health Status</th></>)}
                        {stockLedgerView === 'OPENING' && <th className="p-4 text-center bg-indigo-50/50 text-indigo-800">Opening Volume Dynamic</th>}
                        {stockLedgerView === 'INWARD' && <th className="p-4 text-center bg-emerald-50/50 text-emerald-800">Inward Procurement Volume (GRN)</th>}
                        {stockLedgerView === 'CONSUMED' && <th className="p-4 text-center bg-orange-50/50 text-orange-800">BOM Actual Recipe Consumption</th>}
                        {stockLedgerView === 'CLOSING' && <th className="p-4 text-center bg-blue-50/50 text-blue-800">Closing Calculated Yield Balance</th>}
                        <th className="p-4 text-center w-48">Operations Action Room</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm font-bold text-slate-700">
                      {filteredInventory.map((item, idx) => {
                        const isOutOfStock = item.stockLevel <= 0;
                        const isLowStock = item.stockLevel > 0 && item.stockLevel <= item.minStock;
                        const inwardQty = calculateInwardQuantity(item.itemName);
                        const consumedQty = calculateConsumedQuantity(item.itemName);
                        const calculatedOpening = item.stockLevel - inwardQty + consumedQty;

                        return (
                          <tr key={item.id} className={`hover:bg-slate-50/80 transition-colors ${stockLedgerView==='LIVE' && isOutOfStock ? 'bg-red-50/20' : stockLedgerView==='LIVE' && isLowStock ? 'bg-orange-50/20' : ''}`}>
                            <td className="p-4 text-center font-black text-slate-400">{idx + 1}</td>
                            <td className="p-4 font-black text-slate-900 uppercase">{item.itemName}</td>
                            
                            {stockLedgerView === 'LIVE' && (
                              <>
                                <td className="p-4 text-center font-mono text-slate-500">{item.minStock} {item.unit}</td>
                                <td className={`p-4 text-center font-mono font-black text-sm border-x border-slate-100 ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-orange-600' : 'text-blue-600'}`}>{parseFloat(item.stockLevel).toFixed(3)} <span className="text-[9px] uppercase font-bold text-slate-400">{item.unit}</span></td>
                                <td className="p-4 text-center">{isOutOfStock ? <span className="bg-red-100 text-red-700 border text-[9px] px-2 py-0.5 rounded uppercase font-black">Critical OOS</span> : isLowStock ? <span className="bg-orange-100 text-orange-700 border text-[9px] px-2 py-0.5 rounded uppercase font-black">Low Stock</span> : <span className="bg-emerald-100 text-emerald-700 border text-[9px] px-2 py-0.5 rounded uppercase font-black">Healthy</span>}</td>
                              </>
                            )}
                            
                            {stockLedgerView === 'OPENING' && <td className="p-4 text-center font-mono font-black text-indigo-600 text-sm">{calculatedOpening.toFixed(3)} {item.unit}</td>}
                            {stockLedgerView === 'INWARD' && <td className="p-4 text-center font-mono font-black text-emerald-600 text-sm">+{inwardQty.toFixed(3)} {item.unit}</td>}
                            {stockLedgerView === 'CONSUMED' && <td className="p-4 text-center font-mono font-black text-orange-600 text-sm">-{consumedQty.toFixed(3)} {item.unit}</td>}
                            {stockLedgerView === 'CLOSING' && <td className="p-4 text-center font-mono font-black text-blue-600 text-sm">{parseFloat(item.stockLevel).toFixed(3)} {item.unit}</td>}

                            <td className="p-4 text-center space-x-1 whitespace-nowrap">
                              <button onClick={()=>{setIndentItem(item); setShowIndentModal(true);}} className="text-[9px] font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1.5 rounded uppercase transition-colors active:scale-95 shadow-sm">Req Indent</button>
                              <button onClick={()=>{setDeleteItemTarget(item); setShowDeleteAuthModal(true);}} className="text-[9px] font-black text-red-600 bg-red-50 hover:bg-red-600 hover:text-white border border-red-100 px-2.5 py-1.5 rounded uppercase transition-all inline-flex items-center"><Trash2 size={10} className="mr-0.5"/> Delete</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= VIEW 2: PURCHASE DESK FORMS ================= */}
          {activeView === "PURCHASE" && (
            <div className="flex flex-col lg:flex-row gap-6 h-full animate-in fade-in">
              <div className="w-full lg:w-1/2 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
                <div className="p-4 bg-slate-900 flex justify-between items-center shrink-0">
                  <h3 className="font-black text-white text-xs uppercase tracking-wider flex items-center"><Truck size={16} className="mr-2 text-indigo-400"/> Enter Inward Goods (GRN)</h3>
                  <div className="flex items-center space-x-2"><span className="text-[9px] font-black uppercase tracking-wider text-slate-400">HQ Central Supply</span><input type="checkbox" checked={isHQ} onChange={(e) => setIsHQ(e.target.checked)} className="w-4 h-4 accent-indigo-500 cursor-pointer" /></div>
                </div>
                <form onSubmit={submitPurchaseEntry} className="flex-1 flex flex-col justify-between overflow-hidden">
                  <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                    <div className="flex gap-4 items-end">
                      <div className="flex-1">
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Select Received SKU</label>
                        <select required value={purchaseItem} onChange={(e) => setPurchaseItem(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold outline-none bg-white focus:border-indigo-500 shadow-sm">
                          <option value="" disabled>Choose material...</option>
                          {inventory.map(i => <option key={i.id} value={i.id}>{i.itemName}</option>)}
                        </select>
                      </div>
                      <div className="w-24 flex flex-col items-center">
                        <label className="block text-[9px] font-black uppercase text-red-500 mb-2">Mark Urgent</label>
                        <input type="checkbox" checked={isUrgent} onChange={(e)=>setIsUrgent(e.target.checked)} className="w-5 h-5 accent-red-500" />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Received Qty</label>
                        <div className="flex items-center">
                          <input required type="number" step="any" min="0.01" placeholder="0" value={purchaseQty} onChange={(e) => setPurchaseQty(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-l-xl text-sm font-mono font-black focus:border-indigo-500 outline-none" />
                          <span className="bg-slate-100 border border-l-0 border-slate-200 p-2.5 rounded-r-xl text-[10px] font-black uppercase text-slate-400">{purchaseItem ? inventory.find(i=>i.id===purchaseItem)?.unit : "UNIT"}</span>
                        </div>
                      </div>
                      {!isHQ && (
                        <>
                          <div>
                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Rate / Unit (₹)</label>
                            <input required={!isHQ} type="number" step="any" min="0" placeholder="0.00" value={purchaseRate} onChange={(e) => setPurchaseRate(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-mono font-black text-emerald-600 focus:border-indigo-500 outline-none" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Tax / GST %</label>
                            <select value={purchaseGst} onChange={(e)=>setPurchaseGst(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold outline-none bg-white"><option value="0">0% GST</option><option value="5">5% GST</option><option value="12">12% GST</option><option value="18">18% GST</option></select>
                          </div>
                        </>
                      )}
                    </div>

                    {!isHQ && (
                      <>
                        <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                          <div>
                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Supplier / Vendor</label>
                            <select required={!isHQ} value={purchaseVendor} onChange={(e) => setPurchaseVendor(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold outline-none bg-white focus:border-indigo-500">
                              <option value="" disabled>Select Vendor...</option>
                              {vendorList.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Payment Mode</label>
                            <select value={purchasePayment} onChange={(e) => setPurchasePayment(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold outline-none bg-white focus:border-indigo-500">
                              <option value="CASH">Cash Paid</option><option value="UPI">UPI / Online</option><option value="CREDIT">On Credit (Udhaar)</option><option value="CHEQUE">Bank Cheque</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Invoice / Ref No.</label><input type="text" placeholder="Bill No." value={purchaseRef} onChange={(e) => setPurchaseRef(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500" /></div>
                          <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Expected ETA Date</label><input type="date" className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold outline-none bg-white focus:border-indigo-500" /></div>
                        </div>
                      </>
                    )}

                    <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">GRN Notes / Remarks</label><textarea rows={1} placeholder="Voucher instructions..." value={purchaseNotes} onChange={(e)=>setPurchaseNotes(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold outline-none resize-none focus:border-indigo-500" /></div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Attach Physical Invoice Receipt</label>
                      <label className="flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-3 cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                        <Upload size={14} className="text-slate-400 mr-2" />
                        <span className="text-xs font-bold text-slate-500">{proofUrl ? "Invoice Attached ✔" : "Click to Upload Proof"}</span>
                        <input type="file" accept="image/*,.pdf" onChange={simulateInvoiceUpload} className="hidden" />
                      </label>
                    </div>

                    <div className="border-t border-slate-100 pt-4">
                      <label className="block text-[10px] font-black uppercase text-indigo-600 mb-1.5 flex items-center"><UserCheck size={12} className="mr-1"/> Operator Verification (Doar)</label>
                      <select required value={purchaseDoar} onChange={(e) => setPurchaseDoar(e.target.value)} className="w-full p-3 border-2 border-indigo-100 rounded-xl text-xs font-bold bg-indigo-50/30 outline-none text-indigo-900 focus:border-indigo-500 shadow-sm">
                        <option value="" disabled>Verified Receiving By...</option>
                        {staffDoars.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="p-4 border-t border-slate-200 bg-slate-50 shrink-0">
                    {!isHQ && parseFloat(purchaseQty)>0 && parseFloat(purchaseRate)>0 && (
                      <div className="flex justify-between items-center mb-3 font-mono font-black text-xs px-1"><span>Subtotal: ₹{(parseFloat(purchaseQty)*parseFloat(purchaseRate)).toFixed(2)}</span><span>GST: {purchaseGst}%</span><span className="text-emerald-700 text-base">Grand Total: ₹{((parseFloat(purchaseQty) * parseFloat(purchaseRate)) * (1 + parseFloat(purchaseGst)/100)).toFixed(2)}</span></div>
                    )}
                    <button disabled={isSaving} type="submit" className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-black uppercase py-4 rounded-xl text-xs flex justify-center items-center shadow-lg active:scale-95 transition-all">{isSaving ? <Loader2 className="animate-spin" size={16}/> : "Commit GRN Inward Balance"}</button>
                  </div>
                </form>
              </div>

              <div className="w-full lg:w-1/2 flex flex-col gap-6 h-full overflow-hidden">
                <div className="bg-slate-900 rounded-2xl p-5 shadow-xl flex items-center space-x-5 shrink-0 relative overflow-hidden">
                  <div className="bg-white p-2 rounded-xl shrink-0 flex items-center justify-center w-[80px] h-[80px]">
                    {qrImageUrl ? <img src={qrImageUrl} alt="QR" className="w-full h-full" /> : <Loader2 className="animate-spin" />}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-black uppercase tracking-wider text-sm flex items-center"><QrCode size={16} className="mr-1.5 text-indigo-400"/> Rapid Mobile GRN Gateway</h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-1 leading-tight mb-3">Scan code to open stripped-down purchase form securely on mobile without login credentials.</p>
                    <button onClick={() => generateOrLoadQRToken(true)} className="text-[10px] font-black uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-lg flex items-center hover:bg-indigo-500/40 transition-colors active:scale-95"><Lock size={12} className="mr-1.5"/> Regenerate Token Security Access</button>
                  </div>
                </div>

                <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-200"><h3 className="font-black text-slate-800 text-xs uppercase tracking-wider flex items-center"><History size={16} className="mr-2 text-slate-400"/> Active Dispatch Inflows</h3></div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {filteredPurchaseLogs.slice(0, 10).map((log: any) => (
                      <div key={log.id} className={`bg-slate-50 border p-3 rounded-xl ${log.isUrgent ? 'border-red-200 shadow-sm' : 'border-slate-200'}`}>
                        <div className="flex justify-between items-start mb-1">
                          <div><span className="text-xs font-black text-slate-800 uppercase block">{log.itemName}</span><span className="text-[9px] text-slate-400 font-bold">{new Date(log.date).toLocaleTimeString('en-IN')}</span></div>
                          <span className="text-base font-mono font-black text-emerald-600">+{log.qty} <span className="text-[10px] text-slate-400">{log.unit}</span></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= VIEW 3: PURCHASE ANALYTICS LOGS ================= */}
          {activeView === "PURCHASE_ANALYTICS" && (
            <div className="flex-1 flex flex-col h-full animate-in fade-in space-y-6 overflow-y-auto custom-scrollbar pb-6 print:hidden">
              <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 flex flex-col sm:flex-row justify-between items-center shrink-0 relative overflow-hidden">
                <div><h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center"><LineChart size={20} className="mr-2 text-emerald-400"/> Procurement Intelligence Log</h2><p className="text-slate-400 text-xs font-bold mt-1 tracking-widest uppercase">Range Filter: {dateFilter.toUpperCase()}</p></div>
                <div className="text-right mt-4 sm:mt-0 z-10"><span className="block text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Total Spent Balance Valuation</span><span className="text-3xl font-mono font-black text-emerald-400">₹{totalProcurementFiltered.toFixed(2)}</span></div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 shrink-0">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex justify-between items-center"><div><span className="text-[9px] font-black text-slate-400 uppercase block">Accrued Tax ITC Pool</span><p className="text-base font-mono font-black text-indigo-600">₹{accruedGstTaxPool.toFixed(2)}</p></div><Coins size={20} className="text-indigo-100" /></div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex justify-between items-center"><div><span className="text-[9px] font-black text-slate-400 uppercase block">Cash Inflows</span><p className="text-base font-mono font-black text-slate-800">₹{spendByCash.toFixed(2)}</p></div><IndianRupee size={20} className="text-slate-200" /></div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex justify-between items-center"><div><span className="text-[9px] font-black text-slate-400 uppercase block">Credit Debt Balance</span><p className="text-base font-mono font-black text-red-600">₹{spendByCredit.toFixed(2)}</p></div><CreditCard size={20} className="text-red-100" /></div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex justify-between items-center"><div><span className="text-[9px] font-black text-slate-400 uppercase block">Urgent Cargo Flags</span><p className="text-base font-mono font-black text-orange-600">{urgentConsignmentsCount} Batches</p></div><AlertCircle size={20} className="text-orange-100" /></div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex justify-between items-center"><div><span className="text-[9px] font-black text-slate-400 uppercase block">Top Expense Leader</span><p className="text-[11px] font-black text-emerald-700 truncate max-w-[100px] uppercase">{topSpendLeaderSKU}</p></div><PieChart size={20} className="text-emerald-100" /></div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1">
                <div className="p-4 bg-slate-50 border-b border-slate-200"><h3 className="font-black text-slate-800 text-xs uppercase tracking-wider">Transaction Ledger Stream</h3></div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead className="bg-slate-100/90 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <tr><th className="p-4">PO / Ref No</th><th className="p-4">Timestamp Date</th><th className="p-4">Product SKU</th><th className="p-4">Vendor Profile Author</th><th className="p-4 text-center">Volume Inward</th><th className="p-4 text-right">Net Value Valuation</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm font-bold text-slate-700">
                      {filteredPurchaseLogs.map((l: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="p-4 font-mono text-slate-900">{l.poNumber || l.refNo}</td>
                          <td className="p-4 text-xs text-slate-500">{new Date(l.date).toLocaleString('en-IN')}</td>
                          <td className="p-4 uppercase">{l.itemName}</td>
                          <td className="p-4 uppercase text-xs text-indigo-600">{l.vendor}</td>
                          <td className="p-4 text-center font-mono text-emerald-600">+{l.qty} {l.unit}</td>
                          <td className="p-4 text-right font-mono font-black text-slate-800">₹{l.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= VIEW 4: APPROVED VENDORS ACCOUNTS LEDGER ================= */}
          {activeView === "VENDORS" && (
            <div className="flex-1 flex flex-col h-full animate-in fade-in">
              <div className="mb-4 relative max-w-sm shrink-0">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" placeholder="Search approved accounts name or gstin..." value={vendorSearch} onChange={(e) => setVendorSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl outline-none font-bold text-sm focus:border-purple-500 bg-white" />
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex-1 overflow-hidden flex flex-col">
                <div className="overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead className="bg-slate-100/90 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200 sticky top-0 z-10">
                      <tr><th className="p-4">Vendor Company</th><th className="p-4">Tax / Terms / Rating</th><th className="p-4">Contact Info</th><th className="p-4 text-center">Activity Status</th><th className="p-4 text-center bg-red-50 text-red-900 border-x">Outstanding Balance</th><th className="p-4 text-center w-48">Operations</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                      {vendorList.filter(v => v.name.toLowerCase().includes(vendorSearch.toLowerCase())).map((v) => (
                        <tr key={v.id} className="hover:bg-slate-50/50">
                          <td className="p-4 font-black text-slate-900 uppercase">
                            <div className="flex items-center mb-1"><Building2 size={14} className="mr-1.5 text-purple-600"/> {v.name}</div>
                            <span className="text-[9px] font-normal text-slate-500 truncate max-w-[180px] block">{v.address}</span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center text-amber-500 mb-1">{[...Array(5)].map((_, i) => <Star key={i} size={10} fill={i < v.rating ? 'currentColor' : 'none'} className="mr-0.5"/>)}</div>
                            <span className="text-[9px] font-black uppercase bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded tracking-widest">{(v.terms || "NET_0").replace('_', ' ')}</span>
                            <div className="text-[9px] font-mono text-slate-400 mt-1">GSTIN: {v.gstin || "N/A"}</div>
                          </td>
                          <td className="p-4"><div className="capitalize mb-0.5">{v.contactPerson}</div><div className="font-mono text-indigo-600">Ph: {v.phone}</div></td>
                          <td className="p-4 text-center"><div className="font-mono text-slate-500 mb-0.5">{v.totalOrders || 0} GRNs</div><div className="text-[8px] text-slate-400 uppercase font-black">Last Active: {new Date(v.createdAt || Date.now()).toLocaleDateString('en-IN')}</div></td>
                          <td className={`p-4 text-center font-mono font-black text-base bg-red-50/20 border-x ${v.outstanding > 0 ? 'text-red-600' : 'text-slate-400'}`}>₹{Number(v.outstanding || 0).toFixed(2)}</td>
                          <td className="p-4 text-center space-x-2">
                            {v.outstanding > 0 && <button onClick={()=>{setSelectedVendorForPay(v); setPayDueAmount(v.outstanding.toString()); setShowPayDueModal(true);}} className="bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase px-2 py-1.5 rounded flex items-center inline-flex shadow-sm"><CreditCard size={10} className="mr-1"/> Settle</button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ================= MODALS CLUSTER SYSTEM ================= */}
        
        {showAddModal && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 print:hidden">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-100">
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center"><Plus size={20} className="mr-2 text-blue-600"/> Add Inventory SKU</h2>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 p-1.5 bg-slate-100 rounded-full"><X size={20}/></button>
              </div>
              <form onSubmit={handleAddItem} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">SKU / Item Name</label><input required type="text" placeholder="e.g., Maida, Samosa Box" value={formData.itemName} onChange={(e) => setFormData({...formData, itemName: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl outline-none text-sm font-bold uppercase" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Classification Type</label><select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl text-xs font-bold bg-white uppercase"><option value="RAW_MATERIAL">Raw Material</option><option value="VEGETABLES">Vegetables</option><option value="DAIRY">Dairy</option><option value="SPICES">Spices</option><option value="PACKAGING">Packaging</option><option value="FINISHED_GOOD">Finished Good</option></select></div>
                  <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">UOM Unit</label><select value={formData.unit} onChange={(e) => setFormData({...formData, unit: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl text-xs font-bold bg-white uppercase"><option value="KG">Kilograms (KG)</option><option value="LITRE">Litres (L)</option><option value="PIECES">Pieces (Pcs)</option><option value="GRAMS">Grams (g)</option></select></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200"><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Opening Stock Level</label><input required type="number" step="any" min="0" value={formData.stockLevel} onChange={(e) => setFormData({...formData, stockLevel: e.target.value})} className="w-full p-2 border border-slate-200 rounded-lg font-mono font-black text-blue-600 text-lg" /></div>
                  <div className="bg-orange-50 p-3 rounded-xl border border-orange-100"><label className="block text-[10px] font-black uppercase text-orange-600 mb-1.5">Low Alert Trigger</label><input required type="number" step="any" min="0" value={formData.minStock} onChange={(e) => setFormData({...formData, minStock: e.target.value})} className="w-full p-2 border border-orange-200 rounded-lg font-mono font-black text-orange-700 text-lg bg-orange-50/50" /></div>
                </div>
                <button type="submit" className="w-full mt-4 bg-blue-600 text-white font-black uppercase tracking-wider py-4 rounded-xl text-xs shadow-lg">Confirm Procurement SKU Onboarding</button>
              </form>
            </div>
          </div>
        )}

        {showDeleteAuthModal && deleteItemTarget && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 print:hidden animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border-t-8 border-red-600 text-center relative overflow-hidden">
              <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                <div className="flex items-center text-red-700 font-black uppercase text-sm"><LockKeyhole size={16} className="mr-1.5"/> Security Authority Lock</div>
                <button onClick={()=>{setShowDeleteAuthModal(false); setSecurityPasswordInput("");}} className="text-slate-400 p-1 bg-slate-100 rounded-full"><X size={16}/></button>
              </div>
              <p className="text-xs font-bold text-slate-500 text-left mb-4 uppercase">Deleting: <span className="text-slate-900 font-black">{deleteItemTarget.itemName}</span></p>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-left uppercase text-slate-400 tracking-wider mb-1.5">Enter POS Login Terminal Password</label>
                  <input required type="password" placeholder="••••••••" value={securityPasswordInput} onChange={(e)=>setSecurityPasswordInput(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl font-mono text-center tracking-widest text-lg outline-none focus:border-red-500 bg-slate-50" />
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={()=>{setShowDeleteAuthModal(false); setSecurityPasswordInput("");}} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl text-xs font-black uppercase">Cancel</button>
                  <button onClick={() => handleDeleteSKU(deleteItemTarget.id, deleteItemTarget.itemName)} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl text-xs font-black uppercase flex items-center justify-center shadow-lg shadow-red-600/20"><ShieldCheck size={14} className="mr-1.5"/> Confirm Delete</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Indent module */}
        {showIndentModal && indentItem && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 print:hidden">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border-t-8 border-indigo-600">
              <div className="flex justify-between items-center mb-4 border-b pb-3"><h2 className="text-sm font-black text-slate-800 uppercase flex items-center"><Calculator size={16} className="mr-1 text-indigo-600"/> Requisition Indent</h2><button onClick={() => setShowIndentModal(false)} className="text-slate-400 p-1 bg-slate-100 rounded-full"><X size={18}/></button></div>
              <div className="space-y-4">
                <div className="text-xs font-black uppercase text-slate-700 bg-slate-50 p-2.5 rounded-xl border">Material: <span className="text-indigo-600">{indentItem.itemName}</span></div>
                <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Target Requisition Qty Needed</label><div className="flex items-center"><input required type="number" step="any" min="0.01" placeholder="0.00" value={indentQty} onChange={(e) => setIndentQty(e.target.value)} className="w-full p-2.5 border rounded-l-xl font-mono font-black text-indigo-600 text-xl outline-none" /><span className="bg-slate-100 p-3 rounded-r-xl border border-l-0 text-xs font-black uppercase text-slate-500">{indentItem.unit}</span></div></div>
                <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Priority Urgency Level</label><select value={indentUrgency} onChange={(e) => setIndentUrgency(e.target.value)} className="w-full p-2.5 border rounded-xl text-xs font-bold bg-white outline-none"><option value="NORMAL">Normal Restock</option><option value="CRITICAL">🚨 CRITICAL EMERGENCY</option></select></div>
                <button onClick={submitInternalIndentRequest} className="w-full bg-indigo-600 text-white font-black uppercase py-3 rounded-xl text-xs shadow-md">Dispatch Procurement Indent</button>
              </div>
            </div>
          </div>
        )}

        {showAddVendorModal && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 print:hidden">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in">
              <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3"><h2 className="text-base font-black text-slate-800 uppercase flex items-center"><UserCheck size={18} className="mr-1.5 text-purple-600"/> Register Approved Vendor Account</h2><button onClick={() => setShowAddVendorModal(false)} className="text-slate-400 p-1 bg-slate-100 rounded-full"><X size={18}/></button></div>
              <form onSubmit={handleCreateVendor} className="space-y-3">
                <div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Company / Vendor Corporate Name</label><input required type="text" placeholder="e.g. BALAJI MILLS" value={newVendorData.name} onChange={(e)=>setNewVendorData({...newVendorData, name:e.target.value})} className="w-full p-2 border rounded-xl font-bold uppercase text-xs outline-none" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Contact Name</label><input type="text" placeholder="Manager" value={newVendorData.contactPerson} onChange={(e)=>setNewVendorData({...newVendorData, contactPerson:e.target.value})} className="w-full p-2 border rounded-xl font-bold text-xs" /></div>
                  <div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Phone Number</label><input required type="text" placeholder="Mobile" value={newVendorData.phone} onChange={(e)=>setNewVendorData({...newVendorData, phone:e.target.value})} className="w-full p-2 border rounded-xl font-mono text-xs" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">GSTIN Tax Registration</label><input type="text" placeholder="GST Number" value={newVendorData.gstin} onChange={(e)=>setNewVendorData({...newVendorData, gstin:e.target.value})} className="w-full p-2 border rounded-xl font-mono text-xs uppercase" /></div>
                  <div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Payment Terms Agreement</label><select value={newVendorData.terms} onChange={(e)=>setNewVendorData({...newVendorData, terms:e.target.value})} className="w-full p-2 border rounded-xl text-xs font-bold bg-white"><option value="NET_0">Due on Receipt (Net 0)</option><option value="NET_15">Net 15 Days</option><option value="NET_30">Net 30 Days</option></select></div>
                </div>
                <div><label className="block text-[10px] font-black uppercase text-red-500 mb-1">Opening Outstanding Debt Balance (₹)</label><input type="number" placeholder="0" value={newVendorData.outstanding} onChange={(e)=>setNewVendorData({...newVendorData, outstanding:e.target.value})} className="w-full p-2 border border-red-200 text-red-600 font-mono text-xs rounded-xl" /></div>
                <button type="submit" className="w-full bg-purple-600 text-white font-black uppercase py-3 rounded-xl text-xs mt-3 shadow-md">Onboard Vendor Account</button>
              </form>
            </div>
          </div>
        )}

        {showPayDueModal && selectedVendorForPay && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 print:hidden">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border-t-8 border-emerald-600">
              <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3"><div><h3 className="font-black text-slate-800 text-sm uppercase">Settle Credit Outstandings</h3><p className="text-[10px] font-bold text-slate-400 mt-0.5">{selectedVendorForPay.name}</p></div><button onClick={() => setShowPayDueModal(false)} className="text-slate-400 p-1 bg-slate-100 rounded-full"><X size={18}/></button></div>
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-red-50 p-2.5 rounded-xl border border-red-100 text-xs font-bold text-red-700"><span>Current Debt Balance:</span><span className="font-mono font-black text-base">₹{Number(selectedVendorForPay.outstanding || 0).toFixed(2)}</span></div>
                <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Amount Paid (₹)</label><input type="number" step="any" min="1" value={payDueAmount} onChange={(e)=>setPayDueAmount(e.target.value)} className="w-full p-3 border rounded-xl font-mono font-black text-emerald-600 text-xl" /></div>
                <button onClick={handlePayOutstandingDues} className="w-full bg-emerald-600 text-white font-black uppercase py-3 rounded-xl text-xs shadow-md">Confirm Payment Settlement</button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------- 🔥 ENTERPRISE HARDWARE DYNAMIC PRINT ENGINE ------------------- */}
        <div id="enterprise-receipt-print-area" className="hidden text-black font-mono p-4 w-full">
          <div className="text-center pb-2 border-b-2 border-black">
            <h2 className="font-black text-xl uppercase tracking-tight">{printerConfig.headerName || "RAMKESAR POS"}</h2>
            <p className="text-[11px] font-black tracking-widest text-center w-full mt-1">
              {activeView === 'INVENTORY' && `** MASTER INVENTORY LOG [${stockLedgerView}] **`}
              {activeView === 'PURCHASE' && "** DAILY GOODS RECEIVED NOTE (GRN) RECORDS **"}
              {activeView === 'PURCHASE_ANALYTICS' && "** PROCUREMENT ANALYTICS REPORT **"}
              {activeView === 'VENDORS' && "** APPROVED VENDORS CREDIT OUTSTANDING RECORD **"}
            </p>
            <div className="flex justify-between text-[10px] mt-2 font-bold px-1 border-t border-solid border-black pt-1">
              <span>Filter Frame: {dateFilter.toUpperCase()}</span>
              <span>Date: {new Date().toLocaleDateString('en-IN')}</span>
            </div>
          </div>

          <div className="my-4">
            {activeView === 'INVENTORY' && (
              <table className="w-full text-[11px] mt-2 border-collapse">
                <thead><tr className="border-b-2 border-black text-left"><th className="pb-1 w-10">S.NO</th><th className="pb-1">SKU INVENTORY ITEMS DESCRIPTION</th><th className="pb-1 text-right">QUANTITY VALUE</th></tr></thead>
                <tbody>
                  {filteredInventory.map((item, idx) => {
                    const inwardQty = calculateInwardQuantity(item.itemName);
                    const consumedQty = calculateConsumedQuantity(item.itemName);
                    const calculatedOpening = item.stockLevel - inwardQty + consumedQty;
                    let printValue = "";
                    if(stockLedgerView==='LIVE') printValue = `${parseFloat(item.stockLevel).toFixed(2)} ${item.unit}`;
                    if(stockLedgerView==='OPENING') printValue = `${calculatedOpening.toFixed(2)} ${item.unit}`;
                    if(stockLedgerView==='INWARD') printValue = `+${inwardQty.toFixed(2)} ${item.unit}`;
                    if(stockLedgerView==='CONSUMED') printValue = `-${consumedQty.toFixed(2)} ${item.unit}`;
                    if(stockLedgerView==='CLOSING') printValue = `${parseFloat(item.stockLevel).toFixed(2)} ${item.unit}`;

                    return (
                      <tr key={item.id} className="border-b border-gray-300">
                        <td className="py-2">{idx + 1}.</td>
                        <td className="py-2 font-black uppercase text-xs">{item.itemName}</td>
                        <td className="py-2 text-right font-mono font-black">{printValue}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {activeView === 'PURCHASE' && (
              <table className="w-full text-[11px] mt-2 border-collapse">
                <thead><tr className="border-b-2 border-black text-left"><th>SKU MATERIAL</th><th className="text-center">QTY RECEIVED</th><th className="text-right">NET TOTAL</th></tr></thead>
                <tbody>
                  {purchaseLogs.slice(0, 30).map((log: any, idx: number) => (
                    <tr key={idx} className="border-b border-gray-300">
                      <td className="py-2 font-black uppercase">{log.itemName}<br/><span className="text-[8px] font-normal text-slate-500">VEN: {log.vendor} | AUTH: {log.doar || "N/A"}</span></td>
                      <td className="py-2 text-center font-mono font-black">+{log.qty} {log.unit}</td>
                      <td className="py-2 text-right font-mono font-black">₹{log.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeView === 'PURCHASE_ANALYTICS' && (
              <div>
                <table className="w-full text-[11px] mt-2 border-collapse">
                  <thead><tr className="border-b-2 border-black text-left"><th>PO REFERENCE CODE</th><th>MATERIAL DESCRIPTION</th><th className="text-right">VALUATIONspent</th></tr></thead>
                  <tbody>
                    {filteredPurchaseLogs.map((l: any, idx: number) => (
                      <tr key={idx} className="border-b border-gray-300">
                        <td className="py-2 font-mono text-xs">{l.poNumber || l.refNo}</td>
                        <td className="py-2 uppercase font-black">{l.itemName}<br/><span className="text-[8px] font-normal text-slate-500">VNDR: {l.vendor} | QTY: {l.qty} {l.unit}</span></td>
                        <td className="py-2 text-right font-mono font-black text-sm">₹{l.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-between font-black text-xs mt-3 border-t-2 border-black pt-2"><span>SUMMARY CUMULATIVE SPEND POOL:</span><span>₹{totalProcurementFiltered.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-[10px] mt-1"><span>TOTAL INPUT TAX CREDIT POOL (GST):</span><span>₹{accruedGstTaxPool.toFixed(2)}</span></div>
              </div>
            )}

            {activeView === 'VENDORS' && (
              <table className="w-full text-[11px] mt-2 border-collapse">
                <thead><tr className="border-b-2 border-black text-left"><th>VENDOR PROFILE RECORD</th><th className="text-center">GRN ORDERS</th><th className="text-right">CREDIT OUTSTANDING</th></tr></thead>
                <tbody>
                  {vendorList.map((v, idx) => (
                    <tr key={v.id} className="border-b border-gray-300">
                      <td className="py-2 font-black uppercase">{idx + 1}. {v.name}<br/><span className="text-[8px] font-normal text-slate-500">PH: {v.phone} | GSTIN: {v.gstin || "N/A"}</span></td>
                      <td className="py-2 text-center font-mono">{v.totalOrders || 0} GRNs</td>
                      <td className="py-2 text-right font-mono font-black text-sm">₹{Number(v.outstanding || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex justify-between mt-10 pt-4 border-t border-black text-[10px] font-bold uppercase">
            <div className="text-center"><div className="w-32 border-b border-black mb-1 h-8"></div>Manager Signature</div>
            <div className="text-center"><div className="w-32 border-b border-black mb-1 h-8"></div>Auditor Verification</div>
          </div>
          <div className="text-center font-black mt-8 text-[9px] tracking-widest uppercase">--- END OF LEDGER DATA TRANSACTIONS ---</div>
        </div>

      </div>
    </>
  );
}
