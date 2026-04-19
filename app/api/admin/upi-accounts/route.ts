import { isDatabaseUnavailableError, withDatabaseRetry } from "@/lib/db";
import { type NextRequest } from "next/server";

// GET /api/admin/upi-accounts — list all bank accounts with user details
export async function GET() {
  try {
    const data = await withDatabaseRetry(async (db) => {
      const accounts = await db.bankAccount.findMany({
        include: {
          user: {
            select: {
              uid: true,
              phone: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return accounts.map((acc) => ({
        id: acc.id,
        uid: acc.user.uid || "—",
        phone: acc.user.phone || "—",
        bankName: acc.bankName,
        beneficiary: acc.beneficiary,
        accountLast4: acc.accountLast4,
        fullAccount: acc.fullAccount,
        ifsc: acc.ifsc,
        upiId: acc.upiId || "—",
        addedOn: acc.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }),
      }));
    });

    return Response.json({ accounts: data });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return Response.json({ error: "Database unreachable" }, { status: 503 });
    }
    console.error("Admin bank accounts error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/admin/upi-accounts — update a bank account's fields
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, fullAccount, ifsc, bankName, beneficiary } = body;

    if (!id) {
      return Response.json({ error: "Bank account id is required" }, { status: 400 });
    }

    const updated = await withDatabaseRetry(async (db) => {
      const existing = await db.bankAccount.findUnique({ where: { id } });
      if (!existing) return null;

      return db.bankAccount.update({
        where: { id },
        data: {
          ...(fullAccount !== undefined && {
            fullAccount,
            accountLast4: fullAccount.slice(-4),
          }),
          ...(ifsc !== undefined && { ifsc }),
          ...(bankName !== undefined && { bankName }),
          ...(beneficiary !== undefined && { beneficiary }),
        },
      });
    });

    if (!updated) {
      return Response.json({ error: "Bank account not found" }, { status: 404 });
    }

    // Also update all AVAILABLE offers so buyers see the latest bank details
    const sellerFund = await withDatabaseRetry((db) =>
      db.sellerFund.findUnique({ where: { userId: updated.userId } })
    );
    if (sellerFund) {
      await withDatabaseRetry((db) =>
        db.buyOffer.updateMany({
          where: { sellerFundId: sellerFund.id, status: "AVAILABLE" },
          data: {
            ...(bankName !== undefined && { bank: bankName }),
            ...(beneficiary !== undefined && { accountName: beneficiary }),
            ...(fullAccount !== undefined && { accountNumber: fullAccount }),
            ...(ifsc !== undefined && { ifsc }),
          },
        })
      );
    }

    return Response.json({ success: true, bank: updated });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return Response.json({ error: "Database unreachable" }, { status: 503 });
    }
    console.error("Admin bank update error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
