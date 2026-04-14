"use client";

import { useEffect, useState } from "react";
import {
  MdSearch,
  MdMoreVert,
  MdBlock,
  MdCheckCircle,
  MdClose,
  MdCancel,
  MdVisibility,
  MdEdit,
  MdSave,
  MdReceipt,
  MdPeople,
  MdWarning,
  MdContentCopy,
  MdAccessTime,
  MdCurrencyRupee,
  MdArrowUpward,
  MdArrowDownward,
  MdStar,
  MdStarBorder,
} from "react-icons/md";

/* ─── Types ─── */
interface UserOrder {
  id: string;
  orderNo: string;
  type: "Buy" | "Sell";
  amount: number;
  status: "Paying" | "Checking" | "Success" | "Failed" | "Completed" | "Pending" | "Processing";
  time: string;
}

interface User {
  id: string;
  uid: string;
  phone: string;
  balance: number;
  totalDeposit: number;
  totalWithdraw: number;
  status: "Active" | "Blocked";
  orders: number;
  successRate: number;
  joined: string;
  lastActive: string;
  upiCount: number;
  riskLevel: "Low" | "Medium" | "High";
  featuredSeller: boolean;
  recentOrders: UserOrder[];
}

const FILTERS = ["All", "Active", "Blocked", "Featured"] as const;
const RISK_FILTERS = ["All Risk", "Low", "Medium", "High"] as const;

