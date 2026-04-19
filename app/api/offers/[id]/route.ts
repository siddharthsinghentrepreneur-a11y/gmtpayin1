import { prisma } from "@/lib/db";
import { type NextRequest } from "next/server";

// GET /api/offers/[id] — get single offer detail
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const offer = await prisma.buyOffer.findUnique({
      where: { id },
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

    if (!offer) {
      return Response.json({ error: "Offer not found" }, { status: 404 });
    }

    const bank = offer.sellerFund.user.bankAccount;
    const mapped = {
      id: offer.id,
      sellerId: offer.sellerFund.userId,
      sellerName: bank?.beneficiary || offer.accountName,
      amount: offer.amount,
      bank: bank?.bankName || offer.bank,
      upiId: bank?.upiId || offer.upiId,
      accountNumber: bank?.fullAccount || offer.accountNumber,
      ifsc: bank?.ifsc || offer.ifsc,
      status: offer.status.toLowerCase(),
      createdAt: offer.createdAt.toISOString(),
    };

    return Response.json({ offer: mapped });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
