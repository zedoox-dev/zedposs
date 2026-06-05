import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Path for storing Global Feature Flags
const FEATURES_PATH = path.join(process.cwd(), "features-config.json");

// Default Kill-Switches (All ON by default)
const DEFAULT_FEATURES = {
  posBilling: true,
  inventorySystem: true,
  crmLoyalty: true,
  kitchenDisplay: true,
  qrOrdering: true,
  accountingTally: false, // Premium, off by default
  franchiseModule: true,
  whatsappAlerts: true,
  zomatoSwiggySync: true,
  offlineMode: false // Beta feature
};

export async function GET() {
  try {
    // Check if file exists, if not, create it
    if (!fs.existsSync(FEATURES_PATH)) {
      fs.writeFileSync(FEATURES_PATH, JSON.stringify(DEFAULT_FEATURES, null, 2));
      return NextResponse.json({ success: true, features: DEFAULT_FEATURES });
    }
    
    const fileData = fs.readFileSync(FEATURES_PATH, "utf8");
    return NextResponse.json({ success: true, features: JSON.parse(fileData) });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to load feature flags", details: error.message }, { status: 500 });
  }
}

// TOGGLE A SPECIFIC FEATURE
export async function PUT(req: Request) {
  try {
    const { featureKey, isEnabled } = await req.json();

    if (!featureKey || isEnabled === undefined) {
      return NextResponse.json({ error: "Feature Key and Status required" }, { status: 400 });
    }

    // Read existing
    let currentFeatures = { ...DEFAULT_FEATURES };
    if (fs.existsSync(FEATURES_PATH)) {
      currentFeatures = JSON.parse(fs.readFileSync(FEATURES_PATH, "utf8"));
    }

    // Update specific flag
    currentFeatures[featureKey as keyof typeof currentFeatures] = isEnabled;

    // Save back to file
    fs.writeFileSync(FEATURES_PATH, JSON.stringify(currentFeatures, null, 2));

    return NextResponse.json({ success: true, message: "Feature Updated", features: currentFeatures });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to toggle feature" }, { status: 500 });
  }
}
