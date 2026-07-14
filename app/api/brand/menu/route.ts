import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId") || "ALL";

    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // 1. Fetch Menu Categories
    const categories = await prisma.menuCategory.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: { name: 'asc' }
    });

    // 2. Fetch Menu Items (Filtered by Outlet or Tenant)
    let outletFilter = {};
    if (outletId !== "ALL") {
      // Fetch specific outlet items + Global tenant items (where outletId is null)
      outletFilter = { OR: [{ outletId: outletId }, { outletId: null, tenantId: user.tenantId }] };
    } else {
      outletFilter = { tenantId: user.tenantId };
    }

    const menuItems = await prisma.menuItem.findMany({
      where: { ...outletFilter, isDeleted: false },
      include: {
        category: true,
        taxProfile: true,
        outlet: { select: { name: true } },
        recipeItems: { include: { rawMaterial: { select: { itemName: true, unit: true } } } }
      },
      orderBy: [{ categoryId: 'asc' }, { name: 'asc' }]
    });

    // 3. Fetch Raw Materials for BOM Mapping (Only if specific outlet is selected)
    let rawMaterials: any[] = [];
    if (outletId !== "ALL") {
      rawMaterials = await prisma.inventory.findMany({
        where: { outletId: outletId, isDeleted: false, type: { in: ['RAW_MATERIAL', 'PACKAGING', 'SEMI_FINISHED'] } },
        orderBy: { itemName: 'asc' }
      });
    }

    return NextResponse.json({ success: true, menuItems, categories, rawMaterials });
  } catch (error: any) {
    console.error("Menu Fetch Error:", error);
    return NextResponse.json({ error: "Failed to load menu master data" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const { action } = body;

    // ==========================================
    // ACTION 1: ADD NEW MENU ITEM
    // ==========================================
    if (action === "ADD_MENU") {
      const { name, price, categoryName, cgst, sgst, hsnCode, imageUrl, outletId } = body;

      if (!name || !price || !categoryName) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }

      // 1. Handle Category (Find or Create)
      let category = await prisma.menuCategory.findFirst({
        where: { tenantId: user.tenantId, name: categoryName.toUpperCase() }
      });
      if (!category) {
        category = await prisma.menuCategory.create({
          data: { name: categoryName.toUpperCase(), tenantId: user.tenantId }
        });
      }

      // 2. Handle Tax Profile (Find or Create)
      const numCgst = parseFloat(cgst) || 0;
      const numSgst = parseFloat(sgst) || 0;
      const totalTax = numCgst + numSgst;
      let taxSlab: any = "GST_0";
      if (totalTax === 5) taxSlab = "GST_5";
      else if (totalTax === 12) taxSlab = "GST_12";
      else if (totalTax === 18) taxSlab = "GST_18";
      else if (totalTax === 28) taxSlab = "GST_28";

      const taxProfileName = `GST ${totalTax}% (${numCgst}% CGST + ${numSgst}% SGST)`;
      let taxProfile = await prisma.taxProfile.findFirst({
        where: { tenantId: user.tenantId, cgst: numCgst, sgst: numSgst }
      });
      if (!taxProfile) {
        taxProfile = await prisma.taxProfile.create({
          data: { name: taxProfileName, taxSlab, cgst: numCgst, sgst: numSgst, tenantId: user.tenantId }
        });
      }

      // 3. Create Menu Item
      const targetOutletId = outletId === "ALL" ? null : outletId;

      const newItem = await prisma.menuItem.create({
        data: {
          name: name.toUpperCase(),
          price: Number(price),
          categoryId: category.id,
          taxProfileId: taxProfile.id,
          hsnCode: hsnCode || null,
          imageUrl: imageUrl || null,
          tenantId: user.tenantId,
          outletId: targetOutletId,
        },
        include: { category: true, taxProfile: true }
      });

      return NextResponse.json({ success: true, item: newItem });
    }

    // ==========================================
    // ACTION 2: SAVE BOM (RECIPE MAPPING)
    // ==========================================
    if (action === "SAVE_BOM") {
      const { menuItemId, materials } = body; // materials: [{ rawMaterialId, quantityUsed }]

      if (!menuItemId || !materials) return NextResponse.json({ error: "Invalid BOM Data" }, { status: 400 });

      // Transaction to Clear old and Insert new BOM
      await prisma.$transaction(async (tx) => {
        // Delete existing mapping for this item
        await tx.recipeItem.deleteMany({
          where: { menuItemId: menuItemId }
        });

        // Insert new mapping
        if (materials.length > 0) {
          const mappingData = materials.map((m: any) => ({
            menuItemId: menuItemId,
            rawMaterialId: m.rawMaterialId,
            quantityUsed: parseFloat(m.quantityUsed)
          }));
          await tx.recipeItem.createMany({ data: mappingData });
        }
      });

      return NextResponse.json({ success: true, message: "BOM Recipe Locked!" });
    }

    return NextResponse.json({ error: "Invalid Action" }, { status: 400 });

  } catch (error: any) {
    console.error("Menu Operations Error:", error);
    return NextResponse.json({ error: "Database transaction failed." }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id, isActive, isDeleted } = body;

    const updateData: any = {};
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isDeleted !== undefined) updateData.isDeleted = isDeleted;

    await prisma.menuItem.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Menu Update Error:", error);
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}
