import { prisma } from "@/lib/db";
import { calculateDepositIncome } from "@/lib/earnings";
import { type NextRequest } from "next/server";

// POST /api/admin/buy-orders/[id]/confirm — admin confirms a pending buy order
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
        include: {
          offer: {
            include: {
              sellerFund: true,
            },
          },
        },
      });

      if (!order) {
        return { error: "Order not found", status: 404 } as const;
      }

      if (order.status !== "PENDING") {
        return { error: "Order is already processed", status: 409 } as const;
      }

      // Mark buy order as COMPLETED
      await tx.buyOrder.update({
        where: { id: orderId },
        data: { status: "COMPLETED" },
      });

      // For INR orders (with offer), handle seller side
      if (order.offerId && order.offer) {
        // Mark sell transaction as COMPLETED
        await tx.sellTransaction.updateMany({
          where: { offerId: order.offerId, status: "PENDING" },
          data: { status: "COMPLETED" },
        });

        // Mark offer as SOLD
        await tx.buyOffer.update({
          where: { id: order.offerId },
          data: { status: "SOLD" },
        });

        // Reduce seller fund
        await tx.sellerFund.update({
          where: { id: order.offer.sellerFundId },
          data: { totalFund: { decrement: order.amount } },
        });

        // Reduce seller's main balance
        await tx.user.update({
          where: { id: order.offer.sellerFund.userId },
          data: { balance: { decrement: order.amount } },
        });

        // Check if seller fund dropped below 100
        const updatedFund = await tx.sellerFund.findUnique({
          where: { id: order.offer.sellerFundId },
        });
        if (updatedFund && updatedFund.totalFund < 100) {
          await tx.sellerFund.update({
            where: { id: order.offer.sellerFundId },
            data: { autoSellActive: false },
          });
        }
      }

      // Add amount + income (4% + 6) to buyer's balance
      const income = calculateDepositIncome(order.amount);
      await tx.user.update({
        where: { id: order.buyerId },
        data: { balance: { increment: order.amount + income } },
      });

      // Pay referral commission (0.5%) to the referrer if buyer was referred
      const buyer = await tx.user.findUnique({
        where: { id: order.buyerId },
        select: { referredById: true },
      });
      if (buyer?.referredById) {
        const commissionRate = 0.005;
        const commissionAmount = Math.round(order.amount * commissionRate * 100) / 100;
        if (commissionAmount > 0) {
          await tx.user.update({
            where: { id: buyer.referredById },
            data: { balance: { increment: commissionAmount } },
          });
          await tx.referralCommission.create({
            data: {
              referrerId: buyer.referredById,
              fromUserId: order.buyerId,
              orderId: order.id,
              depositAmount: order.amount,
              commissionRate,
              commissionAmount,
            },
          });
        }
      }

      return { success: true } as const;
    });

    if ("error" in result) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Confirm order error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
