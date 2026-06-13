import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET(req: Request) {
  // 🔒 STRICT SECURITY: GET SESSION TOKENS
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized access blocked." }, { status: 401 });
  }

  const secureOutletId = (session.user as any).outletId;

  if (!secureOutletId) {
    return NextResponse.json({ error: "Context IDs missing." }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const dateFilter = searchParams.get("date") || "today"; 
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

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
    const orders = await prisma.order.findMany({
      where: { 
        outletId: secureOutletId, // 🔒 Data Isolated securely to the Outlet
        createdAt: dateQuery,
        status: { not: "CANCELLED" },
        isDeleted: false 
      },
      include: {
        items: { 
          include: { 
            menuItem: {
              include: { category: true } // Fetches the actual category name string
            } 
          } 
        }
      }
    });

    const itemMap: Record<string, any> = {};
    const categoryMap: Record<string, number> = {};
    let totalRevenue = 0;
    let totalItemsSold = 0;

    orders.forEach((order) => {
      const isComp = order.paymentMode === "COMPLEMENTARY" || order.isComplementary;

      order.items.forEach((item) => {
        const id = item.menuItemId;
        const name = item.menuItem?.name || "Unknown Item";
        const category = item.menuItem?.category?.name || "General"; // Maps to the relation
        const qty = item.quantity;
        
        // Maps to the new unitPrice/totalPrice schema logic
        const rev = isComp ? 0 : (item.totalPrice || (item.unitPrice * item.quantity));

        if (!itemMap[id]) itemMap[id] = { id, name, category, qty: 0, revenue: 0 };
        itemMap[id].qty += qty;
        itemMap[id].revenue += rev;

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
