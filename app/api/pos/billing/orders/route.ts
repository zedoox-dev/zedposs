import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]/route"; 

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: "Unauthorized access blocked." }, { status: 401 });

    const secureOutletId = (session.user as any).outletId;
    const secureTenantId = (session.user as any).tenantId;

    if (!secureOutletId || !secureTenantId) return NextResponse.json({ error: "Authentication IDs missing." }, { status: 400 });

    const body = await req.json();
    const { 
      cart, totalAmount, paymentMode, 
      orderType, tableNo, partCash, partCard, isComplementary, compReason, compPassword,
      customerPhone, customerName, subtotal, roundOff,
      discount, packingCharges, deliveryCharges, cgst, sgst 
    } = body;

    if (cart.length === 0) return NextResponse.json({ error: "Invalid Order Data" }, { status: 400 });

    // 🔥 COMPLIMENTARY PASSWORD SECURITY CHECK
    const isComp = paymentMode === "COMPLIMENTARY" || isComplementary === true;
    if (isComp) {
      const dbOutlet = await prisma.outlet.findUnique({ where: { id: secureOutletId } });
      if (dbOutlet?.password !== compPassword) {
        return NextResponse.json({ error: "Invalid POS Login Password for Complimentary Bill!" }, { status: 403 });
      }
    }

    let customerId = null;
    if (customerPhone && customerPhone.length === 10 && !isComp) {
      let customer = await prisma.customer.findFirst({ where: { phone: customerPhone, tenantId: secureTenantId } });
      const earnedPoints = Math.floor(parseFloat(totalAmount || "0") / 20);

      if (!customer) {
        customer = await prisma.customer.create({
          data: { phone: customerPhone, name: customerName || "Guest", loyaltyPoints: 50 + earnedPoints, tenantId: secureTenantId }
        });
      } else {
        customer = await prisma.customer.update({
          where: { id: customer.id },
          data: { loyaltyPoints: { increment: earnedPoints } }
        });
      }
      customerId = customer.id;
    }

    const count = await prisma.order.count({ where: { outletId: secureOutletId } });
    const billNumber = 10000 + count + 1; 

    // 🔥 Schema Enums mapped exactly & NaN Crash Prevention (|| "0")
    const newOrder = await prisma.order.create({
      data: {
        billNumber: billNumber, 
        outletId: secureOutletId,
        customerId, 
        orderType: orderType, // Must be exactly DINE_IN, TAKEAWAY, or DELIVERY
        status: "COMPLETED",
        paymentMode: paymentMode, // CASH, CARD, MIXED, COMPLIMENTARY
        platform: "POS", 
        
        subtotal: parseFloat(subtotal || "0"),
        discountAmount: parseFloat(discount || "0"),
        packingCharges: parseFloat(packingCharges || "0"),
        deliveryCharges: parseFloat(deliveryCharges || "0"),
        cgst: parseFloat(cgst || "0"),
        sgst: parseFloat(sgst || "0"),
        roundOff: parseFloat(roundOff || "0"),
        totalAmount: isComp ? 0 : parseFloat(totalAmount || "0"),
        
        partCash: parseFloat(partCash || "0"),
        partCard: parseFloat(partCard || "0"),
        isComplementary: isComp,
        compReason: compReason || null,
        
        items: {
          create: cart.map((item: any) => ({
            menuItemId: item.id, 
            quantity: item.qty, 
            unitPrice: parseFloat(item.price || "0"),
            totalPrice: parseFloat(item.price || "0") * item.qty
          })),
        },
      },
    });

    return NextResponse.json({ success: true, order: newOrder });
  } catch (error: any) {
    console.error("Order Save Error:", error);
    return NextResponse.json({ error: `Database Error: ${error.message}` }, { status: 500 });
  }
}
