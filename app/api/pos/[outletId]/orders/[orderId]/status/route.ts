import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: { outletId: string, orderId: string } }) {
  try {
    const body = await req.json();
    const { status } = body;

    // Database me order ka status update kar rahe hain
    const updatedOrder = await prisma.order.update({
      where: { id: params.orderId },
      data: { status }
    });

    return NextResponse.json({ success: true, data: updatedOrder });
  } catch (error) {
    console.error("Status Update Error:", error);
    return NextResponse.json({ success: false, error: "Failed to update status" }, { status: 500 });
  }
}
