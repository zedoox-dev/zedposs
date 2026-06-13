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
      where: { isDeleted: false }, // Fixed: Sirf active non-deleted tenants layega
      include: {
        outlets: {
          where: { isDeleted: false } // Fixed: Sirf active outlets layega
        }, 
        _count: {
          select: { outlets: { where: { isDeleted: false } }, users: true }
        },
        users: {
          where: { role: { name: "Brand Owner" }, isDeleted: false },
          select: { id: true, name: true, email: true, password: true }, 
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

      // 2. Create the Tenant (Brand)
      const newTenant = await tx.tenant.create({
        data: { 
          id: tenantId,
          businessName: brandName,
          ownerName: ownerName, // Fixed: Added ownerName to DB
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

// UPDATE OWNER CREDENTIALS (EMAIL / PASSWORD)
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { tenantId, userId, newEmail, newPassword } = body;

    if (!tenantId || !userId || !newEmail || !newPassword) {
      return NextResponse.json({ error: "Missing data for update" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // Update Tenant Level Email
      await tx.tenant.update({
        where: { id: tenantId },
        data: { ownerEmail: newEmail }
      });

      // Update Actual User (Brand Owner) Credentials
      await tx.user.update({
        where: { id: userId },
        data: { email: newEmail, password: newPassword }
      });
    });

    return NextResponse.json({ success: true, message: "Credentials updated successfully" });
  } catch (error: any) {
    console.error("Update Credentials Error:", error);
    return NextResponse.json({ error: "Failed to update credentials. Email might exist." }, { status: 500 });
  }
}
