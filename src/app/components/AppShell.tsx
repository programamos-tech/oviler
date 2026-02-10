"use client";

import { usePathname } from "next/navigation";
import TopNav from "./TopNav";
import BottomNav from "./BottomNav";

const AUTH_PATHS = ["/login", "/registro", "/onboarding"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuth = AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (isAuth) {
    return <>{children}</>;
  }

  return (
    <>
      <TopNav />
      <main className="relative flex-1 px-4 py-4 pb-20 md:pb-6 sm:px-6 sm:py-6 lg:px-8 lg:py-6">
        <div className="mx-auto min-w-0 max-w-[1600px]">{children}</div>
      </main>
      <BottomNav />
    </>
  );
}
