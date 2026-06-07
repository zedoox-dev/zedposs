import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function POST(req: Request) {
  try {
    const { pin, outletId } = await req.json();

    // 2. PIN match logic with new Schema mapping
    const user = await prisma.user.findFirst({
      where: { 
        pin: pin, 
        isDeleted: false 
      },
      include: {
        role: true // Include relation to get role name dynamically
      }
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
    }

    return NextResponse.json({ 
      success: true, 
      user: { 
        name: user.name, 
        role: user.role?.name || "STAFF",
        outletId: user.outletId 
      } 
    });

  } catch (error: any) {
    console.error("Login Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
