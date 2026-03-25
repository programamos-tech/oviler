"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { MdClose, MdShoppingCart } from "react-icons/md";
import { saveCart, type CartLine } from "@/app/components/catalog/catalog-cart-storage";
import { formatMoney } from "@/lib/format-currency";
import type { CatalogProductRow } from "@/app/components/catalog/catalog-storefront-types";
import { catalogFocusRing } from "@/app/components/catalog/catalog-ui-classes";

type Props = {
  slug: string;
  open: boolean;
  onClose: () => void;
  cart: CartLine[];
  productById: Map<string, CatalogProductRow>;
  cartTotal: number;
};

export function CatalogCartDrawer({ slug, open, onClose, cart, productById, cartTotal }: Props) {
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal aria-labelledby="catalog-cart-title">
      <button
        type="button"
        aria-label="Cerrar carrito"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity dark:bg-black/60"
        onClick={onClose}
      />
      <aside
        id="catalog-cart-panel"
        className="catalog-cart-drawer-panel absolute right-0 top-0 z-10 flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <MdShoppingCart className="h-6 w-6 text-ov-pink" aria-hidden />
            <h2 id="catalog-cart-title" className="text-lg font-bold text-slate-900 dark:text-white">
              Tu pedido
            </h2>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            className={`inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 ${catalogFocusRing}`}
            onClick={onClose}
          >
            <MdClose className="h-6 w-6" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Aún no agregas productos.</p>
          ) : (
            <ul className="space-y-4">
              {cart.map((line) => {
                const p = productById.get(line.product_id);
                if (!p) return null;
                return (
                  <li
                    key={line.product_id}
                    className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-700/80 dark:bg-slate-800/50"
                  >
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-200 dark:bg-slate-700">
                      {p.image_url ? (
                        <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] text-slate-400">Sin foto</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold leading-snug text-slate-900 dark:text-slate-100">{p.name}</p>
                      <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                        {formatMoney(p.unit_price)} × {line.quantity}
                      </p>
                      <p className="mt-1 text-sm font-bold text-ov-pink">{formatMoney(p.unit_price * line.quantity)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="border-t border-slate-200 p-4 dark:border-slate-700">
          <div className="mb-3 flex justify-between text-base font-bold text-slate-900 dark:text-white">
            <span>Total</span>
            <span className="tabular-nums text-ov-pink">{formatMoney(cartTotal)}</span>
          </div>
          <button
            type="button"
            disabled={cart.length === 0}
            onClick={() => {
              saveCart(slug, cart);
              onClose();
              router.push(`/t/${encodeURIComponent(slug)}/checkout`);
            }}
            className={`w-full rounded-xl bg-ov-pink py-3 text-center text-sm font-bold text-white shadow hover:bg-ov-pink-hover disabled:opacity-40 ${catalogFocusRing}`}
          >
            Continuar al pago
          </button>
        </div>
      </aside>
    </div>
  );
}
