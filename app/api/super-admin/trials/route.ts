import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  try {
    const trials = await prisma.trialAccount.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json({ success: true, trials });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch trial accounts" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { companyName, email, phone, trialDays } = body;

    if (!companyName || !email || !phone || !trialDays) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    // Calculate End Date based on trial days
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + parseInt(trialDays));

    const newTrial = await prisma.trialAccount.create({
      data: {
        companyName,
        email,
        phone,
        startDate,
        endDate,
        isConverted: false
      }
    });

    return NextResponse.json({ success: true, trial: newTrial });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to create trial account", details: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, action, extendDays } = body;

    if (action === "CONVERT") {
      const updatedTrial = await prisma.trialAccount.update({
        where: { id: id },
        data: { isConverted: true }
      });
      return NextResponse.json({ success: true, trial: updatedTrial });
    }

    if (action === "EXTEND") {
      // Get current trial to add days to its end date
      const currentTrial = await prisma.trialAccount.findUnique({ where: { id } });
      if (!currentTrial) throw new Error("Trial not found");

      const newEndDate = new Date(currentTrial.endDate);
      newEndDate.setDate(newEndDate.getDate() + parseInt(extendDays));

      const updatedTrial = await prisma.trialAccount.update({
        where: { id: id },
        data: { endDate: newEndDate }
      });
      return NextResponse.json({ success: true, trial: updatedTrial });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update trial account" }, { status: 500 });
  }
}
