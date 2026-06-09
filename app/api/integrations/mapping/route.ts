import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function POST(req: Request) {
  try {
    // 🔒 STRICT SECURITY: GET SESSION TOKENS
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized access blocked." }, { status: 401 });
    }

    const secureOutletId = (session.user as any).outletId;

    if (!secureOutletId) {
      return NextResponse.json({ error: "Outlet ID missing." }, { status: 400 });
    }

    const body = await req.json();
    const { mappings, platformsSettings } = body;

    // 🔒 Direct DB update restricted purely to the logged-in Terminal's Outlet ID
    await prisma.outlet.update({
      where: { id: secureOutletId },
      data: {
        integrationSettings: {
          platforms: platformsSettings,
          mappings: mappings
        }
      }
    });

    return NextResponse.json({ success: true, message: "Configuration mapped securely." });
  } catch (error: any) {
    console.error("Integration Mapping Sync Error:", error);
    return NextResponse.json({ error: "Mapping sync failed", details: error.message }, { status: 500 });
  }
}
