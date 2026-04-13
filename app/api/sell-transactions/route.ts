import { prisma } from "@/lib/db";
import { type NextRequest } from "next/server";

// GET /api/sell-transactions?sellerId=xxx — get seller's transactions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const sellerId = searchParams.get("sellerId");
    const todayOnly = searchParams.get("today") !== "false";

    if (!sellerId) {
      return Response.json(
        { error: "sellerId is required" },
        { status: 400 }
      );
    }

    const where: Record<string, unknown> = { sellerId };

    if (todayOnly) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      where.createdAt = { gte: today };
    }

    const transactions = await prisma.sellTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const mapped = transactions.map((tx) => ({
      id: tx.id,
      offerId: tx.offerId,
      sellerId: tx.sellerId,
      sellerName: "",
      amount: tx.amount,
      buyerUtr: tx.buyerUtr,
      bank: tx.bank,
      upiId: tx.upiId,
      status: tx.status.toLowerCase(),
      orderNo: tx.orderNo,
      orderTime: tx.orderTime,
      createdAt: tx.createdAt.toISOString(),
    }));

    return Response.json({ transactions: mapped });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
