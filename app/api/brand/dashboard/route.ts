import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getServerSession } from "next-auth/next";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId") || "ALL";

    // 1. Authenticate User (Get Session)
    const session = await getServerSession();
    const userEmail = session?.user?.email;

    if (!userEmail) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    // 2. Fetch User & Tenant Info
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { tenantId: true }
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const tenantId = user.tenantId;

    // 3. Dynamic Filter Logic based on Outlet Switcher
    let outletFilter = {};
    if (outletId !== "ALL") {
      // Fetch only for the selected outlet
      outletFilter = { outletId: outletId, outlet: { tenantId: tenantId } };
    } else {
      // Fetch for ALL outlets under this brand
      outletFilter = { outlet: { tenantId: tenantId } };
    }

    // 4. Fetch Aggregate Metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    // Total Orders & Revenue
    const orders = await prisma.order.aggregate({
      _sum: { totalAmount: true },
      _count: { id: true },
      where: { ...outletFilter, isDeleted: false } // Modify to add date filter if needed
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
        // Prisma doesn't support comparing two columns directly in findMany where easily without raw query, 
        // so we'll fetch items where stock is dangerously low (e.g., < 10) for this specific view
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
      where: outletId !== "ALL" ? { outletId: outletId, isDeleted: false } : { tenantId: tenantId, isDeleted: false }
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
