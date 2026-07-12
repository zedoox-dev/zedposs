import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export const dynamic = "force-dynamic";

// 🔐 Secret Key for TV Display Authentication
const KDS_SECRET = "ZAPPED_KDS_SECURE_2026";

// Helper to validate TV Token
const validateToken = (outletId: string, token: string) => {
  try {
    const expectedToken = Buffer.from(`${outletId}:${KDS_SECRET}`).toString('base64');
    return token === expectedToken;
  } catch (e) {
    return false;
  }
};

// GET LIVE ACTIVE ORDERS
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId") || "ALL";
    const token = searchParams.get("token"); // For Smart TV bypass

    let secureTenantId = null;

    // 1. Authenticate (Check Token for TV, else check Session for Dashboard)
    if (token && outletId !== "ALL") {
      if (!validateToken(outletId, token)) {
        return NextResponse.json({ error: "Invalid TV Display Token" }, { status: 401 });
      }
    } else {
      const session = await getServerSession(authOptions);
      const userEmail = session?.user?.email;
      if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const user = await prisma.user.findUnique({ where: { email: userEmail } });
      if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
      secureTenantId = user.tenantId;
    }

    // 2. Set Filters
    let outletFilter = {};
    if (outletId !== "ALL") {
      outletFilter = secureTenantId 
        ? { outletId: outletId, outlet: { tenantId: secureTenantId } } 
        : { outletId: outletId };
    } else {
      outletFilter = { outlet: { tenantId: secureTenantId } };
    }

    // 3. Fetch active tickets with complete item details
    const liveOrders = await prisma.order.findMany({
      where: { 
        ...outletFilter, 
        isDeleted: false,
        status: { notIn: ["COMPLETED", "CANCELLED"] } // Fetch only active tickets
      },
      include: {
        outlet: { select: { name: true } },
        items: { include: { menuItem: { select: { name: true } } } }
      },
      orderBy: { createdAt: 'asc' } // Oldest first (First In, First Out)
    });

    return NextResponse.json({ success: true, liveOrders });
  } catch (error: any) {
    console.error("KDS Fetch Error:", error);
    return NextResponse.json({ error: "Failed to load KDS data" }, { status: 500 });
  }
}

// UPDATE ORDER STATUS (e.g. PENDING -> PREPARING -> READY)
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { orderId, newStatus, token, outletId } = body;

    if (!orderId || !newStatus) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // Auth Check for Updating
    if (token && outletId) {
      if (!validateToken(outletId, token)) {
        return NextResponse.json({ error: "Invalid TV Token" }, { status: 401 });
      }
    } else {
      const session = await getServerSession(authOptions);
      if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: newStatus }
    });

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error: any) {
    console.error("KDS Update Error:", error);
    return NextResponse.json({ error: "Failed to update order status" }, { status: 500 });
  }
}
