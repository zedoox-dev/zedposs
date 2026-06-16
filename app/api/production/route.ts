import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized access blocked." }, { status: 401 });
  }

  const secureOutletId = (session.user as any).outletId;
  const secureTenantId = (session.user as any).tenantId;

  if (!secureOutletId || !secureTenantId) return NextResponse.json({ error: "Authentication details missing" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const dateFilter = searchParams.get("date") || "today"; 
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

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
      where: { outletId: secureOutletId, createdAt: dateQuery, status: { not: "CANCELLED" }, isDeleted: false },
      include: { items: true }
    });

    const salesData: Record<string, { qty: number, revenue: number }> = {};
    orders.forEach(order => {
      const isComp = order.paymentMode === "COMPLIMENTARY" || order.isComplementary;
      order.items.forEach(item => {
        if (!salesData[item.menuItemId]) salesData[item.menuItemId] = { qty: 0, revenue: 0 };
        salesData[item.menuItemId].qty += item.quantity;
        if (!isComp) salesData[item.menuItemId].revenue += (item.totalPrice || (item.unitPrice * item.quantity));
      });
    });

    const menuItems = await prisma.menuItem.findMany({ 
      where: { 
        outletId: secureOutletId,
        isActive: true, 
        isDeleted: false 
      } 
    });

    const rawMaterials = await prisma.inventory.findMany({ 
      where: { outletId: secureOutletId, type: "RAW_MATERIAL", isDeleted: false } 
    });

    const recipes = await prisma.recipeItem.findMany({ 
      where: { menuItemId: { in: menuItems.map(m => m.id) }, isDeleted: false },
      include: { rawMaterial: true } 
    });

    const mappedRecipes = recipes.map(r => ({
      ...r,
      finishedGoodId: r.menuItemId
    }));

    // 🔥 4. Fetch Exact Deduction Logic for Print Views
    const productionBatches = await prisma.productionBatch.findMany({
      where: { outletId: secureOutletId, date: dateQuery, isDeleted: false },
      include: { finishedGood: true, createdByUser: true },
      orderBy: { date: 'desc' }
    });

    const mappedBatches = productionBatches.map(b => {
      const menuMatch = b.batchNumber.match(/\[MENU:(.*?)\]/);
      let rmDeductions = [];
      try {
        const rmMatch = b.batchNumber.match(/\[RM_LOG:(.*?)\]/);
        if(rmMatch) rmDeductions = JSON.parse(rmMatch[1]);
      } catch(e) {}

      return {
        ...b,
        mappedMenuItemId: menuMatch ? menuMatch[1] : b.finishedGoodId,
        finishedGoodName: b.finishedGood?.itemName || "Unknown Item",
        rawMaterialsLogged: rmDeductions
      };
    });

    return NextResponse.json({
      success: true,
      salesData,
      menuItems,
      rawMaterials,
      recipes: mappedRecipes,
      productionBatches: mappedBatches
    });
  } catch (error: any) {
    return NextResponse.json({ error: "ERP Sync Failed", details: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: "Unauthorized access blocked." }, { status: 401 });

    const secureOutletId = (session.user as any).outletId;
    const secureTenantId = (session.user as any).tenantId;

    const body = await req.json();
    const { action, mappingData, productionData } = body;

    const dbOutlet = await prisma.outlet.findUnique({ where: { id: secureOutletId } });
    if (!dbOutlet) return NextResponse.json({ error: "Invalid Outlet." }, { status: 400 });

    const sessionUserId = (session.user as any).id;
    const sessionEmail = session.user.email || `outlet_${secureOutletId}@system.local`;

    let dbUser = await prisma.user.findFirst({
      where: { OR: [ ...(sessionUserId ? [{ id: sessionUserId }] : []), { email: sessionEmail } ] }
    });

    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          name: dbOutlet.name + " Prod Admin",
          email: sessionEmail,
          password: "auto-generated-pos",
          tenantId: secureTenantId || dbOutlet.tenantId,
          outletId: secureOutletId,
          roleId: null 
        }
      });
    }

    if (action === "SAVE_MAPPING") {
      const { menuItemId, baseQty, materials } = mappingData; 
      
      const menuItem = await prisma.menuItem.findUnique({ where: { id: menuItemId } });
      if (!menuItem || (menuItem.outletId && menuItem.outletId !== secureOutletId)) {
        return NextResponse.json({ error: "Unauthorized modification attempt." }, { status: 403 });
      }

      await prisma.$transaction(async (tx) => {
        await tx.recipeItem.deleteMany({ where: { menuItemId: menuItemId } });
        
        if (materials.length > 0) {
          await tx.recipeItem.createMany({
            data: materials.map((m: any) => ({
              menuItemId: menuItemId, 
              rawMaterialId: m.rawMaterialId,
              quantityUsed: parseFloat(m.quantityUsed) / parseFloat(baseQty)
            }))
          });
        }
      });
      return NextResponse.json({ success: true, message: "BOM Locked!" });
    }

    if (action === "RECORD_PRODUCTION") {
      const { menuItemId, producedQty, finishedWastage, actualMaterialsUsed } = productionData;

      const menuItem = await prisma.menuItem.findUnique({ where: { id: menuItemId } });
      if (!menuItem || (menuItem.outletId && menuItem.outletId !== secureOutletId)) {
        throw new Error("Menu item mapping missing or unauthorized.");
      }

      const result = await prisma.$transaction(async (tx) => {
        let invItem = await tx.inventory.findFirst({
          where: { outletId: secureOutletId, itemName: menuItem.name, type: "FINISHED_GOOD" }
        });

        const netProduced = parseFloat(producedQty);
        const netWasted = parseFloat(finishedWastage || "0");
        const addedToStock = netProduced - netWasted;

        if (!invItem) {
          invItem = await tx.inventory.create({
            data: {
              itemName: menuItem.name,
              type: "FINISHED_GOOD",
              unit: "SERVINGS",
              stockLevel: addedToStock > 0 ? addedToStock : 0,
              minStock: 0,
              outletId: secureOutletId
            }
          });
        } else {
          if (addedToStock > 0) {
            await tx.inventory.update({
              where: { id: invItem.id },
              data: { stockLevel: { increment: addedToStock } }
            });
          }
        }

        // 🔥 EXACT GRAM-TO-GRAM DEDUCTION LOGIC
        const rmLogsForPrint = [];
        for (const rm of actualMaterialsUsed) {
          const netDeduction = parseFloat(rm.actualUsed || "0") + parseFloat(rm.rawWastage || "0");
          if (netDeduction > 0) {
            await tx.inventory.update({
              where: { id: rm.rawMaterialId },
              data: { stockLevel: { decrement: netDeduction } }
            });
            rmLogsForPrint.push({ id: rm.rawMaterialId, name: rm.name, unit: rm.unit, deducted: netDeduction });
          }
        }

        const uniqueSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        const rmLogStr = JSON.stringify(rmLogsForPrint);
        const structuredBatchNo = `PB-${Date.now().toString().slice(-6)}-${uniqueSuffix}[WASTE:${netWasted}][MENU:${menuItemId}][RM_LOG:${rmLogStr}]`;

        const batch = await tx.productionBatch.create({
          data: {
            batchNumber: structuredBatchNo,
            finishedGoodId: invItem.id, 
            quantityProduced: netProduced,
            outletId: secureOutletId,
            createdByUserId: dbUser.id 
          }
        });

        return batch;
      });
      
      return NextResponse.json({ success: true, batch: result });
    }

    return NextResponse.json({ error: "Invalid Action" }, { status: 400 });
  } catch (error: any) {
    console.error("ERP TRANSACTION ERROR:", error);
    return NextResponse.json({ error: "Transaction Failed", details: error.message }, { status: 500 });
  }
}
