import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET(req: Request) {
  // 🔒 STRICT SECURITY: GET SESSION TOKENS
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized access blocked." }, { status: 401 });
  }

  const secureOutletId = (session.user as any).outletId;
  const secureTenantId = (session.user as any).tenantId;

  if (!secureOutletId || !secureTenantId) {
    return NextResponse.json({ error: "Context IDs missing." }, { status: 400 });
  }

  try {
    // 1. Fetch Inventory SKUs strictly for this outlet
    const inventory = await prisma.inventory.findMany({
      where: { outletId: secureOutletId, isDeleted: false },
      orderBy: { itemName: 'asc' }
    });

    // 2. Fetch Vendors strictly for this tenant
    const vendors = await prisma.vendor.findMany({
      where: { tenantId: secureTenantId, isDeleted: false },
      orderBy: { name: 'asc' }
    });

    // 3. Fetch Purchase Orders (GRN Logs) strictly for this outlet
    const purchases = await prisma.purchaseOrder.findMany({
      where: { outletId: secureOutletId, isDeleted: false },
      include: {
        vendor: true,
        items: { include: { inventory: true } } 
      },
      orderBy: { date: 'desc' },
      take: 100 
    });

    const purchaseLogs = purchases.flatMap(po => 
      po.items.map(item => ({
        id: po.id, 
        date: po.date,
        poNumber: po.invoiceNumber || "N/A",
        itemName: item.inventory?.itemName || "Unknown",
        unit: item.inventory?.unit || "UNIT",
        qty: item.quantity,
        rate: item.costPrice,
        total: item.quantity * item.costPrice,
        vendor: po.vendor?.name || "HQ / Unknown",
        paymentMode: po.status, 
      }))
    );

    return NextResponse.json({ inventory, vendors, purchaseLogs });
  } catch (error: any) {
    return NextResponse.json({ error: "Fetch Error", details: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const secureOutletId = (session.user as any).outletId;
    const secureTenantId = (session.user as any).tenantId;

    const body = await req.json();
    const { action, itemName, type, unit, stockLevel, minStock, vendorData } = body;

    // ACTION: ADD NEW INVENTORY SKU
    if (action === "ADD_SKU") {
      const item = await prisma.inventory.create({
        data: {
          outletId: secureOutletId, // 🔒 Locked
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
          tenantId: secureTenantId, // 🔒 Locked
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
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const secureOutletId = (session.user as any).outletId;
    const secureTenantId = (session.user as any).tenantId;

    const body = await req.json();
    const { action, itemId, newStock, purchaseData } = body;

    // 🔒 IDOR Prevention: Check if itemId belongs to this secureOutletId
    const targetInventory = await prisma.inventory.findUnique({ where: { id: itemId } });
    if (!targetInventory || targetInventory.outletId !== secureOutletId) {
      return NextResponse.json({ error: "Unauthorized operation on SKU." }, { status: 403 });
    }

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
        where: { tenantId: secureTenantId, name: vendorName }
      });

      if (!targetVendor && vendorName !== "HQ") {
        // Auto create vendor if missing (fallback) securely
        targetVendor = await prisma.vendor.create({
          data: { tenantId: secureTenantId, name: vendorName, phone: "N/A" }
        });
      }

      // 3. Create Official Purchase Order in DB
      const po = await prisma.purchaseOrder.create({
        data: {
          outletId: secureOutletId,
          vendorId: targetVendor?.id || "HQ", 
          invoiceNumber: invoiceNo || `PO-${Date.now()}`,
          totalAmount: parseFloat(totalAmount),
          status: paymentMode, 
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
