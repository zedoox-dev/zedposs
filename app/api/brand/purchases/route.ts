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

    // 2. Fetch Vendors with complete cascading payments
    const vendors = await prisma.vendor.findMany({
      where: { tenantId: user.tenantId, isDeleted: false },
      include: {
        purchases: { 
          where: { isDeleted: false }, 
          include: {
            items: { include: { inventory: { select: { itemName: true, unit: true } } } },
            payments: true
          },
          orderBy: { createdAt: 'asc' }
        },
        _count: { select: { purchases: true } }
      }
    });

    // Extract precise transaction breakdown for individual vendor balances
    for (let i = 0; i < vendors.length; i++) {
      const v = vendors[i];
      const poIds = v.purchases.map(p => p.id);
      
      const allPayments = await prisma.purchasePayment.findMany({
        where: { purchaseOrderId: { in: poIds } },
        orderBy: { date: 'asc' }
      });

      // Inject aggregated payment modes summary inside vendor object dynamically
      (v as any).cashPaid = allPayments.filter(p => p.paymentMode === "CASH").reduce((s, p) => s + p.amount, 0);
      (v as any).bankPaid = allPayments.filter(p => p.paymentMode === "BANK").reduce((s, p) => s + p.amount, 0);
      (v as any).upiPaid = allPayments.filter(p => p.paymentMode === "UPI").reduce((s, p) => s + p.amount, 0);
      (v as any).chequePaid = allPayments.filter(p => p.paymentMode === "CHEQUE").reduce((s, p) => s + p.amount, 0);
      (v as any).totalPaid = allPayments.reduce((s, p) => s + p.amount, 0);
      (v as any).allPayments = allPayments; // Raw thread for individual table logs
    }

    // 3. Fetch Inventory items dropdown mapping
    const inventory = await prisma.inventory.findMany({
      where: outletId !== "ALL" 
        ? { outletId, isDeleted: false, type: { not: 'FINISHED_GOOD' } } 
        : { outlet: { tenantId: user.tenantId }, isDeleted: false, type: { not: 'FINISHED_GOOD' } },
      include: { outlet: { select: { name: true } } },
      orderBy: { itemName: 'asc' }
    });

    return NextResponse.json({ success: true, purchases, vendors, inventory });
  } catch (error: any) {
    console.error("Purchases Master Sync GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch procurement ledger." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    if (!userEmail) return NextResponse.json({ error: "Unauthorized access blocked." }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return NextResponse.json({ error: "Master profile identity mismatch." }, { status: 404 });

    const body = await req.json();
    const { action } = body;

    if (action === "ADD_PO") {
      const { vendorId, outletId, invoiceNumber, paymentMode, notes, items } = body;

      if (!vendorId || !outletId || !items || items.length === 0) {
        return NextResponse.json({ error: "Missing required transactional metrics." }, { status: 400 });
      }

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
        const poPaymentStatus = isCredit ? "UNPAID" : "PAID";
        const amountPaid = isCredit ? 0 : totalAmount;

        const newPO = await tx.purchaseOrder.create({
          data: {
            vendorId, outletId, notes,
            invoiceNumber: invoiceNumber || `INV-${Date.now()}`,
            status: "RECEIVED",
            paymentStatus: poPaymentStatus,
            amountPaid,
            taxAmount,
            discountAmount: 0,
            netAmount: totalAmount - taxAmount,
            totalAmount,
            createdById: user.id
          }
        });

        await tx.purchaseItem.createMany({ 
          data: parsedItems.map(i => ({ ...i, purchaseOrderId: newPO.id })) 
        });

        for (const item of parsedItems) {
          await tx.inventory.update({
            where: { id: item.inventoryId },
            data: { stockLevel: { increment: item.quantity } }
          });
        }

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

    return NextResponse.json({ error: "Invalid operation node context." }, { status: 400 });
  } catch (error: any) {
    console.error("POST Supply Matrix Error:", error);
    return NextResponse.json({ error: "Database mapping transaction rejected." }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Session unauthenticated" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
    if (!user) return NextResponse.json({ error: "User trace rejected" }, { status: 404 });

    const body = await req.json();
    const { action, vendorId, amount, paymentMode, bankName } = body;

    if (action === "SETTLE_VENDOR") {
      const payAmount = parseFloat(amount);
      if (!vendorId || !payAmount || payAmount <= 0) {
        return NextResponse.json({ error: "Invalid payable parameters submitted" }, { status: 400 });
      }

      await prisma.$transaction(async (tx) => {
        // 1. Deduct outstanding from core Vendor profile
        await tx.vendor.update({
          where: { id: vendorId },
          data: { outstandingAmt: { decrement: payAmount } }
        });

        // 2. Cascade across unpaid credits
        const unpaidPOs = await tx.purchaseOrder.findMany({
          where: { vendorId, paymentStatus: { in: ['UNPAID', 'PARTIAL'] }, isDeleted: false },
          orderBy: { createdAt: 'asc' }
        });

        let remaining = payAmount;
        for (const po of unpaidPOs) {
          if (remaining <= 0) break;
          const balance = po.totalAmount - po.amountPaid;
          const apply = Math.min(remaining, balance);
          
          await tx.purchasePayment.create({
            data: {
              purchaseOrderId: po.id,
              amount: apply,
              paymentMode: paymentMode, // CASH, BANK, UPI, CHEQUE saved perfectly
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

        // 3. Auto-Heal Advance Overpayments instantly to prevent missing ledger trace
        if (remaining > 0) {
          const fallbackOutlet = unpaidPOs.length > 0 ? unpaidPOs[0].outletId : (await tx.outlet.findFirst({where: {tenantId: user.tenantId}}))!.id;
          const dummyPO = await tx.purchaseOrder.create({
            data: {
              vendorId, outletId: fallbackOutlet, 
              invoiceNumber: `ADVANCE-CLEAR-${Date.now()}`,
              status: "RECEIVED", paymentStatus: "PAID", amountPaid: remaining,
              totalAmount: 0, netAmount: 0, taxAmount: 0, discountAmount: 0,
              notes: `Direct Settlement Registry Entry [${paymentMode}]`
            }
          });

          await tx.purchasePayment.create({ 
            data: { purchaseOrderId: dummyPO.id, amount: remaining, paymentMode: paymentMode, referenceNo: bankName || null }
          });
        }
      });

      return NextResponse.json({ success: true, message: "Ledger account balanced successfully." });
    }

    return NextResponse.json({ error: "Invalid target operation context." }, { status: 400 });
  } catch (error: any) {
    console.error("PUT Settlement Matrix Error:", error);
    return NextResponse.json({ error: "Financial settlement mapping crashed." }, { status: 500 });
  }
}
