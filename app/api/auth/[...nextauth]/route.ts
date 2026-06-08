import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "../../../../lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        loginType: { label: "Login Type", type: "text" } // 🔥 NEW: To differentiate Outlet vs Tenant
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing credentials");
        }

        // ==========================================
        // 1. OUTLET LOGIN FLOW (/login)
        // ==========================================
        if (credentials.loginType === "OUTLET") {
          const outlet = await prisma.outlet.findFirst({
            where: { email: credentials.email, isDeleted: false },
            include: { tenant: true }
          });

          if (!outlet) throw new Error("Terminal not found. Check Outlet Email.");
          if (outlet.password !== credentials.password) throw new Error("Invalid terminal password.");
          if (!outlet.isActive) throw new Error("Terminal is suspended.");

          return {
            id: outlet.id,
            name: outlet.name,
            email: outlet.email,
            role: "OUTLET", 
            tenantId: outlet.tenantId,
            tenantName: outlet.tenant?.businessName || "Brand HQ",
            outletId: outlet.id,
            address: outlet.address 
          };
        }

        // ==========================================
        // 2. BRAND OWNER / STAFF LOGIN FLOW (/dashboard)
        // ==========================================
        if (credentials.loginType === "TENANT") {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            include: { role: true, tenant: true }
          });

          if (!user || user.isDeleted) throw new Error("Brand Account not found.");
          if (user.password !== credentials.password) throw new Error("Invalid password.");
          
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role?.name || "STAFF",
            permissions: user.role?.permissions || {},
            tenantId: user.tenantId,
            tenantName: user.tenant?.businessName || "Brand HQ",
            outletId: user.outletId || null
          };
        }

        throw new Error("Invalid Login Flow Request.");
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.permissions = (user as any).permissions;
        token.tenantId = (user as any).tenantId;
        token.tenantName = (user as any).tenantName;
        token.outletId = (user as any).outletId;
        token.address = (user as any).address;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).permissions = token.permissions;
        (session.user as any).tenantId = token.tenantId;
        (session.user as any).tenantName = token.tenantName;
        (session.user as any).outletId = token.outletId;
        (session.user as any).address = token.address;
      }
      return session;
    }
  },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET || "your_super_secret_key"
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
