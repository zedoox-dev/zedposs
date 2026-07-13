import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId") || "ALL";
    const dateFilter = searchParams.get("date") || "today";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;

    if (!userEmail) return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { tenantId: true }
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Date Filtering Logic
    let dateQuery: any = {};
    const now = new Date();
    if (dateFilter === "today") {
      const start = new Date(now.setHours(0, 0, 0, 0));
      const end = new Date(now.setHours(23, 59, 59, 999));
      dateQuery = { gte: start, lte: end };
    } else if (dateFilter === "yesterday") {
      const start = new Date(now); start.setDate(start.getDate() - 1); start.setHours(0, 0, 0, 0);
      const end = new Date(start); end.setHours(23, 59, 59, 999);
      dateQuery = { gte: start, lte: end };
    } else if (dateFilter === "custom" && startDate && endDate) {
      const end = new Date(endDate); end.setHours(23, 59, 59, 999);
      dateQuery = { gte: new Date(startDate), lte: end };
    }

    let outletFilter = {};
    if (outletId !== "ALL") {
      outletFilter = { outletId: outletId, outlet: { tenantId: user.tenantId } };
    } else {
      outletFilter = { outlet: { tenantId: user.tenantId } };
    }

    const finalWhereClause = { 
      ...outletFilter, 
      isDeleted: false,
      ...(Object.keys(dateQuery).length > 0 ? { date: dateQuery } : {}) 
    };

    // 1. Fetch Purchase Orders (GRNs)
    const purchases = await prisma.purchaseOrder.findMany({
      where: finalWhereClause,
      include: {
        vendor: { select: { name: true } },
        outlet: { select: { name: true } },
        items: { include: { inventory: { select: { itemName: true, unit: true } } } },
        _count: { select: { items: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 2. 🟢 Fetch Vendors with FULL LEDGER (Purchases & Payments)
    const vendors = await prisma.vendor.findMany({
      where: { tenantId: user.tenantId, isDeleted: false },
      include: {
        purchases: { 
          where: { isDeleted: false }, 
          include: {
            items: { include: { inventory: { select: { itemName: true, unit: true } } } },
            payments: true
          },
          orderBy: { date: 'asc' }
        },
        _count: { select: { purchases: true } }
      }
    });

    // 3. 🟢 Fetch Inventory (Exclude Finished Goods to show all raw materials/packing in dropdown)
    const inventory = await prisma.inventory.findMany({
      where: outletId !== "ALL" 
        ? { outletId, isDeleted: false, type: { not: 'FINISHED_GOOD' } } 
        : { outlet: { tenantId: user.tenantId }, isDeleted: false, type: { not: 'FINISHED_GOOD' } },
      include: { outlet: { select: { name: true } } },
      orderBy: { itemName: 'asc' }
    });

    return NextResponse.json({ success: true, purchases, vendors, inventory });
  } catch (error: any) {
    console.error("Purchases Fetch Error:", error);
    return NextResponse.json({ error: "Failed to load purchases" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const { action } = body;

    // ==========================================
    // ACTION: ADD NEW PURCHASE ORDER (GRN)
    // ==========================================
    if (action === "ADD_PO") {
      const { vendorId, outletId, invoiceNumber, paymentMode, notes, items } = body;

      if (!vendorId || !outletId || !items || items.length === 0) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }

      // Calculate Subtotal & Tax correctly
      let totalAmount = 0;
      let taxAmount = 0;
      const parsedItems = items.map((item: any) => {
        const qty = Number(item.quantity) || 0;
        const rate = Number(item.costPrice) || 0;
        const taxPct = Number(item.taxPercent) || 0;
        const subtotal = qty * rate;
        const tax = subtotal * (taxPct / 100);
        
        totalAmount += (subtotal + tax);
        taxAmount += tax;

        return {
          inventoryId: item.inventoryId,
          quantity: qty,
          costPrice: rate,
          taxPercent: taxPct,
          totalAmount: subtotal + tax
        };
      });

      const result = await prisma.$transaction(async (tx) => {
        const isCredit = paymentMode === "CREDIT";
        const poStatus = "RECEIVED";
        const poPaymentStatus = isCredit ? "UNPAID" : "PAID";
        const amountPaid = isCredit ? 0 : totalAmount;

        // 1. Create PO
        const newPO = await tx.purchaseOrder.create({
          data: {
            vendorId, outletId, notes,
            invoiceNumber: invoiceNumber || `INV-${Date.now()}`,
            status: poStatus,
            paymentStatus: poPaymentStatus,
            amountPaid,
            taxAmount,
            discountAmount: 0,
            netAmount: totalAmount - taxAmount,
            totalAmount,
            createdById: user.id
          }
        });

        // 2. Add PO Items
        await tx.purchaseItem.createMany({ 
          data: parsedItems.map(i => ({ ...i, purchaseOrderId: newPO.id })) 
        });

        // 3. Update Inventory Stock Level
        for (const item of parsedItems) {
          await tx.inventory.update({
            where: { id: item.inventoryId },
            data: { stockLevel: { increment: item.quantity } }
          });
        }

        // 4. Handle Payments & Vendor Debt Updates
        if (isCredit) {
          await tx.vendor.update({
            where: { id: vendorId },
            data: { outstandingAmt: { increment: totalAmount } }
          });
        } else {
          await tx.purchasePayment.create({
            data: {
              purchaseOrderId: newPO.id,
              amount: totalAmount,
              paymentMode: paymentMode,
            }
          });
        }

        return newPO;
      });

      return NextResponse.json({ success: true, purchaseOrder: result });
    }

    // ==========================================
    // ACTION: ADD NEW VENDOR
    // ==========================================
    if (action === "ADD_VENDOR") {
      const { name, contactPerson, phone, email, address, gstin, pan, bankName, accountNo, ifsc, outstandingAmt, creditDays } = body;

      const newVendor = await prisma.vendor.create({
        data: {
          tenantId: user.tenantId, name: name.toUpperCase(), contactPerson, phone, email, address, 
          gstin: gstin?.toUpperCase() || null, pan: pan?.toUpperCase() || null, 
          bankName: bankName?.toUpperCase() || null, accountNo, ifsc: ifsc?.toUpperCase() || null,
          outstandingAmt: parseFloat(outstandingAmt) || 0,
          creditDays: parseInt(creditDays) || 0
        }
      });
      return NextResponse.json({ success: true, vendor: newVendor });
    }

    return NextResponse.json({ error: "Invalid Action" }, { status: 400 });

  } catch (error: any) {
    console.error("POST Error:", error);
    return NextResponse.json({ error: "Transaction Failed. Check fields and try again." }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const { action } = body;

    // ==========================================
    // ACTION: SETTLE VENDOR DUES (WITH 100% ACCURATE LEDGER)
    // ==========================================
    if (action === "SETTLE_VENDOR") {
      const { vendorId, amount, paymentMode, bankName } = body;
      const payAmount = parseFloat(amount);

      if (!vendorId || !payAmount || payAmount <= 0) {
        return NextResponse.json({ error: "Invalid Payment Data" }, { status: 400 });
      }

      await prisma.$transaction(async (tx) => {
        // 1. Deduct Vendor Outstanding
        await tx.vendor.update({
          where: { id: vendorId },
          data: { outstandingAmt: { decrement: payAmount } }
        });

        // 2. Find oldest UNPAID POs to map payment
        const unpaidPOs = await tx.purchaseOrder.findMany({
          where: { vendorId, paymentStatus: { in: ['UNPAID', 'PARTIAL'] }, isDeleted: false },
          orderBy: { date: 'asc' }
        });

        let remaining = payAmount;

        // Distribute amount to unpaid POs
        for (const po of unpaidPOs) {
          if (remaining <= 0) break;
          const balance = po.totalAmount - po.amountPaid;
          const apply = Math.min(remaining, balance);
          
          await tx.purchasePayment.create({
            data: {
              purchaseOrderId: po.id,
              amount: apply,
              paymentMode: paymentMode,
              referenceNo: bankName || null
            }
          });

          await tx.purchaseOrder.update({
            where: { id: po.id },
            data: {
              amountPaid: { increment: apply },
              paymentStatus: (po.amountPaid + apply) >= po.totalAmount ? "PAID" : "PARTIAL"
            }
          });
          remaining -= apply;
        }

        // 3. 🟢 THE ULTIMATE FIX: If remaining > 0 (Advance/Overpay), create a Dummy Settlement PO
        if (remaining > 0) {
          const fallbackOutlet = unpaidPOs.length > 0 ? unpaidPOs[0].outletId : (await tx.outlet.findFirst({where: {tenantId: user.tenantId}}))!.id;
          
          const dummyPO = await tx.purchaseOrder.create({
            data: {
              vendorId, 
              outletId: fallbackOutlet, 
              invoiceNumber: `SETTLE-${Date.now()}`,
              status: "RECEIVED", 
              paymentStatus: "PAID", 
              amountPaid: remaining,
              totalAmount: 0, 
              netAmount: 0, 
              taxAmount: 0, 
              discountAmount: 0,
              notes: "Advance Balance Settlement / Due Clearance"
            }
          });

          await tx.purchasePayment.create({ 
            data: { 
              purchaseOrderId: dummyPO.id, 
              amount: remaining, 
              paymentMode: paymentMode,
              referenceNo: bankName || null
            }
          });
        }
      });

      return NextResponse.json({ success: true, message: "Vendor dues settled successfully." });
    }

    return NextResponse.json({ error: "Invalid Action" }, { status: 400 });
  } catch (error: any) {
    console.error("PUT Error:", error);
    return NextResponse.json({ error: "Update Failed" }, { status: 500 });
  }
}
