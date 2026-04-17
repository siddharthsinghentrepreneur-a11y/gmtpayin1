"use client";

import { useEffect, useState } from "react";
import {
  MdSave,
  MdToggleOn,
  MdToggleOff,
  MdInfo,
  MdCheckCircle,
  MdPercent,
  MdAccountBalanceWallet,
  MdTimer,
  MdSecurity,
  MdNotifications,
  MdLeaderboard,
} from "react-icons/md";

/* ─── Types ─── */
interface Settings {
  commissionRate: string;
  bonusRate: string;
  minBalance: string;
  minBuyAmount: string;
  maxBuyAmount: string;
  minSellAmount: string;
  maxSellAmount: string;
  paymentTimeout: string;
  autoSellEnabled: boolean;
  maxUpiPerUser: string;
  dailyUpiLimit: string;
  maintenanceMode: boolean;
  newRegistrations: boolean;
  usdtEnabled: boolean;
  twoFactorRequired: boolean;
  emailNotifications: boolean;
  telegramNotifications: boolean;
  autoApproveBelow: string;
}

/* ─── Component ─── */
export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    commissionRate: "3.00",
    bonusRate: "6.00",
    minBalance: "100",
    minBuyAmount: "300",
    maxBuyAmount: "50000",
    minSellAmount: "50",
    maxSellAmount: "25000",
    paymentTimeout: "30",
    autoSellEnabled: true,
    maxUpiPerUser: "10",
    dailyUpiLimit: "50000",
    maintenanceMode: false,
    newRegistrations: true,
    usdtEnabled: true,
    twoFactorRequired: false,
    emailNotifications: true,
    telegramNotifications: true,
    autoApproveBelow: "1000",
  });

  const [saved, setSaved] = useState(false);

  // ─── Dummy Ranking Toggle (persisted in DB) ───
  const [dummyRanking, setDummyRanking] = useState(false);
  const [dummyLoading, setDummyLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/settings?key=dummy_ranking_enabled")
      .then((r) => r.json())
      .then((d: { value: string | null }) => {
        setDummyRanking(d.value === "true");
      })
      .catch(() => {})
      .finally(() => setDummyLoading(false));
  }, []);

  async function toggleDummyRanking() {
    const next = !dummyRanking;
    setDummyRanking(next);
    try {
      await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "dummy_ranking_enabled", value: String(next) }),
      });
    } catch {
      setDummyRanking(!next); // revert on failure
    }
  }

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="mt-1 text-sm text-slate-500">
            Configure platform-wide settings
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-lg transition ${
            saved
              ? "bg-emerald-600 shadow-emerald-600/25"
              : "bg-indigo-600 shadow-indigo-600/25 hover:bg-indigo-700"
          }`}
        >
          {saved ? (
            <>
              <MdCheckCircle className="h-4 w-4" />
              Saved!
            </>
          ) : (
            <>
              <MdSave className="h-4 w-4" />
              Save Changes
            </>
          )}
        </button>
      </div>

      {/* ─── Commission & Fees ─── */}
      <SettingsSection
        icon={<MdPercent className="h-5 w-5" />}
        title="Commission & Fees"
        description="Set commission rates and bonus percentages"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InputField
            label="Commission Rate (%)"
            value={settings.commissionRate}
            onChange={(v) => update("commissionRate", v)}
            suffix="%"
            hint="Applied to each buy order"
          />
          <InputField
            label="Bonus Rate (₹)"
            value={settings.bonusRate}
            onChange={(v) => update("bonusRate", v)}
            suffix="₹"
            hint="Fixed bonus per buy order"
          />
          <InputField
            label="Auto-approve below (₹)"
            value={settings.autoApproveBelow}
            onChange={(v) => update("autoApproveBelow", v)}
            suffix="₹"
            hint="Orders below this auto-approve"
          />
        </div>
      </SettingsSection>

      {/* ─── Order Limits ─── */}
      <SettingsSection
        icon={<MdAccountBalanceWallet className="h-5 w-5" />}
        title="Order Limits"
        description="Configure minimum and maximum order amounts"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InputField
            label="Min Buy Amount (₹)"
            value={settings.minBuyAmount}
            onChange={(v) => update("minBuyAmount", v)}
            suffix="₹"
          />
          <InputField
            label="Max Buy Amount (₹)"
            value={settings.maxBuyAmount}
            onChange={(v) => update("maxBuyAmount", v)}
            suffix="₹"
          />
          <InputField
            label="Min Sell Amount (₹)"
            value={settings.minSellAmount}
            onChange={(v) => update("minSellAmount", v)}
            suffix="₹"
          />
          <InputField
            label="Max Sell Amount (₹)"
            value={settings.maxSellAmount}
            onChange={(v) => update("maxSellAmount", v)}
            suffix="₹"
          />
          <InputField
            label="Min Balance (₹)"
            value={settings.minBalance}
            onChange={(v) => update("minBalance", v)}
            suffix="₹"
            hint="Minimum balance to activate sell"
          />
        </div>
      </SettingsSection>

      {/* ─── UPI Configuration ─── */}
      <SettingsSection
        icon={<MdTimer className="h-5 w-5" />}
        title="UPI & Payment"
        description="Configure UPI and payment processing settings"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InputField
            label="Payment Timeout (min)"
            value={settings.paymentTimeout}
            onChange={(v) => update("paymentTimeout", v)}
            suffix="min"
            hint="Time before order expires"
          />
          <InputField
            label="Max UPI per User"
            value={settings.maxUpiPerUser}
            onChange={(v) => update("maxUpiPerUser", v)}
          />
          <InputField
            label="Daily UPI Limit (₹)"
            value={settings.dailyUpiLimit}
            onChange={(v) => update("dailyUpiLimit", v)}
            suffix="₹"
            hint="Max daily amount per UPI"
          />
        </div>
        <div className="mt-4 space-y-3">
          <ToggleRow
            label="Auto Sell"
            description="Let users enable automatic selling"
            enabled={settings.autoSellEnabled}
            onToggle={() => update("autoSellEnabled", !settings.autoSellEnabled)}
          />
          <ToggleRow
            label="USDT Trading"
            description="Enable USDT buy/sell on the platform"
            enabled={settings.usdtEnabled}
            onToggle={() => update("usdtEnabled", !settings.usdtEnabled)}
          />
        </div>
      </SettingsSection>

      {/* ─── Ranking Data ─── */}
      <SettingsSection
        icon={<MdLeaderboard className="h-5 w-5" />}
        title="Ranking Data"
        description="Control whether the ranking page shows real or dummy data"
      >
        <div className="space-y-3">
          <ToggleRow
            label="Dummy Ranking Data"
            description={dummyLoading ? "Loading..." : "Show fake leaderboard with 100 random users (auto-refreshes daily, amounts grow throughout the day)"}
            enabled={dummyRanking}
            onToggle={toggleDummyRanking}
          />
        </div>
      </SettingsSection>

      {/* ─── Security ─── */}
      <SettingsSection
        icon={<MdSecurity className="h-5 w-5" />}
        title="Security"
        description="Security and access control settings"
      >
        <div className="space-y-3">
          <ToggleRow
            label="Maintenance Mode"
            description="Temporarily disable user access to the platform"
            enabled={settings.maintenanceMode}
            onToggle={() => update("maintenanceMode", !settings.maintenanceMode)}
            danger={settings.maintenanceMode}
          />
          <ToggleRow
            label="New Registrations"
            description="Allow new user sign-ups"
            enabled={settings.newRegistrations}
            onToggle={() => update("newRegistrations", !settings.newRegistrations)}
          />
          <ToggleRow
            label="2FA Required"
            description="Require two-factor authentication for admin login"
            enabled={settings.twoFactorRequired}
            onToggle={() => update("twoFactorRequired", !settings.twoFactorRequired)}
          />
        </div>
      </SettingsSection>

      {/* ─── Notifications ─── */}
      <SettingsSection
        icon={<MdNotifications className="h-5 w-5" />}
        title="Notifications"
        description="Configure alert and notification preferences"
      >
        <div className="space-y-3">
          <ToggleRow
            label="Email Notifications"
            description="Send email alerts for important events"
            enabled={settings.emailNotifications}
            onToggle={() => update("emailNotifications", !settings.emailNotifications)}
          />
          <ToggleRow
            label="Telegram Notifications"
            description="Send alerts to Telegram bot"
            enabled={settings.telegramNotifications}
            onToggle={() => update("telegramNotifications", !settings.telegramNotifications)}
          />
        </div>
      </SettingsSection>

      {/* ─── Danger Zone ─── */}
      <div className="rounded-2xl border-2 border-dashed border-red-200 bg-red-50/50 p-6">
        <h3 className="text-lg font-bold text-red-700">Danger Zone</h3>
        <p className="mt-1 text-sm text-red-500">
          These actions are irreversible. Proceed with caution.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50"
          >
            Reset All Statistics
          </button>
          <button
            type="button"
            className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50"
          >
            Clear All Orders
          </button>
          <button
            type="button"
            className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50"
          >
            Purge Inactive Users
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */
function SettingsSection({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          {icon}
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <p className="text-xs text-slate-400">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  suffix,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
            {suffix}
          </span>
        )}
      </div>
      {hint && (
        <span className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
          <MdInfo className="h-3 w-3" />
          {hint}
        </span>
      )}
    </label>
  );
}

function ToggleRow({
  label,
  description,
  enabled,
  onToggle,
  danger,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3 transition hover:bg-slate-50">
      <div>
        <p className={`text-sm font-semibold ${danger ? "text-red-700" : "text-slate-800"}`}>
          {label}
        </p>
        <p className="text-xs text-slate-400">{description}</p>
      </div>
      <button type="button" onClick={onToggle} className="shrink-0 transition hover:scale-105">
        {enabled ? (
          <MdToggleOn className={`h-8 w-8 ${danger ? "text-red-500" : "text-emerald-500"}`} />
        ) : (
          <MdToggleOff className="h-8 w-8 text-slate-300" />
        )}
      </button>
    </div>
  );
}
