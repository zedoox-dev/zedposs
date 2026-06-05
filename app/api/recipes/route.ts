import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

// 1. GET: Saari recipes fetch karne ke liye
export async function GET() {
  try {
    const recipes = await prisma.recipeItem.findMany({
      include: {
        rawMaterial: true // Taki Maida, Tel ka naam bhi sath aaye
      }
    });
    return NextResponse.json(recipes);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch recipes" }, { status: 500 });
  }
}

// 2. POST: Naya BOM/Recipe link banane ke liye
export async function POST(req: Request) {
  try {
    const { menuItemId, rawMaterialId, quantityUsed } = await req.json();

    const newRecipeItem = await prisma.recipeItem.create({
      data: {
        finishedGoodId: menuItemId, 
        rawMaterialId: rawMaterialId,
        quantityUsed: parseFloat(quantityUsed)
      }
    });

    return NextResponse.json({ success: true, recipeItem: newRecipeItem });
  } catch (error: any) {
    return NextResponse.json({ error: "Recipe save failed" }, { status: 500 });
  }
}
