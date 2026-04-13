"use client";

import { getAdminSession, getUserSession, isAdminPhone, saveAdminSession } from "@/lib/client-auth";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();

  useEffect(() => {
    const adminSession = getAdminSession();
    if (adminSession && isAdminPhone(adminSession.phone)) {
      router.replace("/admin/dashboard");
      return;
    }

    const userSession = getUserSession();
    if (userSession && isAdminPhone(userSession.phone)) {
      saveAdminSession({
        id: userSession.id,
        email: null,
        phone: userSession.phone,
        name: userSession.name || "Admin",
        role: "ADMIN",
      });
      router.replace("/admin/dashboard");
      return;
    }

    router.replace("/");
  }, [router]);

  return null;
}
