"use client";

import { BrandLogo } from "@/components/brand-logo";
import {
  clearAdminSession,
  clearUserSession,
  getAdminSession,
  getUserSession,
  isAdminPhone,
  saveAdminSession,
} from "@/lib/client-auth";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  MdDashboard,
  MdPeople,
  MdReceipt,
  MdSettings,
  MdImage,
  MdMenu,
  MdClose,
  MdLogout,
  MdAccountBalance,
  MdNotifications,
  MdKeyboardArrowRight,
} from "react-icons/md";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin/dashboard", icon: MdDashboard, badge: 0 },
  { label: "Users", href: "/admin/users", icon: MdPeople, badge: 0 },
  { label: "Buy Orders", href: "/admin/buy-orders", icon: MdReceipt, badge: 3 },
  { label: "Bank Accounts", href: "/admin/upi-accounts", icon: MdAccountBalance, badge: 0 },
  { label: "Banners", href: "/admin/banners", icon: MdImage, badge: 0 },
  { label: "Settings", href: "/admin/settings", icon: MdSettings, badge: 0 },
];

const BREADCRUMB_LABELS: Record<string, string> = {
  "/admin/dashboard": "Dashboard",
  "/admin/users": "Users",
  "/admin/buy-orders": "Buy Orders",
  "/admin/upi-accounts": "Bank Accounts",
  "/admin/banners": "Banners",
  "/admin/settings": "Settings",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdminLoginPage = pathname === "/admin";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  if (!mounted && typeof window !== "undefined") {
    setMounted(true);
  }

  const userSession = mounted ? getUserSession() : null;
  const adminSession = mounted ? getAdminSession() : null;

  const derivedAdminSession = useMemo(
    () =>
      !adminSession && userSession && isAdminPhone(userSession.phone)
        ? {
            id: userSession.id,
            email: null,
            phone: userSession.phone,
            name: userSession.name || "Admin",
            role: "ADMIN",
          }
        : adminSession,
    [adminSession, userSession],
  );
  const adminName = derivedAdminSession?.name || "Admin";
  const adminEmail = derivedAdminSession?.email || null;
  const isAuthorized = isAdminLoginPage || Boolean(derivedAdminSession && isAdminPhone(derivedAdminSession.phone));

  useEffect(() => {
    if (derivedAdminSession && !adminSession) {
      saveAdminSession(derivedAdminSession);
    }

    if (isAdminLoginPage) {
      return;
    }

    if (mounted && (!derivedAdminSession || !isAdminPhone(derivedAdminSession.phone))) {
      clearAdminSession();
      router.replace("/");
    }
  }, [adminSession, derivedAdminSession, isAdminLoginPage, mounted, router]);

  if (isAdminLoginPage) {
    return <>{children}</>;
  }

  if (!isAuthorized && !mounted) {
    return null;
  }

  if (!isAuthorized) {
    return null;
  }

  const currentLabel = BREADCRUMB_LABELS[pathname] || "Page";
  const totalPending = NAV_ITEMS.reduce((s, i) => s + i.badge, 0);

  return (
    <div className="flex h-screen bg-slate-100/80">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col bg-gradient-to-b from-slate-900 to-slate-950 transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-[68px] items-center justify-between px-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <BrandLogo size={40} imageClassName="rounded-xl shadow-lg shadow-slate-950/20" />
            <div>
              <span className="text-[15px] font-bold text-white tracking-tight">GMTPay</span>
              <span className="ml-1.5 rounded bg-indigo-500/20 px-1.5 py-0.5 text-[9px] font-bold text-indigo-300 uppercase tracking-wider">Admin</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white transition"
          >
            <MdClose className="h-5 w-5" />
          </button>
        </div>

        {/* System Status */}
        <div className="mx-4 mt-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2.5">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[11px] font-semibold text-emerald-400">System Online</span>
          </div>
          <p className="mt-1 text-[10px] text-emerald-400/60">Last sync: just now</p>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Navigation</p>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all ${
                  isActive
                    ? "bg-indigo-500/15 text-white shadow-sm shadow-indigo-500/10"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                  isActive ? "bg-indigo-500 text-white shadow shadow-indigo-500/30" : "bg-white/5 text-slate-400 group-hover:text-slate-300"
                }`}>
                  <item.icon className="h-[18px] w-[18px]" />
                </div>
                <span className="flex-1">{item.label}</span>
                {item.badge > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white shadow shadow-red-500/30">
                    {item.badge}
                  </span>
                )}
                {isActive && <div className="h-5 w-1 rounded-full bg-indigo-400" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="border-t border-white/5 p-3 space-y-1">
          <div className="flex items-center gap-3 rounded-xl px-3 py-2 bg-white/5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-bold text-white">
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{adminName}</p>
              <p className="text-[10px] text-slate-500 truncate">{adminEmail || "No email set"}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              clearAdminSession();
              clearUserSession();
              router.push("/");
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-slate-500 transition hover:bg-red-500/10 hover:text-red-400"
          >
            <MdLogout className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-[60px] items-center gap-3 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl px-4 lg:px-6 shadow-sm shadow-slate-100/50">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 transition"
          >
            <MdMenu className="h-6 w-6" />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm">
            <Link href="/admin/dashboard" className="text-slate-400 hover:text-slate-600 transition text-xs font-medium">
              Admin
            </Link>
            <MdKeyboardArrowRight className="h-4 w-4 text-slate-300" />
            <span className="font-semibold text-slate-800 text-xs">{currentLabel}</span>
          </div>

          <div className="flex-1" />

          {/* Notification Bell */}
          <button type="button" className="relative rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
            <MdNotifications className="h-5 w-5" />
            {totalPending > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                {totalPending}
              </span>
            )}
          </button>

          {/* Admin Avatar */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-100">
            <div className="text-right hidden sm:block">
              <p className="text-[13px] font-semibold text-slate-800">{adminName}</p>
              <p className="text-[10px] text-slate-400">Super Admin</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-bold text-white shadow shadow-indigo-500/20">
              A
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
