import { isDatabaseUnavailableError, withDatabaseRetry } from "@/lib/db";

// GET /api/admin/stats — dashboard overview stats
export async function GET() {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const data = await withDatabaseRetry(async (db) => {
      const [
        totalUsers,
        usersToday,
        totalBuyOrders,
        buyOrdersToday,
        pendingBuyOrders,
        totalBankAccounts,
        recentBuyOrders,
        recentUsers,
        topUsers,
      ] = await Promise.all([
        db.user.count(),
        db.user.count({ where: { createdAt: { gte: todayStart } } }),
        db.buyOrder.count(),
        db.buyOrder.count({ where: { createdAt: { gte: todayStart } } }),
        db.buyOrder.count({ where: { status: { in: ["PENDING"] } } }),
        db.bankAccount.count(),

        // Recent buy orders (pending first, then newest)
        db.buyOrder.findMany({
          take: 10,
          orderBy: { createdAt: "desc" },
          include: {
            buyer: { select: { phone: true, uid: true } },
            offer: { select: { amount: true, upiId: true, accountName: true } },
          },
        }),

        // Recently registered users
        db.user.findMany({
          take: 5,
          orderBy: { createdAt: "desc" },
          select: { id: true, phone: true, uid: true, createdAt: true },
        }),

        // Top users by buy order volume
        db.buyOrder.groupBy({
          by: ["buyerId"],
          _sum: { amount: true },
          _count: { id: true },
          orderBy: { _sum: { amount: "desc" } },
          take: 5,
        }),
      ]);

      // Get top user details
      const topUserIds = topUsers.map((t) => t.buyerId);
      const topUserDetails = topUserIds.length > 0
        ? await db.user.findMany({
            where: { id: { in: topUserIds } },
            select: { id: true, phone: true, uid: true },
          })
        : [];

      // Get sell tx counts for top users
      const topUserSellCounts = topUserIds.length > 0
        ? await db.sellTransaction.groupBy({
            by: ["sellerId"],
            _count: { id: true },
            _sum: { amount: true },
            where: { sellerId: { in: topUserIds } },
          })
        : [];

      const topUserMap = new Map(topUserDetails.map((u) => [u.id, u]));
      const topUserSellMap = new Map(topUserSellCounts.map((s) => [s.sellerId, s]));

      const topUsersFormatted = topUsers.map((t) => {
        const user = topUserMap.get(t.buyerId);
        const sells = topUserSellMap.get(t.buyerId);
        return {
          uid: user?.uid || "—",
          phone: user?.phone || "—",
          buyCount: t._count.id,
          sellCount: sells?._count?.id || 0,
          orders: t._count.id + (sells?._count?.id || 0),
          volume: (t._sum.amount || 0) + (sells?._sum?.amount || 0),
        };
      });

      // Revenue calculations
      const [todayRevenue] = await Promise.all([
        db.buyOrder.aggregate({
          _sum: { amount: true },
          _count: { id: true },
          where: { status: "COMPLETED", createdAt: { gte: todayStart } },
        }),
        db.buyOrder.aggregate({
          _sum: { amount: true },
          _count: { id: true },
          where: { status: "COMPLETED" },
        }),
      ]);

      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      weekStart.setHours(0, 0, 0, 0);
      const monthStart = new Date();
      monthStart.setDate(monthStart.getDate() - 30);
      monthStart.setHours(0, 0, 0, 0);

      const [weekRevenue, monthRevenue, buyVolume, completedBuyOrders, totalBuy] = await Promise.all([
        db.buyOrder.aggregate({
          _sum: { amount: true },
          _count: { id: true },
          where: { status: "COMPLETED", createdAt: { gte: weekStart } },
        }),
        db.buyOrder.aggregate({
          _sum: { amount: true },
          _count: { id: true },
          where: { status: "COMPLETED", createdAt: { gte: monthStart } },
        }),
        db.buyOrder.aggregate({
          _sum: { amount: true },
          where: { createdAt: { gte: todayStart } },
        }),
        db.buyOrder.count({ where: { status: "COMPLETED" } }),
        db.buyOrder.count(),
      ]);

      const successRate = totalBuy > 0 ? Math.round((completedBuyOrders / totalBuy) * 100 * 10) / 10 : 0;
      const commission = (todayRevenue._sum.amount || 0) * 0.04;

      // Build recent activity from buy orders, sell transactions, and new users
      type ActivityItem = {
        id: string;
        user: string;
        uid: string;
        type: "Buy" | "Sell" | "Register";
        amount?: string;
        status: string;
        time: string;
      };

      const activity: ActivityItem[] = [];

      for (const bo of recentBuyOrders) {
        const statusMap: Record<string, string> = {
          PENDING: "Paying",
          COMPLETED: "Success",
          CANCELLED: "Cancelled",
          FAILED: "Failed",
        };
        activity.push({
          id: `bo-${bo.id}`,
          user: bo.buyer.phone || "—",
          uid: bo.buyer.uid || "—",
          type: "Buy",
          amount: `₹${bo.amount.toLocaleString()}`,
          status: statusMap[bo.status] || bo.status,
          time: formatTimeAgo(bo.createdAt),
        });
      }

      for (const u of recentUsers) {
        activity.push({
          id: `reg-${u.id}`,
          user: u.phone || "—",
          uid: u.uid || "—",
          type: "Register",
          status: "Active",
          time: formatTimeAgo(u.createdAt),
        });
      }

      // Sort by most recent first (based on timeAgo text)
      activity.sort((a, b) => {
        const aMin = parseTimeAgo(a.time);
        const bMin = parseTimeAgo(b.time);
        return aMin - bMin;
      });

      // Build pending orders (buy orders only)
      const pendingBuyList = recentBuyOrders
        .filter((bo) => bo.status === "PENDING")
        .map((bo) => ({
          id: bo.id,
          user: `UID: ${bo.buyer.uid || "—"}`,
          uid: bo.buyer.uid || "—",
          phone: bo.buyer.phone || "—",
          type: "Buy" as const,
          amount: `₹${bo.amount.toLocaleString()}`,
          status: "Paying",
          time: bo.createdAt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }),
        }));

      const pendingOrders = pendingBuyList;

      return {
        revenue: {
          today: { amount: todayRevenue._sum.amount || 0, orders: todayRevenue._count.id },
          week: { amount: weekRevenue._sum.amount || 0, orders: weekRevenue._count.id },
          month: { amount: monthRevenue._sum.amount || 0, orders: monthRevenue._count.id },
        },
        stats: {
          totalUsers,
          usersToday,
          totalBuyOrders,
          buyOrdersToday,
          pendingBuyOrders,
          totalBankAccounts,
        },
        miniStats: {
          commission,
          buyVolume: buyVolume._sum.amount || 0,
          sellVolume: 0,
          successRate,
        },
        recentActivity: activity.slice(0, 8),
        pendingOrders,
        topUsers: topUsersFormatted,
      };
    });

    return Response.json(data);
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return Response.json({ error: "Database unreachable" }, { status: 503 });
    }
    console.error("Admin stats error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function parseTimeAgo(text: string): number {
  if (text === "just now") return 0;
  const match = text.match(/^(\d+)\s*(min|h|d)/);
  if (!match) return 999;
  const num = parseInt(match[1]);
  if (match[2] === "min") return num;
  if (match[2] === "h") return num * 60;
  return num * 1440;
}
