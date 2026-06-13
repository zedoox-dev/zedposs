import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET(req: Request) {
  // 🔒 STRICT SECURITY: GET SESSION TOKENS
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized access blocked." }, { status: 401 });
  }

  const secureOutletId = (session.user as any).outletId;

  if (!secureOutletId) {
    return NextResponse.json({ error: "Context IDs missing." }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const dateFilter = searchParams.get("date") || "today"; 
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  let dateQuery: any = {};
  const now = new Date();

  if (dateFilter === "today") {
    const start = new Date(now.setHours(0, 0, 0, 0));
    const end = new Date(now.setHours(23, 59, 59, 999));
    dateQuery = { gte: start, lte: end };
  } else if (dateFilter === "yesterday") {
    const start = new Date(now);
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    dateQuery = { gte: start, lte: end };
  } else if (dateFilter === "custom" && startDate && endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    dateQuery = { gte: new Date(startDate), lte: end };
  }

  try {
    // 1. Fetch Orders (Strictly Outlet Scoped)
    const orders = await prisma.order.findMany({
      where: { 
        outletId: secureOutletId, 
        createdAt: dateQuery, 
        isDeleted: false 
      },
    });

    // 2. 🔥 FETCH EXPENSES (Strictly Outlet Scoped)
    const expenses = await prisma.expense.findMany({
      where: { 
        outletId: secureOutletId, 
        date: dateQuery, 
        isDeleted: false 
      },
    });
    
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    // POS Core Summaries
    let posGrossSales = 0;
    let posTotalDiscount = 0;
    let posTotalPacking = 0;
    let posTotalDelivery = 0;
    let posTotalCgst = 0;
    let posTotalSgst = 0;
    let posOrderCount = 0;

    let totalCash = 0;
    let totalCard = 0;
    let totalComp = 0;

    let dineInSales = 0;
    let deliverySales = 0;
    let pickUpSales = 0;

    let cancelledCount = 0;
    let cancelledValue = 0;

    // Aggregators Setup
    let zomato = { total: 0, tax: 0, discount: 0, charges: 0 };
    let swiggy = { total: 0, tax: 0, discount: 0, charges: 0 };
    let ourApp = { total: 0, tax: 0, discount: 0, charges: 0 };

    orders.forEach((order) => {
      if (order.status === "CANCELLED") {
        cancelledCount++;
        cancelledValue += order.totalAmount;
        return; 
      }

      const isComp = order.paymentMode === "COMPLEMENTARY" || order.isComplementary;

      if (isComp) {
        totalComp += order.totalAmount || 0; 
      } else {
        const isPOS = ["DINE_IN", "DELIVERY", "TAKEAWAY", "PICK_UP"].includes(order.orderType);
        
        if (isPOS) {
          posGrossSales += order.totalAmount;
          posTotalDiscount += order.discountAmount || 0;
          posTotalPacking += order.packingCharges || 0;
          posTotalDelivery += order.deliveryCharges || 0;
          posTotalCgst += order.cgst || 0;
          posTotalSgst += order.sgst || 0;
          posOrderCount++;

          if (order.orderType === "DINE_IN") dineInSales += order.totalAmount;
          else if (order.orderType === "DELIVERY") deliverySales += order.totalAmount;
          else if (order.orderType === "TAKEAWAY" || order.orderType === "PICK_UP") pickUpSales += order.totalAmount;
        } 
        // Aggregator Analytics Map
        else if (order.orderType === "ONLINE_ZOMATO") {
          zomato.total += order.totalAmount;
          zomato.tax += (order.cgst || 0) + (order.sgst || 0);
          zomato.discount += order.discountAmount || 0;
        } 
        else if (order.orderType === "ONLINE_SWIGGY") {
          swiggy.total += order.totalAmount;
          swiggy.tax += (order.cgst || 0) + (order.sgst || 0);
          swiggy.discount += order.discountAmount || 0;
        } 
        else if (order.orderType === "OWN_APP" || order.orderType === "OWN_WEB") {
          ourApp.total += order.totalAmount;
          ourApp.tax += (order.cgst || 0) + (order.sgst || 0);
          ourApp.discount += order.discountAmount || 0;
        }
        
        // Tender Tracking
        if (order.paymentMode === "CASH") totalCash += order.totalAmount;
        else if (order.paymentMode === "CARD" || order.paymentMode === "UPI" || order.paymentMode === "ONLINE_PREPAID") totalCard += order.totalAmount;
        else if (order.paymentMode === "MIXED" || (order.paymentMode as any) === "PART") {
          totalCash += order.partCash || 0;
          totalCard += order.partCard || 0;
        }
      }
    });

    const posNetBaseSales = posGrossSales > 0 ? posGrossSales / 1.05 : 0;
    const posAov = posOrderCount > 0 ? (posGrossSales / posOrderCount) : 0;

    return NextResponse.json({
      success: true,
      summary: {
        grossSales: posGrossSales,
        netBaseSales: posNetBaseSales,
        totalCgst: posTotalCgst > 0 ? posTotalCgst : posNetBaseSales * 0.025,
        totalSgst: posTotalSgst > 0 ? posTotalSgst : posNetBaseSales * 0.025,
        totalDiscount: posTotalDiscount,
        totalPacking: posTotalPacking,
        totalDelivery: posTotalDelivery,
        orderCount: posOrderCount,
        aov: posAov,
        totalExpenses: totalExpenses, 
      },
      payments: {
        cash: totalCash,
        card: totalCard,
      },
      channels: {
        dineIn: dineInSales,
        pickUp: pickUpSales,
        delivery: deliverySales, 
      },
      aggregators: {
        zomato,
        swiggy,
        ourApp
      },
      exceptions: {
        complementaryValue: totalComp,
        cancelledCount,
        cancelledValue,
      }
    });
  } catch (error: any) {
    console.error("Reports Fetch Error:", error);
    return NextResponse.json({ error: "Failed compiling financial metrics.", details: error.message }, { status: 500 });
  }
}
