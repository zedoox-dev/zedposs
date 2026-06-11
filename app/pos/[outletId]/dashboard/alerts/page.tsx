import { db } from "@/lib/prisma";
import { Bell, AlertTriangle, PackageSearch, LifeBuoy } from "lucide-react";

export default async function AlertsPage({ params }: { params: { outletId: string } }) {
  // Step 1: Outlet fetch karke uska Tenant nikalenge (Support tickets ke liye)
  const outlet = await db.outlet.findUnique({
    where: { id: params.outletId },
    select: { tenantId: true }
  });

  // Step 2: Fetch Raw Inventory (JavaScript me filter karenge Low Stock ko)
  const allInventory = await db.inventory.findMany({
    where: { outletId: params.outletId, isDeleted: false },
    select: { id: true, itemName: true, stockLevel: true, minStock: true, unit: true }
  });

  // JS Filter for Low Stock 
  const lowStockAlerts = allInventory.filter(item => item.stockLevel <= item.minStock);

  // Step 3: Fetch Open Support Tickets (Tenant level pe)
  const openTickets = outlet ? await db.supportTicket.findMany({
    where: { tenantId: outlet.tenantId, status: { not: "CLOSED" } },
    orderBy: { createdAt: 'desc' }
  }) : [];

  return (
    <div className="p-6 h-full flex flex-col bg-slate-50 overflow-y-auto">
      <div className="flex items-center space-x-3 mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="bg-red-500/10 p-3 rounded-xl text-red-500">
          <Bell size={24} className="animate-bounce" />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-800 uppercase tracking-wider">System Alerts</h1>
          <p className="text-xs text-slate-500 font-bold tracking-wide">Action required for inventory & system health</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-10">
        
        {/* === LEFT COLUMN: INVENTORY ALERTS === */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-orange-50 border-b border-orange-100 p-4 flex items-center space-x-2 text-orange-600">
            <AlertTriangle size={18} />
            <h2 className="text-sm font-black uppercase tracking-widest">Low Stock Warnings ({lowStockAlerts.length})</h2>
          </div>
          <div className="p-4 flex-1 overflow-y-auto max-h-96">
            {lowStockAlerts.length === 0 ? (
              <div className="text-center text-slate-400 py-10">
                <PackageSearch size={32} className="mx-auto mb-2 opacity-50"/>
                <p className="text-xs font-bold uppercase">All stock levels look good!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockAlerts.map(item => (
                  <div key={item.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{item.itemName}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase">Min Limit: {item.minStock} {item.unit}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-red-500 font-black text-lg block leading-none">{item.stockLevel}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">{item.unit} left</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* === RIGHT COLUMN: SUPPORT ALERTS === */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-slate-100 border-b border-slate-200 p-4 flex items-center space-x-2 text-slate-600">
            <LifeBuoy size={18} />
            <h2 className="text-sm font-black uppercase tracking-widest">Active Support Tickets ({openTickets.length})</h2>
          </div>
          <div className="p-4 flex-1 overflow-y-auto max-h-96">
            {openTickets.length === 0 ? (
              <div className="text-center text-slate-400 py-10">
                <p className="text-xs font-bold uppercase">No pending support issues.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {openTickets.map(ticket => (
                  <div key={ticket.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">#{ticket.ticketNumber}</span>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${ticket.priority === 'CRITICAL' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                        {ticket.priority}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-700">{ticket.subject}</p>
                    <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between items-center text-[10px]">
                      <span className="font-bold text-slate-400 uppercase">Status: {ticket.status}</span>
                      <span className="text-slate-400">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
