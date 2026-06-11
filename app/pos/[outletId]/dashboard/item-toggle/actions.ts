"use server";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function toggleItemStatus(itemId: string, outletId: string, currentStatus: boolean) {
  try {
    // 🔒 Security: Check kiya ki item sach me isi outlet ka hai ya outlet-level override hai
    await db.menuItem.updateMany({
      where: { 
        id: itemId, 
        outletId: outletId // Sirf current outlet ka item update hoga
      },
      data: { isActive: !currentStatus }
    });
    
    // UI ko refresh karne ke liye Next.js cache clear
    revalidatePath(`/pos/${outletId}/dashboard/item-toggle`);
    return { success: true };
  } catch (error) {
    console.error("Toggle Failed:", error);
    return { success: false, error: "Database update failed" };
  }
}
