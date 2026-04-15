"use client";

import { BrandLogo } from "@/components/brand-logo";
import { clearUserSession, getCurrentUserId, getUserSession, updateUserSession } from "@/lib/client-auth";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AiFillHome } from "react-icons/ai";
import { RiReceiptFill, RiTeamFill, RiCustomerService2Fill } from "react-icons/ri";
import { MdLeaderboard } from "react-icons/md";
import { IoPerson, IoCopyOutline, IoClose } from "react-icons/io5";
import { FiChevronRight } from "react-icons/fi";
import { BiLogOut } from "react-icons/bi";
import { FaTelegramPlane } from "react-icons/fa";
import { BsCurrencyRupee } from "react-icons/bs";
import { GiPayMoney, GiReceiveMoney } from "react-icons/gi";
import { HiOutlineShieldCheck } from "react-icons/hi2";

export default function MyPage() {
  const router = useRouter();
  const initialUserSession = typeof window === "undefined" ? null : getUserSession();
  const [showService, setShowService] = useState(false);
  const [phone, setPhone] = useState(initialUserSession?.phone || "-----");
  const [uid, setUid] = useState(initialUserSession?.uid || "-----");
  const [referralCode, setReferralCode] = useState(initialUserSession?.referralCode || "-----");
  const [todayEarn, setTodayEarn] = useState(0);
  const [allTimeEarn, setAllTimeEarn] = useState(0);

  useEffect(() => {
    const userId = getCurrentUserId();

    if (!userId) {
      router.replace("/");
      return;
    }

    let cancelled = false;

    const loadUser = async () => {
      try {
        const response = await fetch(`/api/users/${userId}`);
        const data = await response.json();

        if (!response.ok || cancelled) {
          return;
        }

        setPhone(data.user.phone || "-----");
        setUid(data.user.uid || "-----");
        setReferralCode(data.user.referralCode || "-----");
        setTodayEarn(data.user.earnings?.today ?? 0);
        setAllTimeEarn(data.user.earnings?.allTime ?? 0);
        updateUserSession({
          phone: data.user.phone ?? null,
          uid: data.user.uid ?? null,
          referralCode: data.user.referralCode ?? null,
          name: data.user.name,
          role: data.user.role,
        });
      } catch {
        if (cancelled) {
          return;
        }
      }
    };

    void loadUser();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-[#f5f5fa] text-zinc-900">
      {/* ── Gradient Header ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#4f46e5] via-[#6d28d9] to-[#7c3aed] px-5 pb-24 pt-6">
        {/* decorative blobs */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -left-8 bottom-4 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

        <div className="relative flex items-center justify-center gap-3">
          <BrandLogo size={32} imageClassName="rounded-lg shadow-md shadow-black/10" />
          <h1 className="text-lg font-bold tracking-wide text-white">
            My Profile
          </h1>
        </div>

        {/* Profile Row */}
        <div className="relative mt-6 flex items-center gap-4">
          <div className="relative">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 to-amber-100 text-3xl shadow-lg ring-[3px] ring-white/40">
              🧔
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 ring-2 ring-[#6d28d9]">
              <HiOutlineShieldCheck className="h-3 w-3 text-white" />
            </span>
          </div>
          <div>
            <p className="text-xl font-bold text-white tracking-tight">{phone}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-white/70">
              UID: {uid}
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(uid)}
                className="rounded-md bg-white/15 p-1 transition hover:bg-white/25"
                aria-label="Copy UID"
              >
                <IoCopyOutline className="h-3 w-3 text-white/80" />
              </button>
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-white/70">
              Ref: {referralCode}
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(referralCode)}
                className="rounded-md bg-white/15 p-1 transition hover:bg-white/25"
                aria-label="Copy referral code"
              >
                <IoCopyOutline className="h-3 w-3 text-white/80" />
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* ── Earn Card (floating) ── */}
      <div className="relative z-10 -mt-14 px-4">
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_-12px_rgba(79,70,229,0.3)]">
          <div className="grid grid-cols-2 divide-x divide-zinc-100">
            <div className="px-4 py-5 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Today&apos;s Earn
              </p>
              <p className="mt-1 text-2xl font-extrabold text-slate-900">
                ₹{todayEarn.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="px-4 py-5 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                All Time Earning
              </p>
              <p className="mt-1 text-2xl font-extrabold text-indigo-600">
                ₹{allTimeEarn.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          {/* subtle bottom accent bar */}
          <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
        </div>
      </div>

      {/* ── Scrollable Content ── */}
      <div className="overflow-y-auto pb-24">
        {/* Quick Actions */}
        <div className="mt-6 px-4">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-zinc-400">
            Quick Actions
          </h2>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: "Balance", icon: <BsCurrencyRupee className="h-5 w-5" />, bg: "bg-indigo-50 text-indigo-600", href: "/balance-record" },
              { label: "Buy Order", icon: <GiPayMoney className="h-5 w-5" />, bg: "bg-amber-50 text-amber-600", href: "/purchase-records" },
              { label: "Sell Order", icon: <GiReceiveMoney className="h-5 w-5" />, bg: "bg-emerald-50 text-emerald-600", href: "/sale-records" },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => { if (item.href) router.push(item.href); }}
                className="group flex flex-col items-center gap-1.5"
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.bg} transition group-hover:scale-105 group-hover:shadow-md`}>
                  {item.icon}
                </div>
                <span className="text-[11px] font-medium leading-tight text-zinc-600">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Menu List */}
        <div className="mt-6 px-4">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-400">
            Settings
          </h2>
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            {[
              { label: "Service", icon: <RiCustomerService2Fill className="h-5 w-5" />, color: "text-violet-500", bgIcon: "bg-violet-50", action: () => setShowService(true) },
            ].map((item, i, arr) => (
              <button
                key={item.label}
                type="button"
                onClick={item.action}
                className={`flex w-full items-center justify-between px-4 py-3.5 transition hover:bg-zinc-50 ${
                  i < arr.length - 1 ? "border-b border-zinc-50" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.bgIcon} ${item.color}`}>
                    {item.icon}
                  </span>
                  <span className="text-sm font-semibold text-slate-800">
                    {item.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FiChevronRight className="h-4 w-4 text-zinc-300" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Logout */}
        <div className="mt-4 px-4">
          <button
            type="button"
            onClick={() => { clearUserSession(); router.push("/"); }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 py-3.5 text-sm font-semibold text-red-600 transition hover:bg-red-100"
          >
            <BiLogOut className="h-5 w-5" />
            Logout
          </button>
        </div>

        {/* Version */}
        <p className="mt-4 text-center text-[10px] text-zinc-300">
          GmtPay v1.0.0
        </p>
      </div>

      {/* ── Service Popup ── */}
      {showService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowService(false)}
          />
          {/* Modal */}
          <div className="relative mx-4 w-full max-w-sm animate-[slideUp_0.3s_ease] rounded-2xl bg-white p-6 shadow-2xl">
            {/* Close */}
            <button
              type="button"
              onClick={() => setShowService(false)}
              className="absolute right-4 top-4 rounded-full p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
            >
              <IoClose className="h-5 w-5" />
            </button>

            <h2 className="mb-5 text-center text-lg font-bold text-slate-900">
              Service
            </h2>

            {/* Customer Service */}
            <div className="flex items-center justify-between rounded-xl px-1 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#2AABEE] to-[#229ED9] shadow-md">
                  <FaTelegramPlane className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Customer service</p>
                  <p className="text-xs text-emerald-500 font-medium">Online</p>
                </div>
              </div>
              <a
                href="https://t.me/gmtpay_support"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-gradient-to-r from-[#2AABEE] to-[#229ED9] px-5 py-2 text-sm font-bold text-white shadow-md transition hover:shadow-lg hover:brightness-110"
              >
                Connect
              </a>
            </div>

            <div className="my-1 border-t border-zinc-100" />

            {/* Official Channel */}
            <div className="flex items-center justify-between rounded-xl px-1 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#2AABEE] to-[#229ED9] shadow-md">
                  <FaTelegramPlane className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">GMTPAY Official</p>
                  <p className="text-xs text-zinc-400 font-medium">Channel</p>
                </div>
              </div>
              <a
                href="https://t.me/+Ayj_YlsuXhFjNGE1"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-gradient-to-r from-[#2AABEE] to-[#229ED9] px-5 py-2 text-sm font-bold text-white shadow-md transition hover:shadow-lg hover:brightness-110"
              >
                Join
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom Nav ── */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 z-20 flex w-full max-w-[540px] items-end justify-around border-t border-zinc-200 bg-white px-2 pb-2 pt-1.5">
        {[
          { label: "Home", icon: <AiFillHome className="h-5 w-5" />, active: false, href: "/dashboard" },
          { label: "Orders", icon: <RiReceiptFill className="h-5 w-5" />, active: false, href: "/orders" },
          { label: "Team", icon: <RiTeamFill className="h-5 w-5" />, active: false, href: "/team" },
          { label: "Ranking", icon: <MdLeaderboard className="h-5 w-5" />, active: false, href: "/ranking" },
          { label: "My", icon: <IoPerson className="h-5 w-5" />, active: true, href: "/my" },
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
