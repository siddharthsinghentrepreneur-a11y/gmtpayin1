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
      // Get all direct referrals with their details
      const referrals = await db.user.findMany({
        where: { referredById: userId },
        select: {
          id: true,
          uid: true,
          phone: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });

      // Get all commissions earned by this user, grouped by fromUserId
      const commissions = await db.referralCommission.findMany({
        where: { referrerId: userId },
        select: {
          fromUserId: true,
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

      // Build commission map per referred user
      const commissionByUser: Record<string, number> = {};
      for (const c of commissions) {
        commissionByUser[c.fromUserId] = (commissionByUser[c.fromUserId] || 0) + c.commissionAmount;
      }

      // Build members list
      const members = referrals.map((r) => ({
        id: r.id,
        uid: r.uid || "—",
        phoneLast4: r.phone ? r.phone.slice(-4) : "****",
        commission: Math.round((commissionByUser[r.id] || 0) * 100) / 100,
        joinedAt: r.createdAt.toISOString(),
        isToday: r.createdAt >= todayStart,
      }));

      const teamCount = referrals.length;
      const todayMembers = referrals.filter((r) => r.createdAt >= todayStart).length;

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
        members,
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
