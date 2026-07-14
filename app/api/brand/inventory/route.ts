import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export const dynamic = "force-dynamic";

// GET INVENTORY LIST WITH LEDGER LOGS
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId") || "ALL";
    const dateFilter = searchParams.get("date") || "today";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    let outletFilter = {};
    if (outletId !== "ALL") {
      outletFilter = { outletId: outletId, outlet: { tenantId: user.tenantId } };
    } else {
      outletFilter = { outlet: { tenantId: user.tenantId } };
    }

    // Date Logic for Ledger
    let dateQuery: any = {};
    const now = new Date();
    
    if (dateFilter === "today") {
      const start = new Date(now.setHours(0, 0, 0, 0));
      const end = new Date(now.setHours(23, 59, 59, 999));
      dateQuery = { gte: start, lte: end };
    } else if (dateFilter === "yesterday") {
      const start = new Date(now);
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      dateQuery = { gte: start, lte: end };
    } else if (dateFilter === "custom" && startDate && endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateQuery = { gte: new Date(startDate), lte: end };
    }

    // 1. Fetch Items (Raw Material and Packaging Only as per Enum)
    const inventory = await prisma.inventory.findMany({
      where: { 
        ...outletFilter, 
        isDeleted: false,
        type: { in: ['RAW_MATERIAL', 'PACKAGING'] } 
      },
      include: { outlet: { select: { name: true } } },
      orderBy: { itemName: 'asc' }
    });

    // 2. Fetch Inward Logs (Purchases) based on Date
    const inwardLogs = await prisma.purchaseItem.findMany({
      where: {
        inventoryId: { in: inventory.map(i => i.id) },
        purchaseOrder: {
          isDeleted: false,
          status: { notIn: ['CANCELLED', 'DRAFT'] },
          ...(Object.keys(dateQuery).length > 0 ? { date: dateQuery } : {})
        }
      },
      select: { inventoryId: true, quantity: true }
    });

    // 3. Fetch Consume Logs (Production) based on Date
    const consumeLogs = await prisma.productionRawLog.findMany({
      where: {
        inventoryId: { in: inventory.map(i => i.id) },
        batch: {
          isDeleted: false,
          ...(Object.keys(dateQuery).length > 0 ? { date: dateQuery } : {})
        }
      },
      select: { inventoryId: true, quantityDeducted: true }
    });

    return NextResponse.json({ success: true, inventory, inwardLogs, consumeLogs });
  } catch (error: any) {
    console.error("Inventory Fetch Error:", error);
    return NextResponse.json({ error: "Failed to load inventory" }, { status: 500 });
  }
}

// ADD NEW INVENTORY ITEM
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { itemName, classification, unit, stockLevel, minStock, outletId } = body;

    if (!itemName || !classification || !unit || !outletId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 🟢 Strict DB Mapping (No Name Pollution)
    const dbType = classification === "PACKAGING" ? "PACKAGING" : "RAW_MATERIAL";
    const finalItemName = itemName.toUpperCase();

    const newItem = await prisma.inventory.create({
      data: {
        itemName: finalItemName,
        type: dbType as any,
        unit: unit.toUpperCase(), // KG, LTR, PCS, GM, PKT
        stockLevel: Number(stockLevel) || 0,
        minStock: Number(minStock) || 0,
        outletId
      }
    });

    return NextResponse.json({ success: true, item: newItem });
  } catch (error: any) {
    console.error("Inventory Create Error:", error);
    return NextResponse.json({ error: "Failed to create item" }, { status: 500 });
  }
}

// 🟢 DELETE SKU ITEM SECURELY
export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { id, password } = body;

    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
    if (!user || user.password !== password) {
      return NextResponse.json({ error: "Authentication Failed: Incorrect Password!" }, { status: 403 });
    }

    await prisma.inventory.update({
      where: { id },
      data: { isDeleted: true }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Inventory Delete Error:", error);
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}