const ORDER_STATUS_STYLES: Record<string, { bg: string; dot: string }> = {
  Paying: { bg: "bg-amber-50 text-amber-700", dot: "bg-amber-400" },
  Checking: { bg: "bg-sky-50 text-sky-700", dot: "bg-sky-400" },
  Success: { bg: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-400" },
  Failed: { bg: "bg-red-50 text-red-600", dot: "bg-red-400" },
  Completed: { bg: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-400" },
  Pending: { bg: "bg-amber-50 text-amber-700", dot: "bg-amber-400" },
  Processing: { bg: "bg-sky-50 text-sky-700", dot: "bg-sky-400" },
};

const RISK_STYLES: Record<string, string> = {
  Low: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  High: "bg-red-50 text-red-600 border-red-200",
};

/* ─── Component ─── */
export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [riskFilter, setRiskFilter] = useState<(typeof RISK_FILTERS)[number]>("All Risk");
  const [sortBy, setSortBy] = useState<"balance" | "orders" | "joined">("orders");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingBalance, setEditingBalance] = useState(false);
  const [newBalance, setNewBalance] = useState("");
  const [confirmAction, setConfirmAction] = useState<{ orderId: string; action: "approve" | "reject" } | null>(null);
  const [copiedUid, setCopiedUid] = useState<string | null>(null);
  const [togglingFeatured, setTogglingFeatured] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((res) => res.json())
      .then((data) => {
        if (data.users) setUsers(data.users);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = users
    .filter((u) => {
      const matchesSearch = u.uid.includes(search) || u.phone.includes(search);
      const matchesFilter = filter === "All" || filter === "Featured" ? (filter === "Featured" ? u.featuredSeller : true) : u.status === filter;
      const matchesRisk = riskFilter === "All Risk" || u.riskLevel === riskFilter;
      return matchesSearch && matchesFilter && matchesRisk;
    })
    .sort((a, b) => {
      if (sortBy === "balance") return b.balance - a.balance;
      if (sortBy === "orders") return b.orders - a.orders;
      return 0;
    });

  const activeCount = users.filter((u) => u.status === "Active").length;
  const blockedCount = users.filter((u) => u.status === "Blocked").length;
  const featuredCount = users.filter((u) => u.featuredSeller).length;
  const highRiskCount = users.filter((u) => u.riskLevel === "High").length;
  const totalBalance = users.reduce((s, u) => s + u.balance, 0);

  function copyUid(uid: string) {
    navigator.clipboard.writeText(uid);
    setCopiedUid(uid);
    setTimeout(() => setCopiedUid(null), 1500);
  }

  function toggleUserStatus(uid: string) {
    setUsers((prev) =>
      prev.map((u) =>
        u.uid === uid
          ? { ...u, status: u.status === "Active" ? "Blocked" as const : "Active" as const }
          : u
      )
    );
    setOpenMenu(null);
  }

  async function toggleFeaturedSeller(userId: string, current: boolean) {
    setTogglingFeatured(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, featuredSeller: !current }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, featuredSeller: !current } : u))
        );
        if (selectedUser?.id === userId) {
          setSelectedUser({ ...selectedUser, featuredSeller: !current });
        }
      }
    } catch { /* ignore */ }
    setTogglingFeatured(null);
  }

  function openUserDetail(user: User) {
    setSelectedUser(user);
    setNewBalance(user.balance.toString());
    setEditingBalance(false);
    setOpenMenu(null);
  }

  function saveBalance() {
    if (!selectedUser) return;
    const val = parseFloat(newBalance);
    if (isNaN(val)) return;
    setUsers((prev) =>
      prev.map((u) => (u.uid === selectedUser.uid ? { ...u, balance: val } : u))
    );
    setSelectedUser({ ...selectedUser, balance: val });
    setEditingBalance(false);
  }

  function handleOrderAction(orderId: string, action: "approve" | "reject") {
    setConfirmAction({ orderId, action });
  }

  function executeOrderAction() {
    if (!confirmAction || !selectedUser) return;
    const { orderId, action } = confirmAction;
    const newStatus = action === "approve"
      ? (selectedUser.recentOrders.find((o) => o.id === orderId)?.type === "Buy" ? "Success" : "Completed")
      : "Failed";

    const updatedOrders = selectedUser.recentOrders.map((o) =>
      o.id === orderId ? { ...o, status: newStatus as UserOrder["status"] } : o
    );

    setUsers((prev) =>
      prev.map((u) =>
        u.uid === selectedUser.uid ? { ...u, recentOrders: updatedOrders } : u
      )
    );
    setSelectedUser({ ...selectedUser, recentOrders: updatedOrders });
    setConfirmAction(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="mt-1 text-sm text-slate-500">
            Monitor and manage all registered users
          </p>
        </div>
        {highRiskCount > 0 && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-2 shadow-sm">
            <MdWarning className="h-4 w-4 text-red-500" />
            <span className="text-xs font-bold text-red-700">{highRiskCount} High Risk</span>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100">
              <MdPeople className="h-4 w-4 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Total Users</p>
              <p className="text-lg font-extrabold text-slate-900">{users.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
              <MdCheckCircle className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Active</p>
              <p className="text-lg font-extrabold text-emerald-700">{activeCount}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100">
              <MdBlock className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Blocked</p>
              <p className="text-lg font-extrabold text-red-600">{blockedCount}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
              <MdCurrencyRupee className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Total Balance</p>
              <p className="text-lg font-extrabold text-slate-900">₹{totalBalance.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 p-4 shadow-sm cursor-pointer hover:bg-amber-50 transition" onClick={() => setFilter("Featured")}>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
              <MdStar className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Featured Sellers</p>
              <p className="text-lg font-extrabold text-amber-700">{featuredCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <MdSearch className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by UID or phone..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                filter === f
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {f} {f === "All" ? `(${users.length})` : f === "Active" ? `(${activeCount})` : f === "Blocked" ? `(${blockedCount})` : `(${featuredCount})`}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1">
          {RISK_FILTERS.map((r) => (
            <button
              key={r}
              onClick={() => setRiskFilter(r)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                riskFilter === r
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 outline-none focus:border-indigo-400"
        >
          <option value="orders">Sort: Orders ↓</option>
          <option value="balance">Sort: Balance ↓</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                {["User", "Balance", "Deposit / Withdraw", "Orders", "Success %", "Risk", "Last Active", ""].map((h) => (
                  <th key={h} className={`px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 ${h === "" ? "text-right" : "text-left"}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-slate-400">
                    No users found
                  </td>
                </tr>
              ) : (
                filtered.map((user) => {
                  const pendingCount = user.recentOrders.filter((o) =>
                    ["Paying", "Checking", "Pending", "Processing"].includes(o.status)
                  ).length;

                  return (
                    <tr key={user.id} className="transition hover:bg-slate-50/60 cursor-pointer" onClick={() => openUserDetail(user)}>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-bold text-white shadow">
                            {user.phone.slice(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-slate-800">{user.phone}</p>
                              {user.featuredSeller && (
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 text-amber-600 px-1.5 py-0.5 text-[9px] font-bold">
                                  <MdStar className="h-2.5 w-2.5" /> Featured
                                </span>
                              )}
                              <span
                                className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                                  user.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                                }`}
                              >
                                {user.status === "Active" ? <MdCheckCircle className="h-2.5 w-2.5" /> : <MdBlock className="h-2.5 w-2.5" />}
                                {user.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-bold text-indigo-500">UID: {user.uid}</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); copyUid(user.uid); }}
                                className="text-slate-300 hover:text-slate-500 transition"
                              >
                                {copiedUid === user.uid ? <MdCheckCircle className="h-3 w-3 text-emerald-500" /> : <MdContentCopy className="h-3 w-3" />}
                              </button>
                              {pendingCount > 0 && (
                                <span className="flex items-center gap-0.5 text-[9px] font-bold text-amber-600">
                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                                  {pendingCount} pending
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <p className="font-bold text-slate-900">₹{user.balance.toLocaleString()}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-0.5 text-xs text-emerald-600">
                            <MdArrowDownward className="h-3 w-3" /> ₹{user.totalDeposit.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-0.5 text-xs text-red-500">
                            <MdArrowUpward className="h-3 w-3" /> ₹{user.totalWithdraw.toLocaleString()}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 font-semibold text-slate-700">
                        {user.orders}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                user.successRate >= 90 ? "bg-emerald-500" : user.successRate >= 70 ? "bg-amber-500" : "bg-red-500"
                              }`}
                              style={{ width: `${user.successRate}%` }}
                            />
                          </div>
                          <span className={`text-xs font-bold ${
                            user.successRate >= 90 ? "text-emerald-600" : user.successRate >= 70 ? "text-amber-600" : "text-red-600"
                          }`}>{user.successRate}%</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${RISK_STYLES[user.riskLevel]}`}>
                          {user.riskLevel}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-[11px] text-slate-400">
                        {user.lastActive}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="relative">
                          <button
                            onClick={() => setOpenMenu(openMenu === user.uid ? null : user.uid)}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                          >
                            <MdMoreVert className="h-5 w-5" />
                          </button>
                          {openMenu === user.uid && (
                            <div className="absolute right-0 top-full z-10 mt-1 w-44 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
                              <button
                                onClick={() => openUserDetail(user)}
                                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                              >
                                <MdVisibility className="h-4 w-4" /> View Details
                              </button>
                              <button
                                onClick={() => {
                                  openUserDetail(user);
                                  setTimeout(() => setEditingBalance(true), 100);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                              >
                                <MdEdit className="h-4 w-4" /> Edit Balance
                              </button>
                              <button
                                onClick={() => { toggleFeaturedSeller(user.id, user.featuredSeller); setOpenMenu(null); }}
                                className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-medium hover:bg-slate-50 transition ${
                                  user.featuredSeller ? "text-amber-600" : "text-slate-700"
                                }`}
                              >
                                {user.featuredSeller ? <><MdStar className="h-4 w-4" /> Remove Featured</> : <><MdStarBorder className="h-4 w-4" /> Make Featured</>}
                              </button>
                              <button
                                onClick={() => toggleUserStatus(user.uid)}
                                className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-medium hover:bg-slate-50 transition ${
                                  user.status === "Active" ? "text-red-600" : "text-emerald-600"
                                }`}
                              >
                                {user.status === "Active" ? <><MdBlock className="h-4 w-4" /> Block User</> : <><MdCheckCircle className="h-4 w-4" /> Unblock</>}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
          <span className="text-xs text-slate-500">
            Showing <span className="font-bold text-slate-800">{filtered.length}</span> of{" "}
            <span className="font-bold text-slate-800">{users.length}</span> users
          </span>
        </div>
      </div>

      {/* ─── User Detail Drawer ─── */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedUser(null)} />
          <div className="relative w-full max-w-xl animate-[slideInRight_0.3s_ease] overflow-y-auto bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-bold text-white">
                  {selectedUser.phone.slice(0, 2)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{selectedUser.phone}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">UID: {selectedUser.uid}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${RISK_STYLES[selectedUser.riskLevel]}`}>
                      {selectedUser.riskLevel} Risk
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <MdClose className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                  selectedUser.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                }`}>
                  {selectedUser.status === "Active" ? <MdCheckCircle className="h-3.5 w-3.5" /> : <MdBlock className="h-3.5 w-3.5" />}
                  {selectedUser.status}
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <MdAccessTime className="h-3.5 w-3.5" /> Joined {selectedUser.joined}
                </span>
                <span className="text-xs text-slate-400">Last seen: {selectedUser.lastActive}</span>
              </div>

              <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-indigo-50/30 p-5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Financial Overview</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-white p-3 border border-slate-100">
                    <p className="text-[10px] text-slate-400">Balance</p>
                    {editingBalance ? (
                      <div className="mt-1 flex items-center gap-1">
                        <input
                          type="number"
                          value={newBalance}
                          onChange={(e) => setNewBalance(e.target.value)}
                          className="w-full rounded-lg border border-indigo-300 bg-white px-2 py-1 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-200"
                        />
                        <button onClick={saveBalance} className="rounded-lg bg-indigo-600 p-1.5 text-white hover:bg-indigo-700 transition">
                          <MdSave className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <p
                        className="mt-1 text-xl font-extrabold text-slate-900 cursor-pointer hover:text-indigo-600 transition"
                        onClick={() => setEditingBalance(true)}
                      >
                        ₹{selectedUser.balance.toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="rounded-lg bg-white p-3 border border-slate-100">
                    <p className="text-[10px] text-slate-400">Success Rate</p>
                    <div className="mt-1 flex items-center gap-2">
                      <p className={`text-xl font-extrabold ${
                        selectedUser.successRate >= 90 ? "text-emerald-600" : selectedUser.successRate >= 70 ? "text-amber-600" : "text-red-600"
                      }`}>{selectedUser.successRate}%</p>
                      <div className="flex-1 h-2 rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${
                            selectedUser.successRate >= 90 ? "bg-emerald-500" : selectedUser.successRate >= 70 ? "bg-amber-500" : "bg-red-500"
                          }`}
                          style={{ width: `${selectedUser.successRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg bg-white p-3 border border-slate-100">
                    <p className="text-[10px] text-slate-400">Total Deposit</p>
                    <p className="mt-1 text-lg font-extrabold text-emerald-600">₹{selectedUser.totalDeposit.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg bg-white p-3 border border-slate-100">
                    <p className="text-[10px] text-slate-400">Total Withdraw</p>
                    <p className="mt-1 text-lg font-extrabold text-red-500">₹{selectedUser.totalWithdraw.toLocaleString()}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-white p-3 border border-slate-100 text-center">
                    <p className="text-[10px] text-slate-400">Orders</p>
                    <p className="text-lg font-extrabold text-slate-900">{selectedUser.orders}</p>
                  </div>
                  <div className="rounded-lg bg-white p-3 border border-slate-100 text-center">
                    <p className="text-[10px] text-slate-400">UPI Count</p>
                    <p className="text-lg font-extrabold text-slate-900">{selectedUser.upiCount}</p>
                  </div>
                  <div className="rounded-lg bg-white p-3 border border-slate-100 text-center">
                    <p className="text-[10px] text-slate-400">Risk Level</p>
                    <p className={`text-lg font-extrabold ${
                      selectedUser.riskLevel === "Low" ? "text-emerald-600" : selectedUser.riskLevel === "Medium" ? "text-amber-600" : "text-red-600"
                    }`}>{selectedUser.riskLevel}</p>
                  </div>
                </div>
              </div>

              {/* Recent Orders */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MdReceipt className="h-4 w-4 text-slate-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Recent Orders</h4>
                  </div>
                  {selectedUser.recentOrders.filter((o) => ["Paying","Checking","Pending","Processing"].includes(o.status)).length > 0 && (
                    <span className="flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                      {selectedUser.recentOrders.filter((o) => ["Paying","Checking","Pending","Processing"].includes(o.status)).length} pending
                    </span>
                  )}
                </div>

                {selectedUser.recentOrders.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">
                    No orders found
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedUser.recentOrders.map((order) => {
                      const st = ORDER_STATUS_STYLES[order.status] || { bg: "bg-slate-100 text-slate-600", dot: "bg-slate-400" };
                      const isPending = ["Paying", "Checking", "Pending", "Processing"].includes(order.status);

                      return (
                        <div
                          key={order.id}
                          className={`rounded-xl border p-3.5 transition ${
                            isPending ? "border-amber-200 bg-amber-50/30" : "border-slate-100 bg-white"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                                order.type === "Buy" ? "bg-indigo-100 text-indigo-600" : "bg-orange-100 text-orange-600"
                              }`}>
                                {order.type === "Buy" ? "↓" : "↑"}
                              </span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold text-slate-900">₹{order.amount.toLocaleString()}</p>
                                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${st.bg}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                                    {order.status}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{order.orderNo.slice(0, 20)}…</p>
                              </div>
                            </div>
                            <span className="text-[10px] text-slate-400">{order.time}</span>
                          </div>

                          {isPending && (
                            <div className="mt-2.5 flex items-center gap-1.5 justify-end">
                              <button
                                onClick={() => handleOrderAction(order.id, "approve")}
                                className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-emerald-700 shadow-sm"
                              >
                                <MdCheckCircle className="h-3.5 w-3.5" /> Approve
                              </button>
                              <button
                                onClick={() => handleOrderAction(order.id, "reject")}
                                className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-bold text-red-600 transition hover:bg-red-100"
                              >
                                <MdCancel className="h-3.5 w-3.5" /> Reject
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div>
                <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Quick Actions</h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => toggleFeaturedSeller(selectedUser.id, selectedUser.featuredSeller)}
                    disabled={togglingFeatured === selectedUser.id}
                    className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition ${
                      selectedUser.featuredSeller
                        ? "border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    } ${togglingFeatured === selectedUser.id ? "opacity-50" : ""}`}
                  >
                    {selectedUser.featuredSeller ? <><MdStar className="h-4 w-4" /> Featured Seller</> : <><MdStarBorder className="h-4 w-4" /> Make Featured</>}
                  </button>
                  <button
                    onClick={() => {
                      toggleUserStatus(selectedUser.uid);
                      setSelectedUser({
                        ...selectedUser,
                        status: selectedUser.status === "Active" ? "Blocked" : "Active",
                      });
                    }}
                    className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition ${
                      selectedUser.status === "Active"
                        ? "border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                        : "border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                    }`}
                  >
                    {selectedUser.status === "Active" ? <><MdBlock className="h-4 w-4" /> Block User</> : <><MdCheckCircle className="h-4 w-4" /> Unblock</>}
                  </button>
                  <button
                    onClick={() => setEditingBalance(true)}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                  >
                    <MdEdit className="h-4 w-4" /> Edit Balance
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Order Action Confirmation ─── */}
      {confirmAction && selectedUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmAction(null)} />
          <div className="relative w-full max-w-sm animate-[slideUp_0.2s_ease] rounded-2xl bg-white p-6 shadow-2xl">
            <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
              confirmAction.action === "approve" ? "bg-emerald-100" : "bg-red-100"
            }`}>
              {confirmAction.action === "approve" ? (
                <MdCheckCircle className="h-8 w-8 text-emerald-600" />
              ) : (
                <MdCancel className="h-8 w-8 text-red-500" />
              )}
            </div>
            <h3 className="text-center text-lg font-bold text-slate-900">
              {confirmAction.action === "approve" ? "Approve Order?" : "Reject Order?"}
            </h3>
            <p className="mt-2 text-center text-sm text-slate-500">
              {confirmAction.action === "approve"
                ? "This will mark the order as successful."
                : "This will reject the order and mark as failed."}
            </p>
            {(() => {
              const order = selectedUser.recentOrders.find((o) => o.id === confirmAction.orderId);
              return order ? (
                <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100 p-3 text-center">
                  <p className="text-xs text-slate-400">{order.type} Order</p>
                  <p className="text-2xl font-extrabold text-slate-900">₹{order.amount.toLocaleString()}</p>
                </div>
              ) : null;
            })()}
            <div className="mt-5 flex items-center gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={executeOrderAction}
                className={`flex-1 rounded-xl py-2.5 text-sm font-bold text-white shadow-lg transition ${
                  confirmAction.action === "approve"
                    ? "bg-emerald-600 shadow-emerald-600/25 hover:bg-emerald-700"
                    : "bg-red-500 shadow-red-500/25 hover:bg-red-600"
                }`}
              >
                {confirmAction.action === "approve" ? "Yes, Approve" : "Yes, Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
