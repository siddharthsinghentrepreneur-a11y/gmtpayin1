"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { AiFillHome } from "react-icons/ai";
import { RiReceiptFill, RiTeamFill } from "react-icons/ri";
import { MdLeaderboard } from "react-icons/md";
import { IoPerson, IoCopyOutline, IoChevronBack } from "react-icons/io5";
import { FaRupeeSign } from "react-icons/fa";
import { getCurrentUserId } from "@/lib/client-auth";

interface Order {
  id: string;
  offerId: string | null;
  orderNo: string;
  amount: number;
  currency: "INR" | "USDT";
  receive: number;
  status: string;
  utr: string;
  time: string;
  upiId: string;
  accountName: string;
  accountNumber: string;
  ifsc: string;
  bank: string;
}

const FILTERS = ["All", "Paying", "Checking", "Success", "Failed"];

const STATUS_COLORS: Record<string, string> = {
  Failed: "bg-red-50 text-red-500",
  Success: "bg-emerald-50 text-emerald-600",
  Paying: "bg-amber-50 text-amber-600",
  Checking: "bg-blue-50 text-blue-600",
};

export default function OrdersPage() {
  const [currency, setCurrency] = useState<"INR" | "USDT">("INR");
  const [activeFilter, setActiveFilter] = useState("All");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId) {
      Promise.resolve().then(() => setLoading(false));
      return;
    }
    fetch(`/api/orders?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => { if (data.orders) setOrders(data.orders); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = orders.filter((o) => {
    if (o.currency !== currency) return false;
    if (activeFilter !== "All" && o.status !== activeFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#f5f5fa] text-zinc-900">
      {/* ── Gradient Header ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#4f46e5] via-[#6d28d9] to-[#7c3aed] px-5 pb-6 pt-5">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <h1 className="relative text-center text-lg font-bold text-white">
          Purchase Records
        </h1>
      </div>

      {/* ── Currency Toggle (glassmorphic) ── */}
      <div className="flex justify-center px-4 -mt-4 relative z-10">
        <div className="flex w-64 overflow-hidden rounded-full bg-white shadow-[0_4px_20px_-6px_rgba(79,70,229,0.25)]">
          {(["INR", "USDT"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCurrency(c)}
              className={`flex-1 py-2.5 text-sm font-semibold transition-all ${
                currency === c
                  ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-inner"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* ── Filter Pills ── */}
      <div className="mt-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setActiveFilter(f)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
              activeFilter === f
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-300/40"
                : "bg-white text-zinc-500 shadow-sm hover:text-zinc-700"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* ── Orders List ── */}
      <div className="overflow-y-auto space-y-3 px-4 pb-24 pt-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            <p className="mt-3 text-sm font-semibold text-slate-400">Loading orders…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            {currency === "USDT" ? (
              <Image src="/usdt-png.jpg" alt="USDT" width={64} height={64} className="rounded-full opacity-30" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <FaRupeeSign className="h-6 w-6 text-slate-300" />
              </div>
            )}
            <p className="mt-4 text-sm font-semibold text-slate-400">No orders found</p>
          </div>
        ) : (
        filtered.map((order) => (
          <div
            key={order.orderNo}
            className="overflow-hidden rounded-2xl bg-white shadow-[0_4px_20px_-8px_rgba(79,70,229,0.15)] transition hover:shadow-[0_8px_30px_-12px_rgba(79,70,229,0.3)]"
          >
            <div className="px-4 py-3.5">
              {/* Top row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {currency === "USDT" ? (
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl overflow-hidden ring-2 ring-emerald-100">
                      <Image src="/usdt-png.jpg" alt="USDT" width={36} height={36} />
                    </span>
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 ring-2 ring-indigo-100">
                      <FaRupeeSign className="h-4 w-4 text-indigo-600" />
                    </span>
                  )}
                  <span className="text-base font-bold text-slate-900">
                    {order.amount.toLocaleString()} {currency.toLowerCase()}
                  </span>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    STATUS_COLORS[order.status] ?? "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  {order.status}
                </span>
              </div>

              {/* Details */}
              <div className="mt-3 space-y-1.5 text-[13px]">
                <p className="flex items-center gap-1 text-zinc-500">
                  Order No.:{" "}
                  <span className="font-medium text-zinc-700">
                    {order.orderNo}
                  </span>
                  <button
                    type="button"
                    className="ml-1 rounded-md p-0.5 text-zinc-400 transition hover:bg-indigo-50 hover:text-indigo-500"
                    aria-label="Copy order number"
                  >
                    <IoCopyOutline className="h-3.5 w-3.5" />
                  </button>
                </p>
                <p className="text-zinc-500">
                  Receive:{" "}
                  <span className="font-medium text-zinc-700">
                    {order.receive}
                  </span>
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-zinc-500">
                    <span className="text-zinc-400">{order.time}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (order.status === "Paying" && order.offerId) {
                        window.location.href = `/buy/${order.offerId}`;
                      } else if (order.status !== "Paying") {
                        setSelectedOrder(order);
                      }
                    }}
                    className={`rounded-full px-5 py-1.5 text-[11px] font-semibold text-white shadow-md transition hover:shadow-lg ${
                      order.status === "Paying"
                        ? "bg-gradient-to-r from-amber-500 to-orange-500 shadow-amber-300/30"
                        : "bg-gradient-to-r from-indigo-500 to-violet-500 shadow-indigo-300/30"
                    }`}
                  >
                    {order.status === "Paying" ? "GO" : "View"}
                  </button>
                </div>
              </div>
            </div>
            <div className="h-0.5 bg-gradient-to-r from-indigo-500/20 via-violet-500/20 to-purple-500/20" />
          </div>
        ))
        )}
      </div>

      {/* ── Order Detail Modal ── */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="relative flex items-center justify-center border-b border-slate-100 px-4 py-4">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="absolute left-4 flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                aria-label="Close"
              >
                <IoChevronBack className="h-4 w-4" />
              </button>
              <h2 className="text-lg font-bold text-slate-900">Buy</h2>
            </div>
            <div className="px-5 py-4">
              <div className="mb-4 flex items-center gap-2 text-sm">
                <span className="text-slate-400">Status:</span>
                <span className={`font-bold ${
                  selectedOrder.status === "Success" ? "text-emerald-600"
                    : selectedOrder.status === "Failed" ? "text-red-500"
                    : selectedOrder.status === "Checking" ? "text-blue-600"
                    : "text-amber-600"
                }`}>
                  {selectedOrder.status === "Failed" ? "Failure" : selectedOrder.status}
                </span>
              </div>
              {selectedOrder.upiId && (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-sm text-slate-700">
                    <span className="text-amber-500">⚠</span> Please use the{" "}
                    <span className="font-bold text-slate-900">{selectedOrder.upiId}</span>{" "}
                    account to pay <span className="font-bold text-orange-600">₹{selectedOrder.amount.toLocaleString()}</span>.
                  </p>
                </div>
              )}
              {[
                { label: "Payment Amount", value: selectedOrder.amount.toLocaleString() },
                { label: "Name", value: selectedOrder.accountName },
                { label: "Account", value: selectedOrder.accountNumber },
                { label: "IFSC", value: selectedOrder.ifsc },
                { label: "Order ID", value: selectedOrder.orderNo },
              ].filter(r => r.value).map((row) => (
                <div key={row.label} className="flex items-center justify-between border-b border-slate-100 py-3 last:border-0">
                  <span className="text-sm text-slate-400">{row.label}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-slate-800">{row.value}</span>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(String(row.value))}
                      className="rounded-md p-1 text-slate-300 transition hover:bg-indigo-50 hover:text-indigo-500"
                    >
                      <IoCopyOutline className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-xs text-amber-700">
                  <span className="text-amber-500">⚠</span> Please carefully verify the bill information; otherwise, the transaction cannot be completed.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom Nav ── */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 z-20 flex w-full max-w-[540px] items-end justify-around border-t border-zinc-200 bg-white px-2 pb-2 pt-1.5">
        {[
          { label: "Home", icon: <AiFillHome className="h-5 w-5" />, active: false, href: "/dashboard" },
          { label: "Orders", icon: <RiReceiptFill className="h-5 w-5" />, active: true, href: "/orders" },
          { label: "Team", icon: <RiTeamFill className="h-5 w-5" />, active: false, href: "/team" },
          { label: "Ranking", icon: <MdLeaderboard className="h-5 w-5" />, active: false, href: "/ranking" },
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
