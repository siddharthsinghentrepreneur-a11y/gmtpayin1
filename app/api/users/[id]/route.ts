import { isDatabaseUnavailableError, withDatabaseRetry } from "@/lib/db";
import { sumDepositIncome } from "@/lib/earnings";
import { generateUniqueReferralCode } from "@/lib/referral-code";
import { generateUniqueUserUid } from "@/lib/user-uid";
import { type NextRequest } from "next/server";

// GET /api/users/[id] — get user profile
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    let user = await withDatabaseRetry((db) =>
      db.user.findUnique({
        where: { id },
        include: {
          bankAccount: true,
          sellerFund: true,
          buyOrders: {
            where: { status: "COMPLETED" },
            select: {
              amount: true,
              createdAt: true,
            },
          },
          checkIns: {
            select: {
              amount: true,
              createdAt: true,
            },
          },
          commissionsEarned: {
            select: {
              commissionAmount: true,
              createdAt: true,
            },
          },
          jackpotWins: {
            select: {
              amount: true,
              createdAt: true,
            },
          },
        },
      }),
    );

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Auto-generate UID and referral code for accounts created before these features
    if (!user.uid || !user.referralCode) {
      user = await withDatabaseRetry(async (db) => {
        const uid = user.uid ?? await generateUniqueUserUid(db);
        const referralCode = user.referralCode ?? await generateUniqueReferralCode(db);

        return db.user.update({
          where: { id },
          data: { uid, referralCode },
          include: {
            bankAccount: true,
            sellerFund: true,
            buyOrders: {
              where: { status: "COMPLETED" },
              select: {
                amount: true,
                createdAt: true,
              },
            },
            checkIns: {
              select: {
                amount: true,
                createdAt: true,
              },
            },
            commissionsEarned: {
              select: {
                commissionAmount: true,
                createdAt: true,
              },
            },
            jackpotWins: {
              select: {
                amount: true,
                createdAt: true,
              },
            },
          },
        });
      });
    }

    const allTimeEarn = sumDepositIncome(user.buyOrders.map((order) => order.amount))
      + user.checkIns.reduce((sum, ci) => sum + ci.amount, 0)
      + user.commissionsEarned.reduce((sum, c) => sum + c.commissionAmount, 0)
      + user.jackpotWins.reduce((sum, jw) => sum + jw.amount, 0);
    const todayCheckInReward = user.checkIns
      .filter((ci) => ci.createdAt >= todayStart)
      .reduce((sum, ci) => sum + ci.amount, 0);
    const todayCommission = user.commissionsEarned
      .filter((c) => c.createdAt >= todayStart)
      .reduce((sum, c) => sum + c.commissionAmount, 0);
    const todayJackpot = user.jackpotWins
      .filter((jw) => jw.createdAt >= todayStart)
      .reduce((sum, jw) => sum + jw.amount, 0);
    const todayEarn = sumDepositIncome(
      user.buyOrders
        .filter((order) => order.createdAt >= todayStart)
        .map((order) => order.amount),
    ) + todayCheckInReward + todayCommission + todayJackpot;

    const { password: _, buyOrders: __, checkIns: ___, commissionsEarned: ____, jackpotWins: _____, ...safeUser } = user;
    return Response.json({
      user: {
        ...safeUser,
        earnings: {
          today: todayEarn,
          allTime: allTimeEarn,
        },
      },
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
