export interface LinkedBankAccount {
  bankName: string;
  beneficiary: string;
  accountLast4: string;
  fullAccount: string;
  ifsc: string;
}

export const LINKED_BANK_STORAGE_KEY = "gmtpay.linkedBankAccount";
export const LINKED_BANK_EVENT = "gmtpay:linked-bank-updated";

function isLinkedBankAccount(value: unknown): value is LinkedBankAccount {
  return Boolean(
    value &&
      typeof value === "object" &&
      "bankName" in value &&
      typeof value.bankName === "string" &&
      "beneficiary" in value &&
      typeof value.beneficiary === "string" &&
      "accountLast4" in value &&
      typeof value.accountLast4 === "string" &&
      "ifsc" in value &&
      typeof value.ifsc === "string",
  );
}

export function readLinkedBankAccount(): LinkedBankAccount | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(LINKED_BANK_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    return isLinkedBankAccount(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeLinkedBankAccount(account: LinkedBankAccount) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LINKED_BANK_STORAGE_KEY, JSON.stringify(account));
  window.dispatchEvent(new CustomEvent(LINKED_BANK_EVENT, { detail: account }));
}