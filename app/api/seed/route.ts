import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  try {
    // Pehle check karega ki database me items hain ya nahi (Duplicate bachane ke liye)
    const count = await prisma.menuItem.count();
    
    if (count > 0) {
      return NextResponse.json({ message: "Items pehle se database me hain!", count });
    }

    // Ramkesar ke premium items create kar raha hai
    await prisma.menuItem.createMany({
      data: [
        { name: "Aloo Samosa", price: 20, category: "Snacks" },
        { name: "Desi Ghee Jalebi (100g)", price: 50, category: "Sweets" },
        { name: "Khaman Dhokla (100g)", price: 40, category: "Snacks" },
        { name: "Special Punjabi Lassi", price: 60, category: "Beverages" },
        { name: "Gulab Jamun (2 pcs)", price: 40, category: "Sweets" },
        { name: "Paneer Bread Pakora", price: 30, category: "Snacks" },
      ]
    });

    return NextResponse.json({ message: "🎉 Menu Item successfully Added!" });
  } catch (error: any) {
    console.error("Seed Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
