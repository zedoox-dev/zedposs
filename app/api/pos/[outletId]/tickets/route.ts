import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// 📌 CREATE TICKET (POST)
export async function POST(req: Request, { params }: { params: { outletId: string } }) {
  try {
    const body = await req.json();
    let { tenantId, userId, userEmail, title, description, priority } = body;
    const outletId = params.outletId;

    // 🔥 SMART DB RESOLUTION: Agar session me tenantId nahi hai, toh Outlet table se nikalo
    if (!tenantId || tenantId === "undefined") {
      const outlet = await prisma.outlet.findUnique({ where: { id: outletId } });
      if (outlet) tenantId = outlet.tenantId;
    }

    // 🔥 SMART DB RESOLUTION: Agar session me userId nahi hai, toh Email se User table se nikalo
    if (!userId && userEmail) {
      const user = await prisma.user.findUnique({ where: { email: userEmail } });
      if (user) userId = user.id;
    }

    // Final Validation
    if (!tenantId || !userId) {
      return NextResponse.json({ success: false, error: "Database Relation Error: Could not resolve Tenant or User." }, { status: 400 });
    }

    // Database me Insert
    const newTicket = await prisma.supportTicket.create({
      data: {
        subject: `[Outlet: ${outletId}] ${title}`, // Admin ke liye label
        description: description,
        priority: priority,
        tenantId: tenantId,
        createdById: userId,
        category: "GENERAL",
      }
    });

    return NextResponse.json({ success: true, data: newTicket });
  } catch (error: any) {
    console.error("Ticket POST Error:", error);
    return NextResponse.json({ success: false, error: "Database error: " + error.message }, { status: 500 });
  }
}

// 📌 FETCH TICKETS (GET)
export async function GET(req: Request, { params }: { params: { outletId: string } }) {
  try {
    const outletId = params.outletId;
    const { searchParams } = new URL(req.url);
    let tenantId = searchParams.get("tenantId");

    // Smart Resolution
    if (!tenantId || tenantId === "undefined" || tenantId === "") {
      const outlet = await prisma.outlet.findUnique({ where: { id: outletId } });
      if (outlet) tenantId = outlet.tenantId;
    }

    if (!tenantId) {
      return NextResponse.json({ success: false, error: "Tenant ID missing" }, { status: 400 });
    }

    const tickets = await prisma.supportTicket.findMany({
      where: { tenantId: tenantId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    return NextResponse.json({ success: true, data: tickets });
  } catch (error: any) {
    console.error("Ticket GET Error:", error);
    return NextResponse.json({ success: false, error: "Fetch error: " + error.message }, { status: 500 });
  }
}
