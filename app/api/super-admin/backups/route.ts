import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Define where backups will be stored locally (In production, this would be AWS S3)
const BACKUP_DIR = path.join(process.cwd(), "saas-backups");

// Ensure the directory exists
const ensureDirExists = () => {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
};

// GET ALL BACKUP FILES
export async function GET() {
  try {
    ensureDirExists();
    
    // Read files from the local directory
    const files = fs.readdirSync(BACKUP_DIR);
    
    // Get file details (size, creation date)
    const backups = files.map(file => {
      const filePath = path.join(BACKUP_DIR, file);
      const stats = fs.statSync(filePath);
      return {
        id: file, // use filename as ID
        name: file,
        sizeBytes: stats.size,
        createdAt: stats.birthtime,
      };
    }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // Latest first

    return NextResponse.json({ success: true, backups });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to read backup directory", details: error.message }, { status: 500 });
  }
}

// CREATE A NEW MANUAL BACKUP
export async function POST() {
  try {
    ensureDirExists();

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `zedposs_db_backup_${timestamp}.sql.gz`;
    const filePath = path.join(BACKUP_DIR, fileName);

    // In a real environment, you would run `pg_dump` via child_process here.
    // For now, we simulate the backup file creation by writing dummy data.
    const mockSqlData = `-- ZedPoss SaaS Database Backup\n-- Date: ${timestamp}\n-- This is a simulated compressed backup file.\n`;
    
    // Adding some fake padding to simulate file size (approx 2MB)
    const padding = Buffer.alloc(1024 * 1024 * 2, 'z'); 
    
    fs.writeFileSync(filePath, Buffer.concat([Buffer.from(mockSqlData), padding]));

    return NextResponse.json({ success: true, message: "Backup generated successfully", fileName });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to generate backup", details: error.message }, { status: 500 });
  }
}

// DELETE A BACKUP
export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { fileName } = body;

    if (!fileName) return NextResponse.json({ error: "Filename is required" }, { status: 400 });

    const filePath = path.join(BACKUP_DIR, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return NextResponse.json({ success: true, message: "Backup deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to delete backup" }, { status: 500 });
  }
}
