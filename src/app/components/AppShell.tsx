"use client";

import { usePathname } from "next/navigation";
import TopNav from "./TopNav";
import BottomNav from "./BottomNav";

const AUTH_PATHS = ["/login", "/registro", "/onboarding"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuth = AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const isLanding = pathname === "/";

  if (isAuth || isLanding) {
    return <>{children}</>;
  }

  return (
    <>
      <TopNav />
      <main className="relative flex-1 py-4 pb-20 md:pb-6 sm:py-6 lg:py-6">
        <div className="mx-auto min-w-0 max-w-[1600px] px-4 sm:px-6 lg:px-8">{children}</div>
      </main>
      <BottomNav />
      {/* Barra informativa Powered by NOU - efecto liquid/glass */}
      <div className="fixed bottom-0 left-0 right-0 z-20 hidden border-t border-slate-200/30 py-1.5 md:block bg-white/30 dark:bg-slate-900/30 backdrop-blur-md dark:border-slate-700/30">
        <div className="mx-auto flex max-w-[1600px] items-center justify-center gap-2 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-[10px] font-medium text-slate-500 dark:text-slate-400">
            <span className="tracking-wide">Powered by</span>
            <span className="flex items-center gap-1 font-logo font-bold tracking-tight text-slate-700 dark:text-slate-300">
              <span className="material-symbols-outlined text-[14px]" aria-hidden>code</span>
              NOU desarrollos
            </span>
            <span className="text-slate-400 dark:text-slate-500">·</span>
            <span className="rounded-full bg-ov-pink/15 px-2 py-0.5 text-[10px] font-semibold text-ov-pink dark:bg-ov-pink/25 dark:text-ov-pink-muted">version beta 1.0.0</span>
          </div>
        </div>
      </div>
    </>
  );
}
