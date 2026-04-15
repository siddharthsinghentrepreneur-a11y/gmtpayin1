import { isDatabaseUnavailableError, withDatabaseRetry } from "@/lib/db";

// GET /api/admin/referral-rankings — referral leaderboard for admin
export async function GET() {
  try {
    const data = await withDatabaseRetry(async (db) => {
      const users = await db.user.findMany({
        select: {
          id: true,
          uid: true,
          name: true,
          phone: true,
          referralCode: true,
          createdAt: true,
          _count: {
            select: { referrals: true },
          },
          referrals: {
            select: {
              id: true,
              name: true,
              phone: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
          },
          commissionsEarned: {
            select: {
              commissionAmount: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const rankings = users
        .map((user) => {
          const totalReferrals = user._count.referrals;
          const totalCommission = user.commissionsEarned.reduce(
            (sum, c) => sum + c.commissionAmount,
            0,
          );

          // Referrals joined today
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          const todayReferrals = user.referrals.filter(
            (r) => new Date(r.createdAt) >= todayStart,
          ).length;

          // Referrals joined this week
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          weekStart.setHours(0, 0, 0, 0);
          const weekReferrals = user.referrals.filter(
            (r) => new Date(r.createdAt) >= weekStart,
          ).length;

          // Referrals joined this month
          const monthStart = new Date();
          monthStart.setDate(1);
          monthStart.setHours(0, 0, 0, 0);
          const monthReferrals = user.referrals.filter(
            (r) => new Date(r.createdAt) >= monthStart,
          ).length;

          return {
            id: user.id,
            uid: user.uid,
            name: user.name,
            phone: user.phone,
            referralCode: user.referralCode,
            totalReferrals,
            todayReferrals,
            weekReferrals,
            monthReferrals,
            totalCommission,
            recentReferrals: user.referrals.slice(0, 5),
          };
        })
        .filter((u) => u.totalReferrals > 0)
        .sort((a, b) => b.totalReferrals - a.totalReferrals);

      // Summary stats
      const totalUsers = users.length;
      const usersWithReferrals = rankings.length;
      const totalJoinings = rankings.reduce((s, r) => s + r.totalReferrals, 0);
      const todayJoinings = rankings.reduce((s, r) => s + r.todayReferrals, 0);
      const totalCommissions = rankings.reduce(
        (s, r) => s + r.totalCommission,
        0,
      );

      return {
        summary: {
          totalUsers,
          usersWithReferrals,
          totalJoinings,
          todayJoinings,
          totalCommissions,
        },
        rankings,
      };
    });

    return Response.json(data);
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return Response.json(
        { error: "Database temporarily unavailable" },
        { status: 503 },
      );
    }
    console.error("Admin referral rankings error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
