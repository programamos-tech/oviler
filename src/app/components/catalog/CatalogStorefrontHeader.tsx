"use client";

import { MdShoppingCart } from "react-icons/md";
import { catalogFocusRing } from "@/app/components/catalog/catalog-ui-classes";
import { OvilerWordmark } from "@/app/components/OvilerWordmark";

type Props = {
  branch: { name: string; logo_url: string | null };
  cartCount: number;
  onOpenCart: () => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
};

export function CatalogStorefrontHeader({ branch, cartCount, onOpenCart, searchQuery, onSearchChange }: Props) {
  return (
    <header className="sticky top-0 z-40 overflow-hidden border-b border-black/20 bg-[#1e3522] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[#1e3522]" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_115%_72%_at_50%_108%,rgba(211,202,165,0.28),rgba(211,202,165,0.08)_36%,transparent_58%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-36 left-1/2 h-[min(20rem,50vh)] w-[130%] max-w-[360px] -translate-x-1/2 rounded-[100%] bg-[#d3caa5]/[0.2] blur-[44px]"
        aria-hidden
      />

      <div className="relative mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 shrink-0 items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-white/20 bg-white/10">
            {branch.logo_url ? (
              <img
                src={branch.logo_url}
                alt=""
                width={44}
                height={44}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-xs font-bold text-white/70">{(branch.name || "?").slice(0, 1)}</span>
            )}
          </div>
          <div className="min-w-0">
            <OvilerWordmark variant="onDark" className="text-[1.35rem] sm:text-[1.5rem]" />
            <p className="truncate text-[10px] font-medium uppercase tracking-[0.08em] text-white/70">
              {branch.name}
            </p>
          </div>
        </div>

        <div className="relative hidden min-w-0 flex-1 sm:block">
          <svg
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Busca productos, marcas o categorías"
            className="h-10 w-full rounded-full border border-white/20 bg-white/10 pl-10 pr-4 text-[13px] text-white outline-none placeholder:text-white/55 focus:border-slate-400 focus:bg-white/15 focus:ring-2 focus:ring-slate-400/35"
            aria-label="Buscar en la tienda"
          />
        </div>

        <button
          type="button"
          onClick={onOpenCart}
          aria-label="Abrir carrito"
          className={`relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white/90 transition-colors hover:bg-white/12 ${catalogFocusRing}`}
        >
          <MdShoppingCart className="h-6 w-6" aria-hidden />
          {cartCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-300 px-1 text-[11px] font-bold text-slate-900 shadow-sm">
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
