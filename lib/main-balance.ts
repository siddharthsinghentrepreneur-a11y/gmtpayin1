export const MAIN_BALANCE = 0;

export function formatMainBalance(balance: number = MAIN_BALANCE) {
  return balance.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}