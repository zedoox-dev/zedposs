import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route"; 

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId") || "ALL";

    // 1. Authenticate User (Get Session)
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const secureTenantId = (session.user as any).tenantId;

    if (!secureTenantId) return NextResponse.json({ error: "Tenant verification failed" }, { status: 403 });

    // 2. Dynamic Filter Logic based on Outlet Switcher
    let outletFilter = {};
    if (outletId !== "ALL") {
      // Fetch only for the selected outlet, STRICTLY verifying it belongs to this tenant
      outletFilter = { outletId: outletId, outlet: { tenantId: secureTenantId } };
    } else {
      // Fetch for ALL outlets under this specific brand
      outletFilter = { outlet: { tenantId: secureTenantId } };
    }

    // 3. Fetch Aggregate Metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    // Total Orders & Revenue
    const orders = await prisma.order.aggregate({
      _sum: { totalAmount: true },
      _count: { id: true },
      where: { ...outletFilter, isDeleted: false } 
    });

    // Today's Orders
    const todaysOrders = await prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: { ...outletFilter, isDeleted: false, createdAt: { gte: today } }
    });

    // Low Stock Alerts (Where stockLevel is less than or equal to minStock)
    const lowStockItems = await prisma.inventory.findMany({
      where: { 
        ...outletFilter, 
        isDeleted: false,
        stockLevel: { lte: 10 } 
      },
      include: { outlet: { select: { name: true } } },
      take: 5
    });

    // Recent 5 Transactions
    const recentOrders = await prisma.order.findMany({
      where: { ...outletFilter, isDeleted: false },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { outlet: { select: { name: true } } }
    });

    // Staff Count
    const staffCount = await prisma.user.count({
      where: outletId !== "ALL" ? { outletId: outletId, isDeleted: false } : { tenantId: secureTenantId, isDeleted: false }
    });

    return NextResponse.json({
      success: true,
      metrics: {
        totalRevenue: orders._sum.totalAmount || 0,
        todaysRevenue: todaysOrders._sum.totalAmount || 0,
        totalOrders: orders._count.id || 0,
        staffCount: staffCount,
      },
      recentOrders,
      lowStockItems
    });

  } catch (error: any) {
    console.error("Brand Dashboard Error:", error);
    return NextResponse.json({ error: "Failed to load dashboard metrics" }, { status: 500 });
  }
}
