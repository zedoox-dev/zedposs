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

    // 🔥 Added `taxProfile` to the include object
    const menuItems = await prisma.menuItem.findMany({
      where: { 
        outletId: secureOutletId, 
        isActive: true,
        isDeleted: false 
      },
      include: {
        category: true,
        taxProfile: true // Connect fetching of linked Tax Profile
      },
      orderBy: { createdAt: 'asc' }
    });
    
    const formattedItems = menuItems.map(item => ({
      ...item,
      category: item.category?.name || "Uncategorized",
      taxProfile: item.taxProfile // Keep the whole tax object for frontend calculations
    }));

    return NextResponse.json(formattedItems);
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
    const { name, finalPrice, category, imageUrl, hsnCode, taxProfileId } = body; // Received taxProfileId

    const result = await prisma.$transaction(async (tx) => {
      let categoryRecord = await tx.menuCategory.findFirst({
        where: { name: category, tenantId: secureTenantId }
      });

      if (!categoryRecord) {
        categoryRecord = await tx.menuCategory.create({
          data: { name: category, tenantId: secureTenantId }
        });
      }

      const generatedItemId = Math.floor(10000 + Math.random() * 90000).toString();

      const newItem = await tx.menuItem.create({
        data: {
          name,
          categoryId: categoryRecord.id,
          taxProfileId: taxProfileId || null, // 🔥 Save Tax Profile relation
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
    const { id, name, finalPrice, category, imageUrl, hsnCode, taxProfileId } = body;

    const existingItem = await prisma.menuItem.findUnique({ where: { id: id } });
    if (!existingItem || existingItem.outletId !== secureOutletId) {
       return NextResponse.json({ error: "Unauthorized modification attempt blocked." }, { status: 403 });
    }

    const updatedItem = await prisma.$transaction(async (tx) => {
      let categoryRecord = await tx.menuCategory.findFirst({
        where: { name: category, tenantId: secureTenantId }
      });

      if (!categoryRecord) {
        categoryRecord = await tx.menuCategory.create({
          data: { name: category, tenantId: secureTenantId }
        });
      }

      return await tx.menuItem.update({
        where: { id: id },
        data: {
          name,
          categoryId: categoryRecord.id,
          taxProfileId: taxProfileId !== undefined ? (taxProfileId === "" ? null : taxProfileId) : existingItem.taxProfileId, // Update logic for Tax Profile
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
