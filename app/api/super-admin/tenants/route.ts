import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

// Helper Function: Generate 5-Digit Unique String ID
const generate5DigitId = () => {
  return Math.floor(10000 + Math.random() * 90000).toString();
};

// GET ALL BRANDS (TENANTS) & THEIR OUTLETS
export async function GET() {
  try {
    const tenants = await prisma.tenant.findMany({
      include: {
        outlets: true, // Fetching outlets to show validity & plans
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

// ONBOARD A NEW BRAND (TENANT ONLY, NO SUBSCRIPTION YET)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { brandName, ownerName, ownerEmail, ownerPassword } = body;

    if (!brandName || !ownerEmail || !ownerPassword) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      
      // 1. Generate a Unique 5-Digit ID for the Tenant
      let tenantId = generate5DigitId();
      let existingTenant = await tx.tenant.findUnique({ where: { id: tenantId } });
      while (existingTenant) {
        tenantId = generate5DigitId();
        existingTenant = await tx.tenant.findUnique({ where: { id: tenantId } });
      }

      // 2. Create the Tenant (Brand) - Only ID, Name, Email (Subscription will be handled per Outlet later)
      const newTenant = await tx.tenant.create({
        data: { 
          id: tenantId,
          businessName: brandName,
          ownerEmail: ownerEmail
        } 
      });

      // 3. Create the default "Brand Owner" Role for this Tenant
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

      // 4. Create the Owner Login Account
      const newOwner = await tx.user.create({
        data: {
          name: ownerName,
          email: ownerEmail,
          password: ownerPassword, 
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
