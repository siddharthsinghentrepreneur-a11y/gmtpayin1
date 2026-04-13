import { prisma } from "@/lib/db";
import { type NextRequest } from "next/server";

// POST /api/admin/buy-orders/[id]/reject — admin rejects a pending buy order
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;

    const result = await prisma.$transaction(async (tx) => {
      // Fetch order inside transaction to prevent race conditions
      const order = await tx.buyOrder.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        return { error: "Order not found", status: 404 } as const;
      }

      if (order.status !== "PENDING") {
        return { error: "Order is already processed", status: 409 } as const;
      }

      // Mark buy order as FAILED
      await tx.buyOrder.update({
        where: { id: orderId },
        data: { status: "FAILED" },
      });

      // For INR orders (with offer), handle seller side
      if (order.offerId) {
        // Mark sell transaction as FAILED
        await tx.sellTransaction.updateMany({
          where: { offerId: order.offerId, status: "PENDING" },
          data: { status: "FAILED" },
        });

        // Release offer back to AVAILABLE
        await tx.buyOffer.update({
          where: { id: order.offerId },
          data: { status: "AVAILABLE" },
        });
      }

      return { success: true } as const;
    });

    if ("error" in result) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Reject order error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
