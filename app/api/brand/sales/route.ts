import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getServerSession } from "next-auth/next";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId") || "ALL";

    // 1. Authenticate User
    const session = await getServerSession();
    const userEmail = session?.user?.email;

    if (!userEmail) return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { tenantId: true }
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // 2. Multi-Outlet Filter Logic
    let outletFilter = {};
    if (outletId !== "ALL") {
      outletFilter = { outletId: outletId, outlet: { tenantId: user.tenantId } };
    } else {
      outletFilter = { outlet: { tenantId: user.tenantId } };
    }

    // 3. Fetch Recent Orders (Limit 100 for fast Live View)
    const orders = await prisma.order.findMany({
      where: { ...outletFilter, isDeleted: false },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        outlet: { select: { name: true } },
        customer: { select: { phone: true, name: true } }
      }
    });

    // 4. Calculate Aggregate Stats by Payment Mode (UPI vs Cash vs Card)
    const paymentStatsRaw = await prisma.order.groupBy({
      by: ['paymentMode'],
      where: { ...outletFilter, isDeleted: false, status: "COMPLETED" },
      _sum: { totalAmount: true },
      _count: { id: true }
    });

    // Format the stats for the frontend
    let totalRevenue = 0;
    let totalOrders = 0;
    const paymentBreakdown: Record<string, number> = { CASH: 0, UPI: 0, CARD: 0 };

    paymentStatsRaw.forEach(stat => {
      const mode = stat.paymentMode.toUpperCase();
      const sum = stat._sum.totalAmount || 0;
      
      if (paymentBreakdown[mode] !== undefined) {
        paymentBreakdown[mode] += sum;
      } else {
        paymentBreakdown["OTHER"] = (paymentBreakdown["OTHER"] || 0) + sum;
      }
      
      totalRevenue += sum;
      totalOrders += stat._count.id;
    });

    const averageOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : 0;

    return NextResponse.json({
      success: true,
      orders,
      metrics: {
        totalRevenue,
        totalOrders,
        averageOrderValue,
        paymentBreakdown
      }
    });

  } catch (error: any) {
    console.error("Sales API Error:", error);
    return NextResponse.json({ error: "Failed to load sales data" }, { status: 500 });
  }
}
