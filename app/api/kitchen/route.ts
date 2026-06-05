import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

// 1. GET: Kitchen me live, prepared aur all orders dikhane ke liye
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const outletId = searchParams.get("outletId");
  const tenantId = searchParams.get("tenantId");

  if (!outletId || !tenantId) {
    return NextResponse.json({ error: "Outlet ID and Tenant ID required" }, { status: 400 });
  }

  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // Fetching all orders for today for this specific outlet and tenant
    const todaysOrders = await prisma.order.findMany({
      where: {
        outletId: outletId,
        tenantId: tenantId, // Multi-Tenant Lock
        createdAt: { gte: startOfDay },
        isDeleted: false
      },
      include: {
        items: {
          include: { menuItem: true }
        }
      },
      orderBy: { createdAt: 'desc' } // Naye sabse upar (UI mein logic se reverse karenge)
    });

    return NextResponse.json(todaysOrders);
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
