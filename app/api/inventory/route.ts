import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const formOnly = searchParams.get("formOnly");
  const urlToken = searchParams.get("token");
  const queryOutletId = searchParams.get("outletId");

  // 🟢 PUBLIC MOBILE GRN FORM VALIDATION
  if (formOnly === "true" && queryOutletId) {
    const out = await prisma.outlet.findUnique({ where: { id: queryOutletId } });
    if (!out) return NextResponse.json({ expired: true });

    const settings: any = out.generalSettings ? (typeof out.generalSettings === 'string' ? JSON.parse(out.generalSettings) : out.generalSettings) : {};
    
    // Check if salt matches DB
    if (settings.qrPurchaseToken && settings.qrPurchaseToken !== urlToken) {
      return NextResponse.json({ expired: true });
    }
    
    // Send inventory list for mobile dropdown (Strictly NO MENU ITEMS)
    const inventory = await prisma.inventory.findMany({ 
        where: { outletId: queryOutletId, isDeleted: false, type: { not: "FINISHED_GOOD" } }, 
        select: { id: true, itemName: true, unit: true } 
    });
    
    const vendors = await prisma.vendor.findMany({ 
        where: { tenantId: out.tenantId, isDeleted: false }, 
        select: { name: true } 
    });

    // 🔥 Fetch strict Database Operator Doars for Mobile Form
    const doars = await prisma.operatorDoar.findMany({
      where: { outletId: queryOutletId, isActive: true },
      select: { name: true }
    });

    return NextResponse.json({ 
      success: true, 
      outletName: out.name, 
      inventory, 
      vendors,
      doarList: doars.map(d => d.name)
    });
  }

  // 🔒 STRICT SECURITY: GET SESSION TOKENS FOR DASHBOARD
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

    // 2. Fetch Vendors (Strictly tenantId to avoid FK Crash, but filtered for this UI)
    const vendors = await prisma.vendor.findMany({
      where: { tenantId: secureTenantId, isDeleted: false },
      orderBy: { name: 'asc' }
    });

    const mappedVendors = vendors.map(v => ({ ...v, outstanding: v.outstandingAmt }));

    // 3. Fetch Purchase Orders (GRN Logs) strictly for this outlet
    const purchases = await prisma.purchaseOrder.findMany({
      where: { outletId: secureOutletId, isDeleted: false },
      include: {
        vendor: true,
        items: { include: { inventory: true } } 
      },
      orderBy: { date: 'desc' },
      take: 500 
    });

    const purchaseLogs = purchases.flatMap(po => 
      po.items.map(item => ({
        id: po.id, 
        date: po.date,
        poNumber: po.invoiceNumber || "N/A",
        itemName: item.inventory?.itemName || "Unknown",
        inventoryId: item.inventoryId, 
        unit: item.inventory?.unit || "UNIT",
        qty: item.quantity,
        rate: item.costPrice,
        total: item.totalAmount,
        vendor: po.vendor?.name || "HQ / Unknown",
        paymentMode: po.paymentStatus === "UNPAID" ? "CREDIT" : "CASH", 
        isUrgent: po.notes === "URGENT",
        doar: po.createdById ? "Authorized Staff" : "N/A" 
      }))
    );

    // 🔥 Fetch strict Database Operator Doars for Dashboard Form
    const doars = await prisma.operatorDoar.findMany({
      where: { outletId: secureOutletId, isActive: true },
      select: { name: true }
    });

    return NextResponse.json({ 
      inventory, 
      vendors: mappedVendors, 
      purchaseLogs,
      doarList: doars.map(d => d.name)
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Fetch Error", details: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, itemName, type, unit, stockLevel, minStock, vendorData, newToken, outletId } = body;

    // 🟢 REGENERATE MOBILE GRN TOKEN
    if (action === "REGENERATE_TOKEN") {
      const session = await getServerSession(authOptions);
      if (!session || !session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const secureOutletId = (session.user as any).outletId;
      
      const outlet = await prisma.outlet.findUnique({ where: { id: secureOutletId } });
      const settings: any = outlet?.generalSettings ? (typeof outlet.generalSettings === 'string' ? JSON.parse(outlet.generalSettings) : outlet.generalSettings) : {};
      
      settings.qrPurchaseToken = newToken;
      await prisma.outlet.update({
        where: { id: secureOutletId },
        data: { generalSettings: settings }
      });
      return NextResponse.json({ success: true });
    }

    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const secureOutletId = (session.user as any).outletId;
    const secureTenantId = (session.user as any).tenantId;

    // ACTION: ADD NEW INVENTORY SKU
    if (action === "ADD_SKU") {
      const item = await prisma.inventory.create({
        data: {
          outletId: secureOutletId,
          itemName: String(itemName).toUpperCase(),
          type: String(type) as any,
          unit: String(unit).toUpperCase(),
          stockLevel: parseFloat(stockLevel),
          minStock: parseFloat(minStock)
        }
      });
      return NextResponse.json({ success: true, item });
    }

    // ACTION: ADD NEW VENDOR
    if (action === "ADD_VENDOR") {
      let creditDays = 0;
      if (vendorData.terms === "NET_15") creditDays = 15;
      else if (vendorData.terms === "NET_30") creditDays = 30;

      const newVendor = await prisma.vendor.create({
        data: {
          tenantId: secureTenantId, 
          name: String(vendorData.name).toUpperCase(),
          contactPerson: vendorData.contactPerson,
          phone: vendorData.phone,
          address: vendorData.address,
          gstin: vendorData.gstin,
          creditDays: creditDays,
          outstandingAmt: parseFloat(vendorData.outstanding) || 0
        }
      });
      return NextResponse.json({ success: true, vendor: newVendor });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Inventory Save Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { action, itemId, newStock, purchaseData, outletId, isMobileEntry, token, vendorId, payAmount } = body;

    const session = await getServerSession(authOptions);
    const secureOutletId = outletId || (session?.user as any)?.outletId;

    if (!secureOutletId) return NextResponse.json({ error: "Outlet ID missing." }, { status: 400 });

    if (!session?.user && !isMobileEntry) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const dbOutlet = await prisma.outlet.findUnique({ where: { id: secureOutletId } });
    if (!dbOutlet) return NextResponse.json({ error: "Invalid Outlet." }, { status: 400 });

    // Verify Mobile Token
    if (isMobileEntry) {
      const settings: any = dbOutlet.generalSettings ? (typeof dbOutlet.generalSettings === 'string' ? JSON.parse(dbOutlet.generalSettings) : dbOutlet.generalSettings) : {};
      if (settings.qrPurchaseToken !== token) {
        return NextResponse.json({ error: "Mobile access token expired." }, { status: 403 });
      }
    }

    // 💰 ACTION: SETTLE VENDOR DUES
    if (action === "PAY_VENDOR_DUE" && session?.user) {
      const updatedVendor = await prisma.vendor.update({
        where: { id: vendorId },
        data: { outstandingAmt: { decrement: parseFloat(payAmount) } }
      });
      return NextResponse.json({ success: true, vendor: updatedVendor });
    }

    // 🔥 FULL PRISMA INTEGRATION FOR GRN (PURCHASE ENTRY)
    if (action === "ADD_PURCHASE") {
      const { rate, qty, vendorName, invoiceNo, paymentMode, totalAmount, isUrgent } = purchaseData;

      const targetInventory = await prisma.inventory.findUnique({ where: { id: itemId } });
      if (!targetInventory || targetInventory.outletId !== secureOutletId) {
        return NextResponse.json({ error: "Unauthorized operation on SKU." }, { status: 403 });
      }

      const result = await prisma.$transaction(async (tx) => {
        const item = await tx.inventory.update({
          where: { id: itemId },
          data: { stockLevel: { increment: parseFloat(qty) } }
        });

        let targetVendor = await tx.vendor.findFirst({
          where: { tenantId: dbOutlet.tenantId, name: vendorName }
        });

        if (!targetVendor && vendorName !== "HQ") {
          targetVendor = await tx.vendor.create({
            data: { tenantId: dbOutlet.tenantId, name: vendorName, phone: "N/A" }
          });
        }

        if (paymentMode === "CREDIT" && targetVendor) {
          await tx.vendor.update({
            where: { id: targetVendor.id },
            data: { outstandingAmt: { increment: parseFloat(totalAmount) } }
          });
        }

        const po = await tx.purchaseOrder.create({
          data: {
            outletId: secureOutletId,
            vendorId: targetVendor?.id || (await tx.vendor.findFirst({where: {tenantId: dbOutlet.tenantId}}))!.id, 
            invoiceNumber: invoiceNo || `GRN-${Date.now()}`,
            totalAmount: parseFloat(totalAmount),
            netAmount: parseFloat(totalAmount), 
            status: "RECEIVED", 
            paymentStatus: paymentMode === "CREDIT" ? "UNPAID" : "PAID",
            amountPaid: paymentMode === "CREDIT" ? 0 : parseFloat(totalAmount),
            notes: isUrgent ? "URGENT" : "",
            items: {
              create: [{
                inventoryId: itemId,
                quantity: parseFloat(qty),
                costPrice: parseFloat(rate),
                totalAmount: parseFloat(qty) * parseFloat(rate) 
              }]
            }
          }
        });

        return { item, po };
      });

      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Purchase Error:", error);
    return NextResponse.json({ error: "Update Error", details: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    
    const secureOutletId = (session.user as any).outletId;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const existingItem = await prisma.inventory.findUnique({ where: { id: id } });
    if (!existingItem || existingItem.outletId !== secureOutletId) {
       return NextResponse.json({ error: "Unauthorized deletion attempt blocked." }, { status: 403 });
    }

    await prisma.inventory.update({
      where: { id: id },
      data: { isDeleted: true }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Secure delete failed" }, { status: 500 });
  }
}
