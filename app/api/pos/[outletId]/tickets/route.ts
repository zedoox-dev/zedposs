import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// 📌 TICKET CREATE KARNE KA LOGIC (POST)
export async function POST(req: Request, { params }: { params: { outletId: string } }) {
  try {
    const body = await req.json();
    const { tenantId, userId, title, description, priority } = body;

    // Security Check
    if (!tenantId || !userId) {
      return NextResponse.json({ success: false, error: "Session details (Tenant/User ID) missing!" }, { status: 400 });
    }

    // DB me Data Insert
    const newTicket = await prisma.supportTicket.create({
      data: {
        // Title me automatically Outlet ID append kar diya hai taki admin ko pata chale
        subject: `[Outlet: ${params.outletId}] ${title}`, 
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

// 📌 TICKET FETCH KARNE KA LOGIC (GET)
export async function GET(req: Request, { params }: { params: { outletId: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId");

    if (!tenantId) {
      return NextResponse.json({ success: false, error: "Tenant ID missing" }, { status: 400 });
    }

    // Is tenant ki saari tickets fetch karke laayega (Latest sabse upar)
    const tickets = await prisma.supportTicket.findMany({
      where: { tenantId: tenantId },
      orderBy: { createdAt: 'desc' },
      take: 20 // Performance ke liye top 20 recent tickets
    });

    return NextResponse.json({ success: true, data: tickets });
  } catch (error: any) {
    console.error("Ticket GET Error:", error);
    return NextResponse.json({ success: false, error: "Fetch error: " + error.message }, { status: 500 });
  }
}
