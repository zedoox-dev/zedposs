"use client";
import { useState, useEffect } from "react";
import { useOutlet } from "../../context/OutletContext"; // Fixed Absolute Path
import { 
  ShoppingCart, Truck, FileText, Plus, Search, 
  Loader2, X, IndianRupee, Store, CheckCircle2, Trash2
} from "lucide-react";

export default function PurchasesPage() {
  const { selectedOutlet, outlets } = useOutlet();
  const [data, setData] = useState<{ purchases: any[], vendors: any[], inventory: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal & Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [poForm, setPoForm] = useState({
    vendorId: "",
    outletId: "",
    invoiceNumber: "",
    status: "RECEIVED",
  });
  
  // Dynamic Items Array
  const [poItems, setPoItems] = useState([{ inventoryId: "", quantity: "", costPrice: "" }]);

  useEffect(() => {
    fetchPurchases();
    // Default outlet assignment for the form
    if (selectedOutlet !== "ALL") setPoForm(prev => ({ ...prev, outletId: selectedOutlet }));
  }, [selectedOutlet]);

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/brand/purchases?outletId=${selectedOutlet}`);
      const json = await res.json();
      if (json.success) setData(json);
    } catch (e) {
      console.error("Fetch failed");
    } finally {
      setLoading(false);
    }
  };

  // Add Row in PO Form
  const handleAddItemRow = () => setPoItems([...poItems, { inventoryId: "", quantity: "", costPrice: "" }]);
  
  // Remove Row
  const handleRemoveItemRow = (index: number) => setPoItems(poItems.filter((_, i) => i !== index));

  // Handle Input Change for Rows
  const handleItemChange = (index: number, field: string, value: string) => {
    const newItems = [...poItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setPoItems(newItems);
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const res = await fetch("/api/brand/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...poForm, items: poItems })
      });
      if (res.ok) {
        setShowAddModal(false);
        setPoForm({ vendorId: "", outletId: selectedOutlet !== "ALL" ? selectedOutlet : "", invoiceNumber: "", status: "RECEIVED" });
        setPoItems([{ inventoryId: "", quantity: "", costPrice: "" }]);
        fetchPurchases();
      }
    } catch (e) {
      alert("Failed to create Purchase Order");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Retrieving Supply Chain Data...</p>
      </div>
    );
  }

  const filteredPurchases = data.purchases.filter((p: any) => 
    p.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.vendor?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSpend = data.purchases.reduce((sum, p) => sum + p.totalAmount, 0);

  return (
    <div className="max-w-[1400px] mx-auto animate-in fade-in duration-300 h-full flex flex-col pb-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
            <Truck className="mr-2 text-indigo-600" /> Procurements & POs
          </h1>
          <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">
            {selectedOutlet === "ALL" ? "Global Brand Supply Chain" : "Local Branch Purchases"}
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-sm shadow-indigo-500/30 transition-all active:scale-95">
          <Plus className="mr-1.5" size={16} /> Create PO (GRN)
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 shrink-0">
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-center text-white relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Expenditure</span>
            <IndianRupee size={16} className="text-emerald-400"/>
          </div>
          <p className="text-2xl font-mono font-black text-white">₹{totalSpend.toLocaleString()}</p>
        </div>
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-center shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Invoices</span>
            <FileText size={16} className="text-indigo-400"/>
          </div>
          <p className="text-2xl font-mono font-black text-slate-800">{data.purchases.length}</p>
        </div>
      </div>

      {/* PO Table */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" placeholder="Search Vendor or Invoice..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500 bg-white" 
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead className="bg-white sticky top-0 border-b border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400 z-10 shadow-sm">
              <tr>
                <th className="p-4">Date / Invoice No</th>
                {selectedOutlet === "ALL" && <th className="p-4">Receiving Branch</th>}
                <th className="p-4">Vendor Details</th>
                <th className="p-4 text-center">Items Count</th>
                <th className="p-4 text-right">Total Amount</th>
                <th className="p-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm font-bold text-slate-700">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center">
                    <ShoppingCart size={40} className="mx-auto text-slate-200 mb-3" />
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">No Purchase Orders Found</p>
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((po: any) => (
                  <tr key={po.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="font-mono text-xs text-indigo-600 font-black">{po.invoiceNumber || "N/A"}</div>
                      <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-black">
                        {new Date(po.createdAt).toLocaleDateString('en-GB')}
                      </div>
                    </td>
                    
                    {selectedOutlet === "ALL" && (
                      <td className="p-4 text-[10px] text-slate-600 uppercase tracking-widest font-black">
                        <span className="flex items-center"><Store size={10} className="mr-1 text-slate-400"/>{po.outlet?.name}</span>
                      </td>
                    )}
                    
                    <td className="p-4 font-black text-slate-800 uppercase text-xs">
                      {po.vendor?.name}
                    </td>

                    <td className="p-4 text-center">
                      <span className="bg-slate-100 text-slate-500 px-2.5 py-1 rounded-lg text-[10px] font-black">
                        {po._count.items} Items
                      </span>
                    </td>

                    <td className="p-4 text-right font-mono font-black text-slate-900">
                      ₹{po.totalAmount.toLocaleString()}
                    </td>

                    <td className="p-4 text-right">
                      {po.status === "RECEIVED" ? (
                        <span className="inline-flex items-center text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded">
                          <CheckCircle2 size={10} className="mr-1"/> Received
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[9px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded">
                          <Loader2 size={10} className="mr-1 animate-spin"/> Pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- CREATE PO MODAL --- */}
      {showAddModal && (
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-3xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-4 shrink-0">
              <div>
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center"><Truck size={18} className="mr-2 text-indigo-600"/> Create Purchase Order</h2>
                <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Mark as "Received" to automatically update inventory.</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full"><X size={18}/></button>
            </div>
            
            <form onSubmit={handleCreatePO} className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col">
              
              {/* Primary Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Select Vendor</label>
                  <select required value={poForm.vendorId} onChange={(e) => setPoForm({...poForm, vendorId: e.target.value})} className="w-full p-2.5 border-2 border-slate-100 rounded-xl outline-none text-xs font-bold uppercase focus:border-indigo-500 bg-slate-50">
                    <option value="" disabled>Choose Supplier...</option>
                    {data.vendors.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Receiving Branch</label>
                  <select required value={poForm.outletId} onChange={(e) => setPoForm({...poForm, outletId: e.target.value})} className="w-full p-2.5 border-2 border-slate-100 rounded-xl outline-none text-xs font-bold uppercase focus:border-indigo-500 bg-slate-50">
                    <option value="" disabled>Select Branch...</option>
                    {outlets.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Invoice No (Optional)</label>
                  <input type="text" placeholder="e.g. INV-2026" value={poForm.invoiceNumber} onChange={(e) => setPoForm({...poForm, invoiceNumber: e.target.value})} className="w-full p-2.5 border-2 border-slate-100 rounded-xl outline-none text-xs font-bold focus:border-indigo-500 bg-slate-50" />
                </div>
              </div>

              {/* Items Dynamic List */}
              <div className="mb-4">
                <h3 className="text-[10px] font-black uppercase text-indigo-600 tracking-widest border-b border-indigo-100 pb-2 mb-3 flex justify-between items-center">
                  Order Items (GRN)
                  <button type="button" onClick={handleAddItemRow} className="text-white bg-indigo-500 hover:bg-indigo-600 px-2 py-1 rounded text-[8px] flex items-center">
                    <Plus size={10} className="mr-1"/> Add Row
                  </button>
                </h3>
                
                <div className="space-y-3">
                  {poItems.map((item, index) => (
                    <div key={index} className="flex gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <select required value={item.inventoryId} onChange={(e) => handleItemChange(index, "inventoryId", e.target.value)} className="flex-1 p-2 border border-slate-200 rounded-lg outline-none text-xs font-bold uppercase focus:border-indigo-500 bg-white">
                        <option value="" disabled>Select Raw Material...</option>
                        {data.inventory
                          .filter((i: any) => poForm.outletId ? i.outletId === poForm.outletId : true)
                          .map((i: any) => <option key={i.id} value={i.id}>{i.itemName} ({i.unit})</option>)
                        }
                      </select>
                      <input required type="number" min="0.1" step="0.1" placeholder="Qty" value={item.quantity} onChange={(e) => handleItemChange(index, "quantity", e.target.value)} className="w-20 p-2 border border-slate-200 rounded-lg outline-none text-xs font-mono font-bold focus:border-indigo-500 text-center" />
                      <input required type="number" min="0" step="0.1" placeholder="Cost/Unit" value={item.costPrice} onChange={(e) => handleItemChange(index, "costPrice", e.target.value)} className="w-28 p-2 border border-slate-200 rounded-lg outline-none text-xs font-mono font-bold focus:border-indigo-500 text-center" />
                      {poItems.length > 1 && (
                        <button type="button" onClick={() => handleRemoveItemRow(index)} className="p-2 text-red-400 hover:bg-red-100 hover:text-red-600 rounded-lg transition-colors"><Trash2 size={14}/></button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4 shrink-0 mt-auto border-t border-slate-100">
                <div className="flex items-center gap-4 mb-4">
                  <label className="text-[10px] font-black uppercase text-slate-500">PO Status:</label>
                  <select value={poForm.status} onChange={(e) => setPoForm({...poForm, status: e.target.value})} className="p-2 border-2 border-slate-100 rounded-xl outline-none text-xs font-bold uppercase focus:border-indigo-500 bg-slate-50">
                    <option value="RECEIVED">Mark as Received (Adds Stock)</option>
                    <option value="PENDING">Pending (Draft Mode)</option>
                  </select>
                </div>

                <button disabled={isProcessing || !poForm.vendorId || !poForm.outletId || !poItems[0].inventoryId} type="submit" className="w-full bg-slate-900 text-white font-black uppercase tracking-widest py-3.5 rounded-xl text-xs flex justify-center items-center shadow-xl active:scale-95 transition-all disabled:opacity-50">
                  {isProcessing ? <Loader2 className="animate-spin" size={16}/> : "Generate PO & Update Ledger"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
