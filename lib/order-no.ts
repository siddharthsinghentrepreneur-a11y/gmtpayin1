/**
 * Generate a unique, human-readable order number.
 * Format: BO + YYYYMMDD + HHMMSS + 5-digit random
 * Example: BO20260403143022-58312
 */
export function generateOrderNo(prefix = "BO"): string {
  const now = new Date();
  const ts =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0") +
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0") +
    String(now.getSeconds()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 99999)
    .toString()
    .padStart(5, "0");
  return `${prefix}${ts}-${rand}`;
}
