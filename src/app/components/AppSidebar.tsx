"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCopy } from "@/app/ventas/sales-mode";
import { canAccessNavModule, canAccessPath, type AppRole } from "@/lib/permissions";
import type { ReactNode } from "react";
import { navItems, navPathIsActive, type NavItem } from "./app-nav-data";
import { OvilerWordmark } from "./OvilerWordmark";
import { ACTIVE_BRANCH_CHANGED_EVENT, resolveActiveBranchId } from "@/lib/active-branch";

const SIDEBAR_COLLAPSED_KEY = "nou.sidebar.collapsedSections";

function readCollapsedFromStorage(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function writeCollapsedToStorage(set: Set<string>) {
  try {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

export default function AppSidebar() {
  const pathname = usePathname();
  const isInterno = pathname === "/interno" || pathname.startsWith("/interno/");
  const [user, setUser] = useState<{
    name: string;
    email: string;
    role?: string | null;
    permissions?: string[] | null;
  } | null>(null);
  const [branch, setBranch] = useState<{ name: string; logo_url: string | null; show_expenses?: boolean; sales_mode?: string } | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      const { data: userData } = await supabase
        .from("users")
        .select("name, email, role, permissions")
        .eq("id", authUser.id)
        .single();
      if (userData) setUser(userData as typeof user);
    })();
  }, []);

  useEffect(() => {
    const loadBranch = async () => {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      const resolvedBranchId = await resolveActiveBranchId(supabase, authUser.id);
      if (!resolvedBranchId) return;
      const { data: branchData } = await supabase
        .from("branches")
        .select("name, logo_url, show_expenses, sales_mode")
        .eq("id", resolvedBranchId)
        .single();
      if (branchData) {
        setBranch({
          name: branchData.name,
          logo_url: branchData.logo_url ?? null,
          show_expenses: branchData.show_expenses !== false,
          sales_mode: (branchData as { sales_mode?: string }).sales_mode,
        });
      }
    };
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

  const role = (user?.role ?? null) as AppRole | null;
  const customPermissions = user?.permissions ?? null;
  const appNavItems = navItems
    .filter((item) => canAccessNavModule(role, item.label, customPermissions))
    .map((item) => ({
      ...item,
      items: item.items?.filter((subItem) => {
        if (branch && branch.show_expenses === false && subItem.href.startsWith("/egresos")) return false;
        return canAccessPath(role, subItem.href, customPermissions);
      }),
    }))
    .filter((item) => (item.items?.length ?? 0) > 0);
  const internalNavItems: NavItem[] = [
    {
      label: "BACKOFFICE",
      href: "/interno",
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      ),
      items: [
        {
          label: "Clientes plataforma",
          href: "/interno",
          icon: (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
            </svg>
          ),
          description: "Activación y gestión de licencias",
        },
      ],
    },
  ];
  const displayNavItems = isInterno ? internalNavItems : appNavItems;

  const [collapsedModules, setCollapsedModules] = useState<Set<string>>(() => new Set());
  const [collapsedReady, setCollapsedReady] = useState(false);

  useEffect(() => {
    setCollapsedModules(readCollapsedFromStorage());
    setCollapsedReady(true);
  }, []);

  const modulesKey = displayNavItems.map((i) => i.label).join("|");

  useEffect(() => {
    if (!collapsedReady) return;
    setCollapsedModules((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const item of displayNavItems) {
        const subs = item.items ?? [];
        if (subs.some((sub) => navPathIsActive(pathname, sub.href)) && next.has(item.label)) {
          next.delete(item.label);
          changed = true;
        }
      }
      if (changed) writeCollapsedToStorage(next);
      return changed ? next : prev;
    });
  }, [pathname, collapsedReady, modulesKey]);

  const toggleModule = useCallback((label: string) => {
    setCollapsedModules((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      writeCollapsedToStorage(next);
      return next;
    });
  }, []);

  const linkSub = (subHref: string, subLabel: string, subIcon?: ReactNode) => {
    const active = navPathIsActive(pathname, subHref);
    return (
      <Link
        key={subHref + subLabel}
        href={subHref}
        className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] transition-colors ${
          active
            ? "font-medium bg-[rgb(24_27_34)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ring-1 ring-[rgb(48_52_62)]"
            : "text-white/65 hover:bg-white/[0.06] hover:text-white/95"
        }`}
      >
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center [&>svg]:h-4 [&>svg]:w-4 ${
            active ? "text-white/90" : "text-white/40"
          }`}
        >
          {subIcon ?? <span className="block h-1 w-1 rounded-full bg-white/30" />}
        </span>
        <span className="min-w-0 truncate">{subLabel}</span>
      </Link>
    );
  };

  /** Sección del shell: cabecera plegable + enlaces. */
  const moduleBlock = (item: NavItem, showSpacing: boolean) => {
    const subs = item.items ?? [];
    const parentActive = subs.some((sub) => navPathIsActive(pathname, sub.href));
    const salesCopy =
      item.label === "COMERCIAL" && branch?.sales_mode
        ? getCopy(branch.sales_mode as "sales" | "orders")
        : null;
    if (subs.length === 0) return null;

    const collapsed = collapsedModules.has(item.label);
    const panelId = `sidebar-mod-${item.label.replace(/[^\w\u00C0-\u024f]+/g, "-").replace(/^-|-$/g, "")}`;

    return (
      <div key={item.label} className={showSpacing ? "mt-5" : ""}>
        <button
          type="button"
          id={`${panelId}-btn`}
          className={`mb-1 flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider transition-colors hover:bg-white/[0.06] ${
            parentActive ? "text-white/75" : "text-white/40"
          }`}
          aria-expanded={!collapsed}
          aria-controls={panelId}
          onClick={() => toggleModule(item.label)}
        >
          <svg
            className={`h-3.5 w-3.5 shrink-0 text-white/45 transition-transform ${collapsed ? "-rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <span className="flex h-4 w-4 shrink-0 items-center justify-center text-white/35 [&>svg]:h-3.5 [&>svg]:w-3.5">
            {item.icon}
          </span>
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
        </button>
        <div id={panelId} role="region" aria-labelledby={`${panelId}-btn`} hidden={collapsed} className="space-y-0">
          {subs.map((sub) => {
            const subLabel =
              salesCopy && sub.href === "/ventas"
                ? salesCopy.sectionTitle
                : sub.href === "/ventas/nueva"
                  ? salesCopy?.newButton ?? sub.label
                  : sub.label;
            return linkSub(sub.href, subLabel, sub.icon);
          })}
        </div>
      </div>
    );
  };

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col overflow-hidden border-r border-slate-800 bg-[#080910] text-white shadow-none lg:flex"
      aria-label="Navegación principal"
    >
      {/* Barra lateral siempre oscura: mismo tono con o sin modo oscuro del resto de la app. */}
      <div className="pointer-events-none absolute inset-0 bg-[#080910]" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.2] dark-app-canvas-glow"
        aria-hidden
      />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-slate-800/80 px-3 py-3.5">
          <Link
            href="/dashboard"
            className="mx-auto flex w-full items-center justify-center rounded-xl px-2 py-2 outline-offset-2 transition-colors hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/35"
            title={isInterno ? "Bernabé BackOffice" : "Bernabé Comercios"}
          >
            <span className="min-w-0 shrink-0">
              <OvilerWordmark
                variant="onDark"
                companyName="Bernabé"
                productLine={isInterno ? "BackOffice" : "Comercios"}
                className="text-[1.2rem] font-bold leading-none sm:text-[1.38rem] lg:text-[1.52rem]"
              />
            </span>
          </Link>
        </div>

        <nav
          className="sidebar-nav-scroll min-h-0 flex-1 overflow-y-auto px-1 py-2 [scrollbar-color:rgba(255,255,255,0.18)_transparent] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/[0.16] [&::-webkit-scrollbar-thumb:hover]:bg-white/[0.26]"
        >
          {!isInterno && branch ? (
            <div className="mb-3 flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                {branch.logo_url ? (
                  <img
                    src={branch.logo_url}
                    alt=""
                    width={32}
                    height={32}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-[12px] font-bold text-white/75">
                    {(branch.name || "?").slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">Negocio</p>
                <p className="truncate text-[12px] font-medium text-white/85">{branch.name}</p>
              </div>
            </div>
          ) : null}
          <div className="space-y-0">{displayNavItems.map((item, idx) => moduleBlock(item, idx > 0))}</div>
        </nav>
      </div>
    </aside>
  );
}
