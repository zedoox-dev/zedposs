import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId") || "ALL";
    const dateFilter = searchParams.get("date") || "today";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // 1. Authenticate User
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;

    if (!userEmail) return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { tenantId: true }
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // 2. Date Filtering Logic
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

    // 3. Multi-Outlet Filter Logic
    let outletFilter = {};
    if (outletId !== "ALL") {
      outletFilter = { outletId: outletId, outlet: { tenantId: user.tenantId } };
    } else {
      outletFilter = { outlet: { tenantId: user.tenantId } };
    }

    const finalWhereClause = { 
      ...outletFilter, 
      isDeleted: false,
      ...(Object.keys(dateQuery).length > 0 ? { createdAt: dateQuery } : {}) 
    };

    // 4. Fetch Orders with Full Details (Limit 200 for fast Live View)
    const orders = await prisma.order.findMany({
      where: finalWhereClause,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        outlet: { select: { name: true } },
        customer: { select: { phone: true, name: true } },
        items: { include: { menuItem: true } } // 🟢 Included order items for details view
      }
    });

    // 5. Calculate Aggregate Stats by Payment Mode & Platform
    const completedOrders = orders.filter(o => o.status === "COMPLETED");
    
    let totalRevenue = 0;
    let totalOrders = completedOrders.length;
    
    const paymentBreakdown: Record<string, number> = { CASH: 0, UPI: 0, CARD: 0, PART_PAYMENT: 0 };
    const platformBreakdown: Record<string, number> = { POS: 0, ZOMATO: 0, SWIGGY: 0, RAMKESAR_APP: 0 };

    completedOrders.forEach(order => {
      totalRevenue += order.totalAmount;
      
      // Payment Breakdown
      const mode = order.paymentMode?.toUpperCase() || "CASH";
      if (mode === "PART") {
        paymentBreakdown["PART_PAYMENT"] = (paymentBreakdown["PART_PAYMENT"] || 0) + order.totalAmount;
      } else if (paymentBreakdown[mode] !== undefined) {
        paymentBreakdown[mode] += order.totalAmount;
      } else {
        paymentBreakdown["OTHER"] = (paymentBreakdown["OTHER"] || 0) + order.totalAmount;
      }

      // Platform Breakdown (Swiggy, Zomato, etc.)
      const platform = order.platform?.toUpperCase() || "POS";
      if (platformBreakdown[platform] !== undefined) {
        platformBreakdown[platform] += order.totalAmount;
      } else {
        platformBreakdown[platform] = (platformBreakdown[platform] || 0) + order.totalAmount;
      }
    });

    const averageOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : 0;

    return NextResponse.json({
      success: true,
      orders,
      metrics: {
        totalRevenue,
        totalOrders,
        averageOrderValue,
        paymentBreakdown,
        platformBreakdown
      }
    });

  } catch (error: any) {
    console.error("Sales API Error:", error);
    return NextResponse.json({ error: "Failed to load sales data" }, { status: 500 });
  }
}

// 🟢 NEW: SECURE ACTION ENDPOINT (Cancel / Settle Bill)
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });

    const body = await req.json();
    const { orderId, action, password, paymentMode, partCash, partCard } = body;

    if (!orderId || !action || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Verify User Password strictly
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    });

    if (!user || user.password !== password) {
      return NextResponse.json({ error: "Authentication Failed: Incorrect Password!" }, { status: 403 });
    }

    // 2. Perform Update based on action
    if (action === "CANCEL") {
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { status: "CANCELLED" }
      });
      return NextResponse.json({ success: true, message: "Bill Cancelled Successfully", order: updatedOrder });
    } 
    
    else if (action === "SETTLE") {
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { 
          paymentMode: paymentMode,
          partCash: parseFloat(partCash) || 0,
          partCard: parseFloat(partCard) || 0,
          status: "COMPLETED"
        }
      });
      return NextResponse.json({ success: true, message: "Payment Settled Successfully", order: updatedOrder });
    }

    return NextResponse.json({ error: "Invalid Action" }, { status: 400 });

  } catch (error: any) {
    console.error("Update Order Error:", error);
    return NextResponse.json({ error: "Database transaction failed." }, { status: 500 });
  }
}
