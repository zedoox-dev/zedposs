import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export async function POST(req: Request) {
  try {
    // 🔒 STRICT SECURITY: FETCH IDs FROM BACKEND SESSION TOKEN
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized terminal access blocked." }, { status: 401 });
    }

    const secureOutletId = (session.user as any).outletId;
    const secureUserId = (session.user as any).id; // For loggedByUserId

    if (!secureOutletId || !secureUserId) {
      return NextResponse.json({ error: "Authentication IDs missing. Connection refused." }, { status: 400 });
    }

    const body = await req.json();
    const { expenseType, amount, paidTo, narration, doar, proofUrl } = body;

    if (!amount || parseFloat(amount) <= 0) {
      return NextResponse.json({ success: false, error: "Valid amount is required!" }, { status: 400 });
    }

    // 🔥 SCHEMA SAFELY PRESERVED: Packing high-tech variables into description
    const structuredDescription = `[PAIDTO:${paidTo || "N/A"}][DOAR:${doar || "N/A"}][NARRATION:${narration || "N/A"}][PROOF:${proofUrl || ""}]`;

    const expense = await prisma.expense.create({
      data: {
        outletId: secureOutletId, // 🔒 Strictly isolated to the logged-in outlet
        category: String(expenseType).toUpperCase(),  
        amount: parseFloat(String(amount)),
        description: structuredDescription,                 
        loggedByUserId: secureUserId // 🔒 Strictly isolated to the logged-in user                 
      }
    });

    return NextResponse.json({ success: true, expense });
  } catch (error: any) {
    console.error("DETAILED PETTY CASH SAVE ERROR:", error);
    return NextResponse.json({ success: false, error: "Database save transaction failed.", details: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  // 🔒 STRICT SECURITY: GET SESSION OUTLET ID
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const secureOutletId = (session.user as any).outletId;

  const { searchParams } = new URL(req.url);
  const dateFilter = searchParams.get("date") || "today"; 
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

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
        outletId: secureOutletId, // 🔒 Data completely restricted to this specific outlet
        date: dateQuery,
        isDeleted: false 
      },
      orderBy: { date: 'asc' } 
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

    return NextResponse.json(mappedExpenses);
  } catch (error) {
    return NextResponse.json({ error: "Fetch matrix configuration logs failed." }, { status: 500 });
  }
}
