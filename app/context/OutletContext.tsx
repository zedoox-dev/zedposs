"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { useSession } from "next-auth/react";

type Outlet = { id: string; name: string; regionId: string | null };

interface OutletContextType {
  outlets: Outlet[];
  selectedOutlet: string; 
  setSelectedOutlet: (id: string) => void;
  loading: boolean;
}

const OutletContext = createContext<OutletContextType | undefined>(undefined);

export function OutletProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Session token se security check pass karenge, backend tenant apne aap pakad lega
    const fetchOutlets = async () => {
      if (!session?.user) return;
      try {
        const res = await fetch("/api/brand/my-outlets");
        const data = await res.json();
        if (data.success) {
          setOutlets(data.outlets);
          const saved = localStorage.getItem("zed_active_outlet");
          if (saved && data.outlets.some((o: Outlet) => o.id === saved)) {
            setSelectedOutlet(saved);
          } else if (data.outlets.length > 0) {
            setSelectedOutlet("ALL"); 
          }
        }
      } catch (error) {
        console.error("Failed to load outlets securely");
      } finally {
        setLoading(false);
      }
    };
    fetchOutlets();
  }, [session]);

  const handleSetOutlet = (id: string) => {
    setSelectedOutlet(id);
    localStorage.setItem("zed_active_outlet", id);
  };

  return (
    <OutletContext.Provider value={{ outlets, selectedOutlet, setSelectedOutlet: handleSetOutlet, loading }}>
      {children}
    </OutletContext.Provider>
  );
}

export const useOutlet = () => {
  const context = useContext(OutletContext);
  if (!context) throw new Error("useOutlet must be used within OutletProvider");
  return context;
};
