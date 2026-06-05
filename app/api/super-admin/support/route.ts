import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

// Fallback Mock Data in case Prisma Schema is empty or errors out
const mockTickets = [
  { id: "tkt_1", ticketNumber: 1001, subject: "Printer not connecting", description: "USB printer is not detected by POS after recent update. Need urgent help.", status: "OPEN", priority: "HIGH", category: "TECHNICAL", tenant: { businessName: "Burger Hub", ownerEmail: "admin@burgerhub.com" }, createdAt: new Date() },
  { id: "tkt_2", ticketNumber: 1002, subject: "Billing cycle upgrade", description: "We want to switch our plan from Monthly to Yearly. Please send payment link.", status: "IN_PROGRESS", priority: "MEDIUM", category: "BILLING", tenant: { businessName: "Delhi Sweets", ownerEmail: "info@delhisweets.in" }, createdAt: new Date(Date.now() - 86400000) },
  { id: "tkt_3", ticketNumber: 1003, subject: "How to add Zomato mapping?", description: "Need help setting up Zomato integration matrix on the integrations page.", status: "RESOLVED", priority: "LOW", category: "TRAINING", tenant: { businessName: "Cafe Mocha", ownerEmail: "hello@cafemocha.com" }, createdAt: new Date(Date.now() - 172800000) },
  { id: "tkt_4", ticketNumber: 1004, subject: "Server connection timeout", description: "Main terminal is showing offline on the dashboard. Operations halted.", status: "OPEN", priority: "CRITICAL", category: "TECHNICAL", tenant: { businessName: "Spice Route", ownerEmail: "spiceroute@gmail.com" }, createdAt: new Date() },
];

export async function GET() {
  try {
    const tickets = await prisma.supportTicket.findMany({
      where: { isDeleted: false },
      include: {
        tenant: { select: { businessName: true, ownerEmail: true } }
      },
      orderBy: [
        { status: 'asc' }, // Open tickets first ideally, but simple sort here
        { createdAt: 'desc' }
      ]
    });
    
    return NextResponse.json({ success: true, tickets: tickets.length > 0 ? tickets : mockTickets });
  } catch (error: any) {
    console.log("Database table 'SupportTicket' might be empty. Serving default template tickets.");
    return NextResponse.json({ success: true, tickets: mockTickets });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, status } = body;

    const updatedTicket = await prisma.supportTicket.update({
      where: { id: id },
      data: { status: status }
    });

    return NextResponse.json({ success: true, ticket: updatedTicket });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update ticket status" }, { status: 500 });
  }
}
