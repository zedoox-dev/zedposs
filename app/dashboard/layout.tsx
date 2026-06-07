"use client";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { 
  Store, LayoutDashboard, Users, ReceiptIndianRupee, 
  Package, ShoppingCart, UserCircle, Settings, ClipboardList, 
  ChefHat, Megaphone, MapPin, Loader2, ChevronDown, Bell, LogOut, ShieldCheck
} from "lucide-react";
import { OutletProvider, useOutlet } from "../context/OutletContext";

// Inner Layout Component that uses the Outlet Context
function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { outlets, selectedOutlet, setSelectedOutlet, loading: outletLoading } = useOutlet();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // 🔥 NEW: Store Dynamic Permissions from Session
  const [userRole, setUserRole] = useState<string>("STAFF");
  const [permissions, setPermissions] = useState<any>({});

  // Sync DB Role & Permissions from Session token (NextAuth)
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    } else if (status === "authenticated" && session?.user) {
      setUserRole((session.user as any).role || "STAFF");
      // Assuming NextAuth token contains the JSON permissions assigned to the role
      // If not passed in token, you can fetch from an API like `/api/user/permissions`
      setPermissions((session.user as any).permissions || {});
    }
  }, [status, session, router]);

  // 🔥 NEW: Filter Sidebar based on Permissions JSON
  // Example Permission check: permissions.Sales?.view === true
  const hasAccess = (moduleName: string) => {
    // Brand Owners override everything and see all
    if (userRole === "Brand Owner") return true;
    
    // Check specific module view permission
    if (permissions[moduleName] && permissions[moduleName].view) return true;

    // Fallback for global items that everyone should see (like dashboard home)
    if (moduleName === "Dashboard") return true;

    return false;
  };

  // Enterprise Menu Structure with Access Locks
  const menuGroups = [
    {
      title: "Business Console",
      items: [
        { name: "Global Dashboard", path: "/dashboard", icon: <LayoutDashboard size={18} />, module: "Dashboard" },
        { name: "Live Sales & POS", path: "/dashboard/sales", icon: <ReceiptIndianRupee size={18} />, module: "Sales" },
        { name: "Kitchen (KDS)", path: "/dashboard/kds", icon: <ChefHat size={18} />, module: "Menu" }, // KDS tied to Menu access
      ]
    },
    {
      title: "Operations & Stock",
      items: [
        { name: "Inventory Matrix", path: "/dashboard/inventory", icon: <Package size={18} />, module: "Inventory" },
        { name: "Purchases (PO)", path: "/dashboard/purchases", icon: <ShoppingCart size={18} />, module: "Inventory" }, // Purchases tied to Inventory
        { name: "Menu & Recipes", path: "/dashboard/menu", icon: <ClipboardList size={18} />, module: "Menu" },
      ]
    },
    {
      title: "Network & People",
      items: [
        { name: "Outlets & Regions", path: "/dashboard/outlets", icon: <MapPin size={18} />, module: "Staff" }, // Handled by HR/Staff module
        { name: "Staff & HR", path: "/dashboard/staff", icon: <UserCircle size={18} />, module: "Staff" },
        { name: "CRM & Customers", path: "/dashboard/crm", icon: <Users size={18} />, module: "Reports" }, // Tied to Reports
      ]
    },
    {
      title: "System Admin",
      items: [
        { name: "Marketing Hub", path: "/dashboard/marketing", icon: <Megaphone size={18} />, module: "Reports" },
        { name: "Roles & Access", path: "/dashboard/roles", icon: <ShieldCheck size={18} />, module: "Staff" },
        { name: "Settings", path: "/dashboard/settings", icon: <Settings size={18} />, module: "Sales" }, // Tied to Global Settings
      ]
    }
  ];

  if (status === "loading") {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <div className={`bg-slate-900 text-slate-300 w-64 flex flex-col transition-all duration-300 z-20 shrink-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full fixed h-full'}`}>
        
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center mr-3 shadow-lg">
            <Store size={18} className="text-white" />
          </div>
          <span className="font-black text-white uppercase tracking-widest text-sm truncate">
            {/* Dynamic Brand Name from Session if available */}
            {(session?.user as any)?.tenantName || "Brand HQ"}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
          {menuGroups.map((group, gIdx) => {
            // Filter items based on Role Permissions
            const visibleItems = group.items.filter(item => hasAccess(item.module));
            
            if (visibleItems.length === 0) return null; // Hide entire group if no items accessible

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
        
        {/* TOP HEADER WITH OUTLET SWITCHER */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10 shadow-sm">
          
          {/* THE MULTI-OUTLET SWITCHER */}
          <div className="flex items-center">
            {/* Hamburger for mobile */}
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="mr-4 lg:hidden text-slate-500">
              <MapPin size={20} />
            </button>

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
                  {/* Only show "ALL" if the user has multi-outlet rights (like Area Manager or Owner) */}
                  {(userRole === "Brand Owner" || outlets.length > 1) && (
                    <option value="ALL">🏢 All Outlets (HQ View)</option>
                  )}
                  {outlets.map(o => (
                    <option key={o.id} value={o.id}>📍 {o.name}</option>
                  ))}
                </select>
              )}
              <ChevronDown size={14} className="text-slate-400 ml-1" />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button className="text-slate-500 hover:text-slate-800"><Bell size={20} /></button>
            <div className="h-8 w-px bg-slate-200"></div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-black text-slate-800 leading-tight uppercase">{session?.user?.name || "Staff Member"}</p>
                <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest">{userRole}</p>
              </div>
              <button onClick={() => signOut({ callbackUrl: '/login' })} className="w-9 h-9 bg-slate-100 text-slate-600 hover:text-red-500 hover:bg-red-50 rounded-full flex items-center justify-center transition-colors" title="Logout securely">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic Pages Rendering */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-6 custom-scrollbar relative">
          {children}
        </div>
      </div>
    </div>
  );
}

// Wrap the entire layout in OutletProvider
export default function BrandDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <OutletProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </OutletProvider>
  );
}
