import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

// Middleware/Helper for admin password verification
// Note: In production, compare this securely (e.g., bcrypt compare with admin DB or env variables)
const verifyAdminAuth = (password: string) => {
  const ADMIN_SECRET = process.env.SUPER_ADMIN_PASSWORD || "admin123"; 
  return password === ADMIN_SECRET;
};

// GET ALL SUBSCRIPTION PLANS
export async function GET() {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isDeleted: false },
      include: {
        _count: {
          select: { tenants: true }
        }
      },
      orderBy: { sortOrder: 'asc' } // Sorted by Sort Order now
    });
    
    return NextResponse.json({ success: true, plans });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: "Failed to fetch subscription plans" }, { status: 500 });
  }
}

// CREATE A NEW PLAN
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, price, billingCycle, maxOutlets, maxUsers, maxMenuItems, maxStorageGb, trialDays, sortOrder, features } = body;

    if (!name || price === undefined) {
      return NextResponse.json({ success: false, error: "Plan Name and Price are required" }, { status: 400 });
    }

    const newPlan = await prisma.subscriptionPlan.create({
      data: {
        name: name.toUpperCase(),
        price: Number(price),
        billingCycle,
        maxOutlets: Number(maxOutlets),
        maxUsers: Number(maxUsers),
        maxMenuItems: Number(maxMenuItems),
        maxStorageGb: Number(maxStorageGb),
        trialDays: Number(trialDays),
        sortOrder: Number(sortOrder),
        features: JSON.parse(features)
      }
    });

    return NextResponse.json({ success: true, plan: newPlan });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: "Failed to create subscription plan", details: error.message }, { status: 500 });
  }
}

// UPDATE PLAN (Edit Details or Toggle Status)
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, adminPassword, updateType, ...updateData } = body;

    if (!id) return NextResponse.json({ success: false, error: "Plan ID is required" }, { status: 400 });

    // If it's a full edit, verify password
    if (updateType === 'FULL_EDIT') {
      if (!verifyAdminAuth(adminPassword)) {
        return NextResponse.json({ success: false, error: "Invalid Admin Password. Unauthorized." }, { status: 401 });
      }

      if (updateData.features && typeof updateData.features === 'string') {
        updateData.features = JSON.parse(updateData.features);
      }
      
      // Convert numeric fields properly
      const numericFields = ['price', 'maxOutlets', 'maxUsers', 'maxMenuItems', 'maxStorageGb', 'trialDays', 'sortOrder'];
      numericFields.forEach(field => {
          if (updateData[field] !== undefined) updateData[field] = Number(updateData[field]);
      });
    }

    const updatedPlan = await prisma.subscriptionPlan.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ success: true, plan: updatedPlan });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: "Failed to update plan" }, { status: 500 });
  }
}

// SOFT DELETE PLAN
export async function DELETE(req: Request) {
  try {
    const { id, adminPassword } = await req.json();

    if (!id) return NextResponse.json({ success: false, error: "Plan ID is required" }, { status: 400 });
    
    if (!verifyAdminAuth(adminPassword)) {
      return NextResponse.json({ success: false, error: "Invalid Admin Password. Unauthorized." }, { status: 401 });
    }

    await prisma.subscriptionPlan.update({
      where: { id },
      data: { isDeleted: true }
    });

    return NextResponse.json({ success: true, message: "Plan deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: "Failed to delete plan" }, { status: 500 });
  }
}
