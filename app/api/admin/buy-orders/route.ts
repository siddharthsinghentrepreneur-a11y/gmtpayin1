import { isDatabaseUnavailableError, withDatabaseRetry } from "@/lib/db";

// GET /api/admin/buy-orders — list all buy orders
export async function GET() {
  try {
    const data = await withDatabaseRetry(async (db) => {
      const orders = await db.buyOrder.findMany({
        where: {
          // Only show orders where buyer has submitted UTR + screenshot
          NOT: { utrNumber: "" },
        },
        orderBy: { createdAt: "desc" },
        include: {
          buyer: { select: { phone: true, uid: true, name: true } },
          offer: {
            select: {
              amount: true,
              upiId: true,
              accountName: true,
              accountNumber: true,
              ifsc: true,
              bank: true,
            },
          },
        },
      });

      return orders.map((order) => {
        const statusMap: Record<string, string> = {
          COMPLETED: "Success",
          CANCELLED: "Failed",
          FAILED: "Failed",
        };

        const displayStatus =
          order.status === "PENDING"
            ? order.utrNumber
              ? "Checking"
              : "Paying"
            : statusMap[order.status] || order.status;

        const isUsdt = order.currency === "USDT";

        return {
          id: order.id,
          orderNo: order.orderNo || order.id.slice(0, 12).toUpperCase(),
          uid: order.buyer.uid || "—",
          phone: order.buyer.phone || "—",
          amount: order.amount,
          currency: (isUsdt ? "USDT" : "INR") as "INR" | "USDT",
          receive: order.amount,
          status: displayStatus,
          time: formatDateTime(order.createdAt),
          utr: order.utrNumber || "",
          receiptUrl: order.receiptUrl || "",
          payeeName: order.offer?.accountName || order.buyer.name || "—",
          payeeAccount: order.offer?.accountNumber || "—",
          ifsc: order.offer?.ifsc || "—",
          upiId: order.offer?.upiId || "—",
        };
      });
    });

    return Response.json({ orders: data });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return Response.json({ error: "Database unreachable" }, { status: 503 });
    }
    console.error("Admin buy orders error:", error);
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
