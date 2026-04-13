import { prisma } from "@/lib/db";

const ORDER_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Auto-cancel expired locked orders.
 * An order is expired if: offer is LOCKED, buyOrder is PENDING with no UTR,
 * and createdAt is older than 30 minutes.
 */
export async function cancelExpiredOrders() {
  try {
    const cutoff = new Date(Date.now() - ORDER_EXPIRY_MS);

    // Find expired PENDING buy orders (no UTR, older than 30 min)
    const expiredOrders = await prisma.buyOrder.findMany({
      where: {
        status: "PENDING",
        utrNumber: "",
        createdAt: { lt: cutoff },
        offer: { status: "LOCKED" },
      },
      include: {
        offer: {
          include: { sellTx: true },
        },
      },
    });

    if (expiredOrders.length === 0) return 0;

    let cancelledCount = 0;

    for (const order of expiredOrders) {
      try {
        await prisma.$transaction(async (tx) => {
          // Delete SellTransaction first (references offerId)
          if (order.offer?.sellTx) {
            await tx.sellTransaction.delete({
              where: { id: order.offer.sellTx.id },
            });
          }

          // Delete BuyOrder (references offerId)
          await tx.buyOrder.delete({
            where: { id: order.id },
          });

          // Set offer back to AVAILABLE
          if (order.offerId) {
            await tx.buyOffer.update({
              where: { id: order.offerId },
              data: { status: "AVAILABLE" },
            });
          }
        });
        cancelledCount++;
      } catch (err) {
        console.error(`Failed to auto-cancel expired order ${order.id}:`, err);
      }
    }

    if (cancelledCount > 0) {
      console.log(`Auto-cancelled ${cancelledCount} expired order(s)`);
    }

    return cancelledCount;
  } catch (err) {
    console.error("cancelExpiredOrders error:", err);
    return 0;
  }
}
