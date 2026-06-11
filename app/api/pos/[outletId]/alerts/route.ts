import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: { outletId: string } }) {
  try {
    const outlet = await prisma.outlet.findUnique({
      where: { id: params.outletId },
      select: { tenantId: true }
    });

    const inventory = await prisma.inventory.findMany({
      where: { outletId: params.outletId, isDeleted: false },
      select: { id: true, itemName: true, stockLevel: true, minStock: true, unit: true }
    });
    const lowStockAlerts = inventory.filter(item => item.stockLevel <= item.minStock);

    const openTickets = outlet ? await prisma.supportTicket.findMany({
      where: { tenantId: outlet.tenantId, status: { not: "CLOSED" } },
      orderBy: { createdAt: 'desc' }
    }) : [];

    return NextResponse.json({ success: true, lowStockAlerts, openTickets });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Fetch failed" }, { status: 500 });
  }
}
