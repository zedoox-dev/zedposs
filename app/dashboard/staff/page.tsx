"use client";
import { useState, useEffect } from "react";
import { useOutlet } from "../../context/OutletContext"; // Fixed path
import { 
  Users, UserPlus, ShieldCheck, MapPin, Search, Mail, 
  Key, Loader2, X, AlertTriangle, Briefcase
} from "lucide-react";

export default function StaffManagementPage() {
  const { selectedOutlet } = useOutlet();
  const [data, setData] = useState<{ staff: any[], roles: any[], outlets: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal & Form States
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "", email: "", password: "", pin: "", roleId: "", primaryOutletId: "NONE"
  });
  const [selectedMultiOutlets, setSelectedMultiOutlets] = useState<string[]>([]);

  useEffect(() => {
    fetchStaffData();
  }, [selectedOutlet]);

  const fetchStaffData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/brand/staff?outletId=${selectedOutlet}`);
      const json = await res.json();
      if (json.success) setData(json);
    } catch (e) {
      console.error("Staff Sync Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMultiOutlet = (outletId: string) => {
    setSelectedMultiOutlets(prev => 
      prev.includes(outletId) ? prev.filter(id => id !== outletId) : [...prev, outletId]
    );
  };

  const handleOnboardStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/brand/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, multiOutletIds: selectedMultiOutlets })
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setShowAddModal(false);
        setFormData({ name: "", email: "", password: "", pin: "", roleId: "", primaryOutletId: "NONE" });
        setSelectedMultiOutlets([]);
        fetchStaffData();
      } else {
        alert(`Error: ${json.error}`);
      }
    } catch (e) {
      alert("Failed to create staff member");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Retrieving Personnel Data...</p>
      </div>
    );
  }

  const filteredStaff = data.staff.filter((s: any) => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-[1400px] mx-auto animate-in fade-in duration-300 h-full flex flex-col pb-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
            <Users className="mr-2 text-indigo-600" /> Human Resources
          </h1>
          <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">
            {selectedOutlet === "ALL" ? "Global Brand Employees" : "Local Branch Staff"}
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-sm shadow-indigo-500/30 transition-all active:scale-95">
          <UserPlus className="mr-1.5" size={16} /> Onboard Staff
        </button>
      </div>

      {/* Main Employee Directory Table */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" placeholder="Search by name or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500 bg-white" 
            />
          </div>
          <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg uppercase tracking-widest border border-indigo-100">
            {filteredStaff.length} Employees Found
          </span>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead className="bg-white sticky top-0 border-b border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400 z-10 shadow-sm">
              <tr>
                <th className="p-4">Employee Details</th>
                <th className="p-4">Assigned Role</th>
                <th className="p-4">Base Branch</th>
                <th className="p-4">Extended Access</th>
                <th className="p-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm font-bold text-slate-700">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center">
                    <Users size={40} className="mx-auto text-slate-200 mb-3" />
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">No Staff Members Found</p>
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff: any) => (
                  <tr key={staff.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="font-black text-sm text-slate-900 uppercase flex items-center">
                        {staff.name}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1 font-mono flex items-center">
                        <Mail size={10} className="mr-1"/> {staff.email}
                      </div>
                    </td>
                    
                    <td className="p-4">
                      <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md text-[9px] uppercase tracking-widest border border-indigo-100 font-black flex items-center w-fit">
                        <ShieldCheck size={12} className="mr-1"/> {staff.role?.name || "No Role"}
                      </span>
                    </td>
                    
                    <td className="p-4">
                      {staff.outlet ? (
                        <span className="flex items-center text-xs text-slate-600 uppercase font-black">
                          <MapPin size={12} className="mr-1 text-slate-400"/> {staff.outlet.name}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black">HQ / Unassigned</span>
                      )}
                    </td>

                    <td className="p-4">
                      {staff.accessibleOutlets?.length > 0 ? (
                        <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100 uppercase tracking-widest font-black">
                          +{staff.accessibleOutlets.length} Branches
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-300 uppercase tracking-widest">—</span>
                      )}
                    </td>

                    <td className="p-4 text-right">
                       <span className="text-emerald-500 flex items-center justify-end text-[10px] uppercase tracking-widest">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></span> Active
                        </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- ADD STAFF MODAL --- */}
      {showAddModal && (
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4 shrink-0">
              <div>
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center"><UserPlus size={18} className="mr-2 text-indigo-600"/> Onboard Employee</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Setup login, roles, and branch access</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full"><X size={18}/></button>
            </div>
            
            <form onSubmit={handleOnboardStaff} className="space-y-6 overflow-y-auto custom-scrollbar pr-2 flex-1">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Credentials Section */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase text-indigo-600 tracking-widest border-b border-indigo-100 pb-1 mb-2">1. Credentials</h3>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Full Name</label>
                    <input required type="text" placeholder="e.g. Rahul Sharma" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-bold uppercase focus:border-indigo-500 bg-slate-50" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Email (Login ID)</label>
                    <input required type="email" placeholder="staff@brand.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-mono font-bold focus:border-indigo-500 bg-slate-50" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Password</label>
                      <input required type="text" placeholder="Pass@123" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-mono font-bold focus:border-indigo-500 bg-slate-50" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">POS PIN (4-Digit)</label>
                      <input type="text" maxLength={4} placeholder="1234" value={formData.pin} onChange={(e) => setFormData({...formData, pin: e.target.value.replace(/\D/g, '')})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-mono font-bold tracking-[0.2em] focus:border-indigo-500 bg-slate-50" />
                    </div>
                  </div>
                </div>

                {/* Role & Outlet Section */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase text-indigo-600 tracking-widest border-b border-indigo-100 pb-1 mb-2">2. Role & Location</h3>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 flex items-center"><Briefcase size={10} className="mr-1"/> Security Role</label>
                    <select required value={formData.roleId} onChange={(e) => setFormData({...formData, roleId: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-bold uppercase focus:border-indigo-500 bg-slate-50">
                      <option value="" disabled>Select Role...</option>
                      {data.roles.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 flex items-center"><MapPin size={10} className="mr-1"/> Base Branch (Primary)</label>
                    <select value={formData.primaryOutletId} onChange={(e) => setFormData({...formData, primaryOutletId: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-bold uppercase focus:border-indigo-500 bg-slate-50">
                      <option value="NONE">HQ / Not Assigned</option>
                      {data.outlets.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Multi-Branch Mapping (For Area Managers etc.) */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-start gap-2 mb-3">
                  <AlertTriangle size={14} className="text-amber-500 mt-0.5" />
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-800 tracking-widest">Multi-Branch Access (Optional)</label>
                    <p className="text-[9px] text-slate-400 font-bold mt-0.5">Check boxes below if this user (e.g. Area Manager) needs access to multiple outlets.</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {data.outlets.map((o: any) => {
                    // Prevent selecting the base branch as an extended access branch
                    if (o.id === formData.primaryOutletId) return null;
                    return (
                      <label key={o.id} className="flex items-center gap-2 p-2 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                        <input 
                          type="checkbox" 
                          checked={selectedMultiOutlets.includes(o.id)}
                          onChange={() => handleToggleMultiOutlet(o.id)}
                          className="w-3 h-3 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                        />
                        <span className="text-[10px] font-black uppercase text-slate-600 truncate">{o.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 mt-2 border-t border-slate-100 shrink-0">
                <button disabled={isSaving} type="submit" className="w-full bg-slate-900 text-white font-black uppercase tracking-widest py-3.5 rounded-xl text-xs flex justify-center items-center shadow-lg active:scale-95 transition-all">
                  {isSaving ? <Loader2 className="animate-spin" size={16}/> : "Create Employee Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
