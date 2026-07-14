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
      include: { tenant: { include: { plan: true } } }
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // 🟢 Auto-Expiry Check: If 30 days passed, force isActive to FALSE
    const allOutlets = await prisma.outlet.findMany({
      where: { tenantId: user.tenantId, isDeleted: false }
    });

    const today = new Date();
    for (const outlet of allOutlets) {
      const validTill = new Date(outlet.createdAt);
      validTill.setDate(validTill.getDate() + 30); // Assuming 30 days SaaS cycle
      
      if (today > validTill && outlet.isActive) {
        await prisma.outlet.update({
          where: { id: outlet.id },
          data: { isActive: false }
        });
      }
    }

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

    // Fetch Outlets that are NOT assigned to any region yet
    const unassignedOutlets = await prisma.outlet.findMany({
      where: { tenantId: user.tenantId, regionId: null, isDeleted: false },
      orderBy: { createdAt: 'desc' }
    });

    // Fetch ALL outlets for the detailed table list
    const allOutletsData = await prisma.outlet.findMany({
      where: { tenantId: user.tenantId, isDeleted: false },
      include: { region: true },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ 
      success: true, 
      regions, 
      unassignedOutlets, 
      allOutlets: allOutletsData,
      tenantPlan: user.tenant?.plan 
    });
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
        data: { name: name.toUpperCase(), tenantId: user.tenantId }
      });
      return NextResponse.json({ success: true, region: newRegion });
    } 
    
    else if (actionType === "CREATE_OUTLET") {
      const { 
        name, address, city, state, pincode, email, phone, password, 
        gstin, fssaiNo, licenseNo, openTime, closeTime, regionId, utrNumber 
      } = body;

      // 🟢 Generate 7-Digit System ID
      const generatedCode = Math.floor(1000000 + Math.random() * 9000000).toString();

      // Ensure creation is wrapped in a transaction to log the UTR
      const newOutlet = await prisma.$transaction(async (tx) => {
        const outlet = await tx.outlet.create({
          data: {
            name: name.toUpperCase(),
            code: generatedCode,
            address, city, state, pincode, email, phone, password,
            gstin: gstin?.toUpperCase() || null,
            fssaiNo: fssaiNo?.toUpperCase() || null,
            licenseNo: licenseNo?.toUpperCase() || null,
            openTime, closeTime,
            isActive: false, // 🔴 STRICTLY FALSE UNTIL ADMIN APPROVES
            regionId: regionId === "NONE" ? null : regionId,
            tenantId: user.tenantId
          }
        });

        // Save UTR Number in Audit Logs for Admin verification
        await tx.auditLog.create({
          data: {
            action: "OUTLET_PROVISION_FEE",
            module: "OUTLETS",
            description: `Payment UTR: ${utrNumber} submitted for Outlet ${outlet.code} (${outlet.name}). Pending Admin Verification.`,
            tenantId: user.tenantId
          }
        });

        return outlet;
      });

      return NextResponse.json({ success: true, outlet: newOutlet });
    }

    return NextResponse.json({ error: "Invalid action type" }, { status: 400 });

  } catch (error: any) {
    console.error("Creation Error:", error);
    return NextResponse.json({ error: "Failed to save data. Please check fields." }, { status: 500 });
  }
}
