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

    // Check if requesting user is admin — admins see ALL offers
    let isAdmin = false;
    if (excludeUserId) {
      const reqUser = await prisma.user.findUnique({
        where: { id: excludeUserId },
        select: { role: true },
      });
      if (reqUser?.role === "ADMIN") isAdmin = true;
    }

    const offers = await prisma.buyOffer.findMany({
      where: {
        status: status as "AVAILABLE" | "LOCKED" | "SOLD",
        sellerFund: {
          autoSellActive: true,
          user: {
            balance: { gte: 100 },
            // Non-admin users only see featured sellers
            ...(isAdmin ? {} : { featuredSeller: true }),
            ...(excludeUserId && !isAdmin ? { id: { not: excludeUserId } } : {}),
          },
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        sellerFund: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                bankAccount: {
                  select: { beneficiary: true, bankName: true, fullAccount: true, ifsc: true, upiId: true },
                },
              },
            },
          },
        },
      },
    });

    // Map to frontend-friendly shape — prefer current bank account over offer snapshot
    const mapped = offers.map((o) => {
      const bank = o.sellerFund.user.bankAccount;
      return {
        id: o.id,
        sellerId: o.sellerFund.userId,
        sellerName: bank?.beneficiary || o.accountName,
        amount: o.amount,
        bank: bank?.bankName || o.bank,
        upiId: bank?.upiId || o.upiId,
        accountNumber: bank?.fullAccount || o.accountNumber,
        ifsc: bank?.ifsc || o.ifsc,
        status: o.status.toLowerCase(),
        createdAt: o.createdAt.toISOString(),
      };
    });

    return Response.json({ offers: mapped });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
