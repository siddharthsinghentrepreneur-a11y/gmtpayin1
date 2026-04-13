"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IoChevronBack } from "react-icons/io5";
import { IoMdCopy } from "react-icons/io";
import { BsBank2, BsCheckCircleFill, BsShieldCheck, BsCurrencyRupee } from "react-icons/bs";
import { HiOutlineCurrencyRupee } from "react-icons/hi2";
import { RiExchangeFundsLine } from "react-icons/ri";
import { LINKED_BANK_EVENT, readLinkedBankAccount, type LinkedBankAccount } from "@/lib/bank-account";
import { getCurrentUserId } from "@/lib/client-auth";
import { MAIN_BALANCE } from "@/lib/main-balance";
import { getTodaySellTransactions, SELL_TX_EVENT } from "@/lib/p2p-orders";

interface SellTxItem {
  id: string;
  offerId: string;
  sellerId: string;
  sellerName: string;
  amount: number;
  buyerUtr: string;
  bank: string;
  upiId: string;
  status: string;
  orderNo: string;
  orderTime: string;
  createdAt: string;
}

export default function SellPage() {
  const router = useRouter();
  const [linkedBank, setLinkedBank] = useState<LinkedBankAccount | null>(null);
  const [todaySells, setTodaySells] = useState<SellTxItem[]>([]);
  const [balance, setBalance] = useState(MAIN_BALANCE);

  const balanceOk = balance >= 100;
  const bankOk = Boolean(linkedBank);
  const allConditionsMet = balanceOk && bankOk;
  const autoSellActive = allConditionsMet;

  // Sync auto-sell state to backend whenever conditions change
  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId) return;

    async function syncAutoSell() {
      try {
        await fetch("/api/seller-fund", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            totalFund: allConditionsMet ? balance : 0,
            autoSellActive: allConditionsMet,
          }),
        });
      } catch {
        // ignore
      }
    }

    syncAutoSell();
  }, [allConditionsMet, balance]);

  useEffect(() => {
    const syncBank = () => setLinkedBank(readLinkedBankAccount());

    async function fetchUserBalance() {
      try {
        const userId = getCurrentUserId() || "";
        if (!userId) return;
        const res = await fetch(`/api/users/${userId}`);
        if (res.ok) {
          const data = await res.json();
          setBalance(data.user.balance ?? MAIN_BALANCE);
        }
      } catch {
        // keep default balance
      }
    }

    async function fetchSellTransactions() {
      try {
        const userId = getCurrentUserId() || "";
        if (userId) {
          const res = await fetch(`/api/sell-transactions?sellerId=${userId}&today=true`);
          if (res.ok) {
            const data = await res.json();
            if (data.transactions && data.transactions.length > 0) {
              setTodaySells(data.transactions);
              return;
            }
          }
        }
      } catch {
        // fallback to localStorage
      }
      const localTx = getTodaySellTransactions();
      setTodaySells(localTx.map((tx) => ({
        id: tx.id,
        offerId: tx.offerId,
        sellerId: tx.sellerId,
        sellerName: tx.sellerName,
        amount: tx.amount,
        buyerUtr: tx.buyerUtr,
        bank: tx.bank,
        upiId: tx.upiId,
        status: tx.status,
        orderNo: tx.orderNo,
        orderTime: tx.orderTime,
        createdAt: tx.createdAt,
      })));
    }

    syncBank();
    fetchSellTransactions();
    fetchUserBalance();

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === "gmtpay.linkedBankAccount") {
        syncBank();
      }
    };

    const handleBankUpdate = () => syncBank();
    const handleSellUpdate = () => fetchSellTransactions();

    window.addEventListener("storage", handleStorage);
    window.addEventListener(LINKED_BANK_EVENT, handleBankUpdate);
    window.addEventListener(SELL_TX_EVENT, handleSellUpdate);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(LINKED_BANK_EVENT, handleBankUpdate);
      window.removeEventListener(SELL_TX_EVENT, handleSellUpdate);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,#ede9fe_0%,#f5f3ff_30%,#f8fafc_70%)] text-slate-900">
      {/* Decorative blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-violet-300/20 blur-3xl" />
        <div className="absolute -left-16 top-40 h-56 w-56 rounded-full bg-indigo-300/15 blur-3xl" />
        <div className="absolute bottom-20 right-10 h-40 w-40 rounded-full bg-emerald-200/20 blur-3xl" />
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
            Sell
          </h1>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md px-4 pt-6 pb-10 space-y-5">
        {/* Auto Sell Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600 p-[1px] shadow-lg shadow-indigo-500/20">
          <div className="rounded-[15px] bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600 px-5 py-5">
            {/* Decorative inner glow */}
            <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

            <div className="relative flex items-center gap-4">
              {/* Toggle */}
              <div
                className={`relative flex h-9 w-[52px] shrink-0 items-center rounded-full p-[3px] transition-all duration-300 ${
                  autoSellActive
                    ? "bg-white/30 shadow-inner shadow-white/20"
                    : "bg-white/15 opacity-80"
                }`}
                aria-label="Auto Sell status"
                role="status"
              >
                <span
                  className={`inline-block h-[27px] w-[27px] rounded-full shadow-md transition-all duration-300 ${
                    autoSellActive
                      ? "translate-x-[17px] bg-white"
                      : "translate-x-0 bg-white/70"
                  }`}
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <RiExchangeFundsLine className="h-5 w-5 text-white/90" />
                  <p className="text-base font-bold text-white">Auto Sell</p>
                </div>
                <p className="mt-0.5 text-[13px] text-white/60">
                  {allConditionsMet ? "Both conditions are green, so auto sell is ON" : "If any condition fails, auto sell stays OFF"}
                </p>
              </div>
            </div>

            {/* Status pill */}
            <div className="mt-4 flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${
                  allConditionsMet
                    ? "bg-emerald-400/20 text-emerald-200"
                    : "bg-amber-400/20 text-amber-200"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    allConditionsMet
                      ? "bg-emerald-400 animate-pulse"
                      : "bg-amber-400"
                  }`}
                />
                {allConditionsMet ? "All conditions met" : "Conditions pending"}
              </span>
            </div>
          </div>
        </div>

        {/* Section label */}
        <p className="px-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
          Requirements
        </p>

        {/* Balance Condition Card */}
        <div
          className={`relative overflow-hidden rounded-2xl border bg-white/80 backdrop-blur-sm transition-all ${
            balanceOk
              ? "border-emerald-200/60 shadow-md shadow-emerald-100/40"
              : "border-red-200/60 shadow-md shadow-red-100/30"
          }`}
        >
          {/* Top accent bar */}
          <div
            className={`h-[3px] ${
              balanceOk
                ? "bg-gradient-to-r from-emerald-400 to-teal-400"
                : "bg-gradient-to-r from-red-400 to-rose-400"
            }`}
          />

          <div className="px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                    balanceOk
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-red-50 text-red-500"
                  }`}
                >
                  <HiOutlineCurrencyRupee className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[13px] text-slate-500">Balance</p>
                  <p className="text-xl font-extrabold tracking-tight text-slate-900">
                    ₹{balance.toLocaleString()}
                  </p>
                </div>
              </div>
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full ${
                  balanceOk ? "bg-emerald-100" : "bg-red-100"
                }`}
              >
                {balanceOk ? (
                  <BsCheckCircleFill className="h-5 w-5 text-emerald-500" />
                ) : (
                  <span className="text-sm font-bold text-red-500">!</span>
                )}
              </div>
            </div>

            <div
              className={`mt-3 rounded-lg px-3 py-2 text-[12px] font-medium ${
                balanceOk
                  ? "bg-emerald-50/60 text-emerald-700"
                  : "bg-red-50/60 text-red-600"
              }`}
            >
              {balanceOk
                ? "✓ Balance exceeds minimum requirement of ₹100"
                : "Balance must exceed ₹100 to withdraw"}
            </div>
          </div>
        </div>

        {/* Bank Account Condition Card */}
        <div
          className={`relative overflow-hidden rounded-2xl border bg-white/80 backdrop-blur-sm transition-all ${
            bankOk
              ? "border-emerald-200/60 shadow-md shadow-emerald-100/40"
              : "border-red-200/60 shadow-md shadow-red-100/30"
          }`}
        >
          {/* Top accent bar */}
          <div
            className={`h-[3px] ${
              bankOk
                ? "bg-gradient-to-r from-emerald-400 to-teal-400"
                : "bg-gradient-to-r from-red-400 to-rose-400"
            }`}
          />

          <div className="px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                    bankOk
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-red-50 text-red-500"
                  }`}
                >
                  {bankOk ? <BsShieldCheck className="h-5 w-5" /> : <BsBank2 className="h-5 w-5" />}
                </div>
                <div>
                  <p className="text-[13px] text-slate-500">Bank Account</p>
                  <div className="flex items-center gap-2">
                    <p className="text-base font-extrabold tracking-tight text-slate-900">
                      {bankOk ? linkedBank?.bankName : "Not linked"}
                    </p>
                    {bankOk && (
                      <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                        Enabled
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full ${
                  bankOk ? "bg-emerald-100" : "bg-red-100"
                }`}
              >
                {bankOk ? (
                  <BsCheckCircleFill className="h-5 w-5 text-emerald-500" />
                ) : (
                  <span className="text-sm font-bold text-red-500">!</span>
                )}
              </div>
            </div>

            <div
              className={`mt-3 rounded-lg px-3 py-2 text-[12px] font-medium ${
                bankOk
                  ? "bg-emerald-50/60 text-emerald-700"
                  : "bg-red-50/60 text-red-600"
              }`}
            >
              {bankOk
                ? `✓ Linked with ${linkedBank?.beneficiary} • ••••${linkedBank?.accountLast4}`
                : "Bank account bind nahi hai. Sell enable karne ke liye bank account bind karo."}
            </div>

            {!bankOk && (
              <button
                type="button"
                onClick={() => router.push("/withdraw/bind-bank")}
                className="mx-5 mb-4 mt-3 flex w-[calc(100%-2.5rem)] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-400/20 transition hover:shadow-xl active:scale-[0.98]"
              >
                <BsBank2 className="h-4 w-4" />
                Bind Bank Account
              </button>
            )}
          </div>
        </div>

        {/* Summary footer */}
        <div className="rounded-2xl border border-slate-200/60 bg-white/60 backdrop-blur-sm px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-600">
                {(balanceOk ? 1 : 0) + (bankOk ? 1 : 0)}
              </span>
              of 2 conditions met
            </div>
            <div
              className={`h-2 w-24 overflow-hidden rounded-full ${
                allConditionsMet ? "bg-emerald-100" : "bg-slate-100"
              }`}
            >
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  allConditionsMet
                    ? "bg-gradient-to-r from-emerald-400 to-teal-400"
                    : "bg-gradient-to-r from-indigo-400 to-violet-400"
                }`}
                style={{
                  width: `${((balanceOk ? 1 : 0) + (bankOk ? 1 : 0)) * 50}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Today's Sell Section */}
        {autoSellActive && (
          <>
            <div className="mt-2 flex items-center justify-between px-1">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Today&apos;s Sell
              </p>
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-indigo-50/80 px-2.5 py-1 text-[11px] font-bold text-indigo-600">
                  {todaySells.length} orders
                </span>
                <span className="rounded-lg bg-emerald-50/80 px-2.5 py-1 text-[11px] font-bold text-emerald-600">
                  ₹{todaySells.reduce((s, t) => s + t.amount, 0).toLocaleString()}
                </span>
              </div>
            </div>

            {todaySells.length === 0 ? (
              <div className="rounded-2xl border border-slate-200/60 bg-white/70 backdrop-blur-sm px-5 py-8 text-center">
                <p className="text-sm font-medium text-slate-400">
                  No sell transactions yet today
                </p>
                <p className="mt-1 text-xs text-slate-300">
                  When a buyer purchases from your fund, it will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {todaySells.map((tx, idx) => (
                  <div
                    key={tx.id}
                    className="group relative overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-sm backdrop-blur-sm transition-all hover:shadow-lg hover:shadow-indigo-100/40"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    {/* Left accent bar */}
                    <div className={`absolute left-0 top-0 h-full w-[3px] ${
                      tx.status === "completed"
                        ? "bg-gradient-to-b from-emerald-400 via-teal-400 to-emerald-400"
                        : "bg-gradient-to-b from-amber-400 via-yellow-400 to-amber-400"
                    }`} />

                    {/* Amount header */}
                    <div className="flex items-center gap-3 px-4 py-3.5 pl-5">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-xl shadow-lg ${
                        tx.status === "completed"
                          ? "bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-200/40"
                          : "bg-gradient-to-br from-amber-500 to-yellow-500 shadow-amber-200/40"
                      }`}>
                        <BsCurrencyRupee className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <span className="text-2xl font-extrabold tracking-tight text-slate-900">
                          {tx.amount.toLocaleString()}
                        </span>
                        <span className="ml-1 text-xs font-bold text-slate-400">INR</span>
                      </div>
                      <span className={`rounded-lg px-2.5 py-1 text-[10px] font-bold ${
                        tx.status === "completed"
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-amber-50 text-amber-600"
                      }`}>
                        {tx.status === "completed" ? "Completed" : "Pending"}
                      </span>
                    </div>

                    {/* Divider */}
                    <div className="mx-4 h-px bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100" />

                    {/* Details */}
                    <div className="space-y-2.5 px-4 py-3.5 pl-5">
                      <SellDetailRow label="UPI ID" value={tx.upiId} />
                      <SellDetailRow label="Bank" value={tx.bank} highlight />
                      {tx.buyerUtr && <SellDetailRow label="UTR" value={tx.buyerUtr} copyable mono />}
                      <SellDetailRow label="Order No" value={tx.orderNo} copyable mono />
                      <SellDetailRow label="Order Time" value={tx.orderTime} dimmed />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

function SellDetailRow({
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
