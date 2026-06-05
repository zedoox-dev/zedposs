"use client";
import { useState, useEffect } from "react";
import { 
  ShieldCheck, Shield, Plus, Lock, CheckCircle2, 
  X, Loader2, Users, Settings, Search, Edit3
} from "lucide-react";

export default function RolesAndPermissionsPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal & Form
  const [showAddModal, setShowAddModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [roleForm, setRoleForm] = useState({ name: "", description: "" });
  
  // Dynamic Permissions Matrix State
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({
    Sales: { view: false, export: false },
    Inventory: { view: false, add: false, edit: false, approve: false },
    Menu: { view: false, edit: false },
    Staff: { view: false, add: false, edit: false },
    Reports: { view: false, export: false }
  });

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/brand/roles");
      const data = await res.json();
      if (data.success) setRoles(data.roles);
    } catch (e) {
      console.error("Fetch failed");
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = (module: string, action: string) => {
    setPermissions(prev => ({
      ...prev,
      [module]: {
        ...prev[module],
        [action]: !prev[module][action]
      }
    }));
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const res = await fetch("/api/brand/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: roleForm.name, 
          description: roleForm.description,
          permissions: permissions 
        })
      });
      
      if (res.ok) {
        setShowAddModal(false);
        setRoleForm({ name: "", description: "" });
        // Reset matrix
        setPermissions({
          Sales: { view: false, export: false },
          Inventory: { view: false, add: false, edit: false, approve: false },
          Menu: { view: false, edit: false },
          Staff: { view: false, add: false, edit: false },
          Reports: { view: false, export: false }
        });
        fetchRoles();
      }
    } catch (e) {
      alert("Failed to build custom role");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredRoles = roles.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Decrypting Security Matrix...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto animate-in fade-in duration-300 h-full flex flex-col pb-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
            <ShieldCheck className="mr-2 text-indigo-600" /> Roles & Permissions Matrix
          </h1>
          <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">
            Design custom access levels for different hierarchy tiers.
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-sm shadow-indigo-500/30 transition-all active:scale-95">
          <Plus className="mr-1.5" size={16} /> Build Custom Role
        </button>
      </div>

      {/* Main Container */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" placeholder="Search roles..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500 bg-white" 
            />
          </div>
        </div>

        {/* Roles List */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 custom-scrollbar">
          {filteredRoles.length === 0 ? (
            <div className="col-span-full text-center py-10">
              <Shield size={40} className="mx-auto text-slate-200 mb-3" />
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">No Custom Roles Found</p>
            </div>
          ) : (
            filteredRoles.map((role: any) => (
              <div key={role.id} className="border border-slate-200 rounded-2xl p-5 hover:border-indigo-300 transition-colors relative group flex flex-col h-full shadow-sm">
                
                {/* System Lock Badge */}
                {role.isSystem && (
                  <div className="absolute top-4 right-4 text-slate-300 group-hover:text-amber-500 transition-colors" title="System Default Role (Cannot be deleted)">
                    <Lock size={16} />
                  </div>
                )}
                {!role.isSystem && (
                  <button className="absolute top-4 right-4 text-slate-300 hover:text-indigo-600 transition-colors opacity-0 group-hover:opacity-100">
                    <Edit3 size={16} />
                  </button>
                )}

                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4 shrink-0">
                  <ShieldCheck size={20} />
                </div>
                
                <h3 className="font-black text-lg text-slate-900 uppercase tracking-tight">{role.name}</h3>
                <p className="text-[10px] font-bold text-slate-500 mt-1 mb-4 flex-1 line-clamp-2">
                  {role.description || "No specific description provided for this role."}
                </p>
                
                <div className="flex justify-between items-center border-t border-slate-100 pt-4 mt-auto">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center">
                    <Users size={12} className="mr-1"/> {role._count?.users || 0} Staff
                  </span>
                  
                  {/* Miniature Permission Preview */}
                  <div className="flex gap-1">
                    {role.permissions && typeof role.permissions === 'object' && Object.keys(role.permissions).slice(0,3).map((mod, i) => (
                      <span key={i} className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-black uppercase">{mod}</span>
                    ))}
                    {role.permissions && Object.keys(role.permissions).length > 3 && <span className="text-[8px] text-slate-400 font-black px-1">+{Object.keys(role.permissions).length - 3}</span>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* --- ROLE BUILDER MODAL --- */}
      {showAddModal && (
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-4xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4 shrink-0">
              <div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center"><Shield size={20} className="mr-2 text-indigo-600"/> Build Custom Role</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Define exact modules and actions this role can perform.</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleCreateRole} className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col">
              
              {/* Role Meta */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 shrink-0">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Role Title (e.g. Finance Manager)</label>
                  <input required type="text" placeholder="Enter Role Title" value={roleForm.name} onChange={(e) => setRoleForm({...roleForm, name: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-bold uppercase focus:border-indigo-500 bg-slate-50" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">Short Description</label>
                  <input type="text" placeholder="What does this role do?" value={roleForm.description} onChange={(e) => setRoleForm({...roleForm, description: e.target.value})} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-xs font-bold focus:border-indigo-500 bg-slate-50" />
                </div>
              </div>

              {/* The Matrix */}
              <div className="flex-1 border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <tr>
                      <th className="p-4 border-r border-slate-200 w-1/4">SaaS Module</th>
                      <th className="p-4 text-center">View</th>
                      <th className="p-4 text-center">Add</th>
                      <th className="p-4 text-center">Edit</th>
                      <th className="p-4 text-center">Delete / Approve</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    
                    {Object.keys(permissions).map((moduleName) => (
                      <tr key={moduleName} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 border-r border-slate-100 font-black text-slate-800 uppercase tracking-wide text-xs">
                          {moduleName}
                        </td>
                        
                        {/* View Action */}
                        <td className="p-4 text-center">
                          {permissions[moduleName].view !== undefined ? (
                            <input type="checkbox" checked={permissions[moduleName].view} onChange={() => handleTogglePermission(moduleName, 'view')} className="w-4 h-4 text-indigo-600 rounded border-slate-300 cursor-pointer focus:ring-indigo-500"/>
                          ) : <span className="text-slate-300">-</span>}
                        </td>
                        
                        {/* Add Action */}
                        <td className="p-4 text-center bg-slate-50/30">
                          {permissions[moduleName].add !== undefined ? (
                            <input type="checkbox" checked={permissions[moduleName].add} onChange={() => handleTogglePermission(moduleName, 'add')} className="w-4 h-4 text-indigo-600 rounded border-slate-300 cursor-pointer focus:ring-indigo-500"/>
                          ) : <span className="text-slate-300">-</span>}
                        </td>
                        
                        {/* Edit Action */}
                        <td className="p-4 text-center">
                          {permissions[moduleName].edit !== undefined ? (
                            <input type="checkbox" checked={permissions[moduleName].edit} onChange={() => handleTogglePermission(moduleName, 'edit')} className="w-4 h-4 text-indigo-600 rounded border-slate-300 cursor-pointer focus:ring-indigo-500"/>
                          ) : <span className="text-slate-300">-</span>}
                        </td>
                        
                        {/* Approve/Export Action */}
                        <td className="p-4 text-center bg-slate-50/30">
                           {permissions[moduleName].approve !== undefined ? (
                            <input type="checkbox" checked={permissions[moduleName].approve} onChange={() => handleTogglePermission(moduleName, 'approve')} className="w-4 h-4 text-amber-500 rounded border-slate-300 cursor-pointer focus:ring-amber-500"/>
                          ) : permissions[moduleName].export !== undefined ? (
                             <input type="checkbox" checked={permissions[moduleName].export} onChange={() => handleTogglePermission(moduleName, 'export')} className="w-4 h-4 text-blue-500 rounded border-slate-300 cursor-pointer focus:ring-blue-500"/>
                          ) : <span className="text-slate-300">-</span>}
                        </td>
                      </tr>
                    ))}

                  </tbody>
                </table>
              </div>

              <div className="pt-6 shrink-0 mt-auto">
                <button disabled={isProcessing || !roleForm.name} type="submit" className="w-full bg-slate-900 text-white font-black uppercase tracking-widest py-4 rounded-xl text-xs flex justify-center items-center shadow-xl active:scale-95 transition-all disabled:opacity-50">
                  {isProcessing ? <Loader2 className="animate-spin" size={16}/> : "Lock Security Matrix & Save Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
