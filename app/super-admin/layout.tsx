"use client";
import { useState, useEffect } from "react";
import { 
  LayoutDashboard, Building2, CreditCard, ReceiptIndianRupee, Users, 
  UserCircle, Settings, ShieldCheck, Database, HeadphonesIcon, Megaphone, 
  Activity, BarChart3, CloudCog, Menu, X, Bell, Search, LogOut, Code, 
  Zap, LifeBuoy, FileCheck2, Paintbrush, RefreshCw, TerminalSquare, Loader2
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [masterEmail, setMasterEmail] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // ==========================================
  // LOCAL STORAGE SECURITY PROTOCOL
  // ==========================================
  useEffect(() => {
    const sessionEmail = localStorage.getItem("zed_master_session");
    
    if (!sessionEmail) {
      // Direct kick out if no token exists
      router.replace("/master-login");
    } else {
      setMasterEmail(sessionEmail);
      setIsCheckingAuth(false);
    }
  }, [router]);
  // ==========================================

  const handleLogout = () => {
    localStorage.removeItem("zed_master_session");
    router.replace("/master-login");
  };

  const navGroups = [
    {
      title: "Core Operations",
      items: [
        { name: "Dashboard", path: "/super-admin", icon: <LayoutDashboard size={18} /> },
        { name: "Businesses", path: "/super-admin/businesses", icon: <Building2 size={18} /> },
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
      title: "Platform Features",
      items: [
        { name: "Feature Toggles", path: "/super-admin/features", icon: <Zap size={18} /> },
        { name: "API & Webhooks", path: "/super-admin/api-center", icon: <CloudCog size={18} /> },
        { name: "Marketing", path: "/super-admin/marketing", icon: <Megaphone size={18} /> },
        { name: "White Label", path: "/super-admin/white-label", icon: <Paintbrush size={18} /> },
      ]
    },
    {
      title: "System & Security",
      items: [
        { name: "Analytics", path: "/super-admin/analytics", icon: <BarChart3 size={18} /> },
        { name: "System Monitoring", path: "/super-admin/monitoring", icon: <Activity size={18} /> },
        { name: "Audit Logs", path: "/super-admin/audit-logs", icon: <TerminalSquare size={18} /> },
        { name: "Backups Vault", path: "/super-admin/backups", icon: <Database size={18} /> },
        { name: "Global Settings", path: "/super-admin/settings", icon: <Settings size={18} /> },
      ]
    }
  ];

  if (isCheckingAuth) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950">
        <Loader2 className="animate-spin text-blue-500 mb-6" size={50} />
        <h2 className="text-sm font-black text-slate-300 uppercase tracking-widest flex items-center">
          <ShieldCheck size={16} className="mr-2 text-emerald-500"/> Verifying Master Clearance...
        </h2>
      </div>
    );
  }

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
                      <button onClick={() => router.push(item.path)} className={`w-full flex items-center px-3 py-2 rounded-lg text-xs font-bold transition-all ${isActive ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-slate-100'}`}>
                        <span className="mr-3 opacity-80">{item.icon}</span>
                        {item.name}
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
                <p className="text-[10px] font-bold text-white leading-tight truncate w-24">
                  {masterEmail}
                </p>
                <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest flex items-center mt-0.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1 animate-pulse"></span> Secured
                </p>
              </div>
            </div>
            {/* LOCAL STORAGE LOGOUT */}
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors" title="Secure Logout">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shrink-0 z-10 shadow-sm">
          <div className="flex items-center">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 mr-4 text-slate-500 hover:bg-slate-100 rounded-lg lg:hidden">
              <Menu size={20} />
            </button>
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder="Search businesses, users, invoices..." className="w-80 pl-10 pr-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 focus:bg-white transition-all" />
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
            <div className="h-8 w-px bg-slate-200 mx-2"></div>
            <button className="flex items-center text-xs font-black uppercase text-slate-600 hover:text-blue-600 transition-colors">
              <Code size={16} className="mr-2" /> V1.0 Master Node
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50 p-6 custom-scrollbar relative">
          {children}
        </div>
      </div>

    </div>
  );
}
