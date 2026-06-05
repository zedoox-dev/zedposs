import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { outletId, tenantId, mappings, platformsSettings } = body;

    if (!outletId || !tenantId) return NextResponse.json({ error: "Access Denied" }, { status: 403 });

    const payload = {
      platforms: platformsSettings,
      mappings: mappings
    };

    // Save mapping directly to the Outlet table's JSON column
    await prisma.outlet.update({
      where: { id: outletId },
      data: { integrationSettings: payload }
    });

    return NextResponse.json({ success: true, message: "Matrix synced successfully." });
  } catch (error: any) {
    console.error("Mapping Save Error:", error);
    return NextResponse.json({ error: "Failed to save mapping matrix" }, { status: 500 });
  }
}
