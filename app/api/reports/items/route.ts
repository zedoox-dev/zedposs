import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const outletId = searchParams.get("outletId");
  const tenantId = searchParams.get("tenantId"); // 🔥 Multi-Tenant Protection
  const dateFilter = searchParams.get("date") || "today"; 
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!outletId || !tenantId) return NextResponse.json({ error: "Outlet ID and Tenant ID required" }, { status: 400 });

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

  try {
    // Sirf valid (non-cancelled, non-deleted) orders fetch karenge
    const orders = await prisma.order.findMany({
      where: { 
        outletId: outletId, 
        tenantId: tenantId, // 🔒 Data Isloated for current business owner
        createdAt: dateQuery,
        status: { not: "CANCELLED" },
        isDeleted: false 
      },
      include: {
        items: { include: { menuItem: true } }
      }
    });

    const itemMap: Record<string, any> = {};
    const categoryMap: Record<string, number> = {};
    let totalRevenue = 0;
    let totalItemsSold = 0;

    orders.forEach((order) => {
      // Ignore strictly free complementary orders from item revenue mapping
      const isComp = order.paymentMode === "COMPLEMENTARY" || order.isComplementary;

      order.items.forEach((item) => {
        const id = item.menuItemId;
        // Backup names if menuItem relation fails gracefully
        const name = item.menuItem?.name || "Unknown Item";
        const category = item.menuItem?.category || "General";
        const qty = item.quantity;
        
        // Agar complementary hai toh revenue 0 gino, otherwise actual item base price gino
        const rev = isComp ? 0 : (item.price * item.quantity);

        // Map Item
        if (!itemMap[id]) itemMap[id] = { id, name, category, qty: 0, revenue: 0 };
        itemMap[id].qty += qty;
        itemMap[id].revenue += rev;

        // Map Category
        if (!categoryMap[category]) categoryMap[category] = 0;
        categoryMap[category] += rev;

        totalRevenue += rev;
        totalItemsSold += qty;
      });
    });

    const itemsArray = Object.values(itemMap).sort((a, b) => b.qty - a.qty);
    const topCategory = Object.keys(categoryMap).length > 0 
      ? Object.entries(categoryMap).reduce((a, b) => b[1] > a[1] ? b : a)[0] 
      : "N/A";

    return NextResponse.json({
      success: true,
      items: itemsArray,
      summary: {
        totalItemsSold,
        totalRevenue,
        uniqueItemCount: itemsArray.length,
        topCategory
      }
    });
  } catch (error: any) {
    console.error("Item Report Error:", error);
    return NextResponse.json({ error: "Failed to compile item velocity data.", details: error.message }, { status: 500 });
  }
}
