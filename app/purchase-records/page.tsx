"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AiFillHome } from "react-icons/ai";
import { RiReceiptFill, RiTeamFill } from "react-icons/ri";
import { MdLeaderboard } from "react-icons/md";
import { IoPerson, IoCopyOutline, IoChevronBack } from "react-icons/io5";
import { FaRupeeSign } from "react-icons/fa";
import { getCurrentUserId } from "@/lib/client-auth";

type OrderStatus = "Success" | "Failed" | "Paying" | "Checking";

interface PurchaseOrder {
  amount: number;
  currency: "inr" | "usdt";
  status: OrderStatus;
  orderNo: string;
  offerId: string;
  receive: number;
  time: string;
  upiId: string;
  accountName: string;
  accountNumber: string;
  ifsc: string;
  bank: string;
}

const FILTERS = ["All", "Paying", "Checking", "Success", "Failed"] as const;

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

export default function PurchaseRecordsPage() {
  const router = useRouter();
  const [currency, setCurrency] = useState<"INR" | "USDT">("INR");
  const [activeFilter, setActiveFilter] = useState<(typeof FILTERS)[number]>("All");
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);

  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId) return;

    fetch(`/api/orders?userId=${userId}`)
      .then((r) => r.json())
      .then((data) => {
        const mapped: PurchaseOrder[] = (data.orders ?? []).map(
          (o: { amount: number; currency: string; status: string; orderNo: string; offerId: string; receive: number; time: string; upiId: string; accountName: string; accountNumber: string; ifsc: string; bank: string }) => ({
            amount: o.amount,
            currency: (o.currency?.toLowerCase() ?? "inr") as "inr" | "usdt",
            status: o.status as OrderStatus,
            orderNo: o.orderNo,
            offerId: o.offerId,
            receive: o.receive,
            time: o.time,
            upiId: o.upiId || "",
            accountName: o.accountName || "",
            accountNumber: o.accountNumber || "",
            ifsc: o.ifsc || "",
            bank: o.bank || "",
          }),
        );
        setOrders(mapped);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const currentOrders = orders.filter((o) =>
    currency === "INR" ? o.currency === "inr" : o.currency === "usdt",
  );
  const filteredOrders =
    activeFilter === "All"
      ? currentOrders
      : currentOrders.filter((o) => o.status === activeFilter);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,#eef2ff_0%,#f5f3ff_25%,#f8fafc_65%)] text-slate-900">
      {/* Decorative blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-indigo-200/20 blur-3xl" />
        <div className="absolute -left-16 top-48 h-60 w-60 rounded-full bg-violet-200/15 blur-3xl" />
        <div className="absolute bottom-32 right-8 h-48 w-48 rounded-full bg-sky-200/15 blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-white/50 bg-white/60 backdrop-blur-xl">
        <div className="relative mx-auto flex w-full max-w-md items-center justify-center px-4 py-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="absolute left-4 flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white/80 text-slate-600 shadow-sm transition hover:bg-white hover:shadow-md"
            aria-label="Go back"
          >
            <IoChevronBack className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">
            Purchase Records
          </h1>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md">
        {/* Currency Toggle */}
        <div className="flex justify-center px-4 pt-5">
          <div className="relative flex w-64 overflow-hidden rounded-2xl border border-slate-200/60 bg-white/80 p-1 shadow-sm backdrop-blur-sm">
            {/* Sliding indicator */}
            <div
              className="absolute left-1 top-1 h-[calc(100%-8px)] w-[calc(50%-4px)] rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 shadow-lg shadow-indigo-300/30 transition-transform duration-300"
              style={{ transform: currency === "USDT" ? "translateX(100%)" : "translateX(0)" }}
            />
            {(["INR", "USDT"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCurrency(c)}
                className={`relative z-10 flex-1 py-2.5 text-sm font-bold transition-colors duration-300 ${
                  currency === c ? "text-white" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mt-5 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none">
          {FILTERS.map((f) => {
            const isActive = activeFilter === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setActiveFilter(f)}
                className={`relative shrink-0 rounded-full px-4 py-2 text-[12px] font-bold tracking-wide transition-all ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-300/40"
                    : "bg-white/70 text-slate-400 shadow-sm backdrop-blur-sm hover:bg-white hover:text-slate-600"
                }`}
              >
                {f}
              </button>
            );
          })}
        </div>

        {/* Results count */}
        <div className="mt-4 flex items-center justify-between px-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-300">
            {filteredOrders.length} {filteredOrders.length === 1 ? "record" : "records"}
          </p>
          <div className="h-px flex-1 ml-3 bg-gradient-to-r from-slate-200 to-transparent" />
        </div>

        {/* Orders List */}
        <div className="space-y-3 px-4 py-3 pb-24">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            </div>
          )}

          {!loading && filteredOrders.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                <RiReceiptFill className="h-8 w-8 text-slate-300" />
              </div>
              <p className="mt-4 text-sm font-medium text-slate-400">No records found</p>
              <p className="mt-1 text-xs text-slate-300">Try changing your filters</p>
            </div>
          )}

          {!loading && filteredOrders.map((order, idx) => (
            <div
              key={order.orderNo}
              className="group relative overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-sm backdrop-blur-sm transition-all hover:shadow-lg hover:shadow-indigo-100/40"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              {/* Status accent line */}
              <div
                className={`absolute left-0 top-0 h-full w-[3px] ${
                  order.status === "Success"
                    ? "bg-gradient-to-b from-emerald-400 to-green-400"
                    : order.status === "Failed"
                    ? "bg-gradient-to-b from-red-400 to-rose-400"
                    : order.status === "Paying"
                    ? "bg-gradient-to-b from-amber-400 to-orange-400"
                    : "bg-gradient-to-b from-blue-400 to-cyan-400"
                }`}
              />

              <div className="px-4 py-4 pl-5">
                {/* Amount + Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {order.currency === "usdt" ? (
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl shadow-sm ring-2 ring-emerald-100">
                        <Image src="/usdt-png.jpg" alt="USDT" fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 shadow-sm ring-2 ring-indigo-100">
                        <FaRupeeSign className="h-4.5 w-4.5 text-indigo-500" />
                      </div>
                    )}
                    <div>
                      <span className="text-xl font-extrabold tracking-tight text-slate-900">
                        {order.amount.toLocaleString()}
                      </span>
                      <span className="ml-1.5 text-sm font-semibold uppercase text-slate-400">
                        {order.currency}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${
                      order.status === "Success"
                        ? "bg-emerald-50 text-emerald-600"
                        : order.status === "Failed"
                        ? "bg-red-50 text-red-500"
                        : order.status === "Paying"
                        ? "bg-amber-50 text-amber-600"
                        : "bg-blue-50 text-blue-600"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>

                {/* Details */}
                <div className="mt-3.5 space-y-2 text-[13px]">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400">Order No.:</span>
                    <span className="font-mono text-[12px] font-medium text-slate-600">{order.orderNo}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(order.orderNo)}
                      className="ml-0.5 rounded-md p-1 text-slate-300 transition hover:bg-indigo-50 hover:text-indigo-500"
                      aria-label="Copy order number"
                    >
                      <IoCopyOutline className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div>
                    <span className="text-slate-400">Receive: </span>
                    <span className="font-semibold text-slate-700">{order.receive.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5">
                      <div className="h-1 w-1 rounded-full bg-slate-300" />
                      <span className="text-[12px] text-slate-400">{order.time}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (order.status === "Paying" && order.offerId) {
                          window.location.href = `/buy/${order.offerId}`;
                        } else if (order.status !== "Paying") {
                          setSelectedOrder(order);
                        }
                      }}
                      className={`rounded-xl px-5 py-2 text-[12px] font-bold text-white shadow-md transition hover:shadow-lg active:scale-95 ${
                        order.status === "Paying"
                          ? "bg-gradient-to-r from-amber-500 to-orange-500 shadow-amber-200/50 hover:shadow-amber-300/40"
                          : "bg-gradient-to-r from-indigo-500 to-violet-500 shadow-indigo-200/50 hover:shadow-indigo-300/40"
                      }`}
                    >
                      {order.status === "Paying" ? "GO" : "View"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Header */}
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
              {/* Status */}
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

              {/* UPI Info */}
              {selectedOrder.upiId && (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3">
                  <div className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 text-amber-500">⚠</span>
                    <span className="text-slate-700">
                      Please use the <span className="font-bold text-slate-900">{selectedOrder.upiId}</span> account to pay <span className="font-bold text-orange-600">₹{selectedOrder.amount.toLocaleString()}</span>.
                    </span>
                  </div>
                </div>
              )}

              {/* Details */}
              <div className="divide-y divide-slate-100">
                <div className="flex items-center justify-between py-3.5">
                  <span className="text-sm text-slate-400">Payment Amount</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{selectedOrder.amount.toLocaleString()}</span>
                    <button type="button" onClick={() => copyToClipboard(String(selectedOrder.amount))} className="rounded p-1 text-slate-300 hover:text-indigo-500">
                      <IoCopyOutline className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3.5">
                  <span className="text-sm text-slate-400">Name</span>
                  <div className="flex items-center gap-2">
                    <span className="max-w-[200px] break-all text-right font-semibold text-slate-900">{selectedOrder.accountName || "—"}</span>
                    {selectedOrder.accountName && (
                      <button type="button" onClick={() => copyToClipboard(selectedOrder.accountName)} className="rounded p-1 text-slate-300 hover:text-indigo-500">
                        <IoCopyOutline className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between py-3.5">
                  <span className="text-sm text-slate-400">Account</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{selectedOrder.accountNumber || "—"}</span>
                    {selectedOrder.accountNumber && (
                      <button type="button" onClick={() => copyToClipboard(selectedOrder.accountNumber)} className="rounded p-1 text-slate-300 hover:text-indigo-500">
                        <IoCopyOutline className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between py-3.5">
                  <span className="text-sm text-slate-400">IFSC</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{selectedOrder.ifsc || "—"}</span>
                    {selectedOrder.ifsc && (
                      <button type="button" onClick={() => copyToClipboard(selectedOrder.ifsc)} className="rounded p-1 text-slate-300 hover:text-indigo-500">
                        <IoCopyOutline className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between py-3.5">
                  <span className="text-sm text-slate-400">Order ID</span>
                  <div className="flex items-center gap-2">
                    <span className="max-w-[180px] break-all text-right font-mono text-xs font-semibold text-slate-900">{selectedOrder.orderNo}</span>
                    <button type="button" onClick={() => copyToClipboard(selectedOrder.orderNo)} className="rounded p-1 text-slate-300 hover:text-indigo-500">
                      <IoCopyOutline className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Warning */}
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3">
                <div className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 text-amber-500">⚠</span>
                  <span className="text-orange-600 font-medium">
                    Please carefully verify the bill information; otherwise, the transaction cannot be completed.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
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
