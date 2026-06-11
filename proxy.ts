import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 🔥 FIX: Function ka naam 'proxy' kar diya aur use 'default' export kar diya
export default function proxy(req: NextRequest) {
  // Proxy loop is completely removed. 
  // Authentication is now handled directly on the specific layout/page level.
  return NextResponse.next();
}

export const config = {
  matcher: [], // Empty matcher so proxy doesn't interfere
};
