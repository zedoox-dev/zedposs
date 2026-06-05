import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

// GET ALL SUBSCRIPTION PLANS
export async function GET() {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isDeleted: false },
      include: {
        _count: {
          select: { tenants: true } // Kitne restaurants is plan par hain
        }
      },
      orderBy: { price: 'asc' }
    });
    
    return NextResponse.json({ success: true, plans });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch subscription plans" }, { status: 500 });
  }
}

// CREATE A NEW PLAN
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, price, billingCycle, maxOutlets, maxUsers, features } = body;

    if (!name || price === undefined) {
      return NextResponse.json({ error: "Plan Name and Price are required" }, { status: 400 });
    }

    const newPlan = await prisma.subscriptionPlan.create({
      data: {
        name,
        price: Number(price),
        billingCycle,
        maxOutlets: Number(maxOutlets),
        maxUsers: Number(maxUsers),
        features: JSON.parse(features) // Save as JSON array
      }
    });

    return NextResponse.json({ success: true, plan: newPlan });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to create subscription plan", details: error.message }, { status: 500 });
  }
}

// TOGGLE PLAN STATUS (ACTIVE/INACTIVE)
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, isActive } = body;

    const updatedPlan = await prisma.subscriptionPlan.update({
      where: { id: id },
      data: { isActive: isActive }
    });

    return NextResponse.json({ success: true, plan: updatedPlan });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update plan status" }, { status: 500 });
  }
}
