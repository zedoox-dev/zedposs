import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET(req: Request) {
  // 🔒 STRICT SECURITY: GET SESSION OUTLET ID
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized access blocked." }, { status: 401 });
  }

  const secureOutletId = (session.user as any).outletId;
  const secureTenantId = (session.user as any).tenantId;

  if (!secureOutletId || !secureTenantId) {
    return NextResponse.json({ error: "Context IDs missing." }, { status: 400 });
  }

  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todaysOrders = await prisma.order.findMany({
      where: {
        outletId: secureOutletId, // 🔒 Locked to Session
        tenantId: secureTenantId, 
        createdAt: { gte: startOfDay },
        isDeleted: false
      },
      include: {
        items: {
          include: { menuItem: true }
        }
      },
      orderBy: { createdAt: 'desc' } 
    });

    return NextResponse.json(todaysOrders);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch KOT" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access blocked." }, { status: 401 });
    }
    const secureOutletId = (session.user as any).outletId;

    const body = await req.json();
    const { orderId } = body;

    // 🔒 IDOR Check: Ensure order belongs to this outlet
    const orderCheck = await prisma.order.findUnique({ where: { id: orderId } });
    if (!orderCheck || orderCheck.outletId !== secureOutletId) {
      return NextResponse.json({ error: "Forbidden modification." }, { status: 403 });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: "SERVED" } 
    });

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error) {
    return NextResponse.json({ error: "Status update failed" }, { status: 500 });
  }
}
