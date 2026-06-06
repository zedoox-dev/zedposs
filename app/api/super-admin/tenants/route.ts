import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
// Note: In real app, check session to ensure user is SUPER_ADMIN

export const dynamic = "force-dynamic";

// GET ALL BRANDS (TENANTS) ON THE SAAS
export async function GET() {
  try {
    const tenants = await prisma.tenant.findMany({
      include: {
        _count: {
          select: { outlets: true, users: true }
        },
        users: {
          where: { role: { name: "Brand Owner" } },
          select: { name: true, email: true },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, tenants });
  } catch (error: any) {
    console.error("Super Admin Fetch Error:", error);
    return NextResponse.json({ error: "Failed to load SaaS brands" }, { status: 500 });
  }
}

// ONBOARD A NEW BRAND & CREATE ITS OWNER
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { brandName, ownerName, ownerEmail, ownerPassword, subscriptionPlan } = body;

    if (!brandName || !ownerEmail || !ownerPassword) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Prisma Transaction to setup the entire Brand Workspace safely
    const result = await prisma.$transaction(async (tx) => {
      
      // 1. Create the Tenant (Brand)
      const newTenant = await tx.tenant.create({
        data: { name: brandName } // You can add plan details to Tenant schema later
      });

      // 2. Create the default "Brand Owner" Role for this specific Tenant
      const ownerRole = await tx.role.create({
        data: {
          name: "Brand Owner",
          description: "Full administrative access to the brand.",
          isSystem: true,
          permissions: {
            Sales: { view: true, export: true },
            Inventory: { view: true, add: true, edit: true, approve: true },
            Menu: { view: true, edit: true },
            Staff: { view: true, add: true, edit: true },
            Reports: { view: true, export: true }
          },
          tenantId: newTenant.id
        }
      });

      // 3. Create the Owner User Account
      const newOwner = await tx.user.create({
        data: {
          name: ownerName,
          email: ownerEmail,
          password: ownerPassword, // In production, hash this using bcrypt!
          roleId: ownerRole.id,
          tenantId: newTenant.id
        }
      });

      return { tenant: newTenant, owner: newOwner };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Tenant Creation Error:", error);
    return NextResponse.json({ error: "Failed to onboard new brand. Email might be in use." }, { status: 500 });
  }
}
