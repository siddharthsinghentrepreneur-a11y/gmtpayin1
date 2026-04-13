import { compare, hash } from "bcryptjs";

export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "").trim();
}

export function isValidPhone(phone: string) {
  return /^\d{10}$/.test(phone);
}

export async function hashPassword(password: string) {
  return hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  if (!passwordHash.startsWith("$2")) {
    return password === passwordHash;
  }

  return compare(password, passwordHash);
}