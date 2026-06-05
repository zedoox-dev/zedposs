import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto"; // Node.js native crypto module for secure keys

const API_CONFIG_PATH = path.join(process.cwd(), "api-config.json");

const DEFAULT_CONFIG = {
  webhooks: {
    slackAlertsUrl: "",
    zapierIntegrationUrl: "",
    razorpayWebhookSecret: ""
  },
  apiKeys: [] // Format: { id, name, key, createdAt }
};

const getApiConfig = () => {
  if (!fs.existsSync(API_CONFIG_PATH)) {
    fs.writeFileSync(API_CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
    return DEFAULT_CONFIG;
  }
  return JSON.parse(fs.readFileSync(API_CONFIG_PATH, "utf8"));
};

// GET CONFIG
export async function GET() {
  try {
    const config = getApiConfig();
    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to load API configuration" }, { status: 500 });
  }
}

// UPDATE WEBHOOKS
export async function PUT(req: Request) {
  try {
    const { webhooks } = await req.json();
    const config = getApiConfig();
    
    config.webhooks = { ...config.webhooks, ...webhooks };
    fs.writeFileSync(API_CONFIG_PATH, JSON.stringify(config, null, 2));
    
    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update webhooks" }, { status: 500 });
  }
}

// GENERATE NEW API KEY
export async function POST(req: Request) {
  try {
    const { name } = await req.json();
    if (!name) return NextResponse.json({ error: "API Key name is required" }, { status: 400 });

    const config = getApiConfig();
    
    // Generate a secure, random 32-character hex key with a prefix
    const rawKey = crypto.randomBytes(16).toString("hex");
    const newKey = {
      id: crypto.randomUUID(),
      name: name,
      key: `zed_live_${rawKey}`, // Standard SaaS key format
      createdAt: new Date().toISOString()
    };
    
    config.apiKeys.push(newKey);
    fs.writeFileSync(API_CONFIG_PATH, JSON.stringify(config, null, 2));
    
    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to generate API Key" }, { status: 500 });
  }
}

// REVOKE (DELETE) API KEY
export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    const config = getApiConfig();
    
    config.apiKeys = config.apiKeys.filter((k: any) => k.id !== id);
    fs.writeFileSync(API_CONFIG_PATH, JSON.stringify(config, null, 2));
    
    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to revoke API Key" }, { status: 500 });
  }
}
