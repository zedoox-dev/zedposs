"use client";
import { useState, useEffect } from "react";
import { ToggleLeft, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";

export default function ItemTogglePage() {
  const params = useParams();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    try {
      const res = await fetch(`/api/pos/${params.outletId}/items`);
      const json = await res.json();
      if (json.success) setItems(json.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [params.outletId]);

  const handleToggle = async (itemId: string, currentStatus: boolean) => {
    // Optimistic UI update
    setItems(items.map(i => i.id === itemId ? { ...i, isActive: !currentStatus } : i));
    
    try {
      await fetch(`/api/pos/${params.outletId}/items`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, isActive: !currentStatus })
      });
    } catch (error) {
      console.error("Failed to toggle");
      fetchItems(); // Revert on failure
    }
  };

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" size={40}/></div>;

  return (
    <div className="p-6 h-full flex flex-col bg-slate-50">
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="bg-pink-500/10 p-3 rounded-xl text-pink-500">
            <ToggleLeft size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-wider">Item On/Off Manager</h1>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex-1 p-4 overflow-y-auto">
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {items.map((item) => (
              <div key={item.id} className="p-4 border border-slate-100 rounded-xl flex justify-between items-center bg-slate-50">
                 <div>
                    <h3 className="text-sm font-black text-slate-800">{item.name}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{item.category}</p>
                 </div>
                 <button 
                   onClick={() => handleToggle(item.id, item.isActive)}
                   className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none ${item.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                 >
                   <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 shadow-sm ${item.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                 </button>
              </div>
            ))}
         </div>
      </div>
    </div>
  );
}
