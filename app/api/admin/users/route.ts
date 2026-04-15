import { isDatabaseUnavailableError, withDatabaseRetry } from "@/lib/db";
import { type NextRequest } from "next/server";

// GET /api/admin/users — list all users with stats
export async function GET() {
  try {
    const data = await withDatabaseRetry(async (db) => {
      const users = await db.user.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          bankAccount: true,
          buyOrders: {
            select: { id: true, amount: true, status: true, createdAt: true, utrNumber: true },
            orderBy: { createdAt: "desc" },
            take: 10,
          },
          sellTx: {
            select: { id: true, amount: true, status: true, orderNo: true, createdAt: true },
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
      });

      return users.map((user) => {
        const { password: _, ...safeUser } = user;

        const buyCompleted = user.buyOrders.filter((o) => o.status === "COMPLETED");
        const buyFailed = user.buyOrders.filter((o) => o.status === "FAILED");
        const sellCompleted = user.sellTx.filter((s) => s.status === "COMPLETED");
        const sellFailed = user.sellTx.filter((s) => s.status === "FAILED");

        const totalDeposit = buyCompleted.reduce((sum, o) => sum + o.amount, 0);
        const totalWithdraw = sellCompleted.reduce((sum, s) => sum + s.amount, 0);
        const totalOrders = user.buyOrders.length + user.sellTx.length;
        const totalSuccess = buyCompleted.length + sellCompleted.length;
        const totalFailed = buyFailed.length + sellFailed.length;
        const successRate = totalOrders > 0 ? Math.round((totalSuccess / totalOrders) * 100) : 0;

        // Determine risk level
        let riskLevel: "Low" | "Medium" | "High" = "Low";
        if (successRate < 50 || totalFailed > 5) riskLevel = "High";
        else if (successRate < 75 || totalFailed > 2) riskLevel = "Medium";

        // Format recent orders for display
        const recentOrders = [
          ...user.buyOrders.slice(0, 4).map((o) => ({
            id: o.id,
            orderNo: o.id,
            type: "Buy" as const,
            amount: o.amount,
            status: mapBuyStatus(o.status),
            time: formatShortDate(o.createdAt),
          })),
          ...user.sellTx.slice(0, 4).map((s) => ({
            id: s.id,
            orderNo: s.orderNo,
            type: "Sell" as const,
            amount: s.amount,
            status: mapSellStatus(s.status),
            time: formatShortDate(s.createdAt),
          })),
        ].sort((a, b) => b.time.localeCompare(a.time)).slice(0, 6);

        // Time ago for last active
        const lastOrderDate = [...user.buyOrders, ...user.sellTx]
          .map((o) => o.createdAt)
          .sort((a, b) => b.getTime() - a.getTime())[0];

        const lastActive = lastOrderDate ? formatTimeAgo(lastOrderDate) : formatTimeAgo(user.updatedAt);

        return {
          id: safeUser.id,
          uid: safeUser.uid || "—",
          phone: safeUser.phone || "—",
          balance: safeUser.balance,
          totalDeposit,
          totalWithdraw,
          status: "Active" as const,
          orders: totalOrders,
          successRate,
          joined: formatDate(safeUser.createdAt),
          lastActive,
          upiCount: safeUser.bankAccount ? 1 : 0,
          riskLevel,
          featuredSeller: safeUser.featuredSeller,
          role: safeUser.role,
          recentOrders,
        };
      });
    });

    return Response.json({ users: data });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return Response.json({ error: "Database unreachable" }, { status: 503 });
    }
    console.error("Admin users error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/admin/users — toggle featuredSeller or role
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, featuredSeller, role } = body as { userId: string; featuredSeller?: boolean; role?: string };

    if (!userId) {
      return Response.json({ error: "userId required" }, { status: 400 });
    }

    // Build update data based on what was provided
    const data: Record<string, unknown> = {};
    if (typeof featuredSeller === "boolean") data.featuredSeller = featuredSeller;
    if (role === "ADMIN" || role === "USER") data.role = role;

    if (Object.keys(data).length === 0) {
      return Response.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const updated = await withDatabaseRetry(async (db) => {
      return db.user.update({
        where: { id: userId },
        data,
        select: { id: true, featuredSeller: true, role: true },
      });
    });

    return Response.json({ success: true, user: updated });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return Response.json({ error: "Database unreachable" }, { status: 503 });
    }
    console.error("Admin toggle featured error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

function mapBuyStatus(status: string) {
  const map: Record<string, string> = {
    PENDING: "Paying",
    COMPLETED: "Success",
    CANCELLED: "Cancelled",
    FAILED: "Failed",
  };
  return (map[status] || status) as "Paying" | "Checking" | "Success" | "Failed" | "Completed" | "Pending" | "Processing";
}

function mapSellStatus(status: string) {
  const map: Record<string, string> = {
    PENDING: "Pending",
    COMPLETED: "Completed",
    FAILED: "Failed",
  };
  return (map[status] || status) as "Paying" | "Checking" | "Success" | "Failed" | "Completed" | "Pending" | "Processing";
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit" }) +
    " " +
    date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
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
