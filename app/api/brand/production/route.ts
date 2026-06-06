import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getServerSession } from "next-auth/next";

export const dynamic = "force-dynamic";

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

    // 1. Fetch Production History
    const batches = await prisma.productionBatch.findMany({
      where: { ...outletFilter, isDeleted: false },
      include: {
        finishedGood: { select: { itemName: true, unit: true } },
        outlet: { select: { name: true } },
        createdByUser: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    // 2. Fetch Data for Forms (Only Finished Goods & Raw Materials)
    const finishedGoods = await prisma.inventory.findMany({
      where: { 
        ...outletFilter, 
        type: "FINISHED_GOOD", 
        isDeleted: false 
      }
    });

    const rawMaterials = await prisma.inventory.findMany({
      where: { 
        ...outletFilter, 
        type: "RAW_MATERIAL", 
        isDeleted: false 
      }
    });

    // 3. Fetch Recipes mapping
    const recipes = await prisma.recipeItem.findMany({
      where: { isDeleted: false },
      include: { rawMaterial: { select: { itemName: true, unit: true } } }
    });

    return NextResponse.json({ success: true, batches, finishedGoods, rawMaterials, recipes });
  } catch (error: any) {
    console.error("Production Fetch Error:", error);
    return NextResponse.json({ error: "Failed to load production data" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    const userEmail = session?.user?.email;
    if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const { actionType } = body; 

    // ACTION 1: CREATE RECIPE (BOM)
    if (actionType === "CREATE_RECIPE") {
      const { finishedGoodId, rawMaterialId, quantityUsed } = body;
      const newRecipe = await prisma.recipeItem.create({
        data: {
          finishedGoodId,
          rawMaterialId,
          quantityUsed: Number(quantityUsed)
        }
      });
      return NextResponse.json({ success: true, recipe: newRecipe });
    }

    // ACTION 2: LOG PRODUCTION BATCH (THE MAGIC HAPPENS HERE)
    if (actionType === "LOG_BATCH") {
      const { finishedGoodId, quantityProduced, outletId, batchNumber } = body;

      // Start strict database transaction
      const result = await prisma.$transaction(async (tx) => {
        
        // A. Log the Batch
        const newBatch = await tx.productionBatch.create({
          data: {
            batchNumber: batchNumber || `BATCH-${Date.now()}`,
            quantityProduced: Number(quantityProduced),
            finishedGoodId,
            outletId,
            createdByUserId: user.id
          }
        });

        // B. Increase Finished Good Stock (e.g. +500 Samosas)
        await tx.inventory.update({
          where: { id: finishedGoodId },
          data: { stockLevel: { increment: Number(quantityProduced) } }
        });

        // C. Fetch Recipe for this Finished Good
        const recipeItems = await tx.recipeItem.findMany({
          where: { finishedGoodId: finishedGoodId }
        });

        // D. Auto-Deduct Raw Materials (e.g. Maida, Oil) based on ratio!
        for (const rItem of recipeItems) {
          const totalRawMaterialNeeded = rItem.quantityUsed * Number(quantityProduced);
          
          await tx.inventory.update({
            where: { id: rItem.rawMaterialId },
            // Minus the stock, if it goes below 0, Prisma might throw error based on constraints, 
            // but assuming standard float fields here.
            data: { stockLevel: { decrement: totalRawMaterialNeeded } } 
          });
        }

        return newBatch;
      });

      return NextResponse.json({ success: true, batch: result });
    }

    return NextResponse.json({ error: "Invalid Action" }, { status: 400 });
  } catch (error: any) {
    console.error("Production Error:", error);
    return NextResponse.json({ error: "Failed to process production request" }, { status: 500 });
  }
}
