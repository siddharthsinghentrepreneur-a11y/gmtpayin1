"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { IoChevronBack } from "react-icons/io5";
import { IoMdCopy } from "react-icons/io";
import { BsCurrencyRupee } from "react-icons/bs";
import { getCurrentUserId } from "@/lib/client-auth";

interface SaleRecord {
  id: string;
  amount: number;
  upiId: string;
  bank: string;
  buyerUtr: string;
  orderNo: string;
  orderTime: string;
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

export default function SaleRecordsPage() {
  const router = useRouter();
  const [records, setRecords] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId) {
      Promise.resolve().then(() => setLoading(false));
      return;
    }
    fetch(`/api/sell-transactions?sellerId=${userId}&today=false`)
      .then((res) => res.json())
      .then((data) => {
        if (data.transactions) {
          // Only show COMPLETED transactions
          const completed = data.transactions.filter(
            (tx: { status: string }) => tx.status === "completed"
          );
          setRecords(
            completed.map((tx: Record<string, unknown>) => ({
              id: tx.id as string,
              amount: tx.amount as number,
              upiId: tx.upiId as string,
              bank: tx.bank as string,
              buyerUtr: tx.buyerUtr as string,
              orderNo: tx.orderNo as string,
              orderTime: tx.orderTime as string,
            }))
          );
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalCount = records.length;
  const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,#eef2ff_0%,#f5f3ff_25%,#f8fafc_65%)] text-slate-900">
      {/* Decorative blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-violet-200/20 blur-3xl" />
        <div className="absolute -left-16 top-48 h-60 w-60 rounded-full bg-indigo-200/15 blur-3xl" />
        <div className="absolute bottom-32 right-8 h-48 w-48 rounded-full bg-emerald-200/15 blur-3xl" />
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
            Sale Records
          </h1>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md">
        {/* Summary bar */}
        <div className="sticky top-[57px] z-10 border-b border-white/40 bg-white/50 backdrop-blur-xl px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-slate-700">All Completed Sales</p>
            {/* Summary pills */}
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-indigo-50/80 px-2.5 py-1 text-[11px] font-bold text-indigo-600">
                {totalCount} records
              </span>
              <span className="rounded-lg bg-emerald-50/80 px-2.5 py-1 text-[11px] font-bold text-emerald-600">
                ₹{totalAmount.toFixed(0)}
              </span>
            </div>
          </div>
        </div>

        {/* Records count label */}
        <div className="mt-4 flex items-center justify-between px-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-300">
            Transactions
          </p>
          <div className="h-px flex-1 ml-3 bg-gradient-to-r from-slate-200 to-transparent" />
        </div>

        {/* Records list */}
        <div className="space-y-3 px-4 py-3 pb-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
              <p className="mt-3 text-sm font-semibold text-slate-400">Loading records…</p>
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <BsCurrencyRupee className="h-6 w-6 text-slate-300" />
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-400">No sale records found</p>
            </div>
          ) : (
          records.map((record, idx) => (
            <div
              key={record.id}
              className="group relative overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-sm backdrop-blur-sm transition-all hover:shadow-lg hover:shadow-indigo-100/40"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              {/* Left accent bar */}
              <div className="absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b from-indigo-400 via-violet-400 to-purple-400" />

              {/* Amount header */}
              <div className="flex items-center gap-3 px-4 py-3.5 pl-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-200/40">
                  <BsCurrencyRupee className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <span className="text-2xl font-extrabold tracking-tight text-slate-900">
                    {record.amount.toLocaleString()}
                  </span>
                  <span className="ml-1 text-xs font-bold text-slate-400">INR</span>
                </div>
                <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-600">
                  Completed
                </span>
              </div>

              {/* Divider */}
              <div className="mx-4 h-px bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100" />

              {/* Details */}
              <div className="space-y-2.5 px-4 py-3.5 pl-5">
                <DetailRow label="UPI ID" value={record.upiId} />
                <DetailRow label="Bank" value={record.bank} highlight />
                <DetailRow label="UTR" value={record.buyerUtr} copyable mono />
                <DetailRow label="Order No" value={record.orderNo} copyable mono />
                <DetailRow label="Order Time" value={record.orderTime} dimmed />
              </div>
            </div>
          ))
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  copyable,
  highlight,
  mono,
  dimmed,
}: {
  label: string;
  value: string;
  copyable?: boolean;
  highlight?: boolean;
  mono?: boolean;
  dimmed?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-2 text-[13px]">
      <span className="shrink-0 text-slate-400">{label}:</span>
      <div className="flex items-center gap-1.5 text-right">
        <span
          className={`break-all ${
            highlight
              ? "rounded-md bg-indigo-50/80 px-1.5 py-0.5 font-bold text-indigo-600"
              : mono
              ? "font-mono text-[12px] font-medium text-slate-600"
              : dimmed
              ? "text-slate-400"
              : "font-medium text-slate-700"
          }`}
        >
          {value}
        </span>
        {copyable && (
          <button
            type="button"
            onClick={() => copyToClipboard(value)}
            className="shrink-0 rounded-md p-1 text-slate-300 transition hover:bg-indigo-50 hover:text-indigo-500"
            aria-label={`Copy ${label}`}
          >
            <IoMdCopy className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
