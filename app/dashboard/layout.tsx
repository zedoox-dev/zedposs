"use client";
import { useState } from "react";
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
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { outlets, selectedOutlet, setSelectedOutlet, loading: outletLoading } = useOutlet();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Enterprise Menu Structure
  const menuGroups = [
    {
      title: "Business Console",
      items: [
        { name: "Global Dashboard", path: "/dashboard", icon: <LayoutDashboard size={18} /> },
        { name: "Live Sales & POS", path: "/dashboard/sales", icon: <ReceiptIndianRupee size={18} /> },
        { name: "Kitchen (KDS)", path: "/dashboard/kds", icon: <ChefHat size={18} /> },
      ]
    },
    {
      title: "Operations & Stock",
      items: [
        { name: "Inventory Matrix", path: "/dashboard/inventory", icon: <Package size={18} /> },
        { name: "Purchases (PO)", path: "/dashboard/purchases", icon: <ShoppingCart size={18} /> },
        { name: "Menu & Recipes", path: "/dashboard/menu", icon: <ClipboardList size={18} /> },
      ]
    },
    {
      title: "Network & People",
      items: [
        { name: "Outlets & Regions", path: "/dashboard/outlets", icon: <MapPin size={18} /> },
        { name: "Staff & HR", path: "/dashboard/staff", icon: <UserCircle size={18} /> },
        { name: "CRM & Customers", path: "/dashboard/crm", icon: <Users size={18} /> },
      ]
    },
    {
      title: "System Admin",
      items: [
        { name: "Marketing Hub", path: "/dashboard/marketing", icon: <Megaphone size={18} /> },
        { name: "Roles & Access", path: "/dashboard/roles", icon: <ShieldCheck size={18} /> },
        { name: "Settings", path: "/dashboard/settings", icon: <Settings size={18} /> },
      ]
    }
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <div className={`bg-slate-900 text-slate-300 w-64 flex flex-col transition-all duration-300 z-20 shrink-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full fixed h-full'}`}>
        
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center mr-3 shadow-lg">
            <Store size={18} className="text-white" />
          </div>
          <span className="font-black text-white uppercase tracking-widest text-sm truncate">Brand HQ</span>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
          {menuGroups.map((group, gIdx) => (
            <div key={gIdx}>
              <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 px-3">{group.title}</h4>
              <ul className="space-y-1">
                {group.items.map((item, idx) => {
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
          ))}
        </div>
      </div>

      {/* MAIN AREA */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* TOP HEADER WITH OUTLET SWITCHER */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10 shadow-sm">
          
          {/* THE MULTI-OUTLET SWITCHER */}
          <div className="flex items-center">
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
                  <option value="ALL">🏢 All Outlets (HQ View)</option>
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
                <p className="text-xs font-black text-slate-800 leading-tight uppercase">{session?.user?.name || "Brand Owner"}</p>
                <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest">Admin Control</p>
              </div>
              <button onClick={() => signOut()} className="w-9 h-9 bg-slate-100 text-slate-600 hover:text-red-500 hover:bg-red-50 rounded-full flex items-center justify-center transition-colors">
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
