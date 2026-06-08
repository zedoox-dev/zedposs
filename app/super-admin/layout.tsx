"use client";
import { useState, useEffect } from "react";
import { 
  LayoutDashboard, Building2, CreditCard, ReceiptIndianRupee, Users, 
  UserCircle, Settings, ShieldCheck, Database, HeadphonesIcon, Megaphone, 
  Activity, BarChart3, CloudCog, Menu, X, Bell, Search, LogOut, Code, 
  Zap, LifeBuoy, FileCheck2, Paintbrush, RefreshCw, TerminalSquare, Loader2, Store
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

// 🔥 SEPARATE INLINE LOGIN FORM FOR SUPER ADMIN
function SuperAdminLoginForm({ onLoginSuccess }: { onLoginSuccess: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === "admin@zedoox.com" && password === "Zedoox@2026") {
      localStorage.setItem("zed_master_session", email);
      onLoginSuccess(email);
    } else {
      setError("Invalid Master Credentials");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 overflow-hidden">
        <div className="p-8 pb-6 text-center border-b border-slate-800">
          <div className="w-16 h-16 bg-blue-500/20 text-blue-500 rounded-2xl mx-auto flex items-center justify-center mb-4 border border-blue-500/30">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">SaaS Master</h1>
          <p className="text-slate-400 text-[10px] font-bold mt-2 uppercase tracking-widest">Platform Administration</p>
        </div>
        <form onSubmit={handleLogin} className="p-8 pt-6 space-y-5">
          {error && <div className="bg-red-500/10 text-red-500 p-3 rounded-lg text-xs font-bold text-center border border-red-500/20">{error}</div>}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-2">Master Email</label>
            <input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl outline-none focus:border-blue-500 text-white text-sm font-bold" />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-2">Security Key</label>
            <input required type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl outline-none focus:border-blue-500 text-white text-lg font-mono" />
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest py-3.5 rounded-xl text-xs flex justify-center items-center shadow-lg transition-all active:scale-95 mt-2">
            Authenticate
          </button>
        </form>
      </div>
    </div>
  );
}

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [masterEmail, setMasterEmail] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [tenantCount, setTenantCount] = useState<number>(0);

  useEffect(() => {
    const sessionEmail = localStorage.getItem("zed_master_session");
    if (sessionEmail) {
      setMasterEmail(sessionEmail);
      fetchTenantStats();
    }
    setIsCheckingAuth(false);
  }, []);

  const fetchTenantStats = async () => {
    try {
      const res = await fetch("/api/super-admin/tenants");
      const data = await res.json();
      if (data.success && data.tenants) setTenantCount(data.tenants.length);
    } catch (error) {
      console.error("Failed to sync stats");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("zed_master_session");
    setMasterEmail(null); // Instantly triggers login screen
  };

  if (isCheckingAuth) {
    return <div className="h-screen w-full flex items-center justify-center bg-slate-950"><Loader2 className="animate-spin text-blue-500" size={50} /></div>;
  }

  // If not authenticated, render Login Component directly! No redirects.
  if (!masterEmail) {
    return <SuperAdminLoginForm onLoginSuccess={(email) => setMasterEmail(email)} />;
  }

  const navGroups = [
    {
      title: "Core Operations",
      items: [
        { name: "Dashboard", path: "/super-admin", icon: <LayoutDashboard size={18} /> },
        { name: "Businesses", path: "/super-admin/tenants", icon: <Building2 size={18} /> },
        { name: "Outlets", path: "/super-admin/outlets", icon: <Store size={18} /> },
        { name: "Subscriptions", path: "/super-admin/subscriptions", icon: <RefreshCw size={18} /> },
        { name: "Payments & Billing", path: "/super-admin/payments", icon: <CreditCard size={18} /> },
      ]
    },
    {
      title: "CRM & Support",
      items: [
        { name: "Leads CRM", path: "/super-admin/leads", icon: <Users size={18} /> },
        { name: "Customer Success", path: "/super-admin/success", icon: <LifeBuoy size={18} /> },
        { name: "Support Tickets", path: "/super-admin/support", icon: <HeadphonesIcon size={18} /> },
      ]
    },
    {
      title: "User Management",
      items: [
        { name: "Staff Directory", path: "/super-admin/users", icon: <UserCircle size={18} /> },
        { name: "Roles & Permissions", path: "/super-admin/roles", icon: <ShieldCheck size={18} /> },
      ]
    },
    {
      title: "System & Security",
      items: [
        { name: "Global Settings", path: "/super-admin/settings", icon: <Settings size={18} /> },
      ]
    }
  ];

  return (
    <div className="flex h-screen bg-slate-100 font-sans overflow-hidden">
      {/* SIDEBAR */}
      <div className={`bg-slate-950 text-slate-300 w-64 flex flex-col transition-all duration-300 z-20 shrink-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full fixed h-full'}`}>
        <div className="h-16 flex items-center px-6 bg-black/40 border-b border-white/5 shrink-0">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3 shadow-lg shadow-blue-600/20">
            <ShieldCheck size={18} className="text-white" />
          </div>
          <span className="font-black text-white uppercase tracking-widest text-sm">ZedPoss Admin</span>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx}>
              <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 px-3">{group.title}</h4>
              <ul className="space-y-1">
                {group.items.map((item, idx) => {
                  const isActive = pathname === item.path;
                  return (
                    <li key={idx}>
                      <button onClick={() => router.push(item.path)} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all ${isActive ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-slate-100'}`}>
                        <div className="flex items-center">
                          <span className="mr-3 opacity-80">{item.icon}</span>
                          {item.name}
                        </div>
                        {item.name === "Businesses" && tenantCount > 0 && (
                          <span className="bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-md border border-emerald-400 shadow-sm">{tenantCount}</span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="p-4 bg-black/40 border-t border-white/5 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-black text-white mr-3">
                {masterEmail?.substring(0, 2).toUpperCase() || 'SA'}
              </div>
              <div>
                <p className="text-[10px] font-bold text-white leading-tight truncate w-24">{masterEmail}</p>
                <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest flex items-center mt-0.5"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1 animate-pulse"></span> Secured</p>
              </div>
            </div>
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors" title="Secure Logout"><LogOut size={16} /></button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shrink-0 z-10 shadow-sm">
          <div className="flex items-center">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 mr-4 text-slate-500 hover:bg-slate-100 rounded-lg lg:hidden"><Menu size={20} /></button>
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder="Search businesses..." className="w-80 pl-10 pr-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:bg-white transition-all" />
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"><Bell size={20} /></button>
            <div className="h-8 w-px bg-slate-200 mx-2"></div>
            <button className="flex items-center text-xs font-black uppercase text-slate-600 hover:text-blue-600 transition-colors"><Code size={16} className="mr-2" /> V1.0 Master Node</button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50 p-6 custom-scrollbar relative">
          {children}
        </div>
      </div>
    </div>
  );
}
