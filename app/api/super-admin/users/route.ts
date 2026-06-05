import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

// FETCH ALL PLATFORM USERS (Limit to 1000 for performance)
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: { isDeleted: false },
      include: {
        tenant: { select: { businessName: true } },
        outlet: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 1000 
    });
    
    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch platform users", details: error.message }, { status: 500 });
  }
}

// UPDATE USER ROLE, PASSWORD, OR REVOKE ACCESS
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, action, role, newPassword } = body;

    if (!id || !action) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    if (action === "UPDATE_ROLE") {
      const updatedUser = await prisma.user.update({
        where: { id: id },
        data: { role: role }
      });
      return NextResponse.json({ success: true, user: updatedUser });
    }

    if (action === "RESET_PASSWORD") {
      // PRO-TIP: In a real production environment, always hash this password using bcrypt!
      await prisma.user.update({
        where: { id: id },
        data: { password: newPassword }
      });
      return NextResponse.json({ success: true, message: "Password updated successfully" });
    }

    if (action === "REVOKE_ACCESS") {
      await prisma.user.update({
        where: { id: id },
        data: { isDeleted: true, isActive: false } as any // Soft delete
      });
      return NextResponse.json({ success: true, message: "User access revoked" });
    }

    return NextResponse.json({ error: "Invalid action requested" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: "Operation failed", details: error.message }, { status: 500 });
  }
}
