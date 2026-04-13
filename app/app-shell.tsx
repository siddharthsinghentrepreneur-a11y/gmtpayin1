"use client";

import { usePathname } from "next/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <div className="flex justify-center bg-gray-100 min-h-screen">
      <div className="app-container w-full max-w-[540px] min-h-screen bg-white shadow-2xl relative">
        {children}
      </div>
    </div>
  );
}
