import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  try {
    // 100% Real DB Connection. No Mock Data.
    const logs = await prisma.auditLog.findMany({
      include: {
        tenant: { 
          select: { businessName: true, ownerEmail: true } 
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 500 // Performance ke liye sirf latest 500 logs fetch karenge
    });
    
    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    console.error("Audit Logs Fetch Error:", error);
    return NextResponse.json({ error: "Failed to fetch security audit logs", details: error.message }, { status: 500 });
  }
}

// POST endpoint so other system modules can log actions into the DB
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, module, description, ipAddress, tenantId } = body;

    if (!action || !module || !description) {
      return NextResponse.json({ error: "Missing required audit fields" }, { status: 400 });
    }

    const newLog = await prisma.auditLog.create({
      data: {
        action,
        module,
        description,
        ipAddress: ipAddress || "Unknown",
        tenantId: tenantId || null
      }
    });

    return NextResponse.json({ success: true, log: newLog });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to create audit log", details: error.message }, { status: 500 });
  }
}
