import { PrismaClient } from "@/lib/generated/prisma/client";
import { createPrismaPgAdapter } from "@/lib/prisma-pg";

const connectionString = process.env.DATABASE_URL!;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const adapter = createPrismaPgAdapter(connectionString);
  return new PrismaClient({ adapter });
}

function getPrismaClient() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }

  return globalForPrisma.prisma;
}

function isRetryableDatabaseError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const code = "code" in error ? String(error.code ?? "") : "";
  const causeMessage = error.cause instanceof Error ? error.cause.message : "";
  const message = `${error.message} ${causeMessage}`.toLowerCase();

  return (
    code === "P1001" ||
    code === "P1008" ||
    code === "ETIMEDOUT" ||
    message.includes("can't reach database server") ||
    message.includes("sockettimeout") ||
    message.includes("connection timeout") ||
    message.includes("connect etimedout") ||
    message.includes("connection terminated") ||
    message.includes("terminated unexpectedly")
  );
}

export function isDatabaseUnavailableError(error: unknown) {
  return isRetryableDatabaseError(error);
}

async function resetPrismaClient() {
  if (!globalForPrisma.prisma) {
    return;
  }

  try {
    await globalForPrisma.prisma.$disconnect();
  } catch {
    // Ignore disconnect failures while replacing a broken connection.
  }

  globalForPrisma.prisma = undefined;
}

export async function withDatabaseRetry<T>(
  operation: (client: PrismaClient) => Promise<T>,
  retries = 1,
) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation(getPrismaClient());
    } catch (error) {
      if (attempt === retries || !isRetryableDatabaseError(error)) {
        throw error;
      }

      await resetPrismaClient();
    }
  }

  throw new Error("Database retry failed");
}

export const prisma = getPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
