import { prisma } from "@/lib/db";
import { type NextRequest } from "next/server";

// POST /api/offers/[id]/cancel — cancel a locked offer, restore it to AVAILABLE
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: offerId } = await params;
    const body = await request.json();
    const { buyerId } = body;

    if (!buyerId) {
      return Response.json({ error: "buyerId is required" }, { status: 400 });
    }

    // Find the offer with its order
    const offer = await prisma.buyOffer.findUnique({
      where: { id: offerId },
      include: {
        buyOrder: true,
        sellTx: true,
      },
    });

    if (!offer) {
      return Response.json({ error: "Offer not found" }, { status: 404 });
    }

    // Only the buyer who locked it can cancel
    if (offer.buyOrder && offer.buyOrder.buyerId !== buyerId) {
      return Response.json({ error: "Not authorized" }, { status: 403 });
    }

    // If offer is already available, nothing to cancel
    if (offer.status === "AVAILABLE") {
      return Response.json({ success: true, alreadyCancelled: true });
    }

    // If order is already completed, cannot cancel
    if (offer.buyOrder?.status === "COMPLETED") {
      return Response.json(
        { error: "Completed orders cannot be cancelled" },
        { status: 400 }
      );
    }

    // Cancel everything in a transaction — DELETE records so offerId unique constraint
    // won't block future buyers from locking the same offer again
    await prisma.$transaction(async (tx) => {
      // Delete SellTransaction first (references offerId)
      if (offer.sellTx) {
        await tx.sellTransaction.delete({
          where: { id: offer.sellTx.id },
        });
      }

      // Delete BuyOrder (references offerId)
      if (offer.buyOrder) {
        await tx.buyOrder.delete({
          where: { id: offer.buyOrder.id },
        });
      }

      // Set offer back to AVAILABLE
      await tx.buyOffer.update({
        where: { id: offerId },
        data: { status: "AVAILABLE" },
      });
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Cancel offer error:", error);
    return Response.json(
      { error: "Failed to cancel order" },
      { status: 500 }
    );
  }
}
