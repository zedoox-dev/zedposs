"use client";
import { useState, useEffect } from "react";
import { useOutlet } from "../../context/OutletContext";
import { 
  ChefHat, FlaskConical, Plus, Search, Scale, 
  Loader2, X, Factory, CheckCircle2, ClipboardList
} from "lucide-react";

export default function KitchenProductionPage() {
  const { selectedOutlet, outlets } = useOutlet();
  const [data, setData] = useState<{ batches: any[], finishedGoods: any[], rawMaterials: any[], recipes: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("BATCHES"); // BATCHES or RECIPES
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Forms
  const [batchForm, setBatchForm] = useState({ finishedGoodId: "", quantityProduced: "", batchNumber: "", outletId: "" });
  const [recipeForm, setRecipeForm] = useState({ finishedGoodId: "", rawMaterialId: "", quantityUsed: "" });

  useEffect(() => {
    fetchProductionData();
    if (selectedOutlet !== "ALL") setBatchForm(prev => ({ ...prev, outletId: selectedOutlet }));
  }, [selectedOutlet]);

  const fetchProductionData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/brand/production?outletId=${selectedOutlet}`);
      const json = await res.json();
      if (json.success) setData(json);
    } catch (e) {
      console.error("Fetch failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const res = await fetch("/api/brand/production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType: "LOG_BATCH", ...batchForm })
      });
      if (res.ok) {
        setShowBatchModal(false);
        setBatchForm({ finishedGoodId: "", quantityProduced: "", batchNumber: "", outletId: selectedOutlet !== "ALL" ? selectedOutlet : "" });
        fetchProductionData();
      }
    } catch (e) {
      alert("Failed to log batch");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const res = await fetch("/api/brand/production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType: "CREATE_RECIPE", ...recipeForm })
      });
      if (res.ok) {
        setShowRecipeModal(false);
        setRecipeForm({ finishedGoodId: "", rawMaterialId: "", quantityUsed: "" });
        fetchProductionData();
      }
    } catch (e) {
      alert("Failed to create recipe mapping");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-amber-500 mb-4" size={40} />
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Syncing Kitchen Production Engine...</p>
      </div>
    );
  }

  // Filter Data
  const filteredBatches = data.batches.filter((b: any) => 
    b.batchNumber?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    b.finishedGood?.itemName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-[1400px] mx-auto animate-in fade-in duration-300 h-full flex flex-col pb-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
            <Factory className="mr-2 text-amber-600" /> Kitchen Production (BOM)
          </h1>
          <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">
            {selectedOutlet === "ALL" ? "Central Kitchen Operations" : "Branch Batch Operations"}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={() => setShowRecipeModal(true)} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-sm transition-all active:scale-95">
            <FlaskConical className="mr-2" size={14} /> Map Recipe
          </button>
          <button onClick={() => setShowBatchModal(true)} className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-sm shadow-amber-500/30 transition-all active:scale-95">
            <Plus className="mr-1.5" size={16} /> Log Production Batch
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 shrink-0 border-b border-slate-200 pb-2">
        <button onClick={() => setActiveTab("BATCHES")} className={`px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors rounded-t-xl ${activeTab === "BATCHES" ? 'text-amber-600 border-b-2 border-amber-600 bg-amber-50/50' : 'text-slate-500 hover:bg-slate-100'}`}>
          Daily Batch Logs
        </button>
        <button onClick={() => setActiveTab("RECIPES")} className={`px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors rounded-t-xl ${activeTab === "RECIPES" ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:bg-slate-100'}`}>
          Master Recipes (BOM)
        </button>
      </div>

      <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        
        {/* Search */}
        <div className="p-4 border-b border-slate-100 flex items-center bg-slate-50 shrink-0">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" placeholder={activeTab === "BATCHES" ? "Search Batches..." : "Search Recipes..."} 
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-amber-500 bg-white" 
            />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          
          {activeTab === "BATCHES" && (
            <table className="w-full text-left">
              <thead className="bg-white sticky top-0 border-b border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400 z-10 shadow-sm">
                <tr>
                  <th className="p-4">Batch Number / Date</th>
                  {selectedOutlet === "ALL" && <th className="p-4">Kitchen Location</th>}
                  <th className="p-4">Finished Product</th>
                  <th className="p-4 text-center">Qty Produced</th>
                  <th className="p-4 text-right">Logged By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm font-bold text-slate-700">
                {filteredBatches.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-slate-400">
                      <ChefHat size={40} className="mx-auto mb-3 opacity-30"/>
                      <p className="text-xs font-black uppercase tracking-widest">No Batches Logged</p>
                    </td>
                  </tr>
                ) : (
                  filteredBatches.map((b: any) => (
                    <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="font-mono text-xs text-amber-600 font-black">{b.batchNumber}</div>
                        <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">{new Date(b.createdAt).toLocaleDateString('en-GB')} {new Date(b.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                      </td>
                      {selectedOutlet === "ALL" && <td className="p-4 text-[10px] text-slate-600 uppercase tracking-widest font-black">{b.outlet?.name}</td>}
                      <td className="p-4 font-black text-slate-800 uppercase text-xs">{b.finishedGood?.itemName}</td>
                      <td className="p-4 text-center">
                        <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg text-[10px] font-black border border-emerald-100 flex items-center justify-center w-fit mx-auto">
                          <CheckCircle2 size={12} className="mr-1"/> +{b.quantityProduced} {b.finishedGood?.unit}
                        </span>
                      </td>
                      <td className="p-4 text-right text-[10px] uppercase text-slate-500 font-black">
                        {b.createdByUser?.name}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === "RECIPES" && (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.finishedGoods.map((fg: any) => {
                const fgRecipes = data.recipes.filter((r: any) => r.finishedGoodId === fg.id);
                return (
                  <div key={fg.id} className="border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <h3 className="font-black text-sm uppercase text-slate-900 flex items-center border-b border-slate-100 pb-3 mb-3">
                      <ClipboardList size={16} className="mr-2 text-indigo-500"/> {fg.itemName}
                    </h3>
                    {fgRecipes.length === 0 ? (
                      <p className="text-[10px] font-bold text-amber-500 bg-amber-50 p-2 rounded">No raw materials mapped. Add recipe to enable auto-deduction.</p>
                    ) : (
                      <ul className="space-y-2">
                        {fgRecipes.map((r: any) => (
                          <li key={r.id} className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-600 bg-slate-50 p-2 rounded-lg">
                            <span>{r.rawMaterial?.itemName}</span>
                            <span className="text-red-500">- {r.quantityUsed} {r.rawMaterial?.unit} <span className="text-slate-400">per 1 {fg.unit}</span></span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
          )}

        </div>
      </div>

      {/* --- LOG BATCH MODAL --- */}
      {showBatchModal && (
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden border-t-8 border-amber-500">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center"><Factory size={18} className="mr-2 text-amber-600"/> Log Daily Batch</h2>
                <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Auto-deducts ingredients based on BOM.</p>
              </div>
              <button onClick={() => setShowBatchModal(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full"><X size={18}/></button>
            </div>
            
            <form onSubmit={handleLogBatch} className="space-y-4">
              {selectedOutlet === "ALL" && (
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Kitchen Location</label>
                  <select required value={batchForm.outletId} onChange={(e) => setBatchForm({...batchForm, outletId: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-bold uppercase focus:border-amber-500 bg-slate-50">
                    <option value="" disabled>Select Branch...</option>
                    {outlets.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
              )}
              
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Finished Product</label>
                <select required value={batchForm.finishedGoodId} onChange={(e) => setBatchForm({...batchForm, finishedGoodId: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-bold uppercase focus:border-amber-500 bg-slate-50">
                  <option value="" disabled>Select Samosa, Lassi, etc...</option>
                  {data.finishedGoods
                    .filter((fg: any) => batchForm.outletId ? fg.outletId === batchForm.outletId : true)
                    .map((fg: any) => <option key={fg.id} value={fg.id}>{fg.itemName}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Quantity Produced</label>
                  <input required type="number" min="1" step="0.1" placeholder="e.g. 500" value={batchForm.quantityProduced} onChange={(e) => setBatchForm({...batchForm, quantityProduced: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xl font-mono font-black focus:border-amber-500 text-center" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Batch Code (Opt)</label>
                  <input type="text" placeholder="Auto-generated" value={batchForm.batchNumber} onChange={(e) => setBatchForm({...batchForm, batchNumber: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-mono font-bold focus:border-amber-500 bg-slate-50" />
                </div>
              </div>

              <button disabled={isProcessing} type="submit" className="w-full mt-4 bg-slate-900 text-white font-black uppercase tracking-widest py-3.5 rounded-xl text-xs flex justify-center items-center shadow-lg active:scale-95 transition-all disabled:opacity-50">
                {isProcessing ? <Loader2 className="animate-spin" size={16}/> : "Confirm Batch & Deduct Raw Material"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MAP RECIPE MODAL --- */}
      {showRecipeModal && (
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden border-t-8 border-indigo-500">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center"><Scale size={18} className="mr-2 text-indigo-600"/> Recipe Editor (BOM)</h2>
                <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Map ingredients to finished products.</p>
              </div>
              <button onClick={() => setShowRecipeModal(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full"><X size={18}/></button>
            </div>
            
            <form onSubmit={handleCreateRecipe} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Finished Product</label>
                <select required value={recipeForm.finishedGoodId} onChange={(e) => setRecipeForm({...recipeForm, finishedGoodId: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-bold uppercase focus:border-indigo-500 bg-slate-50">
                  <option value="" disabled>e.g. Samosa</option>
                  {data.finishedGoods.map((fg: any) => <option key={fg.id} value={fg.id}>{fg.itemName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Ingredient to Deduct</label>
                <select required value={recipeForm.rawMaterialId} onChange={(e) => setRecipeForm({...recipeForm, rawMaterialId: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-bold uppercase focus:border-indigo-500 bg-slate-50">
                  <option value="" disabled>e.g. Maida</option>
                  {data.rawMaterials.map((rm: any) => <option key={rm.id} value={rm.id}>{rm.itemName} ({rm.unit})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Amount Used (Per 1 Unit of Product)</label>
                <input required type="number" min="0.001" step="0.001" placeholder="e.g. 0.05" value={recipeForm.quantityUsed} onChange={(e) => setRecipeForm({...recipeForm, quantityUsed: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xl font-mono font-black focus:border-indigo-500 text-center" />
              </div>

              <button disabled={isProcessing} type="submit" className="w-full mt-4 bg-indigo-600 text-white font-black uppercase tracking-widest py-3.5 rounded-xl text-xs flex justify-center items-center shadow-lg active:scale-95 transition-all disabled:opacity-50">
                {isProcessing ? <Loader2 className="animate-spin" size={16}/> : "Link Ingredient to Recipe"}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
