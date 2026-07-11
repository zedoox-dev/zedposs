import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        loginType: { label: "Login Type", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing credentials.");
        }

        // ==========================================
        // 🟢 1. OUTLET LOGIN (EXISTING - UNTOUCHED)
        // ==========================================
        if (credentials.loginType === "OUTLET") {
          const outlet = await prisma.outlet.findFirst({
            where: { 
              email: credentials.email,
              isActive: true,
              isDeleted: false 
            },
          });

          if (!outlet || !outlet.password) {
            throw new Error("Terminal/Outlet not found.");
          }

          if (outlet.password !== credentials.password) {
            throw new Error("Invalid Terminal Password.");
          }

          return {
            id: outlet.id,
            name: outlet.name,
            email: outlet.email ?? "",
            outletId: outlet.id,
            tenantId: outlet.tenantId,
            role: "OUTLET_TERMINAL"
          };
        }

        // ==========================================
        // 🏢 2. TENANT / BRAND OWNER LOGIN (NEW)
        // ==========================================
        if (credentials.loginType === "TENANT") {
          // STRICT DB CONNECTION: Finding User & including their Tenant details
          const user = await prisma.user.findFirst({
            where: { 
              email: credentials.email,
              isActive: true,
              isDeleted: false
            },
            include: {
              tenant: true,
              role: true
            }
          });

          if (!user) {
            throw new Error("Account not found or has been disabled.");
          }

          if (user.password !== credentials.password) {
            throw new Error("Invalid Email or Password.");
          }

          // Check if the overall Brand/Business is active
          if (user.tenant && !user.tenant.isActive) {
            throw new Error("Business account is suspended. Contact Support.");
          }

          // JWT Token mein ye pura owner data save hoga jo layout ko chahiye
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            tenantId: user.tenantId,
            tenantName: user.tenant?.businessName || "Brand HQ",
            ownerName: user.tenant?.ownerName || user.name,
            logoUrl: user.tenant?.logoUrl || user.avatar || "",
            role: user.role?.name || "Brand Owner",
            outletId: user.outletId || "ALL" 
          };
        }

        return null;
      }
    })
  ],
  callbacks: {
    // 🔒 JWT Token aur Session mein Custom Variables merge karna
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.tenantId = (user as any).tenantId;
        token.outletId = (user as any).outletId;
        
        // Only added if it's a Tenant login
        if ((user as any).tenantName) token.tenantName = (user as any).tenantName;
        if ((user as any).ownerName) token.ownerName = (user as any).ownerName;
        if ((user as any).logoUrl) token.logoUrl = (user as any).logoUrl;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).tenantId = token.tenantId;
        (session.user as any).outletId = token.outletId;
        
        // Injecting Tenant data into frontend session
        (session.user as any).tenantName = token.tenantName;
        (session.user as any).ownerName = token.ownerName;
        (session.user as any).logoUrl = token.logoUrl;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login", 
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
