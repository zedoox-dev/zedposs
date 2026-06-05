"use client";
import { useState, useEffect } from "react";
import { Database, ShieldCheck, Download, Trash2, Play, RefreshCcw, Loader2, HardDrive, AlertTriangle, FileArchive, CheckCircle2 } from "lucide-react";

export default function BackupsRecoveryPage() {
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBackingUp, setIsBackingUp] = useState(false);

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/super-admin/backups");
      const data = await res.json();
      if (data.success) {
        setBackups(data.backups);
      }
    } catch (e) {
      console.error("Failed to load backups");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setIsBackingUp(true);
    try {
      const res = await fetch("/api/super-admin/backups", {
        method: "POST"
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("✅ Database Backup Generated Successfully!");
        fetchBackups();
      } else {
        alert("⚠️ Failed to generate backup.");
      }
    } catch (e) {
      alert("Network Error.");
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleDeleteBackup = async (fileName: string) => {
    if (!confirm(`Are you sure you want to delete ${fileName}? This action cannot be undone.`)) return;

    try {
      const res = await fetch("/api/super-admin/backups", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName })
      });
      if (res.ok) {
        setBackups(backups.filter(b => b.name !== fileName));
      }
    } catch (e) {
      alert("Failed to delete backup.");
    }
  };

  // UI Helper for file size
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const totalBackupSize = backups.reduce((sum, b) => sum + b.sizeBytes, 0);

  return (
    <div className="max-w-[1400px] mx-auto h-full flex flex-col animate-in fade-in duration-300">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
            <Database className="mr-2 text-indigo-600" /> Disaster Recovery Vault
          </h1>
          <p className="text-xs text-slate-500 font-bold mt-1 tracking-wide">Manage database snapshots, manual backups, and recovery files.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={fetchBackups} disabled={loading} className="p-2.5 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors shadow-sm active:scale-95">
            <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={handleCreateBackup} disabled={isBackingUp} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center shadow-lg shadow-indigo-500/30 active:scale-95 transition-all whitespace-nowrap">
            {isBackingUp ? <Loader2 size={16} className="mr-1.5 animate-spin" /> : <Play size={16} className="mr-1.5" />} 
            {isBackingUp ? "Generating..." : "Trigger Manual Backup"}
          </button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 shrink-0">
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl flex items-center justify-between text-white relative overflow-hidden">
          <Database size={80} className="absolute -right-4 -bottom-4 text-white/5" />
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Backup Engine Status</span>
            <div className="flex items-center text-emerald-400 font-black tracking-wider text-xl">
              <CheckCircle2 size={20} className="mr-2"/> ONLINE & READY
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total Snapshots</span>
            <p className="text-3xl font-mono font-black text-slate-800">{backups.length}</p>
          </div>
          <FileArchive size={32} className="text-slate-200"/>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Vault Storage Used</span>
            <p className="text-3xl font-mono font-black text-blue-600">{formatBytes(totalBackupSize)}</p>
          </div>
          <HardDrive size={32} className="text-blue-100"/>
        </div>
      </div>

      {/* Alert Strip */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 mb-6 shrink-0">
        <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-amber-800 mb-0.5">Automated Daily Backups Active</h4>
          <p className="text-[10px] font-bold text-amber-700/80">The system automatically generates a compressed PostgreSQL dump every night at 02:00 AM IST. Manual backups should only be triggered before major system updates.</p>
        </div>
      </div>

      {/* Backups Table */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0">
          <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider flex items-center"><ShieldCheck size={16} className="mr-2 text-indigo-500"/> Secured Recovery Files</h3>
        </div>
        
        {loading ? (
          <div className="flex-1 flex justify-center items-center"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>
        ) : backups.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
            <HardDrive size={60} className="mb-4 opacity-20" />
            <p className="font-black text-lg uppercase tracking-widest text-slate-500">Vault is Empty</p>
            <p className="text-xs font-bold mt-1">Trigger a manual backup to create your first snapshot.</p>
          </div>
        ) : (
          <div className="overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-slate-100/90 sticky top-0 z-10">
                <tr className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200">
                  <th className="p-4">Snapshot File Name</th>
                  <th className="p-4 text-center">Format</th>
                  <th className="p-4 text-center">File Size</th>
                  <th className="p-4 text-center">Creation Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-bold text-slate-700">
                {backups.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="p-4">
                      <div className="font-mono text-slate-900 font-black flex items-center"><FileArchive size={14} className="mr-2 text-indigo-400"/> {b.name}</div>
                    </td>
                    <td className="p-4 text-center">
                      <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded text-[9px] uppercase font-black tracking-wider">
                        SQL.GZ
                      </span>
                    </td>
                    <td className="p-4 text-center font-mono text-slate-600">
                      {formatBytes(b.sizeBytes)}
                    </td>
                    <td className="p-4 text-center text-xs text-slate-500">
                      {new Date(b.createdAt).toLocaleString('en-IN')}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button className="p-2 bg-slate-100 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 rounded-lg transition-colors border border-slate-200" title="Download Backup">
                          <Download size={14} />
                        </button>
                        <button onClick={() => handleDeleteBackup(b.name)} className="p-2 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-lg transition-colors border border-slate-200" title="Delete Snapshot">
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

    </div>
  );
}
