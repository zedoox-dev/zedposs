"use client";
import { useState, useTransition } from "react";
import { toggleItemStatus } from "./actions";

export default function ToggleButtonClient({ item, outletId }: { item: any, outletId: string }) {
  const [isPending, startTransition] = useTransition();
  const [active, setActive] = useState(item.isActive);

  const handleToggle = () => {
    // Optimistic UI Update (Turant UI change, background me DB update)
    setActive(!active);
    
    startTransition(async () => {
      const res = await toggleItemStatus(item.id, outletId, item.isActive);
      if (!res.success) {
         setActive(active); // Rollback agar database update fail ho jaye
         alert("Failed to update item status!");
      }
    });
  };

  return (
    <button 
      onClick={handleToggle}
      disabled={isPending}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${active ? 'bg-emerald-500' : 'bg-slate-300'}`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 ease-in-out shadow-sm ${active ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}
