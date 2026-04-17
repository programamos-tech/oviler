const DEFAULT_LOGO_SRC = "/ceiling.png";

/**
 * Lockup marca + producto. Por defecto icono `/ceiling.png`; en superficies claras se invierte.
 * Con `logoSrc` personalizado no se aplica inversión (p. ej. ilustraciones a color).
 */
function BrandLogoMark({
  className,
  variant = "onLight",
  src = DEFAULT_LOGO_SRC,
}: {
  className?: string;
  variant?: "onLight" | "onDark";
  src?: string;
}) {
  const custom = src !== DEFAULT_LOGO_SRC;
  const imgClass = custom
    ? "h-[1.584em] w-auto shrink-0 pointer-events-none select-none object-contain"
    : variant === "onDark"
      ? "h-[1.584em] w-auto shrink-0 pointer-events-none select-none object-contain"
      : "h-[1.584em] w-auto shrink-0 invert dark:invert-0 pointer-events-none select-none object-contain";
  return (
    <img
      src={src}
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
  /** Ruta del PNG del lockup; por defecto `/ceiling.png` */
  logoSrc,
  /** Solo ícono, sin texto de marca / línea / producto */
  markOnly = false,
}: {
  className?: string;
  variant?: "onLight" | "onDark";
  companyName?: string;
  productLine?: string;
  logoSrc?: string;
  markOnly?: boolean;
}) {
  const logo = logoSrc ?? DEFAULT_LOGO_SRC;

  if (markOnly) {
    return (
      <span className={`inline-flex shrink-0 items-center justify-center ${className ?? ""}`.trim()}>
        <BrandLogoMark src={logo} variant={variant} className="!h-9 w-auto max-h-9" />
      </span>
    );
  }

  const titleColor = variant === "onDark" ? "text-white" : "text-slate-900 dark:text-white";
  const productMuted = variant === "onDark" ? "text-white/80" : "text-slate-500 dark:text-white/75";

  return (
    <span
      className={`flex min-w-0 max-w-full items-center gap-[0.32em] text-left sm:max-w-[15rem] ${titleColor} ${className ?? ""}`.trim()}
    >
      <span className="inline-flex shrink-0 items-center">
        <BrandLogoMark src={logo} variant={variant} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col items-start justify-center gap-[0.16em] leading-none">
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
