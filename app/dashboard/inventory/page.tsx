"use client";
import { useState, useEffect } from "react";
// YAHAN PATH FIX KIYA HAI (../ ki jagah ../../ kiya hai taaki wo sahi folder me jaye)
import { useOutlet } from "../../context/OutletContext";
import { 
  Package, AlertTriangle, Plus, ArrowDownToLine, ArrowUpFromLine, 
  Search, Filter, Loader2, X, CheckCircle2 
} from "lucide-react";

export default function InventoryMatrixPage() {
  const { selectedOutlet, outlets } = useOutlet();
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState<{ id: string, name: string, current: number, unit: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Forms
  const [newItem, setNewItem] = useState({ itemName: "", type: "RAW_MATERIAL", unit: "KG", minStock: "5", outletId: "" });
  const [adjustData, setAdjustData] = useState({ quantity: "", action: "ADD" });

  useEffect(() => {
    fetchInventory();
    // Default outlet selection for Add form
    if (selectedOutlet !== "ALL") setNewItem(prev => ({ ...prev, outletId: selectedOutlet }));
    else if (outlets.length > 0) setNewItem(prev => ({ ...prev, outletId: outlets[0].id }));
  }, [selectedOutlet, outlets]);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/brand/inventory?outletId=${selectedOutlet}`);
      const data = await res.json();
      if (data.success) setInventory(data.inventory);
    } catch (e) {
      console.error("Inventory Fetch Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const res = await fetch("/api/brand/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem)
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewItem({ ...newItem, itemName: "" });
        fetchInventory();
      }
    } catch (e) {
      alert("Failed to add item");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const res = await fetch("/api/brand/inventory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: showAdjustModal?.id, ...adjustData })
      });
      if (res.ok) {
        setShowAdjustModal(null);
        setAdjustData({ quantity: "", action: "ADD" });
        fetchInventory();
      }
    } catch (e) {
      alert("Failed to update stock");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredInventory = inventory.filter(item => 
    item.itemName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockCount = inventory.filter(i => i.stockLevel <= i.minStock).length;

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Scanning Warehouses...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto animate-in fade-in duration-300 h-full flex flex-col pb-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
            <Package className="mr-2 text-indigo-600" /> Inventory Matrix
          </h1>
          <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">
            {selectedOutlet === "ALL" ? "HQ Combined Warehouse View" : "Local Branch Stock View"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowAddModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-sm shadow-indigo-500/30 transition-all active:scale-95">
            <Plus className="mr-1.5" size={16} /> Register Item
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 shrink-0">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Monitored Items</span>
            <p className="text-3xl font-mono font-black text-slate-800 mt-1">{inventory.length}</p>
          </div>
          <Package size={32} className="text-slate-200" />
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Optimal Stock</span>
            <p className="text-3xl font-mono font-black text-emerald-600 mt-1">{inventory.length - lowStockCount}</p>
          </div>
          <CheckCircle2 size={32} className="text-emerald-100" />
        </div>
        <div className="bg-red-50 p-5 rounded-2xl border border-red-100 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Low Stock Alerts</span>
            <p className="text-3xl font-mono font-black text-red-600 mt-1">{lowStockCount}</p>
          </div>
          <AlertTriangle size={32} className="text-red-200" />
        </div>
      </div>

      {/* Main Table */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        
        {/* Controls */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Search Items (e.g., Maida, Oil)..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500 bg-white" 
            />
          </div>
          <button className="text-slate-400 hover:text-indigo-600 transition-colors"><Filter size={18} /></button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead className="bg-white sticky top-0 border-b border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400 z-10 shadow-sm">
              <tr>
                <th className="p-4">Item Name / Category</th>
                {selectedOutlet === "ALL" && <th className="p-4">Branch</th>}
                <th className="p-4">Current Stock</th>
                <th className="p-4">Min. Threshold</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm font-bold text-slate-700">
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center">
                    <Package size={40} className="mx-auto text-slate-200 mb-3" />
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">No Inventory Found</p>
                  </td>
                </tr>
              ) : (
                filteredInventory.map((item: any) => {
                  const isLow = item.stockLevel <= item.minStock;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="font-black text-xs text-slate-900 uppercase flex items-center">
                          {item.itemName}
                          {isLow && <AlertTriangle size={12} className="text-red-500 ml-2" />}
                        </div>
                        <div className="text-[9px] text-slate-400 mt-1 uppercase tracking-widest font-black">
                          {item.type.replace("_", " ")}
                        </div>
                      </td>
                      
                      {selectedOutlet === "ALL" && (
                        <td className="p-4 text-[10px] text-indigo-600 uppercase tracking-widest font-black bg-indigo-50/30">
                          {item.outlet?.name}
                        </td>
                      )}
                      
                      <td className="p-4">
                        <span className={`font-mono text-base font-black ${isLow ? 'text-red-600' : 'text-slate-900'}`}>
                          {item.stockLevel} <span className="text-[10px] text-slate-400">{item.unit}</span>
                        </span>
                      </td>

                      <td className="p-4">
                        <span className="font-mono text-xs text-slate-400">
                          {item.minStock} {item.unit}
                        </span>
                      </td>

                      <td className="p-4 text-right">
                        <button 
                          onClick={() => setShowAdjustModal({ id: item.id, name: item.itemName, current: item.stockLevel, unit: item.unit })}
                          className="bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors"
                        >
                          Update Stock
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- ADD ITEM MODAL --- */}
      {showAddModal && (
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center"><Package size={18} className="mr-2 text-indigo-600"/> Register Item</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full"><X size={18}/></button>
            </div>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Item Name</label>
                <input required type="text" placeholder="e.g. Samosa Maida" value={newItem.itemName} onChange={(e) => setNewItem({...newItem, itemName: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-bold uppercase focus:border-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Category</label>
                  <select value={newItem.type} onChange={(e) => setNewItem({...newItem, type: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-bold uppercase focus:border-indigo-500">
                    <option value="RAW_MATERIAL">Raw Material</option>
                    <option value="PACKAGING">Packaging</option>
                    <option value="FINISHED_GOOD">Finished Good</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Unit (KG, PCS, LTR)</label>
                  <input required type="text" placeholder="e.g. KG" value={newItem.unit} onChange={(e) => setNewItem({...newItem, unit: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-bold uppercase focus:border-indigo-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Low Stock Alert At</label>
                  <input required type="number" min="0" value={newItem.minStock} onChange={(e) => setNewItem({...newItem, minStock: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-mono font-bold focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Assign Branch</label>
                  <select disabled={selectedOutlet !== "ALL"} value={newItem.outletId} onChange={(e) => setNewItem({...newItem, outletId: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-bold uppercase focus:border-indigo-500 bg-slate-50 disabled:opacity-60">
                    {outlets.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
              </div>
              <button disabled={isProcessing} type="submit" className="w-full mt-2 bg-indigo-600 text-white font-black uppercase tracking-widest py-3.5 rounded-xl text-xs flex justify-center items-center shadow-lg active:scale-95 transition-all">
                {isProcessing ? <Loader2 className="animate-spin" size={16}/> : "Save Inventory Details"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- ADJUST STOCK MODAL --- */}
      {showAdjustModal && (
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl relative overflow-hidden border-t-8 border-indigo-600">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Stock Update</h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">{showAdjustModal.name} (Current: {showAdjustModal.current} {showAdjustModal.unit})</p>
              </div>
              <button onClick={() => setShowAdjustModal(null)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full"><X size={18}/></button>
            </div>
            
            <form onSubmit={handleAdjustStock}>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button type="button" onClick={() => setAdjustData({...adjustData, action: "ADD"})} className={`py-3 rounded-xl border flex items-center justify-center text-[10px] font-black uppercase tracking-widest transition-all ${adjustData.action === "ADD" ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-slate-200 text-slate-500'}`}>
                  <ArrowDownToLine size={14} className="mr-1.5"/> Stock In
                </button>
                <button type="button" onClick={() => setAdjustData({...adjustData, action: "SUBTRACT"})} className={`py-3 rounded-xl border flex items-center justify-center text-[10px] font-black uppercase tracking-widest transition-all ${adjustData.action === "SUBTRACT" ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white border-slate-200 text-slate-500'}`}>
                  <ArrowUpFromLine size={14} className="mr-1.5"/> Consume / Out
                </button>
              </div>
              
              <div className="mb-6">
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Quantity ({showAdjustModal.unit})</label>
                <input required type="number" min="0.1" step="0.1" placeholder="Enter Amount" value={adjustData.quantity} onChange={(e) => setAdjustData({...adjustData, quantity: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xl font-mono font-black focus:border-indigo-500 text-center" />
              </div>

              <button disabled={isProcessing || !adjustData.quantity} type="submit" className="w-full bg-slate-900 text-white font-black uppercase tracking-widest py-3.5 rounded-xl text-xs flex justify-center items-center shadow-lg active:scale-95 transition-all disabled:opacity-50">
                {isProcessing ? <Loader2 className="animate-spin" size={16}/> : "Confirm Ledger Entry"}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
