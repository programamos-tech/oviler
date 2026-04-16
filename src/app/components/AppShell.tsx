"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import TopNav from "./TopNav";
import BottomNav from "./BottomNav";
import AppSidebar from "./AppSidebar";
import AppDesktopHeader from "./AppDesktopHeader";
import PresenceHeartbeat from "./PresenceHeartbeat";
import { createClient } from "@/lib/supabase/client";
import { canAccessPath, type AppRole } from "@/lib/permissions";
import { trialRemainingLabel } from "@/lib/trial-ux";

const AUTH_PATHS = ["/login", "/registro", "/onboarding"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuth = AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const isLanding = pathname === "/";
  const isInterno = pathname === "/interno" || pathname.startsWith("/interno/");
  /** Catálogo público: tienda aparte, sin TopNav/BottomNav del panel */
  const isCatalogStorefront = pathname === "/t" || pathname.startsWith("/t/");
  const isAccessBlockedPage = pathname === "/acceso-bloqueado";
  const [isAllowed, setIsAllowed] = useState(true);
  const [checkedAccess, setCheckedAccess] = useState(false);
  const [unlockRequired, setUnlockRequired] = useState(false);
  const [unlockCode, setUnlockCode] = useState("");
  const [unlockBusy, setUnlockBusy] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlockSuccess, setUnlockSuccess] = useState<string | null>(null);
  const [unlockPeriodEnd, setUnlockPeriodEnd] = useState<string | null>(null);
  const [unlockSignOutBusy, setUnlockSignOutBusy] = useState(false);

  useEffect(() => {
    if (isAuth || isLanding || isInterno || isCatalogStorefront) {
      setCheckedAccess(true);
      setIsAllowed(true);
      return;
    }

    const supabase = createClient();
    let cancelled = false;
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) {
          return;
        }
        const { data: me } = await supabase.from("users").select("role, permissions").eq("id", user.id).single();
        if (cancelled) return;
        const meRow = me as { role?: string | null; permissions?: string[] | null } | null;
        const allowed = canAccessPath((meRow?.role ?? null) as AppRole | null, pathname, meRow?.permissions ?? null);
        setIsAllowed(allowed);
        // Si no puede ver esta ruta, ir a Cuenta (siempre permitida). Antes se redirigía a /dashboard y, estando ya ahí, quedaba pantalla en blanco (return null).
        if (!allowed) {
          router.replace("/cuenta");
        }
      } catch (e) {
        console.error("[AppShell] Error comprobando permisos", e);
        if (!cancelled) setIsAllowed(true);
      } finally {
        if (!cancelled) setCheckedAccess(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuth, isLanding, isInterno, isCatalogStorefront, pathname, router]);

  useEffect(() => {
    if (isAuth || isLanding || isInterno || isCatalogStorefront || isAccessBlockedPage) {
      setUnlockRequired(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/license-status", { credentials: "include" });
        if (!res.ok) return;
        const json = (await res.json()) as {
          requires_unlock?: boolean;
          license_period_end?: string | null;
          organization?: { trial_ends_at?: string | null } | null;
        };
        if (cancelled) return;
        setUnlockRequired(Boolean(json.requires_unlock));
        setUnlockPeriodEnd(json.license_period_end ?? json.organization?.trial_ends_at ?? null);
      } catch {
        // No bloquear la app si falla este check.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuth, isLanding, isInterno, isCatalogStorefront, isAccessBlockedPage, pathname]);

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
      setUnlockRequired(false);
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

  if (isAccessBlockedPage) {
    return (
      <main className="relative min-h-screen flex-1 py-6 sm:py-10">
        <div className="mx-auto min-w-0 max-w-[1600px] px-4 sm:px-6 lg:px-8">{children}</div>
      </main>
    );
  }

  if (isAuth || isLanding) {
    return <>{children}</>;
  }

  if (isCatalogStorefront) {
    return <>{children}</>;
  }

  if (!checkedAccess) {
    return <main className="min-h-screen" aria-busy="true" />;
  }

  if (!isAllowed) {
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
      <div className="relative flex min-h-screen flex-1 flex-col bg-[var(--shell-workspace)] dark:bg-[var(--shell-workspace-dark)] lg:pl-[260px]">
        <div
          className="pointer-events-none absolute inset-0 z-0 dark-app-canvas-glow opacity-0 dark:opacity-100"
          aria-hidden
        />
        <AppDesktopHeader />
        <TopNav />
        {unlockSuccess ? (
          <div className="pointer-events-none fixed left-1/2 top-16 z-[9999] w-[min(92vw,560px)] -translate-x-1/2 lg:left-[calc(50%+130px)]">
            <div className="rounded-xl border border-nou-300/50 bg-white px-4 py-2.5 text-[13px] text-nou-900 shadow-lg">
              {unlockSuccess}
            </div>
          </div>
        ) : null}
        <main className="relative z-[1] flex-1 py-4 pb-20 font-sans sm:py-6 md:pb-6 lg:py-6">
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
