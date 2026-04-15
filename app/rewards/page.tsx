"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { IoChevronBack } from "react-icons/io5";
import { FiLock, FiCheck, FiTrendingUp } from "react-icons/fi";
import { BsLightningChargeFill } from "react-icons/bs";
import { HiOutlineSparkles } from "react-icons/hi2";
import { getCurrentUserId } from "@/lib/client-auth";

interface DayInfo {
  day: string;
  date: string;
  bonus: number;
  status: "claimed" | "today" | "locked" | "missed";
}

export default function RewardsPage() {
  const [days, setDays] = useState<DayInfo[]>([]);
  const [todayChecked, setTodayChecked] = useState(false);
  const [totalChecked, setTotalChecked] = useState(0);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [balance, setBalance] = useState(0);
  const [drawChances, setDrawChances] = useState(0);
  const [depositAmount, setDepositAmount] = useState(0);
  const [hasDepositToday, setHasDepositToday] = useState(false);
  const [claimError, setClaimError] = useState("");

  const fetchData = (userId: string) => {
    Promise.all([
      fetch(`/api/daily-checkin?userId=${userId}`).then((r) => r.json()),
      fetch(`/api/users/${userId}`).then((r) => r.json()),
      fetch(`/api/jackpot?userId=${userId}`).then((r) => r.json()),
    ])
      .then(([checkinData, userData, jackpotData]) => {
        if (checkinData.days) {
          setDays(checkinData.days);
          setTodayChecked(checkinData.todayChecked);
          setTotalChecked(checkinData.totalCheckedThisWeek);
          setHasDepositToday(checkinData.hasDepositToday ?? false);
        }
        if (userData.balance !== undefined) setBalance(userData.balance);
        if (jackpotData.drawChances !== undefined) {
          setDrawChances(jackpotData.drawChances);
          setDepositAmount(jackpotData.totalDeposit);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId) {
      Promise.resolve().then(() => setLoading(false));
      return;
    }
    fetchData(userId);
  }, []);

  const handleClaim = async () => {
    const userId = getCurrentUserId();
    if (!userId || todayChecked || claiming) return;
    setClaiming(true);
    setClaimError("");
    try {
      const res = await fetch("/api/daily-checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.success) {
        setTodayChecked(true);
        setTotalChecked((p) => p + 1);
        setBalance((p) => p + 5);
        // Update days - mark today as claimed
        setDays((prev) =>
          prev.map((d) => (d.status === "today" ? { ...d, status: "claimed" as const } : d))
        );
      } else if (data.requiresDeposit) {
        setClaimError(data.message);
      }
    } catch {}
    setClaiming(false);
  };
  return (
    <div className="min-h-screen bg-[#f0f0f7] text-zinc-900">
      {/* ── Gradient Header ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#4338ca] via-[#6d28d9] to-[#7c3aed] px-5 pb-24 pt-4">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/[0.07] blur-3xl" />
        <div className="pointer-events-none absolute -left-12 bottom-4 h-44 w-44 rounded-full bg-white/[0.07] blur-3xl" />
        <div className="pointer-events-none absolute right-4 bottom-12 h-20 w-20 rounded-full bg-purple-300/20 blur-xl" />

        {/* Top bar */}
        <div className="relative flex items-center justify-center">
          <Link
            href="/dashboard"
            className="absolute left-0 flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md transition-all hover:bg-white/20 hover:scale-105"
          >
            <IoChevronBack className="h-5 w-5 text-white" />
          </Link>
          <div className="flex items-center gap-2">
            <HiOutlineSparkles className="h-5 w-5 text-amber-300" />
            <h1 className="text-lg font-bold text-white tracking-wide">Daily Rewards</h1>
          </div>
        </div>

        {/* Balance display */}
        <div className="relative mt-8 flex items-end justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/50">
              My Balance
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl">🪙</span>
              <span className="text-5xl font-black text-white drop-shadow-lg">
                {loading ? "..." : balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          {/* Floating decorative elements */}
          <div className="relative mr-2 mb-1">
            <span className="absolute -left-6 -top-4 text-2xl animate-bounce" style={{ animationDuration: "2s" }}>✨</span>
            <span className="text-5xl drop-shadow-lg">🎁</span>
            <span className="absolute -right-4 top-0 text-2xl animate-bounce" style={{ animationDuration: "2.5s", animationDelay: "0.3s" }}>💰</span>
          </div>
        </div>
      </div>

      {/* ── Content (overlapping header) ── */}
      <div className="relative z-10 -mt-12 space-y-5 px-4 pb-12">

        {/* ═══ Sign-in Rewards ═══ */}
        <div className="overflow-hidden rounded-3xl bg-white shadow-[0_12px_40px_-15px_rgba(79,70,229,0.25)]">
          <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
          <div className="px-5 py-5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50">
                <BsLightningChargeFill className="h-3.5 w-3.5 text-indigo-500" />
              </div>
              <h2 className="text-[15px] font-bold text-slate-900">Sign-in Rewards</h2>
            </div>

            {/* ── Progress bar ── */}
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
                style={{ width: `${(totalChecked / 7) * 100}%` }}
              />
            </div>
            <p className="mt-1 text-right text-[10px] font-medium text-zinc-400">{totalChecked} / 7 days</p>

            {/* ── Day circles ── */}
            <div className="mt-3 flex justify-between">
              {(days.length > 0 ? days : Array.from({ length: 7 }, (_, i) => ({ day: `Day ${i + 1}`, bonus: 5, status: "locked" as const }))).map((d, i) => {
                const isClaimed = d.status === "claimed";
                const isToday = d.status === "today";
                return (
                  <div key={i} className="flex flex-col items-center gap-1">
                    {/* Bonus tag */}
                    <span
                      className={`rounded-full px-1.5 py-px text-[9px] font-bold ${
                        isToday
                          ? "bg-amber-100 text-amber-600"
                          : isClaimed
                            ? "bg-emerald-50 text-emerald-500"
                            : d.status === "missed"
                              ? "bg-red-50 text-red-400"
                              : "bg-zinc-50 text-zinc-400"
                      }`}
                    >
                      +{d.bonus}
                    </span>
                    {/* Circle */}
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-full transition-all ${
                        isToday
                          ? "bg-gradient-to-br from-amber-300 via-orange-400 to-amber-500 shadow-lg shadow-orange-300/50 ring-[3px] ring-amber-200/60 scale-110"
                          : isClaimed
                            ? "bg-gradient-to-br from-emerald-400 to-teal-500 shadow-md shadow-emerald-200/40"
                            : d.status === "missed"
                              ? "bg-red-50 ring-1 ring-red-200"
                              : "bg-zinc-100"
                      }`}
                    >
                      {isClaimed ? (
                        <FiCheck className="h-5 w-5 text-white stroke-[3]" />
                      ) : isToday ? (
                        <span className="text-lg">🪙</span>
                      ) : d.status === "missed" ? (
                        <span className="text-[10px] font-bold text-red-400">✕</span>
                      ) : (
                        <FiLock className="h-4 w-4 text-zinc-300" />
                      )}
                    </div>
                    {/* Label */}
                    <span
                      className={`text-[10px] font-semibold ${
                        isToday
                          ? "text-amber-600"
                          : isClaimed
                            ? "text-emerald-500"
                            : d.status === "missed"
                              ? "text-red-400"
                              : "text-zinc-400"
                      }`}
                    >
                      {d.day}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Deposit requirement notice */}
            {!todayChecked && !hasDepositToday && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 ring-1 ring-amber-200/60">
                <span className="text-lg">⚠️</span>
                <p className="text-[11px] font-medium text-amber-700">
                  Today deposit required to claim daily reward. <Link href="/buy" className="text-indigo-600 underline">Deposit now</Link>
                </p>
              </div>
            )}

            {/* Error message */}
            {claimError && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2.5 ring-1 ring-red-200/60">
                <span className="text-lg">❌</span>
                <p className="text-[11px] font-medium text-red-600">{claimError}</p>
              </div>
            )}

            {/* Collect today button */}
            <button
              type="button"
              onClick={handleClaim}
              disabled={todayChecked || claiming || !hasDepositToday}
              className={`mt-5 w-full rounded-2xl py-3 text-sm font-bold text-white shadow-lg transition-all ${
                todayChecked
                  ? "bg-emerald-500 shadow-emerald-300/40"
                  : claiming
                    ? "bg-orange-300 shadow-orange-200/40"
                    : !hasDepositToday
                      ? "bg-zinc-300 shadow-none cursor-not-allowed"
                      : "bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 shadow-orange-300/40 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
              }`}
            >
              {todayChecked ? "✓ Claimed Today" : claiming ? "Claiming..." : !hasDepositToday ? "Deposit Required to Claim" : "Collect Today's Reward"}
            </button>
          </div>
        </div>

        {/* ═══ Recharge Rewards ═══ */}
        <div className="overflow-hidden rounded-3xl bg-white shadow-[0_12px_40px_-15px_rgba(79,70,229,0.25)]">
          <div className="px-5 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50">
                  <FiTrendingUp className="h-3.5 w-3.5 text-violet-500" />
                </div>
                <h2 className="text-[15px] font-bold text-slate-900">
                  Recharge Rewards
                </h2>
              </div>
              <button
                type="button"
                onClick={() => window.location.href = "/jackpot"}
                className="text-sm font-semibold text-indigo-500 transition hover:text-indigo-700"
              >
                Go Draw &gt;
              </button>
            </div>

            <div className="mt-3 overflow-hidden rounded-2xl bg-gradient-to-br from-[#f8f7ff] to-[#f3f0ff] p-4 ring-1 ring-indigo-100/60">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-zinc-500">
                    Get 1 draw chance for every
                  </p>
                  <p className="mt-0.5 text-xl font-extrabold text-orange-500">
                    ₹20,000{" "}
                    <span className="text-xs font-medium text-zinc-400">
                      recharge
                    </span>
                  </p>
                </div>
                <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-600 shadow-sm">
                  +{drawChances} Chance{drawChances !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-indigo-100/60 pt-3">
                <p className="text-[11px] text-zinc-400">
                  2-Day Deposit: <span className="font-semibold text-zinc-500">₹{depositAmount.toLocaleString("en-IN")}</span>
                </p>
                <span className={`rounded-full px-4 py-1.5 text-[11px] font-bold text-white shadow-md ${
                  drawChances > 0
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-200/40"
                    : "bg-gradient-to-r from-indigo-500 to-violet-500 shadow-indigo-200/40"
                }`}>
                  {drawChances > 0 ? "Eligible ✓" : "Unmet"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ Ranking Rewards ═══ */}
        <div className="overflow-hidden rounded-3xl bg-white shadow-[0_12px_40px_-15px_rgba(79,70,229,0.25)]">
          <div className="px-5 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50">
                  <span className="text-sm">🏆</span>
                </div>
                <h2 className="text-[15px] font-bold text-slate-900">
                  Ranking Rewards
                </h2>
              </div>
              <Link
                href="/ranking"
                className="text-sm font-semibold text-indigo-500 transition hover:text-indigo-700"
              >
                View Rankings &gt;
              </Link>
            </div>

            <div className="mt-3 overflow-hidden rounded-2xl bg-gradient-to-br from-[#f8f7ff] to-[#f3f0ff] p-4 ring-1 ring-indigo-100/60">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-zinc-500">
                    Top 3 yesterday&apos;s recharge
                  </p>
                  <div className="mt-1.5 flex items-center gap-1">
                    <span className="text-xs text-zinc-400">rewards:</span>
                    {[300, 200, 100].map((v, i) => (
                      <span key={i} className="flex items-center gap-0.5">
                        {i > 0 && <span className="text-zinc-300">·</span>}
                        <span className={`rounded-md px-1.5 py-0.5 text-xs font-bold ${
                          i === 0
                            ? "bg-amber-100 text-amber-600"
                            : i === 1
                              ? "bg-zinc-100 text-zinc-600"
                              : "bg-orange-50 text-orange-500"
                        }`}>
                          {v}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
                <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-600 shadow-sm">
                  +0 Balance
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-indigo-100/60 pt-3">
                <p className="text-[11px] text-zinc-400">
                  My Rank: <span className="font-semibold text-zinc-500">0th</span>
                </p>
                <span className="rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-1.5 text-[11px] font-bold text-white shadow-md shadow-indigo-200/40">
                  Unmet
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
