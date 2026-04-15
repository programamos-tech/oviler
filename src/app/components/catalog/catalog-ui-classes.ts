/**
 * Foco accesible en catálogo / storefront sin anillo azul (Tailwind default / --primary).
 * Usar en botones y elementos interactivos bajo /t/*
 */
export const catalogFocusRing =
  "outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/55 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent";

/** Botones − / + en tarjetas de listado */
export const catalogQtyButtonSm =
  `rounded-lg border border-slate-300 bg-transparent px-3 py-1.5 text-sm text-slate-900 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800/80 ${catalogFocusRing}`;

/** Botones − / + en ficha de producto */
export const catalogQtyButtonMd =
  `rounded-lg border border-slate-300 bg-transparent px-4 py-2 text-sm text-slate-900 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800/80 ${catalogFocusRing}`;
