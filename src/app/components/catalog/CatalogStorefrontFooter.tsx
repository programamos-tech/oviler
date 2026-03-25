/** Pie del catálogo público: mismo ancho que el header, sin franja vacía infinita. */
export function CatalogStorefrontFooter() {
  return (
    <footer className="mt-12 border-t border-neutral-200 dark:border-[rgb(52_52_60)]">
      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
        <p className="text-center text-[11px] leading-snug text-slate-500 dark:text-slate-400">
          Catálogo con tecnología{" "}
          <span className="font-semibold tracking-wide text-ov-pink">NOU</span>
        </p>
      </div>
    </footer>
  );
}
