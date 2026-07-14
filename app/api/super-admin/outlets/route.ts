import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

// Helper: 7-Digit Numeric ID for Outlets
const generate7DigitId = () => {
  return Math.floor(1000000 + Math.random() * 9000000).toString();
};

export async function GET() {
  try {
    // Fetch initial data
    const rawOutlets = await prisma.outlet.findMany({
      where: { isDeleted: false },
      include: {
        tenant: {
          select: { id: true, businessName: true, ownerEmail: true, plan: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    const updatedOutlets = [];

    // AUTO-DEACTIVATION LOGIC (Instant 0 Days Left = False)
    for (const outlet of rawOutlets) {
      const createdDate = new Date(outlet.createdAt);
      const validTill = new Date(createdDate.getTime());
      validTill.setDate(validTill.getDate() + 30);
      
      // Agar time cross ho gaya hai aur outlet abhi bhi active hai
      if (now.getTime() > validTill.getTime() && outlet.isActive) {
        const updated = await prisma.outlet.update({
          where: { id: outlet.id },
          data: { isActive: false },
          include: {
            tenant: {
              select: { id: true, businessName: true, ownerEmail: true, plan: true },
            },
          }
        });
        updatedOutlets.push(updated);
      } else {
        updatedOutlets.push(outlet);
      }
    }

    const subscriptionPlans = await prisma.subscriptionPlan.findMany({
      where: { isDeleted: false, isActive: true },
      orderBy: { price: "asc" }
    });

    return NextResponse.json({ success: true, outlets: updatedOutlets, subscriptionPlans });
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

    if (!name || !address || !email || !password || !tenantId || !planId || !utrNumber) {
      return NextResponse.json(
        { success: false, error: "Name, Address, Email, Password, Plan, Brand and UTR are strictly required." },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const selectedPlan = await tx.subscriptionPlan.findFirst({
        where: { id: planId, isDeleted: false }
      });
      if (!selectedPlan) throw new Error("Subscription Plan is invalid.");

      const tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
        include: { _count: { select: { outlets: { where: { isDeleted: false } } } } }
      });
      if (!tenant) throw new Error("Brand ID not found.");
      if (tenant._count.outlets >= selectedPlan.maxOutlets) {
        throw new Error(`Limit reached! Plan allows max ${selectedPlan.maxOutlets} outlet(s).`);
      }

      await tx.paymentLog.create({
        data: {
          amount: selectedPlan.price,
          gateway: "UPI_QR",
          gatewayTxnId: utrNumber,
          status: "COMPLETED",
          planName: selectedPlan.name,
          tenantId: tenantId,
          paidAt: new Date(),
        }
      });

      await tx.tenant.update({
        where: { id: tenantId },
        data: { planId: selectedPlan.id }
      });

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
          isActive: true,
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

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, name, address, email, password, phone, gst, fssai, isActive } = body;

    if (!id) return NextResponse.json({ success: false, error: "Outlet ID is required" }, { status: 400 });

    const updatedOutlet = await prisma.outlet.update({
      where: { id },
      data: {
        name, address,
        email: email || null,
        password: password || null,
        isActive,
        phone: phone || null,
        gstin: gst || null,
        fssaiNo: fssai || null,
      }
    });

    return NextResponse.json({ success: true, outlet: updatedOutlet });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
