import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // 🔥 Fixed import

export async function GET(req: Request, { params }: { params: { outletId: string } }) {
  try {
    const items = await prisma.menuItem.findMany({
      where: { outletId: params.outletId, isDeleted: false },
      orderBy: { category: 'asc' }
    });
    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Fetch failed" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { outletId: string } }) {
  try {
    const body = await req.json();
    const { itemId, isActive } = body;

    const updated = await prisma.menuItem.updateMany({
      where: { id: itemId, outletId: params.outletId },
      data: { isActive: isActive }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Update failed" }, { status: 500 });
  }
}
