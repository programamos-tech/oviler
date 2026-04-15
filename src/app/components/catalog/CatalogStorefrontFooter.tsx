/** Pie del catálogo público: mismo ancho que el header, sin franja vacía infinita. */
export function CatalogStorefrontFooter() {
  return (
    <footer className="mt-12 border-t border-neutral-200 dark:border-[rgb(52_52_60)]">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <p className="text-center text-[11px] leading-snug text-slate-500 dark:text-slate-400">
          Tienda creada con{" "}
          <span className="font-semibold tracking-wide text-[color:var(--shell-sidebar)] dark:text-zinc-300">Oviler</span>
        </p>
      </div>
    </footer>
  );
}
