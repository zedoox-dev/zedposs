import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId");

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant verification failed" }, { status: 401 });
    }

    const outlets = await prisma.outlet.findMany({
      where: { tenantId: tenantId, isDeleted: false },
      orderBy: { createdAt: 'asc' }
    });
    
    return NextResponse.json(outlets);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
