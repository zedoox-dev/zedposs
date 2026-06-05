import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getServerSession } from "next-auth/next";

export const dynamic = "force-dynamic";

// GET ALL REGIONS AND OUTLETS
export async function GET() {
  try {
    const session = await getServerSession();
    const userEmail = session?.user?.email;

    if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { tenantId: true }
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Fetch Regions with their assigned outlets
    const regions = await prisma.region.findMany({
      where: { tenantId: user.tenantId, isDeleted: false },
      include: {
        outlets: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Fetch Outlets that are NOT assigned to any region yet (Standalone)
    const unassignedOutlets = await prisma.outlet.findMany({
      where: { tenantId: user.tenantId, regionId: null, isDeleted: false },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, regions, unassignedOutlets });
  } catch (error: any) {
    console.error("Outlets Fetch Error:", error);
    return NextResponse.json({ error: "Failed to load network data" }, { status: 500 });
  }
}

// CREATE REGION OR OUTLET
export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    const userEmail = session?.user?.email;

    if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { tenantId: true }
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const { actionType } = body; // "CREATE_REGION" or "CREATE_OUTLET"

    if (actionType === "CREATE_REGION") {
      const { name } = body;
      const newRegion = await prisma.region.create({
        data: { name, tenantId: user.tenantId }
      });
      return NextResponse.json({ success: true, region: newRegion });
    } 
    
    else if (actionType === "CREATE_OUTLET") {
      const { name, address, regionId, email, password } = body;
      const newOutlet = await prisma.outlet.create({
        data: {
          name,
          address,
          email,
          password,
          regionId: regionId === "NONE" ? null : regionId,
          tenantId: user.tenantId
        }
      });
      return NextResponse.json({ success: true, outlet: newOutlet });
    }

    return NextResponse.json({ error: "Invalid action type" }, { status: 400 });

  } catch (error: any) {
    console.error("Creation Error:", error);
    return NextResponse.json({ error: "Failed to save data" }, { status: 500 });
  }
}
