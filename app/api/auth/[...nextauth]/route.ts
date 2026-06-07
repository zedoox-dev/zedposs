import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "../../../../lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing credentials");
        }

        // Fetch User and include Role & Tenant from new Schema
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { 
            role: true,     // Custom Dynamic Role mapping
            tenant: true    // Brand connection
          }
        });

        if (!user || user.isDeleted) {
          throw new Error("Account not found or inactive.");
        }

        // In production, compare with bcrypt.compare!
        if (credentials.password !== user.password) {
          throw new Error("Invalid password");
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role?.name || "STAFF",
          permissions: user.role?.permissions || {}, // 🔥 FETCHED FROM DB: Injecting dynamic permissions
          tenantId: user.tenantId,
          tenantName: user.tenant?.businessName || "Brand HQ", // 🔥 FETCHED FROM DB: Injecting actual Brand Name
          outletId: user.outletId
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.permissions = (user as any).permissions; // 🔥 Passing to JWT
        token.tenantId = (user as any).tenantId;
        token.tenantName = (user as any).tenantName;   // 🔥 Passing to JWT
        token.outletId = (user as any).outletId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).permissions = token.permissions; // 🔥 Passing to Frontend Session
        (session.user as any).tenantId = token.tenantId;
        (session.user as any).tenantName = token.tenantName;   // 🔥 Passing to Frontend Session
        (session.user as any).outletId = token.outletId;
      }
      return session;
    }
  },
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  secret: process.env.NEXTAUTH_SECRET || "your_super_secret_key"
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
