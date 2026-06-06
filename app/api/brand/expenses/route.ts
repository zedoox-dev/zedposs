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

    const expenses = await prisma.expense.findMany({
      where: { ...outletFilter, isDeleted: false },
      include: {
        outlet: { select: { name: true } },
        loggedByUser: { select: { name: true } }
      },
      orderBy: { date: 'desc' }
    });

    return NextResponse.json({ success: true, expenses });
  } catch (error: any) {
    console.error("Expenses Fetch Error:", error);
    return NextResponse.json({ error: "Failed to load expenses" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    const userEmail = session?.user?.email;
    if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const { category, amount, description, date, outletId } = body;

    if (!outletId || outletId === "ALL") {
      return NextResponse.json({ error: "Please select a specific branch to log expense" }, { status: 400 });
    }

    const newExpense = await prisma.expense.create({
      data: {
        category,
        amount: Number(amount),
        description,
        date: new Date(date || Date.now()),
        outletId,
        loggedByUserId: user.id
      }
    });

    return NextResponse.json({ success: true, expense: newExpense });
  } catch (error: any) {
    console.error("Expense Creation Error:", error);
    return NextResponse.json({ error: "Failed to log expense" }, { status: 500 });
  }
}
