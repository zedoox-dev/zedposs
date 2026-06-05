import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const outletId = searchParams.get("outletId");
  const tenantId = searchParams.get("tenantId");

  if (!outletId || !tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 400 });

  try {
    // 1. Fetch Outlet Settings
    const outlet = await prisma.outlet.findUnique({
      where: { id: outletId }
    });

    // 2. Fetch Staff (Users) connected to this Tenant/Outlet
    const staff = await prisma.user.findMany({
      where: { 
        tenantId: tenantId, 
        isDeleted: false 
      },
      select: { id: true, name: true, role: true, pin: true } // Exclude password for security
    });

    return NextResponse.json({
      success: true,
      generalSettings: outlet?.generalSettings || null,
      printerSettings: outlet?.printerSettings || null,
      staffList: staff
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Fetch Error", details: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, outletId, tenantId, payload } = body;

    if (!outletId || !tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    if (action === "SAVE_GENERAL") {
      await prisma.outlet.update({
        where: { id: outletId },
        data: { generalSettings: payload }
      });
      return NextResponse.json({ success: true });
    }

    if (action === "SAVE_PRINTER") {
      await prisma.outlet.update({
        where: { id: outletId },
        data: { printerSettings: payload }
      });
      return NextResponse.json({ success: true });
    }

    // 🔒 Add Staff securely to User Table
    if (action === "ADD_STAFF") {
      // Auto-generate a dummy unique email for POS-only staff to satisfy DB schema
      const dummyEmail = `staff_${Date.now()}@tenant${tenantId}.local`;
      
      const newStaff = await prisma.user.create({
        data: {
          name: payload.name,
          email: dummyEmail,
          password: payload.pin, // In production, bcrypt hash this
          pin: payload.pin,
          role: payload.role,
          tenantId: tenantId,
          outletId: outletId
        }
      });
      return NextResponse.json({ success: true, staff: { id: newStaff.id, name: newStaff.name, role: newStaff.role, pin: newStaff.pin } });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: "Save Error", details: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    // Soft Delete to maintain historical references
    await prisma.user.update({
      where: { id: id },
      data: { isDeleted: true }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
