import { isDatabaseConfigurationIssue, isDatabaseUnavailableError, withDatabaseRetry } from "@/lib/db";
import { isValidPhone, normalizePhone, verifyPassword } from "@/lib/auth";
import { generateUniqueReferralCode } from "@/lib/referral-code";
import { generateUniqueUserUid } from "@/lib/user-uid";
import { type NextRequest } from "next/server";

// POST /api/auth/login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const phone = normalizePhone(body.phone ?? "");
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if ((!phone && !email) || !password) {
      return Response.json(
        { error: "Phone number and password are required" },
        { status: 400 }
      );
    }

    if (phone && !isValidPhone(phone)) {
      return Response.json(
        { error: "Enter a valid 10-digit phone number" },
        { status: 400 }
      );
    }

    const user = await withDatabaseRetry((db) =>
      db.user.findUnique({
        where: phone ? { phone } : { email },
        select: {
          id: true,
          uid: true,
          referralCode: true,
          phone: true,
          email: true,
          password: true,
          name: true,
          role: true,
          balance: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    );

    if (!user) {
      return Response.json(
        {
          error: phone
            ? "No account found associated with this phone number. Please create an account first."
            : "No account found for this email address.",
        },
        { status: 404 }
      );
    }

    const isPasswordValid = await verifyPassword(password, user.password);

    if (!isPasswordValid) {
      return Response.json(
        {
          error: phone
            ? "The password entered for this phone number is incorrect."
            : "The password entered for this email address is incorrect.",
        },
        { status: 401 }
      );
    }

    let safeUserSource = user;

    if (!user.uid || !user.referralCode) {
      safeUserSource = await withDatabaseRetry(async (db) => {
        const uid = user.uid ?? await generateUniqueUserUid(db);
        const referralCode = user.referralCode ?? await generateUniqueReferralCode(db);

        return db.user.update({
          where: { id: user.id },
          data: { uid, referralCode },
          select: {
            id: true,
            uid: true,
            referralCode: true,
            phone: true,
            email: true,
            password: true,
            name: true,
            role: true,
            balance: true,
            createdAt: true,
            updatedAt: true,
          },
        });
      });
    }

    // Return user data (without password)
    const { password: _, ...safeUser } = safeUserSource;
    return Response.json({ user: safeUser });
  } catch (err) {
    console.error("Login error:", err);

    if (isDatabaseUnavailableError(err)) {
      return Response.json(
        { error: "Server database is currently unreachable. Please try again in a few minutes." },
        { status: 503 },
      );
    }

    if (isDatabaseConfigurationIssue(err)) {
      return Response.json(
        { error: "Server database is not configured correctly. Please contact support." },
        { status: 500 },
      );
    }

    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
