import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET(req: Request) {
  // 🔒 STRICT SECURITY: GET SESSION TOKENS
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const secureTenantId = (session.user as any).tenantId;

  if (!secureTenantId) {
    return NextResponse.json({ error: "Authentication details missing." }, { status: 400 });
  }

  try {
    // Fetch logs using the AuditLog architecture for the specific Tenant
    const logs = await prisma.auditLog.findMany({
      where: { 
        tenantId: secureTenantId,
        module: { startsWith: 'INTEGRATION_' } 
      },
      orderBy: { createdAt: 'desc' },
      take: 50 // Limit to latest 50 logs for performance
    });

    // Formatting it to match the Frontend UI requirements smoothly
    const formattedLogs = logs.map(l => ({
      status: l.action.includes('SUCCESS') ? 'SUCCESS' : (l.action.includes('FAILED') ? 'FAILED' : 'SUCCESS'),
      platform: l.module.replace('INTEGRATION_', ''),
      event: l.action.split('_')[0] || l.action,
      time: l.createdAt,
      details: l.description
    }));

    return NextResponse.json(formattedLogs);
  } catch (error: any) {
    return NextResponse.json({ error: "Fetch Error", details: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const secureTenantId = (session.user as any).tenantId;
    const body = await req.json();
    const { platform, event, status, details } = body;

    // Securely writing logs to the database preventing cross-tenant leakage
    await prisma.auditLog.create({
      data: {
        action: `${event}_${status}`,
        module: `INTEGRATION_${platform}`,
        description: details,
        tenantId: secureTenantId // 🔒 Locked
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Log save failed", details: error.message }, { status: 500 });
  }
}
