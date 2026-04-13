"use client";

import Image from "next/image";
import { ChangeEvent, Suspense, useEffect, useId, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getCurrentUserId } from "@/lib/client-auth";
import {
  IoChevronBack,
  IoCloseOutline,
  IoCopyOutline,
  IoWarningOutline,
} from "react-icons/io5";

export const dynamic = "force-dynamic";

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

export default function UsdtPaymentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f4f1ee]" />}>
      <UsdtPaymentContent />
    </Suspense>
  );
}

function UsdtPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const transferAmount = searchParams.get("amount") || "0";
  const trc20Address = "TVMdQ8BxUQ75JYEE3QZcyQBgxQjvZErKqL";

  const stableId = useId();
  const orderId = `USDT${transferAmount.replace(/\D/g, "").padStart(6, "0")}${stableId.replace(/:/g, "")}`;
  const [remainingSeconds, setRemainingSeconds] = useState(29 * 60 + 49);
  const [copiedField, setCopiedField] = useState("");
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [utrNumber, setUtrNumber] = useState("");
  const [selectedReceiptName, setSelectedReceiptName] = useState("");
  const [receiptDataUrl, setReceiptDataUrl] = useState("");
  const [utrError, setUtrError] = useState("");
  const [receiptError, setReceiptError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!remainingSeconds) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setRemainingSeconds((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [remainingSeconds]);

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

  const countdown = formatCountdown(remainingSeconds);

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
      reader.onload = () => setReceiptDataUrl(reader.result as string);
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

  const handleCancelOrder = () => {
    setIsCancelModalOpen(false);
    router.push("/buy");
  };

  const handleReceiptSubmit = async () => {
    let hasError = false;

    if (utrNumber.length < 10) {
      setUtrError("Transaction hash must be at least 10 characters");
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

    const buyerId = getCurrentUserId();
    if (!buyerId) {
      alert("Please login first");
      router.push("/");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/usdt-buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerId,
          amount: Number(transferAmount),
          txHash: utrNumber,
          receiptUrl: receiptDataUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to submit");
        return;
      }

      setIsReceiptModalOpen(false);
      router.push("/orders");
    } catch {
      alert("Network error");
    } finally {
      setSubmitting(false);
    }
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

      <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 pb-10 pt-10">
        <section className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[15px] text-zinc-400">Status <span className="ml-2 font-medium text-zinc-900">Inprogress</span></p>
            </div>
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
              Please send <span className="font-bold text-[#ef4d30]">{transferAmount} USDT</span> to the TRC20 address below.
            </p>
          </div>

          <div className="mt-6 rounded-[24px] border border-zinc-200 bg-zinc-50 px-4 py-5">
            <p className="text-center text-sm font-semibold text-zinc-700">Scan QR to pay</p>
            <div className="mx-auto mt-4 w-fit rounded-[24px] bg-white p-3 shadow-[0_12px_30px_-22px_rgba(0,0,0,0.45)]">
              <Image
                src="/usdt_qr.jpg"
                alt="USDT payment QR code"
                width={220}
                height={220}
                className="rounded-[18px]"
                priority
              />
            </div>
            <p className="mt-3 text-center text-xs text-zinc-500">TRC20 wallet receive QR</p>
          </div>

          <div className="mt-6">
            <DetailRow
              label="Payment Amount"
              value={transferAmount}
              onCopy={() => copyValue("Payment Amount", transferAmount)}
            />
            <DetailRow
              label="Wallet Address (TRC20)"
              value={trc20Address}
              onCopy={() => copyValue("Wallet Address", trc20Address)}
            />
            <DetailRow
              label="Order ID"
              value={orderId}
              onCopy={() => copyValue("Order ID", orderId)}
            />
          </div>

          <div className="mt-5 rounded-2xl bg-[#fff6df] px-4 py-4 text-[15px] leading-7 text-[#ff4c35]">
            <IoWarningOutline className="mr-1 mb-0.5 inline h-4 w-4 text-amber-500" />
            Only supports TRC20 Network
          </div>

          <button
            type="button"
            onClick={() => setIsReceiptModalOpen(true)}
            className="mt-8 w-full rounded-full bg-gradient-to-r from-[#7c3aed] to-[#8b5cf6] px-5 py-4 text-base font-semibold text-white shadow-[0_18px_35px_-20px_rgba(124,58,237,0.85)] transition hover:brightness-105"
          >
            Upload payment receipt
          </button>

          <p className="mt-3 text-center text-xs text-zinc-500">
            {copiedField ? `${copiedField} copied` : "Tap the copy icon to copy details"}
          </p>
        </section>
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
              <h2 className="text-[1.95rem] font-semibold tracking-tight text-zinc-900">TX Hash</h2>
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
                <span className="sr-only">Transaction Hash</span>
                <input
                  type="text"
                  value={utrNumber}
                  onChange={(event) => {
                    setUtrNumber(event.target.value);
                    if (utrError) {
                      setUtrError("");
                    }
                  }}
                  placeholder="Enter transaction hash (0x...)"
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

              <button
                type="button"
                onClick={handleReceiptSubmit}
                disabled={submitting}
                className="w-full rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#8b5cf6] px-4 py-4 text-lg font-semibold text-white shadow-[0_18px_35px_-20px_rgba(124,58,237,0.85)] transition hover:brightness-105 disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit"}
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
                className="px-4 py-4 text-lg font-medium text-[#7654ff] transition hover:bg-violet-50"
              >
                Yes
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
