import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

// 1. GET: Saare customers aur unki order history lana (Tenant Isolated)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get("tenantId");

  if (!tenantId) {
    return NextResponse.json({ error: "Tenant ID required for CRM access" }, { status: 400 });
  }

  try {
    const customers = await prisma.customer.findMany({
      where: { 
        tenantId: tenantId, 
        isDeleted: false 
      },
      include: {
        // Customer ke pichle saare VALID orders sath layega spend calculate karne ke liye
        orders: { 
          where: { isDeleted: false, status: { not: "CANCELLED" } } 
        } 
      },
      orderBy: { loyaltyPoints: 'desc' } // Jiske sabse zyada points, wo upar
    });

    // Automatically har customer ka total kharcha aur visits nikalna
    const formattedCustomers = customers.map(c => ({
      id: c.id,
      name: c.name || "Unknown",
      phone: c.phone,
      loyaltyPoints: c.loyaltyPoints,
      totalVisits: c.orders.length,
      totalSpend: c.orders.reduce((sum, order) => sum + order.totalAmount, 0)
    }));

    return NextResponse.json(formattedCustomers);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
  }
}

// 2. POST: Naya customer add karna
export async function POST(req: Request) {
  try {
    const { name, phone, tenantId } = await req.json();

    if (!tenantId) return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });

    // Check karein ki number is brand ke paas pehle se toh nahi hai
    const existing = await prisma.customer.findFirst({ 
      where: { phone: phone, tenantId: tenantId } 
    });
    
    if (existing) {
      return NextResponse.json({ error: "Ye phone number is brand mein pehle se registered hai!" }, { status: 400 });
    }

    const newCustomer = await prisma.customer.create({
      data: { 
        name, 
        phone,
        tenantId: tenantId, // 🔥 Locked to business owner 
        loyaltyPoints: 50 // Naya register karne par 50 Bonus Points! 🎉
      } 
    });

    return NextResponse.json({ success: true, customer: newCustomer });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to add customer" }, { status: 500 });
  }
}

// 3. PUT: Customer Points Redeem Karna (FRONTEND ME CALL THA, API ME MISSING THA)
export async function PUT(req: Request) {
  try {
    const { action, customerId, pointsToDeduct } = await req.json();

    if (action === "REDEEM_POINTS") {
      const customer = await prisma.customer.update({
        where: { id: customerId },
        data: { loyaltyPoints: { decrement: parseInt(pointsToDeduct) } }
      });
      return NextResponse.json({ success: true, customer });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
  }
}
