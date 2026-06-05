"use client";
import { useEffect, useState } from "react";
import { ChefHat, Plus, Link as LinkIcon, Loader2, Save } from "lucide-react";
import { useParams } from "next/navigation";

export default function RecipesPage() {
  const params = useParams();
  const outletId = params.outletId as string;

  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [selectedMenu, setSelectedMenu] = useState("");
  const [selectedRaw, setSelectedRaw] = useState("");
  const [quantity, setQuantity] = useState("");

  // Saara data ek sath lana (Menu + Inventory + Recipes)
  const fetchData = async () => {
    setLoading(true);
    try {
      const [menuRes, invRes, recRes] = await Promise.all([
        fetch("/api/menu"),
        fetch(`/api/inventory?outletId=${outletId}`),
        fetch("/api/recipes")
      ]);
      setMenuItems(await menuRes.json());
      setInventory(await invRes.json());
      setRecipes(await recRes.json());
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [outletId]);

  // Recipe Save karna
  const handleSaveRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMenu || !selectedRaw || !quantity) return alert("Pura form bhariye!");
    
    setIsSaving(true);
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menuItemId: selectedMenu,
          rawMaterialId: selectedRaw,
          quantityUsed: quantity
        })
      });
      if (res.ok) {
        setSelectedRaw("");
        setQuantity("");
        fetchData(); // List update karein
      }
    } catch (error) {
      alert("Error saving recipe");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 h-full flex flex-col bg-slate-50 overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            <ChefHat className="mr-2 text-orange-500" /> Recipe & BOM
          </h1>
          <p className="text-slate-500 text-sm">Link menu items to raw materials for auto-deduction</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-full">
        
        {/* LEFT SIDE: Create Recipe Form */}
        <div className="w-full lg:w-1/3 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 h-fit">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
            <LinkIcon size={18} className="mr-2 text-slate-400" /> Add New Mapping
          </h2>
          
          <form onSubmit={handleSaveRecipe} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Select Menu Item</label>
              <select 
                value={selectedMenu} 
                onChange={(e) => setSelectedMenu(e.target.value)} 
                className="w-full p-3 border border-slate-200 rounded-xl focus:ring-1 focus:ring-orange-500 outline-none bg-slate-50"
              >
                <option value="">-- Choose Item --</option>
                {menuItems.map(item => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>

            <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 space-y-4">
              <div>
                <label className="block text-sm font-bold text-orange-800 mb-1">Raw Material to Deduct</label>
                <select 
                  value={selectedRaw} 
                  onChange={(e) => setSelectedRaw(e.target.value)} 
                  className="w-full p-3 border border-orange-200 rounded-xl focus:ring-1 focus:ring-orange-500 outline-none"
                >
                  <option value="">-- Choose Raw Material --</option>
                  {inventory.map(inv => (
                    <option key={inv.id} value={inv.id}>{inv.itemName} ({inv.unit})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-orange-800 mb-1">Quantity Used per Item</label>
                <div className="flex space-x-2">
                  <input 
                    type="number" step="0.001" placeholder="e.g., 0.02" 
                    value={quantity} onChange={(e) => setQuantity(e.target.value)}
                    className="w-full p-3 border border-orange-200 rounded-xl focus:ring-1 focus:ring-orange-500 outline-none" 
                  />
                  <div className="bg-orange-200 text-orange-800 px-4 flex items-center justify-center rounded-xl font-bold text-sm">
                    {selectedRaw ? inventory.find(i => i.id === selectedRaw)?.unit : "UNIT"}
                  </div>
                </div>
              </div>
            </div>

            <button disabled={isSaving || loading} type="submit" className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold py-3.5 rounded-xl transition-all shadow-md flex justify-center items-center">
              {isSaving ? <Loader2 className="animate-spin" size={20} /> : <><Save size={18} className="mr-2" /> Save Mapping</>}
            </button>
          </form>
        </div>

        {/* RIGHT SIDE: View Saved Recipes */}
        <div className="flex-1 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 overflow-y-auto">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Configured Recipes</h2>
          
          {loading ? (
             <div className="flex justify-center py-10"><Loader2 className="animate-spin text-orange-500" size={32} /></div>
          ) : recipes.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <ChefHat size={48} className="mx-auto mb-3 opacity-20" />
              <p>No recipes mapped yet.</p>
              <p className="text-sm">Link your first item from the left panel!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Grouping recipes by Menu Item for cleaner display */}
              {menuItems.map(menuItem => {
                const itemRecipes = recipes.filter(r => r.finishedGoodId === menuItem.id);
                if (itemRecipes.length === 0) return null;

                return (
                  <div key={menuItem.id} className="border border-slate-200 rounded-2xl p-4 bg-slate-50">
                    <h3 className="font-black text-slate-800 border-b border-slate-200 pb-2 mb-3">{menuItem.name}</h3>
                    <ul className="space-y-2">
                      {itemRecipes.map(recipe => (
                        <li key={recipe.id} className="flex justify-between items-center text-sm font-medium text-slate-600 bg-white p-2 rounded-lg border border-slate-100">
                          <span>{recipe.rawMaterial.itemName}</span>
                          <span className="text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded">
                            {recipe.quantityUsed} {recipe.rawMaterial.unit}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
