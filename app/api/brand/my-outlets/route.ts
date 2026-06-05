import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getServerSession } from "next-auth/next";

export async function GET() {
  try {
    // 1. Get Logged in User Session
    const session = await getServerSession();
    
    // For now, testing logic. Jab NextAuth proper connect ho jaye to `session.user.email` use karenge
    // Assuming we have the email of the Brand Owner from session:
    const userEmail = session?.user?.email;

    if (!userEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Find User and their Role/Tenant
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: { 
        role: true,
        accessibleOutlets: { include: { outlet: true } }
      }
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    let outlets: any[] = [];

    // 3. LOGIC: Is it the Brand Owner?
    // Agar user Super Admin / Brand Owner hai, toh us tenant ke SARE outlets de do
    if (user.role?.name === "Brand Owner" || user.role?.isSystem) {
      outlets = await prisma.outlet.findMany({
        where: { tenantId: user.tenantId, isDeleted: false },
        select: { id: true, name: true, regionId: true }
      });
    } 
    // Agar Area Manager ya normal staff hai, toh sirf Assigned Outlets de do
    else {
      outlets = user.accessibleOutlets.map(mapping => ({
        id: mapping.outlet.id,
        name: mapping.outlet.name,
        regionId: mapping.outlet.regionId
      }));
    }

    return NextResponse.json({ success: true, outlets });
  } catch (error: any) {
    console.error("Outlets Fetch Error:", error);
    return NextResponse.json({ error: "Failed to fetch outlets" }, { status: 500 });
  }
}
