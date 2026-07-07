import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: { outletId: string } }) {
  try {
    const { tenantId, userId, title, description, priority } = await req.json();
    const newTicket = await prisma.supportTicket.create({
      data: {
        subject: title,
        description: description,
        priority: priority,
        tenantId: tenantId,
        createdById: userId
      }
    });
    return NextResponse.json({ success: true, data: newTicket });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to create" }, { status: 500 });
  }
}

export async function GET(req: Request, { params }: { params: { outletId: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId");
    const tickets = await prisma.supportTicket.findMany({
      where: { tenantId: tenantId || "" },
      include: { replies: true },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ success: true, data: tickets });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch" }, { status: 500 });
  }
}
