"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MdPeople,
  MdReceipt,
  MdAccountBalanceWallet,
  MdTrendingUp,
  MdCheckCircle,
  MdCancel,
  MdArrowForward,
  MdCurrencyRupee,
  MdAccessTime,
  MdSwapVert,
  MdWarning,
} from "react-icons/md";

/* ─── Types ─── */
interface Activity {
  id: string;
  user: string;
  uid: string;
  type: "Buy" | "Sell" | "Register" | "UPI";
  amount?: string;
  status: string;
  time: string;
}

interface PendingOrder {
  id: string;
  user: string;
  phone: string;
  type: "Buy" | "Sell";
  amount: string;
  status: string;
  time: string;
  uid: string;
}

interface TopUser {
  uid: string;
  phone: string;
  orders: number;
  volume: number;
  buyCount: number;
  sellCount: number;
}

interface DashboardData {
  revenue: {
    today: { amount: number; orders: number };
    week: { amount: number; orders: number };
    month: { amount: number; orders: number };
  };
  stats: {
    totalUsers: number;
    usersToday: number;
    totalBuyOrders: number;
    buyOrdersToday: number;
    pendingBuyOrders: number;
    totalBankAccounts: number;
  };
  miniStats: {
    commission: number;
    buyVolume: number;
    sellVolume: number;
    successRate: number;
  };
  recentActivity: Activity[];
  pendingOrders: PendingOrder[];
  topUsers: TopUser[];
}

const ACTIVITY_STYLES: Record<string, { icon: string; color: string }> = {
  Buy: { icon: "↓", color: "bg-emerald-100 text-emerald-700" },
  Sell: { icon: "↑", color: "bg-orange-100 text-orange-700" },
  Register: { icon: "+", color: "bg-indigo-100 text-indigo-700" },
  UPI: { icon: "◎", color: "bg-violet-100 text-violet-700" },
};

const STATUS_DOT: Record<string, string> = {
  Success: "bg-emerald-500",
  Completed: "bg-emerald-500",
  Failed: "bg-red-500",
  Paying: "bg-amber-500",
  Checking: "bg-sky-500",
  Pending: "bg-amber-500",
  Processing: "bg-sky-500",
  Active: "bg-emerald-500",
  Added: "bg-emerald-500",
  Cancelled: "bg-red-500",
};

