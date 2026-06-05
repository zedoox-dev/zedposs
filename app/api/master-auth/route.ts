import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    const CONFIG_PATH = path.join(process.cwd(), "platform-config.json");

    let config: any = {};
    
    // 1. Read existing config if it exists
    if (fs.existsSync(CONFIG_PATH)) {
      config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    }

    // 2. SMART FALLBACK: Agar purani file me masterEmail nahi hai, toh default set karo
    const validEmail = config.masterEmail || "admin@zedposs.com";
    const validPassword = config.masterPassword || "admin";

    // 3. Purani file ko update kar do taaki aage problem na ho
    if (!config.masterEmail) {
      config.masterEmail = validEmail;
      config.masterPassword = validPassword;
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    }

    // 4. Verify Credentials
    if (validEmail === email && validPassword === password) {
      return NextResponse.json({ success: true, message: "Authorized" });
    } else {
      return NextResponse.json({ error: "Invalid Master Credentials" }, { status: 401 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: "Authentication Failed" }, { status: 500 });
  }
}
