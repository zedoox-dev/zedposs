import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const regions = await prisma.region.findMany({
      where: { tenantId: user.tenantId, isDeleted: false },
      include: { outlets: { where: { isDeleted: false } } }
    });

    const unassignedOutlets = await prisma.outlet.findMany({
      where: { tenantId: user.tenantId, regionId: null, isDeleted: false }
    });

    return NextResponse.json({ success: true, regions, unassignedOutlets });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load network" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { actionType } = body;

    const user = await prisma.user.findUnique({ where: { email: session?.user?.email! } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (actionType === "CREATE_OUTLET") {
      const { name, address, email, password, regionId, utrNumber, planId } = body;

      // 🟢 Production SaaS Rule: Default isActive = FALSE
      const newOutlet = await prisma.outlet.create({
        data: {
          name, address, email, password,
          regionId: regionId === "NONE" ? null : regionId,
          tenantId: user.tenantId,
          isActive: false 
        }
      });

      // Log the payment/transaction for Super Admin review
      await prisma.paymentLog.create({
        data: {
          tenantId: user.tenantId,
          amount: 0, // Should be fetched from plan price
          status: "PENDING_VERIFICATION",
          planName: `New Outlet: ${name} | UTR: ${utrNumber}`
        }
      });

      return NextResponse.json({ success: true, outlet: newOutlet });
    }

    if (actionType === "CREATE_REGION") {
      const newRegion = await prisma.region.create({
        data: { name: body.name, tenantId: user.tenantId }
      });
      return NextResponse.json({ success: true, region: newRegion });
    }

    return NextResponse.json({ error: "Invalid Action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Deployment Failed" }, { status: 500 });
  }
}
