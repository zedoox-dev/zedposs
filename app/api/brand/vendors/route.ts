import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getServerSession } from "next-auth/next";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession();
    const userEmail = session?.user?.email;
    if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Fetch vendors for this specific brand
    const vendors = await prisma.vendor.findMany({
      where: { tenantId: user.tenantId, isDeleted: false },
      include: {
        _count: {
          select: { purchaseOrders: true } // How many POs we have done with them
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ success: true, vendors });
  } catch (error: any) {
    console.error("Vendor Fetch Error:", error);
    return NextResponse.json({ error: "Failed to load vendors" }, { status: 500 });
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
    const { name, contactPerson, phone, email, address, gstNumber } = body;

    const newVendor = await prisma.vendor.create({
      data: {
        name,
        contactPerson,
        phone,
        email,
        address,
        gstNumber,
        tenantId: user.tenantId
      }
    });

    return NextResponse.json({ success: true, vendor: newVendor });
  } catch (error: any) {
    console.error("Vendor Creation Error:", error);
    return NextResponse.json({ error: "Failed to create vendor" }, { status: 500 });
  }
}
