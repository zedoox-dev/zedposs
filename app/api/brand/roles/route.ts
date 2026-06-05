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

    const roles = await prisma.role.findMany({
      where: { tenantId: user.tenantId, isDeleted: false },
      include: { _count: { select: { users: true } } }, // Get count of users under each role
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json({ success: true, roles });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch roles" }, { status: 500 });
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
    const { name, description, permissions } = body;

    const newRole = await prisma.role.create({
      data: {
        name,
        description,
        permissions: permissions || {}, // JSON Object mapping view, edit, add, delete
        isSystem: false, // Custom created roles are never system locked
        tenantId: user.tenantId
      }
    });

    return NextResponse.json({ success: true, role: newRole });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to create role" }, { status: 500 });
  }
}
