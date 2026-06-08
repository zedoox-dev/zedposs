import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

// Helper: 7-Digit Numeric ID for Outlets
const generate7DigitId = () => {
  return Math.floor(1000000 + Math.random() * 9000000).toString();
};

export async function GET() {
  try {
    // 1. Fetch All Outlets with complete Tenant and Plan relations
    const outlets = await prisma.outlet.findMany({
      where: { isDeleted: false },
      include: {
        tenant: {
          select: {
            id: true,
            businessName: true,
            ownerEmail: true,
            plan: true,
            users: {
              where: { role: { name: "Brand Owner" } },
              select: { name: true, email: true },
              take: 1
            }
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // 2. Fetch Active Subscription Plans to feed the frontend form dropdown
    const subscriptionPlans = await prisma.subscriptionPlan.findMany({
      where: { isDeleted: false, isActive: true },
      orderBy: { price: "asc" }
    });

    return NextResponse.json({ success: true, outlets, subscriptionPlans });
  } catch (error) {
    console.error("Error fetching outlets data:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch outlets and plans stack" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, address, email, password, phone, gst, fssai, tenantId, planId } = body;

    // Strict fields validation including the plan verification
    if (!name || !address || !tenantId || !planId) {
      return NextResponse.json(
        { success: false, error: "Name, address, Tenant ID, and Subscription Plan are strictly required." },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Verify the selected subscription plan exists in DB
      const selectedPlan = await tx.subscriptionPlan.findFirst({
        where: { id: planId, isDeleted: false }
      });

      if (!selectedPlan) {
        throw new Error("The selected Subscription Plan is invalid or inactive.");
      }

      // 2. Fetch tenant workspace
      const tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
        include: {
          _count: { select: { outlets: { where: { isDeleted: false } } } }
        }
      });

      if (!tenant) {
        throw new Error("Brand/Tenant ID not found in database registry.");
      }

      // 3. Enforce plan limit checks before provisioning the outlet
      if (tenant._count.outlets >= selectedPlan.maxOutlets) {
        throw new Error(`Subscription Allocation Failed! The ${selectedPlan.name} plan restricts allocation to a maximum of ${selectedPlan.maxOutlets} outlet(s).`);
      }

      // 4. Update the Tenant structure to anchor this current active Plan
      await tx.tenant.update({
        where: { id: tenantId },
        data: { planId: selectedPlan.id }
      });

      // 5. Generate unique 7-Digit Numeric ID
      let newOutletId = generate7DigitId();
      let existing = await tx.outlet.findUnique({ where: { id: newOutletId } });
      while (existing) {
        newOutletId = generate7DigitId();
        existing = await tx.outlet.findUnique({ where: { id: newOutletId } });
      }

      // 6. Create the physical store instance with attached settings payload
      const newOutlet = await tx.outlet.create({
        data: {
          id: newOutletId,
          name,
          address,
          email: email || null,
          password: password || null,
          generalSettings: { phone, gstNumber: gst, fssaiNumber: fssai },
          tenantId,
          isActive: true,
          isDeleted: false,
        },
      });

      return newOutlet;
    });

    return NextResponse.json({ success: true, outlet: result });
  } catch (error: any) {
    console.error("Error creating subscription bound outlet:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process core outlet onboarding" },
      { status: 400 }
    );
  }
}
