import { prisma } from "@/lib/db";
import { cancelExpiredOrders } from "@/lib/cancel-expired-orders";
import { type NextRequest } from "next/server";

// GET /api/offers — list all available buy offers
export async function GET(request: NextRequest) {
  try {
    // Auto-cancel expired locked orders so they become available again
    await cancelExpiredOrders();
    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status") || "AVAILABLE";
    const excludeUserId = searchParams.get("excludeUserId");

    const offers = await prisma.buyOffer.findMany({
      where: {
        status: status as "AVAILABLE" | "LOCKED" | "SOLD",
        sellerFund: {
          autoSellActive: true,
          user: {
            balance: { gte: 100 },
            featuredSeller: true,
            ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
          },
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        sellerFund: {
          include: {
            user: {
              select: { id: true, name: true, bankAccount: { select: { beneficiary: true } } },
            },
          },
        },
      },
    });

    // Map to frontend-friendly shape
    const mapped = offers.map((o) => ({
      id: o.id,
      sellerId: o.sellerFund.userId,
      sellerName: o.sellerFund.user.bankAccount?.beneficiary || o.accountName,
      amount: o.amount,
      bank: o.bank,
      upiId: o.upiId,
      accountNumber: o.accountNumber,
      ifsc: o.ifsc,
      status: o.status.toLowerCase(),
      createdAt: o.createdAt.toISOString(),
    }));

    return Response.json({ offers: mapped });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
