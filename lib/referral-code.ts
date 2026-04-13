import { PrismaClient } from "@/lib/generated/prisma/client";

const REFERRAL_CODE_LENGTH = 5;
const MAX_REFERRAL_CODE_ATTEMPTS = 50;
const REFERRAL_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function randomReferralCode() {
  let code = "";

  for (let index = 0; index < REFERRAL_CODE_LENGTH; index += 1) {
    code += REFERRAL_ALPHABET[Math.floor(Math.random() * REFERRAL_ALPHABET.length)];
  }

  return code;
}

export function normalizeReferralCode(code: string) {
  return code.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, REFERRAL_CODE_LENGTH);
}

export function isValidReferralCode(code: string) {
  return /^[A-Z0-9]{5}$/.test(code);
}

export async function generateUniqueReferralCode(prisma: PrismaClient) {
  for (let attempt = 0; attempt < MAX_REFERRAL_CODE_ATTEMPTS; attempt += 1) {
    const referralCode = randomReferralCode();
    const existingUser = await prisma.user.findUnique({ where: { referralCode } });

    if (!existingUser) {
      return referralCode;
    }
  }

  throw new Error("Unable to generate a unique referral code");
}