import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

// Mock In-Memory store for Webhook Logs if DB table isn't ready
// Ideally, create a `WebhookLog` model in Prisma.
let mockLogsCache: any[] = [];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const outletId = searchParams.get("outletId");
  
  // Return logs specific to outlet
  const filteredLogs = mockLogsCache.filter(l => l.outletId === outletId);
  return NextResponse.json(filteredLogs.reverse().slice(0, 50));
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const newLog = {
      id: Date.now().toString(),
      time: new Date().toISOString(),
      ...body
    };
    
    mockLogsCache.push(newLog);
    // Keep array size manageable
    if(mockLogsCache.length > 500) mockLogsCache.shift();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to log event" }, { status: 500 });
  }
}
