import { isDatabaseUnavailableError, withDatabaseRetry } from "@/lib/db";
import { generateDummyRanking } from "@/lib/dummy-ranking";
import { type NextRequest } from "next/server";

function getDateRange(period: string) {
  if (period === "all") return null;

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  if (period === "yesterday") {
    const end = new Date(start);
    start.setDate(start.getDate() - 1);
    return { start, end };
  }

  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

// GET /api/ranking?period=today|yesterday|all&userId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const rawPeriod = searchParams.get("period") ?? "all";
    const period = ["today", "yesterday", "all"].includes(rawPeriod) ? rawPeriod : "all";
    const userId = searchParams.get("userId");

    // Check if dummy ranking is enabled
    const dummySetting = await withDatabaseRetry((db) =>
      db.siteSetting.findUnique({ where: { key: "dummy_ranking_enabled" } }),
    );
    const dummyEnabled = dummySetting?.value === "true";

    if (dummyEnabled && period !== "all") {
      const dummyPeriod = period as "today" | "yesterday";
      const dummyLeaderboard = generateDummyRanking(dummyPeriod);

      return Response.json({
        period,
        leaderboard: dummyLeaderboard,
        myEntry: userId
          ? { rank: null, id: userId, uid: "-----", amount: 0 }
          : null,
      });
    }

    const dateRange = getDateRange(period);

    const users = await withDatabaseRetry((db) =>
      db.user.findMany({
        select: {
          id: true,
          uid: true,
          buyOrders: {
            where: {
              status: "COMPLETED",
              ...(dateRange
                ? {
                    createdAt: {
                      gte: dateRange.start,
                      lt: dateRange.end,
                    },
                  }
                : {}),
            },
            select: {
              amount: true,
            },
          },
        },
      }),
    );

    const leaderboard = users
      .map((user) => ({
        id: user.id,
        uid: user.uid ?? "-----",
        amount: user.buyOrders.reduce((sum, order) => sum + order.amount, 0),
      }))
      .filter((user) => user.amount > 0)
      .sort((left, right) => right.amount - left.amount)
      .map((user, index) => ({
        rank: index + 1,
        id: user.id,
        uid: user.uid,
        amount: user.amount,
      }));

    const myEntry = userId
      ? leaderboard.find((entry) => entry.id === userId) ?? {
          rank: null,
          id: userId,
          uid: users.find((user) => user.id === userId)?.uid ?? "-----",
          amount: 0,
        }
      : null;

    return Response.json({
      period,
      leaderboard,
      myEntry,
    });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return Response.json(
        { error: "Server database is currently unreachable. Please try again in a few minutes." },
        { status: 503 },
      );
    }

    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}