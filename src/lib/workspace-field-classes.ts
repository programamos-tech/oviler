/**
 * Clases compartidas para campos del workspace (ERP).
 * Modo claro: foco neutro (referencia tipo landing — negro mate suave).
 * Modo oscuro: zinc neutro, sin anillo verde/azulado en foco.
 */

const lightFocus =
  "focus:border-slate-900/25 focus:bg-white focus:ring-2 focus:ring-slate-900/10";

const darkNeutralField =
  "dark:border-zinc-700/50 dark:bg-zinc-950/60 dark:text-zinc-100 dark:[color-scheme:dark] " +
  "dark:focus:border-zinc-500 dark:focus:bg-zinc-900 dark:focus:ring-0 dark:focus:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] " +
  "dark:focus-visible:ring-1 dark:focus-visible:ring-zinc-500/30 dark:focus-visible:ring-offset-0 dark:focus-visible:ring-offset-transparent";

/** Búsqueda pill (icono a la izquierda, pl-10). */
export const workspaceFilterSearchPillClass =
  "h-10 w-full rounded-full border border-slate-200 bg-slate-50/90 py-2 pl-10 pr-4 text-[13px] text-slate-900 outline-none transition-[border-color,background-color,box-shadow] placeholder:text-slate-400 " +
  `${lightFocus} ${darkNeutralField} dark:placeholder:text-zinc-500`;

/** Búsqueda caja rounded-xl (p. ej. egresos). */
export const workspaceFilterSearchBoxClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-slate-50/90 pl-10 pr-4 text-[13px] text-slate-800 outline-none transition-[border-color,background-color,box-shadow] placeholder:text-slate-500 " +
  `${lightFocus} ${darkNeutralField} dark:placeholder:text-zinc-500`;

/** Selects de filtro (altura fija, ancho completo). */
export const workspaceFilterSelectClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-slate-50/90 px-3 text-[13px] font-medium text-slate-800 outline-none transition-[border-color,background-color,box-shadow] " +
  `${lightFocus} ${darkNeutralField} dark:accent-zinc-500`;

/** Etiquetas sobre filtros (Pago, Estado, etc.). */
export const workspaceFilterLabelClass =
  "block text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-500";

/** Inputs de formularios (configuración de cuenta / sucursal). */
export const workspaceFormInputClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-slate-50/90 px-4 text-[13px] font-medium text-slate-700 outline-none transition-[border-color,background-color,box-shadow] placeholder:text-slate-400 " +
  `${lightFocus} ${darkNeutralField} dark:placeholder:text-zinc-500`;

/** Inputs compactos en grillas (h-9). */
export const workspaceFormInputCompactClass =
  "h-9 w-full rounded-lg border border-slate-200 bg-slate-50/90 px-3 text-[13px] text-slate-800 outline-none transition-[border-color,background-color,box-shadow] " +
  `${lightFocus} ${darkNeutralField}`;

/** Formulario nueva venta / POS: cuerpo 14px, mismo foco oscuro neutro. */
export const workspaceFormInputMdClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-slate-50/90 px-4 text-[14px] font-medium text-slate-800 outline-none transition-[border-color,background-color,box-shadow] placeholder:text-slate-400 " +
  `${lightFocus} ${darkNeutralField} dark:placeholder:text-zinc-500`;
