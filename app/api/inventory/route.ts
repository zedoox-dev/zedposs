import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const outletId = searchParams.get("outletId");
  const tenantId = searchParams.get("tenantId"); // 🔒 Protect Data

  if (!outletId || !tenantId) return NextResponse.json({ error: "Outlet and Tenant ID required" }, { status: 400 });

  try {
    // 1. Fetch Inventory SKUs
    const inventory = await prisma.inventory.findMany({
      where: { outletId: outletId, isDeleted: false },
      orderBy: { itemName: 'asc' }
    });

    // 2. Fetch Vendors List from DB (Not LocalStorage)
    const vendors = await prisma.vendor.findMany({
      where: { tenantId: tenantId, isDeleted: false },
      orderBy: { name: 'asc' }
    });

    // 3. Fetch Purchase Orders (GRN Logs) from DB
    const purchases = await prisma.purchaseOrder.findMany({
      where: { outletId: outletId, isDeleted: false },
      include: {
        vendor: true,
        items: { include: { inventory: true } } // Includes SKU info
      },
      orderBy: { date: 'desc' },
      take: 100 // Limit for performance
    });

    // Format Purchases back to UI-friendly logs
    const purchaseLogs = purchases.flatMap(po => 
      po.items.map(item => ({
        id: po.id, // Using PO ID for log ref
        date: po.date,
        poNumber: po.invoiceNumber || "N/A",
        itemName: item.inventory?.itemName || "Unknown",
        unit: item.inventory?.unit || "UNIT",
        qty: item.quantity,
        rate: item.costPrice,
        total: item.quantity * item.costPrice,
        vendor: po.vendor?.name || "HQ / Unknown",
        paymentMode: po.status, // We temporarily store payment mode in status based on UI schema
      }))
    );

    return NextResponse.json({ inventory, vendors, purchaseLogs });
  } catch (error: any) {
    return NextResponse.json({ error: "Fetch Error", details: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, outletId, tenantId, itemName, type, unit, stockLevel, minStock, vendorData } = body;

    // ACTION: ADD NEW INVENTORY SKU
    if (action === "ADD_SKU") {
      const item = await prisma.inventory.create({
        data: {
          outletId: String(outletId),
          itemName: String(itemName).toUpperCase(),
          type: String(type),
          unit: String(unit),
          stockLevel: parseFloat(stockLevel),
          minStock: parseFloat(minStock)
        }
      });
      return NextResponse.json({ success: true, item });
    }

    // ACTION: ADD NEW VENDOR
    if (action === "ADD_VENDOR") {
      const newVendor = await prisma.vendor.create({
        data: {
          tenantId: String(tenantId),
          name: String(vendorData.name).toUpperCase(),
          contactPerson: vendorData.contactPerson,
          phone: vendorData.phone,
          address: vendorData.address
        }
      });
      return NextResponse.json({ success: true, vendor: newVendor });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: "Create Error", details: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { action, outletId, tenantId, itemId, newStock, addedQty, purchaseData } = body;

    if (action === "ADJUST_STOCK") {
      const item = await prisma.inventory.update({
        where: { id: itemId },
        data: { stockLevel: parseFloat(newStock) }
      });
      return NextResponse.json({ success: true, item });
    }
    
    // 🔥 FULL PRISMA INTEGRATION FOR GRN (PURCHASE ENTRY)
    if (action === "ADD_PURCHASE") {
      const { rate, qty, vendorName, invoiceNo, paymentMode, totalAmount } = purchaseData;

      // 1. Increase Stock Level First
      const item = await prisma.inventory.update({
        where: { id: itemId },
        data: { stockLevel: { increment: parseFloat(qty) } }
      });

      // 2. Find Vendor (Or default if HQ)
      let targetVendor = await prisma.vendor.findFirst({
        where: { tenantId: tenantId, name: vendorName }
      });

      if (!targetVendor && vendorName !== "HQ") {
        // Auto create vendor if missing (fallback)
        targetVendor = await prisma.vendor.create({
          data: { tenantId: tenantId, name: vendorName, phone: "N/A" }
        });
      }

      // 3. Create Official Purchase Order in DB
      const po = await prisma.purchaseOrder.create({
        data: {
          outletId: outletId,
          vendorId: targetVendor?.id || "HQ", // Assuming HQ is handled safely if ID is string
          invoiceNumber: invoiceNo || `PO-${Date.now()}`,
          totalAmount: parseFloat(totalAmount),
          status: paymentMode, // Temporarily saving payment info here for log mapping
          items: {
            create: [{
              inventoryId: itemId,
              quantity: parseFloat(qty),
              costPrice: parseFloat(rate)
            }]
          }
        }
      });

      return NextResponse.json({ success: true, item, po });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: "Update Error", details: error.message }, { status: 500 });
  }
}
