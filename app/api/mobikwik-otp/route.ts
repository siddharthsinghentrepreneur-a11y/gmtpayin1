import { type NextRequest } from "next/server";
import { createHmac, randomInt } from "crypto";

// Secret key for signing OTP tokens (use env var in production)
const OTP_SECRET = process.env.OTP_SECRET || process.env.SESSION_SECRET || "gmtpay-mobikwik-otp-secret-key";
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

function generateOtp(): string {
  return String(randomInt(100000, 999999));
}

function signOtp(phone: string, otp: string, expiresAt: number): string {
  const payload = `${phone}:${otp}:${expiresAt}`;
  const hmac = createHmac("sha256", OTP_SECRET).update(payload).digest("hex");
  // Token = base64(phone:expiresAt:hmac)
  return Buffer.from(`${phone}:${expiresAt}:${hmac}`).toString("base64");
}

function verifyOtpToken(phone: string, otp: string, token: string): { valid: boolean; reason?: string } {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length !== 3) return { valid: false, reason: "Invalid token format" };

    const [tokenPhone, expiresAtStr, tokenHmac] = parts;
    const expiresAt = Number(expiresAtStr);

    if (tokenPhone !== phone) return { valid: false, reason: "Phone mismatch" };
    if (Date.now() > expiresAt) return { valid: false, reason: "OTP expired" };

    // Recompute HMAC
    const payload = `${phone}:${otp}:${expiresAt}`;
    const expectedHmac = createHmac("sha256", OTP_SECRET).update(payload).digest("hex");

    if (tokenHmac !== expectedHmac) return { valid: false, reason: "Invalid OTP" };

    return { valid: true };
  } catch {
    return { valid: false, reason: "Invalid token" };
  }
}

// POST /api/mobikwik-otp
// action: "send" → generate OTP and return signed token
// action: "verify" → verify OTP against token
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, phone, otp, otpToken } = body;

    if (action === "send") {
      if (!phone || !/^\d{10}$/.test(phone)) {
        return Response.json({ error: "Valid 10-digit phone number required" }, { status: 400 });
      }

      const generatedOtp = generateOtp();
      const expiresAt = Date.now() + OTP_EXPIRY_MS;
      const token = signOtp(phone, generatedOtp, expiresAt);

      // TODO: Replace with actual SMS API integration (e.g., Twilio, MSG91, etc.)
      // await sendSms(phone, `Your MobiKwik verification OTP is: ${generatedOtp}`);

      return Response.json({
        success: true,
        otpToken: token,
        message: "OTP sent to your MobiKwik number",
        // DEV ONLY: Remove in production when SMS API is integrated
        _devOtp: generatedOtp,
      });
    }

    if (action === "verify") {
      if (!phone || !otp || !otpToken) {
        return Response.json({ error: "Phone, OTP, and token are required" }, { status: 400 });
      }

      const result = verifyOtpToken(phone, otp, otpToken);

      if (!result.valid) {
        return Response.json({ error: result.reason || "Invalid OTP" }, { status: 400 });
      }

      return Response.json({ success: true, verified: true });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
