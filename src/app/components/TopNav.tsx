"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getCopy } from "@/app/ventas/sales-mode";
import Notifications from "./Notifications";
import { canAccessNavModule, canAccessPath, type AppRole } from "@/lib/permissions";
import FreeTrialWelcomeModal from "./FreeTrialWelcomeModal";
import { isTrialWelcomeDismissedThisSession, markTrialWelcomeDismissedThisSession } from "@/lib/trial-welcome-storage";
import { type OrgTrialFields, isFreeTrialActive, trialRemainingLabel } from "@/lib/trial-ux";
import { navItems, navPathIsActive, workspaceAvatarSeed } from "./app-nav-data";
import WorkspaceCharacterAvatar from "./WorkspaceCharacterAvatar";
import { workspaceRoleLabel, workspaceUserDisplayName } from "./workspace-title";
import { OvilerWordmark } from "./OvilerWordmark";
import { bereaPlanUpgradeWhatsAppUrl, programamosWhatsAppUrl } from "@/lib/programamos-contact";
import { normalizePlanType } from "@/lib/plan-catalog";
import { LITE_PLAN_DISPLAY_NAME } from "@/lib/license-display";
import { ACTIVE_BRANCH_CHANGED_EVENT, resolveActiveBranchId } from "@/lib/active-branch";

const TOP_ICON_BTN =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-slate-50";

