import { isDatabaseUnavailableError, withDatabaseRetry } from "@/lib/db";
import { type NextRequest } from "next/server";

// GET /api/daily-checkin?userId=xxx — get this week's check-in status
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");
    if (!userId) {
      return Response.json({ error: "userId is required" }, { status: 400 });
    }

    const data = await withDatabaseRetry(async (db) => {
      // Get Monday of current week
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(now);
      monday.setDate(now.getDate() + mondayOffset);
      monday.setHours(0, 0, 0, 0);

      const mondayStr = monday.toISOString().split("T")[0];
      const todayStr = now.toISOString().split("T")[0];

      // Get all check-ins this week
      const checkIns = await db.dailyCheckIn.findMany({
        where: {
          userId,
          date: { gte: mondayStr },
        },
        orderBy: { date: "asc" },
      });

      const checkedDates = checkIns.map((c) => c.date);
      const todayChecked = checkedDates.includes(todayStr);

      // Build 7-day status (Mon=0 to Sun=6)
      const days = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dateStr = d.toISOString().split("T")[0];
        const isClaimed = checkedDates.includes(dateStr);
        const isToday = dateStr === todayStr;
        const isFuture = d > now && !isToday;

        days.push({
          day: isToday ? "Today" : `Day ${i + 1}`,
          date: dateStr,
          bonus: 5,
          status: isClaimed ? "claimed" : isToday ? "today" : isFuture ? "locked" : "missed",
        });
      }

      return {
        days,
        todayChecked,
        totalCheckedThisWeek: checkedDates.length,
      };
    });

    return Response.json(data);
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return Response.json({ error: "Database unreachable" }, { status: 503 });
    }
    console.error("Daily checkin GET error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/daily-checkin — claim today's reward
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = body.userId;
    if (!userId) {
      return Response.json({ error: "userId is required" }, { status: 400 });
    }

    const result = await withDatabaseRetry(async (db) => {
      const todayStr = new Date().toISOString().split("T")[0];

      // Check if already claimed today
      const existing = await db.dailyCheckIn.findUnique({
        where: { userId_date: { userId, date: todayStr } },
      });

      if (existing) {
        return { success: false, message: "Already claimed today" };
      }

      // Create check-in and add ₹5 to balance in a transaction
      await db.$transaction([
        db.dailyCheckIn.create({
          data: { userId, date: todayStr, amount: 5 },
        }),
        db.user.update({
          where: { id: userId },
          data: { balance: { increment: 5 } },
        }),
      ]);

      return { success: true, message: "Reward claimed! +₹5" };
    });

    return Response.json(result);
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return Response.json({ error: "Database unreachable" }, { status: 503 });
    }
    console.error("Daily checkin POST error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
