"use client";

import { BrandLogo } from "@/components/brand-logo";
import { useState, useEffect, useCallback } from "react";
import { GiPayMoney, GiReceiveMoney } from "react-icons/gi";
import { IoIosCard } from "react-icons/io";
import { AiFillHome } from "react-icons/ai";
import { RiReceiptFill, RiTeamFill } from "react-icons/ri";
import { MdLeaderboard, MdAccountBalanceWallet } from "react-icons/md";
import { IoPerson } from "react-icons/io5";
import { HiOutlineMail } from "react-icons/hi";
import { FiChevronRight, FiX } from "react-icons/fi";
import { BsBank2 } from "react-icons/bs";
import { BsClockHistory, BsCheckCircleFill } from "react-icons/bs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCurrentUserId, updateUserSession } from "@/lib/client-auth";
import {
  DEFAULT_HOME_BANNERS,
  type HomeBannerSlide,
} from "@/lib/home-banners";
import {
  LINKED_BANK_EVENT,
  readLinkedBankAccount,
  type LinkedBankAccount,
} from "@/lib/bank-account";

export default function DashboardPage() {
  const router = useRouter();
  const [slides, setSlides] = useState<HomeBannerSlide[]>(DEFAULT_HOME_BANNERS);
  const [current, setCurrent] = useState(0);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [linkedBank, setLinkedBank] = useState<LinkedBankAccount | null>(null);
  const [mobikwikNumber, setMobikwikNumber] = useState("");
  const [mobikwikInput, setMobikwikInput] = useState("");
  const [showMobikwikInput, setShowMobikwikInput] = useState(false);
  const [savingMobikwik, setSavingMobikwik] = useState(false);
  // OTP flow states
  const [mobikwikOtpStep, setMobikwikOtpStep] = useState<"phone" | "otp">("phone");
  const [mobikwikOtp, setMobikwikOtp] = useState("");
  const [mobikwikOtpToken, setMobikwikOtpToken] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [mobikwikError, setMobikwikError] = useState("");
  const [userUid, setUserUid] = useState("-----");
  const [balance, setBalance] = useState(0);
  const [todayBuy, setTodayBuy] = useState({ inTransaction: 0, success: 0 });
  const [todaySell, setTodaySell] = useState({ inTransaction: 0, success: 0 });
  const activeSlideIndex = current % slides.length;

  const next = useCallback(
    () => setCurrent((index) => (index + 1) % slides.length),
    [slides.length],
  );

  useEffect(() => {
    const userId = getCurrentUserId();

    if (!userId) {
      router.replace("/");
      return;
    }

    let cancelled = false;

    const loadUser = async () => {
      try {
        const response = await fetch(`/api/users/${userId}`);
        const data = await response.json();

        if (!response.ok || cancelled) {
          return;
        }

        setUserUid(data.user.uid || "-----");
        if (data.user.balance !== undefined) setBalance(data.user.balance);
        updateUserSession({
          uid: data.user.uid ?? null,
          referralCode: data.user.referralCode ?? null,
          phone: data.user.phone ?? null,
          name: data.user.name,
          role: data.user.role,
        });
      } catch {
        if (cancelled) {
          return;
        }
      }
    };

    const loadStats = async () => {
      try {
        const res = await fetch(`/api/dashboard-stats?userId=${userId}`);
        if (!res.ok || cancelled) return;
        const stats = await res.json();
        setTodayBuy(stats.todayBuy);
        setTodaySell(stats.todaySell);
      } catch {
        // ignore
      }
    };

    void loadUser();
    void loadStats();

    const statsInterval = window.setInterval(() => {
      void loadStats();
    }, 5000);

    const handleWindowFocus = () => {
      void loadUser();
      void loadStats();
    };

    window.addEventListener("focus", handleWindowFocus);

    return () => {
      cancelled = true;
      window.clearInterval(statsInterval);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [router]);

  useEffect(() => {
    // Banners are served from static files in public/banners/
    setSlides(DEFAULT_HOME_BANNERS);
  }, []);

  useEffect(() => {
    const syncLinkedBank = () => {
      const stored = readLinkedBankAccount();
      // Clear old incomplete localStorage data (no fullAccount)
      if (stored && !stored.fullAccount) {
        window.localStorage.removeItem("gmtpay.linkedBankAccount");
        setLinkedBank(null);
        return;
      }
      setLinkedBank(stored);
    };

    syncLinkedBank();

    // Sync localStorage bank ↔ DB
    const userId = getCurrentUserId();
    if (userId) {
      fetch(`/api/users/${userId}/bank`)
        .then((r) => r.json())
        .then(async (data) => {
          if (data.bank && data.bank.fullAccount && data.bank.fullAccount.length > 4) {
            // DB has complete bank, sync to localStorage
            const local = readLinkedBankAccount();
            if (!local || !local.fullAccount) {
              const { writeLinkedBankAccount } = await import("@/lib/bank-account");
              writeLinkedBankAccount({
                bankName: data.bank.bankName,
                beneficiary: data.bank.beneficiary,
                accountLast4: data.bank.accountLast4,
                fullAccount: data.bank.fullAccount,
                ifsc: data.bank.ifsc,
              });
              syncLinkedBank();
            }
            // Load MobiKwik number from DB
            if (data.bank.mobikwik) {
              setMobikwikNumber(data.bank.mobikwik);
            }
          } else {
            // DB empty or incomplete — clear old localStorage too
            const local = readLinkedBankAccount();
            if (local && (!local.fullAccount || local.fullAccount.length <= 4)) {
              window.localStorage.removeItem("gmtpay.linkedBankAccount");
              setLinkedBank(null);
            } else if (local && local.fullAccount && local.fullAccount.length > 4) {
              // localStorage has complete data, push to DB
              fetch(`/api/users/${userId}/bank`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  bankName: local.bankName,
                  beneficiary: local.beneficiary,
                  accountLast4: local.accountLast4,
                  fullAccount: local.fullAccount,
                  ifsc: local.ifsc,
                  upiId: "",
                }),
              }).catch(() => {});
            }
          }
        })
        .catch(() => {});
    }

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === "gmtpay.linkedBankAccount") {
        syncLinkedBank();
      }
    };

    const handleLinkedBankUpdate = () => syncLinkedBank();

    window.addEventListener("storage", handleStorage);
    window.addEventListener(LINKED_BANK_EVENT, handleLinkedBankUpdate);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(LINKED_BANK_EVENT, handleLinkedBankUpdate);
    };
  }, []);

  /* Auto-slide every 3 seconds */
  useEffect(() => {
    if (slides.length <= 1) {
      return;
    }

    const id = setInterval(next, 3000);
    return () => clearInterval(id);
  }, [next, slides.length]);

  return (
    <div className="min-h-screen bg-[#f5f5fa] text-zinc-900">
      {/* ── Gradient Header ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#4f46e5] via-[#6d28d9] to-[#7c3aed] px-5 pb-20 pt-5">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo size={44} imageClassName="rounded-full ring-[3px] ring-white/30 shadow-md" />
            <div>
              <p className="text-base font-bold text-white tracking-tight">
                UID: {userUid}
              </p>
              <p className="text-[10px] text-white/60">Welcome back!</p>
            </div>
          </div>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm transition hover:bg-white/25"
            aria-label="Messages"
          >
            <HiOutlineMail className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* ── Image Slider ── */}
        <div className="relative mt-5 overflow-hidden rounded-2xl ring-1 ring-white/20">
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${activeSlideIndex * 100}%)` }}
          >
            {slides.map((slide, i) => (
              <div key={i} className="relative aspect-[16/5] w-full shrink-0">
                <img
                  src={slide.src}
                  alt={`Banner ${i + 1}`}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
          {/* Dots */}
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrent(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === activeSlideIndex
                    ? "w-5 bg-white"
                    : "w-1.5 bg-white/40"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Balance Card (floating) ── */}
      <div className="relative z-10 -mt-8 px-4">
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_-12px_rgba(79,70,229,0.3)]">
          <div className="px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
              My Balance <span className="normal-case tracking-normal">(UID:{userUid})</span>
            </p>
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🪙</span>
                <span className="text-3xl font-extrabold text-slate-900">{balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-semibold text-indigo-600">
                1 Balance = 1 Rs
              </span>
            </div>
          </div>
          <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="overflow-y-auto pb-24">

        {/* Action Buttons */}
        <div className="mx-4 mt-4 grid grid-cols-3 gap-3 text-center">
          {[
            { icon: <GiPayMoney className="h-6 w-6" />, label: "Buy", bg: "bg-[#5b3ad8]", href: "/buy" },
            { icon: <GiReceiveMoney className="h-6 w-6" />, label: "Sell", bg: "bg-[#5b3ad8]", href: "/sell" },
            { icon: <IoIosCard className="h-6 w-6" />, label: "Withdraw", bg: "bg-gradient-to-br from-[#7c5ce7] to-[#a78bfa]" },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                if (item.label === "Withdraw") {
                  setShowWithdraw(true);
                } else if (item.href) {
                  router.push(item.href);
                }
              }}
              className="group flex flex-col items-center gap-2"
            >
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${item.bg} text-white shadow-lg shadow-violet-300/40 transition group-hover:scale-105 group-hover:shadow-xl`}>
                {item.icon}
              </div>
              <span className="text-sm font-semibold text-slate-700">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Stats Section */}
        <div className="mt-5 px-4 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Activity</h2>

          {/* Buy / Sell cards */}
          {[
            { title: "Today\u2019s Buy", href: "/purchase-records", stats: todayBuy },
            { title: "Today\u2019s Sell", href: "/sale-records", stats: todaySell },
          ].map((section) => (
            <div key={section.title}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-900">{section.title}</h3>
                <button type="button" onClick={() => router.push(section.href)} className="flex items-center gap-0.5 text-xs font-semibold text-indigo-600">
                  More <FiChevronRight className="h-3 w-3" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2.5 rounded-2xl bg-white px-3 py-3.5 shadow-sm">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500">
                    <BsClockHistory className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-lg font-bold leading-tight text-slate-900">{section.stats.inTransaction.toLocaleString("en-IN")}</p>
                    <p className="text-[10px] text-zinc-400">In Transaction</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 rounded-2xl bg-white px-3 py-3.5 shadow-sm">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-500">
                    <BsCheckCircleFill className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-lg font-bold leading-tight text-slate-900">{section.stats.success.toLocaleString("en-IN")}</p>
                    <p className="text-[10px] text-zinc-400">Success Amount</p>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Rewards */}
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400 pt-1">Rewards</h2>

          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <Link href="/rewards" className="flex items-center justify-between px-4 py-3.5">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="rounded bg-red-500 px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none text-white">
                    HOT
                  </span>
                  <p className="text-sm font-bold text-slate-900">Daily Rewards</p>
                </div>
                <p className="mt-0.5 text-xs text-red-500">Click for more &gt;</p>
              </div>
              <span className="text-3xl">🥳</span>
            </Link>
            <hr className="border-zinc-50" />
            <div className="flex items-center justify-between px-4 py-3.5">
              <div>
                <p className="text-sm font-bold text-slate-900">Newbie Rewards</p>
                <p className="mt-0.5 text-xs text-zinc-500">Complete tasks &amp; earn bonus</p>
              </div>
              <span className="text-3xl">🎁</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Withdraw Modal ── */}
      {showWithdraw && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowWithdraw(false)} />
          <div className="relative w-full max-w-[540px] animate-[slideUp_0.3s_ease] rounded-t-3xl bg-white px-5 pb-8 pt-4 shadow-2xl">
            {/* Handle */}
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-200" />
            {/* Close */}
            <button
              type="button"
              onClick={() => setShowWithdraw(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 transition hover:bg-zinc-200"
            >
              <FiX className="h-4 w-4" />
            </button>

            <h3 className="text-lg font-bold text-slate-900">Withdraw</h3>
            <p className="mt-1 text-sm text-zinc-500">
              {linkedBank
                ? "Your bank account is already linked for withdrawals."
                : "To make a withdrawal you need a linked bank account."}
            </p>

            {linkedBank ? (
              <div className="mt-5 overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50/90 to-teal-50/80 p-4 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-300/30">
                    <BsBank2 className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[15px] font-bold text-slate-900">Bank Card Binded</p>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                        Active
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{linkedBank.bankName}</p>
                    <p className="mt-1 text-xs text-zinc-500">{linkedBank.beneficiary}</p>
                    <div className="mt-3 flex items-center justify-between rounded-xl bg-white/80 px-3 py-2">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Account ending</p>
                        <p className="mt-1 text-sm font-bold tracking-[0.2em] text-slate-900">•••• {linkedBank.accountLast4}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">IFSC</p>
                        <p className="mt-1 text-xs font-bold text-slate-700">{linkedBank.ifsc}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { setShowWithdraw(false); router.push("/withdraw/bind-bank"); }}
                className="mt-5 flex w-full items-center gap-4 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 to-violet-50/80 p-4 text-left transition hover:shadow-md hover:border-indigo-200 active:scale-[0.98]"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-300/40">
                  <BsBank2 className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-[15px] font-bold text-slate-900">Bind Bank Account</p>
                  <p className="mt-0.5 text-xs text-zinc-500">Add your bank details to enable withdrawals</p>
                </div>
                <FiChevronRight className="h-5 w-5 text-zinc-400" />
              </button>
            )}

            {/* MobiKwik Wallet Section */}
            <div className="mt-4">
              {mobikwikNumber ? (
                <div className="overflow-hidden rounded-2xl border border-purple-100 bg-gradient-to-r from-purple-50/90 to-fuchsia-50/80 p-4 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white shadow-lg shadow-purple-300/30">
                      <MdAccountBalanceWallet className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[15px] font-bold text-slate-900">MobiKwik Linked</p>
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-purple-700">
                          Active
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{mobikwikNumber}</p>
                    </div>
                  </div>
                </div>
              ) : showMobikwikInput ? (
                <div className="rounded-2xl border border-purple-100 bg-gradient-to-r from-purple-50/80 to-fuchsia-50/80 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white shadow-md shadow-purple-300/30">
                      <MdAccountBalanceWallet className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[15px] font-bold text-slate-900">Link MobiKwik Wallet</p>
                      <p className="text-[11px] text-zinc-500">
                        {mobikwikOtpStep === "phone" ? "Enter your MobiKwik number" : "Enter OTP sent to your number"}
                      </p>
                    </div>
                  </div>

                  {mobikwikError && (
                    <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                      <p className="text-xs text-red-600 font-medium">{mobikwikError}</p>
                    </div>
                  )}

                  {mobikwikOtpStep === "phone" ? (
                    <>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={mobikwikInput}
                        onChange={(e) => { setMobikwikInput(e.target.value.replace(/\D/g, "").slice(0, 10)); setMobikwikError(""); }}
                        placeholder="Enter 10-digit MobiKwik number"
                        className="w-full rounded-xl border border-purple-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-zinc-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 font-mono tracking-wide"
                      />
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => { setShowMobikwikInput(false); setMobikwikInput(""); setMobikwikError(""); setMobikwikOtpStep("phone"); }}
                          className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={mobikwikInput.length !== 10 || sendingOtp}
                          onClick={async () => {
                            if (mobikwikInput.length !== 10) return;
                            setSendingOtp(true);
                            setMobikwikError("");
                            try {
                              const res = await fetch("/api/mobikwik-otp", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ action: "send", phone: mobikwikInput }),
                              });
                              const data = await res.json();
                              if (!res.ok) {
                                setMobikwikError(data.error || "Failed to send OTP");
                                return;
                              }
                              setMobikwikOtpToken(data.otpToken);
                              setMobikwikOtpStep("otp");
                              // Show OTP for testing (remove when SMS API is integrated)
                              if (data._devOtp) {
                                alert(`Your OTP is: ${data._devOtp}`);
                              }
                            } catch {
                              setMobikwikError("Network error. Try again.");
                            } finally {
                              setSendingOtp(false);
                            }
                          }}
                          className={`flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition ${
                            mobikwikInput.length === 10 && !sendingOtp
                              ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 shadow-lg shadow-purple-400/30 hover:shadow-xl active:scale-[0.98]"
                              : "bg-slate-300 cursor-not-allowed"
                          }`}
                        >
                          {sendingOtp ? "Sending..." : "Send OTP"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="mb-2 rounded-lg bg-purple-100/60 px-3 py-2">
                        <p className="text-xs text-purple-700">OTP sent to <span className="font-bold">{mobikwikInput}</span></p>
                      </div>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={mobikwikOtp}
                        onChange={(e) => { setMobikwikOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); setMobikwikError(""); }}
                        placeholder="Enter 6-digit OTP"
                        className="w-full rounded-xl border border-purple-200 bg-white px-4 py-3 text-center text-lg font-bold text-slate-900 outline-none transition placeholder:text-zinc-400 placeholder:text-sm placeholder:font-medium focus:border-purple-400 focus:ring-2 focus:ring-purple-100 font-mono tracking-[0.5em]"
                        maxLength={6}
                        autoFocus
                      />
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => { setMobikwikOtpStep("phone"); setMobikwikOtp(""); setMobikwikError(""); }}
                          className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          disabled={mobikwikOtp.length !== 6 || verifyingOtp}
                          onClick={async () => {
                            if (mobikwikOtp.length !== 6) return;
                            setVerifyingOtp(true);
                            setMobikwikError("");
                            try {
                              // Step 1: Verify OTP
                              const verifyRes = await fetch("/api/mobikwik-otp", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ action: "verify", phone: mobikwikInput, otp: mobikwikOtp, otpToken: mobikwikOtpToken }),
                              });
                              const verifyData = await verifyRes.json();
                              if (!verifyRes.ok) {
                                setMobikwikError(verifyData.error || "Invalid OTP");
                                return;
                              }
                              // Step 2: Save MobiKwik number to DB
                              const userId = getCurrentUserId();
                              if (userId) {
                                const bankRes = await fetch(`/api/users/${userId}/bank`);
                                const bankData = await bankRes.json();
                                if (bankData.bank) {
                                  await fetch(`/api/users/${userId}/bank`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      bankName: bankData.bank.bankName,
                                      beneficiary: bankData.bank.beneficiary,
                                      accountLast4: bankData.bank.accountLast4,
                                      fullAccount: bankData.bank.fullAccount,
                                      ifsc: bankData.bank.ifsc,
                                      upiId: bankData.bank.upiId || "",
                                      mobikwik: mobikwikInput,
                                    }),
                                  });
                                }
                              }
                              setMobikwikNumber(mobikwikInput);
                              setShowMobikwikInput(false);
                              setMobikwikInput("");
                              setMobikwikOtp("");
                              setMobikwikOtpToken("");
                              setMobikwikOtpStep("phone");
                            } catch {
                              setMobikwikError("Network error. Try again.");
                            } finally {
                              setVerifyingOtp(false);
                            }
                          }}
                          className={`flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition ${
                            mobikwikOtp.length === 6 && !verifyingOtp
                              ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 shadow-lg shadow-purple-400/30 hover:shadow-xl active:scale-[0.98]"
                              : "bg-slate-300 cursor-not-allowed"
                          }`}
                        >
                          {verifyingOtp ? "Verifying..." : "Verify & Link"}
                        </button>
                      </div>
                      <button
                        type="button"
                        disabled={sendingOtp}
                        onClick={async () => {
                          setSendingOtp(true);
                          setMobikwikError("");
                          try {
                            const res = await fetch("/api/mobikwik-otp", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ action: "send", phone: mobikwikInput }),
                            });
                            const data = await res.json();
                            if (!res.ok) {
                              setMobikwikError(data.error || "Failed to resend OTP");
                              return;
                            }
                            setMobikwikOtpToken(data.otpToken);
                            setMobikwikOtp("");
                            if (data._devOtp) {
                              alert(`Your new OTP is: ${data._devOtp}`);
                            }
                          } catch {
                            setMobikwikError("Network error. Try again.");
                          } finally {
                            setSendingOtp(false);
                          }
                        }}
                        className="mt-2 w-full text-center text-xs font-semibold text-purple-600 hover:text-purple-800 transition"
                      >
                        {sendingOtp ? "Resending..." : "Resend OTP"}
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowMobikwikInput(true)}
                  className="flex w-full items-center gap-4 rounded-2xl border border-purple-100 bg-gradient-to-r from-purple-50/80 to-fuchsia-50/80 p-4 text-left transition hover:shadow-md hover:border-purple-200 active:scale-[0.98]"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white shadow-lg shadow-purple-300/40">
                    <MdAccountBalanceWallet className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[15px] font-bold text-slate-900">Link MobiKwik</p>
                    <p className="mt-0.5 text-xs text-zinc-500">Add your MobiKwik wallet for withdrawals</p>
                  </div>
                  <FiChevronRight className="h-5 w-5 text-zinc-400" />
                </button>
              )}
            </div>

            {/* Info Note */}
            <div className="mt-4 rounded-xl bg-amber-50 p-3">
              <p className="text-[12px] text-amber-700 leading-relaxed">
                <span className="font-bold">Note:</span> Withdrawals are processed within 24 hours after binding your bank account. Make sure all details are correct.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom Nav ── */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 z-20 flex w-full max-w-[540px] items-end justify-around border-t border-zinc-200 bg-white px-2 pb-2 pt-1.5">
        {[
          { label: "Home", icon: <AiFillHome className="h-5 w-5" />, active: true, href: "/dashboard" },
          { label: "Orders", icon: <RiReceiptFill className="h-5 w-5" />, active: false, href: "/orders" },
          { label: "Team", icon: <RiTeamFill className="h-5 w-5" />, active: false, href: "/team" },
          { label: "Ranking", icon: <MdLeaderboard className="h-5 w-5" />, active: false, href: "/ranking" },
          { label: "My", icon: <IoPerson className="h-5 w-5" />, active: false, href: "/my" },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 ${item.active ? "text-indigo-600" : "text-zinc-400"}`}
          >
            {item.icon}
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}