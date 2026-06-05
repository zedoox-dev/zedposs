import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  try {
    const masterEmail = "admin@zedposs.com";
    const masterPassword = "MasterPassword@123"; // Aap ise baad me change kar sakte hain

    // 1. Check agar master pehle se bana hua hai
    const existingUser = await prisma.user.findUnique({
      where: { email: masterEmail }
    });

    if (existingUser) {
      return NextResponse.json({ 
        success: true, 
        message: "Master account pehle se maujood hai. Aap /master-login par ja sakte hain." 
      });
    }

    // 2. Prisma Transaction se Master Tenant aur User banayenge
    const result = await prisma.$transaction(async (tx) => {
      // Create Platform HQ Tenant
      const hqTenant = await tx.tenant.create({
        data: {
          businessName: "ZedPoss Platform HQ",
          ownerEmail: masterEmail,
          isActive: true,
        }
      });

      // Create Master User
      const hqUser = await tx.user.create({
        data: {
          name: "Upendra Yadav",
          email: masterEmail,
          password: masterPassword, 
          role: "SUPER_ADMIN",
          pin: "0000",
          tenantId: hqTenant.id,
        }
      });

      return { hqTenant, hqUser };
    });

    return NextResponse.json({ 
      success: true, 
      message: "🔥 God Mode Account Created Successfully!",
      credentials: {
        login_url: "/master-login",
        email: result.hqUser.email,
        password: masterPassword
      }
    });

  } catch (error: any) {
    console.error("Setup Error:", error);
    return NextResponse.json({ error: "Failed to setup master account", details: error.message }, { status: 500 });
  }
}
