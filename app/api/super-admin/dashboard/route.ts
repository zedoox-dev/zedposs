import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import os from "os";

export const dynamic = 'force-dynamic'; // Always fetch fresh data

export async function GET() {
  try {
    // 1. Tenant Metrics
    const totalTenants = await prisma.tenant.count({ where: { isDeleted: false } });
    const activeTenants = await prisma.tenant.count({ where: { isActive: true, isDeleted: false } });

    // 2. Revenue & Processing Volume
    const orders = await prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: { status: "COMPLETED", isDeleted: false }
    });
    const platformTPV = orders._sum.totalAmount || 0;

    // 3. Support & Health
    const openTickets = await prisma.supportTicket.count({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] }, isDeleted: false }
    });

    // 4. Recent Onboardings (Latest 5 clients)
    const recentTenants = await prisma.tenant.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, businessName: true, ownerEmail: true, isActive: true, createdAt: true }
    });

    // 5. Recent System Activity (Latest 5 logs)
    const recentActivity = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { tenant: { select: { businessName: true } } }
    });

    // 6. Quick Server Health
    const freeMem = os.freemem();
    const totalMem = os.totalmem();
    const memUsagePercent = (((totalMem - freeMem) / totalMem) * 100).toFixed(1);

    return NextResponse.json({
      success: true,
      metrics: {
        totalTenants,
        activeTenants,
        platformTPV,
        openTickets,
        serverRam: memUsagePercent
      },
      recentTenants,
      recentActivity
    });

  } catch (error: any) {
    console.error("Dashboard Aggregation Error:", error);
    return NextResponse.json({ error: "Failed to load master dashboard data" }, { status: 500 });
  }
}
