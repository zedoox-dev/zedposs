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

    // Filter Logic: Customer belongs to Brand (Tenant). 
    // If specific outlet is selected, only show customers who have ordered from that outlet.
    let customerFilter: any = { tenantId: user.tenantId, isDeleted: false };
    
    if (outletId !== "ALL") {
      customerFilter = {
        ...customerFilter,
        orders: { some: { outletId: outletId, isDeleted: false } }
      };
    }

    // Fetch Customers and their Orders to calculate "Total Visits" and "Total Spent"
    const rawCustomers = await prisma.customer.findMany({
      where: customerFilter,
      include: {
        orders: {
          where: outletId !== "ALL" ? { outletId: outletId, isDeleted: false } : { isDeleted: false },
          select: { totalAmount: true, createdAt: true }
        }
      },
      orderBy: { loyaltyPoints: 'desc' } // Top loyal customers first
    });

    // Transform Data for the Frontend
    const customers = rawCustomers.map(customer => {
      const totalVisits = customer.orders.length;
      const totalSpent = customer.orders.reduce((sum, order) => sum + order.totalAmount, 0);
      const lastVisit = totalVisits > 0 
        ? customer.orders.reduce((latest, order) => order.createdAt > latest ? order.createdAt : latest, customer.orders[0].createdAt)
        : null;

      return {
        id: customer.id,
        name: customer.name || "Unknown Customer",
        phone: customer.phone,
        loyaltyPoints: customer.loyaltyPoints,
        createdAt: customer.createdAt,
        totalVisits,
        totalSpent,
        lastVisit
      };
    });

    return NextResponse.json({ success: true, customers });
  } catch (error: any) {
    console.error("CRM Fetch Error:", error);
    return NextResponse.json({ error: "Failed to load CRM data" }, { status: 500 });
  }
}
