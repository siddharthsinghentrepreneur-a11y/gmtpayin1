import { isDatabaseUnavailableError, withDatabaseRetry } from "@/lib/db";
import { calculateDepositIncome } from "@/lib/earnings";
import { type NextRequest } from "next/server";

// GET /api/balance-records?userId=xxx
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");
    if (!userId) {
      return Response.json({ error: "userId is required" }, { status: 400 });
    }

    const records = await withDatabaseRetry(async (db) => {
      // Fetch all completed buy orders for this user
      const buyOrders = await db.buyOrder.findMany({
        where: { buyerId: userId, status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          amount: true,
          createdAt: true,
        },
      });

      // Fetch all completed sell transactions (withdrawals) for this user
      const sellTransactions = await db.sellTransaction.findMany({
        where: { sellerId: userId, status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          amount: true,
          createdAt: true,
        },
      });

      // Fetch all daily check-ins for this user
      const checkIns = await db.dailyCheckIn.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          amount: true,
          createdAt: true,
        },
      });

      // Fetch all jackpot wins for this user
      const jackpotWins = await db.jackpotWin.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          amount: true,
          createdAt: true,
        },
      });

      // Fetch all referral commissions earned by this user
      const commissions = await db.referralCommission.findMany({
        where: { referrerId: userId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          commissionAmount: true,
          createdAt: true,
        },
      });

      // Each BuyOrder generates 2 balance records:
      // 1. Recharge (principal amount)
      // 2. Buy Order Rewards (4% + 6)
      const entries: {
        id: string;
        title: string;
        remark: string;
        amount: number;
        type: "income" | "expense";
        category: string;
        date: string;
      }[] = [];

      for (const order of buyOrders) {
        const reward = calculateDepositIncome(order.amount);

        // Recharge entry
        entries.push({
          id: `${order.id}_recharge`,
          title: "Recharge",
          remark: "Recharge",
          amount: order.amount,
          type: "income",
          category: "recharge",
          date: order.createdAt.toISOString(),
        });

        // Buy Order Rewards entry
        entries.push({
          id: `${order.id}_reward`,
          title: "Buy Order Rewards",
          remark: "Buy Order Rewards",
          amount: Math.round(reward * 100) / 100,
          type: "income",
          category: "buy_reward",
          date: order.createdAt.toISOString(),
        });
      }

      // Each completed SellTransaction = Withdrawal expense
      for (const tx of sellTransactions) {
        entries.push({
          id: `${tx.id}_withdraw`,
          title: "Withdrawal",
          remark: "Bank Transfer",
          amount: tx.amount,
          type: "expense",
          category: "withdraw",
          date: tx.createdAt.toISOString(),
        });
      }

      // Each daily check-in = Reward income
      for (const ci of checkIns) {
        entries.push({
          id: `${ci.id}_checkin`,
          title: "Reward",
          remark: "Daily Check-In Reward",
          amount: ci.amount,
          type: "income",
          category: "reward",
          date: ci.createdAt.toISOString(),
        });
      }

      // Each jackpot win = Reward income
      for (const jw of jackpotWins) {
        entries.push({
          id: `${jw.id}_jackpot`,
          title: "Reward",
          remark: "Spin Wheel Reward",
          amount: jw.amount,
          type: "income",
          category: "reward",
          date: jw.createdAt.toISOString(),
        });
      }

      // Each referral commission = Team Commission income
      for (const rc of commissions) {
        entries.push({
          id: `${rc.id}_commission`,
          title: "Team Commission",
          remark: "Referral Commission",
          amount: rc.commissionAmount,
          type: "income",
          category: "team_commission",
          date: rc.createdAt.toISOString(),
        });
      }

      // Sort by date descending (recharge before reward for same order)
      entries.sort((a, b) => {
        const diff = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (diff !== 0) return diff;
        // For same timestamp, show reward first then recharge
        return a.category === "buy_reward" ? -1 : 1;
      });

      return entries;
    });

    return Response.json({ records });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return Response.json({ error: "Database unreachable" }, { status: 503 });
    }
    console.error("Balance records error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
