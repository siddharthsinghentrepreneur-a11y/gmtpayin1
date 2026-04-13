"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IoChevronBack, IoChevronDown } from "react-icons/io5";
import { HiOutlineBuildingLibrary } from "react-icons/hi2";
import { getCurrentUserId } from "@/lib/client-auth";

const FILTERS = ["All", "Mini", "Small", "Medium", "Large", "Max"];

interface OfferItem {
  id: string;
  sellerId: string;
  sellerName: string;
  amount: number;
  bank: string;
  upiId: string;
  accountNumber: string;
  ifsc: string;
  status: string;
  createdAt: string;
}

export default function BuyPage() {
  const router = useRouter();
  const [currency, setCurrency] = useState<"INR" | "USDT">("INR");
  const [activeFilter, setActiveFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState<"highToLow" | "lowToHigh" | null>("highToLow");
  const [transferAmount, setTransferAmount] = useState("1000");
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [activeOrder, setActiveOrder] = useState<{ offerId: string; createdAt: string } | null>(null);
  const [showActivePopup, setShowActivePopup] = useState(false);
  const [remainingTime, setRemainingTime] = useState("");

  // Check for active PENDING order on page load
  useEffect(() => {
    async function checkActiveOrder() {
      try {
        const userId = getCurrentUserId();
        if (!userId) return;
        const res = await fetch(`/api/orders?userId=${userId}`);
        if (res.ok) {
          const data = await res.json();
          const pending = data.orders?.find(
            (o: { status: string; offerId: string; time: string }) =>
              o.status === "Paying" || o.status === "Checking"
          );
          if (pending) {
            setActiveOrder({ offerId: pending.offerId, createdAt: pending.time });
          }
        }
      } catch {
        // ignore
      }
    }
    checkActiveOrder();
  }, []);

  // Countdown timer for active order popup
  useEffect(() => {
    if (!showActivePopup || !activeOrder) return;
    const updateTimer = () => {
      // 10 minute window from order creation
      const parts = activeOrder.createdAt.split(/[/ :]/);
      const orderDate = new Date(
        parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]),
        parseInt(parts[3]), parseInt(parts[4]), parseInt(parts[5])
      );
      const expiresAt = orderDate.getTime() + 10 * 60 * 1000;
      const diff = expiresAt - Date.now();
      if (diff <= 0) {
        setRemainingTime("Timeout");
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setRemainingTime(`${String(mins).padStart(2, "0")} : ${String(secs).padStart(2, "0")}`);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [showActivePopup, activeOrder]);

  useEffect(() => {
    async function fetchOffers() {
      try {
        const userId = getCurrentUserId();
        const url = userId
          ? `/api/offers?status=AVAILABLE&excludeUserId=${userId}`
          : "/api/offers?status=AVAILABLE";
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setOffers(data.offers ?? []);
        }
      } catch {
        // ignore
      }
    }
    fetchOffers();
  }, []);

  const binancePrice = 94;
  const platformPrice = 100;
  const transferValue = Number(transferAmount) || 0;
  const incomeValue = (platformPrice - binancePrice) * transferValue;
  const receiveValue = platformPrice * transferValue;

  const getFilteredItems = () => {
    return offers.filter((item) => {
      const price = item.amount;

      switch (activeFilter) {
        case "Mini":
          return price >= 100 && price <= 2000;
        case "Small":
          return price > 2000 && price <= 5000;
        case "Medium":
          return price > 5000 && price <= 10000;
        case "Large":
          return price > 10000 && price <= 20000;
        case "Max":
          return price > 20000 && price <= 40000;
        case "All":
        default:
          return true;
      }
    });
  };

  const calculateIncome = (amount: number): string => {
    const income = amount * 0.03 + 6;
    return `₹${income.toFixed(2)}`;
  };

  const calculateBalance = (amount: number): string => {
    const income = amount * 0.03 + 6;
    const balance = amount + income;
    return `+ ${balance.toFixed(2)}`;
  };

  const getSortedAndFilteredItems = () => {
    const filtered = getFilteredItems();
    
    if (!sortOrder) return filtered;

    return [...filtered].sort((a, b) => {
      const priceA = a.amount;
      const priceB = b.amount;

      if (sortOrder === "highToLow") {
        return priceB - priceA;
      }
      return priceA - priceB;
    });
  };

  const filteredItems = getSortedAndFilteredItems();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#ebf2ff_0%,#f6f8fc_36%,#f8fafc_100%)] text-slate-900">
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-56 bg-[radial-gradient(circle_at_15%_15%,rgba(99,102,241,0.26),transparent_48%),radial-gradient(circle_at_85%_0%,rgba(6,182,212,0.2),transparent_50%)]" />

      <header className="sticky top-0 z-20 border-b border-white/60 bg-white/75 backdrop-blur-md">
        <div className="relative mx-auto flex w-full max-w-md items-center justify-center px-4 py-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="absolute left-4 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
            aria-label="Go back"
          >
            <IoChevronBack className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-semibold tracking-tight text-slate-950">
            Buy
          </h1>
        </div>

        <div className="mx-auto grid w-full max-w-md grid-cols-2 gap-2 px-4 pb-3 pt-1">
          {(["INR", "USDT"] as const).map((value) => {
            const isActive = currency === value;

            return (
              <button
                key={value}
                type="button"
                onClick={() => setCurrency(value)}
                className={`rounded-full py-2 text-sm font-semibold transition ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-600 to-cyan-500 text-white shadow-[0_10px_20px_-12px_rgba(79,70,229,0.85)]"
                    : "border border-slate-200 bg-white text-slate-600"
                }`}
              >
                {value}
              </button>
            );
          })}
        </div>
      </header>

      <main className="mx-auto w-full max-w-md px-4 pb-8 pt-5">
        {currency === "INR" ? (
          <>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 px-5 py-5 text-white shadow-[0_20px_35px_-20px_rgba(37,99,235,0.9)] reveal-up">
              <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-white/25 blur-2xl" />
              <div className="pointer-events-none absolute -left-8 bottom-0 h-20 w-20 rounded-full bg-white/20 blur-xl" />
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-100">Smart Margin</p>
              <p className="mt-2 text-3xl font-bold leading-tight">
                3% + 6
                <span className="ml-2 text-base font-medium text-indigo-50">Income per order</span>
              </p>
              <p className="mt-2 text-sm text-indigo-100">Higher ranked merchants are sorted first for faster execution.</p>
            </div>

            <div className="mt-5 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {FILTERS.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                    activeFilter === filter
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setSortOrder((current) => {
                  if (current === "highToLow") return "lowToHigh";
                  if (current === "lowToHigh") return "highToLow";
                  return "highToLow";
                });
              }}
              className="mt-4 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              {sortOrder === "lowToHigh" ? "Low to High" : "High to Low"}
              <IoChevronDown className="h-3.5 w-3.5" />
            </button>

            <section className="mt-4 space-y-3">
              {filteredItems.map((item, index) => {
                const filterLabel = item.amount <= 2000 ? "Mini" : item.amount <= 5000 ? "Small" : item.amount <= 10000 ? "Medium" : item.amount <= 20000 ? "Large" : "Max";
                return (
                <article
                  key={item.id}
                  className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.8)] reveal-up"
                  style={{ animationDelay: `${index * 120}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]">
                        <HiOutlineBuildingLibrary className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-base font-bold text-slate-900">
                          ₹{item.amount.toLocaleString()}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          <span className="mr-1 text-amber-500">●</span>
                          {item.bank}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (activeOrder) {
                          setShowActivePopup(true);
                          return;
                        }
                        router.push(`/buy/${item.id}`);
                      }}
                      className="rounded-full bg-gradient-to-r from-indigo-600 to-cyan-500 px-5 py-1.5 text-sm font-semibold text-white shadow-[0_8px_18px_-10px_rgba(14,116,244,0.95)] transition hover:brightness-110"
                    >
                      Buy
                    </button>
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                      3.00% + 6.00
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                      {filterLabel}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-slate-50 px-3 py-2.5">
                      <p className="text-base font-bold text-slate-900">
                        {calculateIncome(item.amount)}
                      </p>
                      <p className="text-xs text-slate-500">
                        Income
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-2.5">
                      <p className="text-base font-bold text-slate-900">
                        {calculateBalance(item.amount)}
                      </p>
                      <p className="text-xs text-slate-500">
                        Balance
                      </p>
                    </div>
                  </div>
                </article>
                );
              })}
              {filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-3xl bg-white px-4 py-12 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.8)]">
                  <p className="text-base font-semibold text-slate-500">
                    No items available in this price range
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Try selecting a different filter
                  </p>
                </div>
              ) : null}
            </section>
          </>
        ) : (
          <section className="space-y-5 reveal-up">
            <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 to-indigo-600 p-5 text-white shadow-[0_20px_35px_-20px_rgba(109,40,217,0.95)]">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                <div>
                  <p className="text-sm text-violet-100">Binance Price</p>
                  <p className="mt-1 text-3xl font-bold text-yellow-300">
                    {binancePrice}
                    <span className="ml-1 text-lg font-semibold">INR</span>
                  </p>
                </div>
                <div className="h-14 w-px bg-white/25" />
                <div>
                  <p className="text-sm text-violet-100">Platform Price</p>
                  <p className="mt-1 text-3xl font-bold text-yellow-300">
                    {platformPrice}
                    <span className="ml-1 text-lg font-semibold">INR</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-emerald-400 bg-emerald-50 font-bold text-emerald-500">
                T
              </span>
              <p>
                Ratio: 1USDT = <span className="font-semibold text-slate-900">{platformPrice}</span>
                <span className="ml-1 text-rose-500 line-through">{binancePrice}</span> INR
              </p>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-800">Transfer</span>
                <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    inputMode="decimal"
                    value={transferAmount}
                    onChange={(event) => setTransferAmount(event.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-4 text-lg text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  />
                  <span className="text-base font-medium text-slate-400">USDT</span>
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-800">Income</span>
                <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                  <input
                    type="text"
                    value={incomeValue.toFixed(0)}
                    readOnly
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-4 text-lg text-slate-900 outline-none"
                  />
                  <span className="text-base font-medium text-slate-400">INR</span>
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-800">Receive</span>
                <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                  <input
                    type="text"
                    value={receiveValue.toFixed(0)}
                    readOnly
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-4 text-lg text-slate-900 outline-none"
                  />
                  <span className="text-base font-medium text-slate-400">INR</span>
                </div>
              </label>
            </div>

            <button
              type="button"
              onClick={() => router.push(`/buy/usdt?amount=${transferAmount}`)}
              className="mt-2 w-full rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-500 px-4 py-4 text-base font-semibold text-white shadow-[0_18px_35px_-20px_rgba(109,40,217,0.95)] transition hover:brightness-110"
            >
              Confirm
            </button>
          </section>
        )}

        <div className="mt-7 flex items-center justify-center gap-3 text-slate-400">
          <span className="h-px w-14 bg-slate-300" />
          <span className="text-xs font-medium uppercase tracking-wider">
            No more data
          </span>
          <span className="h-px w-14 bg-slate-300" />
        </div>
      </main>

      {/* Active order notification popup */}
      {showActivePopup && activeOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-6 w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Notification</h3>
            <p className="mt-3 text-sm font-medium text-red-500">
              There is an unprocessed order, please handle it as soon as possible.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {remainingTime === "Timeout" ? (
                <span className="font-bold text-red-600">Timeout</span>
              ) : (
                <>Remaining time: <span className="font-semibold text-slate-700">{remainingTime}</span></>
              )}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowActivePopup(false)}
                className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Ignore
              </button>
              <button
                type="button"
                onClick={() => router.push(`/buy/${activeOrder.offerId}`)}
                className="rounded-full bg-gradient-to-r from-indigo-600 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
              >
                Process
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}