"use client";
import { useState, useEffect } from "react";
import { 
  Truck, Plus, Search, Loader2, X, Building2, 
  UserCircle, Phone, MapPin, Receipt, ShieldCheck
} from "lucide-react";

export default function VendorsDirectoryPage() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal & Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [vendorForm, setVendorForm] = useState({
    name: "", contactPerson: "", phone: "", email: "", address: "", gstNumber: ""
  });

  useEffect(() => {
    fetchVendors();
  }, []); // Global to the brand, independent of outlet switcher

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/brand/vendors");
      const json = await res.json();
      if (json.success) setVendors(json.vendors);
    } catch (e) {
      console.error("Vendor Sync Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const res = await fetch("/api/brand/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vendorForm)
      });
      const json = await res.json();
      
      if (res.ok && json.success) {
        setShowAddModal(false);
        setVendorForm({ name: "", contactPerson: "", phone: "", email: "", address: "", gstNumber: "" });
        fetchVendors();
      } else {
        alert("Error creating vendor.");
      }
    } catch (e) {
      alert("Network Error");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredVendors = vendors.filter(v => 
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (v.contactPerson && v.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Loading Supplier Directory...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto animate-in fade-in duration-300 h-full flex flex-col pb-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
            <Truck className="mr-2 text-indigo-600" /> Suppliers & Vendors
          </h1>
          <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">
            Manage B2B partners, raw material suppliers, and packaging vendors.
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-sm shadow-indigo-500/30 transition-all active:scale-95">
          <Plus className="mr-1.5" size={16} /> Add Supplier
        </button>
      </div>

      {/* Main Vendor Grid */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        
        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" placeholder="Search by company or person name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500 bg-white" 
            />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
            {vendors.length} Total Partners
          </span>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-50/30">
          {filteredVendors.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300">
              <Building2 size={60} className="mb-4 opacity-50" />
              <p className="text-xs font-black uppercase tracking-widest">No Suppliers Found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVendors.map((vendor: any) => (
                <div key={vendor.id} className="bg-white border border-slate-200 p-5 rounded-2xl hover:border-indigo-300 hover:shadow-md transition-all relative flex flex-col">
                  
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mr-3 shrink-0">
                        <Building2 size={18} />
                      </div>
                      <div>
                        <h3 className="font-black text-sm text-slate-900 uppercase leading-tight line-clamp-1">{vendor.name}</h3>
                        {vendor.gstNumber && (
                          <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 flex items-center mt-1">
                            <ShieldCheck size={10} className="mr-1"/> GST: {vendor.gstNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4 flex-1">
                    {vendor.contactPerson && (
                      <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-slate-600">
                        <UserCircle size={12} className="mr-2 text-slate-400"/> {vendor.contactPerson}
                      </div>
                    )}
                    <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-slate-600">
                      <Phone size={12} className="mr-2 text-slate-400"/> {vendor.phone}
                    </div>
                    {vendor.address && (
                      <div className="flex items-start text-[10px] font-black uppercase tracking-widest text-slate-600">
                        <MapPin size={12} className="mr-2 text-slate-400 shrink-0 mt-0.5"/> 
                        <span className="line-clamp-2 leading-tight">{vendor.address}</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-3 flex justify-between items-center mt-auto">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Total Purchase Orders</span>
                    <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest flex items-center border border-slate-200">
                      <Receipt size={12} className="mr-1.5 text-slate-400"/> {vendor._count?.purchaseOrders || 0} POs
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* --- ADD VENDOR MODAL --- */}
      {showAddModal && (
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl relative overflow-hidden border-t-8 border-indigo-600 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6 shrink-0 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center"><Truck size={18} className="mr-2 text-indigo-600"/> Add Supplier Profile</h2>
                <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Register a new B2B partner for procurements.</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full"><X size={18}/></button>
            </div>
            
            <form onSubmit={handleCreateVendor} className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Company / Vendor Name</label>
                  <input required type="text" placeholder="e.g. Amul Distributors" value={vendorForm.name} onChange={(e) => setVendorForm({...vendorForm, name: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-bold uppercase focus:border-indigo-500 bg-slate-50" />
                </div>
                
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Contact Person</label>
                  <input type="text" placeholder="e.g. Ramesh Kumar" value={vendorForm.contactPerson} onChange={(e) => setVendorForm({...vendorForm, contactPerson: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-bold uppercase focus:border-indigo-500 bg-slate-50" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Contact Phone</label>
                  <input required type="text" placeholder="10-digit mobile" value={vendorForm.phone} onChange={(e) => setVendorForm({...vendorForm, phone: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-mono font-bold focus:border-indigo-500 bg-slate-50" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">GSTIN Number (Optional)</label>
                <input type="text" placeholder="e.g. 07XXXXX1234X1ZX" value={vendorForm.gstNumber} onChange={(e) => setVendorForm({...vendorForm, gstNumber: e.target.value.toUpperCase()})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-mono font-bold uppercase focus:border-indigo-500 bg-slate-50" />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Full Address</label>
                <textarea rows={2} placeholder="Warehouse or shop address..." value={vendorForm.address} onChange={(e) => setVendorForm({...vendorForm, address: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-bold focus:border-indigo-500 bg-slate-50 custom-scrollbar" />
              </div>

              <div className="pt-2">
                <button disabled={isProcessing} type="submit" className="w-full bg-slate-900 text-white font-black uppercase tracking-widest py-3.5 rounded-xl text-xs flex justify-center items-center shadow-lg active:scale-95 transition-all disabled:opacity-50">
                  {isProcessing ? <Loader2 className="animate-spin" size={16}/> : "Register Supplier Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
