import { isDatabaseUnavailableError, withDatabaseRetry } from "@/lib/db";
import { type NextRequest } from "next/server";

// GET /api/team?userId=xxx
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");
    if (!userId) {
      return Response.json({ error: "userId is required" }, { status: 400 });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const data = await withDatabaseRetry(async (db) => {
      // Count all-time direct referrals
      const teamCount = await db.user.count({
        where: { referredById: userId },
      });

      // Count today's new members
      const todayMembers = await db.user.count({
        where: { referredById: userId, createdAt: { gte: todayStart } },
      });

      // Get all commissions earned by this user
      const commissions = await db.referralCommission.findMany({
        where: { referrerId: userId },
        select: {
          commissionAmount: true,
          createdAt: true,
        },
      });

      const totalCommission = commissions.reduce(
        (sum, c) => sum + c.commissionAmount,
        0
      );
      const todayCommission = commissions
        .filter((c) => c.createdAt >= todayStart)
        .reduce((sum, c) => sum + c.commissionAmount, 0);

      // Get referral code for this user
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { referralCode: true },
      });

      return {
        teamCount,
        todayMembers,
        totalCommission: Math.round(totalCommission * 100) / 100,
        todayCommission: Math.round(todayCommission * 100) / 100,
        referralCode: user?.referralCode ?? "",
        commissionRate: 0.5,
      };
    });

    return Response.json(data);
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return Response.json({ error: "Database unreachable" }, { status: 503 });
    }
    console.error("Team API error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
