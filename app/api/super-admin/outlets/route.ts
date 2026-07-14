import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

// Helper: 7-Digit Numeric ID for Outlets
const generate7DigitId = () => {
  return Math.floor(1000000 + Math.random() * 9000000).toString();
};

export async function GET() {
  try {
    const outlets = await prisma.outlet.findMany({
      where: { isDeleted: false },
      include: {
        tenant: {
          select: { id: true, businessName: true, ownerEmail: true, plan: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const subscriptionPlans = await prisma.subscriptionPlan.findMany({
      where: { isDeleted: false, isActive: true },
      orderBy: { price: "asc" }
    });

    return NextResponse.json({ success: true, outlets, subscriptionPlans });
  } catch (error) {
    console.error("Error fetching outlets data:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch outlets stack" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      name, code, address, city, state, pincode, email, phone, password, 
      gstin, fssaiNo, licenseNo, openTime, closeTime, tenantId, planId, utrNumber 
    } = body;

    // Strict validation
    if (!name || !address || !tenantId || !planId || !utrNumber) {
      return NextResponse.json(
        { success: false, error: "Name, Address, Plan, Tenant ID and UTR are strictly required." },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Validate Plan
      const selectedPlan = await tx.subscriptionPlan.findFirst({
        where: { id: planId, isDeleted: false }
      });
      if (!selectedPlan) throw new Error("Subscription Plan is invalid.");

      // 2. Validate Tenant & Limits
      const tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
        include: { _count: { select: { outlets: { where: { isDeleted: false } } } } }
      });
      if (!tenant) throw new Error("Brand ID not found.");
      if (tenant._count.outlets >= selectedPlan.maxOutlets) {
        throw new Error(`Limit reached! Plan allows max ${selectedPlan.maxOutlets} outlet(s).`);
      }

      // 3. Create SaaS Payment Log (Capturing UTR)
      await tx.paymentLog.create({
        data: {
          amount: selectedPlan.price,
          gateway: "UPI_QR",
          gatewayTxnId: utrNumber, // User's UTR string saved here
          status: "COMPLETED",
          planName: selectedPlan.name,
          tenantId: tenantId,
          paidAt: new Date(),
        }
      });

      // 4. Update Tenant Plan Linkage
      await tx.tenant.update({
        where: { id: tenantId },
        data: { planId: selectedPlan.id }
      });

      // 5. Generate unique ID & Provision Outlet with Full Column Mapping
      let newOutletId = generate7DigitId();
      let existing = await tx.outlet.findUnique({ where: { id: newOutletId } });
      while (existing) {
        newOutletId = generate7DigitId();
        existing = await tx.outlet.findUnique({ where: { id: newOutletId } });
      }

      const newOutlet = await tx.outlet.create({
        data: {
          id: newOutletId,
          name, code, address, city, state, pincode, phone, email, password,
          gstin, fssaiNo, licenseNo, openTime, closeTime,
          tenantId,
          isActive: true, // Will default to True on payment
          isDeleted: false,
        },
      });

      return newOutlet;
    });

    return NextResponse.json({ success: true, outlet: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
