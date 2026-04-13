import { isDatabaseUnavailableError, withDatabaseRetry } from "@/lib/db";
import { cancelExpiredOrders } from "@/lib/cancel-expired-orders";
import { type NextRequest } from "next/server";

// GET /api/orders?userId=xxx
export async function GET(request: NextRequest) {
  try {
    // Auto-cancel expired locked orders
    await cancelExpiredOrders();

    const userId = request.nextUrl.searchParams.get("userId");
    if (!userId) {
      return Response.json({ error: "userId is required" }, { status: 400 });
    }

    const orders = await withDatabaseRetry(async (db) => {
      const buyOrders = await db.buyOrder.findMany({
        where: { buyerId: userId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          orderNo: true,
          offerId: true,
          amount: true,
          utrNumber: true,
          currency: true,
          status: true,
          createdAt: true,
          offer: {
            select: {
              upiId: true,
              accountName: true,
              accountNumber: true,
              ifsc: true,
              bank: true,
            },
          },
        },
      });

      const statusMap: Record<string, string> = {
        COMPLETED: "Success",
        CANCELLED: "Failed",
        FAILED: "Failed",
      };

      return buyOrders.map((order) => ({
        id: order.id,
        offerId: order.offerId,
        orderNo: order.orderNo || order.id.slice(0, 12).toUpperCase(),
        amount: order.amount,
        currency: (order.currency === "USDT" ? "USDT" : "INR") as "INR" | "USDT",
        receive: order.amount,
        status:
          order.status === "PENDING"
            ? order.utrNumber
              ? "Checking"
              : "Paying"
            : statusMap[order.status] || order.status,
        utr: order.utrNumber || "",
        time: formatDateTime(order.createdAt),
        upiId: order.offer?.upiId || "",
        accountName: order.offer?.accountName || "",
        accountNumber: order.offer?.accountNumber || "",
        ifsc: order.offer?.ifsc || "",
        bank: order.offer?.bank || "",
      }));
    });

    return Response.json({ orders });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return Response.json({ error: "Database unreachable" }, { status: 503 });
    }
    console.error("Orders error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

function formatDateTime(date: Date) {
  return (
    date.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " " +
    date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
  );
}
