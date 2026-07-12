import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route"; 

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId") || "ALL";
    
    // 🟢 Read Date Filters from URL
    const dateFilter = searchParams.get("date") || "today";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

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
      outletFilter = { outletId: outletId, outlet: { tenantId: secureTenantId } };
    } else {
      outletFilter = { outlet: { tenantId: secureTenantId } };
    }

    // 🟢 3. Build Date Query for Filtering Data
    let dateQuery: any = {};
    const now = new Date();

    if (dateFilter === "today") {
      const start = new Date(now.setHours(0, 0, 0, 0));
      const end = new Date(now.setHours(23, 59, 59, 999));
      dateQuery = { gte: start, lte: end };
    } else if (dateFilter === "yesterday") {
      const start = new Date(now);
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      dateQuery = { gte: start, lte: end };
    } else if (dateFilter === "custom" && startDate && endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateQuery = { gte: new Date(startDate), lte: end };
    }

    // Final Where Clause for Orders
    const orderWhereClause = {
      ...outletFilter,
      isDeleted: false,
      ...(Object.keys(dateQuery).length > 0 ? { createdAt: dateQuery } : {})
    };

    // 4. Fetch Aggregate Metrics

    // Total Orders & Revenue (Filtered by selected date & outlet)
    const orders = await prisma.order.aggregate({
      _sum: { totalAmount: true },
      _count: { id: true },
      where: orderWhereClause 
    });

    // Today's Pulse Orders (This will strictly remain "Today" so owner can always see what's happening today)
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    const todaysOrders = await prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: { ...outletFilter, isDeleted: false, createdAt: { gte: today } }
    });

    // Low Stock Alerts (Where stockLevel is less than or equal to minStock) - NOT dependent on date
    const lowStockItems = await prisma.inventory.findMany({
      where: { 
        ...outletFilter, 
        isDeleted: false,
        stockLevel: { lte: 10 } 
      },
      include: { outlet: { select: { name: true } } },
      take: 5
    });

    // Recent 5 Transactions (Filtered by selected date)
    const recentOrders = await prisma.order.findMany({
      where: orderWhereClause,
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { outlet: { select: { name: true } } }
    });

    // Staff Count (Active staff) - NOT dependent on date
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
