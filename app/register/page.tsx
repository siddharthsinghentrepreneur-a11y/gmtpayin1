"use client";

import { BrandLogo } from "@/components/brand-logo";
import Link from "next/link";
import { FormEvent, Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isAdminPhone, saveAdminSession, saveUserSession } from "@/lib/client-auth";

function RegisterClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const linkedReferralCode = searchParams.get("ref");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (linkedReferralCode) {
      setReferralCode(linkedReferralCode.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5));
    }
  }, [linkedReferralCode]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!referralCode) {
      setError("Invitation code is required");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password, referralCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to create account");
        return;
      }

      saveUserSession({
        id: data.user.id,
        phone: data.user.phone ?? null,
        uid: data.user.uid ?? null,
        referralCode: data.user.referralCode ?? null,
        name: data.user.name,
        role: data.user.role,
      });

      if (isAdminPhone(data.user.phone ?? null)) {
        saveAdminSession({
          id: data.user.id,
          email: data.user.email ?? null,
          phone: data.user.phone ?? null,
          name: data.user.name,
          role: "ADMIN",
        });
        router.push("/admin/dashboard");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const EyeIcon = ({ visible, onClick }: { visible: boolean; onClick: () => void }) => (
    <button type="button" onClick={onClick} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors">
      {visible ? (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ) : (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
        </svg>
      )}
    </button>
  );

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-blue-600 via-blue-600 to-blue-700">
      {/* Top header with decorative shapes */}
      <div className="relative overflow-hidden px-6 pb-8 pt-14">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-500/30" />
        <div className="absolute -left-6 top-20 h-24 w-24 rounded-full bg-blue-400/20" />
        <div className="absolute right-16 top-8 h-12 w-12 rounded-full bg-white/10" />
        <div className="relative">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-blue-100 backdrop-blur-sm">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            Secure Registration
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Create Account</h1>
          <p className="mt-1.5 text-sm text-blue-100/80">Join GMTPAY and start your journey</p>
        </div>
      </div>

      {/* Form section */}
      <div className="flex-1 rounded-t-[2rem] bg-white px-6 pt-8 pb-8 shadow-[0_-10px_40px_rgba(0,0,0,0.08)]">
        <div className="mb-7 flex items-center justify-center">
          <BrandLogo size={72} imageClassName="rounded-2xl shadow-lg shadow-blue-600/20" />
        </div>

        {/* Steps indicator */}
        <div className="mb-7 flex items-center justify-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-md shadow-blue-600/30">1</div>
          <div className="h-0.5 w-8 rounded-full bg-blue-200" />
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-400">2</div>
          <div className="h-0.5 w-8 rounded-full bg-slate-200" />
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-400">3</div>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {/* Phone number */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3" />
                </svg>
              </span>
              Phone number
            </label>
            <div className="flex gap-2">
              <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-semibold text-slate-600 select-none">
                +91
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="Enter phone number"
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                required
              />
            </div>
          </div>

          {/* Set password */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </span>
              Set password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-11 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                required
              />
              <EyeIcon visible={showPassword} onClick={() => setShowPassword(!showPassword)} />
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
              Confirm password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Re-enter password"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-11 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                required
              />
              <EyeIcon visible={showConfirm} onClick={() => setShowConfirm(!showConfirm)} />
            </div>
          </div>

          {/* Invite code */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </span>
              Invitation code
            </label>
            <input
              type="text"
              value={referralCode}
              onChange={(event) => setReferralCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5))}
              placeholder={linkedReferralCode ? "Invitation code added from referral link" : "Enter invitation code"}
              readOnly={Boolean(linkedReferralCode)}
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold uppercase tracking-widest text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
            <p className="mt-2 text-xs text-slate-500">
              {linkedReferralCode
                ? "This invitation code came from your referral link and cannot be changed."
                : "An invitation code is required to create your account."}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-xs font-medium text-red-600">
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 py-4 text-base font-bold text-white shadow-xl shadow-blue-600/25 transition-all hover:shadow-2xl hover:shadow-blue-600/30 hover:brightness-105 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Creating account...
                </span>
              ) : "Register"}
            </button>
          </div>

          {/* Login link */}
          <Link
            href="/"
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-slate-200 py-3.5 text-sm font-semibold text-slate-500 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
          >
            I have an account <span className="font-bold text-blue-600">Login</span>
          </Link>
        </form>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50">Loading...</div>}>
      <RegisterClient />
    </Suspense>
  );
}