import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  try {
    // 1. Fetch All Tenants with Plans
    const tenants = await prisma.tenant.findMany({
      where: { isDeleted: false },
      include: {
        plan: true,
        outlets: { select: { id: true, isActive: true } },
        users: { select: { id: true } }
      }
    });

    // 2. Fetch All Orders to calculate Total Processed Volume (TPV)
    // We include outlet to map revenue back to the tenant
    const orders = await prisma.order.findMany({
      where: { status: "COMPLETED", isDeleted: false },
      include: {
        outlet: { select: { tenantId: true } }
      }
    });

    // --- Core Calculations ---
    const totalTenants = tenants.length;
    const activeTenants = tenants.filter(t => t.isActive).length;
    const churnedTenants = totalTenants - activeTenants;
    const churnRate = totalTenants > 0 ? ((churnedTenants / totalTenants) * 100).toFixed(1) : "0.0";

    const totalOutlets = tenants.reduce((sum, t) => sum + t.outlets.length, 0);
    const totalUsers = tenants.reduce((sum, t) => sum + t.users.length, 0);

    // Calculate MRR (Monthly Recurring Revenue) based on Active Tenants' Plans
    let mrr = 0;
    tenants.forEach(t => {
      if (t.isActive && t.plan) {
        if (t.plan.billingCycle === "MONTHLY") mrr += t.plan.price;
        if (t.plan.billingCycle === "YEARLY") mrr += t.plan.price / 12;
      }
    });
    const arr = mrr * 12; // Annual Recurring Revenue

    // Calculate Platform TPV (Total Processed Volume by clients)
    const tpv = orders.reduce((sum, o) => sum + o.totalAmount, 0);

    // Calculate Top Performing Tenants by TPV
    const tenantRevenueMap: Record<string, number> = {};
    orders.forEach(o => {
      const tId = o.outlet?.tenantId;
      if (tId) {
        tenantRevenueMap[tId] = (tenantRevenueMap[tId] || 0) + o.totalAmount;
      }
    });

    // Map revenue back to tenant details
    const topTenants = tenants.map(t => ({
      id: t.id,
      name: t.businessName,
      email: t.ownerEmail,
      status: t.isActive ? "ACTIVE" : "CHURNED",
      plan: t.plan?.name || "No Plan",
      revenue: tenantRevenueMap[t.id] || 0
    })).sort((a, b) => b.revenue - a.revenue).slice(0, 10); // Top 10

    return NextResponse.json({
      success: true,
      metrics: {
        totalTenants,
        activeTenants,
        churnRate,
        totalOutlets,
        totalUsers,
        mrr,
        arr,
        tpv
      },
      topTenants
    });

  } catch (error: any) {
    console.error("Analytics Calculation Error:", error);
    return NextResponse.json({ error: "Failed to compile system analytics", details: error.message }, { status: 500 });
  }
}
