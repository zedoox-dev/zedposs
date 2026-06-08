import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

// Helper: 7-Digit Numeric ID
const generate7DigitId = () => {
  return Math.floor(1000000 + Math.random() * 9000000).toString();
};

export async function GET() {
  try {
    const outlets = await prisma.outlet.findMany({
      where: {
        isDeleted: false,
      },
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
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ success: true, outlets });
  } catch (error) {
    console.error("Error fetching outlets:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch outlets" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, address, email, password, phone, gst, fssai, tenantId } = body;

    if (!name || !address || !tenantId) {
      return NextResponse.json(
        { success: false, error: "Name, address, and Tenant ID are required." },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Check Tenant Limits
      const tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
        include: {
          plan: true,
          _count: { select: { outlets: { where: { isDeleted: false } } } }
        }
      });

      if (!tenant) {
        throw new Error("Brand/Tenant ID not found.");
      }

      if (tenant.plan && tenant._count.outlets >= tenant.plan.maxOutlets) {
        throw new Error(`Subscription Limit Reached! The ${tenant.plan.name} plan only allows ${tenant.plan.maxOutlets} outlet(s).`);
      }

      // 2. Generate 7-Digit ID
      let newOutletId = generate7DigitId();
      let existing = await tx.outlet.findUnique({ where: { id: newOutletId } });
      while (existing) {
        newOutletId = generate7DigitId();
        existing = await tx.outlet.findUnique({ where: { id: newOutletId } });
      }

      // 3. Create Outlet with JSON Settings
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
    console.error("Error creating outlet:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create outlet" },
      { status: 400 }
    );
  }
}

// NEW: UPDATE OUTLET DETAILS
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, name, address, email, password, phone, gst, fssai, isActive } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Outlet ID is required." }, { status: 400 });
    }

    // Fetch existing settings to merge them
    const existingOutlet = await prisma.outlet.findUnique({ where: { id } });
    if (!existingOutlet) return NextResponse.json({ success: false, error: "Outlet not found" }, { status: 404 });

    const currentSettings = (existingOutlet.generalSettings as any) || {};

    const updatedOutlet = await prisma.outlet.update({
      where: { id },
      data: {
        name,
        address,
        email: email || null,
        password: password || null,
        isActive: isActive,
        generalSettings: {
          ...currentSettings,
          phone: phone || currentSettings.phone,
          gstNumber: gst || currentSettings.gstNumber,
          fssaiNumber: fssai || currentSettings.fssaiNumber
        }
      }
    });

    return NextResponse.json({ success: true, outlet: updatedOutlet });
  } catch (error: any) {
    console.error("Error updating outlet:", error);
    return NextResponse.json({ success: false, error: "Failed to update outlet" }, { status: 500 });
  }
}
