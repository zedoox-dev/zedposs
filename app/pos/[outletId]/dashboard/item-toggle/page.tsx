import { db } from "@/lib/prisma";
import { ToggleLeft } from "lucide-react";
import ToggleButtonClient from "./ToggleButtonClient"; // Client component separate banayenge

export default async function ItemTogglePage({ params }: { params: { outletId: string } }) {
  // 🔒 STRICT ISOLATION: Fetch menu items ONLY for this outlet
  const menuItems = await db.menuItem.findMany({
    where: { 
      outletId: params.outletId,
      isDeleted: false 
    },
    orderBy: { category: 'asc' }
  });

  return (
    <div className="p-6 h-full flex flex-col bg-slate-50">
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="bg-pink-500/10 p-3 rounded-xl text-pink-500">
            <ToggleLeft size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-wider">Item On/Off Manager</h1>
            <p className="text-xs text-slate-500 font-bold tracking-wide">Instantly disable out-of-stock items (Zomato/Swiggy synced)</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col">
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 overflow-y-auto">
            {menuItems.map((item) => (
              <div key={item.id} className="p-4 border border-slate-100 rounded-xl flex justify-between items-center hover:shadow-md transition-shadow bg-slate-50">
                 <div>
                    <h3 className="text-sm font-black text-slate-800">{item.name}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{item.category}</p>
                    <p className="text-xs font-black text-emerald-600 mt-1">₹{item.price}</p>
                 </div>
                 {/* Server Actions trigger karne ke liye client component */}
                 <ToggleButtonClient item={item} outletId={params.outletId} />
              </div>
            ))}
         </div>
      </div>
    </div>
  );
}
