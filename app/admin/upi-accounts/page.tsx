"use client";

import { useEffect, useState } from "react";
import {
  MdSearch,
  MdClose,
  MdContentCopy,
  MdCheckCircle,
  MdAccountBalance,
  MdPerson,
  MdEdit,
  MdSave,
} from "react-icons/md";

/* ─── Types ─── */
interface BankAccount {
  id: string;
  uid: string;
  phone: string;
  bankName: string;
  beneficiary: string;
  accountLast4: string;
  fullAccount: string;
  ifsc: string;
  upiId: string;
  addedOn: string;
}

/* ─── Component ─── */
export default function AdminBankAccountsPage() {
  const [search, setSearch] = useState("");
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editFields, setEditFields] = useState({ fullAccount: "", ifsc: "", bankName: "", beneficiary: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/upi-accounts")
      .then((res) => res.json())
      .then((data) => {
        if (data.accounts) setAccounts(data.accounts);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = accounts.filter((a) => {
    const q = search.toLowerCase();
    return (
      a.phone.includes(q) ||
      a.uid.includes(q) ||
      a.beneficiary.toLowerCase().includes(q) ||
      a.bankName.toLowerCase().includes(q) ||
      a.fullAccount.includes(q) ||
      a.ifsc.toLowerCase().includes(q) ||
      a.upiId.toLowerCase().includes(q)
    );
  });

  function copyText(text: string, field: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
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
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Bank Accounts</h1>
        <p className="mt-1 text-sm text-slate-500">
          View all user bank details stored in the system
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100">
              <MdAccountBalance className="h-4 w-4 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Total Accounts</p>
              <p className="text-lg font-extrabold text-slate-900">{accounts.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
              <MdPerson className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Linked Users</p>
              <p className="text-lg font-extrabold text-emerald-700">
                {new Set(accounts.map((a) => a.uid)).size}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200/60 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
              <MdAccountBalance className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Banks</p>
              <p className="text-lg font-extrabold text-violet-700">
                {new Set(accounts.map((a) => a.bankName)).size}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <MdSearch className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone, bank, account, IFSC, UPI..."
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                {["User", "Bank", "Beneficiary", "Account No.", "IFSC", "UPI ID", "Added On"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-slate-400">
                    No bank accounts found
                  </td>
                </tr>
              ) : (
                filtered.map((acc) => (
                  <tr
                    key={acc.id}
                    className="transition hover:bg-slate-50/60 cursor-pointer"
                    onClick={() => setSelectedAccount(acc)}
                  >
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-bold text-white shadow">
                          {acc.phone.slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{acc.phone}</p>
                          <p className="text-[10px] font-bold text-indigo-500">UID: {acc.uid}</p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-600">
                        {acc.bankName}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 font-semibold text-slate-800">
                      {acc.beneficiary}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <span className="font-mono text-xs text-slate-600">
                        {acc.fullAccount}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <span className="font-mono text-xs text-slate-500">{acc.ifsc}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <span className="font-mono text-xs text-indigo-600">
                        {acc.upiId !== "—" ? acc.upiId : "—"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-[11px] text-slate-400">
                      {acc.addedOn}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
          <span className="text-xs text-slate-500">
            Showing <span className="font-bold text-slate-800">{filtered.length}</span> of{" "}
            <span className="font-bold text-slate-800">{accounts.length}</span> accounts
          </span>
        </div>
      </div>

      {/* ─── Detail Modal ─── */}
      {selectedAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setSelectedAccount(null); setEditing(false); }} />
          <div className="relative w-full max-w-md animate-[slideUp_0.3s_ease] rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-900">Bank Account Details</h3>
              <div className="flex items-center gap-1">
                {!editing && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditFields({
                        fullAccount: selectedAccount.fullAccount,
                        ifsc: selectedAccount.ifsc,
                        bankName: selectedAccount.bankName,
                        beneficiary: selectedAccount.beneficiary,
                      });
                      setEditing(true);
                    }}
                    className="rounded-xl p-2 text-indigo-500 transition hover:bg-indigo-50 hover:text-indigo-700"
                    title="Edit"
                  >
                    <MdEdit className="h-5 w-5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setSelectedAccount(null); setEditing(false); }}
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  <MdClose className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* User Info */}
              <div className="flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-bold text-white shadow">
                  {selectedAccount.phone.slice(0, 2)}
                </div>
                <div>
                  <p className="font-bold text-slate-900">{selectedAccount.phone}</p>
                  <p className="text-xs text-indigo-500 font-semibold">UID: {selectedAccount.uid}</p>
                </div>
              </div>

              {/* Bank Details */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
                {editing ? (
                  <>
                    <EditRow label="Bank Name" value={editFields.bankName} onChange={(v) => setEditFields((p) => ({ ...p, bankName: v }))} />
                    <EditRow label="Beneficiary" value={editFields.beneficiary} onChange={(v) => setEditFields((p) => ({ ...p, beneficiary: v }))} />
                    <EditRow label="Account Number" value={editFields.fullAccount} onChange={(v) => setEditFields((p) => ({ ...p, fullAccount: v }))} />
                    <EditRow label="IFSC Code" value={editFields.ifsc} onChange={(v) => setEditFields((p) => ({ ...p, ifsc: v.toUpperCase() }))} />
                  </>
                ) : (
                  <>
                    <DetailRow label="Bank Name" value={selectedAccount.bankName} />
                    <DetailRow
                      label="Beneficiary"
                      value={selectedAccount.beneficiary}
                      copiable
                      onCopy={() => copyText(selectedAccount.beneficiary, "beneficiary")}
                      copied={copiedField === "beneficiary"}
                    />
                    <DetailRow
                      label="Account Number"
                      value={selectedAccount.fullAccount}
                      copiable
                      onCopy={() => copyText(selectedAccount.fullAccount, "account")}
                      copied={copiedField === "account"}
                    />
                    <DetailRow
                      label="IFSC Code"
                      value={selectedAccount.ifsc}
                      copiable
                      onCopy={() => copyText(selectedAccount.ifsc, "ifsc")}
                      copied={copiedField === "ifsc"}
                    />
                    {selectedAccount.upiId !== "—" && (
                      <DetailRow
                        label="UPI ID"
                        value={selectedAccount.upiId}
                        copiable
                        onCopy={() => copyText(selectedAccount.upiId, "upi")}
                        copied={copiedField === "upi"}
                      />
                    )}
                    <DetailRow label="Added On" value={selectedAccount.addedOn} />
                  </>
                )}
              </div>

              {/* Save / Cancel buttons */}
              {editing && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={async () => {
                      setSaving(true);
                      try {
                        const res = await fetch("/api/admin/upi-accounts", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            id: selectedAccount.id,
                            fullAccount: editFields.fullAccount,
                            ifsc: editFields.ifsc,
                            bankName: editFields.bankName,
                            beneficiary: editFields.beneficiary,
                          }),
                        });
                        if (res.ok) {
                          // Update local state
                          const updated: BankAccount = {
                            ...selectedAccount,
                            fullAccount: editFields.fullAccount,
                            accountLast4: editFields.fullAccount.slice(-4),
                            ifsc: editFields.ifsc,
                            bankName: editFields.bankName,
                            beneficiary: editFields.beneficiary,
                          };
                          setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
                          setSelectedAccount(updated);
                          setEditing(false);
                        }
                      } catch {
                        // silently fail
                      } finally {
                        setSaving(false);
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-400/30 transition hover:shadow-xl disabled:opacity-50"
                  >
                    <MdSave className="h-4 w-4" />
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Sub-components ─── */
function DetailRow({
  label,
  value,
  copiable,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  copiable?: boolean;
  onCopy?: () => void;
  copied?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-400">{label}</span>
      <div className="flex items-center gap-1">
        <span className="text-sm font-semibold text-slate-700">{value}</span>
        {copiable && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onCopy?.(); }}
            className="rounded p-0.5 text-slate-300 hover:text-slate-500 transition"
          >
            {copied ? (
              <MdCheckCircle className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <MdContentCopy className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function EditRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <span className="text-xs font-medium text-slate-400">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
      />
    </div>
  );
}
