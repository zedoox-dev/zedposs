import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // 🔒 STRICT URL CHECK: Agar user `/pos/123/dashboard` kholne ki koshish kare
    // par uske token mein outletId kuch aur (e.g., 456) hai, toh use block karo
    if (path.startsWith("/pos/") && token?.role === "OUTLET_TERMINAL") {
      const urlOutletId = path.split("/")[2]; // Extract outletId from URL
      
      if (urlOutletId && urlOutletId !== "login" && urlOutletId !== token.outletId) {
        // Redirect back to their correct assigned terminal
        return NextResponse.redirect(new URL(`/pos/${token.outletId}/dashboard`, req.url));
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
    "/dashboard/:path*", 
  ],
};
