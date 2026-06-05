import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

// HELPER: Flexible settings storage format
// Note: If you don't have a specific table for this in Prisma yet, 
// we generally use a Tenant Settings JSON column. For this code, I am assuming 
// you can attach an `integrationSettings` JSON field to the `Tenant` or `Outlet` model.
// For now, I'll structure this safely.

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const outletId = searchParams.get("outletId");
  const tenantId = searchParams.get("tenantId"); // 🔒 SaaS Lock

  if (!outletId || !tenantId) return NextResponse.json({ error: "Outlet and Tenant ID required" }, { status: 400 });

  try {
    // Attempt to fetch settings from Outlet (Assuming an integrationSettings JSON field exists)
    // If you don't have this field yet, you can run: `npx prisma db push` after adding it to schema.
    const outlet = await prisma.outlet.findUnique({
      where: { id: outletId },
      select: { integrationSettings: true } // Need to ensure this exists in schema
    });

    const settings = (outlet?.integrationSettings as any) || {
      platforms: null,
      mappings: {}
    };

    return NextResponse.json({
      success: true,
      platforms: settings.platforms,
      mappings: settings.mappings
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Fetch Error", details: error.message }, { status: 500 });
  }
}
