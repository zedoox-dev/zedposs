import { db } from "@/lib/prisma";
import { Store, MapPin, Mail, Building, Clock } from "lucide-react";

export default async function StorePage({ params }: { params: { outletId: string } }) {
  // 🔥 STRICT ISOLATION: Fetch strictly mapped outlet & tenant
  const outlet = await db.outlet.findUnique({
    where: { id: params.outletId },
    include: {
      tenant: true,
      region: true // Agar Area Manager wala region assigned hai
    }
  });

  if (!outlet) return <div>Outlet config not found.</div>;

  return (
    <div className="p-6 h-full flex flex-col bg-slate-50 items-center justify-start pt-10 overflow-y-auto">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden relative">
        <div className="h-32 bg-slate-900 absolute top-0 left-0 right-0 z-0 pattern-dots"></div>
        
        <div className="relative z-10 px-8 pt-20 pb-8 flex flex-col items-center text-center">
          <div className="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center border-4 border-slate-50 text-orange-500 mb-4">
            <Store size={40} />
          </div>
          
          <h1 className="text-3xl font-black text-slate-800 uppercase tracking-widest">{outlet.name}</h1>
          <p className="text-xs font-bold text-orange-500 tracking-widest uppercase mt-1">ID: {outlet.id}</p>
          
          <div className="w-full mt-10 grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center"><MapPin size={12} className="mr-2" /> Location Details</h3>
              <p className="text-sm font-bold text-slate-700">{outlet.address}</p>
              {outlet.region && <p className="text-xs font-semibold text-slate-500 mt-2 bg-slate-200 inline-block px-2 py-1 rounded">Region: {outlet.region.name}</p>}
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center"><Building size={12} className="mr-2" /> Business / Tenant Info</h3>
              <p className="text-sm font-bold text-slate-700">{outlet.tenant.businessName}</p>
              <p className="text-xs font-bold text-slate-500 mt-1 flex items-center"><Mail size={12} className="mr-1"/> {outlet.tenant.ownerEmail}</p>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 md:col-span-2 flex justify-between items-center">
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 flex items-center"><Clock size={12} className="mr-2" /> System Status</h3>
                <p className="text-xs font-bold text-slate-700">Terminal registered on: {new Date(outlet.createdAt).toLocaleDateString()}</p>
              </div>
              <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg ${outlet.isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                {outlet.isActive ? 'Terminal Active' : 'Suspended'}
              </span>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
