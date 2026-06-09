import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route"; 

export async function POST(req: Request) {
  try {
    // 🔒 STRICT SECURITY: FETCH IDs FROM BACKEND SESSION TOKEN
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized terminal access blocked." }, { status: 401 });
    }

    const secureOutletId = (session.user as any).outletId;
    const secureTenantId = (session.user as any).tenantId;

    if (!secureOutletId || !secureTenantId) {
      return NextResponse.json({ error: "Authentication IDs missing." }, { status: 400 });
    }

    const body = await req.json();
    const { 
      cart, totalAmount, paymentMode, 
      orderType, tableNo, partCash, partCard, isComplementary, compReason,
      customerPhone, customerName,
      discount, packingCharges, deliveryCharges, cgst, sgst 
    } = body;

    if (cart.length === 0) {
      return NextResponse.json({ error: "Invalid Order Data" }, { status: 400 });
    }

    let customerId = null;

    if (customerPhone && customerPhone.length === 10 && !isComplementary) {
      let customer = await prisma.customer.findFirst({ 
        where: { phone: customerPhone, tenantId: secureTenantId } 
      });
      
      const earnedPoints = Math.floor(totalAmount / 20);

      if (!customer) {
        customer = await prisma.customer.create({
          data: { 
            phone: customerPhone, 
            name: customerName || "Guest", 
            loyaltyPoints: 50 + earnedPoints,
            tenantId: secureTenantId 
          }
        });
      } else {
        customer = await prisma.customer.update({
          where: { id: customer.id },
          data: { loyaltyPoints: { increment: earnedPoints } }
        });
      }
      customerId = customer.id;
    }

    // Bill number calculated based on secureOutletId only
    const count = await prisma.order.count({
      where: { outletId: secureOutletId }
    });
    const billNumber = 10000 + count + 1; 

    const newOrder = await prisma.order.create({
      data: {
        billNumber: billNumber, 
        outletId: secureOutletId, // 🔒 Strictly Locked
        customerId, 
        totalAmount: isComplementary ? 0 : totalAmount, 
        paymentMode, 
        orderType,
        tableNo: tableNo || null,
        partCash: parseFloat(partCash) || 0,
        partCard: parseFloat(partCard) || 0,
        isComplementary: isComplementary || false,
        compReason: compReason || null,
        
        discount: parseFloat(discount) || 0,
        packingCharges: parseFloat(packingCharges) || 0,
        deliveryCharges: parseFloat(deliveryCharges) || 0,
        cgst: parseFloat(cgst) || 0,
        sgst: parseFloat(sgst) || 0,

        platform: "POS", 
        status: "COMPLETED",
        items: {
          create: cart.map((item: any) => ({
            menuItemId: item.id, 
            quantity: item.qty, 
            price: item.price,
          })),
        },
      },
    });

    return NextResponse.json({ success: true, order: newOrder });
  } catch (error: any) {
    return NextResponse.json({ error: "Order save failed in Database.", details: error.message }, { status: 500 });
  }
}

// 🟢 GET: Filter orders by Date (Strictly locked to Session Outlet ID)
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  
  const secureOutletId = (session.user as any).outletId;
  const { searchParams } = new URL(req.url);
  const dateFilter = searchParams.get("date") || "today"; 
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  let dateQuery: any = {};
  const now = new Date();
  
  if (dateFilter === "today") {
    const start = new Date(now.setHours(0,0,0,0));
    const end = new Date(now.setHours(23,59,59,999));
    dateQuery = { gte: start, lte: end };
  } else if (dateFilter === "yesterday") {
    const start = new Date(now);
    start.setDate(start.getDate() - 1);
    start.setHours(0,0,0,0);
    const end = new Date(start);
    end.setHours(23,59,59,999);
    dateQuery = { gte: start, lte: end };
  } else if (dateFilter === "custom" && startDate && endDate) {
    const end = new Date(endDate);
    end.setHours(23,59,59,999);
    dateQuery = { gte: new Date(startDate), lte: end };
  }

  // Soft Delete check & Secure Outlet Lock
  const whereClause: any = { outletId: secureOutletId, isDeleted: false };
  if (Object.keys(dateQuery).length > 0) {
    whereClause.createdAt = dateQuery;
  }

  try {
    const orders = await prisma.order.findMany({
      where: whereClause,
      include: { items: { include: { menuItem: true } }, customer: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(orders);
  } catch (error: any) {
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }
}

// 🔴 PUT: Cancel Order with PIN verification
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    
    const secureOutletId = (session.user as any).outletId;

    const body = await req.json();
    const { orderId, pin, action } = body;

    if (pin !== "1234") {
      return NextResponse.json({ error: "Invalid Authorization PIN" }, { status: 403 });
    }

    // Prevent cancelling orders from other outlets (IDOR protection)
    const existingOrder = await prisma.order.findUnique({ where: { id: orderId } });
    if (!existingOrder || existingOrder.outletId !== secureOutletId) {
      return NextResponse.json({ error: "Unauthorized order modification blocked." }, { status: 403 });
    }

    if (action === "CANCEL") {
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { status: "CANCELLED" }
      });
      return NextResponse.json({ success: true, order: updatedOrder });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
}
