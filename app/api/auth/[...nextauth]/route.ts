import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 Days active session
  },
  providers: [
    CredentialsProvider({
      name: "Terminal Access",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Terminal credentials are required.");
        }

        // Database call: Fetch User
        const dbUser = await prisma.user.findUnique({ 
          where: { email: credentials.email } 
        });

        if (!dbUser || !dbUser.password) {
          throw new Error("Unauthorized identity detected.");
        }

        // Security: Password verification
        const isPlaintextMatch = credentials.password === dbUser.password;
        let isBcryptMatch = false;
        try {
          isBcryptMatch = await bcrypt.compare(credentials.password, dbUser.password);
        } catch (e) {}

        if (!isPlaintextMatch && !isBcryptMatch) {
          throw new Error("Authentication failed. Invalid credentials.");
        }

        // The Connection Extension: Sending all required IDs to the Frontend
        return {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          tenantId: dbUser.tenantId, // For Multi-Tenant Isolation
          outletId: dbUser.outletId, // For Outlet-wise Billing & Offline DB
          role: dbUser.role,
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.tenantId = (user as any).tenantId;
        token.outletId = (user as any).outletId;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
        (session.user as any).tenantId = token.tenantId;
        (session.user as any).outletId = token.outletId;
        (session.user as any).role = token.role;
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
