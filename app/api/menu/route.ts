import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route"; 

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized terminal access blocked." }, { status: 401 });
    }

    const secureOutletId = (session.user as any).outletId;
    if (!secureOutletId) {
      return NextResponse.json({ error: "Outlet ID missing from authorization token." }, { status: 400 });
    }

    // Fetch items with their linked category name AND tax profile details
    const menuItems = await prisma.menuItem.findMany({
      where: { 
        outletId: secureOutletId, 
        isActive: true,
        isDeleted: false 
      },
      include: {
        category: true,
        taxProfile: true // 🔥 Pulling dynamic Tax Profile for rendering
      },
      orderBy: { createdAt: 'asc' }
    });
    
    const formattedItems = menuItems.map(item => ({
      ...item,
      category: item.category?.name || "Uncategorized"
    }));

    return NextResponse.json({ items: formattedItems });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch secure menu items" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    
    const secureOutletId = (session.user as any).outletId;
    const secureTenantId = (session.user as any).tenantId;
    
    const body = await req.json();
    const { name, finalPrice, category, imageUrl, hsnCode, cgst, sgst } = body;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Check if the Category exists for this Tenant, if not Create it.
      let categoryRecord = await tx.menuCategory.findFirst({
        where: { name: category, tenantId: secureTenantId }
      });

      if (!categoryRecord) {
        categoryRecord = await tx.menuCategory.create({
          data: { name: category, tenantId: secureTenantId }
        });
      }

      // 2. Map and Manage Dynamic Custom Tax Profile 
      const inputCgst = parseFloat(cgst) || 0;
      const inputSgst = parseFloat(sgst) || 0;
      const totalTax = inputCgst + inputSgst;

      // Smart Mapping to Prisma TaxSlab Enums
      let mappedSlab: any = "GST_0";
      if (totalTax > 0 && totalTax <= 5) mappedSlab = "GST_5";
      else if (totalTax > 5 && totalTax <= 12) mappedSlab = "GST_12";
      else if (totalTax > 12 && totalTax <= 18) mappedSlab = "GST_18";
      else if (totalTax > 18) mappedSlab = "GST_28";

      // Look for exactly matching tax setup, otherwise create a new custom one
      let taxRecord = await tx.taxProfile.findFirst({
        where: { tenantId: secureTenantId, cgst: inputCgst, sgst: inputSgst }
      });

      if (!taxRecord) {
        taxRecord = await tx.taxProfile.create({
          data: {
            name: `GST ${totalTax}%`,
            taxSlab: mappedSlab,
            cgst: inputCgst,
            sgst: inputSgst,
            igst: totalTax,
            tenantId: secureTenantId
          }
        });
      }

      // 3. Generate 5-Digit Auto ID
      const generatedItemId = Math.floor(10000 + Math.random() * 90000).toString();

      // 4. Create the MenuItem mapping dynamic Tax Profile
      const newItem = await tx.menuItem.create({
        data: {
          name,
          categoryId: categoryRecord.id, 
          taxProfileId: taxRecord.id, // 🔥 Automatically assigned proper Tax Profile
          price: parseFloat(finalPrice), 
          imageUrl: imageUrl === "" ? null : (imageUrl || null),
          hsnCode: hsnCode === "" ? null : (hsnCode || null),
          barcode: generatedItemId, 
          tenantId: secureTenantId, 
          outletId: secureOutletId,
          isActive: true,
          isDeleted: false
        }
      });

      return newItem;
    });

    return NextResponse.json({ success: true, item: result });
  } catch (error: any) {
    console.error("Menu Post Error:", error);
    return NextResponse.json({ error: "Failed to securely add item" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    
    const secureOutletId = (session.user as any).outletId;
    const secureTenantId = (session.user as any).tenantId;

    const body = await req.json();
    const { id, name, finalPrice, category, imageUrl, hsnCode, cgst, sgst } = body;

    const existingItem = await prisma.menuItem.findUnique({ where: { id: id } });
    if (!existingItem || existingItem.outletId !== secureOutletId) {
       return NextResponse.json({ error: "Unauthorized modification attempt blocked." }, { status: 403 });
    }

    const updatedItem = await prisma.$transaction(async (tx) => {
      // Find or create category
      let categoryRecord = await tx.menuCategory.findFirst({
        where: { name: category, tenantId: secureTenantId }
      });

      if (!categoryRecord) {
        categoryRecord = await tx.menuCategory.create({
          data: { name: category, tenantId: secureTenantId }
        });
      }

      // Re-evaluate Dynamic Tax Profile on update
      let targetTaxProfileId = existingItem.taxProfileId;

      if (cgst !== undefined && sgst !== undefined) {
        const inputCgst = parseFloat(cgst) || 0;
        const inputSgst = parseFloat(sgst) || 0;
        const totalTax = inputCgst + inputSgst;

        let mappedSlab: any = "GST_0";
        if (totalTax > 0 && totalTax <= 5) mappedSlab = "GST_5";
        else if (totalTax > 5 && totalTax <= 12) mappedSlab = "GST_12";
        else if (totalTax > 12 && totalTax <= 18) mappedSlab = "GST_18";
        else if (totalTax > 18) mappedSlab = "GST_28";

        let taxRecord = await tx.taxProfile.findFirst({
          where: { tenantId: secureTenantId, cgst: inputCgst, sgst: inputSgst }
        });

        if (!taxRecord) {
          taxRecord = await tx.taxProfile.create({
            data: {
              name: `GST ${totalTax}%`,
              taxSlab: mappedSlab,
              cgst: inputCgst,
              sgst: inputSgst,
              igst: totalTax,
              tenantId: secureTenantId
            }
          });
        }
        targetTaxProfileId = taxRecord.id;
      }

      return await tx.menuItem.update({
        where: { id: id },
        data: {
          name,
          categoryId: categoryRecord.id,
          taxProfileId: targetTaxProfileId, // 🔥 Updating dynamic tax connection
          price: parseFloat(finalPrice),
          imageUrl: imageUrl !== undefined ? (imageUrl === "" ? null : imageUrl) : existingItem.imageUrl,
          hsnCode: hsnCode !== undefined ? (hsnCode === "" ? null : hsnCode) : existingItem.hsnCode
        }
      });
    });

    return NextResponse.json({ success: true, item: updatedItem });
  } catch (error: any) {
    return NextResponse.json({ error: "Secure update failed" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    
    const secureOutletId = (session.user as any).outletId;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const existingItem = await prisma.menuItem.findUnique({ where: { id: id } });
    if (!existingItem || existingItem.outletId !== secureOutletId) {
       return NextResponse.json({ error: "Unauthorized deletion attempt blocked." }, { status: 403 });
    }

    await prisma.menuItem.update({
      where: { id: id },
      data: { isActive: false, isDeleted: true }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Secure delete failed" }, { status: 500 });
  }
}
