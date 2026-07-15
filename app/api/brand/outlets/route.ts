import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;

    if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { tenantId: true }
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // 🟢 SMART LOGIC: Auto-Disable Outlets if 30 days validity is over
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    await prisma.outlet.updateMany({
      where: { 
        tenantId: user.tenantId, 
        createdAt: { lt: thirtyDaysAgo }, 
        isActive: true // Only update if currently active
      },
      data: { isActive: false }
    });

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

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;

    if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { tenantId: true }
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const { actionType } = body;

    if (actionType === "CREATE_REGION") {
      const { name } = body;
      const newRegion = await prisma.region.create({
        data: { name, tenantId: user.tenantId }
      });
      return NextResponse.json({ success: true, region: newRegion });
    } 
    
    else if (actionType === "CREATE_OUTLET") {
      const { 
        name, address, city, state, pincode, email, phone, password, 
        gstin, fssaiNo, licenseNo, openTime, closeTime, regionId, utrNumber 
      } = body;

      // 🟢 Generate 7-Digit System Outlet ID
      const generatedCode = Math.floor(1000000 + Math.random() * 9000000).toString();

      // Use Transaction to save Outlet and Payment Log together
      const result = await prisma.$transaction(async (tx) => {
        // 1. Create Outlet (STRICTLY INACTIVE BY DEFAULT)
        const newOutlet = await tx.outlet.create({
          data: {
            name, code: generatedCode, address, city, state, pincode, 
            phone, email, password, gstin, fssaiNo, licenseNo, 
            openTime, closeTime, 
            isActive: false, // 🔴 STRICT: Wait for Super Admin to turn true
            regionId: regionId === "NONE" ? null : regionId,
            tenantId: user.tenantId
          }
        });

        // 2. Log the UTR Payment Entry for Verification
        await tx.paymentLog.create({
          data: {
            amount: 0, // SaaS billing amount mapped by Admin later
            gateway: "MANUAL_UPI",
            gatewayTxnId: utrNumber,
            status: "PENDING_VERIFICATION",
            tenantId: user.tenantId
          }
        });

        return newOutlet;
      });

      return NextResponse.json({ success: true, outlet: result });
    }

    return NextResponse.json({ error: "Invalid action type" }, { status: 400 });

  } catch (error: any) {
    console.error("Creation Error:", error);
    return NextResponse.json({ error: "Failed to save data to database" }, { status: 500 });
  }
}
