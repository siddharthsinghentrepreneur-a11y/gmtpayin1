import { prisma } from "@/lib/db";
import { generateOrderNo } from "@/lib/order-no";
import { type NextRequest } from "next/server";

// POST /api/usdt-buy — submit a USDT buy order with TX hash + screenshot
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { buyerId, amount, txHash, receiptUrl } = body;

    if (!buyerId) {
      return Response.json({ error: "buyerId is required" }, { status: 400 });
    }

    if (!amount || Number(amount) <= 0) {
      return Response.json({ error: "Valid amount is required" }, { status: 400 });
    }

    if (!txHash || txHash.length < 10) {
      return Response.json(
        { error: "Valid transaction hash is required" },
        { status: 400 }
      );
    }

    const buyer = await prisma.user.findUnique({ where: { id: buyerId } });
    if (!buyer) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const buyOrder = await prisma.buyOrder.create({
      data: {
        orderNo: generateOrderNo("UB"),
        buyerId,
        amount: Number(amount),
        utrNumber: txHash,
        receiptUrl: receiptUrl || "",
        currency: "USDT",
        status: "PENDING",
      },
    });

    return Response.json({ success: true, buyOrder });
  } catch (error) {
    console.error("USDT buy error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
