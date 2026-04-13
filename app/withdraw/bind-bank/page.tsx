"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { IoChevronBack } from "react-icons/io5";
import { BsBank2, BsCheckCircleFill } from "react-icons/bs";
import { MdAccountBalance, MdPerson, MdCreditCard, MdCode } from "react-icons/md";
import { readLinkedBankAccount, writeLinkedBankAccount } from "@/lib/bank-account";
import { getCurrentUserId } from "@/lib/client-auth";

const BANKS = Array.from(
  new Set([
    "AB Bank",
    "Abu Dhabi Commercial Bank",
    "Access Bank",
    "Airtel Payments Bank",
    "Allahabad Bank",
    "American Express Banking Corp",
    "Andaman and Nicobar State Co-operative Bank",
    "Andhra Bank",
    "Andhra Pradesh Grameena Bank",
    "Andhra Pradesh State Co-operative Bank",
    "Arunachal Pradesh Rural Bank",
    "Arunachal Pradesh State Co-operative Apex Bank",
    "Assam Co-operative Apex Bank",
    "Assam Gramin Bank",
    "Australia and New Zealand Banking Group",
    "AU Small Finance Bank",
    "Axis Bank",
    "Banco Bilbao Vizcaya Argentaria",
    "Banco BPM",
    "Banco de Sabadell",
    "Bandhan Bank",
    "Bank of America",
    "Bank of Bahrain and Kuwait",
    "Bank of Baroda",
    "Bank of Ceylon",
    "Bank of China",
    "Bank of India",
    "Bank of Mauritius",
    "Bank of Maharashtra",
    "Bank of Montreal",
    "Bank of New York Mellon",
    "Bank of Nova Scotia",
    "Bank of Taiwan",
    "Barclays Bank",
    "Bihar Gramin Bank",
    "Bihar State Co-operative Bank",
    "BNP Paribas",
    "Busan Bank",
    "Canara Bank",
    "Capital Small Finance Bank",
    "Caixa Geral de Depositos",
    "Central Bank of India",
    "Chandigarh State Co-operative Bank",
    "Chhattisgarh Gramin Bank",
    "Chhattisgarh Rajya Sahakari Bank",
    "Citibank",
    "City Union Bank",
    "Coastal Local Area Bank",
    "Cosmos Co-operative Bank",
    "Credit Industriel et Commercial",
    "Crédit Agricole Corporate and Investment Bank",
    "CSB Bank",
    "CTBC Bank",
    "Danske Bank",
    "DBS Bank India",
    "DCB Bank",
    "Delhi State Co-operative Bank",
    "Dena Bank",
    "Deutsche Bank",
    "Dhanlaxmi Bank",
    "DNB Bank",
    "Doha Bank",
    "DZ Bank",
    "Emirates NBD Bank",
    "Equitas Small Finance Bank",
    "ESAF Small Finance Bank",
    "Federal Bank",
    "Fino Small Finance Bank",
    "First Abu Dhabi Bank",
    "FirstRand Bank",
    "Gazprombank",
    "Goa State Co-operative Bank",
    "Gujarat Gramin Bank",
    "Gujarat State Co-operative Bank",
    "Handelsbanken",
    "Haryana State Co-operative Apex Bank",
    "Haryana Gramin Bank",
    "HDFC Bank",
    "Himachal Pradesh Gramin Bank",
    "Himachal Pradesh State Co-operative Bank",
    "HSBC Bank India",
    "ICICI Bank",
    "IDBI Bank",
    "IDFC First Bank",
    "India Post Payments Bank",
    "Indian Bank",
    "Indian Overseas Bank",
    "Industrial and Commercial Bank of China",
    "Industrial Bank of Korea",
    "IndusInd Bank",
    "Intesa Sanpaolo",
    "Jammu and Kashmir Grameen Bank",
    "Jammu and Kashmir State Co-operative Bank",
    "Jammu & Kashmir Bank",
    "Jana Small Finance Bank",
    "Jharkhand Gramin Bank",
    "Jharkhand State Co-operative Bank",
    "Jio Payments Bank",
    "JPMorgan Chase Bank",
    "Karnataka Bank",
    "Karnataka Grameena Bank",
    "Karnataka State Co-operative Apex Bank",
    "Karur Vysya Bank",
    "KEB Hana Bank",
    "Kerala Gramin Bank",
    "Kerala State Co-operative Bank",
    "Kotak Mahindra Bank",
    "Kookmin Bank",
    "Krishna Bhima Samruddhi Local Area Bank",
    "Krung Thai Bank",
    "Lakshmi Vilas Bank",
    "Madhya Pradesh Gramin Bank",
    "Madhya Pradesh Rajya Sahakari Bank",
    "Maharashtra Gramin Bank",
    "Maharashtra State Co-operative Bank",
    "Manipur Rural Bank",
    "Manipur State Co-operative Bank",
    "Mashreq Bank",
    "Maybank Indonesia",
    "Meghalaya Co-operative Apex Bank",
    "Meghalaya Rural Bank",
    "Mizoram Co-operative Apex Bank",
    "Mizoram Rural Bank",
    "Mizuho Bank",
    "MUFG Bank",
    "Nagaland Rural Bank",
    "Nagaland State Co-operative Bank",
    "Nainital Bank",
    "National Australia Bank",
    "Natixis",
    "NatWest Markets",
    "North East Small Finance Bank",
    "NSDL Payments Bank",
    "Odisha Grameen Bank",
    "Odisha State Co-operative Bank",
    "Oriental Bank of Commerce",
    "Paytm Payments Bank",
    "Pondicherry State Co-operative Bank",
    "Puducherry Grama Bank",
    "Punjab and Sind Bank",
    "Punjab Gramin Bank",
    "Punjab National Bank",
    "Punjab State Co-operative Bank",
    "Qatar National Bank",
    "Rabobank International",
    "Raiffeisen Bank International",
    "Rajasthan Gramin Bank",
    "Rajasthan State Co-operative Bank",
    "RBL Bank",
    "Saraswat Co-operative Bank",
    "Sberbank",
    "Shinhan Bank",
    "Shivalik Small Finance Bank",
    "Sikkim State Co-operative Bank",
    "Slice Small Finance Bank",
    "Societe Generale",
    "Sonali Bank",
    "South Indian Bank",
    "Standard Chartered Bank India",
    "State Bank of India",
    "State Bank of Mauritius",
    "Sumitomo Mitsui Banking Corporation",
    "Suryoday Small Finance Bank",
    "Syndicate Bank",
    "Tamil Nadu Grama Bank",
    "Tamil Nadu State Apex Co-operative Bank",
    "Tamilnad Mercantile Bank",
    "Telangana Grameena Bank",
    "Telangana State Co-operative Apex Bank",
    "The Federal Bank",
    "Toronto Dominion Bank",
    "Tripura Gramin Bank",
    "Tripura State Co-operative Bank",
    "UBS AG",
    "UCO Bank",
    "Ujjivan Small Finance Bank",
    "Union Bank of India",
    "United Bank of India",
    "United Overseas Bank",
    "Unity Small Finance Bank",
    "Uttar Pradesh Co-operative Bank",
    "Uttar Pradesh Gramin Bank",
    "Uttaranchal Rajya Sahakari Bank",
    "Utkarsh Small Finance Bank",
    "Uttarakhand Gramin Bank",
    "Vijaya Bank",
    "Wells Fargo Bank",
    "West Bengal Gramin Bank",
    "West Bengal State Co-operative Bank",
    "Woori Bank",
    "Yes Bank",
    "Zurcher Kantonalbank",
    "Other",
  ]),
).sort((left, right) => left.localeCompare(right));

