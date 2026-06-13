import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });

  // 🔒 Multi-Tenant Lock Securely via Session (CRM applies across the Brand/Tenant)
  const secureTenantId = (session.user as any).tenantId;

  if (!secureTenantId) {
    return NextResponse.json({ error: "Tenant ID required for CRM access" }, { status: 400 });
  }

  try {
    const customers = await prisma.customer.findMany({
      where: { 
        tenantId: secureTenantId, 
        isDeleted: false 
      },
      include: {
        orders: { 
          where: { isDeleted: false, status: { not: "CANCELLED" } },
          select: { totalAmount: true } // Performance Optimization
        } 
      },
      orderBy: { loyaltyPoints: 'desc' }
    });

    const formattedCustomers = customers.map(c => ({
      id: c.id,
      name: c.name || "Unknown",
      phone: c.phone,
      loyaltyPoints: c.loyaltyPoints,
      totalVisits: c.orders.length,
      totalSpend: c.orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0)
    }));

    return NextResponse.json(formattedCustomers);
  } catch (error) {
    console.error("CRM Fetch Error:", error);
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });

    const secureTenantId = (session.user as any).tenantId;

    const { name, phone } = await req.json();

    const existing = await prisma.customer.findFirst({ 
      where: { phone: phone, tenantId: secureTenantId } 
    });
    
    if (existing) {
      return NextResponse.json({ error: "Ye phone number is brand mein pehle se registered hai!" }, { status: 400 });
    }

    // 🔥 Added Loyalty Transaction Logging via Prisma Transaction
    const result = await prisma.$transaction(async (tx) => {
      const newCustomer = await tx.customer.create({
        data: { 
          name, 
          phone,
          tenantId: secureTenantId, // 🔒 Locked to business owner securely 
          loyaltyPoints: 50 
        } 
      });

      // Log Welcome Bonus in Passbook
      await tx.loyaltyTransaction.create({
        data: {
          customerId: newCustomer.id,
          type: "EARN",
          points: 50,
          notes: "Welcome VIP Bonus Registration"
        }
      });

      return newCustomer;
    });

    return NextResponse.json({ success: true, customer: result });
  } catch (error: any) {
    console.error("Customer Add Error:", error);
    return NextResponse.json({ error: "Failed to add customer" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });

    const secureTenantId = (session.user as any).tenantId;
    const { action, customerId, pointsToDeduct } = await req.json();

    if (action === "REDEEM_POINTS") {
      // 🔒 IDOR Prevention
      const existingCustomer = await prisma.customer.findUnique({ where: { id: customerId } });
      if (!existingCustomer || existingCustomer.tenantId !== secureTenantId) {
        return NextResponse.json({ error: "Unauthorized modification blocked." }, { status: 403 });
      }

      // 🔥 Added Loyalty Transaction Logging via Prisma Transaction
      const result = await prisma.$transaction(async (tx) => {
        const customer = await tx.customer.update({
          where: { id: customerId },
          data: { loyaltyPoints: { decrement: parseInt(pointsToDeduct) } }
        });

        // Log Redemption in Passbook
        await tx.loyaltyTransaction.create({
          data: {
            customerId: customerId,
            type: "REDEEM",
            points: parseInt(pointsToDeduct),
            notes: "Manual Marketing Redemption via CRM"
          }
        });

        return customer;
      });

      return NextResponse.json({ success: true, customer: result });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
  }
}
