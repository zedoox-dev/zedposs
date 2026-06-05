import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

// Fetch all tenants with their White Label configs
export async function GET() {
  try {
    const tenants = await prisma.tenant.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        businessName: true,
        ownerEmail: true,
        isActive: true,
        whiteLabelConfig: true // Automatically join the 1-to-1 relation
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json({ success: true, tenants });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch white label configurations", details: error.message }, { status: 500 });
  }
}

// Upsert (Create or Update) White Label Config for a Tenant
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tenantId, customDomain, logoUrl, themeColor, appName } = body;

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID is required" }, { status: 400 });
    }

    // Prisma Upsert: Agar config pehle se hai toh Update karo, nahi toh Create karo
    const config = await prisma.whiteLabel.upsert({
      where: { tenantId: tenantId },
      update: {
        customDomain: customDomain || null,
        logoUrl: logoUrl || null,
        themeColor: themeColor || "#000000",
        appName: appName || null,
      },
      create: {
        tenantId: tenantId,
        customDomain: customDomain || null,
        logoUrl: logoUrl || null,
        themeColor: themeColor || "#000000",
        appName: appName || null,
      }
    });

    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    // Handling Unique Constraint error if someone tries to use a domain already in use
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "This Custom Domain is already registered to another brand." }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to save configuration", details: error.message }, { status: 500 });
  }
}
