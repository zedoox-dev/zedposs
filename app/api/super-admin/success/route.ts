import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Fetch all active tenants with their unresolved tickets and latest order activity
    const tenants = await prisma.tenant.findMany({
      where: { isActive: true, isDeleted: false },
      include: {
        plan: true,
        supportTickets: {
          where: { status: { in: ["OPEN", "IN_PROGRESS"] } }
        },
        outlets: {
          include: {
            orders: {
              orderBy: { createdAt: 'desc' },
              take: 1 // Sirf latest order nikalenge activity check karne ke liye
            }
          }
        }
      }
    });

    // Calculate Health Score for each tenant dynamically
    const customerHealthData = tenants.map(tenant => {
      let healthScore = 100;
      let riskFactors: string[] = [];

      // 1. Support Ticket Penalty (-10 points per open ticket)
      const openTicketsCount = tenant.supportTickets.length;
      if (openTicketsCount > 0) {
        healthScore -= (openTicketsCount * 10);
        riskFactors.push(`${openTicketsCount} Unresolved Tickets`);
      }

      // 2. Usage / Activity Penalty (Check last order date across all outlets)
      let lastActivityDate: Date | null = null;
      tenant.outlets.forEach(outlet => {
        if (outlet.orders.length > 0) {
          const orderDate = new Date(outlet.orders[0].createdAt);
          if (!lastActivityDate || orderDate > lastActivityDate) {
            lastActivityDate = orderDate;
          }
        }
      });

      if (!lastActivityDate) {
        healthScore -= 40;
        riskFactors.push("No POS Activity Detected");
      } else {
        const daysSinceLastActivity = Math.floor((Date.now() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceLastActivity > 7) {
          healthScore -= 30;
          riskFactors.push(`Inactive for ${daysSinceLastActivity} days`);
        } else if (daysSinceLastActivity > 3) {
          healthScore -= 10;
        }
      }

      // 3. Ensure score stays between 0 and 100
      healthScore = Math.max(0, Math.min(100, healthScore));

      // 4. Determine Status based on score
      let healthStatus = "HEALTHY";
      if (healthScore <= 40) healthStatus = "CRITICAL";
      else if (healthScore <= 70) healthStatus = "AT_RISK";

      return {
        id: tenant.id,
        name: tenant.businessName,
        email: tenant.ownerEmail,
        plan: tenant.plan?.name || "Custom",
        healthScore,
        healthStatus,
        openTicketsCount,
        lastActivity: lastActivityDate,
        riskFactors
      };
    });

    // Sort by lowest health score first (so admins see critical clients at the top)
    customerHealthData.sort((a, b) => a.healthScore - b.healthScore);

    return NextResponse.json({ success: true, customers: customerHealthData });
  } catch (error: any) {
    console.error("Customer Health Calculation Error:", error);
    return NextResponse.json({ error: "Failed to compile customer success metrics", details: error.message }, { status: 500 });
  }
}
