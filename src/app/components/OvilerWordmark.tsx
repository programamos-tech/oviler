/**
 * Lockup Berea + producto. Icono PNG (/ceiling.png) a la izquierda de Berea.
 * En superficies claras el PNG (blanco) se invierte; en oscuro no.
 */
function BereaLogoMark({
  className,
  variant = "onLight",
}: {
  className?: string;
  variant?: "onLight" | "onDark";
}) {
  const imgClass =
    variant === "onDark"
      ? "h-[1.584em] w-auto shrink-0 pointer-events-none select-none object-contain"
      : "h-[1.584em] w-auto shrink-0 invert dark:invert-0 pointer-events-none select-none object-contain";
  return (
    <img
      src="/ceiling.png"
      alt=""
      width={58}
      height={58}
      className={`${imgClass} ${className ?? ""}`.trim()}
    />
  );
}

export function OvilerWordmark({
  className,
  variant = "onLight",
  companyName = "Bernabé",
  productLine = "Comercios",
  /** Solo ícono (/ceiling.png), sin texto Berea / línea / producto */
  markOnly = false,
}: {
  className?: string;
  variant?: "onLight" | "onDark";
  companyName?: string;
  productLine?: string;
  markOnly?: boolean;
}) {
  if (markOnly) {
    return (
      <span className={`inline-flex shrink-0 items-center justify-center ${className ?? ""}`.trim()}>
        <BereaLogoMark variant={variant} className="!h-9 w-auto max-h-9" />
      </span>
    );
  }

  const titleColor = variant === "onDark" ? "text-white" : "text-slate-900 dark:text-white";
  const productMuted = variant === "onDark" ? "text-white/80" : "text-slate-500 dark:text-white/75";
  const dividerClass =
    variant === "onDark" ? "bg-white/25" : "bg-slate-900/20 dark:bg-white/25";

  return (
    <span
      className={`flex min-w-0 max-w-full items-stretch text-left sm:max-w-[15rem] ${titleColor} ${className ?? ""}`.trim()}
    >
      <span className="inline-flex shrink-0 items-stretch gap-[0.06em]">
        <span className="flex items-center">
          <BereaLogoMark variant={variant} />
        </span>
        <span
          className={`w-px shrink-0 self-stretch rounded-full ${dividerClass}`}
          aria-hidden
        />
      </span>
      <span className="flex min-w-0 flex-1 flex-col items-start justify-center gap-[0.16em] pl-[0.32em] leading-none">
        <span className="w-full truncate font-logo tracking-tight">{companyName}</span>
        {productLine ? (
          <span
            className={`w-full truncate font-sans font-semibold uppercase tracking-[0.14em] leading-none text-[0.44em] ${productMuted}`.trim()}
          >
            {productLine}
          </span>
        ) : null}
      </span>
    </span>
  );
}
