import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

// GET ALL CAMPAIGNS
export async function GET() {
  try {
    const campaigns = await prisma.marketingCampaign.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json({ success: true, campaigns });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch marketing campaigns", details: error.message }, { status: 500 });
  }
}

// CREATE NEW CAMPAIGN (DRAFT)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, type, targetTier, messageBody } = body;

    if (!name || !type || !messageBody) {
      return NextResponse.json({ error: "Campaign Name, Type and Message are required" }, { status: 400 });
    }

    const newCampaign = await prisma.marketingCampaign.create({
      data: {
        name,
        type,
        targetTier: targetTier || "ALL",
        messageBody,
        status: "DRAFT", // Always create as draft first
        sentCount: 0
      }
    });

    return NextResponse.json({ success: true, campaign: newCampaign });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to create campaign", details: error.message }, { status: 500 });
  }
}

// LAUNCH / UPDATE CAMPAIGN STATUS
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, status } = body;

    let updateData: any = { status };

    // If launching campaign, calculate how many active tenants received it
    if (status === "COMPLETED") {
      const targetTenantsCount = await prisma.tenant.count({ 
        where: { isActive: true, isDeleted: false } 
      });
      updateData.sentCount = targetTenantsCount; 
    }

    const updatedCampaign = await prisma.marketingCampaign.update({
      where: { id: id },
      data: updateData
    });

    return NextResponse.json({ success: true, campaign: updatedCampaign });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to launch campaign" }, { status: 500 });
  }
}
