/**
 * Manages P2P sell transactions.
 * When a buyer purchases from a seller's offer, it creates a sell transaction
 * that appears in the seller's "Today's Sell" section.
 */

export interface SellTransaction {
  id: string;
  offerId: string;
  sellerId: string;
  sellerName: string;
  amount: number;
  buyerUtr: string;
  bank: string;
  upiId: string;
  status: "pending" | "completed" | "failed";
  orderNo: string;
  orderTime: string;
  createdAt: string;
}

const SELL_TX_KEY = "gmtpay.sellTransactions";
export const SELL_TX_EVENT = "gmtpay:sell-tx-updated";

function generateOrderNo(): string {
  const now = new Date();
  const ts = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0") +
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0") +
    String(now.getSeconds()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 999999999).toString().padStart(9, "0");
  return `mm${ts}${rand}`;
}

function formatOrderTime(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
}

export function getSellTransactions(): SellTransaction[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(SELL_TX_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return [];
}

export function getTodaySellTransactions(): SellTransaction[] {
  const all = getSellTransactions();
  const today = new Date().toISOString().slice(0, 10);
  return all.filter((tx) => tx.createdAt.slice(0, 10) === today);
}

export function createSellTransaction(params: {
  offerId: string;
  sellerId: string;
  sellerName: string;
  amount: number;
  bank: string;
  upiId: string;
}): SellTransaction {
  const now = new Date();
  const tx: SellTransaction = {
    id: `sell-tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    offerId: params.offerId,
    sellerId: params.sellerId,
    sellerName: params.sellerName,
    amount: params.amount,
    buyerUtr: "",
    bank: params.bank,
    upiId: params.upiId,
    status: "pending",
    orderNo: generateOrderNo(),
    orderTime: formatOrderTime(now),
    createdAt: now.toISOString(),
  };

  const existing = getSellTransactions();
  existing.unshift(tx);
  window.localStorage.setItem(SELL_TX_KEY, JSON.stringify(existing));
  window.dispatchEvent(new CustomEvent(SELL_TX_EVENT));

  return tx;
}

export function completeSellTransaction(txId: string, utr: string): SellTransaction | null {
  if (typeof window === "undefined") return null;

  try {
    const all = getSellTransactions();
    const tx = all.find((t) => t.id === txId);
    if (!tx) return null;

    tx.status = "completed";
    tx.buyerUtr = utr;
    window.localStorage.setItem(SELL_TX_KEY, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent(SELL_TX_EVENT));
    return tx;
  } catch {
    return null;
  }
}
