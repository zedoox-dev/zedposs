import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  // Middleware loop is completely removed. 
  // Authentication is now handled directly on the specific layout/page level.
  return NextResponse.next();
}

export const config = {
  matcher: [], // Empty matcher so middleware doesn't interfere
};
