"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { prefetchModuleList } from "@/lib/module-list-prefetch";
import { canAccessNavModule, canAccessPath, type AppRole } from "@/lib/permissions";
import { workspaceHelpWhatsAppUrl } from "@/lib/programamos-contact";
import type { ReactNode } from "react";
import {
  navPathIsActive,
  sidebarNavEntries,
  type NavItem,
  type SidebarNavEntry,
} from "./app-nav-data";
import { useSession } from "./SessionProvider";

const SIDEBAR_EXPANDED_KEY = "nou.sidebar.expandedGroups";

function readExpandedFromStorage(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(SIDEBAR_EXPANDED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function writeExpandedToStorage(set: Set<string>) {
  try {
    window.localStorage.setItem(SIDEBAR_EXPANDED_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

function SidebarChevronDown({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function SidebarChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function SidebarHouseIcon() {
  return (
    <span className="sidebar-icon-box sidebar-nav-icon flex h-9 w-9 shrink-0 items-center justify-center border border-[var(--shell-nav-border)] bg-[var(--shell-nav-card-bg)] text-[var(--shell-nav-fg-subtle)]">
      <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    </span>
  );
}

function SidebarSproutIcon() {
  return (
    <span className="sidebar-nav-icon flex h-9 w-9 shrink-0 items-center justify-center text-[var(--shell-nav-fg-subtle)]">
      <svg className="h-[20px] w-[20px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3c-3.5 2.2-5.5 5.2-5.5 8.5a5.5 5.5 0 0011 0C17.5 8.2 15.5 5.2 12 3z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14v4M9 18h6" />
      </svg>
    </span>
  );
}

const navItemBase =
  "sidebar-nav-row flex w-full items-center gap-3 px-3 py-[10px] text-[14px] leading-snug transition-colors duration-150";
const navItemIdle = "font-medium text-[var(--shell-nav-fg-muted)] hover:bg-[var(--shell-nav-hover-bg)] hover:text-[var(--shell-nav-fg)]";
const navItemActive = "sidebar-nav-item--active font-medium text-[var(--shell-nav-fg)]";

export default function AppSidebar() {
  const pathname = usePathname();
  const isInterno = pathname === "/interno" || pathname.startsWith("/interno/");
  const { profile, branch } = useSession();
  const user = profile
    ? {
        name: profile.name,
        email: profile.email,
        role: profile.role,
        permissions: profile.permissions,
        avatar_url: profile.avatar_url,
      }
    : null;

  const role = (user?.role ?? null) as AppRole | null;
  const customPermissions = user?.permissions ?? null;

  const appSidebarEntries = useMemo((): SidebarNavEntry[] => {
    const result: SidebarNavEntry[] = [];
    for (const entry of sidebarNavEntries) {
      if (branch && branch.show_expenses === false && entry.href.startsWith("/egresos")) continue;
      if (!canAccessNavModule(role, entry.navModule, customPermissions)) continue;
      const children = (entry.children ?? []).filter((child) => {
        if (branch && branch.show_expenses === false && child.href.startsWith("/egresos")) return false;
        return canAccessPath(role, child.href, customPermissions);
      });
      const selfAllowed = canAccessPath(role, entry.href, customPermissions);
      if (!selfAllowed && children.length === 0) continue;
      result.push({ ...entry, children: children.length > 0 ? children : undefined });
    }
    return result;
  }, [role, customPermissions, branch]);

  const internalNavItems: NavItem[] = [
    {
      label: "BACKOFFICE",
      href: "/interno",
      icon: (
        <svg className="h-[22px] w-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      ),
      items: [
        {
          label: "Clientes plataforma",
          href: "/interno",
          description: "Activación y gestión de licencias",
        },
      ],
    },
  ];

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set());
  const [expandedReady, setExpandedReady] = useState(false);

  useEffect(() => {
    setExpandedGroups(readExpandedFromStorage());
    setExpandedReady(true);
  }, []);

  useEffect(() => {
    if (!expandedReady || isInterno) return;
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const entry of appSidebarEntries) {
        const children = entry.children ?? [];
        const childActive = children.some((c) => navPathIsActive(pathname, c.href));
        if (childActive && !next.has(entry.label)) {
          next.add(entry.label);
          changed = true;
        }
      }
      if (changed) writeExpandedToStorage(next);
      return changed ? next : prev;
    });
  }, [pathname, expandedReady, isInterno, appSidebarEntries]);

  const toggleGroup = useCallback((label: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      writeExpandedToStorage(next);
      return next;
    });
  }, []);

  const prefetchNav = useCallback(
    (href: string) => {
      prefetchModuleList(href, branch?.id, branch?.sales_mode);
    },
    [branch?.id, branch?.sales_mode]
  );

  const renderNavLink = (href: string, label: string, icon: ReactNode, active: boolean, indent = false) => (
    <Link
      key={href + label}
      href={href}
      prefetch
      onMouseEnter={() => prefetchNav(href)}
      onFocus={() => prefetchNav(href)}
      className={`${navItemBase} ${indent ? "pl-11 pr-3 py-2 text-[12px]" : ""} ${
        active ? navItemActive : navItemIdle
      }`}
    >
      {!indent ? (
        <span
          className={`sidebar-nav-icon flex shrink-0 items-center justify-center ${
            active ? "text-[var(--shell-nav-fg)]" : "text-[var(--shell-nav-fg-subtle)]"
          }`}
        >
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </Link>
  );

  const renderEntry = (entry: SidebarNavEntry) => {
    const children = entry.children ?? [];
    const hasChildren = children.length > 0;
    const childActive = children.some((c) => navPathIsActive(pathname, c.href));
    const parentActive = navPathIsActive(pathname, entry.href) || childActive;
    const expanded = expandedGroups.has(entry.label);
    const panelId = `sidebar-${entry.label.replace(/\s+/g, "-").toLowerCase()}`;

    if (!hasChildren) {
      return renderNavLink(entry.href, entry.label, entry.icon, parentActive);
    }

    return (
      <div key={entry.label} className="space-y-0.5">
        <div className={`${navItemBase} ${parentActive ? navItemActive : navItemIdle}`}>
          <Link
            href={entry.href}
            prefetch
            onMouseEnter={() => prefetchNav(entry.href)}
            onFocus={() => prefetchNav(entry.href)}
            className="flex min-w-0 flex-1 items-center gap-3"
          >
            <span
              className={`sidebar-nav-icon flex shrink-0 items-center justify-center ${
                parentActive ? "text-[var(--shell-nav-fg)]" : "text-[var(--shell-nav-fg-subtle)]"
              }`}
            >
              {entry.icon}
            </span>
            <span className="min-w-0 flex-1 truncate">{entry.label}</span>
          </Link>
          <button
            type="button"
            id={`${panelId}-btn`}
            className="-mr-1 flex shrink-0 items-center justify-center rounded-[3px] p-1 text-[var(--shell-nav-fg-subtle)] transition-colors hover:text-[var(--shell-nav-fg)]"
            aria-expanded={expanded}
            aria-controls={panelId}
            aria-label={expanded ? `Ocultar menú de ${entry.label}` : `Mostrar menú de ${entry.label}`}
            onClick={() => toggleGroup(entry.label)}
          >
            {expanded ? (
              <SidebarChevronDown className="h-4 w-4" />
            ) : (
              <SidebarChevronRight className="h-4 w-4" />
            )}
          </button>
        </div>
        <div id={panelId} role="region" aria-labelledby={`${panelId}-btn`} hidden={!expanded} className="space-y-0.5">
          {children.map((child) =>
            renderNavLink(
              child.href,
              child.label,
              null,
              navPathIsActive(pathname, child.href),
              true
            )
          )}
        </div>
      </div>
    );
  };

  const internoLink = (subHref: string, subLabel: string) => {
    const active = navPathIsActive(pathname, subHref);
    return (
      <Link
        key={subHref}
        href={subHref}
        className={`${navItemBase} ${active ? navItemActive : navItemIdle}`}
      >
        <span className="min-w-0 flex-1 truncate">{subLabel}</span>
      </Link>
    );
  };

  return (
    <aside
      className="shell-sidebar fixed inset-y-0 left-0 z-40 hidden h-screen w-[272px] flex-col overflow-hidden border-r border-[var(--shell-nav-border)] bg-[var(--shell-nav-bg)] pb-3 pt-4 text-[var(--shell-nav-fg)] lg:flex"
      aria-label="Navegación principal"
    >
      <header className="sidebar-header shrink-0 px-4">
        <div className="sidebar-logo-wrap">
          <Link
            href={isInterno ? "/interno" : "/dashboard"}
            className="sidebar-logo-link outline-offset-4 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--shell-nav-fg)]/35"
            title={isInterno ? "Bernabé BackOffice" : "Bernabé Comercios"}
            aria-label="Berea — Ir al inicio"
          >
            <span className="sidebar-logo-crop">
              <img src="/logo-berea.2.png" alt="" className="sidebar-logo-img" decoding="async" />
            </span>
          </Link>
        </div>

        {!isInterno && branch ? (
          <Link
            href="/sucursales"
            className="sidebar-card flex items-center gap-3 border border-[var(--shell-nav-border)] bg-[var(--shell-nav-card-bg)] px-3 py-2.5 transition-colors hover:bg-[var(--shell-nav-hover-bg)]"
          >
            {branch.logo_url ? (
              <div className="sidebar-icon-box flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden border border-[var(--shell-nav-border)] bg-[var(--shell-nav-card-bg)]">
                <img
                  src={branch.logo_url}
                  alt=""
                  width={36}
                  height={36}
                  className="max-h-full max-w-full object-contain object-center"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <SidebarHouseIcon />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium leading-tight text-[var(--shell-nav-fg)]">{branch.name}</p>
              <p className="truncate text-[11px] leading-tight text-[var(--shell-nav-fg-muted)]">Sucursal activa</p>
            </div>
            <SidebarChevronDown className="h-4 w-4 shrink-0 text-[var(--shell-nav-fg-subtle)]" />
          </Link>
        ) : null}
      </header>

      <nav
        className="sidebar-menu sidebar-nav-scroll flex min-h-0 flex-1 flex-col justify-evenly overflow-y-auto overflow-x-hidden px-4 py-2"
        aria-label="Menú del panel"
      >
        {isInterno
          ? internalNavItems.flatMap((item) => (item.items ?? []).map((sub) => internoLink(sub.href, sub.label)))
          : appSidebarEntries.map((entry) => <div key={entry.label}>{renderEntry(entry)}</div>)}
      </nav>

      {!isInterno ? (
        <footer className="sidebar-footer shrink-0 border-t border-[var(--shell-nav-border)] px-4 py-3">
          <a
            href={workspaceHelpWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="sidebar-card flex items-center gap-3 border border-[var(--shell-nav-border)] bg-[var(--shell-nav-card-bg)] px-3 py-2.5 transition-colors hover:bg-[var(--shell-nav-hover-bg)]"
          >
            <SidebarSproutIcon />
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] font-medium leading-tight text-[var(--shell-nav-fg)]">
                ¿Necesitas ayuda?
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug text-[var(--shell-nav-fg-muted)]">
                Escríbenos, estamos para apoyarte.
              </span>
            </span>
            <svg
              className="h-4 w-4 shrink-0 text-[var(--shell-nav-fg-subtle)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </a>
        </footer>
      ) : null}
    </aside>
  );
}
