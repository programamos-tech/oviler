"use client";

/** Iconos por nivel: bodega → piso → zona → pasillo → ubicación */
const LEVEL_ICONS = ["warehouse", "layers", "grid_on", "view_agenda", "inventory_2"] as const;

type Props = {
  path: string;
  className?: string;
  /** Tamaño del icono (ej. text-base, text-sm) */
  iconClass?: string;
};

/**
 * Muestra una ruta de ubicación (ej. "Bodega Norte → Piso 1 → Zona Seca → Pasillo 1 → Estante A")
 * con un icono por nivel para guiar visualmente.
 */
export default function LocationPathWithIcons({ path, className = "", iconClass = "text-[14px]" }: Props) {
  const segments = path.split(" → ").filter(Boolean);
  if (segments.length === 0) return null;

  return (
    <span className={`inline-flex flex-wrap items-center gap-x-1 gap-y-0.5 ${className}`}>
      {segments.map((label, i) => {
        const icon = LEVEL_ICONS[Math.min(i, LEVEL_ICONS.length - 1)];
        return (
          <span key={i} className="inline-flex items-center gap-1">
            {i > 0 && (
              <span className="text-slate-400 dark:text-slate-500" aria-hidden>
                →
              </span>
            )}
            <span className="inline-flex items-center gap-1" title={label}>
              <span
                className={`material-symbols-outlined shrink-0 text-slate-500 dark:text-slate-400 ${iconClass}`}
                aria-hidden
              >
                {icon}
              </span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{label}</span>
            </span>
          </span>
        );
      })}
    </span>
  );
}
