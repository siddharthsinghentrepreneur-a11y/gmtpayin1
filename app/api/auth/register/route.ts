import { hashPassword, normalizePhone, isValidPhone } from "@/lib/auth";
import { isDatabaseUnavailableError, withDatabaseRetry } from "@/lib/db";
import {
  generateUniqueReferralCode,
  isValidReferralCode,
  normalizeReferralCode,
} from "@/lib/referral-code";
import { generateUniqueUserUid } from "@/lib/user-uid";
import { type NextRequest } from "next/server";

// POST /api/auth/register
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const phone = normalizePhone(body.phone ?? "");
    const password = typeof body.password === "string" ? body.password.trim() : "";
    const referralCode = normalizeReferralCode(typeof body.referralCode === "string" ? body.referralCode : "");

    if (!phone || !password) {
      return Response.json(
        { error: "Phone number and password are required" },
        { status: 400 }
      );
    }

    if (!isValidPhone(phone)) {
      return Response.json(
        { error: "Enter a valid 10-digit phone number" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return Response.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    if (referralCode && !isValidReferralCode(referralCode)) {
      return Response.json(
        { error: "Enter a valid 5-character referral code" },
        { status: 400 }
      );
    }

    const existingUser = await withDatabaseRetry((db) =>
      db.user.findUnique({
        where: { phone },
      }),
    );

    if (existingUser) {
      return Response.json(
        { error: "An account with this phone number already exists" },
        { status: 409 }
      );
    }

    const referringUser = referralCode
      ? await withDatabaseRetry((db) =>
          db.user.findUnique({
            where: { referralCode },
            select: { id: true },
          }),
        )
      : null;

    if (referralCode && !referringUser) {
      return Response.json(
        { error: "Referral code is invalid" },
        { status: 400 }
      );
    }

    const user = await withDatabaseRetry(async (db) => {
      const uid = await generateUniqueUserUid(db);
      const newReferralCode = await generateUniqueReferralCode(db);

      return db.user.create({
        data: {
          uid,
          referralCode: newReferralCode,
          phone,
          password: await hashPassword(password),
          name: `User ${phone.slice(-4)}`,
          referredById: referringUser?.id ?? null,
        },
        include: { bankAccount: true, sellerFund: true },
      });
    });

    const { password: _, ...safeUser } = user;
    return Response.json({ user: safeUser }, { status: 201 });
  } catch (err) {
    console.error("Register error:", err);

    if (isDatabaseUnavailableError(err)) {
      return Response.json(
        { error: "Server database is currently unreachable. Please try again in a few minutes." },
        { status: 503 },
      );
    }

    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}