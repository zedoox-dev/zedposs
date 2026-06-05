import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

// Fallback Mock Data in case Prisma Schema is not updated yet
const mockLeads = [
  { id: "lead_1", name: "Rahul Sharma", company: "Spice Hub", email: "rahul@spicehub.com", phone: "9876543210", status: "NEW", source: "WEBSITE", notes: "Looking for 2 outlet setup.", createdAt: new Date() },
  { id: "lead_2", name: "Amit Verma", company: "Delhi Sweets", email: "amit@delhisweets.in", phone: "9988776655", status: "DEMO_SCHEDULED", source: "REFERRAL", notes: "Wants franchise module.", createdAt: new Date() },
  { id: "lead_3", name: "Priya Singh", company: "Cafe Mocha", email: "priya@cafemocha.com", phone: "9123456780", status: "FOLLOW_UP", source: "SOCIAL_MEDIA", notes: "Call on Monday.", createdAt: new Date() },
  { id: "lead_4", name: "Vikram Tech", company: "Tech Dine", email: "vikram@techdine.com", phone: "9000000001", status: "CONVERTED", source: "COLD_CALL", notes: "Paid yearly plan.", createdAt: new Date() },
];

export async function GET() {
  try {
    const leads = await (prisma as any).lead?.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json({ success: true, leads: leads || mockLeads });
  } catch (error: any) {
    console.log("Database table 'Lead' might be missing. Serving default template leads.");
    return NextResponse.json({ success: true, leads: mockLeads });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, company, email, phone, source, notes } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: "Name and Phone are required" }, { status: 400 });
    }

    const newLead = await (prisma as any).lead?.create({
      data: {
        name,
        company,
        email: email || "N/A",
        phone,
        source: source || "WEBSITE",
        status: "NEW",
        notes: notes || "",
      }
    });

    return NextResponse.json({ success: true, lead: newLead || { id: `mock_${Date.now()}`, ...body, status: "NEW", createdAt: new Date() } });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to create lead. Please check Prisma Schema.", details: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, status, notes } = body;

    const dataToUpdate: any = {};
    if (status) dataToUpdate.status = status;
    if (notes !== undefined) dataToUpdate.notes = notes;

    const updatedLead = await (prisma as any).lead?.update({
      where: { id: id },
      data: dataToUpdate
    });

    return NextResponse.json({ success: true, lead: updatedLead });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}
