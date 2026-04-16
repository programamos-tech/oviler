"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Notifications from "./Notifications";
import { workspaceAvatarSeed } from "./app-nav-data";
import WorkspaceCharacterAvatar from "./WorkspaceCharacterAvatar";
import { type OrgTrialFields, isFreeTrialActive, trialRemainingLabel } from "@/lib/trial-ux";
import { bereaPlanUpgradeWhatsAppUrl, programamosWhatsAppUrl } from "@/lib/programamos-contact";
import { normalizePlanType } from "@/lib/plan-catalog";
import { LITE_PLAN_DISPLAY_NAME } from "@/lib/license-display";
import { workspaceRoleLabel, workspaceUserDisplayName } from "./workspace-title";
import { workspaceFilterSearchPillClass } from "@/lib/workspace-field-classes";

export default function AppDesktopHeader() {
  const pathname = usePathname();
  const isInterno = pathname === "/interno" || pathname.startsWith("/interno/");
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const [user, setUser] = useState<{
    name: string;
    email: string;
    role?: string | null;
    avatar_url?: string | null;
    organization_id?: string | null;
  } | null>(null);
  const [orgTrial, setOrgTrial] = useState<OrgTrialFields | null>(null);
  const [authMeta, setAuthMeta] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        setUser(null);
        setAuthMeta(null);
        return;
      }
      const { data: userData } = await supabase
        .from("users")
        .select("name, email, role, avatar_url, organization_id")
        .eq("id", authUser.id)
        .single();
      if (userData) {
        setUser(userData as typeof user);
        setAuthMeta((authUser.user_metadata as Record<string, unknown> | null) ?? null);
        const oid = (userData as { organization_id?: string | null }).organization_id;
        if (oid) {
          const { data: orgRow } = await supabase
            .from("organizations")
            .select("subscription_status, plan_type, trial_ends_at")
            .eq("id", oid)
            .maybeSingle();
          setOrgTrial(orgRow as OrgTrialFields | null);
        } else setOrgTrial(null);
      } else {
        setUser(null);
        setAuthMeta(null);
      }
    })();
  }, []);

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

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    if (!q) return;
    router.push(`/inventario?q=${encodeURIComponent(q)}`);
    setSearch("");
  };

  const iconBtn =
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-slate-50";

  return (
    <header className="sticky top-0 z-30 hidden min-h-[3.75rem] shrink-0 border-b border-slate-200/80 bg-white/85 text-slate-800 shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/90 dark:text-zinc-100 dark:shadow-[0_1px_0_rgba(0,0,0,0.35)] lg:block">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-2.5 sm:px-6 lg:flex-row lg:items-center lg:justify-end lg:gap-6 lg:px-8">
        <form
          onSubmit={submitSearch}
          className="order-3 flex w-full min-w-0 flex-1 justify-center lg:order-none lg:max-w-3xl"
          role="search"
        >
          <div className="relative w-full">
            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-zinc-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar productos, SKU…"
              className={workspaceFilterSearchPillClass}
              aria-label="Buscar en el panel"
            />
          </div>
        </form>

        <div className="order-2 flex shrink-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2 lg:order-none">
          {user?.email?.toLowerCase() === "bernabe@tech.com" ? (
            <Link
              href={isInterno ? "/dashboard" : "/interno"}
              className="hidden h-9 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-[12px] font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 xl:inline-flex"
              title={isInterno ? "Volver a la plataforma" : "Ir a BackOffice"}
            >
              {isInterno ? "Volver a la plataforma" : "BackOffice"}
            </Link>
          ) : null}
          {trialActive && trialEndsAt ? (
            <div
              className="hidden max-w-[200px] min-w-0 items-center xl:flex"
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
              href={bereaPlanUpgradeWhatsAppUrl()}
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

          <a
            href={programamosWhatsAppUrl("Hola programamos, te escribo desde Oviler…")}
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

          <Link href="/actividades" className={iconBtn} title="Actividades" aria-label="Actividades">
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

          <div className="relative ml-0.5 border-l border-slate-200 pl-2 dark:border-slate-700" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setUserMenuOpen((o) => !o)}
              className="flex items-center gap-2 rounded-lg border border-transparent py-1 pl-1 pr-2 text-slate-800 transition-colors hover:border-slate-200 hover:bg-slate-50 dark:text-white/90 dark:hover:border-white/10 dark:hover:bg-white/10"
              aria-label="Perfil"
              aria-expanded={userMenuOpen}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-slate-200 dark:ring-white/20">
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
                <p className="max-w-[160px] truncate text-[13px] font-medium leading-tight text-slate-900 dark:text-slate-50">
                  {workspaceUserDisplayName(user, authMeta)}
                </p>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{workspaceRoleLabel(user?.role)}</p>
              </div>
              <svg
                className={`h-4 w-4 shrink-0 text-slate-400 transition-transform dark:text-white/50 ${userMenuOpen ? "rotate-180" : ""}`}
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
