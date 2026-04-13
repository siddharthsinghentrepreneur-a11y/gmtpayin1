import { prisma } from "@/lib/db";
import { type NextRequest } from "next/server";

// GET /api/seller-fund?userId=xxx — get seller fund info
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const userId = searchParams.get("userId");

    if (!userId) {
      return Response.json({ error: "userId is required" }, { status: 400 });
    }

    const fund = await prisma.sellerFund.findUnique({
      where: { userId },
    });

    return Response.json({ fund });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/seller-fund — create/update seller fund
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, totalFund, autoSellActive } = body;

    if (!userId) {
      return Response.json({ error: "userId is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { bankAccount: true },
    });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const fund = await prisma.sellerFund.upsert({
      where: { userId },
      update: {
        totalFund: totalFund ?? undefined,
        autoSellActive: autoSellActive ?? undefined,
      },
      create: {
        userId,
        totalFund: totalFund ?? 0,
        autoSellActive: autoSellActive ?? false,
      },
    });

    // If auto-sell is active, generate offers from fund
    if (fund.autoSellActive && fund.totalFund >= 100 && user.bankAccount) {
      await generateOffersForFund(fund.id, fund.totalFund, user, user.bankAccount);
    } else {
      // Auto-sell OFF — remove any remaining available offers
      await prisma.buyOffer.deleteMany({
        where: { sellerFundId: fund.id, status: "AVAILABLE" },
      });
    }

    return Response.json({ fund });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function generateOffersForFund(
  sellerFundId: string,
  totalFund: number,
  user: { name: string },
  bank: { bankName: string; beneficiary: string; upiId: string; fullAccount: string; ifsc: string }
) {
  // Delete existing available offers for this fund (regenerate)
  await prisma.buyOffer.deleteMany({
    where: {
      sellerFundId,
      status: "AVAILABLE",
    },
  });

  // Split fund into chunks
  const chunkOptions = [100, 200, 300, 400, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 5000];
  const amounts: number[] = [];
  let remaining = totalFund;

  while (remaining >= 100) {
    const validChunks = chunkOptions.filter((c) => c <= remaining);
    if (validChunks.length === 0) break;
    const chunk = validChunks[Math.floor(Math.random() * validChunks.length)];
    amounts.push(chunk);
    remaining -= chunk;
  }

  if (remaining > 0 && amounts.length > 0) {
    amounts[amounts.length - 1] += remaining;
  }

  // Create offers
  if (amounts.length > 0) {
    await prisma.buyOffer.createMany({
      data: amounts.map((amount) => ({
        sellerFundId,
        amount,
        bank: bank.bankName,
        upiId: bank.upiId,
        accountName: bank.beneficiary || user.name,
        accountNumber: bank.fullAccount,
        ifsc: bank.ifsc,
        status: "AVAILABLE" as const,
      })),
    });
  }
}
