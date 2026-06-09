"use client";
import { useEffect, useState } from "react";
import { Utensils, Plus, Loader2, Edit2, Trash2, FolderPlus, WifiOff } from "lucide-react";
import { useSession } from "next-auth/react";
import { localDB } from "@/lib/localDb";
import { useParams } from "next/navigation";

export default function MenuManagePage() {
  const params = useParams();
  const outletId = params.outletId as string;
  const { data: session } = useSession();

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(typeof window !== "undefined" ? navigator.onLine : true);

  // Form State
  const [formData, setFormData] = useState({ name: "", finalPrice: "", category: "" });
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState("");

  const existingCategories = Array.from(new Set(items.map(item => item.category)));

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); triggerOfflineQueueSync(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetchMenu();
    }
  }, [session, isOnline]);

  const triggerOfflineQueueSync = async () => {
    const secureOutletId = (session?.user as any)?.outletId || outletId;
    const savedQueue = localStorage.getItem(`zapped_offline_menu_queue_${secureOutletId}`);
    if (!savedQueue) return;
    const queue = JSON.parse(savedQueue);
    if (queue.length === 0) return;
    
    const remaining: any[] = [];
    for (const req of queue) {
      try {
        let url = "/api/menu";
        if (req.method === "DELETE") url += `?id=${req.id}`;
        
        const res = await fetch(url, {
          method: req.method,
          headers: { "Content-Type": "application/json" },
          body: req.method !== "DELETE" ? JSON.stringify(req.body) : undefined
        });
        if (!res.ok) remaining.push(req);
      } catch (err) { remaining.push(req); }
    }
    
    if (remaining.length === 0) localStorage.removeItem(`zapped_offline_menu_queue_${secureOutletId}`);
    else localStorage.setItem(`zapped_offline_menu_queue_${secureOutletId}`, JSON.stringify(remaining));
    
    fetchMenu();
  };

  const fetchMenu = async () => {
    if (!session?.user) return;
    const secureOutletId = (session.user as any).outletId || outletId;
    setLoading(true);

    if (!navigator.onLine) {
      try {
        // 🔥 STRICTLY FILTER BY OUTLET ID IN LOCAL DB
        const localMenus = await localDB.menuItems.where('outletId').equals(secureOutletId).toArray();
        const activeMenus = localMenus.filter(m => m.isActive !== false && m.isDeleted !== true);
        setItems(activeMenus);
        if (activeMenus.length > 0 && !formData.category) {
          setFormData(prev => ({ ...prev, category: activeMenus[0].category }));
        }
      } catch (error) {
        console.error("Offline DB Error");
      }
      setLoading(false);
      return;
    }

    try {
      // 🔒 NO TENANT ID OR OUTLET ID IN URL. Backend pulls from session.
      const res = await fetch(`/api/menu`);
      const data = await res.json();
      const menuData = Array.isArray(data) ? data : [];
      setItems(menuData);

      await localDB.menuItems.clear(); 
      if (menuData.length > 0) {
        await localDB.menuItems.bulkPut(menuData);
      }
      
      if (menuData.length > 0 && !formData.category) {
        setFormData(prev => ({ ...prev, category: menuData[0].category }));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) return;
    const secureOutletId = (session.user as any).outletId || outletId;

    setIsSaving(true);

    const finalCategory = isCustomCategory ? customCategoryName.trim() : formData.category;

    if (!finalCategory) {
      alert("Please select or type a category!");
      setIsSaving(false);
      return;
    }

    const generatedItemId = Math.floor(1000 + Math.random() * 9000);

    // 🔒 NO TENANT ID IN PAYLOAD. Backend handles assignment securely.
    const payload = {
      name: formData.name,
      finalPrice: formData.finalPrice,
      category: finalCategory
    };

    const method = editingId ? "PUT" : "POST";
    
    const bodyData = editingId 
      ? { id: editingId, ...payload } 
      : { ...payload, id: `offline-${Date.now()}`, ItemId: generatedItemId };

    if (!navigator.onLine) {
      const queue = JSON.parse(localStorage.getItem(`zapped_offline_menu_queue_${secureOutletId}`) || "[]");
      queue.push({ method, body: bodyData });
      localStorage.setItem(`zapped_offline_menu_queue_${secureOutletId}`, JSON.stringify(queue));
      
      await localDB.menuItems.put({ 
        ...bodyData, 
        price: parseFloat(payload.finalPrice), 
        outletId: secureOutletId,
        isActive: true, 
        isDeleted: false 
      });
      
      setFormData({ name: "", finalPrice: "", category: existingCategories[0] || "" });
      setCustomCategoryName(""); setIsCustomCategory(false); setEditingId(null);
      fetchMenu();
      setIsSaving(false);
      return alert("Offline Mode: Item saved locally. Will sync when online.");
    }

    try {
      const res = await fetch("/api/menu", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      });

      if (res.ok) {
        setFormData({ name: "", finalPrice: "", category: existingCategories[0] || "" });
        setCustomCategoryName("");
        setIsCustomCategory(false);
        setEditingId(null);
        fetchMenu();
      } else {
        alert("Something went wrong while saving the item!");
      }
    } catch (error) {
      alert("Network error.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setIsCustomCategory(false);
    setFormData({
      name: item.name,
      finalPrice: item.price.toString(),
      category: item.category
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Kya aap is menu item ko delete karna chahte hain?")) return;
    
    if (!navigator.onLine) {
      const secureOutletId = (session?.user as any)?.outletId || outletId;
      const queue = JSON.parse(localStorage.getItem(`zapped_offline_menu_queue_${secureOutletId}`) || "[]");
      queue.push({ method: "DELETE", id });
      localStorage.setItem(`zapped_offline_menu_queue_${secureOutletId}`, JSON.stringify(queue));
      
      await localDB.menuItems.update(id, { isActive: false, isDeleted: true });
      fetchMenu();
      return alert("Offline Mode: Delete queued.");
    }

    try {
      const res = await fetch(`/api/menu?id=${id}`, { method: "DELETE" });
      if (res.ok) fetchMenu();
    } catch (error) {
      alert("Error deleting item.");
    }
  };

  const finalPriceInput = parseFloat(formData.finalPrice) || 0;
  const calculatedBase = finalPriceInput / 1.05;
  const calculatedCgst = calculatedBase * 0.025;
  const calculatedSgst = calculatedBase * 0.025;

  return (
    <>
      <title>ZedPoss | Menu & Catalog Configuration</title>
      <meta name="description" content="Add, edit, and configure pricing for your POS terminal. Secure outlet-based menu isolation by ZedooX Technologies." />
      <meta name="keywords" content="Restaurant Menu Builder, Outlet Pricing POS, ZedPoss Menu, Cloud Menu Sync, GST Billing Pricing, Dynamic POS Menu, Cafe Menu Manager, Food Price Management, Quick Service Catalog, Item Modifiers POS, Secure Menu Database, Multi-Outlet Menu Control" />

      <div className="p-6 h-full flex flex-col lg:flex-row gap-6 bg-slate-50 overflow-y-auto">
        {/* FORM FIELD SIDEBAR PANEL */}
        <div className="w-full lg:w-96 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-fit">
          <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center">
            <Utensils className="mr-2 text-orange-500" />
            {editingId ? "Edit Menu Item" : "Create New Item"}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Item Name</label>
              <input required type="text" placeholder="e.g., ALOO SAMOSA" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl outline-none uppercase font-bold" />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-bold text-slate-700">Category</label>
                <button 
                  type="button" 
                  onClick={() => setIsCustomCategory(!isCustomCategory)} 
                  className="text-xs font-black text-orange-600 flex items-center bg-orange-50 px-2 py-1 rounded-lg hover:bg-orange-100"
                >
                  <FolderPlus size={14} className="mr-1" /> {isCustomCategory ? "Choose Existing" : "Add New Category"}
                </button>
              </div>

              {isCustomCategory ? (
                <input 
                  required 
                  type="text" 
                  placeholder="Type New Category Name" 
                  value={customCategoryName} 
                  onChange={(e) => setCustomCategoryName(e.target.value)} 
                  className="w-full p-3 border border-orange-300 rounded-xl outline-none font-bold placeholder:text-slate-400 bg-orange-50/20"
                />
              ) : (
                <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl outline-none bg-white font-bold">
                  {existingCategories.map(cat => (
                    <option key={cat as string} value={cat as string}>{cat as string}</option>
                  ))}
                  {existingCategories.length === 0 && <option value="">No Categories Present</option>}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Final Selling Price (Round Figure)</label>
              <input required type="number" placeholder="e.g., 40" value={formData.finalPrice} onChange={(e) => setFormData({...formData, finalPrice: e.target.value})} className="w-full p-3 border border-slate-200 rounded-xl outline-none font-black text-lg text-slate-900" />
            </div>

            <div className="bg-slate-900 text-slate-300 p-4 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between font-bold text-white mb-1"><span>Final Price:</span><span className="font-mono text-sm text-green-400">₹{finalPriceInput.toFixed(2)}</span></div>
              <div className="border-t border-slate-800 my-1 pt-1"></div>
              <div className="flex justify-between"><span>Reverse Base Price:</span><span className="font-mono">₹{calculatedBase.toFixed(2)}</span></div>
              <div className="flex justify-between text-slate-400"><span>CGST (2.5%):</span><span className="font-mono">₹{calculatedCgst.toFixed(2)}</span></div>
              <div className="flex justify-between text-slate-400"><span>SGST (2.5%):</span><span className="font-mono">₹{calculatedSgst.toFixed(2)}</span></div>
            </div>

            <div className="flex space-x-2 pt-2">
              {editingId && (
                <button type="button" onClick={() => { setEditingId(null); setFormData({name: "", finalPrice: "", category: existingCategories[0] as string || ""}); }} className="w-1/2 bg-slate-200 font-bold py-3 rounded-xl">Cancel</button>
              )}
              <button disabled={isSaving} type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl flex justify-center items-center">
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : editingId ? "Update Item" : "Add to Menu"}
              </button>
            </div>
          </form>
        </div>

        {/* REGISTRY TABLE PANEL */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-black text-slate-800 text-lg">Active Menu Registry ({items.length})</h3>
            {!isOnline && <span className="bg-red-100 text-red-600 border border-red-200 px-3 py-1 rounded-full text-xs font-black uppercase flex items-center"><WifiOff size={14} className="mr-1.5"/> Offline Mode</span>}
          </div>
          {loading ? (
            <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-orange-500" size={36}/></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 text-xs font-bold uppercase tracking-wider">
                    <th className="p-4">Item ID</th>
                    <th className="p-4">Item Name</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Base Price</th>
                    <th className="p-4">Tax (5% GST)</th>
                    <th className="p-4">Final Price</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {items.map(item => {
                    const base = item.price / 1.05;
                    const gst = item.price - base;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors uppercase">
                        <td className="p-4 font-mono font-bold text-slate-400 text-sm">#{item.ItemId || "----"}</td>
                        <td className="p-4 font-black text-slate-900 text-base">{item.name}</td>
                        <td className="p-4"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">{item.category}</span></td>
                        <td className="p-4 font-mono text-sm">₹{base.toFixed(2)}</td>
                        <td className="p-4 font-mono text-xs text-slate-400">₹{gst.toFixed(2)}</td>
                        <td className="p-4 font-black text-slate-900 text-base">₹{item.price}</td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <button onClick={() => handleEdit(item)} className="p-2 text-blue-500"><Edit2 size={16}/></button>
                            <button onClick={() => handleDelete(item.id)} className="p-2 text-red-500"><Trash2 size={16}/></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
