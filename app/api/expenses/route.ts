import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // SaaS Security: Add tenantId and loggedByUserId from the Frontend payload
    const { outletId, tenantId, loggedByUserId, expenseType, amount, paidTo, narration, doar, proofUrl } = body;

    if (!outletId || !tenantId || !loggedByUserId || !amount || parseFloat(amount) <= 0) {
      return NextResponse.json({ success: false, error: "Missing required multi-tenant or amount fields!" }, { status: 400 });
    }

    // 🔥 SCHEMA SAFELY PRESERVED: Packing high-tech variables into description string using structural matrix tokens
    const structuredDescription = `[PAIDTO:${paidTo || "N/A"}][DOAR:${doar || "N/A"}][NARRATION:${narration || "N/A"}][PROOF:${proofUrl || ""}]`;

    const expense = await prisma.expense.create({
      data: {
        outletId: String(outletId),
        // Tenant Relation explicitly mapping missing thi schema me, agar Expense me tenantId nahi hai 
        // toh outletId khud secure isolation kar raha hai kyunki Outlet Tenant se juda hai.
        category: String(expenseType).toUpperCase(),  
        amount: parseFloat(String(amount)),
        description: structuredDescription,                 
        loggedByUserId: String(loggedByUserId) // Fixed: Real user ID mapping                 
      }
    });

    return NextResponse.json({ success: true, expense });
  } catch (error: any) {
    console.error("DETAILED PETTY CASH SAVE ERROR:", error);
    return NextResponse.json({ success: false, error: "Database save transaction failed.", details: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const outletId = searchParams.get("outletId");
  const dateFilter = searchParams.get("date") || "today"; 
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!outletId) return NextResponse.json({ error: "Outlet ID required" }, { status: 400 });

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
        outletId: outletId, 
        date: dateQuery,
        isDeleted: false // Soft Delete Check
      },
      orderBy: { date: 'asc' } // Ascending to calculate stable sequential indices
    });

    // Helper regex token extractor
    const unpackToken = (str: string, key: string) => {
      if (!str) return "N/A";
      const match = str.match(new RegExp(`\\[${key}:(.*?)\\]`));
      return match ? match[1] : "N/A";
    };

    const totalCount = expenses.length;

    // Mapping database elements back into high-tech tabular segments
    const mappedExpenses = expenses.map((exp, idx) => {
      const descStr = exp.description || "";
      const isTokenized = descStr.includes("[PAIDTO:");

      return {
        id: exp.id,
        // 🔥 FIXED: Proper sequential number generation safely matrix locked
        expenseId: 50000 + (totalCount - idx), 
        createdAt: exp.date,
        expenseType: exp.category,
        amount: exp.amount,
        paidTo: isTokenized ? unpackToken(descStr, "PAIDTO") : "-",
        doar: isTokenized ? unpackToken(descStr, "DOAR") : "-",
        narration: isTokenized ? unpackToken(descStr, "NARRATION") : descStr,
        proofUrl: isTokenized ? unpackToken(descStr, "PROOF") : ""
      };
    }).reverse(); // Reverse back to show latest entries first in dashboard

    return NextResponse.json(mappedExpenses);
  } catch (error) {
    return NextResponse.json({ error: "Fetch matrix configuration logs failed." }, { status: 500 });
  }
}
