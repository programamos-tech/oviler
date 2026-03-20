"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import TopNav from "./TopNav";
import BottomNav from "./BottomNav";
import { createClient } from "@/lib/supabase/client";
import { canAccessPath, type AppRole } from "@/lib/permissions";

const AUTH_PATHS = ["/login", "/registro", "/onboarding"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuth = AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const isLanding = pathname === "/";
  const [isAllowed, setIsAllowed] = useState(true);
  const [checkedAccess, setCheckedAccess] = useState(false);

  useEffect(() => {
    if (isAuth || isLanding) {
      setCheckedAccess(true);
      setIsAllowed(true);
      return;
    }

    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) {
        setCheckedAccess(true);
        return;
      }
      const { data: me } = await supabase.from("users").select("role, permissions").eq("id", user.id).single();
      if (cancelled) return;
      const meRow = me as { role?: string | null; permissions?: string[] | null } | null;
      const allowed = canAccessPath((meRow?.role ?? null) as AppRole | null, pathname, meRow?.permissions ?? null);
      setIsAllowed(allowed);
      setCheckedAccess(true);
      if (!allowed) {
        router.replace("/dashboard");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuth, isLanding, pathname, router]);

  if (isAuth || isLanding) {
    return <>{children}</>;
  }

  if (!checkedAccess) {
    return <main className="min-h-screen" aria-busy="true" />;
  }

  if (!isAllowed) return null;

  return (
    <>
      <TopNav />
      <main className="relative flex-1 py-4 pb-20 md:pb-6 sm:py-6 lg:py-6">
        <div className="mx-auto min-w-0 max-w-[1600px] px-4 sm:px-6 lg:px-8">{children}</div>
      </main>
      <BottomNav />
    </>
  );
}
