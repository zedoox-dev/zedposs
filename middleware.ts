import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token as any;
    const path = req.nextUrl.pathname;

    // 1. 🛡️ BLOCK POS STAFF FROM OWNER DASHBOARD
    // Agar user Outlet Terminal ka hai (uske paas outletId hai) aur wo Tenant Dashboard 
    // kholne ki koshish kare, toh use wapas uske terminal par bhej do.
    if (path.startsWith("/dashboard") && token?.outletId) {
      return NextResponse.redirect(new URL(`/pos/${token.outletId}/dashboard`, req.url));
    }

    // 2. 🔒 STRICT OUTLET URL ISOLATION
    if (path.startsWith("/pos/")) {
      const urlOutletId = path.split("/")[2]; // Extract outletId from URL
      
      // Agar Token mein outletId hai (POS Staff), toh ensure karo ki wo sirf apna outlet khol sake
      if (token?.outletId && urlOutletId && urlOutletId !== "login" && urlOutletId !== token.outletId) {
        return NextResponse.redirect(new URL(`/pos/${token.outletId}/dashboard`, req.url));
      }

      // Agar Brand Owner galti se khali `/pos` par jaye bina outlet id ke, toh /dashboard bhej do
      if (!token?.outletId && path === "/pos") {
         return NextResponse.redirect(new URL(`/dashboard`, req.url));
      }
    }
  },
  {
    callbacks: {
      // Agar token nahi hai, toh false return karo aur user automatically /login par chala jayega
      authorized: ({ token }) => !!token, 
    },
    pages: {
      signIn: "/login",
    }
  }
);

// 🛡️ Ye middleware kin pages par chalega?
export const config = {
  matcher: [
    "/pos/:path*",        // /pos ke aage saare pages protected hain
    "/dashboard/:path*",  // Naya Owner Dashboard bhi protect kar diya
  ],
};
