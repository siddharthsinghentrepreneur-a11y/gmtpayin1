import { prisma } from "../lib/db";

async function regenerate() {
  const funds = await prisma.sellerFund.findMany({
    where: { autoSellActive: true, totalFund: { gte: 100 } },
    include: { user: { include: { bankAccount: true } } },
  });

  console.log("Active seller funds:", funds.length);

  for (const fund of funds) {
    if (!fund.user.bankAccount) {
      console.log("  Skip", fund.userId, "- no bank account");
      continue;
    }

    // Delete old AVAILABLE offers
    const deleted = await prisma.buyOffer.deleteMany({
      where: { sellerFundId: fund.id, status: "AVAILABLE" },
    });

    // Generate new offers with small chunks
    const chunkOptions = [100, 200, 300, 400, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 5000];
    const amounts: number[] = [];
    let remaining = fund.totalFund;

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

    if (amounts.length > 0) {
      const bank = fund.user.bankAccount;
      await prisma.buyOffer.createMany({
        data: amounts.map((amount) => ({
          sellerFundId: fund.id,
          amount,
          bank: bank.bankName,
          upiId: bank.upiId,
          accountName: bank.beneficiary || fund.user.name,
          accountNumber: bank.fullAccount,
          ifsc: bank.ifsc,
          status: "AVAILABLE" as const,
        })),
      });
    }

    console.log(
      "  Seller", fund.user.name,
      ": deleted", deleted.count,
      "-> created", amounts.length,
      "offers:", amounts.join(", ")
    );
  }

  await prisma.$disconnect();
  console.log("Done!");
}

regenerate().catch((e) => {
  console.error(e);
  process.exit(1);
});
