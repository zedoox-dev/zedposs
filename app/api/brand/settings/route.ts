import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getServerSession } from "next-auth/next";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId");

    if (!outletId || outletId === "ALL") {
      return NextResponse.json({ error: "Please select a specific outlet" }, { status: 400 });
    }

    const session = await getServerSession();
    const userEmail = session?.user?.email;
    if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const outlet = await prisma.outlet.findFirst({
      where: { id: outletId, tenantId: user.tenantId, isDeleted: false },
    });

    if (!outlet) return NextResponse.json({ error: "Outlet not found" }, { status: 404 });

    return NextResponse.json({ success: true, outlet });
  } catch (error: any) {
    console.error("Settings Fetch Error:", error);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession();
    const userEmail = session?.user?.email;
    if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const { outletId, name, address, email, password, generalSettings, printerSettings } = body;

    if (!outletId || outletId === "ALL") {
      return NextResponse.json({ error: "Invalid outlet selection" }, { status: 400 });
    }

    const updatedOutlet = await prisma.outlet.update({
      where: { id: outletId },
      data: {
        name,
        address,
        email,
        password,
        generalSettings: generalSettings || {},
        printerSettings: printerSettings || {}
      }
    });

    return NextResponse.json({ success: true, outlet: updatedOutlet });
  } catch (error: any) {
    console.error("Settings Update Error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
