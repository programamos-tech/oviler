"use client";

import { MdShoppingCart } from "react-icons/md";
import { catalogFocusRing } from "@/app/components/catalog/catalog-ui-classes";

type Props = {
  branch: { name: string; logo_url: string | null };
  cartCount: number;
  onOpenCart: () => void;
};

export function CatalogStorefrontHeader({ branch, cartCount, onOpenCart }: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            {branch.logo_url ? (
              <img
                src={branch.logo_url}
                alt=""
                width={44}
                height={44}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-xs font-bold text-slate-400">{(branch.name || "?").slice(0, 1)}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold tracking-tight text-slate-900 dark:text-white">{branch.name}</p>
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Catálogo <span className="text-ov-pink">NOU</span>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenCart}
          aria-label="Abrir carrito"
          className={`relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ov-pink transition-colors hover:bg-ov-pink/10 ${catalogFocusRing}`}
        >
          <MdShoppingCart className="h-7 w-7" aria-hidden />
          {cartCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-ov-pink px-1 text-[11px] font-bold text-white shadow-sm">
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
