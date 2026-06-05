import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const outletId = searchParams.get("outletId");
  const tenantId = searchParams.get("tenantId"); // 🔥 SaaS Multi-Tenant Shield
  const dateFilter = searchParams.get("date") || "today"; 
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!outletId || !tenantId) return NextResponse.json({ error: "Outlet ID & Tenant ID required" }, { status: 400 });

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
  } else if (dateFilter === "all_history") {
    dateQuery = { lte: now };
  }

  try {
    const orders = await prisma.order.findMany({
      where: { outletId, createdAt: dateQuery, status: { not: "CANCELLED" }, isDeleted: false },
      include: { items: true }
    });

    const salesData: Record<string, { qty: number, revenue: number }> = {};
    orders.forEach(order => {
      const isComp = order.paymentMode === "COMPLEMENTARY" || order.isComplementary;
      order.items.forEach(item => {
        if (!salesData[item.menuItemId]) salesData[item.menuItemId] = { qty: 0, revenue: 0 };
        salesData[item.menuItemId].qty += item.quantity;
        if (!isComp) salesData[item.menuItemId].revenue += (item.price * item.quantity);
      });
    });

    // Fetched specifically for the current tenant 
    const menuItems = await prisma.menuItem.findMany({ where: { tenantId, isActive: true, isDeleted: false } });
    const rawMaterials = await prisma.inventory.findMany({ where: { outletId, type: "RAW_MATERIAL", isDeleted: false } });
    const recipes = await prisma.recipeItem.findMany({ include: { rawMaterial: true } });

    const productionBatches = await prisma.productionBatch.findMany({
      where: { outletId, date: dateQuery, isDeleted: false },
      include: { finishedGood: true, createdByUser: true },
      orderBy: { date: 'desc' }
    });

    // 🔥 SMART ENGINE: Unpack custom tags and connect MenuItems to Inventory safely
    const mappedBatches = productionBatches.map(b => {
      const menuMatch = b.batchNumber.match(/\[MENU:(.*?)\]/);
      return {
        ...b,
        mappedMenuItemId: menuMatch ? menuMatch[1] : b.finishedGoodId,
        finishedGoodName: b.finishedGood?.itemName || "Unknown Item"
      };
    });

    return NextResponse.json({
      success: true,
      salesData,
      menuItems,
      rawMaterials,
      recipes,
      productionBatches: mappedBatches
    });
  } catch (error: any) {
    return NextResponse.json({ error: "ERP Sync Failed", details: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, outletId, tenantId, loggedByUserId, mappingData, productionData } = body;

    if (action === "SAVE_MAPPING") {
      const { menuItemId, baseQty, materials } = mappingData; 
      await prisma.recipeItem.deleteMany({ where: { finishedGoodId: menuItemId } });
      
      if (materials.length > 0) {
        await prisma.recipeItem.createMany({
          data: materials.map((m: any) => ({
            finishedGoodId: menuItemId, // String mapping allowed
            rawMaterialId: m.rawMaterialId,
            quantityUsed: parseFloat(m.quantityUsed) / parseFloat(baseQty)
          }))
        });
      }
      return NextResponse.json({ success: true, message: "BOM Locked!" });
    }

    if (action === "RECORD_PRODUCTION") {
      if (!loggedByUserId) throw new Error("Active user session missing.");

      const { menuItemId, producedQty, finishedWastage, actualMaterialsUsed } = productionData;

      // 🔥 CRITICAL FIX: Bridge MenuItem to Inventory to satisfy Prisma Schema Constraint
      const menuItem = await prisma.menuItem.findUnique({ where: { id: menuItemId } });
      if (!menuItem) throw new Error("Menu item mapping missing.");

      let invItem = await prisma.inventory.findFirst({
        where: { outletId: String(outletId), itemName: menuItem.name, type: "FINISHED_GOOD" }
      });

      // Auto-create finished good in inventory if it doesn't exist
      if (!invItem) {
        invItem = await prisma.inventory.create({
          data: {
            itemName: menuItem.name,
            type: "FINISHED_GOOD",
            unit: "SERVINGS",
            stockLevel: 0,
            minStock: 0,
            outletId: String(outletId)
          }
        });
      }

      const count = await prisma.productionBatch.count({ where: { outletId } });
      // Store the real Menu ID safely inside the batch string for tracking
      const structuredBatchNo = `PB-${50000 + count + 1}[WASTE:${finishedWastage || 0}][MENU:${menuItemId}]`;

      const batch = await prisma.productionBatch.create({
        data: {
          batchNumber: structuredBatchNo,
          finishedGoodId: invItem.id, // PERFECT FOREIGN KEY LINKED
          quantityProduced: parseFloat(producedQty),
          outletId: String(outletId),
          createdByUserId: String(loggedByUserId) // Fixed real identity injection
        }
      });

      // Deduct raw material stock accurately
      for (const rm of actualMaterialsUsed) {
        const netDeduction = parseFloat(rm.actualUsed || "0") + parseFloat(rm.rawWastage || "0");
        if (netDeduction > 0) {
          await prisma.inventory.update({
            where: { id: rm.rawMaterialId },
            data: { stockLevel: { decrement: netDeduction } }
          });
        }
      }
      
      return NextResponse.json({ success: true, batch });
    }

    return NextResponse.json({ error: "Invalid Action" }, { status: 400 });
  } catch (error: any) {
    console.error("ERP TRANSACTION ERROR:", error);
    return NextResponse.json({ error: "Transaction Failed", details: error.message }, { status: 500 });
  }
}
