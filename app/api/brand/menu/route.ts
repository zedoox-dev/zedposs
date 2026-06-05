import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getServerSession } from "next-auth/next";

export const dynamic = "force-dynamic";

// GET ALL MENU ITEMS (Global for the Brand)
export async function GET() {
  try {
    const session = await getServerSession();
    const userEmail = session?.user?.email;

    if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Menu items are Tenant (Brand) specific, not outlet specific.
    const menuItems = await prisma.menuItem.findMany({
      where: { tenantId: user.tenantId, isDeleted: false },
      orderBy: [{ category: 'asc' }, { name: 'asc' }]
    });

    return NextResponse.json({ success: true, menuItems });
  } catch (error: any) {
    console.error("Menu Fetch Error:", error);
    return NextResponse.json({ error: "Failed to load menu data" }, { status: 500 });
  }
}

// ADD NEW MENU ITEM
export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    const userEmail = session?.user?.email;
    if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const { name, price, category } = body;

    const newItem = await prisma.menuItem.create({
      data: {
        name,
        price: Number(price),
        category: category.toUpperCase(),
        tenantId: user.tenantId
      }
    });

    return NextResponse.json({ success: true, item: newItem });
  } catch (error: any) {
    console.error("Menu Creation Error:", error);
    return NextResponse.json({ error: "Failed to create menu item" }, { status: 500 });
  }
}

// TOGGLE ACTIVE STATUS OR UPDATE PRICE
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, isActive, price } = body;

    const updateData: any = {};
    if (isActive !== undefined) updateData.isActive = isActive;
    if (price !== undefined) updateData.price = Number(price);

    const updatedItem = await prisma.menuItem.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ success: true, item: updatedItem });
  } catch (error: any) {
    console.error("Menu Update Error:", error);
    return NextResponse.json({ error: "Failed to update menu item" }, { status: 500 });
  }
}
