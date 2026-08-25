"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Notifications from "./Notifications";
import FreeTrialWelcomeModal from "./FreeTrialWelcomeModal";
import { isTrialWelcomeDismissedThisSession, markTrialWelcomeDismissedThisSession } from "@/lib/trial-welcome-storage";
import { isFreeTrialActive, trialRemainingLabel } from "@/lib/trial-ux";
import { workspaceAvatarSeed } from "./app-nav-data";
import WorkspaceCharacterAvatar from "./WorkspaceCharacterAvatar";
import { workspaceRoleLabel, workspaceUserDisplayName } from "./workspace-title";
import { bernabePlanUpgradeWhatsAppUrl, workspaceHelpWhatsAppUrl } from "@/lib/programamos-contact";
import { normalizePlanType } from "@/lib/plan-catalog";
import { LITE_PLAN_DISPLAY_NAME } from "@/lib/license-display";
import { GlobalSearchCombobox } from "@/app/components/GlobalSearchCombobox";
import { useSession } from "./SessionProvider";

/** Iconos en la barra superior móvil/tablet (paleta Berea shell) */
const MOBILE_NAV_ICON =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--shell-nav-fg-muted)] transition-colors hover:bg-[var(--shell-nav-hover-bg)] hover:text-[var(--shell-nav-fg)]";
const MOBILE_NAV_PLUS =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--shell-nav-fg)] text-[var(--shell-sidebar)] shadow-[0_1px_3px_rgba(0,0,0,0.28)] transition-colors hover:bg-[var(--shell-sidebar-accent)]";

