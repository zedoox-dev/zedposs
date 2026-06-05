import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getServerSession } from "next-auth/next";

export const dynamic = "force-dynamic";

// GET INVENTORY LIST
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId") || "ALL";

    const session = await getServerSession();
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

    const inventory = await prisma.inventory.findMany({
      where: { ...outletFilter, isDeleted: false },
      include: { outlet: { select: { name: true } } },
      orderBy: { itemName: 'asc' }
    });

    return NextResponse.json({ success: true, inventory });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to load inventory" }, { status: 500 });
  }
}

// ADD NEW INVENTORY ITEM
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { itemName, type, unit, minStock, outletId } = body;

    if (!itemName || !type || !unit || !outletId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const newItem = await prisma.inventory.create({
      data: {
        itemName,
        type,
        unit,
        minStock: Number(minStock) || 0,
        stockLevel: 0, // Initial stock is always 0
        outletId
      }
    });

    return NextResponse.json({ success: true, item: newItem });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to create item" }, { status: 500 });
  }
}

// UPDATE STOCK LEVEL (STOCK IN / OUT)
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, quantity, action } = body; // action: "ADD" or "SUBTRACT"

    const item = await prisma.inventory.findUnique({ where: { id } });
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    let newStockLevel = item.stockLevel;
    if (action === "ADD") {
      newStockLevel += Number(quantity);
    } else if (action === "SUBTRACT") {
      newStockLevel -= Number(quantity);
      if (newStockLevel < 0) newStockLevel = 0; // Prevent negative stock
    }

    const updatedItem = await prisma.inventory.update({
      where: { id },
      data: { stockLevel: newStockLevel }
    });

    return NextResponse.json({ success: true, item: updatedItem });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update stock" }, { status: 500 });
  }
}
