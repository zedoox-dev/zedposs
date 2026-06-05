import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getServerSession } from "next-auth/next";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get("outletId") || "ALL";

    const session = await getServerSession();
    const userEmail = session?.user?.email;
    if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const currentUser = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!currentUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Filter Logic: Agar koi specific branch select ki hai, toh sirf wahan ke employees dikhao
    let staffFilter: any = { tenantId: currentUser.tenantId, isDeleted: false };
    if (outletId !== "ALL") {
      staffFilter = {
        ...staffFilter,
        OR: [
          { outletId: outletId }, // Primary Base Branch
          { accessibleOutlets: { some: { outletId: outletId } } } // Has multi-branch access to this branch
        ]
      };
    }

    // 1. Fetch All Staff Matching Filter
    const staff = await prisma.user.findMany({
      where: staffFilter,
      include: {
        role: true,
        outlet: { select: { name: true } },
        accessibleOutlets: { include: { outlet: { select: { name: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 2. Fetch Helper Data for the "Add Staff" Form
    const roles = await prisma.role.findMany({
      where: { tenantId: currentUser.tenantId, isDeleted: false }
    });
    const outlets = await prisma.outlet.findMany({
      where: { tenantId: currentUser.tenantId, isDeleted: false },
      select: { id: true, name: true }
    });

    return NextResponse.json({ success: true, staff, roles, outlets });
  } catch (error: any) {
    console.error("Staff Fetch Error:", error);
    return NextResponse.json({ error: "Failed to load HR data" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    const userEmail = session?.user?.email;
    if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const currentUser = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!currentUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const { name, email, password, pin, roleId, primaryOutletId, multiOutletIds } = body;

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email is already registered" }, { status: 400 });
    }

    // Use Prisma Transaction to create user AND their multi-outlet mappings safely
    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          password,
          pin,
          roleId: roleId || null,
          outletId: primaryOutletId === "NONE" ? null : primaryOutletId,
          tenantId: currentUser.tenantId
        }
      });

      // If they have multi-outlet access (e.g. Area Managers)
      if (multiOutletIds && multiOutletIds.length > 0) {
        const accessData = multiOutletIds.map((oId: string) => ({
          userId: newUser.id,
          outletId: oId
        }));
        await tx.userOutletAccess.createMany({ data: accessData });
      }

      return newUser;
    });

    return NextResponse.json({ success: true, user: result });
  } catch (error: any) {
    console.error("Staff Creation Error:", error);
    return NextResponse.json({ error: "Failed to onboard staff member" }, { status: 500 });
  }
}