export default function TopNav() {
  const pathname = usePathname();
  const isInterno = pathname === "/interno" || pathname.startsWith("/interno/");
  const router = useRouter();
  const { profile, branch, org, authMeta } = useSession();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const [trialModalOpen, setTrialModalOpen] = useState(false);

  const user = profile
    ? {
        name: profile.name,
        email: profile.email,
        avatar_url: profile.avatar_url,
        role: profile.role,
        permissions: profile.permissions,
        organization_id: profile.organization_id,
      }
    : null;
  const orgTrial = org;
  const trialActive = orgTrial != null && isFreeTrialActive(orgTrial);
  const trialEndsAt = orgTrial?.trial_ends_at ?? "";

  useEffect(() => {
    if (!trialActive || !trialEndsAt) return;
    const oid = user?.organization_id;
    if (!oid || typeof window === "undefined") return;
    if (isTrialWelcomeDismissedThisSession(oid)) return;
    setTrialModalOpen(true);
  }, [trialActive, trialEndsAt, user?.organization_id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Solo cerrar dropdowns al hacer click fuera, no al hacer hover fuera
      if (userMenuRef.current && !userMenuRef.current.contains(target)) setUserMenuOpen(false);
    };
    if (userMenuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userMenuOpen]);

  // Atajo de teclado Cmd/Ctrl+N para nueva venta
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "n" && !event.shiftKey) {
        // Evitar el comportamiento por defecto del navegador (nueva ventana)
        event.preventDefault();
        // Solo activar si no estamos en un input, textarea o contenteditable
        const target = event.target as HTMLElement;
        if (
          target.tagName !== "INPUT" &&
          target.tagName !== "TEXTAREA" &&
          !target.isContentEditable
        ) {
          router.push("/ventas/nueva");
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  return (
    <nav className="shell-nav sticky top-0 z-50 flex min-w-0 max-w-full flex-col overflow-x-hidden overflow-y-visible border-b border-[var(--shell-nav-border)] bg-[var(--shell-nav-bg)] pt-[env(safe-area-inset-top,0px)] text-[var(--shell-nav-fg)] lg:hidden">
      <div className="mx-auto flex h-14 min-h-[3.5rem] w-full min-w-0 max-w-[1600px] items-center justify-between gap-3 px-4 pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] sm:gap-4 sm:px-6 lg:px-8">
        {/* Marca Berea + logo sucursal */}
        <div className="flex min-w-0 flex-1 items-center justify-start gap-2.5 overflow-visible sm:gap-3">
          <Link
            href="/dashboard"
            className={
              branch
                ? "flex min-w-0 max-w-[min(100%,20rem)] shrink-0 items-center gap-2.5 overflow-visible rounded-md outline-offset-2 transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--shell-nav-fg)]/35"
                : "flex shrink-0 items-center overflow-visible rounded-md outline-offset-2 transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--shell-nav-fg)]/35"
            }
            title={branch?.name ? `Berea Tech · ${branch.name}` : "Berea Tech"}
            aria-label="Berea Tech — Ir al inicio"
          >
            <img
              src="/logo-berea-house.png"
              alt=""
              className="berea-house-logo berea-house-logo--topnav shrink-0"
              decoding="async"
            />
            {branch ? (
              <>
                <span className="h-8 w-px shrink-0 rounded-full bg-[var(--shell-nav-border)]" aria-hidden />
                <div className="sidebar-branch-logo flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border">
                  {branch.logo_url ? (
                    <img
                      src={branch.logo_url}
                      alt=""
                      className="object-contain object-center"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-[11px] font-bold text-zinc-600">
                      {(branch.name || "L").slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
              </>
            ) : null}
          </Link>
        </div>

        {/* Right: controles tipo web; la navegación por módulos va en BottomNav en móvil/tablet */}
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1.5">
          {orgTrial && normalizePlanType(orgTrial.plan_type ?? "") === "free" ? (
            <a
              href={bernabePlanUpgradeWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className={MOBILE_NAV_ICON}
              title="Adquirir plan Estándar o Pro"
              aria-label="Adquirir plan Estándar o Pro"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9zm7 4v3m-3 0h6"
                />
              </svg>
            </a>
          ) : null}
          {user?.email?.toLowerCase() === "bernabe@tech.com" ? (
            <Link
              href={isInterno ? "/dashboard" : "/interno"}
              className="hidden h-8 items-center rounded-lg border border-[var(--shell-nav-border)] bg-[var(--shell-nav-card-bg)] px-2.5 text-[11px] font-semibold text-[var(--shell-nav-fg)] transition-colors hover:bg-[var(--shell-nav-hover-bg)] sm:inline-flex"
              title={isInterno ? "Volver a la plataforma" : "Ir a BackOffice"}
            >
              {isInterno ? "Volver a la plataforma" : "BackOffice"}
            </Link>
          ) : null}
          {trialActive && trialEndsAt ? (
            <div
              className="flex min-w-0 items-center lg:hidden"
              title={`${LITE_PLAN_DISPLAY_NAME} · ${trialRemainingLabel(trialEndsAt)} restantes`}
            >
              <span className="inline-flex max-w-[130px] items-center truncate rounded-lg border border-[var(--shell-nav-border)] bg-[var(--shell-nav-card-bg)] px-2 py-1 text-[10px] font-semibold text-[var(--shell-nav-fg-muted)]">
                <span className="mr-0.5 shrink-0" aria-hidden>
                  ⏱
                </span>
                <span className="min-w-0 truncate tabular-nums">
                  {LITE_PLAN_DISPLAY_NAME} · {trialRemainingLabel(trialEndsAt)}
                </span>
              </span>
            </div>
          ) : null}
          <Link
            href="/ventas/nueva"
            className={`${MOBILE_NAV_PLUS} hidden sm:flex`}
            title="Nueva venta"
            aria-label="Nueva venta"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </Link>
          <Notifications tone="dark" />
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setUserMenuOpen((o) => !o)}
              className="flex max-w-[11rem] items-center gap-1.5 rounded-lg px-1.5 py-1.5 text-[var(--shell-nav-fg)] hover:bg-[var(--shell-nav-hover-bg)] sm:max-w-none sm:px-2"
              aria-label="Perfil"
              aria-expanded={userMenuOpen}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-[var(--shell-nav-border)]">
                {user?.avatar_url && !user.avatar_url.startsWith("avatar:") ? (
                  <img
                    src={user.avatar_url}
                    alt=""
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <WorkspaceCharacterAvatar
                    seed={workspaceAvatarSeed(user?.email, user?.name, user?.avatar_url)}
                    size={64}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="hidden min-w-0 flex-col text-left leading-tight sm:flex">
                <span className="max-w-[140px] truncate text-[13px] font-medium text-[var(--shell-nav-fg)] lg:max-w-[180px]">
                  {workspaceUserDisplayName(user, authMeta)}
                </span>
                <span className="max-w-[140px] truncate text-[11px] font-medium text-[var(--shell-nav-fg-muted)] lg:max-w-[180px]">
                  {workspaceRoleLabel(user?.role)}
                </span>
              </div>
              <span className="max-w-[5.5rem] truncate text-[12px] font-medium text-[var(--shell-nav-fg)] sm:hidden">
                {workspaceUserDisplayName(user, authMeta)}
              </span>
              <svg
                className={`h-4 w-4 shrink-0 text-[var(--shell-nav-fg-subtle)] transition-transform ${userMenuOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 min-w-[10rem] rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    router.push("/cuenta");
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Cuenta
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setUserMenuOpen(false);
                    const supabase = createClient();
                    await supabase.auth.signOut();
                    router.push("/login");
                    router.refresh();
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/*
        Móvil (max-sm): 2 franjas — (1) marca+acciones (2) buscador e iconos en una fila.
        Desde sm y mientras el sidebar está oculto (hasta lg): 3 franjas — (1) marca+acciones (2) buscador ancho completo (3) ayuda/actividades/cuenta.
      */}
      <div className="border-t border-[var(--shell-nav-border)] px-4 pb-2.5 pt-2 sm:px-6 sm:pb-2">
        <div className="mx-auto flex max-w-[1600px] min-w-0 flex-row items-center gap-1.5 sm:flex-col sm:items-stretch sm:gap-2 sm:pt-0.5">
          <GlobalSearchCombobox
            formClassName="min-w-0 flex-1 sm:w-full sm:flex-none"
            variant="dark"
            placeholder="Buscar en Berea…"
            inputClassName="h-9 w-full min-w-0 rounded-full border border-[var(--shell-nav-border)] bg-[var(--shell-nav-card-bg)] py-1.5 pl-9 pr-2.5 text-[13px] text-[var(--shell-nav-fg)] outline-none placeholder:text-[var(--shell-nav-fg-subtle)] focus:border-[var(--berea-accent-soft)] focus:bg-[var(--shell-nav-hover-bg)] focus:ring-2 focus:ring-[var(--berea-accent-soft)] sm:h-10 sm:pl-9"
            searchIconLeftClass="left-3"
            searchIconClassName="text-[var(--shell-nav-fg-subtle)]"
          />
          <div className="flex shrink-0 items-center justify-end gap-0.5 sm:w-full sm:justify-center sm:gap-2 sm:border-t sm:border-[var(--shell-nav-border)] sm:pt-2">
            <a
              href={workspaceHelpWhatsAppUrl()}
              target="_blank"
              rel="noreferrer"
              className={MOBILE_NAV_ICON}
              title="Ayuda"
              aria-label="Ayuda"
            >
              <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </a>
            <Link href="/actividades" className={MOBILE_NAV_ICON} title="Actividades" aria-label="Actividades">
              <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </Link>
            <Link href="/cuenta" className={MOBILE_NAV_ICON} title="Cuenta" aria-label="Cuenta">
              <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
            <Link href="/ventas/nueva" className={`${MOBILE_NAV_PLUS} sm:hidden`} aria-label="Nueva venta">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {trialActive && trialEndsAt ? (
        <FreeTrialWelcomeModal
          open={trialModalOpen}
          trialEndsAt={trialEndsAt}
          onClose={() => {
            const oid = user?.organization_id;
            if (oid) markTrialWelcomeDismissedThisSession(oid);
            setTrialModalOpen(false);
          }}
        />
      ) : null}
    </nav>
  );
}
