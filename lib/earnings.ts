export function calculateDepositIncome(amount: number) {
  return amount * 0.04 + 6;
}

export function calculateDepositCredit(amount: number) {
  return amount + calculateDepositIncome(amount);
}

export function sumDepositIncome(amounts: number[]) {
  return amounts.reduce((total, amount) => total + calculateDepositIncome(amount), 0);
}

export function sumDepositCredit(amounts: number[]) {
  return amounts.reduce((total, amount) => total + calculateDepositCredit(amount), 0);
}