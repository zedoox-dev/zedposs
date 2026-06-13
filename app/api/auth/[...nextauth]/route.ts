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

        // 🟢 OUTLET LOGIN CONNECTION WITH PRISMA
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

          // Note: Abhi plain text match kar rahe hain. 
          // Future mein yahan bcrypt.compare() use karna best practice hai.
          if (outlet.password !== credentials.password) {
            throw new Error("Invalid Terminal Password.");
          }

          // JWT Token mein ye data save hoga
          return {
            id: outlet.id,
            name: outlet.name,
            email: outlet.email ?? "",
            outletId: outlet.id,
            tenantId: outlet.tenantId,
            role: "OUTLET_TERMINAL"
          };
        }
        return null;
      }
    })
  ],
  callbacks: {
    // 🔒 JWT Token aur Session mein Custom Variables add karna
    async jwt({ token, user }) {
      if (user) {
        token.outletId = (user as any).outletId;
        token.tenantId = (user as any).tenantId;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).outletId = token.outletId;
        (session.user as any).tenantId = token.tenantId;
        (session.user as any).role = token.role;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login", // Unauthorized users yahan aayenge
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
