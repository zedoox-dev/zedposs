import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getServerSession } from "next-auth/next";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId") || "ALL";

    const session = await getServerSession();
    const userEmail = session?.user?.email;
    if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    let outletFilter = {};
    if (outletId !== "ALL") {
      outletFilter = { outletId: outletId, outlet: { tenantId: user.tenantId } };
    } else {
      outletFilter = { outlet: { tenantId: user.tenantId } };
    }

    // 1. Fetch Purchase Orders
    const purchases = await prisma.purchaseOrder.findMany({
      where: { ...outletFilter, isDeleted: false },
      include: {
        vendor: { select: { name: true } },
        outlet: { select: { name: true } },
        _count: { select: { items: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 2. Fetch Helper Data for "New PO" Form
    const vendors = await prisma.vendor.findMany({
      where: { tenantId: user.tenantId, isDeleted: false }
    });
    
    // Fetch inventory for the specific outlet (or all if HQ, but PO must be outlet specific)
    const inventory = await prisma.inventory.findMany({
      where: outletId !== "ALL" 
        ? { outletId, isDeleted: false } 
        : { outlet: { tenantId: user.tenantId }, isDeleted: false },
      include: { outlet: { select: { name: true } } }
    });

    return NextResponse.json({ success: true, purchases, vendors, inventory });
  } catch (error: any) {
    console.error("Purchases Fetch Error:", error);
    return NextResponse.json({ error: "Failed to load purchases" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    const userEmail = session?.user?.email;
    if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { vendorId, outletId, invoiceNumber, status, items } = body;
    // items format: [{ inventoryId, quantity, costPrice }]

    if (!vendorId || !outletId || !items || items.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Calculate Total Amount
    const totalAmount = items.reduce((sum: number, item: any) => sum + (Number(item.quantity) * Number(item.costPrice)), 0);

    // Use Prisma Transaction to ensure Data Consistency
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Purchase Order
      const newPO = await tx.purchaseOrder.create({
        data: {
          vendorId,
          outletId,
          invoiceNumber: invoiceNumber || `INV-${Date.now()}`,
          status,
          totalAmount
        }
      });

      // 2. Add Purchase Items
      const purchaseItemsData = items.map((item: any) => ({
        purchaseOrderId: newPO.id,
        inventoryId: item.inventoryId,
        quantity: Number(item.quantity),
        costPrice: Number(item.costPrice)
      }));
      await tx.purchaseItem.createMany({ data: purchaseItemsData });

      // 3. AUTO-STOCK UPDATE: If status is RECEIVED, increase inventory stock levels!
      if (status === "RECEIVED") {
        for (const item of items) {
          await tx.inventory.update({
            where: { id: item.inventoryId },
            data: { stockLevel: { increment: Number(item.quantity) } }
          });
        }
      }

      return newPO;
    });

    return NextResponse.json({ success: true, purchaseOrder: result });
  } catch (error: any) {
    console.error("PO Creation Error:", error);
    return NextResponse.json({ error: "Failed to create Purchase Order" }, { status: 500 });
  }
}
