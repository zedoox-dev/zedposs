import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ROLES_CONFIG_PATH = path.join(process.cwd(), "roles-config.json");

// Granular System Permissions Matrix Default Layout
const DEFAULT_MATRIX = {
  SUPER_ADMIN: {
    viewAnalytics: true,
    manageBilling: true,
    editMenu: true,
    manageInventory: true,
    issueRefunds: true,
    viewAuditLogs: true,
    manageStaff: true
  },
  MANAGER: {
    viewAnalytics: true,
    manageBilling: false,
    editMenu: true,
    manageInventory: true,
    issueRefunds: false,
    viewAuditLogs: false,
    manageStaff: true
  },
  STAFF: {
    viewAnalytics: false,
    manageBilling: false,
    editMenu: false,
    manageInventory: false,
    issueRefunds: false,
    viewAuditLogs: false,
    manageStaff: false
  }
};

const getRolesConfig = () => {
  if (!fs.existsSync(ROLES_CONFIG_PATH)) {
    fs.writeFileSync(ROLES_CONFIG_PATH, JSON.stringify(DEFAULT_MATRIX, null, 2));
    return DEFAULT_MATRIX;
  }
  return JSON.parse(fs.readFileSync(ROLES_CONFIG_PATH, "utf8"));
};

// GET MATRIX
export async function GET() {
  try {
    const matrix = getRolesConfig();
    return NextResponse.json({ success: true, matrix });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to load roles matrix" }, { status: 500 });
  }
}

// UPDATE SPECIFIC PERMISSION TOGGLE
export async function PUT(req: Request) {
  try {
    const { role, permissionKey, isAllowed } = await req.json();

    if (!role || !permissionKey || isAllowed === undefined) {
      return NextResponse.json({ error: "Missing required mapping parameters" }, { status: 400 });
    }

    const currentMatrix = getRolesConfig();

    if (currentMatrix[role]) {
      currentMatrix[role][permissionKey] = isAllowed;
    }

    fs.writeFileSync(ROLES_CONFIG_PATH, JSON.stringify(currentMatrix, null, 2));
    
    return NextResponse.json({ success: true, matrix: currentMatrix });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to modify security matrix" }, { status: 500 });
  }
}	
