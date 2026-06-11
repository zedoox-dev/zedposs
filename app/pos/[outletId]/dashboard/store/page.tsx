"use client";
import { useState, useEffect } from "react";
import { Store, MapPin, Mail, Building, Clock, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";

export default function StorePage() {
  const params = useParams();
  const [outlet, setOutlet] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStore = async () => {
      try {
        const res = await fetch(`/api/pos/${params.outletId}/store`);
        const json = await res.json();
        if (json.success) setOutlet(json.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchStore();
  }, [params.outletId]);

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" size={40}/></div>;
  if (!outlet) return <div className="p-6 text-center text-slate-500 font-bold uppercase">Outlet not found</div>;

  return (
    <div className="p-6 h-full flex flex-col bg-slate-50 items-center justify-start pt-10 overflow-y-auto">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden relative">
        <div className="h-32 bg-slate-900 absolute top-0 left-0 right-0 z-0"></div>
        <div className="relative z-10 px-8 pt-20 pb-8 flex flex-col items-center text-center">
          <div className="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center border-4 border-slate-50 text-orange-500 mb-4">
            <Store size={40} />
          </div>
          <h1 className="text-3xl font-black text-slate-800 uppercase tracking-widest">{outlet.name}</h1>
          <p className="text-xs font-bold text-orange-500 tracking-widest uppercase mt-1">ID: {outlet.id}</p>
          
          <div className="w-full mt-10 grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h3 className="text-[10px] font-black uppercase text-slate-400 mb-4 flex items-center"><MapPin size={12} className="mr-2" /> Location Details</h3>
              <p className="text-sm font-bold text-slate-700">{outlet.address}</p>
            </div>
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h3 className="text-[10px] font-black uppercase text-slate-400 mb-4 flex items-center"><Building size={12} className="mr-2" /> Tenant Info</h3>
              <p className="text-sm font-bold text-slate-700">{outlet.tenant.businessName}</p>
              <p className="text-xs font-bold text-slate-500 mt-1 flex items-center"><Mail size={12} className="mr-1"/> {outlet.tenant.ownerEmail}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