/* ─── Component ─── */
export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [confirmAction, setConfirmAction] = useState<{ order: PendingOrder; action: "approve" | "reject" } | null>(null);
  const [revenueTab, setRevenueTab] = useState<"today" | "week" | "month">("today");

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((res) => res.json())
      .then((d) => {
        if (!d.error) {
          setData(d);
          setPendingOrders(d.pendingOrders || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function executeAction() {
    if (!confirmAction) return;
    const { order } = confirmAction;
    setPendingOrders((prev) => prev.filter((o) => o.id !== order.id));
    setConfirmAction(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-slate-400">
        <p className="text-lg font-semibold">Unable to load dashboard</p>
        <p className="text-sm mt-1">Database may be unreachable</p>
      </div>
    );
  }

  const pendingCount = pendingOrders.length;
  const rev = data.revenue[revenueTab];

  const STATS = [
    {
      label: "Total Users",
      value: data.stats.totalUsers.toLocaleString(),
      sub: `${data.stats.usersToday} joined today`,
      icon: MdPeople,
      gradient: "from-indigo-500 to-indigo-600",
      href: "/admin/users",
    },
    {
      label: "Buy Orders",
      value: data.stats.totalBuyOrders.toLocaleString(),
      sub: `${data.stats.buyOrdersToday} today · ${data.stats.pendingBuyOrders} pending`,
      icon: MdReceipt,
      gradient: "from-emerald-500 to-emerald-600",
      href: "/admin/buy-orders",
    },
    {
      label: "UPI Accounts",
      value: data.stats.totalBankAccounts.toLocaleString(),
      sub: "linked accounts",
      icon: MdAccountBalanceWallet,
      gradient: "from-amber-500 to-orange-500",
      href: "/admin/upi-accounts",
    },
  ];

  const maxTopUserOrders = data.topUsers.length > 0 ? Math.max(...data.topUsers.map((u) => u.orders)) : 1;

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Monitor platform activity in real-time · {new Date().toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
            </span>
            <span className="text-sm font-bold text-amber-800">{pendingCount} Pending</span>
            <span className="text-xs text-amber-600">needs review</span>
          </div>
        )}
      </div>

      {/* Revenue Card */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 shadow-xl shadow-slate-900/10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <MdCurrencyRupee className="h-5 w-5 text-indigo-400" />
              <p className="text-sm font-medium text-slate-400">Total Revenue</p>
            </div>
            <p className="text-4xl font-extrabold text-white tracking-tight">₹{rev.amount.toLocaleString()}</p>
            <div className="mt-2 flex items-center gap-3">
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
                <MdTrendingUp className="h-3.5 w-3.5" /> {rev.orders} orders
              </span>
            </div>
          </div>
          <div className="flex rounded-xl bg-white/5 p-1 border border-white/10">
            {(["today", "week", "month"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setRevenueTab(t)}
                className={`rounded-lg px-4 py-2 text-xs font-bold capitalize transition ${
                  revenueTab === t
                    ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Mini Stats Row */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Commission</p>
            <p className="mt-1 text-lg font-extrabold text-emerald-400">₹{Math.round(data.miniStats.commission).toLocaleString()}</p>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Buy Volume</p>
            <p className="mt-1 text-lg font-extrabold text-indigo-400">₹{Math.round(data.miniStats.buyVolume).toLocaleString()}</p>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sell Volume</p>
            <p className="mt-1 text-lg font-extrabold text-orange-400">₹{Math.round(data.miniStats.sellVolume).toLocaleString()}</p>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Success Rate</p>
            <p className="mt-1 text-lg font-extrabold text-emerald-400">{data.miniStats.successRate}%</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STATS.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="group rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm transition hover:shadow-lg hover:-translate-y-0.5"
          >
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${stat.gradient}`}>
              <stat.icon className="h-5 w-5 text-white" />
            </div>
            <p className="mt-3 text-2xl font-extrabold text-slate-900">{stat.value}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">{stat.sub}</p>
            <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-indigo-500 opacity-0 transition group-hover:opacity-100">
              View Details <MdArrowForward className="h-3.5 w-3.5" />
            </div>
          </Link>
        ))}
      </div>

      {/* Pending Review Section */}
      {pendingCount > 0 && (
        <div className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/50 shadow-sm">
          <div className="flex items-center justify-between border-b border-amber-200/80 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <MdWarning className="h-5 w-5 text-amber-600" />
              <h2 className="text-base font-bold text-amber-900">Pending Review</h2>
              <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-[11px] font-bold text-white shadow shadow-amber-500/30">
                {pendingCount}
              </span>
            </div>
            <div className="flex gap-3">
              <Link href="/admin/buy-orders" className="flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900 transition">
                Buy Orders <MdArrowForward className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
          <div className="divide-y divide-amber-100">
            {pendingOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between gap-4 px-5 py-3.5 transition hover:bg-amber-100/40">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`shrink-0 flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold ${
                    order.type === "Buy" ? "bg-indigo-100 text-indigo-700" : "bg-orange-100 text-orange-700"
                  }`}>
                    {order.type === "Buy" ? "↓" : "↑"}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800">{order.phone}</p>
                      <span className="text-[10px] text-slate-400">{order.user}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        order.type === "Buy" ? "bg-indigo-50 text-indigo-600" : "bg-orange-50 text-orange-600"
                      }`}>{order.type}</span>
                      <span className="text-[10px] text-slate-400">{order.status} · {order.time}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-sm font-bold text-slate-900">{order.amount}</span>
                  <button
                    onClick={() => setConfirmAction({ order, action: "approve" })}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-sm hover:bg-emerald-600 transition"
                    title="Approve"
                  >
                    <MdCheckCircle className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setConfirmAction({ order, action: "reject" })}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500 text-white shadow-sm hover:bg-red-600 transition"
                    title="Reject"
                  >
                    <MdCancel className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity + Top Users */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Live Activity Feed */}
        <div className="xl:col-span-2 rounded-2xl border border-slate-200/60 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <MdSwapVert className="h-5 w-5 text-slate-400" />
              <h2 className="text-base font-bold text-slate-900">Live Activity</h2>
              <span className="relative flex h-2 w-2 ml-1">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
            </div>
            <Link href="/admin/buy-orders" className="flex items-center gap-1 text-xs font-semibold text-indigo-500 hover:text-indigo-700 transition">
              View All <MdArrowForward className="h-3.5 w-3.5" />
            </Link>
          </div>
          {data.recentActivity.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">No recent activity</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {data.recentActivity.map((a) => {
                const style = ACTIVITY_STYLES[a.type] || ACTIVITY_STYLES.Buy;
                return (
                  <div key={a.id} className="flex items-center gap-3 px-5 py-3 transition hover:bg-slate-50/60">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold ${style.color}`}>
                      {style.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-800">{a.user}</p>
                        <span className="text-[10px] text-slate-400">UID: {a.uid}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${style.color}`}>{a.type}</span>
                        {a.amount && <span className="text-xs font-semibold text-slate-700">{a.amount}</span>}
                        <span className="flex items-center gap-1 text-[10px] text-slate-400">
                          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[a.status] || "bg-slate-400"}`} />
                          {a.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 shrink-0">
                      <MdAccessTime className="h-3 w-3" />
                      {a.time}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Users */}
        <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-slate-900">Top Users</h2>
            <Link href="/admin/users" className="flex items-center gap-1 text-xs font-semibold text-indigo-500 hover:text-indigo-700 transition">
              View All <MdArrowForward className="h-3.5 w-3.5" />
            </Link>
          </div>
          {data.topUsers.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">No users yet</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {data.topUsers.map((user, idx) => (
                <div key={user.uid + idx} className="px-5 py-3.5 transition hover:bg-slate-50/60">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                      idx === 0 ? "bg-amber-100 text-amber-700"
                      : idx === 1 ? "bg-slate-200 text-slate-600"
                      : idx === 2 ? "bg-orange-100 text-orange-700"
                      : "bg-slate-100 text-slate-500"
                    }`}>
                      #{idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{user.phone}</p>
                      <p className="text-[10px] text-slate-400">UID: {user.uid}</p>
                    </div>
                    <span className="text-sm font-bold text-slate-900">₹{user.volume.toLocaleString()}</span>
                  </div>
                  <div className="mt-2 ml-11 flex items-center gap-3">
                    <span className="text-[10px] text-slate-400">{user.orders} total</span>
                    <span className="text-[10px] text-emerald-600">{user.buyCount} buy</span>
                    <span className="text-[10px] text-orange-600">{user.sellCount} sell</span>
                    <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                        style={{ width: `${Math.min((user.orders / maxTopUserOrders) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-[slideUp_0.2s_ease]">
            <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
              confirmAction.action === "approve" ? "bg-emerald-100" : "bg-red-100"
            }`}>
              {confirmAction.action === "approve" ? (
                <MdCheckCircle className="h-8 w-8 text-emerald-600" />
              ) : (
                <MdCancel className="h-8 w-8 text-red-600" />
              )}
            </div>
            <h3 className="mt-4 text-center text-lg font-bold text-slate-900">
              {confirmAction.action === "approve" ? "Approve Order?" : "Reject Order?"}
            </h3>
            <p className="mt-1.5 text-center text-sm text-slate-500">
              {confirmAction.action === "approve"
                ? "This will mark the order as successful and process the payment."
                : "This will reject the order and notify the user."}
            </p>
            <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100 p-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{confirmAction.order.type} Order</span>
                <span>{confirmAction.order.phone}</span>
              </div>
              <p className="mt-1 text-center text-2xl font-extrabold text-slate-900">{confirmAction.order.amount}</p>
            </div>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={executeAction}
                className={`flex-1 rounded-xl py-2.5 text-sm font-bold text-white shadow-lg transition ${
                  confirmAction.action === "approve"
                    ? "bg-emerald-500 shadow-emerald-500/25 hover:bg-emerald-600"
                    : "bg-red-500 shadow-red-500/25 hover:bg-red-600"
                }`}
              >
                {confirmAction.action === "approve" ? "Approve" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
