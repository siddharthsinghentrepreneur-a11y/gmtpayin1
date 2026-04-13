import { NextRequest } from "next/server";
import { withDatabaseRetry } from "@/lib/db";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");

  if (!userId) {
    return Response.json({ error: "userId required" }, { status: 400 });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  try {
    const data = await withDatabaseRetry(async (prisma) => {
      const [buyOrders, sellTransactions] = await Promise.all([
        prisma.buyOrder.findMany({
          where: {
            buyerId: userId,
            createdAt: { gte: todayStart },
          },
          select: { amount: true, status: true, utrNumber: true },
        }),
        prisma.sellTransaction.findMany({
          where: {
            sellerId: userId,
            createdAt: { gte: todayStart },
          },
          select: { amount: true, status: true },
        }),
      ]);

      return { buyOrders, sellTransactions };
    });

    const buyInTransaction = data.buyOrders
      .filter((o) => o.status === "PENDING" && o.utrNumber && o.utrNumber !== "")
      .reduce((sum, o) => sum + o.amount, 0);

    const buySuccess = data.buyOrders
      .filter((o) => o.status === "COMPLETED")
      .reduce((sum, o) => sum + o.amount, 0);

    const sellInTransaction = data.sellTransactions
      .filter((t) => t.status === "PENDING")
      .reduce((sum, t) => sum + t.amount, 0);

    const sellSuccess = data.sellTransactions
      .filter((t) => t.status === "COMPLETED")
      .reduce((sum, t) => sum + t.amount, 0);

    return Response.json({
      todayBuy: { inTransaction: buyInTransaction, success: buySuccess },
      todaySell: { inTransaction: sellInTransaction, success: sellSuccess },
    });
  } catch {
    return Response.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 },
    );
  }
}
