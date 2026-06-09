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
    const outlet = await prisma.outlet.findUnique({
      where: { id: secureOutletId }
    });

    const staff = await prisma.user.findMany({
      where: { 
        tenantId: secureTenantId, 
        outletId: secureOutletId,
        isDeleted: false 
      },
      select: { id: true, name: true, role: true, pin: true } 
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
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const secureOutletId = (session.user as any).outletId;
    const secureTenantId = (session.user as any).tenantId;

    const body = await req.json();
    const { action, payload } = body;

    if (action === "SAVE_GENERAL") {
      await prisma.outlet.update({
        where: { id: secureOutletId },
        data: { generalSettings: payload }
      });
      return NextResponse.json({ success: true });
    }

    if (action === "SAVE_PRINTER") {
      await prisma.outlet.update({
        where: { id: secureOutletId },
        data: { printerSettings: payload }
      });
      return NextResponse.json({ success: true });
    }

    if (action === "ADD_STAFF") {
      const dummyEmail = `staff_${Date.now()}@tenant${secureTenantId}.local`;
      
      const newStaff = await prisma.user.create({
        data: {
          name: payload.name,
          email: dummyEmail,
          password: payload.pin, 
          pin: payload.pin,
          role: payload.role,
          tenantId: secureTenantId,
          outletId: secureOutletId
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
      data: { isDeleted: true }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
