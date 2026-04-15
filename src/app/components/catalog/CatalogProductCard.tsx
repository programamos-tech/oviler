"use client";

import { useRouter } from "next/navigation";
import type { CatalogProductRow } from "@/app/components/catalog/catalog-storefront-types";
import type { CartLine } from "@/app/components/catalog/catalog-cart-storage";
import { formatMoney } from "@/lib/format-currency";
import { catalogFocusRing, catalogQtyButtonSm } from "@/app/components/catalog/catalog-ui-classes";

type Props = {
  p: CatalogProductRow;
  slug: string;
  cart: CartLine[];
  setQty: (productId: string, qty: number) => void;
  variant: "surface" | "plain";
};

export function CatalogProductCard({ p, slug, cart, setQty, variant }: Props) {
  const router = useRouter();
  const base =
    variant === "surface"
      ? "border border-slate-200 bg-white shadow-sm dark:border-[rgb(52_52_60)] dark:bg-slate-900"
      : "border border-neutral-200 bg-white shadow-sm dark:border-[rgb(52_52_60)] dark:bg-slate-900";

  const goDetail = () => {
    router.push(`/t/${encodeURIComponent(slug)}/p/${p.id}`);
  };

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={goDetail}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          goDetail();
        }
      }}
      className={`flex cursor-pointer flex-col overflow-hidden rounded-xl ${base} transition-shadow hover:shadow-md ${catalogFocusRing}`}
    >
      <div className="relative aspect-square overflow-hidden bg-slate-100 dark:bg-slate-800">
        {p.image_url ? (
          <img src={p.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">Sin foto</div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        {variant === "surface" && p.brand && (
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{p.brand}</p>
        )}
        <h3 className={`line-clamp-2 text-[14px] font-semibold text-slate-900 dark:text-white ${variant === "surface" && p.brand ? "mt-1" : ""}`}>
          {p.name}
        </h3>
        {variant === "surface" && p.description && (
          <p className="mt-1 line-clamp-1 text-[12px] text-slate-600 dark:text-slate-300">{p.description}</p>
        )}
        <p className="mt-2 text-[18px] font-semibold text-[color:var(--shell-sidebar)] dark:text-zinc-300">{formatMoney(p.unit_price)}</p>
        <p className="text-[11px] text-slate-500">Stock {p.stock}</p>
        <div className="mt-3 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={catalogQtyButtonSm}
            onClick={(e) => {
              e.stopPropagation();
              const cur = cart.find((c) => c.product_id === p.id)?.quantity ?? 0;
              setQty(p.id, cur - 1);
            }}
          >
            −
          </button>
          <span className="w-7 text-center text-sm font-semibold">{cart.find((c) => c.product_id === p.id)?.quantity ?? 0}</span>
          <button
            type="button"
            className={catalogQtyButtonSm}
            onClick={(e) => {
              e.stopPropagation();
              const cur = cart.find((c) => c.product_id === p.id)?.quantity ?? 0;
              setQty(p.id, cur + 1);
            }}
          >
            +
          </button>
        </div>
      </div>
    </article>
  );
}
