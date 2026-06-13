import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 🔒 STRICT ID FETCHING
  const secureOutletId = (session.user as any).outletId;
  if (!secureOutletId) return NextResponse.json({ error: "Unauthorized Context" }, { status: 400 });

  try {
    const configs = await prisma.aggregatorConfig.findMany({ where: { outletId: secureOutletId } });
    const maps = await prisma.aggregatorMenuMap.findMany({ where: { outletId: secureOutletId } });
    const logs = await prisma.aggregatorWebhookLog.findMany({ 
        where: { outletId: secureOutletId },
        orderBy: { receivedAt: 'desc' },
        take: 50
    });

    // Format configs into platforms object
    const platformsData: any = {};
    configs.forEach(c => {
        platformsData[c.platform] = {
            isStoreOnline: c.isActive,
            autoAccept: c.autoAccept,
            apiKey: c.apiKey || "API_NOT_SET"
        };
    });

    // Format mappings
    const mappingsData: any = {};
    maps.forEach(m => {
        if (!mappingsData[m.menuItemId]) mappingsData[m.menuItemId] = {};
        
        // Extracting price from the JSON string stored in platformItemName
        let storedPrice = 0;
        try { storedPrice = m.platformItemName ? JSON.parse(m.platformItemName).price : 0; } catch (e) {}

        mappingsData[m.menuItemId][m.platform] = {
            isEnabled: m.isActive,
            extId: m.platformItemId,
            price: storedPrice
        };
    });

    // Format Webhook Logs
    const formattedLogs = logs.map(l => ({
        platform: l.platform,
        event: l.eventType,
        status: l.error ? "FAILED" : "SUCCESS",
        time: l.receivedAt,
        details: l.payload ? (l.payload as any).details : "Sync executed"
    }));

    return NextResponse.json({
      success: true,
      platforms: platformsData,
      mappings: mappingsData,
      logs: formattedLogs
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
    const body = await req.json();
    const { action } = body;

    // 🟢 1. SAVE MASTER CONFIGURATION & MAPPING
    if (action === "SYNC_MASTER") {
        const { mappings, platformsSettings } = body;

        await prisma.$transaction(async (tx) => {
            // Update Platform Configs
            for (const key of Object.keys(platformsSettings)) {
                const p = platformsSettings[key];
                const platformEnum = key as any;

                await tx.aggregatorConfig.upsert({
                    where: { outletId_platform: { outletId: secureOutletId, platform: platformEnum } },
                    update: { isActive: p.isStoreOnline, autoAccept: p.autoAccept },
                    create: {
                        outletId: secureOutletId,
                        platform: platformEnum,
                        platformStoreId: `${secureOutletId}-${platformEnum}`,
                        isActive: p.isStoreOnline,
                        autoAccept: p.autoAccept,
                    }
                });
            }

            // Update Menu Mappings
            await tx.aggregatorMenuMap.deleteMany({ where: { outletId: secureOutletId } });

            const newMaps = [];
            for (const itemId of Object.keys(mappings)) {
                const itemPlats = mappings[itemId];
                for (const plat of Object.keys(itemPlats)) {
                    const data = itemPlats[plat];
                    if (data.isEnabled || data.extId) {
                        newMaps.push({
                            menuItemId: itemId,
                            outletId: secureOutletId,
                            platform: plat as any,
                            platformItemId: data.extId || `${itemId}-${plat}`, // Required Unique ID
                            platformItemName: JSON.stringify({ price: data.price }), // Storing price safely
                            isActive: data.isEnabled || false
                        });
                    }
                }
            }
            if (newMaps.length > 0) {
                await tx.aggregatorMenuMap.createMany({ data: newMaps });
            }
        });

        return NextResponse.json({ success: true });
    }

    // 🟢 2. ADD WEBHOOK LOGS
    if (action === "ADD_LOG") {
        const { payload } = body;
        
        // Map generic names to Prisma Enum
        let dbPlatform = "OWN_WEB";
        const uiPlatform = String(payload.platform).toUpperCase();
        if (uiPlatform.includes("ZOMATO")) dbPlatform = "ZOMATO";
        else if (uiPlatform.includes("SWIGGY")) dbPlatform = "SWIGGY";
        else if (uiPlatform.includes("MAGICPIN") || uiPlatform.includes("TOING")) dbPlatform = "MAGICPIN";
        else if (uiPlatform.includes("CLUB")) dbPlatform = "CLUB";

        await prisma.aggregatorWebhookLog.create({
            data: {
                outletId: secureOutletId,
                platform: dbPlatform as any,
                eventType: payload.event,
                payload: { details: payload.details },
                processed: true,
                error: payload.status === "FAILED" ? "Sync Error" : null
            }
        });
        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid Action" }, { status: 400 });
  } catch (error: any) {
    console.error("Integration Save Error:", error);
    return NextResponse.json({ error: "DB Error", details: error.message }, { status: 500 });
  }
}
