import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 🟢 HANDLE QR SALT REGENERATION
    if (body.action === "REGENERATE_SALT") {
      const session = await getServerSession(authOptions);
      if (!session || !session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      
      const secureOutletId = (session.user as any).outletId;
      const outlet = await prisma.outlet.findUnique({ where: { id: secureOutletId } });
      const settings: any = outlet?.generalSettings ? (typeof outlet.generalSettings === 'string' ? JSON.parse(outlet.generalSettings) : outlet.generalSettings) : {};
      
      settings.qrSalt = body.newSalt;
      await prisma.outlet.update({
        where: { id: secureOutletId },
        data: { generalSettings: settings }
      });
      return NextResponse.json({ success: true });
    }

    // 🟢 HANDLE EXPENSE SUBMISSION (Supports both Dashboard & Mobile Form)
    const { expenseType, amount, paidTo, narration, doar, proofUrl, outletId, isMobileEntry } = body;
    const session = await getServerSession(authOptions);

    const secureOutletId = outletId || (session?.user as any)?.outletId;
    if (!secureOutletId) return NextResponse.json({ success: false, error: "Outlet ID missing." }, { status: 400 });

    if (!session?.user && !isMobileEntry) {
      return NextResponse.json({ success: false, error: "Unauthorized access." }, { status: 401 });
    }

    const dbOutlet = await prisma.outlet.findUnique({ where: { id: secureOutletId }, include: { users: true } });
    if (!dbOutlet) return NextResponse.json({ success: false, error: "Invalid Outlet!" }, { status: 400 });

    // Resolve User for loggedById
    let loggedUserId = (session?.user as any)?.id;
    if (!loggedUserId) {
      const fallbackUser = dbOutlet.users[0] || await prisma.user.findFirst({ where: { outletId: secureOutletId } });
      if (fallbackUser) loggedUserId = fallbackUser.id;
      else {
        const dummyUser = await prisma.user.create({
          data: {
            name: "Mobile Entry",
            email: `mobile_${secureOutletId}@system.local`,
            password: "auto",
            tenantId: dbOutlet.tenantId,
            outletId: secureOutletId
          }
        });
        loggedUserId = dummyUser.id;
      }
    }

    if (!amount || parseFloat(amount) <= 0) {
      return NextResponse.json({ success: false, error: "Valid amount is required!" }, { status: 400 });
    }

    // Connect or Create Expense Category
    const catName = String(expenseType).toUpperCase();
    let categoryRecord = await prisma.expenseCategory.findFirst({
      where: { name: catName, tenantId: dbOutlet.tenantId }
    });
    
    if (!categoryRecord) {
      categoryRecord = await prisma.expenseCategory.create({
        data: { name: catName, tenantId: dbOutlet.tenantId, isDefault: true }
      });
    }

    // Exact Schema Mapping
    const expense = await prisma.expense.create({
      data: {
        outletId: secureOutletId,
        loggedById: loggedUserId,
        categoryId: categoryRecord.id,
        amount: parseFloat(String(amount)),
        paidTo: paidTo || null,
        expensedBy: doar || null,
        narration: narration || null,
        proofUrl: proofUrl || null,
        date: new Date()
      }
    });

    return NextResponse.json({ success: true, expense });

  } catch (error: any) {
    console.error("EXPENSE SAVE ERROR:", error);
    return NextResponse.json({ success: false, error: `DB Error: ${error.message}` }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const queryOutletId = searchParams.get("outletId");
  const formOnly = searchParams.get("formOnly");
  const urlSalt = searchParams.get("salt");

  // 🟢 PUBLIC QR FORM VALIDATION LOGIC
  if (formOnly === "true" && queryOutletId) {
    const out = await prisma.outlet.findUnique({ where: { id: queryOutletId } });
    if (!out) return NextResponse.json({ expired: true });

    const settings: any = out.generalSettings ? (typeof out.generalSettings === 'string' ? JSON.parse(out.generalSettings) : out.generalSettings) : {};
    
    // Check if salt matches DB
    if (settings.qrSalt && settings.qrSalt !== urlSalt) {
      return NextResponse.json({ expired: true });
    }
    
    return NextResponse.json({ success: true, outletName: out.name });
  }

  // 🟢 DASHBOARD AUTHENTICATED FETCH
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  
  const secureOutletId = queryOutletId || (session.user as any).outletId;

  let dateQuery: any = {};
  const dateFilter = searchParams.get("date") || "today"; 
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const now = new Date();

  if (dateFilter === "today") {
    dateQuery = { gte: new Date(now.setHours(0, 0, 0, 0)), lte: new Date(now.setHours(23, 59, 59, 999)) };
  } else if (dateFilter === "yesterday") {
    const start = new Date(now); start.setDate(start.getDate() - 1); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setHours(23, 59, 59, 999);
    dateQuery = { gte: start, lte: end };
  } else if (dateFilter === "custom" && startDate && endDate) {
    const end = new Date(endDate); end.setHours(23, 59, 59, 999);
    dateQuery = { gte: new Date(startDate), lte: end };
  }

  try {
    const expenses = await prisma.expense.findMany({
      where: { outletId: secureOutletId, date: dateQuery, isDeleted: false },
      include: { category: true },
      orderBy: { date: 'asc' } 
    });

    const orders = await prisma.order.findMany({
      where: { outletId: secureOutletId, createdAt: dateQuery, isDeleted: false, status: "COMPLETED" }
    });

    let calculatedCash = 0;
    
    // 🔥 STRICT CASH CALCULATION (CASH OR PART/MIXED ONLY) FOR CURRENT FILTER
    orders.forEach(order => {
      if (order.paymentMode === "CASH") {
        calculatedCash += order.totalAmount;
      } 
      else if ((order.paymentMode === "MIXED" || (order.paymentMode as any) === "PART") && order.partCash && order.partCash > 0) {
        calculatedCash += order.partCash;
      }
    });

    // 🔥 LIFETIME CASH BALANCE CALCULATION (ALL TIME)
    const lifetimeExpensesAgg = await prisma.expense.aggregate({
      where: { outletId: secureOutletId, isDeleted: false },
      _sum: { amount: true }
    });

    const lifetimeCashOrdersAgg = await prisma.order.aggregate({
      where: { outletId: secureOutletId, isDeleted: false, status: "COMPLETED", paymentMode: "CASH" },
      _sum: { totalAmount: true }
    });

    const lifetimeMixedOrdersAgg = await prisma.order.aggregate({
      where: { outletId: secureOutletId, isDeleted: false, status: "COMPLETED", paymentMode: "MIXED" },
      _sum: { partCash: true }
    });

    const totalLifetimeExpenses = lifetimeExpensesAgg._sum.amount || 0;
    const totalLifetimeCash = (lifetimeCashOrdersAgg._sum.totalAmount || 0) + (lifetimeMixedOrdersAgg._sum.partCash || 0);
    const lifetimeBalance = totalLifetimeCash - totalLifetimeExpenses;

    const totalCount = expenses.length;
    const mappedExpenses = expenses.map((exp, idx) => ({
      id: exp.id,
      expenseId: 50000 + (totalCount - idx), 
      createdAt: exp.date,
      expenseType: exp.category?.name || "GENERAL",
      amount: exp.amount,
      paidTo: exp.paidTo || "-",
      doar: exp.expensedBy || "-",
      narration: exp.narration || "-",
      proofUrl: exp.proofUrl || ""
    })).reverse(); 

    return NextResponse.json({ 
      success: true, 
      expenses: mappedExpenses, 
      cashCollected: calculatedCash,
      lifetimeBalance: lifetimeBalance // Passed secure lifetime metric to UI
    });
    
  } catch (error) {
    console.error("Expenses Fetch Error:", error);
    return NextResponse.json({ error: "Fetch logs failed." }, { status: 500 });
  }
}
