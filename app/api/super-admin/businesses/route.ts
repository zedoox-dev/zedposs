import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

// GET ALL BUSINESSES (TENANTS)
export async function GET() {
  try {
    const businesses = await prisma.tenant.findMany({
      where: { isDeleted: false },
      include: {
        outlets: {
          where: { isDeleted: false }
        },
        users: {
          where: { role: "SUPER_ADMIN", isDeleted: false }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json({ success: true, businesses });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch businesses" }, { status: 500 });
  }
}

// REGISTER NEW BUSINESS (TENANT + OUTLET + USER)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { businessName, ownerName, ownerEmail, password, phone } = body;

    if (!businessName || !ownerEmail || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Check if email is already registered in the entire SaaS
    const existingUser = await prisma.user.findUnique({
      where: { email: ownerEmail }
    });

    if (existingUser) {
      return NextResponse.json({ error: "This email is already registered with another account." }, { status: 400 });
    }

    // 2. Prisma Transaction: Sab kuch ek sath create hoga. 
    const result = await prisma.$transaction(async (tx) => {
      
      // Step A: Create Tenant (Brand)
      const tenant = await tx.tenant.create({
        data: {
          businessName: businessName,
          ownerEmail: ownerEmail,
          isActive: true,
        }
      });

      // Step B: Create Default Outlet (7-DIGIT NUMERIC ID AS REQUESTED)
      const sevenDigitId = Math.floor(1000000 + Math.random() * 9000000).toString();
      
      const outlet = await tx.outlet.create({
        data: {
          id: sevenDigitId, // <-- Fixed to 7 Digit Numeric String
          name: `${businessName} - Main Branch`,
          address: "Address not updated",
          tenantId: tenant.id,
          isActive: true,
        }
      });

      // Step C: Create the Owner User Account (SUPER_ADMIN)
      const user = await tx.user.create({
        data: {
          name: ownerName,
          email: ownerEmail,
          password: password,
          pin: "1234",
          role: "SUPER_ADMIN",
          tenantId: tenant.id,
          outletId: outlet.id,
        }
      });

      return { tenant, outlet, user };
    });

    return NextResponse.json({ success: true, business: result.tenant });
  } catch (error: any) {
    console.error("Business Creation Error:", error);
    return NextResponse.json({ error: "Database transaction failed", details: error.message }, { status: 500 });
  }
}

// TOGGLE BUSINESS STATUS (ACTIVE / SUSPENDED)
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, isActive } = body;

    const updatedTenant = await prisma.tenant.update({
      where: { id: id },
      data: { isActive: isActive }
    });

    return NextResponse.json({ success: true, business: updatedTenant });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update business status" }, { status: 500 });
  }
}
