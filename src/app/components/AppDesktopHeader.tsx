"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Notifications from "./Notifications";
import { workspaceAvatarSeed } from "./app-nav-data";
import WorkspaceCharacterAvatar from "./WorkspaceCharacterAvatar";
import { isFreeTrialActive, trialRemainingLabel } from "@/lib/trial-ux";
import { bernabePlanUpgradeWhatsAppUrl, workspaceHelpWhatsAppUrl } from "@/lib/programamos-contact";
import { normalizePlanType } from "@/lib/plan-catalog";
import { LITE_PLAN_DISPLAY_NAME } from "@/lib/license-display";
import { workspaceRoleLabel, workspaceUserDisplayName } from "./workspace-title";
import { GlobalSearchCombobox } from "@/app/components/GlobalSearchCombobox";
import { useSession } from "./SessionProvider";

export default function AppDesktopHeader() {
  const pathname = usePathname();
  const isInterno = pathname === "/interno" || pathname.startsWith("/interno/");
  const router = useRouter();
  const { profile, org, authMeta } = useSession();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  const user = profile
    ? {
        name: profile.name,
        email: profile.email,
        role: profile.role,
        avatar_url: profile.avatar_url,
        organization_id: profile.organization_id,
      }
    : null;
  const orgTrial = org;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (userMenuRef.current && !userMenuRef.current.contains(target)) setUserMenuOpen(false);
    };
    if (userMenuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userMenuOpen]);

  const trialActive = orgTrial != null && isFreeTrialActive(orgTrial);
  const trialEndsAt = orgTrial?.trial_ends_at ?? "";

  const iconBtn =
    "shell-header-icon-btn flex h-9 w-9 shrink-0 items-center justify-center rounded-lg";

  const headerSearchInputClass =
    "h-10 w-full rounded-xl border border-[var(--shell-workspace-search-border)] bg-[var(--shell-workspace-search-bg)] py-2 pl-10 pr-4 text-[13px] text-[var(--berea-ink)] shadow-[inset_0_0_0_0.5px_rgba(44,40,36,0.06)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--berea-ink-subtle)] focus:border-[rgba(44,40,36,0.22)] focus:shadow-[inset_0_0_0_0.5px_rgba(44,40,36,0.08)] focus:ring-0 dark:border-[var(--shell-nav-border)] dark:bg-[var(--shell-nav-card-bg)] dark:text-[var(--shell-nav-fg)] dark:placeholder:text-[var(--shell-nav-fg-subtle)] dark:shadow-none dark:focus:border-[var(--shell-nav-fg-subtle)]";

  const showSecondaryActions =
    user?.email?.toLowerCase() === "bernabe@tech.com" ||
    (trialActive && Boolean(trialEndsAt)) ||
    (orgTrial != null && normalizePlanType(orgTrial.plan_type ?? "") === "free");

  return (
    <header className="shell-workspace-header sticky top-0 z-30 hidden min-h-[3.75rem] w-full shrink-0 lg:block">
      <div className="mx-auto flex w-full max-w-[1600px] items-center gap-3 px-4 py-2.5 sm:gap-4 sm:px-6 lg:px-8">
        <GlobalSearchCombobox
          formClassName="min-w-0 flex-1"
          inputClassName={headerSearchInputClass}
          searchIconLeftClass="left-3.5"
          searchIconClassName="text-[var(--berea-ink-subtle)] dark:text-[var(--shell-nav-fg-subtle)]"
          placeholder="Buscar en Berea…"
        />

        <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
          {showSecondaryActions ? (
            <div className="flex items-center gap-2 pr-1">
              {user?.email?.toLowerCase() === "bernabe@tech.com" ? (
                <Link
                  href={isInterno ? "/dashboard" : "/interno"}
                  className="inline-flex h-9 shrink-0 items-center rounded-lg border border-[var(--berea-card-border)] bg-[var(--berea-card)] px-3 text-[12px] font-semibold text-[var(--berea-ink)] transition-colors hover:bg-[rgba(44,40,36,0.04)] dark:border-[var(--shell-nav-border)] dark:bg-[var(--shell-nav-card-bg)] dark:text-[var(--shell-nav-fg)] dark:hover:bg-[var(--shell-nav-hover-bg)]"
                  title={isInterno ? "Volver a la plataforma" : "Ir a BackOffice"}
                >
                  {isInterno ? "Volver a la plataforma" : "BackOffice"}
                </Link>
              ) : null}
              {trialActive && trialEndsAt ? (
                <div
                  className="flex max-w-[200px] min-w-0 items-center"
                  title={`${LITE_PLAN_DISPLAY_NAME} · ${trialRemainingLabel(trialEndsAt)} restantes`}
                >
                  <span className="inline-flex max-w-full items-center gap-1 truncate rounded-lg border border-nou-200 bg-nou-50 px-2.5 py-1.5 text-[11px] font-semibold text-nou-800 dark:border-nou-400/35 dark:bg-nou-500/15 dark:text-nou-200">
                    <span className="shrink-0 tabular-nums">
                      {LITE_PLAN_DISPLAY_NAME} · {trialRemainingLabel(trialEndsAt)}
                    </span>
                  </span>
                </div>
              ) : null}
              {orgTrial && normalizePlanType(orgTrial.plan_type ?? "") === "free" ? (
                <a
                  href={bernabePlanUpgradeWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={iconBtn}
                  title="Adquirir plan Estándar o Pro"
                  aria-label="Adquirir plan Estándar o Pro"
                >
                  <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9zm7 4v3m-3 0h6"
                    />
                  </svg>
                </a>
              ) : null}
            </div>
          ) : null}

          <Link
            href="/ventas/nueva"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--shell-sidebar)] text-white shadow-sm transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)]"
            title="Nueva venta"
            aria-label="Nueva venta"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </Link>

          <div className="flex items-center gap-0.5 sm:gap-1">
            <a
              href={workspaceHelpWhatsAppUrl()}
              target="_blank"
              rel="noreferrer"
              className={iconBtn}
              title="Ayuda · WhatsApp"
              aria-label="Ayuda"
            >
              <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </a>

            <Link href="/actividades" className={iconBtn} title="Actividad" aria-label="Actividad">
              <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </Link>

            <Link href="/cuenta" className={iconBtn} title="Cuenta" aria-label="Cuenta">
              <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>

            <Notifications tone="light" />
          </div>

          <div className="shell-header-divider relative ml-1 border-l pl-3 sm:ml-2 sm:pl-4" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setUserMenuOpen((o) => !o)}
              className="shell-header-profile-btn flex items-center gap-2 rounded-full border border-[var(--berea-card-border)] py-1 pl-1 pr-2.5 transition-colors dark:border-[var(--shell-nav-border)]"
              aria-label="Perfil"
              aria-expanded={userMenuOpen}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--berea-ink)] ring-1 ring-[var(--berea-card-border)] dark:bg-[var(--shell-nav-fg)] dark:ring-[var(--shell-nav-border)]">
                {user?.avatar_url && !user.avatar_url.startsWith("avatar:") ? (
                  <img src={user.avatar_url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <WorkspaceCharacterAvatar
                    seed={workspaceAvatarSeed(user?.email, user?.name, user?.avatar_url)}
                    size={72}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="hidden min-w-0 text-left xl:block">
                <p className="shell-header-profile-name max-w-[160px] truncate text-[13px] font-medium leading-tight">
                  {workspaceUserDisplayName(user, authMeta)}
                </p>
                <p className="shell-header-profile-role text-[11px] font-medium">{workspaceRoleLabel(user?.role)}</p>
              </div>
              <svg
                className={`shell-header-profile-chevron h-4 w-4 shrink-0 transition-transform ${userMenuOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {userMenuOpen ? (
              <div className="absolute right-0 top-full z-50 mt-1 min-w-[10rem] rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    router.push("/cuenta");
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
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
                  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Cerrar sesión
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
