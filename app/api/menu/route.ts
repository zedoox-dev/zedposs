import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET(req: Request) {
  try {
    // 🔒 GET TENANT ID FROM QUERY
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId");

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
    }

    const menuItems = await prisma.menuItem.findMany({
      where: { 
        tenantId: tenantId, 
        isActive: true,
        isDeleted: false // Soft delete protection
      },
      orderBy: { category: 'asc' }
    });
    return NextResponse.json(menuItems);
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch menu items" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, finalPrice, category, ItemId, tenantId } = body;

    if (!tenantId) return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });

    const newItem = await prisma.menuItem.create({
      data: {
        name,
        category,
        price: parseFloat(finalPrice), 
        ItemId: Number(ItemId), 
        tenantId: tenantId, // Multi-tenant link
        isActive: true
      }
    });

    return NextResponse.json({ success: true, item: newItem });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to add item" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, name, finalPrice, category } = body;

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
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    // Soft Delete use karenge taaki offline sync break na ho
    await prisma.menuItem.update({
      where: { id: id },
      data: { isActive: false, isDeleted: true }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
