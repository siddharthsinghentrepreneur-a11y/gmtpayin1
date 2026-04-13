export const USER_STORAGE_KEY = "gmtpay.user";
export const ADMIN_STORAGE_KEY = "gmtpay.admin";
export const ADMIN_PHONE = "9451782021";

export type StoredUserSession = {
  id: string;
  phone: string | null;
  uid?: string | null;
  referralCode?: string | null;
  name: string;
  role: string;
};

export type StoredAdminSession = {
  id: string;
  email: string | null;
  phone?: string | null;
  name: string;
  role: string;
};

export function isAdminPhone(phone: string | null | undefined) {
  return phone === ADMIN_PHONE;
}

export function saveUserSession(session: StoredUserSession) {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(session));
  // Also persist in cookie (365 days) so session survives localStorage clears
  try {
    document.cookie = `${USER_STORAGE_KEY}=${encodeURIComponent(JSON.stringify(session))}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`;
  } catch {
    // cookie write may fail in some contexts
  }
}

export function updateUserSession(sessionPatch: Partial<StoredUserSession>) {
  const currentSession = getUserSession();

  if (!currentSession) {
    return;
  }

  saveUserSession({
    ...currentSession,
    ...sessionPatch,
    id: sessionPatch.id ?? currentSession.id,
    phone: sessionPatch.phone === undefined ? currentSession.phone : sessionPatch.phone,
    uid: sessionPatch.uid === undefined ? currentSession.uid ?? null : sessionPatch.uid,
    referralCode:
      sessionPatch.referralCode === undefined
        ? currentSession.referralCode ?? null
        : sessionPatch.referralCode,
    name: sessionPatch.name ?? currentSession.name,
    role: sessionPatch.role ?? currentSession.role,
  });
}

export function getUserSession(): StoredUserSession | null {
  let raw = localStorage.getItem(USER_STORAGE_KEY);

  // Recover from cookie if localStorage was cleared
  if (!raw) {
    try {
      const match = document.cookie.match(new RegExp(`(?:^|; )${USER_STORAGE_KEY}=([^;]*)`));
      if (match) {
        raw = decodeURIComponent(match[1]);
        // Restore into localStorage
        localStorage.setItem(USER_STORAGE_KEY, raw);
      }
    } catch {
      // cookie read may fail
    }
  }

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredUserSession>;

    if (typeof parsed.id !== "string") {
      localStorage.removeItem(USER_STORAGE_KEY);
      return null;
    }

    return {
      id: parsed.id,
      phone: typeof parsed.phone === "string" ? parsed.phone : null,
      uid: typeof parsed.uid === "string" ? parsed.uid : null,
      referralCode: typeof parsed.referralCode === "string" ? parsed.referralCode : null,
      name: typeof parsed.name === "string" ? parsed.name : "",
      role: typeof parsed.role === "string" ? parsed.role : "USER",
    };
  } catch {
    return {
      id: raw,
      phone: null,
      uid: null,
      referralCode: null,
      name: "",
      role: "USER",
    };
  }
}

export function getCurrentUserId() {
  return getUserSession()?.id ?? null;
}

export function clearUserSession() {
  localStorage.removeItem(USER_STORAGE_KEY);
  try {
    document.cookie = `${USER_STORAGE_KEY}=; path=/; max-age=0`;
  } catch {
    // cookie clear may fail
  }
}

export function saveAdminSession(session: StoredAdminSession) {
  localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(session));
  try {
    document.cookie = `${ADMIN_STORAGE_KEY}=${encodeURIComponent(JSON.stringify(session))}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`;
  } catch {
    // cookie write may fail
  }
}

export function getAdminSession(): StoredAdminSession | null {
  let raw = localStorage.getItem(ADMIN_STORAGE_KEY);

  // Recover from cookie if localStorage was cleared
  if (!raw) {
    try {
      const match = document.cookie.match(new RegExp(`(?:^|; )${ADMIN_STORAGE_KEY}=([^;]*)`));
      if (match) {
        raw = decodeURIComponent(match[1]);
        localStorage.setItem(ADMIN_STORAGE_KEY, raw);
      }
    } catch {
      // cookie read may fail
    }
  }

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredAdminSession;
  } catch {
    localStorage.removeItem(ADMIN_STORAGE_KEY);
    return null;
  }
}

export function clearAdminSession() {
  localStorage.removeItem(ADMIN_STORAGE_KEY);
  try {
    document.cookie = `${ADMIN_STORAGE_KEY}=; path=/; max-age=0`;
  } catch {
    // cookie clear may fail
  }
}