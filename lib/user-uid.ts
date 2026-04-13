import { PrismaClient } from "@/lib/generated/prisma/client";

const UID_MIN = 10000;
const UID_MAX = 99999;
const MAX_UID_ATTEMPTS = 50;

function randomFiveDigitUid() {
  return String(Math.floor(Math.random() * (UID_MAX - UID_MIN + 1)) + UID_MIN);
}

export async function generateUniqueUserUid(prisma: PrismaClient) {
  for (let attempt = 0; attempt < MAX_UID_ATTEMPTS; attempt += 1) {
    const uid = randomFiveDigitUid();
    const existingUser = await prisma.user.findUnique({ where: { uid } });

    if (!existingUser) {
      return uid;
    }
  }

  throw new Error("Unable to generate a unique 5-digit UID");
}