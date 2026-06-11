import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized access." }, { status: 401 });
    }

    const body = await req.json();
    const { expenseType, amount, paidTo, narration, doar, proofUrl, outletId } = body;

    // 🟢 1. STRICT OUTLET VALIDATION
    const secureOutletId = outletId || (session.user as any).outletId;
    if (!secureOutletId) {
      return NextResponse.json({ success: false, error: "Outlet ID missing from request." }, { status: 400 });
    }

    const dbOutlet = await prisma.outlet.findUnique({
      where: { id: secureOutletId }
    });

    if (!dbOutlet) {
      return NextResponse.json({ success: false, error: `Invalid Outlet! ID [${secureOutletId}] does not exist.` }, { status: 400 });
    }

    // 🟢 2. SMART USER VALIDATION & AUTO-HEAL (Aapke logic ke hisaab se)
    const sessionUserId = (session.user as any).id;
    const sessionEmail = session.user.email || `outlet_${secureOutletId}@system.local`;
    const tenantId = (session.user as any).tenantId || dbOutlet.tenantId;

    let dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(sessionUserId ? [{ id: sessionUserId }] : []),
          { email: sessionEmail }
        ]
      }
    });

    // 🔥 AUTO-HEAL: Agar User DB mein nahi hai, toh is Outlet ko as a User create kardo
    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          name: dbOutlet.name + " Admin",
          email: sessionEmail,
          password: "auto-generated-pos",
          tenantId: tenantId,
          outletId: secureOutletId,
          roleId: null // Role assign nahi kar rahe, bas expense link ke liye banaya hai
        }
      });
    }

    // 🟢 3. VALIDATE AMOUNT
    if (!amount || parseFloat(amount) <= 0) {
      return NextResponse.json({ success: false, error: "Valid amount is required!" }, { status: 400 });
    }

    // 🟢 4. SAFE DB INSERTION
    const structuredDescription = `[PAIDTO:${paidTo || "N/A"}][DOAR:${doar || "N/A"}][NARRATION:${narration || "N/A"}][PROOF:${proofUrl || ""}]`;

    const expense = await prisma.expense.create({
      data: {
        outletId: secureOutletId,       // Strictly mapped to Outlet
        loggedByUserId: dbUser.id,      // Strictly mapped to resolved User
        category: String(expenseType).toUpperCase(),  
        amount: parseFloat(String(amount)),
        description: structuredDescription
      }
    });

    return NextResponse.json({ success: true, expense });

  } catch (error: any) {
    console.error("DETAILED PETTY CASH SAVE ERROR:", error);
    return NextResponse.json({ success: false, error: `DB Error: ${error.message || "Unknown error occurred"}` }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const dateFilter = searchParams.get("date") || "today"; 
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  
  const queryOutletId = searchParams.get("outletId");
  const secureOutletId = queryOutletId || (session.user as any).outletId;

  // Verify Outlet quietly for GET request
  const checkOutlet = await prisma.outlet.findUnique({ where: { id: secureOutletId }});
  if (!checkOutlet) {
     return NextResponse.json({ success: true, expenses: [], cashCollected: 0, warning: "Outlet not found in DB" });
  }

  let dateQuery: any = {};
  const now = new Date();

  if (dateFilter === "today") {
    const start = new Date(now.setHours(0, 0, 0, 0));
    const end = new Date(now.setHours(23, 59, 59, 999));
    dateQuery = { gte: start, lte: end };
  } else if (dateFilter === "yesterday") {
    const start = new Date(now);
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    dateQuery = { gte: start, lte: end };
  } else if (dateFilter === "custom" && startDate && endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    dateQuery = { gte: new Date(startDate), lte: end };
  }

  try {
    const expenses = await prisma.expense.findMany({
      where: { 
        outletId: secureOutletId,
        date: dateQuery,
        isDeleted: false 
      },
      orderBy: { date: 'asc' } 
    });

    const orders = await prisma.order.findMany({
      where: {
        outletId: secureOutletId,
        createdAt: dateQuery,
        isDeleted: false,
        status: "COMPLETED" 
      }
    });

    let calculatedCash = 0;
    
    // 🔥 CASH CALCULATION STRICT LOGIC
    orders.forEach(order => {
      if (order.paymentMode === "CASH") {
        calculatedCash += order.totalAmount;
      } 
      else if (order.paymentMode === "PART" && order.partCash && order.partCash > 0) {
        // Sirf PartCash hi calculate hoga agar PART selected hai
        calculatedCash += order.partCash;
      }
    });

    const unpackToken = (str: string, key: string) => {
      if (!str) return "N/A";
      const match = str.match(new RegExp(`\\[${key}:(.*?)\\]`));
      return match ? match[1] : "N/A";
    };

    const totalCount = expenses.length;

    const mappedExpenses = expenses.map((exp, idx) => {
      const descStr = exp.description || "";
      const isTokenized = descStr.includes("[PAIDTO:");

      return {
        id: exp.id,
        expenseId: 50000 + (totalCount - idx), 
        createdAt: exp.date,
        expenseType: exp.category,
        amount: exp.amount,
        paidTo: isTokenized ? unpackToken(descStr, "PAIDTO") : "-",
        doar: isTokenized ? unpackToken(descStr, "DOAR") : "-",
        narration: isTokenized ? unpackToken(descStr, "NARRATION") : descStr,
        proofUrl: isTokenized ? unpackToken(descStr, "PROOF") : ""
      };
    }).reverse(); 

    return NextResponse.json({
      success: true,
      expenses: mappedExpenses,
      cashCollected: calculatedCash
    });
    
  } catch (error) {
    console.error("Expenses Fetch Error:", error);
    return NextResponse.json({ error: "Fetch logs failed." }, { status: 500 });
  }
}
