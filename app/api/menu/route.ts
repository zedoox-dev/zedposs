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
        taxProfile: true // Link existing TaxProfile data securely
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
    const { name, finalPrice, category, imageUrl, hsnCode, customGst } = body;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Check/Create Category
      let categoryRecord = await tx.menuCategory.findFirst({
        where: { name: category, tenantId: secureTenantId }
      });

      if (!categoryRecord) {
        categoryRecord = await tx.menuCategory.create({
          data: { name: category, tenantId: secureTenantId }
        });
      }

      // 2. 🔥 SMART MANUAL GST LOGIC: Auto-Find or Auto-Create Tax Profile
      const totalGst = parseFloat(customGst) || 0;
      const halfGst = totalGst / 2;

      // Assign closest TaxSlab Enum based on standard slabs, logic protects Prisma
      let slabEnum: any = "GST_0";
      if (totalGst > 0 && totalGst <= 5) slabEnum = "GST_5";
      else if (totalGst > 5 && totalGst <= 12) slabEnum = "GST_12";
      else if (totalGst > 12 && totalGst <= 18) slabEnum = "GST_18";
      else if (totalGst > 18) slabEnum = "GST_28";

      let taxRecord = await tx.taxProfile.findFirst({
        where: { tenantId: secureTenantId, cgst: halfGst, sgst: halfGst }
      });

      if (!taxRecord) {
        taxRecord = await tx.taxProfile.create({
          data: {
            name: `GST ${totalGst}%`,
            taxSlab: slabEnum,
            cgst: halfGst,
            sgst: halfGst,
            igst: totalGst,
            tenantId: secureTenantId
          }
        });
      }

      // 3. Generate 5-Digit Auto ID
      const generatedItemId = Math.floor(10000 + Math.random() * 90000).toString();

      // 4. Create the MenuItem
      const newItem = await tx.menuItem.create({
        data: {
          name,
          categoryId: categoryRecord.id,
          taxProfileId: taxRecord.id, // Linked Custom Tax Profile!
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
    const { id, name, finalPrice, category, imageUrl, hsnCode, customGst } = body;

    const existingItem = await prisma.menuItem.findUnique({ where: { id: id } });
    if (!existingItem || existingItem.outletId !== secureOutletId) {
       return NextResponse.json({ error: "Unauthorized modification attempt blocked." }, { status: 403 });
    }

    const updatedItem = await prisma.$transaction(async (tx) => {
      // Find or create category on edit
      let categoryRecord = await tx.menuCategory.findFirst({
        where: { name: category, tenantId: secureTenantId }
      });

      if (!categoryRecord) {
        categoryRecord = await tx.menuCategory.create({
          data: { name: category, tenantId: secureTenantId }
        });
      }

      // 🔥 Protect existing tax mapping if toggle image updates without customGst
      let finalTaxProfileId = existingItem.taxProfileId;

      if (customGst !== undefined) {
        const totalGst = parseFloat(customGst) || 0;
        const halfGst = totalGst / 2;

        let slabEnum: any = "GST_0";
        if (totalGst > 0 && totalGst <= 5) slabEnum = "GST_5";
        else if (totalGst > 5 && totalGst <= 12) slabEnum = "GST_12";
        else if (totalGst > 12 && totalGst <= 18) slabEnum = "GST_18";
        else if (totalGst > 18) slabEnum = "GST_28";

        let taxRecord = await tx.taxProfile.findFirst({
          where: { tenantId: secureTenantId, cgst: halfGst, sgst: halfGst }
        });

        if (!taxRecord) {
          taxRecord = await tx.taxProfile.create({
            data: {
              name: `GST ${totalGst}%`,
              taxSlab: slabEnum,
              cgst: halfGst,
              sgst: halfGst,
              igst: totalGst,
              tenantId: secureTenantId
            }
          });
        }
        finalTaxProfileId = taxRecord.id;
      }

      return await tx.menuItem.update({
        where: { id: id },
        data: {
          name,
          categoryId: categoryRecord.id,
          taxProfileId: finalTaxProfileId, // Updated or protected!
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
