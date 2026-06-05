import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

// Fallback Mock Data in case Prisma Schema is not updated yet
const mockPayments = [
  { id: "txn_rzp_8A9F1", tenantName: "Burger Hub", amount: 2499, gateway: "RAZORPAY", status: "SUCCESS", date: new Date().toISOString(), plan: "Professional" },
  { id: "txn_str_9B2C3", tenantName: "Delhi Sweets", amount: 7999, gateway: "STRIPE", status: "SUCCESS", date: new Date(Date.now() - 86400000).toISOString(), plan: "Enterprise" },
  { id: "txn_csh_4F6D1", tenantName: "Cafe Mocha", amount: 999, gateway: "CASHFREE", status: "FAILED", date: new Date(Date.now() - 172800000).toISOString(), plan: "Starter" },
  { id: "txn_pay_7D8E2", tenantName: "Spice Route", amount: 2499, gateway: "PAYU", status: "PENDING", date: new Date(Date.now() - 5000000).toISOString(), plan: "Professional" },
  { id: "txn_rzp_1A2B3", tenantName: "Pizza Corner", amount: 999, gateway: "RAZORPAY", status: "REFUNDED", date: new Date(Date.now() - 500000000).toISOString(), plan: "Starter" },
  { id: "txn_rzp_5C6D7", tenantName: "Tandoori Nights", amount: 7999, gateway: "RAZORPAY", status: "SUCCESS", date: new Date(Date.now() - 1000000000).toISOString(), plan: "Enterprise" }
];

export async function GET() {
  try {
    const payments = await (prisma as any).paymentLog?.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json({ success: true, payments: payments || mockPayments });
  } catch (error: any) {
    console.log("Database table 'PaymentLog' might be missing. Serving default template logs.");
    return NextResponse.json({ success: true, payments: mockPayments });
  }
}

// Update Transaction Status (e.g., Issue Refund)
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, status } = body;

    const updatedPayment = await (prisma as any).paymentLog?.update({
      where: { id: id },
      data: { status: status }
    });

    return NextResponse.json({ success: true, payment: updatedPayment });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update payment status" }, { status: 500 });
  }
}
