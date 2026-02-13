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
      <main className="relative flex-1 px-4 py-4 pb-20 md:pb-6 sm:px-6 sm:py-6 lg:px-8 lg:py-6">
        <div className="mx-auto min-w-0 max-w-[1600px]">{children}</div>
      </main>
      <BottomNav />
      {/* Barra informativa Powered by NOU */}
      <div className="fixed bottom-0 left-0 right-0 z-20 hidden border-t border-slate-200/50 bg-gradient-to-r from-slate-50 to-white px-4 py-1.5 backdrop-blur-sm md:block dark:border-slate-800/50 dark:from-slate-900 dark:to-slate-800">
        <div className="mx-auto flex max-w-[1600px] items-center justify-center gap-2">
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
            <svg className="h-3 w-3 shrink-0 text-ov-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span className="tracking-wide">Powered by</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">NOU Technology</span>
            <span className="rounded-full bg-ov-pink/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-ov-pink dark:bg-ov-pink/20 dark:text-ov-pink-muted">v.beta</span>
          </div>
        </div>
      </div>
    </>
  );
}
