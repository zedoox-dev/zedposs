"use client";
import React, { createContext, useContext, useState, useEffect } from "react";

type Outlet = { id: string; name: string; regionId: string | null };

interface OutletContextType {
  outlets: Outlet[];
  selectedOutlet: string; // "ALL" or specific outlet ID
  setSelectedOutlet: (id: string) => void;
  loading: boolean;
}

const OutletContext = createContext<OutletContextType | undefined>(undefined);

export function OutletProvider({ children }: { children: React.ReactNode }) {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Database se user ke assigned outlets fetch karna
    const fetchOutlets = async () => {
      try {
        const res = await fetch("/api/brand/my-outlets");
        const data = await res.json();
        if (data.success) {
          setOutlets(data.outlets);
          // Agar local storage me pehle se koi branch selected thi, toh usko load karo
          const saved = localStorage.getItem("zed_active_outlet");
          if (saved && data.outlets.some((o: Outlet) => o.id === saved)) {
            setSelectedOutlet(saved);
          } else if (data.outlets.length > 0) {
            // Default "ALL" rakhna best hai Owner ke liye
            setSelectedOutlet("ALL"); 
          }
        }
      } catch (error) {
        console.error("Failed to load outlets");
      } finally {
        setLoading(false);
      }
    };
    fetchOutlets();
  }, []);

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
