import { prisma } from "@/lib/db";
import { cancelExpiredOrders } from "@/lib/cancel-expired-orders";
import { generateOrderNo } from "@/lib/order-no";
import { type NextRequest } from "next/server";

// POST /api/offers/[id]/lock — lock offer and create PENDING order immediately
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auto-cancel expired locked orders before checking availability
    await cancelExpiredOrders();
    const { id: offerId } = await params;
    const body = await request.json();
    const { buyerId } = body;

    if (!buyerId) {
      return Response.json({ error: "buyerId is required" }, { status: 400 });
    }

    // 1. Find offer and verify it's available
    const offer = await prisma.buyOffer.findUnique({
      where: { id: offerId },
      include: {
        sellerFund: {
          include: { user: true },
        },
        buyOrder: true,
        sellTx: true,
      },
    });

    if (!offer) {
      return Response.json({ error: "Offer not found" }, { status: 404 });
    }

    // If already locked by this buyer, return existing order (idempotent)
    const existingBuyOrder = offer.buyOrder;
    if (offer.status === "LOCKED" && existingBuyOrder && existingBuyOrder.buyerId === buyerId) {
      const lockedAt = existingBuyOrder.createdAt.getTime();
      const expiresAt = lockedAt + 30 * 60 * 1000;
      return Response.json({
        success: true,
        alreadyLocked: true,
        buyOrderId: existingBuyOrder.id,
        lockedAt: existingBuyOrder.createdAt.toISOString(),
        expiresAt,
        serverNow: Date.now(),
      });
    }

    if (offer.status !== "AVAILABLE") {
      return Response.json(
        { error: "Offer is no longer available" },
        { status: 409 }
      );
    }

    // 2. Lock the offer and create PENDING records in a transaction
    //    Clean up any stale CANCELLED/FAILED records first (unique constraint on offerId)
    const result = await prisma.$transaction(async (tx) => {
      // Remove stale sellTx for this offer (from a previous cancelled order)
      if (offer.sellTx) {
        await tx.sellTransaction.delete({ where: { id: offer.sellTx.id } });
      }
      // Remove stale buyOrder for this offer
      if (offer.buyOrder) {
        await tx.buyOrder.delete({ where: { id: offer.buyOrder.id } });
      }
      // Mark offer as LOCKED
      await tx.buyOffer.update({
        where: { id: offerId },
        data: { status: "LOCKED" },
      });

      // Create buy order for the buyer as PENDING (no UTR yet)
      const buyOrder = await tx.buyOrder.create({
        data: {
          orderNo: generateOrderNo("BO"),
          buyerId,
          offerId,
          amount: offer.amount,
          utrNumber: "",
          receiptUrl: "",
          status: "PENDING",
        },
      });

      // Generate order no and time
      const now = new Date();
      const ts =
        now.getFullYear().toString() +
        String(now.getMonth() + 1).padStart(2, "0") +
        String(now.getDate()).padStart(2, "0") +
        String(now.getHours()).padStart(2, "0") +
        String(now.getMinutes()).padStart(2, "0") +
        String(now.getSeconds()).padStart(2, "0");
      const rand = Math.floor(Math.random() * 999999999)
        .toString()
        .padStart(9, "0");
      const orderNo = `mm${ts}${rand}`;
      const orderTime = `${String(now.getDate()).padStart(2, "0")}/${String(
        now.getMonth() + 1
      ).padStart(2, "0")}/${now.getFullYear()} ${String(
        now.getHours()
      ).padStart(2, "0")}:${String(now.getMinutes()).padStart(
        2,
        "0"
      )}:${String(now.getSeconds()).padStart(2, "0")}`;

      // Create sell transaction for the seller as PENDING
      const sellTx = await tx.sellTransaction.create({
        data: {
          sellerId: offer.sellerFund.userId,
          offerId,
          amount: offer.amount,
          buyerUtr: "",
          bank: offer.bank,
          upiId: offer.upiId,
          status: "PENDING",
          orderNo,
          orderTime,
        },
      });

      return { buyOrder, sellTx };
    });

    const lockedAtMs = result.buyOrder.createdAt.getTime();
    const expiresAt = lockedAtMs + 30 * 60 * 1000;
    return Response.json({
      success: true,
      alreadyLocked: false,
      buyOrderId: result.buyOrder.id,
      lockedAt: result.buyOrder.createdAt.toISOString(),
      expiresAt,
      serverNow: Date.now(),
    });
  } catch (error) {
    console.error("Lock offer error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