export default function BindBankPage() {
  const router = useRouter();
  const [existingLinkedBank, setExistingLinkedBank] = useState(() => {
    const stored = readLinkedBankAccount();
    // If old localStorage data has no fullAccount, clear it and allow re-bind
    if (stored && !stored.fullAccount) {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("gmtpay.linkedBankAccount");
      }
      return null;
    }
    return stored;
  });
  const [bankName, setBankName] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccount, setConfirmAccount] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showBankList, setShowBankList] = useState(false);
  const bankRef = useRef<HTMLDivElement>(null);
  const trimmedBankName = bankName.trim();

  // Sync bank account between DB and localStorage
  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId) return;
    fetch(`/api/users/${userId}/bank`)
      .then((r) => r.json())
      .then(async (data) => {
        if (data.bank && data.bank.fullAccount && data.bank.fullAccount.length > 4) {
          // DB has bank with full account — sync to localStorage
          const linked = {
            bankName: data.bank.bankName,
            beneficiary: data.bank.beneficiary,
            accountLast4: data.bank.accountLast4,
            fullAccount: data.bank.fullAccount,
            ifsc: data.bank.ifsc,
          };
          writeLinkedBankAccount(linked);
          setExistingLinkedBank(linked);
        } else if (data.bank && (!data.bank.fullAccount || data.bank.fullAccount.length <= 4)) {
          // DB has incomplete bank data (only last4) — delete it so user can re-bind properly
          fetch(`/api/users/${userId}/bank`, { method: "DELETE" }).catch(() => {});
        }
        // If DB empty and localStorage incomplete, user will see the bind form
      })
      .catch(() => {});
  }, []);

  const filteredBanks = trimmedBankName
    ? BANKS.filter((b) => b.toLowerCase().includes(trimmedBankName.toLowerCase()))
    : BANKS;
  const hasExactBankMatch = BANKS.some((b) => b.toLowerCase() === trimmedBankName.toLowerCase());

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (bankRef.current && !bankRef.current.contains(e.target as Node)) {
        setShowBankList(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const accountMatch = accountNumber.length > 0 && accountNumber === confirmAccount;
  const ifscValid = /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.toUpperCase());
  const allFilled = trimmedBankName && beneficiary.trim() && accountNumber.length >= 9 && accountMatch && ifscValid;

  async function handleSubmit() {
    if (existingLinkedBank) return;
    if (!allFilled) return;
    const userId = getCurrentUserId();
    if (!userId) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/users/${userId}/bank`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankName: trimmedBankName,
          beneficiary: beneficiary.trim(),
          accountLast4: accountNumber.slice(-4),
          fullAccount: accountNumber,
          ifsc: ifsc.toUpperCase(),
          upiId: "",
        }),
      });
      if (!res.ok) {
        setSaving(false);
        return;
      }
      writeLinkedBankAccount({
        bankName: trimmedBankName,
        beneficiary: beneficiary.trim(),
        accountLast4: accountNumber.slice(-4),
        fullAccount: accountNumber,
        ifsc: ifsc.toUpperCase(),
      });
      setSubmitted(true);
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }

  if (existingLinkedBank && !submitted) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,#ede9fe_0%,#f5f3ff_30%,#f8fafc_70%)] text-slate-900">
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-violet-300/20 blur-3xl" />
          <div className="absolute -left-16 top-40 h-56 w-56 rounded-full bg-indigo-300/15 blur-3xl" />
        </div>

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
              Bind Bank Account
            </h1>
          </div>
        </header>

        <div className="mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-md items-center px-4 py-10">
          <div className="w-full rounded-3xl border border-emerald-100 bg-white/90 p-6 shadow-xl shadow-emerald-100/40 backdrop-blur-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-lg shadow-emerald-200/50">
              <BsCheckCircleFill className="h-8 w-8" />
            </div>
            <div className="mt-5 text-center">
              <h2 className="text-xl font-bold text-slate-900">Bank Account Already Linked</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                Ek baar bank account add hone ke baad naya bank account add nahi ho sakta.
              </p>
            </div>

            <div className="mt-5 rounded-2xl bg-emerald-50/80 p-4 text-left space-y-2 ring-1 ring-emerald-100">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Bank</span>
                <span className="font-semibold text-slate-800">{existingLinkedBank.bankName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Beneficiary</span>
                <span className="font-semibold text-slate-800">{existingLinkedBank.beneficiary}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Account</span>
                <span className="font-mono font-semibold text-slate-800">••••{existingLinkedBank.accountLast4}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">IFSC</span>
                <span className="font-mono font-semibold text-slate-800">{existingLinkedBank.ifsc}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="mt-6 w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-400/30 transition hover:shadow-xl active:scale-[0.98]"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,#ede9fe_0%,#f5f3ff_30%,#f8fafc_70%)] flex items-center justify-center px-4">
        <div className="w-full max-w-sm animate-[slideUp_0.4s_ease] text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 shadow-lg shadow-emerald-200/50">
            <BsCheckCircleFill className="h-10 w-10 text-emerald-500" />
          </div>
          <h2 className="mt-5 text-xl font-bold text-slate-900">Bank Account Linked!</h2>
          <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
            Your bank account has been successfully linked. You can now make withdrawals.
          </p>
          <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Bank</span>
              <span className="font-semibold text-slate-800">{trimmedBankName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Beneficiary</span>
              <span className="font-semibold text-slate-800">{beneficiary.trim()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Account</span>
              <span className="font-mono font-semibold text-slate-800">
                {"••••" + accountNumber.slice(-4)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">IFSC</span>
              <span className="font-mono font-semibold text-slate-800">{ifsc.toUpperCase()}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="mt-6 w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-400/30 transition hover:shadow-xl active:scale-[0.98]"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,#ede9fe_0%,#f5f3ff_30%,#f8fafc_70%)] text-slate-900">
      {/* Decorative blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-violet-300/20 blur-3xl" />
        <div className="absolute -left-16 top-40 h-56 w-56 rounded-full bg-indigo-300/15 blur-3xl" />
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
            Bind Bank Account
          </h1>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md px-4 pt-6 pb-10 space-y-5">
        {/* Info Banner */}
        <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-indigo-50 to-violet-50 p-4 ring-1 ring-indigo-100/60">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-300/40">
            <BsBank2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">Link your bank for withdrawals</p>
            <p className="text-[12px] text-zinc-500 mt-0.5">Please ensure all details match your bank records</p>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4">

          {/* Bank Name */}
          <div ref={bankRef} className="relative">
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <MdAccountBalance className="h-4 w-4 text-indigo-500" />
              Bank Name
            </label>
            <input
              type="text"
              value={bankName}
              onChange={(e) => {
                setBankName(e.target.value);
                setShowBankList(true);
              }}
              onFocus={() => setShowBankList(true)}
              placeholder="Type your bank name"
              className={`w-full rounded-xl border bg-white px-4 py-3 text-sm font-medium outline-none transition placeholder:text-zinc-400 ${
                trimmedBankName
                  ? "border-indigo-300 text-slate-900 ring-2 ring-indigo-100"
                  : "border-slate-200 text-slate-900"
              } focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100`}
            />
            {trimmedBankName && (
              <button
                type="button"
                onClick={() => {
                  setBankName("");
                  setShowBankList(false);
                }}
                className="absolute right-3 top-[38px] text-zinc-400 hover:text-zinc-600 text-lg leading-none"
              >
                &times;
              </button>
            )}
            <p className="mt-1 text-[12px] text-zinc-500">
              Type any bank name. Matching suggestions will appear below.
            </p>
            {showBankList && (
              <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
                {filteredBanks.length > 0 ? (
                  <>
                    {filteredBanks.map((b) => (
                      <button
                        type="button"
                        key={b}
                        onClick={() => {
                          setBankName(b);
                          setShowBankList(false);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        <BsBank2 className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                        {b}
                      </button>
                    ))}
                    {trimmedBankName && !hasExactBankMatch && (
                      <button
                        type="button"
                        onClick={() => {
                          setBankName("Other");
                          setShowBankList(false);
                        }}
                        className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-left text-sm font-semibold text-amber-700 transition hover:bg-amber-50"
                      >
                        <BsBank2 className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                        Other
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setBankName("Other");
                      setShowBankList(false);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-amber-700 transition hover:bg-amber-50"
                  >
                    <BsBank2 className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                    Other
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Beneficiary Name */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <MdPerson className="h-4 w-4 text-indigo-500" />
              Beneficiary Name
            </label>
            <input
              type="text"
              value={beneficiary}
              onChange={(e) => setBeneficiary(e.target.value)}
              placeholder="As per bank records"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-zinc-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* Account Number */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <MdCreditCard className="h-4 w-4 text-indigo-500" />
              Account Number
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter account number"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-zinc-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 font-mono tracking-wide"
            />
          </div>

          {/* Confirm Account Number */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <MdCreditCard className="h-4 w-4 text-indigo-500" />
              Confirm Account Number
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={confirmAccount}
              onChange={(e) => setConfirmAccount(e.target.value.replace(/\D/g, ""))}
              placeholder="Re-enter account number"
              className={`w-full rounded-xl border bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-zinc-400 font-mono tracking-wide ${
                confirmAccount.length > 0
                  ? accountMatch
                    ? "border-emerald-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    : "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  : "border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              }`}
            />
            {confirmAccount.length > 0 && !accountMatch && (
              <p className="mt-1 text-[12px] font-medium text-red-500">Account numbers don&apos;t match</p>
            )}
            {accountMatch && (
              <p className="mt-1 flex items-center gap-1 text-[12px] font-medium text-emerald-600">
                <BsCheckCircleFill className="h-3 w-3" /> Account numbers match
              </p>
            )}
          </div>

          {/* IFSC Code */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <MdCode className="h-4 w-4 text-indigo-500" />
              IFSC Code
            </label>
            <input
              type="text"
              value={ifsc}
              onChange={(e) => setIfsc(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11))}
              placeholder="e.g. SBIN0001234"
              maxLength={11}
              className={`w-full rounded-xl border bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-zinc-400 font-mono tracking-wider ${
                ifsc.length > 0
                  ? ifscValid
                    ? "border-emerald-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    : "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  : "border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              }`}
            />
            {ifsc.length > 0 && !ifscValid && (
              <p className="mt-1 text-[12px] font-medium text-red-500">Enter a valid 11-character IFSC code</p>
            )}
            {ifscValid && (
              <p className="mt-1 flex items-center gap-1 text-[12px] font-medium text-emerald-600">
                <BsCheckCircleFill className="h-3 w-3" /> Valid IFSC code
              </p>
            )}
          </div>
        </div>

        {/* Warning */}
        <div className="rounded-xl bg-amber-50 p-3 ring-1 ring-amber-100/60">
          <p className="text-[12px] text-amber-700 leading-relaxed">
            <span className="font-bold">Important:</span> Please double-check all bank details. Incorrect information may result in failed withdrawals or loss of funds.
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!allFilled || saving}
          className={`w-full rounded-2xl py-3.5 text-sm font-bold text-white shadow-lg transition active:scale-[0.98] ${
            allFilled && !saving
              ? "bg-gradient-to-r from-indigo-600 to-violet-600 shadow-indigo-400/30 hover:shadow-xl"
              : "bg-slate-300 shadow-none cursor-not-allowed"
          }`}
        >
          {saving ? "Saving..." : "Bind Bank Account"}
        </button>
      </div>
    </div>
  );
}
