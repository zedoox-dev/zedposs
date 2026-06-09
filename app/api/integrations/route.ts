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

  if (!secureOutletId || !secureTenantId) return NextResponse.json({ error: "Unauthorized Context" }, { status: 400 });

  try {
    const outlet = await prisma.outlet.findUnique({
      where: { id: secureOutletId },
      select: { integrationSettings: true } 
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
