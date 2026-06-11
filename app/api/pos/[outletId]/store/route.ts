import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: { outletId: string } }) {
  try {
    const outlet = await prisma.outlet.findUnique({
      where: { id: params.outletId },
      include: { tenant: true, region: true }
    });

    if (!outlet) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: outlet });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Fetch Error" }, { status: 500 });
  }
}
