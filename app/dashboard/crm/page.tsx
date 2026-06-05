"use client";
import { useState, useEffect } from "react";
import { useOutlet } from "../../context/OutletContext"; // Fixed Absolute Path
import { 
  Users, Search, Loader2, Star, Download, 
  TrendingUp, Clock, Medal, Smartphone
} from "lucide-react";

export default function CustomerCRMPage() {
  const { selectedOutlet } = useOutlet();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchCustomers();
  }, [selectedOutlet]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/brand/crm?outletId=${selectedOutlet}`);
      const json = await res.json();
      if (json.success) {
        setCustomers(json.customers);
      }
    } catch (e) {
      console.error("CRM Sync Failed");
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.phone.includes(searchQuery)
  );

  // Quick Stats Calculation
  const totalCustomers = customers.length;
  const vipCustomers = customers.filter(c => c.totalSpent > 2000).length; // Example VIP threshold: 2000 INR
  const totalLoyaltyPoints = customers.reduce((sum, c) => sum + c.loyaltyPoints, 0);

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Syncing Customer Database...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto animate-in fade-in duration-300 h-full flex flex-col pb-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
            <Users className="mr-2 text-indigo-600" /> Customer CRM
          </h1>
          <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">
            {selectedOutlet === "ALL" ? "Global Brand Audience" : "Local Branch Footfall"}
          </p>
        </div>
        <button className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-sm transition-all active:scale-95">
          <Download className="mr-1.5" size={16} /> Export Data
        </button>
      </div>

      {/* CRM Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 shrink-0">
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl flex items-center justify-between text-white">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Customers</span>
            <p className="text-3xl font-mono font-black text-white mt-1">{totalCustomers}</p>
          </div>
          <Users size={32} className="text-slate-700" />
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">VIP Members (&gt;₹2k Spent)</span>
            <p className="text-3xl font-mono font-black text-amber-500 mt-1">{vipCustomers}</p>
          </div>
          <Medal size={32} className="text-amber-100" />
        </div>

        <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Loyalty Points Issued</span>
            <p className="text-3xl font-mono font-black text-indigo-700 mt-1">{totalLoyaltyPoints.toLocaleString()}</p>
          </div>
          <Star size={32} className="text-indigo-200" />
        </div>
      </div>

      {/* CRM Data Table */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        
        {/* Table Controls */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Search Phone or Name..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500 bg-white" 
            />
          </div>
        </div>

        {/* Scrollable Table Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead className="bg-white sticky top-0 border-b border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400 z-10 shadow-sm">
              <tr>
                <th className="p-4">Customer Details</th>
                <th className="p-4 text-center">Loyalty Points</th>
                <th className="p-4 text-center">Total Visits</th>
                <th className="p-4 text-right">Lifetime Value (Spent)</th>
                <th className="p-4 text-right">Last Visit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm font-bold text-slate-700">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center">
                    <Users size={40} className="mx-auto text-slate-200 mb-3" />
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">No Customers Found</p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer: any) => (
                  <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="font-black text-sm text-slate-900 uppercase">
                        {customer.name}
                        {customer.totalSpent > 2000 && <Star size={12} className="inline ml-2 text-amber-500 fill-amber-500 mb-1" title="VIP Customer" />}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1 font-mono flex items-center">
                        <Smartphone size={10} className="mr-1 text-slate-400"/> {customer.phone}
                      </div>
                    </td>

                    <td className="p-4 text-center">
                      <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md text-[10px] uppercase tracking-widest border border-indigo-100 font-black inline-flex items-center">
                        <Star size={10} className="mr-1"/> {customer.loyaltyPoints} PTS
                      </span>
                    </td>

                    <td className="p-4 text-center">
                      <span className="font-mono text-base font-black text-slate-800">
                        {customer.totalVisits}
                      </span>
                    </td>

                    <td className="p-4 text-right font-mono text-base font-black text-emerald-600">
                      ₹{customer.totalSpent.toLocaleString()}
                    </td>

                    <td className="p-4 text-right">
                      {customer.lastVisit ? (
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black flex justify-end items-center">
                          <Clock size={10} className="mr-1"/> {new Date(customer.lastVisit).toLocaleDateString('en-GB')}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
