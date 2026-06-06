import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getServerSession } from "next-auth/next";

export const dynamic = "force-dynamic";

// INITIALIZE POS (FETCH MENU & SETTINGS)
export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    const userEmail = session?.user?.email;
    if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ 
      where: { email: userEmail },
      include: { outlet: true } 
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (!user.outletId && user.role?.name !== "Brand Owner") {
      return NextResponse.json({ error: "Access Denied: You are not assigned to any specific Branch POS." }, { status: 403 });
    }

    // Default to the first outlet if it's the Brand Owner testing the POS
    const activeOutletId = user.outletId || (await prisma.outlet.findFirst({ where: { tenantId: user.tenantId } }))?.id;

    if (!activeOutletId) return NextResponse.json({ error: "No outlet available" }, { status: 400 });

    const menuItems = await prisma.menuItem.findMany({
      where: { tenantId: user.tenantId, isActive: true, isDeleted: false },
      orderBy: { name: 'asc' }
    });

    const customers = await prisma.customer.findMany({
      where: { tenantId: user.tenantId, isDeleted: false },
      select: { id: true, name: true, phone: true, loyaltyPoints: true }
    });

    return NextResponse.json({ success: true, menuItems, customers, outletId: activeOutletId });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to initialize POS" }, { status: 500 });
  }
}

// PROCESS CHECKOUT & GENERATE BILL
export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    const userEmail = session?.user?.email;
    if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const { outletId, cart, totalAmount, paymentMode, orderType, customerPhone, customerName } = body;

    if (!outletId || !cart || cart.length === 0) {
      return NextResponse.json({ error: "Invalid Cart Data" }, { status: 400 });
    }

    // Prisma Transaction ensures either EVERYTHING saves, or NOTHING saves (No half-bills)
    const result = await prisma.$transaction(async (tx) => {
      
      // 1. Manage Customer (Create or Update Loyalty)
      let customerId = null;
      if (customerPhone) {
        const existingCust = await tx.customer.findFirst({
          where: { phone: customerPhone, tenantId: user.tenantId }
        });
        
        if (existingCust) {
          customerId = existingCust.id;
          // Add 1 loyalty point for every ₹100 spent
          const pointsEarned = Math.floor(totalAmount / 100);
          await tx.customer.update({
            where: { id: existingCust.id },
            data: { loyaltyPoints: { increment: pointsEarned }, name: customerName || existingCust.name }
          });
        } else {
          const newCust = await tx.customer.create({
            data: {
              phone: customerPhone,
              name: customerName || "Guest",
              tenantId: user.tenantId,
              loyaltyPoints: Math.floor(totalAmount / 100)
            }
          });
          customerId = newCust.id;
        }
      }

      // 2. Generate Next Bill Number for this specific outlet
      const lastOrder = await tx.order.findFirst({
        where: { outletId: outletId },
        orderBy: { billNumber: 'desc' }
      });
      const nextBillNumber = lastOrder ? lastOrder.billNumber + 1 : 1;

      // 3. Create the Order
      const newOrder = await tx.order.create({
        data: {
          billNumber: nextBillNumber,
          outletId,
          customerId,
          totalAmount,
          paymentMode,
          orderType,
          status: "PENDING", // Goes straight to Kitchen (KDS)
        }
      });

      // 4. Create Order Items
      const orderItemsData = cart.map((item: any) => ({
        orderId: newOrder.id,
        menuItemId: item.id,
        quantity: item.qty,
        price: item.price
      }));
      await tx.orderItem.createMany({ data: orderItemsData });

      return newOrder;
    });

    return NextResponse.json({ success: true, order: result });
  } catch (error: any) {
    console.error("Checkout Error:", error);
    return NextResponse.json({ error: "Billing Failed" }, { status: 500 });
  }
}
