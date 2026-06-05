import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getServerSession } from "next-auth/next";

export const dynamic = "force-dynamic";

// GET LIVE ACTIVE ORDERS
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId") || "ALL";

    const session = await getServerSession();
    const userEmail = session?.user?.email;
    if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    let outletFilter = {};
    if (outletId !== "ALL") {
      outletFilter = { outletId: outletId, outlet: { tenantId: user.tenantId } };
    } else {
      outletFilter = { outlet: { tenantId: user.tenantId } };
    }

    // Fetch orders that are NOT completed
    const liveOrders = await prisma.order.findMany({
      where: { 
        ...outletFilter, 
        isDeleted: false,
        status: { notIn: ["COMPLETED", "CANCELLED"] } // Fetch only active tickets
      },
      include: {
        outlet: { select: { name: true } },
        items: { include: { menuItem: { select: { name: true } } } }
      },
      orderBy: { createdAt: 'asc' } // Oldest first (First In, First Out)
    });

    return NextResponse.json({ success: true, liveOrders });
  } catch (error: any) {
    console.error("KDS Fetch Error:", error);
    return NextResponse.json({ error: "Failed to load KDS data" }, { status: 500 });
  }
}

// UPDATE ORDER STATUS (e.g. PENDING -> PREPARING -> READY)
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { orderId, newStatus } = body;

    if (!orderId || !newStatus) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: newStatus }
    });

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error: any) {
    console.error("KDS Update Error:", error);
    return NextResponse.json({ error: "Failed to update order status" }, { status: 500 });
  }
}
