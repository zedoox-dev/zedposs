import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 🔒 STRICT ID FETCHING
  const secureOutletId = (session.user as any).outletId;
  const secureTenantId = (session.user as any).tenantId;

  if (!secureOutletId || !secureTenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 400 });

  try {
    // 🔥 Fetch outlet master data for read-only Display
    const outlet = await prisma.outlet.findUnique({
      where: { id: secureOutletId },
      include: { tenant: true } // Fetching Tenant Info as well for full profile
    });

    // Fetches Staff with their linked Role relation securely
    const staff = await prisma.user.findMany({
      where: { 
        tenantId: secureTenantId, 
        outletId: secureOutletId,
        isDeleted: false 
      },
      include: { role: true } 
    });

    const mappedStaff = staff.map(s => ({
      id: s.id,
      name: s.name,
      pin: s.pin,
      role: s.role?.name || "CASHIER"
    }));

    return NextResponse.json({
      success: true,
      outletMaster: {
         name: outlet?.name || "",
         address: outlet?.address || "",
         phone: outlet?.phone || "",
         currency: outlet?.currency || "₹",
         gstin: (outlet?.tenant as any)?.gstin || "N/A"
      },
      generalSettings: outlet?.generalSettings || null,
      printerSettings: outlet?.printerSettings || null,
      staffList: mappedStaff
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Fetch Error", details: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const secureOutletId = (session.user as any).outletId;
    const secureTenantId = (session.user as any).tenantId;

    const body = await req.json();
    const { action, payload } = body;

    // 🟢 1. SAVE GENERAL SETTINGS
    if (action === "SAVE_GENERAL") {
      await prisma.outlet.update({
        where: { id: secureOutletId },
        data: { generalSettings: payload }
      });
      return NextResponse.json({ success: true });
    }

    // 🟢 2. SAVE PRINTER CONFIGURATIONS
    if (action === "SAVE_PRINTER") {
      await prisma.outlet.update({
        where: { id: secureOutletId },
        data: { printerSettings: payload }
      });
      return NextResponse.json({ success: true });
    }

    // 🟢 3. ADD STAFF & ROLE MANAGEMENT
    if (action === "ADD_STAFF") {
      const dummyEmail = `staff_${Date.now()}@tenant${secureTenantId}.local`;
      
      // Smart Auto-Healer: Find or create the specified Role in the DB
      let dbRole = await prisma.role.findFirst({
        where: { tenantId: secureTenantId, name: payload.role }
      });

      if (!dbRole) {
        dbRole = await prisma.role.create({
          data: { tenantId: secureTenantId, name: payload.role }
        });
      }

      const newStaff = await prisma.user.create({
        data: {
          name: payload.name,
          email: dummyEmail,
          password: payload.pin, 
          pin: payload.pin,
          roleId: dbRole.id, // Strictly linked using relation
          tenantId: secureTenantId,
          outletId: secureOutletId
        }
      });
      
      return NextResponse.json({ 
        success: true, 
        staff: { id: newStaff.id, name: newStaff.name, role: payload.role, pin: newStaff.pin } 
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: "Save Error", details: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const secureTenantId = (session.user as any).tenantId;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser || existingUser.tenantId !== secureTenantId) {
      return NextResponse.json({ error: "Unauthorized deletion attempt" }, { status: 403 });
    }

    await prisma.user.update({
      where: { id: id },
      data: { isDeleted: true, isActive: false }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
