import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

// 1. GET: Kitchen me live orders dikhane ke liye
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const outletId = searchParams.get("outletId");

  if (!outletId) return NextResponse.json({ error: "Outlet ID required" }, { status: 400 });

  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Hum sirf wo order layenge jo abhi "COMPLETED" (yaani bill kat gaya) hain par "SERVED" nahi hue
    const activeOrders = await prisma.order.findMany({
      where: {
        outletId: outletId,
        status: "COMPLETED", // Naya order by default COMPLETED bankar aata hai hamare system me
        createdAt: { gte: startOfDay },
      },
      include: {
        items: {
          include: { menuItem: true }
        }
      },
      orderBy: { createdAt: 'asc' } // Jo order pehle aaya, wo pehle dikhega (FIFO)
    });

    return NextResponse.json(activeOrders);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch KOT" }, { status: 500 });
  }
}

// 2. PATCH: Cook jab "MARK READY" dabayega tab order ko SERVED mark karne ke liye
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { orderId } = body;

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: "SERVED" } // Order ready ho gaya
    });

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error) {
    return NextResponse.json({ error: "Status update failed" }, { status: 500 });
  }
}
