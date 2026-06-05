"use client";
import { useState, useEffect } from "react";
import { Shield, ShieldAlert, Loader2, RefreshCcw, Lock, Unlock, Eye, BarChart3, CreditCard, Utensils, Package, RotateCcw, ClipboardList, Users } from "lucide-react";

export default function RolesPermissionsPage() {
  const [matrix, setMatrix] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  useEffect(() => {
    fetchMatrix();
  }, []);

  const fetchMatrix = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/super-admin/roles");
      const data = await res.json();
      if (data.success) {
        setMatrix(data.matrix);
      }
    } catch (e) {
      console.error("Failed to load permissions matrix");
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = async (role: string, permissionKey: string, currentStatus: boolean) => {
    // Block system owner absolute rules modification check if needed
    if (role === "SUPER_ADMIN" && permissionKey === "viewAnalytics" && currentStatus) {
      return alert("Security Block: Cannot revoke absolute core rights from Tenant Owners.");
    }

    const uniqueKey = `${role}-${permissionKey}`;
    setUpdatingKey(uniqueKey);

    try {
      const res = await fetch("/api/super-admin/roles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, permissionKey, isAllowed: !currentStatus })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMatrix(data.matrix);
      }
    } catch (e) {
      alert("Network modification failed.");
    } finally {
      setUpdatingKey(null);
    }
  };

  if (loading || !matrix) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Syncing Security Matrix...</p>
      </div>
    );
  }

  // Definition array for human-readable permissions mapping
  const permissionsList = [
    { key: "viewAnalytics", name: "Access Financial Reports", desc: "View store revenues, sales, and transaction graphs.", icon: <BarChart3 size={14}/> },
    { key: "manageBilling", name: "Process POS Bills", desc: "Open the register, punch orders, and print KOT receipts.", icon: <CreditCard size={14}/> },
    { key: "editMenu", name: "Modify Menu & Pricing", desc: "Add or edit dishes, update categories and prices.", icon: <Utensils size={14}/> },
    { key: "manageInventory", name: "Manage Raw Inventory", desc: "Record raw stock entries, update recipes, and log usage.", icon: <Package size={14}/> },
    { key: "issueRefunds", name: "Trigger Bill Refunds", desc: "Cancel transactions and reverse cash/online values.", icon: <RotateCcw size={14}/> },
    { key: "viewAuditLogs", name: "View Store Logs", desc: "Track employee logins and sensitive store modifications.", icon: <ClipboardList size={14}/> },
    { key: "manageStaff", name: "Onboard Staff Accounts", desc: "Create, suspend, or update store employee roles.", icon: <Users size={14}/> }
  ];

  return (
    <div className="max-w-[1400px] mx-auto h-full flex flex-col animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
            <Shield className="mr-2 text-indigo-600" /> RBAC Permission Matrix
          </h1>
          <p className="text-xs text-slate-500 font-bold mt-1 tracking-wide">Globally control what Tenant Owners, Managers, and Staff can access inside the POS environment.</p>
        </div>
        
        <button onClick={fetchMatrix} className="p-2.5 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 rounded-xl shadow-sm transition-all active:scale-95">
          <RefreshCcw size={18} />
        </button>
      </div>

      {/* Main Grid View */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col mb-10">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-slate-900 sticky top-0 z-10 text-[10px] font-black uppercase tracking-widest text-slate-300">
              <tr>
                <th className="p-5 w-2/5 border-r border-slate-800">SaaS Module Feature / Right</th>
                <th className="p-5 text-center border-r border-slate-800 bg-indigo-950/40 w-1/5 text-indigo-400">Tenant Owner (Super Admin)</th>
                <th className="p-5 text-center border-r border-slate-800 w-1/5 text-blue-400">Store Manager</th>
                <th className="p-5 text-center w-1/5 text-slate-400">Cashier / Staff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-bold text-slate-700">
              {permissionsList.map((perm) => (
                <tr key={perm.key} className="hover:bg-slate-50/80 transition-colors">
                  
                  {/* Permission Meta */}
                  <td className="p-5 border-r border-slate-100 flex items-start gap-3">
                    <div className="p-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 mt-0.5 shrink-0">
                      {perm.icon}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-sm uppercase tracking-wide">{perm.name}</h3>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">{perm.desc}</p>
                    </div>
                  </td>

                  {/* Column 1: Tenant Owner */}
                  <td className="p-5 text-center border-r border-slate-100 bg-slate-50/30">
                    {(() => {
                      const allowed = matrix.SUPER_ADMIN?.[perm.key];
                      const currentLoading = updatingKey === `SUPER_ADMIN-${perm.key}`;
                      return (
                        <button 
                          onClick={() => handleTogglePermission("SUPER_ADMIN", perm.key, allowed)}
                          disabled={currentLoading}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border shadow-sm transition-all active:scale-95 ${allowed ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}
                        >
                          {currentLoading ? <Loader2 size={12} className="animate-spin" /> : allowed ? <Unlock size={12}/> : <Lock size={12}/>}
                          {allowed ? "Allowed" : "Revoked"}
                        </button>
                      );
                    })()}
                  </td>

                  {/* Column 2: Store Manager */}
                  <td className="p-5 text-center border-r border-slate-100">
                    {(() => {
                      const allowed = matrix.MANAGER?.[perm.key];
                      const currentLoading = updatingKey === `MANAGER-${perm.key}`;
                      return (
                        <button 
                          onClick={() => handleTogglePermission("MANAGER", perm.key, allowed)}
                          disabled={currentLoading}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border shadow-sm transition-all active:scale-95 ${allowed ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}
                        >
                          {currentLoading ? <Loader2 size={12} className="animate-spin" /> : allowed ? <Unlock size={12}/> : <Lock size={12}/>}
                          {allowed ? "Allowed" : "Revoked"}
                        </button>
                      );
                    })()}
                  </td>

                  {/* Column 3: Staff */}
                  <td className="p-5 text-center">
                    {(() => {
                      const allowed = matrix.STAFF?.[perm.key];
                      const currentLoading = updatingKey === `STAFF-${perm.key}`;
                      return (
                        <button 
                          onClick={() => handleTogglePermission("STAFF", perm.key, allowed)}
                          disabled={currentLoading}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border shadow-sm transition-all active:scale-95 ${allowed ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}
                        >
                          {currentLoading ? <Loader2 size={12} className="animate-spin" /> : allowed ? <Unlock size={12}/> : <Lock size={12}/>}
                          {allowed ? "Allowed" : "Revoked"}
                        </button>
                      );
                    })()}
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
