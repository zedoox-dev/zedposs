"use client";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { 
  Store, LayoutDashboard, Users, ReceiptIndianRupee, 
  Package, ShoppingCart, UserCircle, Settings, ClipboardList, 
  ChefHat, Megaphone, MapPin, Loader2, ChevronDown, Bell, LogOut, ShieldCheck, Lock, Building2
} from "lucide-react";
import { OutletProvider, useOutlet } from "../context/OutletContext";

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { outlets, selectedOutlet, setSelectedOutlet, loading: outletLoading } = useOutlet();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userRole, setUserRole] = useState<string>("STAFF");
  const [permissions, setPermissions] = useState<any>({});

  useEffect(() => {
    if (session?.user) {
      setUserRole((session.user as any).role || "STAFF");
      setPermissions((session.user as any).permissions || {});
    }
  }, [session]);

  const hasAccess = (moduleName: string) => {
    // Basic Role check - Brand Owner has all access
    if (userRole === "Brand Owner" || userRole === "Admin") return true;
    if (permissions[moduleName] && permissions[moduleName].view) return true;
    if (moduleName === "Dashboard") return true; // Default accessible
    return false;
  };

  // 🟢 Extracting Tenant Info from Session securely mapped from DB
  const tenantName = (session?.user as any)?.tenantName || "Brand HQ";
  const ownerName = (session?.user as any)?.ownerName || session?.user?.name || "Business Owner";
  const logoUrl = (session?.user as any)?.logoUrl;

  const menuGroups = [
    {
      title: "Business Console",
      items: [
        { name: "Global Dashboard", path: "/dashboard", icon: <LayoutDashboard size={18} />, module: "Dashboard" },
        { name: "Live Sales & POS", path: "/dashboard/sales", icon: <ReceiptIndianRupee size={18} />, module: "Sales" },
        { name: "Kitchen (KDS)", path: "/dashboard/kds", icon: <ChefHat size={18} />, module: "Menu" },
      ]
    },
    {
      title: "Operations & Stock",
      items: [
        { name: "Inventory Matrix", path: "/dashboard/inventory", icon: <Package size={18} />, module: "Inventory" },
        { name: "Purchases (PO)", path: "/dashboard/purchases", icon: <ShoppingCart size={18} />, module: "Inventory" },
        { name: "Menu & Recipes", path: "/dashboard/menu", icon: <ClipboardList size={18} />, module: "Menu" },
      ]
    },
    {
      title: "Network & People",
      items: [
        { name: "Outlets & Regions", path: "/dashboard/outlets", icon: <MapPin size={18} />, module: "Staff" },
        { name: "Staff & HR", path: "/dashboard/staff", icon: <UserCircle size={18} />, module: "Staff" },
        { name: "CRM & Customers", path: "/dashboard/crm", icon: <Users size={18} />, module: "Reports" },
      ]
    },
    {
      title: "System Admin",
      items: [
        { name: "Marketing Hub", path: "/dashboard/marketing", icon: <Megaphone size={18} />, module: "Reports" },
        { name: "Roles & Access", path: "/dashboard/roles", icon: <ShieldCheck size={18} />, module: "Staff" },
        { name: "Settings", path: "/dashboard/settings", icon: <Settings size={18} />, module: "Sales" },
      ]
    }
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <div className={`bg-slate-900 text-slate-300 w-64 flex flex-col transition-all duration-300 z-20 shrink-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full fixed h-full'}`}>
        
        {/* Brand Header with Dynamic Logo */}
        <div className="h-16 flex items-center px-6 bg-slate-950 border-b border-slate-800 shrink-0">
          {logoUrl ? (
            <img src={logoUrl} alt={tenantName} className="w-8 h-8 rounded-lg mr-3 shadow-lg object-cover bg-white" />
          ) : (
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center mr-3 shadow-lg">
              <Store size={18} className="text-white" />
            </div>
          )}
          <span className="font-black text-white uppercase tracking-widest text-sm truncate">
            {tenantName}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
          {menuGroups.map((group, gIdx) => {
            const visibleItems = group.items.filter(item => hasAccess(item.module));
            if (visibleItems.length === 0) return null;

            return (
              <div key={gIdx}>
                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 px-3">{group.title}</h4>
                <ul className="space-y-1">
                  {visibleItems.map((item, idx) => {
                    const isActive = pathname === item.path;
                    return (
                      <li key={idx}>
                        <button onClick={() => router.push(item.path)} className={`w-full flex items-center px-3 py-2 rounded-lg text-xs font-bold transition-all ${isActive ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-slate-100'}`}>
                          <span className="mr-3 opacity-80">{item.icon}</span>
                          {item.name}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* MAIN AREA */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10 shadow-sm">
          
          {/* Left Side: Mobile Toggle & Outlet Selector */}
          <div className="flex items-center">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="mr-4 lg:hidden text-slate-500">
              <LayoutDashboard size={20} />
            </button>
            
            {/* Outline Selector mapped directly to Tenant's Stores */}
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 cursor-pointer hover:bg-slate-200 transition-colors">
              <MapPin size={16} className="text-indigo-600 mr-2" />
              {outletLoading ? (
                <Loader2 size={14} className="animate-spin text-slate-400" />
              ) : (
                <select 
                  value={selectedOutlet}
                  onChange={(e) => setSelectedOutlet(e.target.value)}
                  className="bg-transparent text-sm font-black text-slate-800 uppercase tracking-tight outline-none appearance-none pr-4 cursor-pointer"
                >
                  {/* Option to view all data for this Tenant */}
                  {(userRole === "Brand Owner" || userRole === "Admin" || outlets.length > 1) && (
                    <option value="ALL">🏢 All Outlets (HQ View)</option>
                  )}
                  {/* Dynamic Outlets fetched via User's TenantId */}
                  {outlets.map(o => (
                    <option key={o.id} value={o.id}>📍 {o.name}</option>
                  ))}
                </select>
              )}
              <ChevronDown size={14} className="text-slate-400 ml-1" />
            </div>
          </div>
          
          {/* Right Side: Header Top Nav (Owner Details + Logo) */}
          <div className="flex items-center space-x-4">
            
            {!isSidebarOpen && logoUrl && (
               <img src={logoUrl} alt={tenantName} className="w-8 h-8 rounded-lg shadow-sm object-cover bg-white lg:hidden" />
            )}

            <button className="text-slate-500 hover:text-slate-800"><Bell size={20} /></button>
            <div className="h-8 w-px bg-slate-200"></div>
            
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-black text-slate-800 leading-tight uppercase">{ownerName}</p>
                <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest">{userRole}</p>
              </div>
              
              {/* 🟢 Right Side Owner Logo */}
              {logoUrl ? (
                <img src={logoUrl} alt="Avatar" className="w-9 h-9 rounded-full object-cover border border-slate-200 shadow-sm" />
              ) : (
                <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center border border-indigo-100">
                  <UserCircle size={20} />
                </div>
              )}

              <button onClick={() => { signOut({ redirect: true, callbackUrl: "/dashboard" }); }} className="w-9 h-9 ml-1 bg-slate-100 text-slate-600 hover:text-red-500 hover:bg-red-50 rounded-full flex items-center justify-center transition-colors">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50 p-6 custom-scrollbar relative">
          {children}
        </div>
      </div>
    </div>
  );
}

// 🔥 STRICT LOGIN FORM FOR BRAND HQ
function TenantLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // 🟢 NextAuth connects to API logic securely via "TENANT" type
    const res = await signIn("credentials", { 
      redirect: false, 
      email, 
      password, 
      loginType: "TENANT" 
    });

    if (res?.error) {
      setError("Invalid Email or Password. Please try again.");
      setLoading(false);
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden z-10">
        <div className="p-8 pb-6 text-center border-b border-slate-100">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl mx-auto flex items-center justify-center mb-4">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Brand HQ Login</h1>
          <p className="text-slate-500 text-[10px] font-bold mt-2 uppercase tracking-widest">Authorized Access Only</p>
        </div>
        
        <form onSubmit={handleLogin} className="p-8 pt-6 space-y-5">
          {error && <div className="bg-red-50 text-red-500 p-3 rounded-lg text-xs font-bold text-center border border-red-100">{error}</div>}
          
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-2">Registered Email</label>
            <input 
              required 
              type="email" 
              placeholder="owner@brand.com"
              value={email} 
              onChange={e=>setEmail(e.target.value)} 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm font-bold transition-colors" 
            />
          </div>
          
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-2">Password</label>
            <input 
              required 
              type="password" 
              placeholder="••••••••"
              value={password} 
              onChange={e=>setPassword(e.target.value)} 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-lg font-mono transition-colors" 
            />
          </div>
          
          <button disabled={loading} type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest py-3.5 rounded-xl text-xs flex justify-center items-center shadow-lg transition-all active:scale-95 mt-4">
            {loading ? <Loader2 className="animate-spin" size={16}/> : "Secure Login"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function BrandDashboardLayout({ children }: { children: React.ReactNode }) {
  const { status } = useSession();

  if (status === "loading") {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Workspace...</p>
      </div>
    );
  }

  // Pure strict check: NO LOGIN = NO DASHBOARD
  if (status === "unauthenticated") {
    return <TenantLoginForm />;
  }

  return (
    <OutletProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </OutletProvider>
  );
}
