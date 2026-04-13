import { prisma } from "@/lib/db";
import { generateOrderNo } from "@/lib/order-no";
import { type NextRequest } from "next/server";

// POST /api/offers/[id]/buy — submit UTR for an already-locked offer
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: offerId } = await params;
    const body = await request.json();
    const { buyerId, utrNumber, receiptUrl } = body;

    if (!buyerId) {
      return Response.json({ error: "buyerId is required" }, { status: 400 });
    }

    if (!utrNumber || utrNumber.length !== 12) {
      return Response.json(
        { error: "UTR must be exactly 12 characters" },
        { status: 400 }
      );
    }

    // Find the existing buy order for this offer (created during lock)
    const existingOrder = await prisma.buyOrder.findUnique({
      where: { offerId },
    });

    if (existingOrder && existingOrder.buyerId === buyerId) {
      // Update existing order with UTR
      const result = await prisma.$transaction(async (tx) => {
        const buyOrder = await tx.buyOrder.update({
          where: { id: existingOrder.id },
          data: {
            utrNumber,
            receiptUrl: receiptUrl || "",
          },
        });

        const sellTx = await tx.sellTransaction.update({
          where: { offerId },
          data: { buyerUtr: utrNumber },
        });

        return { buyOrder, sellTx };
      });

      return Response.json({
        success: true,
        buyOrder: result.buyOrder,
        sellTransaction: result.sellTx,
      });
    }

    // Fallback: if lock wasn't called, create everything (backward compat)
    const offer = await prisma.buyOffer.findUnique({
      where: { id: offerId },
      include: {
        sellerFund: {
          include: { user: true },
        },
        sellTx: true,
      },
    });

    if (!offer) {
      return Response.json({ error: "Offer not found" }, { status: 404 });
    }

    if (offer.status !== "AVAILABLE" && offer.status !== "LOCKED") {
      return Response.json({ error: "Offer is no longer available" }, { status: 409 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Clean up stale records from previous cancelled orders
      if (offer.sellTx) {
        await tx.sellTransaction.delete({ where: { id: offer.sellTx.id } });
      }
      if (existingOrder) {
        await tx.buyOrder.delete({ where: { id: existingOrder.id } });
      }

      await tx.buyOffer.update({
        where: { id: offerId },
        data: { status: "LOCKED" },
      });

      const buyOrder = await tx.buyOrder.create({
        data: {
          orderNo: generateOrderNo("BO"),
          buyerId,
          offerId,
          amount: offer.amount,
          utrNumber,
          receiptUrl: receiptUrl || "",
          status: "PENDING",
        },
      });

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

      const sellTx = await tx.sellTransaction.create({
        data: {
          sellerId: offer.sellerFund.userId,
          offerId,
          amount: offer.amount,
          buyerUtr: utrNumber,
          bank: offer.bank,
          upiId: offer.upiId,
          status: "PENDING",
          orderNo,
          orderTime,
        },
      });

      return { buyOrder, sellTx };
    });

    return Response.json({
      success: true,
      buyOrder: result.buyOrder,
      sellTransaction: result.sellTx,
    });
  } catch (error) {
    console.error("Buy offer error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
