"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import TopNav from "./TopNav";
import BottomNav from "./BottomNav";
import AppSidebar from "./AppSidebar";
import AppDesktopHeader from "./AppDesktopHeader";
import PresenceHeartbeat from "./PresenceHeartbeat";
import { SessionProvider, useSession } from "./SessionProvider";
import { createClient } from "@/lib/supabase/client";
import { canAccessPath, type AppRole } from "@/lib/permissions";
import { trialRemainingLabel } from "@/lib/trial-ux";

const AUTH_PATHS = ["/login", "/registro", "/onboarding"];

function AppShellPanel({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isInterno = pathname === "/interno" || pathname.startsWith("/interno/");
  const { ready, profile, license } = useSession();
  const [unlockCode, setUnlockCode] = useState("");
  const [unlockBusy, setUnlockBusy] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlockSuccess, setUnlockSuccess] = useState<string | null>(null);
  const [unlockDismissed, setUnlockDismissed] = useState(false);
  const [unlockSignOutBusy, setUnlockSignOutBusy] = useState(false);

  const role = (profile?.role ?? null) as AppRole | null;
  const customPermissions = profile?.permissions ?? null;
  const isAllowed = !ready || !profile || canAccessPath(role, pathname, customPermissions);
  const unlockRequired = !isInterno && ready && license.requires_unlock && !unlockDismissed;
  const unlockPeriodEnd = license.license_period_end;

  useEffect(() => {
    if (!ready || !profile) return;
    const allowed = canAccessPath(role, pathname, customPermissions);
    if (!allowed) {
      router.replace("/cuenta");
    }
  }, [ready, profile, role, pathname, customPermissions, router]);

  const submitUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (unlockBusy || !unlockCode.trim()) return;
    setUnlockBusy(true);
    setUnlockError(null);
    setUnlockSuccess(null);
    try {
      const res = await fetch("/api/auth/unlock-license", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: unlockCode.trim() }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; license_period_end?: string | null };
      if (!res.ok) {
        setUnlockError(json.error ?? "No se pudo validar la clave");
        return;
      }
      const periodEnd = json.license_period_end ?? unlockPeriodEnd;
      setUnlockDismissed(true);
      setUnlockCode("");
      if (periodEnd) {
        setUnlockSuccess(`Bienvenido. Tu licencia quedó activa hasta ${new Date(periodEnd).toLocaleDateString("es-CO")}.`);
      } else {
        setUnlockSuccess("Bienvenido. Tu licencia quedó activa.");
      }
      setTimeout(() => setUnlockSuccess(null), 9000);
      router.refresh();
    } catch {
      setUnlockError("Error de red. Intenta nuevamente.");
    } finally {
      setUnlockBusy(false);
    }
  };

  async function signOutAndGoToLogin() {
    if (unlockSignOutBusy) return;
    setUnlockSignOutBusy(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } finally {
      setUnlockSignOutBusy(false);
    }
  }

  if (ready && profile && !isAllowed) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--shell-workspace)] p-6 text-center dark:bg-[var(--shell-workspace-dark)]">
        <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">
          No tienes permiso para ver esta sección. Si necesitas acceso, pídeselo al administrador de tu organización.
        </p>
        <Link
          href="/cuenta"
          className="rounded-xl bg-ov-pink px-4 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-ov-pink-hover"
        >
          Ir a mi cuenta
        </Link>
      </main>
    );
  }

  return (
    <>
      <PresenceHeartbeat />
      <AppSidebar />
      <div className="relative flex min-h-screen min-w-0 max-w-full flex-1 flex-col overflow-x-hidden bg-[var(--shell-workspace)] dark:bg-[var(--shell-workspace-dark)] lg:pl-[272px]">
        <div
          className="pointer-events-none absolute inset-0 z-0 dark-app-canvas-glow opacity-0 dark:opacity-100"
          aria-hidden
        />
        <AppDesktopHeader />
        <TopNav />
        {unlockSuccess ? (
          <div className="pointer-events-none fixed left-1/2 top-16 z-[9999] w-[min(92vw,560px)] -translate-x-1/2 lg:left-[calc(50%+136px)]">
            <div className="rounded-xl border border-nou-300/50 bg-white px-4 py-2.5 text-[13px] text-nou-900 shadow-lg">
              {unlockSuccess}
            </div>
          </div>
        ) : null}
        <main className="relative z-[1] min-w-0 flex-1 overflow-x-hidden py-4 pb-20 font-sans sm:py-6 lg:py-6">
          <div className="mx-auto min-w-0 max-w-[1600px] px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
        <BottomNav />
      </div>
      {unlockRequired ? (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-600 dark:bg-slate-900">
            <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">Activa tu licencia</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-slate-600 dark:text-slate-400">
              Para continuar, ingresa la clave que te compartió programamos.{" "}
              {unlockPeriodEnd ? (
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  Al activarla, tu licencia queda vigente por {trialRemainingLabel(unlockPeriodEnd)}.
                </span>
              ) : null}
            </p>
            <form className="mt-4 space-y-3" onSubmit={submitUnlock}>
              <input
                type="text"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="Ej. XXXX-XXXX-XXXX"
                value={unlockCode}
                onChange={(e) => setUnlockCode(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-mono text-[15px] tracking-wide text-slate-900 outline-none placeholder:text-slate-400 focus:border-ov-pink/50 focus:ring-2 focus:ring-ov-pink/25 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
              />
              {unlockError ? <p className="text-[13px] font-medium text-rose-600 dark:text-rose-400">{unlockError}</p> : null}
              <button
                type="submit"
                disabled={unlockBusy || !unlockCode.trim()}
                className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-ov-pink px-4 text-[14px] font-semibold text-white transition-colors hover:bg-ov-pink-hover disabled:opacity-50"
              >
                {unlockBusy ? "Validando..." : "Activar licencia"}
              </button>
            </form>
            <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-600">
              <p className="text-center text-[13px] text-slate-600 dark:text-slate-400">
                ¿Iniciaste sesión con la cuenta equivocada?
              </p>
              <button
                type="button"
                onClick={signOutAndGoToLogin}
                disabled={unlockSignOutBusy}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white py-2.5 text-[13px] font-semibold text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                {unlockSignOutBusy ? "Cerrando sesión…" : "Cerrar sesión e iniciar con otra cuenta"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuth = AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const isLanding = pathname === "/";
  const isInterno = pathname === "/interno" || pathname.startsWith("/interno/");
  const isCatalogStorefront = pathname === "/t" || pathname.startsWith("/t/");
  const isAccessBlockedPage = pathname === "/acceso-bloqueado";

  if (isAccessBlockedPage) {
    return (
      <main className="relative min-h-screen flex-1 py-6 sm:py-10">
        <div className="mx-auto min-w-0 max-w-[1600px] px-4 sm:px-6 lg:px-8">{children}</div>
      </main>
    );
  }

  if (isAuth || isLanding || isCatalogStorefront) {
    return <>{children}</>;
  }

  return (
    <SessionProvider skipLicenseCheck={isInterno}>
      <AppShellPanel>{children}</AppShellPanel>
    </SessionProvider>
  );
}
