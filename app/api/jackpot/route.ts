import { isDatabaseUnavailableError, withDatabaseRetry } from "@/lib/db";
import { type NextRequest } from "next/server";

const JACKPOT_THRESHOLD = 20000; // ₹20,000 in 2 days
const JACKPOT_MIN = 20;
const JACKPOT_MAX = 5000;

function getTwoDayRange() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 2);
  start.setHours(0, 0, 0, 0);
  return { start, end: now };
}

// GET /api/jackpot?userId=xxx — check eligibility & draw chances
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");
    if (!userId) {
      return Response.json({ error: "userId is required" }, { status: 400 });
    }

    const { start, end } = getTwoDayRange();

    const data = await withDatabaseRetry(async (db) => {
      const orders = await db.buyOrder.findMany({
        where: {
          buyerId: userId,
          status: "COMPLETED",
          createdAt: { gte: start, lt: end },
        },
        select: { amount: true },
      });

      const totalDeposit = orders.reduce((sum, o) => sum + o.amount, 0);
      const drawChances = Math.floor(totalDeposit / JACKPOT_THRESHOLD);

      return { totalDeposit, drawChances };
    });

    return Response.json({
      eligible: data.drawChances > 0,
      totalDeposit: data.totalDeposit,
      drawChances: data.drawChances,
      threshold: JACKPOT_THRESHOLD,
      minPrize: JACKPOT_MIN,
      maxPrize: JACKPOT_MAX,
    });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return Response.json(
        { error: "Server database is currently unreachable." },
        { status: 503 },
      );
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/jackpot — draw the jackpot
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { userId?: string };
    const userId = body.userId;
    if (!userId) {
      return Response.json({ error: "userId is required" }, { status: 400 });
    }

    const { start, end } = getTwoDayRange();

    const result = await withDatabaseRetry(async (db) => {
      const orders = await db.buyOrder.findMany({
        where: {
          buyerId: userId,
          status: "COMPLETED",
          createdAt: { gte: start, lt: end },
        },
        select: { amount: true },
      });

      const totalDeposit = orders.reduce((sum, o) => sum + o.amount, 0);
      const drawChances = Math.floor(totalDeposit / JACKPOT_THRESHOLD);

      if (drawChances <= 0) {
        return { success: false, error: "Not eligible. Recharge ₹20,000 in 2 days to unlock." };
      }

      const prize = 20;

      // Credit the prize to user balance and save record
      await db.user.update({
        where: { id: userId },
        data: { balance: { increment: prize } },
      });

      await db.jackpotWin.create({
        data: { userId, amount: prize },
      });

      return { success: true, prize };
    });

    if (!result.success) {
      return Response.json({ error: result.error }, { status: 403 });
    }

    return Response.json({ success: true, prize: result.prize });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return Response.json(
        { error: "Server database is currently unreachable." },
        { status: 503 },
      );
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
