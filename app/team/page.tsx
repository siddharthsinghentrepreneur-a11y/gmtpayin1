"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AiFillHome } from "react-icons/ai";
import { RiReceiptFill, RiTeamFill } from "react-icons/ri";
import { MdLeaderboard } from "react-icons/md";
import { IoPerson, IoCopyOutline } from "react-icons/io5";
import { FaTelegramPlane, FaWhatsapp, FaFacebookF, FaInstagram } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { getCurrentUserId } from "@/lib/client-auth";
import { HiUsers } from "react-icons/hi2";

interface TeamMember {
  id: string;
  uid: string;
  phoneLast4: string;
  commission: number;
  joinedAt: string;
  isToday: boolean;
}

export default function TeamPage() {
  const [balance, setBalance] = useState(0);
  const [referralCode, setReferralCode] = useState("");
  const [teamData, setTeamData] = useState({
    teamCount: 0,
    todayMembers: 0,
    totalCommission: 0,
    todayCommission: 0,
    commissionRate: 0.5,
  });
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [memberFilter, setMemberFilter] = useState<"all" | "today">("all");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId) return;
    fetch(`/api/users/${userId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.user?.balance !== undefined) setBalance(data.user.balance);
        if (data.user?.referralCode) setReferralCode(data.user.referralCode);
      })
      .catch(() => {});
    fetch(`/api/team?userId=${userId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          setTeamData(data);
          if (data.members) setMembers(data.members);
        }
      })
      .catch(() => {});
  }, []);

  const inviteLink = referralCode
    ? `https://gmtpayin.com/register?ref=${referralCode}`
    : "";

  const copyLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <div className="min-h-screen bg-[#f5f5fa] text-zinc-900">
      {/* ── Gradient Header ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#4f46e5] via-[#6d28d9] to-[#7c3aed] px-5 pb-16 pt-5">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <h1 className="relative text-center text-lg font-bold text-white">
          My Team
        </h1>
      </div>

      {/* ── Team Rewards CTA (floating) ── */}
      <div className="relative z-10 -mt-6 flex justify-end px-4">
        <button
          type="button"
          className="rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-orange-300/40 transition hover:scale-105 hover:shadow-xl"
        >
          View team rewards &gt;
        </button>
      </div>

      {/* ── Scrollable content ── */}
      <div className="overflow-y-auto px-4 pb-24 pt-3 space-y-4">
        {/* ── Balance Card ── */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_-12px_rgba(79,70,229,0.3)]">
          <div className="px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
              My Balance
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xl">🪙</span>
              <span className="text-3xl font-extrabold text-slate-900">{fmt(balance)}</span>
            </div>
          </div>
          <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
        </div>

        {/* ── Today's Team Data ── */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
            Today&#39;s Team Data
          </h2>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {[
              { label: "Team Commissions", value: `₹ ${fmt(teamData.todayCommission)}` },
              { label: "New Members", value: String(teamData.todayMembers) },
            ].map((item) => (
              <div
                key={item.label}
                className="group rounded-2xl bg-white px-3.5 py-3.5 shadow-sm transition hover:shadow-md"
              >
                <p className="text-[11px] text-zinc-400">{item.label}</p>
                <p className="mt-1 text-xl font-bold text-indigo-600">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Total Team Data ── */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
            Total Team Data
          </h2>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {[
              { label: "Team Commissions", value: `₹ ${fmt(teamData.totalCommission)}` },
              { label: "Team Members", value: String(teamData.teamCount) },
            ].map((item) => (
              <div
                key={item.label}
                className="group flex items-center justify-between rounded-2xl bg-white px-3.5 py-3.5 shadow-sm transition hover:shadow-md"
              >
                <div>
                  <p className="text-[11px] text-zinc-400">{item.label}</p>
                  <p className="mt-1 text-xl font-bold text-indigo-600">
                    {item.value}
                  </p>
                </div>
                <span className="text-zinc-300 transition group-hover:text-indigo-400">
                  &gt;
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Info Box ── */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
          <div className="px-4 py-4">
            <p className="text-sm font-semibold text-slate-800">
              You will receive{" "}
              <span className="font-bold text-indigo-600">0.5%</span> for each
              purchase transaction of the team.
            </p>
            <div className="mt-2 space-y-0.5 text-xs leading-relaxed text-zinc-500">
              <p>For example: You invited 50 friends to join GMT Pay.</p>
              <p>
                If each friend buys ₹100,000 daily, you will earn commissions:
              </p>
              <p className="font-semibold text-indigo-600">
                50 * 100,000 * 0.5% = ₹25000 daily
              </p>
            </div>
          </div>
        </div>

        {/* ── Invitation Link ── */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
            Invitation Link
          </h2>
          <div className="mt-2 flex items-center justify-between overflow-hidden rounded-2xl bg-white px-4 py-3.5 shadow-sm">
            <p className="truncate text-sm text-zinc-500">
              {inviteLink || "Loading..."}
            </p>
            <button
              type="button"
              onClick={copyLink}
              className="ml-2 flex-shrink-0 rounded-xl bg-indigo-50 p-2 text-indigo-500 transition hover:bg-indigo-100 hover:text-indigo-700"
              aria-label="Copy link"
            >
              {copied ? (
                <span className="text-xs font-bold text-green-600">Copied!</span>
              ) : (
                <IoCopyOutline className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* ── More Ways to Invite ── */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
            More Ways to Invite
          </h2>
          <div className="mt-3 flex justify-between px-2">
            {[
              { label: "Telegram", icon: <FaTelegramPlane className="h-5 w-5" />, bg: "bg-[#2AABEE]" },
              { label: "Whatsapp", icon: <FaWhatsapp className="h-5 w-5" />, bg: "bg-[#25D366]" },
              { label: "Facebook", icon: <FaFacebookF className="h-5 w-5" />, bg: "bg-[#1877F2]" },
              { label: "Twitter", icon: <FaXTwitter className="h-5 w-5" />, bg: "bg-black" },
              { label: "Instagram", icon: <FaInstagram className="h-5 w-5" />, bg: "bg-gradient-to-br from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]" },
            ].map((item) => (
              <div
                key={item.label}
                className="group flex flex-col items-center gap-1.5"
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-md transition group-hover:scale-110 group-hover:shadow-lg ${item.bg}`}
                >
                  {item.icon}
                </div>
                <span className="text-[10px] font-medium text-zinc-500">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Team Members List ── */}
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              Team Members
            </h2>
            <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setMemberFilter("all")}
                className={`rounded-md px-3 py-1 text-[11px] font-bold transition ${
                  memberFilter === "all" ? "bg-indigo-600 text-white" : "text-zinc-500 hover:bg-zinc-50"
                }`}
              >
                All ({teamData.teamCount})
              </button>
              <button
                type="button"
                onClick={() => setMemberFilter("today")}
                className={`rounded-md px-3 py-1 text-[11px] font-bold transition ${
                  memberFilter === "today" ? "bg-indigo-600 text-white" : "text-zinc-500 hover:bg-zinc-50"
                }`}
              >
                Today ({teamData.todayMembers})
              </button>
            </div>
          </div>
          <div className="mt-2 space-y-2">
            {(memberFilter === "today" ? members.filter((m) => m.isToday) : members).length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl bg-white py-8 shadow-sm">
                <HiUsers className="h-8 w-8 text-zinc-300" />
                <p className="text-sm text-zinc-400">
                  {memberFilter === "today" ? "No new members today" : "No team members yet"}
                </p>
              </div>
            ) : (
              (memberFilter === "today" ? members.filter((m) => m.isToday) : members).map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-bold text-white shadow">
                      {m.phoneLast4}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">****{m.phoneLast4}</p>
                      <p className="text-[10px] text-indigo-500 font-bold">UID: {m.uid}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-600">₹{m.commission.toFixed(2)}</p>
                    <p className="text-[10px] text-zinc-400">
                      {new Date(m.joinedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom Nav ── */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 z-20 flex w-full max-w-[540px] items-end justify-around border-t border-zinc-200 bg-white px-2 pb-2 pt-1.5">
        {[
          { label: "Home", icon: <AiFillHome className="h-5 w-5" />, active: false, href: "/dashboard" },
          { label: "Orders", icon: <RiReceiptFill className="h-5 w-5" />, active: false, href: "/orders" },
          { label: "Team", icon: <RiTeamFill className="h-5 w-5" />, active: true, href: "/team" },
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
