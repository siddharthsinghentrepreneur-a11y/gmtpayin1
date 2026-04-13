"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { IoChevronBack } from "react-icons/io5";
import { BsArrowUpRight, BsArrowDownLeft } from "react-icons/bs";
import { FiChevronDown } from "react-icons/fi";
import { getCurrentUserId } from "@/lib/client-auth";

/* ─── Types ─── */
type RecordType = "income" | "expense";
type Category = "all" | "buy_reward" | "recharge" | "reward" | "withdraw" | "purchase";

interface BalanceEntry {
  id: string;
  title: string;
  remark: string;
  amount: number;
  type: RecordType;
  category: Category;
  date: string;
}

const CATEGORY_LABELS: Record<Category, string> = {
  all: "All",
  buy_reward: "Buy Rewards",
  recharge: "Recharge",
  reward: "Reward",
  withdraw: "Withdrawal",
  purchase: "Purchase",
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  buy_reward: { bg: "bg-emerald-50", text: "text-emerald-600", icon: "bg-emerald-500" },
  recharge: { bg: "bg-blue-50", text: "text-blue-600", icon: "bg-blue-500" },
  reward: { bg: "bg-amber-50", text: "text-amber-600", icon: "bg-amber-500" },
  withdraw: { bg: "bg-red-50", text: "text-red-600", icon: "bg-red-500" },
  purchase: { bg: "bg-violet-50", text: "text-violet-600", icon: "bg-violet-500" },
};

function formatAmount(amount: number, type: RecordType) {
  const sign = type === "income" ? "+" : "-";
  return `${sign}${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  if (isToday) return `Today, ${time}`;
  if (isYesterday) return `Yesterday, ${time}`;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) + `, ${time}`;
}

export default function BalanceRecordPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"income" | "expense">("income");
  const [category, setCategory] = useState<Category>("all");
  const [showFilter, setShowFilter] = useState(false);
  const [records, setRecords] = useState<BalanceEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId) {
      // Defer state update to avoid synchronous setState in effect body
      Promise.resolve().then(() => setLoading(false));
      return;
    }
    fetch(`/api/balance-records?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => { if (data.records) setRecords(data.records); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = records.filter((r) => {
    if (r.type !== tab) return false;
    if (category !== "all" && r.category !== category) return false;
    return true;
  });

  const totalIncome = records.filter((r) => r.type === "income").reduce((s, r) => s + r.amount, 0);
  const totalExpense = records.filter((r) => r.type === "expense").reduce((s, r) => s + r.amount, 0);

  return (
    <div className="flex min-h-screen flex-col bg-[#f5f5fa]">
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 border-b border-white/50 bg-white/80 backdrop-blur-xl">
        <div className="relative mx-auto flex w-full max-w-md items-center justify-center px-4 py-3.5">
          <button
            type="button"
            onClick={() => router.back()}
            className="absolute left-4 flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white/80 text-slate-600 shadow-sm transition hover:bg-white hover:shadow-md"
            aria-label="Go back"
          >
            <IoChevronBack className="h-5 w-5" />
          </button>
          <h1 className="text-[17px] font-bold tracking-tight text-slate-900">
            Balance Record
          </h1>
        </div>
      </header>

      {/* ── Income / Expense Toggle ── */}
      <div className="mx-auto mt-4 w-full max-w-md px-4">
        <div className="relative flex rounded-2xl bg-white p-1 shadow-sm">
          <div
            className="absolute top-1 h-[calc(100%-8px)] w-[calc(50%-4px)] rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 shadow-lg shadow-indigo-400/25 transition-all duration-300 ease-out"
            style={{ left: tab === "income" ? 4 : "calc(50% + 0px)" }}
          />
          {(["income", "expense"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setTab(t); setCategory("all"); }}
              className={`relative z-10 flex-1 py-2.5 text-center text-sm font-bold transition-colors duration-200 ${
                tab === t ? "text-white" : "text-slate-500"
              }`}
            >
              {t === "income" ? "Income" : "Expense"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Summary Card ── */}
      <div className="mx-auto mt-3 w-full max-w-md px-4">
        <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {tab === "income" ? "Total Income" : "Total Expense"}
            </p>
            <p className={`mt-1 text-2xl font-extrabold ${tab === "income" ? "text-emerald-600" : "text-slate-900"}`}>
              ₹{(tab === "income" ? totalIncome : totalExpense).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tab === "income" ? "bg-emerald-50" : "bg-slate-100"}`}>
            {tab === "income"
              ? <BsArrowDownLeft className="h-5 w-5 text-emerald-600" />
              : <BsArrowUpRight className="h-5 w-5 text-slate-900" />
            }
          </div>
        </div>
      </div>

      {/* ── Category Filter ── */}
      <div className="mx-auto mt-3 w-full max-w-md px-4">
        <button
          type="button"
          onClick={() => setShowFilter(!showFilter)}
          className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:shadow-md"
        >
          {CATEGORY_LABELS[category]}
          <FiChevronDown className={`h-3.5 w-3.5 transition-transform ${showFilter ? "rotate-180" : ""}`} />
        </button>

        {showFilter && (
          <div className="mt-2 flex flex-wrap gap-2">
            {(Object.keys(CATEGORY_LABELS) as Category[])
              .filter((c) => {
                if (tab === "income") return ["all", "buy_reward", "recharge", "reward"].includes(c);
                return ["all", "withdraw", "purchase"].includes(c);
              })
              .map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { setCategory(c); setShowFilter(false); }}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                    category === c
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-300/40"
                      : "bg-white text-slate-600 shadow-sm hover:shadow-md"
                  }`}
                >
                  {CATEGORY_LABELS[c]}
                </button>
              ))}
          </div>
        )}
      </div>

      {/* ── Records List ── */}
      <div className="mx-auto mt-3 w-full max-w-md flex-1 px-4 pb-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            <p className="mt-3 text-sm font-semibold text-slate-400">Loading records…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <BsArrowDownLeft className="h-6 w-6 text-slate-300" />
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-400">No records found</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((record) => {
              const colors = CATEGORY_COLORS[record.category] || CATEGORY_COLORS.reward;
              return (
                <div
                  key={record.id}
                  className="flex items-center gap-3.5 rounded-2xl bg-white p-4 shadow-sm transition hover:shadow-md"
                >
                  {/* Icon */}
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${colors.bg}`}>
                    {record.type === "income"
                      ? <BsArrowDownLeft className={`h-4.5 w-4.5 ${colors.text}`} />
                      : <BsArrowUpRight className={`h-4.5 w-4.5 ${colors.text}`} />
                    }
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold text-slate-900 truncate">
                      {record.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400 truncate">
                      {record.remark}
                    </p>
                    <p className="mt-1 text-[10px] font-medium text-slate-300">
                      {formatTime(record.date)}
                    </p>
                  </div>

                  {/* Amount */}
                  <p className={`text-[17px] font-extrabold tabular-nums ${
                    record.type === "income" ? "text-emerald-600" : "text-slate-900"
                  }`}>
                    {formatAmount(record.amount, record.type)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
