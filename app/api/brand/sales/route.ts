import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route"; 

export const dynamic = "force-dynamic";

// =================================================================
// 🟢 1. GET: FETCH SALES DATA WITH DATE & OUTLET FILTERS
// =================================================================
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId") || "ALL";
    const dateFilter = searchParams.get("date") || "today";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;

    if (!userEmail) return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { tenantId: true }
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Multi-Outlet Filter Logic
    let outletFilter = {};
    if (outletId !== "ALL") {
      outletFilter = { outletId: outletId, outlet: { tenantId: user.tenantId } };
    } else {
      outletFilter = { outlet: { tenantId: user.tenantId } };
    }

    // Date Filter Logic
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

    const orderWhereClause = {
      ...outletFilter,
      isDeleted: false,
      ...(Object.keys(dateQuery).length > 0 ? { createdAt: dateQuery } : {})
    };

    // Fetch Orders with Full Details for Expanded View
    const orders = await prisma.order.findMany({
      where: orderWhereClause,
      orderBy: { createdAt: 'desc' },
      take: 200, // Increased for ledger view
      include: {
        outlet: { select: { name: true } },
        customer: { select: { phone: true, name: true } },
        items: {
          include: { menuItem: { select: { name: true, price: true } } }
        }
      }
    });

    // Aggregate Stats by Payment Mode (Dynamic breakdown)
    const paymentStatsRaw = await prisma.order.groupBy({
      by: ['paymentMode'],
      where: { ...orderWhereClause, status: "COMPLETED" },
      _sum: { totalAmount: true },
      _count: { id: true }
    });

    let totalRevenue = 0;
    let totalOrders = 0;
    const paymentBreakdown: Record<string, number> = { CASH: 0, CARD: 0, UPI: 0, ZOMATO: 0, SWIGGY: 0, RAMKESAR_DELIVERY: 0 };

    paymentStatsRaw.forEach(stat => {
      const mode = stat.paymentMode.toUpperCase();
      const sum = stat._sum.totalAmount || 0;
      
      if (paymentBreakdown[mode] !== undefined) {
        paymentBreakdown[mode] += sum;
      } else {
        paymentBreakdown[mode] = sum; // Adds any dynamic platform
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

// =================================================================
// 🔴 2. POST: SECURE ORDER ACTIONS (CANCEL / SETTLE)
// =================================================================
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;

    if (!userEmail) return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });

    const body = await req.json();
    const { action, orderId, password, updateData } = body;

    // 1. Verify User Password
    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user || user.password !== password) {
      return NextResponse.json({ success: false, error: "Authentication Failed: Incorrect Password" }, { status: 403 });
    }

    // 2. Perform Action
    if (action === "CANCEL") {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: "CANCELLED" }
      });
      return NextResponse.json({ success: true, message: "Order Cancelled Successfully." });
    } 
    
    if (action === "SETTLE") {
      await prisma.order.update({
        where: { id: orderId },
        data: { 
          paymentMode: updateData.paymentMode,
          partCash: parseFloat(updateData.partCash || 0),
          partCard: parseFloat(updateData.partCard || 0),
          status: "COMPLETED"
        }
      });
      return NextResponse.json({ success: true, message: "Bill Settled Successfully." });
    }

    return NextResponse.json({ error: "Invalid Action" }, { status: 400 });

  } catch (error: any) {
    console.error("Action Error:", error);
    return NextResponse.json({ error: "Transaction Failed" }, { status: 500 });
  }
}
