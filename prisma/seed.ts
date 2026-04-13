import "dotenv/config";
import { hashPassword } from "../lib/auth";
import { PrismaClient } from "../lib/generated/prisma/client";
import { createPrismaPgAdapter } from "../lib/prisma-pg";
import { generateUniqueReferralCode } from "../lib/referral-code";
import { generateUniqueUserUid } from "../lib/user-uid";

const adapter = createPrismaPgAdapter(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const adminEmail = process.env.ADMIN_SEED_EMAIL?.trim().toLowerCase() || "";
const adminPassword = process.env.ADMIN_SEED_PASSWORD?.trim() || "";
const adminPhone = process.env.ADMIN_SEED_PHONE?.replace(/\D/g, "") || null;

async function main() {
  console.log("🌱 Seeding database...");

  if (adminEmail && adminPassword) {
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
      select: { uid: true, referralCode: true },
    });
    const adminUid = existingAdmin?.uid ?? await generateUniqueUserUid(prisma);
    const adminReferralCode = existingAdmin?.referralCode ?? await generateUniqueReferralCode(prisma);

    const admin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        uid: adminUid,
        referralCode: adminReferralCode,
        phone: adminPhone,
        password: await hashPassword(adminPassword),
        name: "Admin",
        role: "ADMIN",
      },
      create: {
        uid: adminUid,
        referralCode: adminReferralCode,
        phone: adminPhone,
        email: adminEmail,
        password: await hashPassword(adminPassword),
        name: "Admin",
        role: "ADMIN",
        balance: 0,
      },
    });
    console.log("  ✓ Admin user:", admin.email);
  } else {
    console.log("  • Admin seed skipped (set ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD to create admin)");
  }

  await prisma.user.deleteMany({
    where: { email: "demo@gmtpay.com" },
  });

  // Create seller users with bank accounts and funds
  const sellers = [
    {
      phone: null,
      email: "thumula@gmtpay.com",
      password: "Seller@123",
      name: "THUMULA",
      balance: 10000,
      bank: {
        bankName: "MBK Bank",
        beneficiary: "THUMULA",
        accountLast4: "5779",
        fullAccount: "18070100005779",
        ifsc: "BARB0ARIKIR",
        upiId: "9451782021@mbk",
      },
      fund: 10000,
    },
    {
      phone: null,
      email: "arunk@gmtpay.com",
      password: "Seller@123",
      name: "ARUN K",
      balance: 15000,
      bank: {
        bankName: "Axis Bank",
        beneficiary: "ARUN K",
        accountLast4: "9784",
        fullAccount: "912010042519784",
        ifsc: "UTIB0004511",
        upiId: "8801163201@axl",
      },
      fund: 15000,
    },
    {
      phone: null,
      email: "priyas@gmtpay.com",
      password: "Seller@123",
      name: "PRIYA S",
      balance: 8000,
      bank: {
        bankName: "SBI",
        beneficiary: "PRIYA S",
        accountLast4: "2310",
        fullAccount: "38291047562310",
        ifsc: "SBIN0001234",
        upiId: "9876543210@ptsbi",
      },
      fund: 8000,
    },
  ];

  for (const s of sellers) {
    const existingUser = await prisma.user.findUnique({
      where: { email: s.email },
      select: { uid: true, referralCode: true },
    });
    const userUid = existingUser?.uid ?? await generateUniqueUserUid(prisma);
    const userReferralCode = existingUser?.referralCode ?? await generateUniqueReferralCode(prisma);

    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: {
        uid: userUid,
        referralCode: userReferralCode,
        phone: s.phone,
        password: await hashPassword(s.password),
        name: s.name,
        balance: s.balance,
      },
      create: {
        uid: userUid,
        referralCode: userReferralCode,
        phone: s.phone,
        email: s.email,
        password: await hashPassword(s.password),
        name: s.name,
        role: "USER",
        balance: s.balance,
      },
    });

    await prisma.bankAccount.upsert({
      where: { userId: user.id },
      update: {
        ...s.bank,
      },
      create: {
        userId: user.id,
        ...s.bank,
      },
    });

    const sellerFund = await prisma.sellerFund.upsert({
      where: { userId: user.id },
      update: {
        totalFund: s.fund,
        autoSellActive: true,
      },
      create: {
        userId: user.id,
        totalFund: s.fund,
        autoSellActive: true,
      },
    });

    // Generate buy offers from seller fund
    const chunkOptions = [100, 200, 300, 400, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 5000];
    const amounts: number[] = [];
    let remaining = s.fund;

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

    await prisma.buyOffer.deleteMany({
      where: { sellerFundId: sellerFund.id },
    });

    await prisma.buyOffer.createMany({
      data: amounts.map((amount) => ({
        sellerFundId: sellerFund.id,
        amount,
        bank: s.bank.bankName,
        upiId: s.bank.upiId,
        accountName: s.name,
        accountNumber: s.bank.fullAccount,
        ifsc: s.bank.ifsc,
        status: "AVAILABLE" as const,
      })),
    });

    console.log(`  ✓ Seller ${s.name}: ₹${s.fund} → ${amounts.length} offers [${amounts.join(", ")}]`);
  }

  // Create sample banners
  await prisma.banner.createMany({
    data: [
      { imageUrl: "/banners/banner1.jpg", sortOrder: 1, active: true },
      { imageUrl: "/banners/banner2.jpg", sortOrder: 2, active: true },
    ],
    skipDuplicates: true,
  });
  console.log("  ✓ Banners created");

  console.log("\n✅ Seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
