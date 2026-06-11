import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: { outletId: string } }) {
  try {
    const liveOrders = await prisma.order.findMany({
      where: {
        outletId: params.outletId,
        isDeleted: false,
        status: { not: "COMPLETED" }
      },
      include: { items: { include: { menuItem: true } } },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json({ success: true, data: liveOrders });
  } catch (error) {
    console.error("Live Fetch Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch live orders" }, { status: 500 });
  }
}
