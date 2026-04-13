"use client";

import { getCurrentUserId } from "@/lib/client-auth";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AiFillHome } from "react-icons/ai";
import { RiReceiptFill, RiTeamFill } from "react-icons/ri";
import { MdLeaderboard } from "react-icons/md";
import { IoPerson } from "react-icons/io5";
import { FaTrophy } from "react-icons/fa";
import { HiOutlineTrendingUp } from "react-icons/hi";

type PeriodTab = "Yesterday" | "Today";

type LeaderboardEntry = {
  rank: number;
  id: string;
  uid: string;
  amount: number;
};

type RankingResponse = {
  leaderboard: LeaderboardEntry[];
  myEntry: (LeaderboardEntry & { rank: number | null }) | null;
};

function formatAmount(amount: number) {
  return amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatHeaderDate(tab: PeriodTab) {
  const date = new Date();

  if (tab === "Yesterday") {
    date.setDate(date.getDate() - 1);
  }

  return date.toLocaleDateString("en-IN");
}

function Medal({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="relative flex h-10 w-10 items-center justify-center">
        <div className="absolute inset-0 animate-pulse rounded-full bg-yellow-400/30" />
        <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-500 text-sm font-black text-amber-900 shadow-[0_4px_14px_-3px_rgba(245,158,11,0.6)]">
          <FaTrophy className="mr-0.5 h-3 w-3" /> 1
        </span>
      </div>
    );
  }
  if (rank === 2) {
    return (
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-zinc-200 via-zinc-300 to-slate-400 text-sm font-black text-slate-700 shadow-md">
        2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-orange-300 via-orange-400 to-amber-600 text-sm font-black text-orange-900 shadow-md">
        3
      </span>
    );
  }
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-sm font-bold text-zinc-600">
      {rank}
    </span>
  );
}

export default function RankingPage() {
  const [tab, setTab] = useState<PeriodTab>("Today");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myEntry, setMyEntry] = useState<RankingResponse["myEntry"]>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const period = useMemo(() => (tab === "Today" ? "today" : "yesterday"), [tab]);

  useEffect(() => {
    let cancelled = false;

    async function loadRanking() {
      setLoading(true);
      setError("");

      try {
        const userId = getCurrentUserId();
        const query = userId ? `?period=${period}&userId=${userId}` : `?period=${period}`;
        const response = await fetch(`/api/ranking${query}`);
        const data = (await response.json()) as RankingResponse | { error?: string };

        if (!response.ok) {
          if (!cancelled) {
            setLeaderboard([]);
            setMyEntry(null);
            setError((data as { error?: string }).error || "Unable to load rankings");
          }
          return;
        }

        if (!cancelled) {
          const rankingData = data as RankingResponse;
          setLeaderboard(rankingData.leaderboard);
          setMyEntry(rankingData.myEntry);
        }
      } catch {
        if (!cancelled) {
          setLeaderboard([]);
          setMyEntry(null);
          setError("Unable to load rankings");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadRanking();

    return () => {
      cancelled = true;
    };
  }, [period]);

  return (
    <div className="min-h-screen bg-[#f5f5fa] text-zinc-900">
      {/* ── Gradient Header ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#4f46e5] via-[#6d28d9] to-[#7c3aed] px-5 pb-20 pt-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

        <h1 className="relative text-center text-lg font-bold tracking-wide text-white">
          Ranking
        </h1>
        <p className="relative mt-1 text-center text-xs text-white/60">
          {formatHeaderDate(tab)}
        </p>

        {/* Tab pills inside header */}
        <div className="relative mx-auto mt-4 flex w-56 overflow-hidden rounded-full bg-white/15 p-1 backdrop-blur-sm">
          {(["Yesterday", "Today"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 rounded-full py-1.5 text-xs font-semibold transition-all ${
                tab === t
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-white/80"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── My Ranking (floating card) ── */}
      <div className="relative z-10 -mt-10 px-4">
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_-12px_rgba(79,70,229,0.35)]">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 to-amber-100 text-xl ring-2 ring-indigo-100">
                🤓
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{myEntry?.uid ?? "-----"}</p>
                <p className="text-[10px] text-zinc-400">Your Ranking</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-extrabold text-indigo-600">
                {myEntry?.rank ? `#${myEntry.rank}` : "--"}
              </p>
              <p className="text-[10px] text-zinc-400">Position</p>
            </div>
          </div>
          <div className="border-t border-zinc-100 px-4 py-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-500">Total Deposit</span>
              <span className="font-bold text-slate-900">₹{formatAmount(myEntry?.amount ?? 0)}</span>
            </div>
          </div>
          <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
        </div>
      </div>

      {/* ── Leaderboard ── */}
      <div className="overflow-y-auto pb-24">
        {/* Column Header */}
        <div className="mt-5 flex items-center px-6 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
          <span className="w-14">Rank</span>
          <span className="flex-1 pl-1">User</span>
          <span className="flex items-center gap-0.5 text-right">
            <HiOutlineTrendingUp className="h-3 w-3" /> Amount
          </span>
        </div>

        <div className="mt-2 space-y-2 px-4">
          {loading ? (
            <div className="rounded-2xl bg-white px-4 py-6 text-center text-sm text-zinc-500 shadow-sm">
              Loading rankings...
            </div>
          ) : null}

          {!loading && error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-center text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {!loading && !error && leaderboard.length === 0 ? (
            <div className="rounded-2xl bg-white px-4 py-6 text-center text-sm text-zinc-500 shadow-sm">
              No completed deposits found for this period yet.
            </div>
          ) : null}

          {!loading && !error && leaderboard.map((entry) => {
            const isTop3 = entry.rank <= 3;
            return (
              <div
                key={entry.id}
                className={`flex items-center rounded-2xl px-3 py-3 transition ${
                  isTop3
                    ? "bg-white shadow-sm"
                    : "bg-white/60"
                }`}
              >
                <div className="flex w-12 items-center justify-center">
                  <Medal rank={entry.rank} />
                </div>
                <div className="flex flex-1 items-center gap-2.5 pl-1">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full text-base ${
                    isTop3
                      ? "bg-gradient-to-br from-amber-100 to-amber-50 ring-2 ring-amber-200"
                      : "bg-zinc-100"
                  }`}>
                    🧑
                  </div>
                  <span className="text-sm font-semibold text-slate-800">
                    {entry.uid}
                  </span>
                </div>
                <span className={`text-sm font-bold ${
                  isTop3 ? "text-indigo-600" : "text-zinc-600"
                }`}>
                  ₹{formatAmount(entry.amount)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Bottom Nav ── */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 z-20 flex w-full max-w-[540px] items-end justify-around border-t border-zinc-200 bg-white px-2 pb-2 pt-1.5">
        {[
          { label: "Home", icon: <AiFillHome className="h-5 w-5" />, active: false, href: "/dashboard" },
          { label: "Orders", icon: <RiReceiptFill className="h-5 w-5" />, active: false, href: "/orders" },
          { label: "Team", icon: <RiTeamFill className="h-5 w-5" />, active: false, href: "/team" },
          { label: "Ranking", icon: <MdLeaderboard className="h-5 w-5" />, active: true, href: "/ranking" },
          { label: "My", icon: <IoPerson className="h-5 w-5" />, active: false, href: "/my" },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 ${
              item.active ? "text-indigo-600" : "text-zinc-400"
            }`}
          >
            {item.icon}
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
