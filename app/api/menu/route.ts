import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route"; 

export async function GET(req: Request) {
  try {
    // 🔒 STRICT SECURITY: FETCH OUTLET ID DIRECTLY FROM BACKEND SESSION TOKEN
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized terminal access blocked." }, { status: 401 });
    }

    const secureOutletId = (session.user as any).outletId;

    if (!secureOutletId) {
      return NextResponse.json({ error: "Outlet ID missing from authorization token." }, { status: 400 });
    }

    // Safely fetch data for ONLY this authenticated Outlet
    const menuItems = await prisma.menuItem.findMany({
      where: { 
        outletId: secureOutletId, 
        isActive: true,
        isDeleted: false 
      },
      orderBy: { category: 'asc' }
    });
    
    return NextResponse.json(menuItems);
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
    const { name, finalPrice, category, ItemId } = body;

    const newItem = await prisma.menuItem.create({
      data: {
        name,
        category,
        price: parseFloat(finalPrice), 
        ItemId: Number(ItemId), 
        tenantId: secureTenantId, 
        outletId: secureOutletId, // 🔒 Strictly binds created item to the logged-in outlet
        isActive: true
      }
    });

    return NextResponse.json({ success: true, item: newItem });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to securely add item" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    
    const secureOutletId = (session.user as any).outletId;
    const body = await req.json();
    const { id, name, finalPrice, category } = body;

    // Verify ownership before updating! (Prevents IDOR)
    const existingItem = await prisma.menuItem.findUnique({ where: { id: id } });
    if (!existingItem || existingItem.outletId !== secureOutletId) {
       return NextResponse.json({ error: "Unauthorized modification attempt blocked." }, { status: 403 });
    }

    const updatedItem = await prisma.menuItem.update({
      where: { id: id },
      data: {
        name,
        category,
        price: parseFloat(finalPrice)
      }
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

    // Verify ownership before deleting! (Prevents IDOR)
    const existingItem = await prisma.menuItem.findUnique({ where: { id: id } });
    if (!existingItem || existingItem.outletId !== secureOutletId) {
       return NextResponse.json({ error: "Unauthorized deletion attempt blocked." }, { status: 403 });
    }

    // Soft Delete execution
    await prisma.menuItem.update({
      where: { id: id },
      data: { isActive: false, isDeleted: true }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Secure delete failed" }, { status: 500 });
  }
}
