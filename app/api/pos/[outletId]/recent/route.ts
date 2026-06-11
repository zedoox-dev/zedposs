import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: { outletId: string } }) {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const recentOrders = await prisma.order.findMany({
      where: {
        outletId: params.outletId,
        isDeleted: false,
        createdAt: { gte: startOfToday }
      },
      include: { items: { include: { menuItem: true } } },
      orderBy: { createdAt: 'desc' }
    });

    const todaysTotal = recentOrders.reduce((sum, order) => sum + order.totalAmount, 0);

    return NextResponse.json({ success: true, data: recentOrders, todaysTotal });
  } catch (error) {
    console.error("Recent Fetch Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch recent orders" }, { status: 500 });
  }
}