export default function TopNav() {
  const pathname = usePathname();
  const isInterno = pathname === "/interno" || pathname.startsWith("/interno/");
  const router = useRouter();
  const [navSearch, setNavSearch] = useState("");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [user, setUser] = useState<{
    name: string;
    email: string;
    avatar_url?: string | null;
    role?: string | null;
    permissions?: string[] | null;
    organization_id?: string | null;
  } | null>(null);
  const [branch, setBranch] = useState<{ name: string; logo_url: string | null; show_expenses?: boolean; sales_mode?: string } | null>(null);
  const [orgTrial, setOrgTrial] = useState<OrgTrialFields | null>(null);
  const [authMeta, setAuthMeta] = useState<Record<string, unknown> | null>(null);
  const [trialModalOpen, setTrialModalOpen] = useState(false);
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
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
      const { data: branchData } = await supabase.from("branches").select("name, logo_url, show_expenses, sales_mode").eq("id", resolvedBranchId).single();
      if (branchData) setBranch({ name: branchData.name, logo_url: branchData.logo_url ?? null, show_expenses: branchData.show_expenses !== false, sales_mode: (branchData as { sales_mode?: string }).sales_mode });
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

  const submitNavSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = navSearch.trim();
    if (!q) return;
    router.push(`/inventario?q=${encodeURIComponent(q)}`);
    setNavSearch("");
  };

  const role = (user?.role ?? null) as AppRole | null;
  const customPermissions = user?.permissions ?? null;
  const displayNavItems = navItems
    .filter((item) => canAccessNavModule(role, item.label, customPermissions))
    .map((item) => ({
      ...item,
      items: item.items?.filter((subItem) => {
        if (branch && branch.show_expenses === false && subItem.href.startsWith("/egresos")) return false;
        return canAccessPath(role, subItem.href, customPermissions);
      }),
    }))
    .filter((item) => (item.items?.length ?? 0) > 0);

  return (
    <nav className="sticky top-0 z-50 flex flex-col border-b border-slate-200/90 bg-white/90 text-slate-800 shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95 dark:text-zinc-100 dark:shadow-none lg:hidden">
      <div className="mx-auto flex h-14 min-h-[3.5rem] w-full max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Marca producto + logo sucursal */}
        <div className="flex min-w-0 flex-1 items-center justify-start gap-3">
          <Link
            href="/dashboard"
            className={
              branch
                ? "flex min-w-0 max-w-[min(100%,22rem)] shrink items-center gap-2 rounded-md outline-offset-2 transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-900/25 dark:focus-visible:outline-[color:var(--shell-sidebar)]"
                : "flex min-w-0 shrink items-center rounded-md outline-offset-2 transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-900/25 dark:focus-visible:outline-[color:var(--shell-sidebar)]"
            }
            title={branch?.name ? `Bernabé Comercios · ${branch.name}` : "Bernabé Comercios"}
          >
            <span className="min-w-0 flex-1 overflow-hidden">
              <OvilerWordmark
                variant="onLight"
                companyName="Bernabé"
                className="w-full min-w-0 text-[1.05rem] font-bold sm:text-[1.1rem]"
              />
            </span>
            {branch ? (
              <>
                <span
                  className="h-9 w-px shrink-0 rounded-full bg-slate-200/90 dark:bg-white/20"
                  aria-hidden
                />
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                  {branch.logo_url ? (
                    <img
                      src={branch.logo_url}
                      alt=""
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-[11px] font-bold text-slate-400 dark:text-slate-500">
                      {(branch.name || "L").slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
              </>
            ) : null}
          </Link>
        </div>

        {/* Tablet (md–lg): menú arriba solo con iconos, separados. Desktop (lg+): solo texto, sin iconos */}
        <div className="hidden items-center gap-2 md:flex md:gap-3 lg:gap-1 xl:gap-2">
          {displayNavItems.map((item) => {
            const hasDropdown = item.items && item.items.length > 0;
            const isItemActive =
              navPathIsActive(pathname, item.href) ||
              (item.items?.some((sub) => navPathIsActive(pathname, sub.href)) ?? false);
            const isOpen = openDropdown === item.label;
            const navLabel = item.label;

            return (
              <div
                key={item.label}
                className="group relative"
                ref={(el) => {
                  dropdownRefs.current[item.label] = el;
                }}
                onMouseEnter={() => {
                  if (hasDropdown) {
                    setOpenDropdown(item.label);
                  }
                }}
                onMouseLeave={(e) => {
                  // Solo cerrar si el mouse realmente salió del contenedor y no entró al modal
                  if (hasDropdown) {
                    const relatedTarget = e.relatedTarget;
                    const dropdownEl = dropdownRefs.current[item.label];
                    const leftToNonNode = relatedTarget != null && !(relatedTarget instanceof Node);
                    if (dropdownEl && (!relatedTarget || leftToNonNode || !dropdownEl.contains(relatedTarget as Node))) {
                      setOpenDropdown(null);
                    }
                  }
                }}
              >
                {hasDropdown ? (
                  <>
                    <Link
                      href={item.href}
                      title={navLabel}
                      aria-label={navLabel}
                      className={`flex items-center gap-1 rounded-lg px-2 py-2 text-[13px] font-medium transition-colors md:px-3 md:py-2.5 lg:px-4 lg:py-2 xl:text-[14px] ${
                        isItemActive
                          ? "bg-slate-200/70 text-[color:var(--shell-sidebar)] ring-1 ring-[color:var(--shell-sidebar-accent)] dark:bg-white/10 dark:text-zinc-300 dark:ring-zinc-500/35"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50"
                      }`}
                    >
                      <span className="lg:hidden">{item.icon}</span>
                      <span className="hidden lg:inline">{navLabel}</span>
                      <svg
                        className={`hidden h-3 w-3 shrink-0 lg:block transition-transform ${isOpen ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </Link>
                    {isOpen && (
                      <>
                        {/* Puente invisible para que el hover no se pierda al bajar el ratón al dropdown */}
                        <div className="absolute left-0 top-full z-50 h-2 w-80" aria-hidden />
                        <div 
                          className="absolute left-0 top-full z-50 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-800"
                          onMouseEnter={() => setOpenDropdown(item.label)}
                          onMouseLeave={(e) => {
                            const relatedTarget = e.relatedTarget as HTMLElement;
                            const dropdownEl = dropdownRefs.current[item.label];
                            if (dropdownEl && relatedTarget && !dropdownEl.contains(relatedTarget)) {
                              setOpenDropdown(null);
                            }
                          }}
                        >
                        <div className="space-y-1">
                          {item.items?.map((subItem) => {
                            const isSubItemActive = navPathIsActive(pathname, subItem.href);
                            const salesCopy =
                              (subItem.href === "/ventas" || subItem.href === "/ventas/nueva") && branch?.sales_mode
                                ? getCopy(branch.sales_mode as "sales" | "orders")
                                : null;
                            const subLabel =
                              salesCopy && subItem.href === "/ventas"
                                ? salesCopy.sectionTitle
                                : salesCopy && subItem.href === "/ventas/nueva"
                                  ? salesCopy.newButton
                                  : subItem.label;
                            const subDescription = salesCopy && subItem.href === "/ventas" ? (branch?.sales_mode === "orders" ? "Lista de todos los pedidos" : "Lista de todas las ventas") : salesCopy && subItem.href === "/ventas/nueva" ? (branch?.sales_mode === "orders" ? "Registrar nuevo pedido" : "Registrar nueva venta") : subItem.description;
                            return (
                              <Link
                                key={subItem.href}
                                href={subItem.href}
                                onClick={() => setOpenDropdown(null)}
                                className={`flex items-start gap-3 rounded-lg px-4 py-3 transition-colors ${
                                  isSubItemActive
                                    ? "bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-slate-50"
                                    : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-50"
                                }`}
                              >
                                <div className="shrink-0 flex items-center justify-center text-slate-500 dark:text-slate-400">
                                  {subItem.icon ?? <span className="h-6 w-6" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className={`text-[14px] font-semibold leading-tight ${isSubItemActive ? "text-slate-900 dark:text-slate-50" : "text-slate-900 dark:text-slate-100"}`}>
                                    {subLabel}
                                  </div>
                                  {(subDescription ?? subItem.description) && (
                                    <div className={`mt-0.5 text-[12px] leading-tight ${
                                      isSubItemActive
                                        ? "text-slate-600 dark:text-slate-300"
                                        : "text-slate-500 dark:text-slate-400"
                                    }`}>
                                      {subDescription ?? subItem.description}
                                    </div>
                                  )}
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                      </>
                    )}
                  </>
                ) : (
                  <Link
                    href={item.href}
                    title={navLabel}
                    aria-label={navLabel}
                    className={`flex items-center gap-1 rounded-lg px-2 py-2 text-[13px] font-medium transition-colors md:px-3 md:py-2.5 lg:px-4 lg:py-2 xl:text-[14px] ${
                      isItemActive
                        ? "bg-slate-200/70 text-[color:var(--shell-sidebar)] ring-1 ring-[color:var(--shell-sidebar-accent)] dark:bg-white/10 dark:text-zinc-300 dark:ring-zinc-500/35"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50"
                    }`}
                  >
                    <span className="lg:hidden">{item.icon}</span>
                    <span className="hidden lg:inline">{navLabel}</span>
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        {trialActive && trialEndsAt ? (
          <div
            className="hidden min-w-0 shrink-0 items-center lg:flex"
            title={`${LITE_PLAN_DISPLAY_NAME} · ${trialRemainingLabel(trialEndsAt)} restantes`}
          >
            <span className="inline-flex max-w-[220px] items-center gap-1.5 truncate rounded-lg border border-nou-200 bg-nou-50 px-2.5 py-1.5 text-[11px] font-semibold leading-none text-nou-800 dark:border-nou-400/35 dark:bg-nou-500/15 dark:text-nou-200">
              <span className="shrink-0" aria-hidden>
                ⏱
              </span>
              <span className="min-w-0 truncate">
                {LITE_PLAN_DISPLAY_NAME} · <span className="tabular-nums">{trialRemainingLabel(trialEndsAt)}</span>
              </span>
            </span>
          </div>
        ) : null}

        {/* Right: notificaciones y usuario (visible en mobile, tablet y desktop) */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {orgTrial && normalizePlanType(orgTrial.plan_type ?? "") === "free" ? (
            <a
              href={bereaPlanUpgradeWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className={TOP_ICON_BTN}
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
              className="hidden h-8 items-center rounded-lg border border-ov-pink/35 bg-ov-pink/[0.08] px-3 text-[12px] font-semibold text-ov-pink transition-colors hover:bg-ov-pink/[0.16] sm:inline-flex"
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
              <span className="inline-flex max-w-[130px] items-center truncate rounded-lg border border-nou-200 bg-nou-50 px-2 py-1 text-[10px] font-semibold text-nou-800 dark:border-nou-400/35 dark:bg-nou-500/15 dark:text-nou-200">
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
            className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-[color:var(--shell-sidebar)] dark:hover:bg-[color:var(--shell-sidebar-cta-hover)] sm:flex"
            title="Nueva venta"
            aria-label="Nueva venta"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </Link>
          <Notifications tone="light" />
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setUserMenuOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-slate-800 hover:bg-slate-50 dark:text-white/90 dark:hover:bg-white/10"
              aria-label="Perfil"
              aria-expanded={userMenuOpen}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full">
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
                <span className="max-w-[140px] truncate text-[13px] font-medium text-slate-800 dark:text-slate-100 lg:max-w-[180px]">
                  {workspaceUserDisplayName(user, authMeta)}
                </span>
                <span className="max-w-[140px] truncate text-[11px] font-medium text-slate-500 dark:text-slate-400 lg:max-w-[180px]">
                  {workspaceRoleLabel(user?.role)}
                </span>
              </div>
              <span className="max-w-[100px] truncate text-[13px] font-medium text-slate-800 dark:text-slate-100 sm:hidden">
                {workspaceUserDisplayName(user, authMeta)}
              </span>
              <svg
                className={`h-4 w-4 shrink-0 text-slate-400 transition-transform dark:text-white/50 ${userMenuOpen ? "rotate-180" : ""}`}
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

      <div className="border-t border-slate-100 px-4 pb-2.5 pt-2 dark:border-slate-800 sm:px-6">
        <div className="mx-auto flex max-w-[1600px] items-center gap-2">
          <form onSubmit={submitNavSearch} className="min-w-0 flex-1" role="search">
            <div className="relative">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="search"
                value={navSearch}
                onChange={(e) => setNavSearch(e.target.value)}
                placeholder="Buscar productos, SKU…"
                className="h-9 w-full rounded-full border border-slate-200 bg-slate-50/90 py-1.5 pl-9 pr-3 text-[13px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-900/25 focus:bg-white focus:ring-2 focus:ring-slate-900/10 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-100 dark:focus:border-zinc-500"
                aria-label="Buscar"
              />
            </div>
          </form>
          <Link
            href="/ventas/nueva"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-[color:var(--shell-sidebar)] dark:hover:bg-[color:var(--shell-sidebar-cta-hover)] sm:hidden"
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
            className={TOP_ICON_BTN}
            title="Ayuda"
            aria-label="Ayuda"
          >
            <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </a>
          <Link href="/actividades" className={TOP_ICON_BTN} title="Actividades" aria-label="Actividades">
            <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </Link>
          <Link href="/cuenta" className={TOP_ICON_BTN} title="Cuenta" aria-label="Cuenta">
            <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>
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
