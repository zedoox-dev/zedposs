import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const CONFIG_PATH = path.join(process.cwd(), "platform-config.json");

const DEFAULT_CONFIG = {
  // 👉 ADDED MASTER CREDENTIALS HERE
  masterEmail: "admin@zedposs.com",
  masterPassword: "admin", 
  platformName: "ZedPoss Enterprise",
  supportEmail: "support@zedposs.com",
  supportPhone: "+91-9000000000",
  smtpHost: "smtp.gmail.com",
  smtpPort: "587",
  smtpUser: "",
  smtpPass: "",
  razorpayKey: "",
  razorpaySecret: "",
  stripeKey: "",
  whatsappApiToken: "",
  msg91Key: ""
};

export async function GET() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
      return NextResponse.json({ success: true, config: DEFAULT_CONFIG });
    }
    const fileData = fs.readFileSync(CONFIG_PATH, "utf8");
    return NextResponse.json({ success: true, config: JSON.parse(fileData) });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to load master configuration" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const updatedConfig = await req.json();
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(updatedConfig, null, 2));
    return NextResponse.json({ success: true, message: "Master Settings Updated", config: updatedConfig });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to save configuration to disk" }, { status: 500 });
  }
}
