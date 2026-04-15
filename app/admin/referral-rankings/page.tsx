"use client";

import { useEffect, useState } from "react";
import {
  MdLeaderboard,
  MdPeople,
  MdTrendingUp,
  MdToday,
  MdContentCopy,
  MdSearch,
  MdFilterList,
  MdExpandMore,
  MdExpandLess,
  MdAccountBalanceWallet,
} from "react-icons/md";

interface RecentReferral {
  id: string;
  name: string | null;
  phone: string;
  createdAt: string;
}

interface RankingEntry {
  id: string;
  uid: string;
  name: string | null;
  phone: string;
  referralCode: string;
  totalReferrals: number;
  todayReferrals: number;
  weekReferrals: number;
  monthReferrals: number;
  totalCommission: number;
  recentReferrals: RecentReferral[];
}

interface Summary {
  totalUsers: number;
  usersWithReferrals: number;
  totalJoinings: number;
  todayJoinings: number;
  totalCommissions: number;
}

type Period = "all" | "today" | "week" | "month";

export default function ReferralRankingsPage() {
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<Period>("all");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    fetchRankings();
  }, []);

  const fetchRankings = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/referral-rankings");
      if (!res.ok) throw new Error("Failed to fetch rankings");
      const data = await res.json();
      setRankings(data.rankings);
      setSummary(data.summary);
    } catch {
      setError("Failed to load referral rankings");
    } finally {
      setLoading(false);
    }
  };

  const getReferralCount = (entry: RankingEntry) => {
    switch (period) {
      case "today":
        return entry.todayReferrals;
      case "week":
        return entry.weekReferrals;
      case "month":
        return entry.monthReferrals;
      default:
        return entry.totalReferrals;
    }
  };

  const filteredRankings = rankings
    .filter((r) => {
      const q = search.toLowerCase();
      if (!q) return true;
      return (
        (r.name?.toLowerCase() || "").includes(q) ||
        r.phone.includes(q) ||
        r.referralCode.toLowerCase().includes(q) ||
        r.uid.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => getReferralCount(b) - getReferralCount(a))
    .filter((r) => period === "all" || getReferralCount(r) > 0);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const maskPhone = (phone: string) =>
    phone.length >= 10
      ? phone.slice(0, 4) + "****" + phone.slice(-2)
      : phone;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading rankings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center max-w-sm">
          <p className="text-red-400 font-medium">{error}</p>
          <button
            onClick={fetchRankings}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <MdLeaderboard className="text-indigo-600" />
            Referral Rankings
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Track which referral links are driving the most joins
          </p>
        </div>
        <button
          onClick={fetchRankings}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl p-4 text-white">
            <div className="flex items-center gap-2 text-indigo-200 text-xs font-medium mb-1">
              <MdPeople size={16} />
              Total Users
            </div>
            <p className="text-2xl font-bold">{summary.totalUsers}</p>
          </div>
          <div className="bg-gradient-to-br from-violet-500 to-violet-700 rounded-2xl p-4 text-white">
            <div className="flex items-center gap-2 text-violet-200 text-xs font-medium mb-1">
              <MdTrendingUp size={16} />
              With Referrals
            </div>
            <p className="text-2xl font-bold">{summary.usersWithReferrals}</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-4 text-white">
            <div className="flex items-center gap-2 text-emerald-200 text-xs font-medium mb-1">
              <MdPeople size={16} />
              Total Joinings
            </div>
            <p className="text-2xl font-bold">{summary.totalJoinings}</p>
          </div>
          <div className="bg-gradient-to-br from-amber-500 to-amber-700 rounded-2xl p-4 text-white">
            <div className="flex items-center gap-2 text-amber-200 text-xs font-medium mb-1">
              <MdToday size={16} />
              Today Joinings
            </div>
            <p className="text-2xl font-bold">{summary.todayJoinings}</p>
          </div>
          <div className="bg-gradient-to-br from-rose-500 to-rose-700 rounded-2xl p-4 text-white col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 text-rose-200 text-xs font-medium mb-1">
              <MdAccountBalanceWallet size={16} />
              Total Commission
            </div>
            <p className="text-2xl font-bold">₹{summary.totalCommissions.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search by name, phone, referral code, UID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <MdFilterList className="text-slate-400" size={20} />
          {(["all", "today", "week", "month"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                period === p
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {p === "all" ? "All Time" : p === "today" ? "Today" : p === "week" ? "This Week" : "This Month"}
            </button>
          ))}
        </div>
      </div>

      {/* Rankings Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Referral Code
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">
                  Today
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">
                  This Week
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">
                  This Month
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">
                  Total
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                  Commission
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRankings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400 text-sm">
                    No referral data found
                  </td>
                </tr>
              ) : (
                filteredRankings.map((entry, idx) => (
                  <RankingRow
                    key={entry.id}
                    entry={entry}
                    rank={idx + 1}
                    period={period}
                    getReferralCount={getReferralCount}
                    expanded={expandedUser === entry.id}
                    onToggle={() =>
                      setExpandedUser(expandedUser === entry.id ? null : entry.id)
                    }
                    copiedCode={copiedCode}
                    onCopy={copyCode}
                    formatDate={formatDate}
                    maskPhone={maskPhone}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RankingRow({
  entry,
  rank,
  expanded,
  onToggle,
  copiedCode,
  onCopy,
  formatDate,
  maskPhone,
}: {
  entry: RankingEntry;
  rank: number;
  period: Period;
  getReferralCount: (e: RankingEntry) => number;
  expanded: boolean;
  onToggle: () => void;
  copiedCode: string | null;
  onCopy: (code: string) => void;
  formatDate: (d: string) => string;
  maskPhone: (p: string) => string;
}) {
  const rankBadge =
    rank === 1
      ? "bg-gradient-to-r from-yellow-400 to-amber-500 text-white"
      : rank === 2
        ? "bg-gradient-to-r from-slate-300 to-slate-400 text-white"
        : rank === 3
          ? "bg-gradient-to-r from-amber-600 to-amber-700 text-white"
          : "bg-slate-100 text-slate-600";

  return (
    <>
      <tr className="hover:bg-slate-50 transition-colors">
        <td className="px-4 py-3">
          <span
            className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${rankBadge}`}
          >
            {rank}
          </span>
        </td>
        <td className="px-4 py-3">
          <div>
            <p className="font-medium text-slate-900 text-sm">
              {entry.name || "Unknown"}
            </p>
            <p className="text-xs text-slate-400">{maskPhone(entry.phone)}</p>
            <p className="text-[10px] text-slate-300">UID: {entry.uid}</p>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-sm font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
              {entry.referralCode}
            </span>
            <button
              onClick={() => onCopy(entry.referralCode)}
              className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
              title="Copy referral code"
            >
              <MdContentCopy size={14} />
            </button>
            {copiedCode === entry.referralCode && (
              <span className="text-[10px] text-emerald-500 font-medium">
                Copied!
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-center">
          <span
            className={`inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full text-xs font-bold ${
              entry.todayReferrals > 0
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-400"
            }`}
          >
            {entry.todayReferrals}
          </span>
        </td>
        <td className="px-4 py-3 text-center">
          <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
            {entry.weekReferrals}
          </span>
        </td>
        <td className="px-4 py-3 text-center">
          <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full text-xs font-bold bg-violet-100 text-violet-700">
            {entry.monthReferrals}
          </span>
        </td>
        <td className="px-4 py-3 text-center">
          <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
            {entry.totalReferrals}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          <span className="text-sm font-semibold text-slate-900">
            ₹{entry.totalCommission.toFixed(2)}
          </span>
        </td>
        <td className="px-4 py-3 text-center">
          <button
            onClick={onToggle}
            className="p-1.5 bg-slate-100 hover:bg-indigo-100 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors"
          >
            {expanded ? <MdExpandLess size={18} /> : <MdExpandMore size={18} />}
          </button>
        </td>
      </tr>
      {expanded && entry.recentReferrals.length > 0 && (
        <tr>
          <td colSpan={9} className="bg-slate-50 px-6 py-4">
            <div className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Recent Joinings via {entry.referralCode}
            </div>
            <div className="grid gap-2">
              {entry.recentReferrals.map((ref) => (
                <div
                  key={ref.id}
                  className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 border border-slate-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                      <MdPeople size={16} className="text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {ref.name || "Unknown"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {maskPhone(ref.phone)}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400">
                    {formatDate(ref.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
