"use client";

import { useEffect, useState } from "react";
import {
  MdSearch,
  MdCheckCircle,
  MdCancel,
  MdVisibility,
  MdClose,
  MdContentCopy,
  MdAccessTime,
  MdPerson,
  MdReceipt,
  MdCurrencyRupee,
  MdSort,
} from "react-icons/md";

/* ─── Types ─── */
type OrderStatus = "Paying" | "Checking" | "Success" | "Failed";

interface BuyOrder {
  id: string;
  orderNo: string;
  uid: string;
  phone: string;
  amount: number;
  currency: "INR" | "USDT";
  receive: number;
  status: OrderStatus;
  time: string;
  utr?: string;
  receiptUrl?: string;
  payeeName?: string;
  payeeAccount?: string;
  ifsc?: string;
  upiId?: string;
}

const FILTERS = ["All", "Checking", "Success", "Failed"] as const;

const STATUS_STYLES: Record<OrderStatus, { bg: string; dot: string; text: string }> = {
  Paying: { bg: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-400", text: "text-amber-700" },
  Checking: { bg: "bg-sky-50 text-sky-700 border-sky-200", dot: "bg-sky-400", text: "text-sky-700" },
  Success: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-400", text: "text-emerald-700" },
  Failed: { bg: "bg-red-50 text-red-600 border-red-200", dot: "bg-red-400", text: "text-red-600" },
};

const SORT_OPTIONS = ["Newest", "Oldest", "Amount ↑", "Amount ↓"] as const;

/* ─── Component ─── */
export default function AdminBuyOrdersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof FILTERS)[number]>("All");
  const [currencyFilter, setCurrencyFilter] = useState<"All" | "INR" | "USDT">("All");
  const [sortBy, setSortBy] = useState<(typeof SORT_OPTIONS)[number]>("Newest");
  const [orders, setOrders] = useState<BuyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<BuyOrder | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ order: BuyOrder; action: "approve" | "reject" } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/buy-orders")
      .then((res) => res.json())
      .then((data) => { if (data.orders) setOrders(data.orders); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /* Derived data */
  const counts = {
    All: orders.length,
    Checking: orders.filter((o) => o.status === "Checking").length,
    Success: orders.filter((o) => o.status === "Success").length,
    Failed: orders.filter((o) => o.status === "Failed").length,
  };

  const totalVolume = orders.reduce((s, o) => s + o.receive, 0);
  const successVolume = orders.filter((o) => o.status === "Success").reduce((s, o) => s + o.receive, 0);
  const pendingVolume = orders.filter((o) => o.status === "Checking").reduce((s, o) => s + o.receive, 0);
  const successRate = orders.length > 0 ? Math.round((counts.Success / orders.length) * 100) : 0;

  const filtered = orders
    .filter((o) => {
      const matchSearch =
        o.orderNo.includes(search) ||
        o.uid.includes(search) ||
        o.phone.includes(search) ||
        (o.utr && o.utr.includes(search)) ||
        (o.payeeName && o.payeeName.toLowerCase().includes(search.toLowerCase()));
      const matchStatus = statusFilter === "All" || o.status === statusFilter;
      const matchCurrency = currencyFilter === "All" || o.currency === currencyFilter;
      return matchSearch && matchStatus && matchCurrency;
    })
    .sort((a, b) => {
      if (sortBy === "Amount ↑") return a.receive - b.receive;
      if (sortBy === "Amount ↓") return b.receive - a.receive;
      if (sortBy === "Oldest") return a.id.localeCompare(b.id);
      return b.id.localeCompare(a.id); // Newest
    });

  const pendingCount = counts.Checking;

  function handleAction(order: BuyOrder, action: "approve" | "reject") {
    setConfirmAction({ order, action });
  }

  async function executeAction() {
    if (!confirmAction || actionLoading) return;
    const { order, action } = confirmAction;

    setActionLoading(true);
    try {
      const endpoint =
        action === "approve"
          ? `/api/admin/buy-orders/${order.id}/confirm`
          : `/api/admin/buy-orders/${order.id}/reject`;

      const res = await fetch(endpoint, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Action failed");
        return;
      }

      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? { ...o, status: (action === "approve" ? "Success" : "Failed") as OrderStatus }
            : o
        )
      );
    } catch {
      alert("Network error");
    } finally {
      setActionLoading(false);
    }

    setConfirmAction(null);
    setSelectedOrder(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Buy Orders</h1>
          <p className="mt-1 text-sm text-slate-500">
            Monitor and process all buy orders
          </p>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
            </span>
            <span className="text-sm font-semibold text-amber-700">
              {pendingCount} need review
            </span>
          </div>
        )}
      </div>

      {/* Volume Analytics */}
      <div className="rounded-2xl border border-slate-200/60 bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-300">Buy Volume Overview</h2>
          <span className="rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-bold text-slate-300">
            {orders.length} orders
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-[11px] font-medium text-slate-400">Total Volume</p>
            <p className="text-xl font-extrabold">₹{totalVolume.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-400">Successful</p>
            <p className="text-xl font-extrabold text-emerald-400">₹{successVolume.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-400">Pending</p>
            <p className="text-xl font-extrabold text-amber-400">₹{pendingVolume.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-400">Success Rate</p>
            <div className="flex items-center gap-2">
              <p className="text-xl font-extrabold">{successRate}%</p>
              <div className="h-1.5 flex-1 rounded-full bg-white/10">
                <div
                  className="h-1.5 rounded-full bg-emerald-400 transition-all"
                  style={{ width: `${successRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {(["Checking", "Success", "Failed"] as const).map((s) => {
          const st = STATUS_STYLES[s];
          const vol = orders.filter((o) => o.status === s).reduce((sum, o) => sum + o.receive, 0);
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(statusFilter === s ? "All" : s)}
              className={`rounded-xl border p-3 text-left transition ${
                statusFilter === s
                  ? st.bg + " border-current shadow-sm"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className={`text-2xl font-extrabold ${statusFilter === s ? "" : "text-slate-900"}`}>
                  {counts[s]}
                </p>
                <span className={`h-2 w-2 rounded-full ${st.dot} ${s === "Checking" ? "animate-pulse" : ""}`} />
              </div>
              <p className={`text-xs font-semibold ${statusFilter === s ? "" : "text-slate-500"}`}>
                {s}
              </p>
              <p className={`text-[11px] mt-0.5 ${statusFilter === s ? "opacity-70" : "text-slate-400"}`}>
                ₹{vol.toLocaleString()}
              </p>
            </button>
          );
        })}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <MdSearch className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Order ID, UID, phone, UTR, or payee..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <div className="flex items-center gap-2">
          {(["All", "INR", "USDT"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCurrencyFilter(c)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                currencyFilter === c
                  ? c === "USDT"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {c}
            </button>
          ))}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-xs font-bold text-slate-600 outline-none transition focus:border-indigo-400"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <MdSort className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Status Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setStatusFilter(f)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
              statusFilter === f
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {f}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                statusFilter === f ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400"
              }`}
            >
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {["Order ID", "User", "Amount", "Receive (₹)", "Type", "UTR / Receipt", "Status", "Time", "Actions"].map((h) => (
                  <th
                    key={h}
                    className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 ${
                      h === "Actions" ? "text-right" : "text-left"
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-sm text-slate-400">
                    No orders found
                  </td>
                </tr>
              ) : (
                filtered.map((order) => {
                  const st = STATUS_STYLES[order.status];
                  const isPending = order.status === "Paying" || order.status === "Checking";
                  return (
                    <tr
                      key={order.id}
                      className={`transition hover:bg-slate-50 cursor-pointer ${isPending ? "bg-amber-50/20" : ""}`}
                      onClick={() => setSelectedOrder(order)}
                    >
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <span className="font-mono text-xs text-slate-600">
                          {order.orderNo}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <div>
                          <p className="font-semibold text-slate-800">{order.payeeName || order.phone}</p>
                          <p className="text-[11px] text-slate-400">
                            {order.phone} · UID: {order.uid}
                          </p>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <span className="font-bold text-slate-900">
                          {order.currency === "INR" ? "₹" : "$"}{order.amount.toLocaleString()}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 font-semibold text-slate-700">
                        ₹{order.receive.toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                            order.currency === "USDT"
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-blue-50 text-blue-600"
                          }`}
                        >
                          {order.currency}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs text-slate-500">
                        {order.utr ? (
                          <span className="flex items-center gap-1">
                            {order.utr.slice(0, 8)}…
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(order.utr!); }}
                              className="rounded p-0.5 text-slate-300 hover:text-slate-500"
                            >
                              <MdContentCopy className="h-3 w-3" />
                            </button>
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                        {order.receiptUrl && (
                          <span className="mt-0.5 flex items-center gap-1 text-[10px] text-indigo-500 font-semibold">
                            📷 Screenshot
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${st.bg}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${st.dot} ${isPending ? "animate-pulse" : ""}`} />
                          {order.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-400">
                        {order.time.split(" ")[1]}
                        <br />
                        <span className="text-[10px]">{order.time.split(" ")[0]}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                            title="View Details"
                          >
                            <MdVisibility className="h-4.5 w-4.5" />
                          </button>
                          {isPending && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleAction(order, "approve")}
                                className="rounded-lg p-1.5 text-emerald-500 transition hover:bg-emerald-50 hover:text-emerald-700"
                                title="Approve"
                              >
                                <MdCheckCircle className="h-4.5 w-4.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAction(order, "reject")}
                                className="rounded-lg p-1.5 text-red-400 transition hover:bg-red-50 hover:text-red-600"
                                title="Reject"
                              >
                                <MdCancel className="h-4.5 w-4.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm text-slate-500">
          <span>
            Showing <span className="font-semibold text-slate-800">{filtered.length}</span> of{" "}
            <span className="font-semibold text-slate-800">{orders.length}</span> orders
          </span>
          <span className="text-xs text-slate-400">
            Volume: ₹{filtered.reduce((s, o) => s + o.receive, 0).toLocaleString()}
          </span>
        </div>
      </div>

      {/* ─── Order Detail Modal ─── */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedOrder(null)} />
          <div className="relative w-full max-w-lg animate-[slideUp_0.3s_ease] rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Buy Order Details</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedOrder.orderNo}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <MdClose className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="max-h-[65vh] overflow-y-auto px-6 py-5 space-y-5">
              {/* Status Banner */}
              {(() => {
                const st = STATUS_STYLES[selectedOrder.status];
                const isPending = selectedOrder.status === "Paying" || selectedOrder.status === "Checking";
                return (
                  <div className={`flex items-center justify-between rounded-xl border p-4 ${st.bg}`}>
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${st.dot} ${isPending ? "animate-pulse" : ""}`} />
                      <span className="text-sm font-bold">{selectedOrder.status}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-extrabold">
                        {selectedOrder.currency === "INR" ? "₹" : "$"}{selectedOrder.amount.toLocaleString()}
                      </span>
                      {selectedOrder.currency === "USDT" && (
                        <p className="text-[11px] opacity-70">Receive: ₹{selectedOrder.receive.toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-3">
                <InfoCard icon={<MdPerson className="h-4 w-4" />} label="User" value={selectedOrder.payeeName || selectedOrder.phone} sub={`${selectedOrder.phone} · UID: ${selectedOrder.uid}`} />
                <InfoCard icon={<MdCurrencyRupee className="h-4 w-4" />} label="Currency" value={selectedOrder.currency} sub={selectedOrder.currency === "USDT" ? `$${selectedOrder.amount} → ₹${selectedOrder.receive.toLocaleString()}` : `₹${selectedOrder.amount.toLocaleString()}`} />
                <InfoCard icon={<MdAccessTime className="h-4 w-4" />} label="Order Time" value={selectedOrder.time.split(" ")[1]} sub={selectedOrder.time.split(" ")[0]} />
                <InfoCard icon={<MdReceipt className="h-4 w-4" />} label="UTR" value={selectedOrder.utr || "Awaiting..."} copiable={!!selectedOrder.utr} />
              </div>

              {/* Payment Details */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Payment Information
                </h4>
                <div className="space-y-2.5">
                  <DetailRow label="Payee Name" value={selectedOrder.payeeName || "—"} />
                  <DetailRow label="Account" value={selectedOrder.payeeAccount || "—"} copiable={!!selectedOrder.payeeAccount} />
                  {selectedOrder.currency === "INR" && (
                    <>
                      <DetailRow label="IFSC Code" value={selectedOrder.ifsc || "—"} copiable={!!selectedOrder.ifsc} />
                      <DetailRow label="UPI ID" value={selectedOrder.upiId || "—"} copiable={selectedOrder.upiId !== "—"} />
                    </>
                  )}
                  <DetailRow label="UTR Number" value={selectedOrder.utr || "Not provided"} copiable={!!selectedOrder.utr} />
                  <DetailRow label="Amount" value={`${selectedOrder.currency === "INR" ? "₹" : "$"}${selectedOrder.amount.toLocaleString()}`} />
                  {selectedOrder.currency === "USDT" && (
                    <DetailRow label="Receive (INR)" value={`₹${selectedOrder.receive.toLocaleString()}`} />
                  )}
                </div>
              </div>

              {/* Payment Screenshot */}
              {selectedOrder.receiptUrl && (
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                    Payment Screenshot
                  </h4>
                  <a
                    href={selectedOrder.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block overflow-hidden rounded-lg border border-slate-200 bg-white"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedOrder.receiptUrl}
                      alt="Payment receipt"
                      className="w-full object-contain max-h-80"
                    />
                  </a>
                  <p className="mt-2 text-center text-[11px] text-slate-400">Click image to open full size</p>
                </div>
              )}

              {/* User History Summary */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                  User History
                </h4>
                {(() => {
                  const userOrders = orders.filter((o) => o.uid === selectedOrder.uid);
                  const userSuccess = userOrders.filter((o) => o.status === "Success").length;
                  const userFailed = userOrders.filter((o) => o.status === "Failed").length;
                  const userTotal = userOrders.reduce((s, o) => s + o.receive, 0);
                  return (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center">
                        <p className="text-lg font-extrabold text-slate-900">{userOrders.length}</p>
                        <p className="text-[11px] text-slate-400">Total Orders</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-extrabold text-emerald-600">{userSuccess}</p>
                        <p className="text-[11px] text-slate-400">Successful</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-extrabold text-red-500">{userFailed}</p>
                        <p className="text-[11px] text-slate-400">Failed</p>
                      </div>
                      <div className="col-span-3 mt-1 rounded-lg bg-white p-2 text-center">
                        <p className="text-[11px] text-slate-400">Total Volume by this User</p>
                        <p className="text-base font-extrabold text-slate-900">₹{userTotal.toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Actions Footer */}
            {(selectedOrder.status === "Paying" || selectedOrder.status === "Checking") && (
              <div className="flex items-center gap-3 border-t border-slate-100 px-6 py-4">
                <button
                  type="button"
                  onClick={() => handleAction(selectedOrder, "reject")}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-bold text-red-600 transition hover:bg-red-100"
                >
                  <MdCancel className="h-4 w-4" />
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => handleAction(selectedOrder, "approve")}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700"
                >
                  <MdCheckCircle className="h-4 w-4" />
                  Approve
                </button>
              </div>
            )}

            {(selectedOrder.status === "Success" || selectedOrder.status === "Failed") && (
              <div className="border-t border-slate-100 px-6 py-4">
                <div className={`rounded-xl p-3 text-center text-sm font-semibold ${
                  selectedOrder.status === "Success"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-600"
                }`}>
                  This order has been {selectedOrder.status === "Success" ? "approved" : "rejected"}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Confirmation Modal ─── */}
      {confirmAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmAction(null)} />
          <div className="relative w-full max-w-sm animate-[slideUp_0.2s_ease] rounded-2xl bg-white p-6 shadow-2xl">
            <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
              confirmAction.action === "approve" ? "bg-emerald-100" : "bg-red-100"
            }`}>
              {confirmAction.action === "approve" ? (
                <MdCheckCircle className="h-8 w-8 text-emerald-600" />
              ) : (
                <MdCancel className="h-8 w-8 text-red-500" />
              )}
            </div>
            <h3 className="text-center text-lg font-bold text-slate-900">
              {confirmAction.action === "approve" ? "Approve Order?" : "Reject Order?"}
            </h3>
            <p className="mt-2 text-center text-sm text-slate-500">
              {confirmAction.action === "approve"
                ? "This will mark the order as successful and credit the user's balance."
                : "This will mark the order as failed. The payment will not be processed."}
            </p>
            <div className="mt-2 rounded-lg bg-slate-50 p-3 text-center">
              <p className="text-xs text-slate-400">Order Amount</p>
              <p className="text-xl font-extrabold text-slate-900">
                {confirmAction.order.currency === "INR" ? "₹" : "$"}{confirmAction.order.amount.toLocaleString()}
              </p>
              <p className="font-mono text-[11px] text-slate-400 mt-0.5">
                {confirmAction.order.phone} · UID: {confirmAction.order.uid}
              </p>
            </div>
            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                disabled={actionLoading}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeAction}
                disabled={actionLoading}
                className={`flex-1 rounded-xl py-2.5 text-sm font-bold text-white shadow-lg transition disabled:opacity-50 ${
                  confirmAction.action === "approve"
                    ? "bg-emerald-600 shadow-emerald-600/25 hover:bg-emerald-700"
                    : "bg-red-500 shadow-red-500/25 hover:bg-red-600"
                }`}
              >
                {actionLoading
                  ? "Processing..."
                  : confirmAction.action === "approve"
                    ? "Yes, Approve"
                    : "Yes, Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Sub-components ─── */
function InfoCard({
  icon,
  label,
  value,
  sub,
  copiable,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  copiable?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3">
      <div className="flex items-center gap-1.5 text-slate-400">
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-1 flex items-center gap-1">
        <p className="text-sm font-bold text-slate-900 truncate">{value}</p>
        {copiable && value !== "—" && value !== "Awaiting..." && (
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(value)}
            className="shrink-0 rounded p-0.5 text-slate-300 hover:text-slate-500"
          >
            <MdContentCopy className="h-3 w-3" />
          </button>
        )}
      </div>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function DetailRow({
  label,
  value,
  copiable,
}: {
  label: string;
  value: string;
  copiable?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-400">{label}</span>
      <div className="flex items-center gap-1">
        <span className="text-sm font-semibold text-slate-700">{value}</span>
        {copiable && value !== "—" && value !== "Not provided" && (
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(value)}
            className="rounded p-0.5 text-slate-300 hover:text-slate-500"
          >
            <MdContentCopy className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
