import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

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
            plan: true // Fetching the subscription plan attached to the tenant
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
    const { name, address, email, tenantId } = body;

    if (!name || !address || !tenantId) {
      return NextResponse.json(
        { success: false, error: "Name, address, and Tenant ID are required." },
        { status: 400 }
      );
    }

    // ==========================================
    // SAAS SUBSCRIPTION LIMIT ENFORCEMENT
    // ==========================================
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        plan: true,
        _count: { select: { outlets: { where: { isDeleted: false } } } }
      }
    });

    if (!tenant) {
      return NextResponse.json({ success: false, error: "Brand/Tenant not found." }, { status: 404 });
    }

    // Check if tenant has an active plan and if outlet limit is reached
    if (tenant.plan) {
      if (tenant._count.outlets >= tenant.plan.maxOutlets) {
        return NextResponse.json(
          { success: false, error: `Subscription Limit Reached! The ${tenant.plan.name} plan only allows ${tenant.plan.maxOutlets} outlet(s). Please upgrade the subscription.` },
          { status: 403 }
        );
      }
    }

    // If limit is not reached, create the outlet
    const newOutlet = await prisma.outlet.create({
      data: {
        name,
        address,
        email: email || null,
        tenantId,
        isActive: true,
        isDeleted: false,
      },
    });

    return NextResponse.json({ success: true, outlet: newOutlet });
  } catch (error) {
    console.error("Error creating outlet:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create outlet" },
      { status: 500 }
    );
  }
}
