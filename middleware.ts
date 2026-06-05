import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/pos")) {
    // Handling specific routing redirect hook
    if (pathname === "/pos/redirect") {
      if (!token) return NextResponse.redirect(new URL("/login", req.url));
      return NextResponse.redirect(new URL(`/pos/${token.outletId}/dashboard`, req.url));
    }

    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const userOutletId = token.outletId as string;
    const pathParts = pathname.split("/");
    const requestedOutletId = pathParts[2]; 

    if (requestedOutletId && requestedOutletId !== userOutletId) {
      return NextResponse.redirect(new URL(`/pos/${userOutletId}/dashboard`, req.url));
    }
  }

  if (pathname === "/login" && token) {
    return NextResponse.redirect(new URL(`/pos/${token.outletId}/dashboard`, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/pos/:path*", "/login"],
};
