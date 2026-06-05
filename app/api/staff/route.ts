import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

// 1. GET: Saare staff members ki list laane ke liye
export async function GET(req: Request) {
  try {
    const staff = await prisma.user.findMany({
      orderBy: { role: 'asc' }, // Managers upar dikhenge, Staff niche
      select: { id: true, name: true, role: true, pin: true } // Sirf zaroori data bhejenge security ke liye
    });
    return NextResponse.json(staff);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 });
  }
}

// 2. POST: Naya Staff Member banane ke liye
export async function POST(req: Request) {
  try {
    const { name, pin, role, outletId } = await req.json();

    // Check karein ki ye PIN pehle se kisi aur ka toh nahi hai
    const existingPin = await prisma.user.findFirst({ where: { pin } });
    if (existingPin) {
      return NextResponse.json({ error: "Ye PIN pehle se booked hai! Koi naya 4-digit PIN chunein." }, { status: 400 });
    }

    // Database me email aur password jaruri hai, par hum POS me sirf PIN use karte hain, isliye dummy generate kar denge
    const dummyEmail = `${name.replace(/\s+/g, '').toLowerCase()}${Date.now()}@ramkesar.pos`;

    const newUser = await prisma.user.create({
      data: {
        name,
        email: dummyEmail,
        password: "securestaffpass123", // Backend security ke liye
        pin,
        role: role || "STAFF",
        outletId
      }
    });

    return NextResponse.json({ success: true, user: newUser });
  } catch (error: any) {
    console.error("Staff creation error:", error);
    return NextResponse.json({ error: "Failed to add staff" }, { status: 500 });
  }
}
