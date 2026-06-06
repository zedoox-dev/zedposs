import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getServerSession } from "next-auth/next";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Authenticate (Basic check)
    const session = await getServerSession();
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch Campaigns from Database
    const campaigns = await prisma.marketingCampaign.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, campaigns });
  } catch (error: any) {
    console.error("Marketing Fetch Error:", error);
    return NextResponse.json({ error: "Failed to load marketing campaigns" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    const userEmail = session?.user?.email;
    if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const { name, type, targetTier, messageBody, status } = body;

    // Simulate sending messages & calculate recipient count based on CRM
    let sentCount = 0;
    
    if (status === "COMPLETED" || status === "SCHEDULED") {
      // Find matching customers in this Tenant's CRM
      let customerQuery: any = { tenantId: user.tenantId, isDeleted: false };
      
      // If VIP is targeted, assume loyaltyPoints > 50 or they have placed orders
      if (targetTier === "VIP") {
        customerQuery.loyaltyPoints = { gte: 50 }; 
      }

      const matchingCustomersCount = await prisma.customer.count({
        where: customerQuery
      });
      
      sentCount = matchingCustomersCount;
    }

    // Save Campaign to Database
    const newCampaign = await prisma.marketingCampaign.create({
      data: {
        name,
        type,
        targetTier,
        messageBody,
        status,
        sentCount
      }
    });

    return NextResponse.json({ success: true, campaign: newCampaign, targetedCount: sentCount });
  } catch (error: any) {
    console.error("Campaign Creation Error:", error);
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
  }
}
