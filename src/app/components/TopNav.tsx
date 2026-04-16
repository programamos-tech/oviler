"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Notifications from "./Notifications";
import FreeTrialWelcomeModal from "./FreeTrialWelcomeModal";
import { isTrialWelcomeDismissedThisSession, markTrialWelcomeDismissedThisSession } from "@/lib/trial-welcome-storage";
import { type OrgTrialFields, isFreeTrialActive, trialRemainingLabel } from "@/lib/trial-ux";
import { workspaceAvatarSeed } from "./app-nav-data";
import WorkspaceCharacterAvatar from "./WorkspaceCharacterAvatar";
import { workspaceRoleLabel, workspaceUserDisplayName } from "./workspace-title";
import { OvilerWordmark } from "./OvilerWordmark";
import { bernabePlanUpgradeWhatsAppUrl, programamosWhatsAppUrl } from "@/lib/programamos-contact";
import { normalizePlanType } from "@/lib/plan-catalog";
import { LITE_PLAN_DISPLAY_NAME } from "@/lib/license-display";
import { ACTIVE_BRANCH_CHANGED_EVENT, resolveActiveBranchId } from "@/lib/active-branch";
import { GlobalSearchCombobox } from "@/app/components/GlobalSearchCombobox";

/** Iconos en la barra superior móvil (fondo #080910, mismo tono que el sidebar) */
const MOBILE_NAV_ICON =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/75 transition-colors hover:bg-white/12 hover:text-white";
const MOBILE_NAV_PLUS =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#080910] shadow-[0_1px_3px_rgba(0,0,0,0.35)] transition-colors hover:bg-white/90";

