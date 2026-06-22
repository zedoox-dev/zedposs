import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]/route"; 

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

    const menuItems = await prisma.menuItem.findMany({
      where: { 
        outletId: secureOutletId, 
        isActive: true,
        isDeleted: false 
      },
      // 🔥 Include taxProfile to compute precise dynamic math in the UI loop
      include: { category: true, taxProfile: true },
      orderBy: { createdAt: 'asc' }
    });
    
    const formattedItems = menuItems.map(item => ({
      ...item,
      category: item.category?.name || "Uncategorized"
    }));

    return NextResponse.json(formattedItems);
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch secure menu items" }, { status: 500 });
  }
}
