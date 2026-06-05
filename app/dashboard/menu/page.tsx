"use client";
import { useState, useEffect } from "react";
import { useOutlet } from "../../context/OutletContext"; // Safe relative path
import { 
  ClipboardList, Plus, Search, Loader2, X, 
  CheckCircle2, XCircle, Coffee, Filter, UtensilsCrossed 
} from "lucide-react";

export default function MenuManagerPage() {
  const { selectedOutlet } = useOutlet(); // We pull this just to show UI warnings if needed
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & Forms
  const [showAddModal, setShowAddModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", price: "", category: "SNACKS" });

  useEffect(() => {
    fetchMenu();
  }, []); // Menu is global, doesn't need to refetch on outlet change

  const fetchMenu = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/brand/menu");
      const data = await res.json();
      if (data.success) setMenuItems(data.menuItems);
    } catch (e) {
      console.error("Menu Fetch Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAddMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const res = await fetch("/api/brand/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem)
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewItem({ name: "", price: "", category: "SNACKS" });
        fetchMenu();
      }
    } catch (e) {
      alert("Failed to add menu item");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      // Optimistic UI Update
      setMenuItems(menuItems.map(item => item.id === id ? { ...item, isActive: !currentStatus } : item));
      
      await fetch("/api/brand/menu", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !currentStatus })
      });
    } catch (e) {
      alert("Failed to update status");
      fetchMenu(); // Revert on failure
    }
  };

  const filteredMenu = menuItems.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCount = menuItems.filter(i => i.isActive).length;

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Syncing Master Menu...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto animate-in fade-in duration-300 h-full flex flex-col pb-8">
      
      {/* Dynamic Warning if not on "ALL" */}
      {selectedOutlet !== "ALL" && (
        <div className="mb-4 bg-indigo-50 border border-indigo-100 p-3 rounded-xl flex items-center justify-center shadow-sm">
          <UtensilsCrossed size={14} className="text-indigo-600 mr-2" />
          <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">
            Note: Menu modifications made here will apply centrally to <span className="underline">ALL Branches</span>.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
            <ClipboardList className="mr-2 text-indigo-600" /> Master Menu Pricing
          </h1>
          <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">
            Manage POS Catalog globally across the brand network.
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-sm shadow-indigo-500/30 transition-all active:scale-95">
          <Plus className="mr-1.5" size={16} /> Add Menu Item
        </button>
      </div>

      {/* Menu Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6 shrink-0">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Listed Items</span>
            <p className="text-3xl font-mono font-black text-slate-800 mt-1">{menuItems.length}</p>
          </div>
          <Coffee size={32} className="text-slate-200" />
        </div>
        <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Live on POS</span>
            <p className="text-3xl font-mono font-black text-emerald-700 mt-1">{activeCount}</p>
          </div>
          <CheckCircle2 size={32} className="text-emerald-200" />
        </div>
      </div>

      {/* Menu Table Area */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        
        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" placeholder="Search dish or category..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500 bg-white" 
            />
          </div>
          <button className="text-slate-400 hover:text-indigo-600 transition-colors"><Filter size={18} /></button>
        </div>

        {/* List Data */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead className="bg-white sticky top-0 border-b border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400 z-10 shadow-sm">
              <tr>
                <th className="p-4">Dish Name</th>
                <th className="p-4">Category</th>
                <th className="p-4 text-center">Price (INR)</th>
                <th className="p-4 text-right">POS Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm font-bold text-slate-700">
              {filteredMenu.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-10 text-center">
                    <ClipboardList size={40} className="mx-auto text-slate-200 mb-3" />
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">No Dishes Found</p>
                  </td>
                </tr>
              ) : (
                filteredMenu.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-black text-slate-900 uppercase">
                      {item.name}
                    </td>
                    
                    <td className="p-4">
                      <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-[9px] uppercase tracking-widest border border-slate-200 font-black">
                        {item.category}
                      </span>
                    </td>
                    
                    <td className="p-4 text-center">
                      <span className="font-mono text-base font-black text-indigo-600">
                        ₹{item.price.toFixed(2)}
                      </span>
                    </td>

                    <td className="p-4 text-right">
                      <button 
                        onClick={() => handleToggleStatus(item.id, item.isActive)}
                        className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 border ${item.isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200' : 'bg-red-50 text-red-600 border-red-200 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200'}`}
                      >
                        {item.isActive ? <CheckCircle2 size={12} className="mr-1.5"/> : <XCircle size={12} className="mr-1.5"/>}
                        {item.isActive ? "Live" : "Disabled"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- ADD DISH MODAL --- */}
      {showAddModal && (
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl relative overflow-hidden">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center"><UtensilsCrossed size={18} className="mr-2 text-indigo-600"/> Add to Menu</h2>
                <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Updates instantly on all branch POS</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full"><X size={18}/></button>
            </div>
            
            <form onSubmit={handleAddMenuItem} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Dish Name</label>
                <input required type="text" placeholder="e.g. Punjabi Samosa" value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-bold uppercase focus:border-indigo-500 bg-slate-50" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Category</label>
                  <select required value={newItem.category} onChange={(e) => setNewItem({...newItem, category: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-bold uppercase focus:border-indigo-500 bg-slate-50">
                    <option value="SNACKS">Snacks</option>
                    <option value="BEVERAGES">Beverages</option>
                    <option value="SWEETS">Sweets</option>
                    <option value="COMBOS">Combos</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Selling Price (₹)</label>
                  <input required type="number" min="0" step="0.01" placeholder="20.00" value={newItem.price} onChange={(e) => setNewItem({...newItem, price: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-mono font-bold focus:border-indigo-500 bg-slate-50" />
                </div>
              </div>

              <button disabled={isProcessing} type="submit" className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest py-3.5 rounded-xl text-xs flex justify-center items-center shadow-lg shadow-indigo-500/30 active:scale-95 transition-all">
                {isProcessing ? <Loader2 className="animate-spin" size={16}/> : "Push to Live POS"}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
