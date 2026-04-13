"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  IoChevronBack,
  IoCloseOutline,
  IoCopyOutline,
  IoHelpCircle,
  IoWarningOutline,
} from "react-icons/io5";
import { getCurrentUserId } from "@/lib/client-auth";



interface OfferDetail {
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

function formatCountdown(totalSeconds: number) {
  const safeSeconds = Math.max(totalSeconds, 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return {
    hours: String(Math.floor(minutes / 60)).padStart(2, "0"),
    minutes: String(minutes % 60).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
  };
}

type DetailRowProps = {
  label: string;
  value: string;
  onCopy: () => void;
};

function DetailRow({ label, value, onCopy }: DetailRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-zinc-200 py-4 last:border-b-0">
      <span className="text-[15px] text-zinc-400">{label}</span>
      <div className="flex items-center gap-2 text-right">
        <span className="max-w-[210px] break-all text-[15px] font-medium text-zinc-900">{value}</span>
        <button
          type="button"
          onClick={onCopy}
          className="rounded-lg p-1.5 text-zinc-700 transition hover:bg-zinc-100"
          aria-label={`Copy ${label}`}
        >
          <IoCopyOutline className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

export default function BuyDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [item, setItem] = useState<OfferDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [expireTimestamp, setExpireTimestamp] = useState<number | null>(null);
  const [clockOffset, setClockOffset] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(-1);
  const [copiedField, setCopiedField] = useState("");
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [utrNumber, setUtrNumber] = useState("");
  const [selectedReceiptName, setSelectedReceiptName] = useState("");
  const [receiptDataUrl, setReceiptDataUrl] = useState("");
  const [utrError, setUtrError] = useState("");
  const [receiptError, setReceiptError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cancelling, setCancelling] = useState(false);

  const [lockCalled, setLockCalled] = useState(false);

  useEffect(() => {
    async function fetchOfferAndLock() {
      try {
        const res = await fetch(`/api/offers/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.offer) {
            setItem(data.offer);

            // Immediately lock the offer and create PENDING order
            const userId = getCurrentUserId();
            if (userId && !lockCalled) {
              setLockCalled(true);
              try {
                const lockRes = await fetch(`/api/offers/${params.id}/lock`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ buyerId: userId }),
                });
                if (lockRes.ok) {
                  const lockData = await lockRes.json();
                  if (lockData.expiresAt && lockData.serverNow) {
                    // Use server clock to avoid client clock skew
                    const offset = lockData.serverNow - Date.now();
                    setClockOffset(offset);
                    setExpireTimestamp(lockData.expiresAt);
                    const remaining = Math.max(0, Math.floor((lockData.expiresAt - (Date.now() + offset)) / 1000));
                    setRemainingSeconds(remaining);
                  }
                } else {
                  console.error("Lock failed:", await lockRes.text());
                }
              } catch (err) {
                console.error("Lock network error:", err);
              }
            }
          }
        }
      } catch {
        // ignore
      }
      setLoading(false);
    }
    fetchOfferAndLock();
  }, [params.id, lockCalled]);

  // Auto-expire: when timer reaches 0 (not -1 initial), cancel the order and redirect
  useEffect(() => {
    if (remainingSeconds !== 0 || !item) return;

    let cancelled = false;
    async function expireOrder() {
      const userId = getCurrentUserId();
      if (!userId || cancelled) return;
      try {
        await fetch(`/api/offers/${item!.id}/cancel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ buyerId: userId }),
        });
      } catch {
        // proceed even if network fails
      }
      if (!cancelled) {
        router.replace("/buy");
      }
    }
    expireOrder();
    return () => { cancelled = true; };
  }, [remainingSeconds, item, router]);

  // Bulletproof countdown: always compute from real time, never decrement a counter.
  // Handles tab backgrounding, app switching, and client clock skew.
  useEffect(() => {
    if (expireTimestamp === null) return undefined;

    function tick() {
      const now = Date.now() + clockOffset;
      const remaining = Math.max(0, Math.floor((expireTimestamp! - now) / 1000));
      setRemainingSeconds(remaining);
    }

    tick(); // immediate sync
    const timer = window.setInterval(tick, 1000);

    // Also sync when tab becomes visible again (setInterval may have been throttled)
    function onVisible() {
      if (document.visibilityState === "visible") tick();
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [expireTimestamp, clockOffset]);

  useEffect(() => {
    if (!copiedField) {
      return undefined;
    }

    const timeout = window.setTimeout(() => setCopiedField(""), 1400);

    return () => window.clearTimeout(timeout);
  }, [copiedField]);

  useEffect(() => {
    if (!isReceiptModalOpen && !isCancelModalOpen) {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isCancelModalOpen, isReceiptModalOpen]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] px-4 py-10 text-zinc-900">
        <div className="mx-auto max-w-md rounded-[28px] bg-white p-6 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.32)]">
          <p className="text-base font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] px-4 py-10 text-zinc-900">
        <div className="mx-auto max-w-md rounded-[28px] bg-white p-6 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.32)]">
          <button
            type="button"
            onClick={() => router.push("/buy")}
            className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700"
          >
            Back to Buy
          </button>
          <p className="mt-4 text-base font-semibold">Order not found.</p>
        </div>
      </div>
    );
  }

  const countdown = formatCountdown(remainingSeconds > 0 ? remainingSeconds : 0);
  const copyValue = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(label);
    } catch {
      setCopiedField("");
    }
  };

  const handleReceiptSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setSelectedReceiptName(file?.name ?? "");
    if (file) {
      setReceiptError("");
      const reader = new FileReader();
      reader.onload = () => {
        setReceiptDataUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setReceiptDataUrl("");
    }
  };

  const closeReceiptModal = () => {
    setIsReceiptModalOpen(false);
    setUtrError("");
    setReceiptError("");
  };

  const closeCancelModal = () => {
    setIsCancelModalOpen(false);
  };

  const handleCancelOrder = async () => {
    const userId = getCurrentUserId();
    if (!userId || !item) {
      setIsCancelModalOpen(false);
      router.replace("/buy");
      return;
    }

    setCancelling(true);
    try {
      await fetch(`/api/offers/${item.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyerId: userId }),
      });
    } catch {
      // proceed to navigate even if cancel fails
    }
    setCancelling(false);
    setIsCancelModalOpen(false);
    router.replace("/buy");
  };

  const handleReceiptSubmit = async () => {
    let hasError = false;

    if (utrNumber.length !== 12) {
      setUtrError("UTR must be string with exactly 12 character");
      hasError = true;
    }

    if (!selectedReceiptName) {
      setReceiptError("Payment screenshot is required");
      hasError = true;
    }

    if (hasError) {
      return;
    }

    setUtrError("");
    setReceiptError("");

    if (item) {
      const userId = getCurrentUserId();

      if (!userId) {
        setReceiptError("Session expired. Please login again.");
        return;
      }

      try {
        const response = await fetch(`/api/offers/${item.id}/buy`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            buyerId: userId,
            utrNumber,
            receiptUrl: receiptDataUrl,
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          setReceiptError(data?.error || "Unable to create transaction.");
          return;
        }
      } catch {
        setReceiptError("Unable to create transaction.");
        return;
      }
    }

    setIsReceiptModalOpen(false);
    router.push("/buy");
  };

  return (
    <div className="min-h-screen bg-[#f4f1ee] text-zinc-900">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 shadow-[0_6px_18px_-16px_rgba(0,0,0,0.28)] backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center justify-center px-4 py-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="absolute left-4 flex h-9 w-9 items-center justify-center rounded-full text-zinc-900 transition hover:bg-zinc-100"
            aria-label="Go back"
          >
            <IoChevronBack className="h-6 w-6" />
          </button>
          <h1 className="text-[2rem] font-semibold text-zinc-950">Buy</h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md px-4 pb-10 pt-6">
        <div className="flex items-center justify-between gap-4">
          <p className="text-[15px] text-zinc-400">Status <span className="ml-2 font-medium text-zinc-900">{item.status === "available" ? "Inprogress" : item.status}</span></p>
          <button
            type="button"
            onClick={() => setIsCancelModalOpen(true)}
            className="rounded-full bg-[#1f2430] px-5 py-2 text-sm font-semibold text-white"
          >
            Cancel
          </button>
        </div>

        <div className="mt-5 flex items-center gap-2 text-lg font-semibold text-zinc-900">
          {[countdown.hours, countdown.minutes, countdown.seconds].map((value, index) => (
            <div key={`${value}-${index}`} className="flex items-center gap-2">
              <span className="rounded-lg bg-[#e8e7ff] px-2 py-1 text-[1.05rem] font-bold text-[#2642f4] shadow-[inset_0_0_0_1px_rgba(38,66,244,0.08)]">
                {value}
              </span>
              {index < 2 ? <span className="text-[#2642f4]">:</span> : null}
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl bg-[#fff6df] px-4 py-4 text-[15px] leading-8 text-zinc-900">
          <p>
            <IoWarningOutline className="mr-1 mb-0.5 inline h-4 w-4 text-amber-500" />
            Please use the <span className="font-bold text-[#ef4d30]">{item.upiId}</span> account to pay <span className="font-bold text-[#ef4d30]">₹{item.amount.toLocaleString()}</span>.
          </p>
        </div>

        <div className="mt-6">
          <DetailRow
            label="Payment Amount"
            value={item.amount.toLocaleString()}
            onCopy={() => copyValue("Payment Amount", String(item.amount))}
          />
          <DetailRow
            label="Name"
            value={item.sellerName}
            onCopy={() => copyValue("Name", item.sellerName)}
          />
          <DetailRow
            label="Account"
            value={item.accountNumber}
            onCopy={() => copyValue("Account", item.accountNumber)}
          />
          <DetailRow
            label="IFSC"
            value={item.ifsc}
            onCopy={() => copyValue("IFSC", item.ifsc)}
          />
          <DetailRow
            label="Order ID"
            value={item.id}
            onCopy={() => copyValue("Order ID", item.id)}
          />
        </div>

        <div className="mt-5 rounded-2xl bg-[#fff6df] px-4 py-4 text-[15px] leading-7 text-[#ff4c35]">
          <IoWarningOutline className="mr-1 mb-0.5 inline h-4 w-4 text-amber-500" />
          Please carefully verify the bill information; otherwise, the transaction cannot be completed.
        </div>

        <button
          type="button"
          onClick={() => setIsReceiptModalOpen(true)}
          className="mt-8 w-full rounded-full bg-gradient-to-r from-[#7c3aed] to-[#8b5cf6] px-5 py-4 text-base font-semibold text-white shadow-[0_18px_35px_-20px_rgba(124,58,237,0.85)] transition hover:brightness-105"
        >
          Upload payment receipt
        </button>

        <p className="mt-3 text-center text-xs text-zinc-500">
          {copiedField ? `${copiedField} copied` : "Tap the copy icon to copy account details"}
        </p>
      </main>

      {isReceiptModalOpen ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/35 px-3 pb-0 pt-8">
          <button
            type="button"
            aria-label="Close popup"
            className="absolute inset-0 cursor-default"
            onClick={closeReceiptModal}
          />

          <section className="relative z-10 w-full max-w-md rounded-t-[22px] bg-white px-4 pb-8 pt-5 shadow-[0_-12px_35px_-18px_rgba(0,0,0,0.35)] animate-[revealUp_240ms_cubic-bezier(0.22,1,0.36,1)_forwards]">
            <div className="flex items-center justify-between gap-3 border-b border-zinc-100 pb-4">
              <h2 className="text-[1.95rem] font-semibold tracking-tight text-zinc-900">UTR</h2>
              <button
                type="button"
                onClick={closeReceiptModal}
                className="rounded-full p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                aria-label="Close receipt modal"
              >
                <IoCloseOutline className="h-6 w-6" />
              </button>
            </div>

            <div className="mt-5 space-y-6">
              <label className="block">
                <span className="sr-only">UTR Number</span>
                <input
                  type="text"
                  value={utrNumber}
                  onChange={(event) => {
                    setUtrNumber(event.target.value);
                    if (utrError) {
                      setUtrError("");
                    }
                  }}
                  placeholder="Please enter a valid UTR number"
                  className={`w-full rounded-lg border bg-[#f5f5f5] px-3.5 py-3 text-[15px] text-zinc-900 outline-none transition placeholder:text-zinc-500 focus:ring-4 ${
                    utrError
                      ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                      : "border-zinc-200 focus:border-[#8b5cf6] focus:ring-[#ede9fe]"
                  }`}
                />
                {utrError ? (
                  <p className="mt-2 text-sm font-medium text-red-500">{utrError}</p>
                ) : null}
              </label>

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleReceiptSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full rounded-lg border px-4 py-3 text-[15px] font-medium transition ${
                    receiptError
                      ? "border-red-300 text-red-500 hover:bg-red-50"
                      : "border-[#9f67ff] text-[#7c3aed] hover:bg-[#faf5ff]"
                  }`}
                >
                  Upload Screenshot
                </button>
                <p className="mt-2 min-h-5 text-sm text-zinc-500">
                  {selectedReceiptName || " "}
                </p>
                {receiptError ? (
                  <p className="mt-1 text-sm font-medium text-red-500">{receiptError}</p>
                ) : null}
              </div>

              <div className="flex items-center gap-1.5 text-[15px] text-zinc-600">
                <span>What&apos;s the UTR ?</span>
                <button
                  type="button"
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#8b5cf6] text-white"
                  aria-label="UTR help"
                >
                  <IoHelpCircle className="h-3.5 w-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleReceiptSubmit}
                className="w-full rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#8b5cf6] px-4 py-4 text-lg font-semibold text-white shadow-[0_18px_35px_-20px_rgba(124,58,237,0.85)] transition hover:brightness-105"
              >
                Submit
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {isCancelModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <button
            type="button"
            aria-label="Close cancel confirmation"
            className="absolute inset-0 cursor-default"
            onClick={closeCancelModal}
          />

          <section className="relative z-10 w-full max-w-[320px] overflow-hidden rounded-[16px] bg-white shadow-[0_20px_45px_-20px_rgba(0,0,0,0.45)]">
            <div className="px-6 pb-6 pt-7 text-center">
              <h2 className="text-[2rem] font-semibold text-[#5a3b1f]">Tip</h2>
              <p className="mt-8 text-[15px] text-[#4b5563]">Are you sure you want to cancel</p>
            </div>

            <div className="grid grid-cols-2 border-t border-zinc-200">
              <button
                type="button"
                onClick={closeCancelModal}
                className="border-r border-zinc-200 px-4 py-4 text-lg font-medium text-[#7c4a1d] transition hover:bg-zinc-50"
              >
                No
              </button>
              <button
                type="button"
                onClick={handleCancelOrder}
                disabled={cancelling}
                className="px-4 py-4 text-lg font-medium text-[#7654ff] transition hover:bg-violet-50 disabled:opacity-50"
              >
                {cancelling ? "Cancelling..." : "Yes"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}