export default function TopNav() {
  const pathname = usePathname();
  const isInterno = pathname === "/interno" || pathname.startsWith("/interno/");
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [user, setUser] = useState<{
    name: string;
    email: string;
    avatar_url?: string | null;
    role?: string | null;
    permissions?: string[] | null;
    organization_id?: string | null;
  } | null>(null);
  const [branch, setBranch] = useState<{ name: string; logo_url: string | null } | null>(null);
  const [orgTrial, setOrgTrial] = useState<OrgTrialFields | null>(null);
  const [authMeta, setAuthMeta] = useState<Record<string, unknown> | null>(null);
  const [trialModalOpen, setTrialModalOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: userData } = await supabase
          .from("users")
          .select("name, email, avatar_url, role, permissions, organization_id")
          .eq("id", authUser.id)
          .single();
        if (userData) {
          setUser(userData);
          setAuthMeta((authUser.user_metadata as Record<string, unknown> | null) ?? null);
          const oid = (userData as { organization_id?: string | null }).organization_id;
          if (oid) {
            const { data: orgRow } = await supabase
              .from("organizations")
              .select("subscription_status, plan_type, trial_ends_at")
              .eq("id", oid)
              .maybeSingle();
            setOrgTrial(orgRow as OrgTrialFields | null);
          } else {
            setOrgTrial(null);
          }
        } else {
          setUser(null);
          setAuthMeta(null);
        }
      } else {
        setUser(null);
        setAuthMeta(null);
      }
    }
    loadUser();
  }, []);

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
    async function loadBranch() {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      const resolvedBranchId = await resolveActiveBranchId(supabase, authUser.id);
      if (!resolvedBranchId) return;
      const { data: branchData } = await supabase.from("branches").select("name, logo_url").eq("id", resolvedBranchId).single();
      if (branchData) setBranch({ name: branchData.name, logo_url: branchData.logo_url ?? null });
    }
    const handleBranchChange = () => {
      void loadBranch();
    };
    void loadBranch();
    if (typeof window !== "undefined") {
      window.addEventListener(ACTIVE_BRANCH_CHANGED_EVENT, handleBranchChange);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(ACTIVE_BRANCH_CHANGED_EVENT, handleBranchChange);
      }
    };
  }, [pathname]);

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
    <nav className="sticky top-0 z-50 flex min-w-0 max-w-full flex-col overflow-x-hidden border-b border-white/10 bg-[#080910] pt-[env(safe-area-inset-top,0px)] text-white shadow-[0_4px_24px_rgba(0,0,0,0.35)] lg:hidden">
      <div className="mx-auto flex h-14 min-h-[3.5rem] w-full min-w-0 max-w-[1600px] items-center justify-between gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8">
        {/* Marca producto + logo sucursal */}
        <div className="flex min-w-0 flex-1 items-center justify-start gap-2.5 sm:gap-3">
          <Link
            href="/dashboard"
            className={
              branch
                ? "flex min-w-0 max-w-[min(100%,20rem)] shrink items-center gap-2 rounded-md outline-offset-2 transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/35"
                : "flex min-w-0 shrink items-center rounded-md outline-offset-2 transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/35"
            }
            title={branch?.name ? `Bernabé Comercios · ${branch.name}` : "Bernabé Comercios"}
          >
            <span className="min-w-0 flex-1 overflow-hidden">
              <OvilerWordmark
                variant="onDark"
                companyName="Bernabé"
                className="w-full min-w-0 text-[1.02rem] font-bold sm:text-[1.08rem]"
              />
            </span>
            {branch ? (
              <>
                <span className="h-8 w-px shrink-0 rounded-full bg-white/20" aria-hidden />
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-transparent">
                  {branch.logo_url ? (
                    <img
                      src={branch.logo_url}
                      alt=""
                      className="max-h-full max-w-full object-contain object-center"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-[11px] font-bold text-white/55">
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
              className="hidden h-8 items-center rounded-lg border border-white/20 bg-white/[0.07] px-2.5 text-[11px] font-semibold text-white transition-colors hover:bg-white/[0.12] sm:inline-flex"
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
              <span className="inline-flex max-w-[130px] items-center truncate rounded-lg border border-white/15 bg-white/[0.06] px-2 py-1 text-[10px] font-semibold text-white/90">
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
              className="flex max-w-[11rem] items-center gap-1.5 rounded-lg px-1.5 py-1.5 text-white hover:bg-white/10 sm:max-w-none sm:px-2"
              aria-label="Perfil"
              aria-expanded={userMenuOpen}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-white/15">
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
                <span className="max-w-[140px] truncate text-[13px] font-medium text-white lg:max-w-[180px]">
                  {workspaceUserDisplayName(user, authMeta)}
                </span>
                <span className="max-w-[140px] truncate text-[11px] font-medium text-white/50 lg:max-w-[180px]">
                  {workspaceRoleLabel(user?.role)}
                </span>
              </div>
              <span className="max-w-[5.5rem] truncate text-[12px] font-medium text-white/90 sm:hidden">
                {workspaceUserDisplayName(user, authMeta)}
              </span>
              <svg
                className={`h-4 w-4 shrink-0 text-white/45 transition-transform ${userMenuOpen ? "rotate-180" : ""}`}
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
      <div className="border-t border-white/10 px-4 pb-2.5 pt-2 sm:px-6 sm:pb-2">
        <div className="mx-auto flex max-w-[1600px] min-w-0 flex-row items-center gap-1.5 sm:flex-col sm:items-stretch sm:gap-2 sm:pt-0.5">
          <GlobalSearchCombobox
            formClassName="min-w-0 flex-1 sm:w-full sm:flex-none"
            inputClassName="h-9 w-full min-w-0 rounded-full border border-white/15 bg-white/[0.07] py-1.5 pl-9 pr-2.5 text-[13px] text-white outline-none placeholder:text-white/40 focus:border-white/30 focus:bg-white/[0.1] focus:ring-2 focus:ring-white/15 sm:h-10 sm:pl-9"
            searchIconLeftClass="left-3"
            searchIconClassName="text-white/45"
          />
          <div className="flex shrink-0 items-center justify-end gap-0.5 sm:w-full sm:justify-center sm:gap-2 sm:border-t sm:border-white/10 sm:pt-2">
            <a
              href={programamosWhatsAppUrl("Hola programamos, te escribo desde Oviler…")}
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
