import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getServerSession } from "next-auth/next";

export const dynamic = "force-dynamic";

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

    // 1. REVENUE & GST (From Completed Orders)
    const ordersStats = await prisma.order.aggregate({
      where: { ...outletFilter, status: "COMPLETED", isDeleted: false },
      _sum: {
        totalAmount: true,
        cgst: true,
        sgst: true,
        discount: true
      },
      _count: { id: true }
    });

    const totalRevenue = ordersStats._sum.totalAmount || 0;
    const totalCGST = ordersStats._sum.cgst || 0;
    const totalSGST = ordersStats._sum.sgst || 0;
    const totalGSTCollected = totalCGST + totalSGST;

    // 2. EXPENSES (From Daily Expenses Log)
    const expensesStats = await prisma.expense.aggregate({
      where: { ...outletFilter, isDeleted: false },
      _sum: { amount: true }
    });
    const operationalExpenses = expensesStats._sum.amount || 0;

    // 3. PURCHASES (From Purchase Orders marked as RECEIVED)
    const purchasesStats = await prisma.purchaseOrder.aggregate({
      where: { ...outletFilter, status: "RECEIVED", isDeleted: false },
      _sum: { totalAmount: true }
    });
    const procurementCosts = purchasesStats._sum.totalAmount || 0;

    // 4. CALCULATE NET PROFIT
    const totalExpenses = operationalExpenses + procurementCosts;
    const netProfit = totalRevenue - totalExpenses;

    // 5. TOP SELLING ITEMS (Analytics)
    // Grouping order items to find top sellers
    const topItemsRaw = await prisma.orderItem.groupBy({
      by: ['menuItemId'],
      where: { order: { ...outletFilter, status: "COMPLETED", isDeleted: false } },
      _sum: { quantity: true, price: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5
    });

    // Fetch names for those top items
    const topItems = await Promise.all(
      topItemsRaw.map(async (item) => {
        const menuItem = await prisma.menuItem.findUnique({ where: { id: item.menuItemId } });
        return {
          name: menuItem?.name || "Unknown Item",
          quantitySold: item._sum.quantity || 0,
          revenueGenerated: (item._sum.price || 0) * (item._sum.quantity || 0)
        };
      })
    );

    return NextResponse.json({
      success: true,
      metrics: {
        totalRevenue,
        totalExpenses,
        netProfit,
        totalGSTCollected,
        totalOrders: ordersStats._count.id,
        procurementCosts,
        operationalExpenses
      },
      topItems
    });

  } catch (error: any) {
    console.error("Reports API Error:", error);
    return NextResponse.json({ error: "Failed to generate financial report" }, { status: 500 });
  }
}
