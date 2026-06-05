"use client";
import { useState, useEffect } from "react";
import { Users, Search, Filter, Loader2, ShieldCheck, Key, Lock, Trash2, Building2, Store, UserCircle, RefreshCcw, MoreVertical, X } from "lucide-react";

export default function GlobalUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  // Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/super-admin/users");
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (e) {
      console.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (id: string, currentRole: string, newRole: string) => {
    if (currentRole === newRole) return;
    if (!confirm(`Change this user's role to ${newRole}?`)) return;

    // Optimistic Update
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role: newRole } : u));

    try {
      await fetch("/api/super-admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "UPDATE_ROLE", role: newRole })
      });
    } catch (e) {
      alert("Failed to update role");
      fetchUsers(); // Revert on fail
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) return alert("Password must be at least 6 characters.");
    
    setIsUpdating(true);
    try {
      const res = await fetch("/api/super-admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedUser.id, action: "RESET_PASSWORD", newPassword })
      });
      if (res.ok) {
        alert(`✅ Password successfully reset for ${selectedUser.email}`);
        setShowPasswordModal(false);
        setNewPassword("");
      }
    } catch (e) {
      alert("Failed to reset password.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRevokeAccess = async (id: string, name: string) => {
    if (!confirm(`⚠️ WARNING: Are you sure you want to permanently revoke POS access for ${name}?`)) return;

    try {
      const res = await fetch("/api/super-admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "REVOKE_ACCESS" })
      });
      if (res.ok) {
        setUsers(users.filter(u => u.id !== id));
        alert("User access revoked successfully.");
      }
    } catch (e) {
      alert("Failed to revoke access.");
    }
  };

  // --- Metrics ---
  const superAdminCount = users.filter(u => u.role === "SUPER_ADMIN").length;
  const managerCount = users.filter(u => u.role === "MANAGER").length;
  const staffCount = users.filter(u => u.role === "STAFF").length;

  const filteredUsers = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        u.tenant?.businessName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="max-w-[1400px] mx-auto h-full flex flex-col animate-in fade-in duration-300">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
            <Users className="mr-2 text-indigo-600" /> Platform User Directory
          </h1>
          <p className="text-xs text-slate-500 font-bold mt-1 tracking-wide">Manage access, roles, and passwords for all tenant employees.</p>
        </div>
        <button onClick={fetchUsers} className="p-2.5 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors shadow-sm active:scale-95">
          <RefreshCcw size={18} />
        </button>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 shrink-0">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total System Users</span>
          <p className="text-2xl font-mono font-black text-slate-800">{users.length}</p>
        </div>
        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block mb-1">Tenant Owners (Super Admins)</span>
          <p className="text-2xl font-mono font-black text-indigo-700">{superAdminCount}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-1">Managers</span>
          <p className="text-2xl font-mono font-black text-blue-700">{managerCount}</p>
        </div>
        <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Cashiers / Staff</span>
          <p className="text-2xl font-mono font-black text-slate-600">{staffCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 shrink-0 bg-white p-3 border border-slate-200 rounded-2xl shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" placeholder="Search by User Name, Email, or Brand..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 bg-slate-50 transition-colors" />
        </div>
        <div className="flex items-center space-x-2">
          <Filter size={14} className="text-slate-400"/>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="p-2.5 border border-slate-200 rounded-xl font-bold text-xs outline-none bg-slate-50 uppercase text-slate-700 focus:border-indigo-500">
            <option value="ALL">All Roles</option>
            <option value="SUPER_ADMIN">Tenant Owners</option>
            <option value="MANAGER">Managers</option>
            <option value="STAFF">Staff</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex justify-center items-center"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
            <UserCircle size={60} className="mb-4 opacity-20" />
            <p className="font-black text-lg uppercase tracking-widest text-slate-500">No Users Found</p>
          </div>
        ) : (
          <div className="overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead className="bg-slate-900 sticky top-0 z-10">
                <tr className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                  <th className="p-4 w-12 text-center border-r border-slate-800">#</th>
                  <th className="p-4 border-r border-slate-800">User Profile</th>
                  <th className="p-4 border-r border-slate-800">Assigned Business (Tenant)</th>
                  <th className="p-4 text-center border-r border-slate-800">Security Role</th>
                  <th className="p-4 text-center border-r border-slate-800">Pin Auth</th>
                  <th className="p-4 text-right">God Mode Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-bold text-slate-700">
                {filteredUsers.map((u, idx) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="p-4 text-center text-slate-400 text-xs font-mono">{idx + 1}</td>
                    <td className="p-4">
                      <div className="font-black text-slate-900 uppercase tracking-wide flex items-center">
                        {u.name}
                        {u.role === "SUPER_ADMIN" && <ShieldCheck size={14} className="ml-1.5 text-indigo-500"/>}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 mt-0.5">{u.email}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center text-xs font-black text-slate-700 uppercase mb-1">
                        <Building2 size={12} className="mr-1.5 text-slate-400"/> {u.tenant?.businessName || "Orphaned User"}
                      </div>
                      {u.outlet && (
                        <div className="flex items-center text-[9px] font-bold text-blue-600 uppercase bg-blue-50 w-fit px-2 py-0.5 rounded border border-blue-100">
                          <Store size={10} className="mr-1"/> {u.outlet.name}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <select 
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, u.role, e.target.value)}
                        className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded outline-none border cursor-pointer ${
                          u.role === 'SUPER_ADMIN' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 
                          u.role === 'MANAGER' ? 'bg-blue-100 text-blue-700 border-blue-200' : 
                          'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        <option value="SUPER_ADMIN">Tenant Owner</option>
                        <option value="MANAGER">Manager</option>
                        <option value="STAFF">Cashier / Staff</option>
                      </select>
                    </td>
                    <td className="p-4 text-center">
                      {u.pin ? (
                        <span className="font-mono text-slate-600 tracking-[0.2em] bg-slate-100 px-2 py-0.5 rounded text-xs border border-slate-200">••••</span>
                      ) : (
                        <span className="text-[9px] font-black uppercase text-slate-400">No PIN</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setSelectedUser(u); setShowPasswordModal(true); }} className="p-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-lg transition-colors border border-slate-200" title="Force Reset Password">
                          <Key size={14} />
                        </button>
                        <button onClick={() => handleRevokeAccess(u.id, u.name)} className="p-1.5 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-lg transition-colors border border-slate-200" title="Revoke Access (Delete)">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- RESET PASSWORD MODAL --- */}
      {showPasswordModal && selectedUser && (
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border-t-8 border-red-500 relative overflow-hidden">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center"><Key size={18} className="mr-2 text-red-500"/> Master Override</h2>
                <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Force reset password</p>
              </div>
              <button onClick={() => setShowPasswordModal(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full transition-colors"><X size={18}/></button>
            </div>

            <div className="mb-5 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Target Account</p>
              <p className="font-black text-slate-800 text-sm">{selectedUser.name}</p>
              <p className="font-mono text-xs text-blue-600">{selectedUser.email}</p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest flex items-center"><Lock size={12} className="mr-1"/> New Password</label>
                <input required type="text" placeholder="Enter new secure password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none text-sm font-mono font-bold focus:border-red-500 bg-white transition-colors" />
                <p className="text-[9px] font-bold text-red-500/80 mt-2 leading-tight">This will immediately log the user out of all active sessions.</p>
              </div>

              <div className="pt-2">
                <button disabled={isUpdating} type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest py-3.5 rounded-xl text-xs shadow-xl active:scale-95 transition-all flex justify-center items-center">
                  {isUpdating ? <Loader2 className="animate-spin" size={16}/> : "Force Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
