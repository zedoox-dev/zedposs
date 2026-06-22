import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: { outletId: string } }) {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const liveOrders = await prisma.order.findMany({
      where: {
        outletId: params.outletId,
        isDeleted: false,
        createdAt: { gte: startOfToday },
        // Cancelled, Void aur Refunded ko chhod kar sab dikhayega (Completed bhi)
        status: { notIn: ["CANCELLED", "REFUNDED", "VOID"] }
      },
      include: { 
        items: { 
          include: { 
            menuItem: true,
            modifiers: { include: { modifier: true } }
          } 
        },
        customer: true,
        deliveryOrder: true,
        onlineOrder: true,
        table: true
      },
      orderBy: { createdAt: 'desc' } // Naye order sabse upar
    });

    return NextResponse.json({ success: true, data: liveOrders });
  } catch (error) {
    console.error("Live Fetch Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch live orders" }, { status: 500 });
  }
}
