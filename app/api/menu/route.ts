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

    // Fetch items with their linked category name from MenuCategory table
    const menuItems = await prisma.menuItem.findMany({
      where: { 
        outletId: secureOutletId, 
        isActive: true,
        isDeleted: false 
      },
      include: {
        category: true // Fetching relation data
      },
      orderBy: { createdAt: 'asc' }
    });
    
    // Mapping format back to what frontend expects (item.category as a string)
    const formattedItems = menuItems.map(item => ({
      ...item,
      category: item.category?.name || "Uncategorized"
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
    const { name, finalPrice, category, imageUrl } = body;

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

      // 2. Create the MenuItem using the categoryId
      const newItem = await tx.menuItem.create({
        data: {
          name,
          categoryId: categoryRecord.id, // Linked securely!
          price: parseFloat(finalPrice), 
          imageUrl: imageUrl === "" ? null : (imageUrl || null),
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
    const { id, name, finalPrice, category, imageUrl } = body;

    const existingItem = await prisma.menuItem.findUnique({ where: { id: id } });
    if (!existingItem || existingItem.outletId !== secureOutletId) {
       return NextResponse.json({ error: "Unauthorized modification attempt blocked." }, { status: 403 });
    }

    const updatedItem = await prisma.$transaction(async (tx) => {
      // Find or create category on edit as well
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
          price: parseFloat(finalPrice),
          imageUrl: imageUrl !== undefined ? (imageUrl === "" ? null : imageUrl) : existingItem.imageUrl
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
