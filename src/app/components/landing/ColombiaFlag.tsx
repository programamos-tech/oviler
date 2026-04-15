type Props = {
  className?: string;
  title?: string;
};

/** Bandera de Colombia (tricolor), proporción aproximada 3:2. */
export function ColombiaFlag({ className, title = "Colombia" }: Props) {
  return (
    <span className={className} role="img" aria-label={title}>
      <svg
        viewBox="0 0 3 2"
        className="inline-block h-[1em] w-[1.5em] shrink-0 align-[-0.125em] rounded-[2px] shadow-sm ring-1 ring-white/15"
        aria-hidden
      >
        <rect width="3" height="1" fill="#FCD116" />
        <rect y="1" width="3" height="0.5" fill="#003893" />
        <rect y="1.5" width="3" height="0.5" fill="#CE1126" />
      </svg>
    </span>
  );
}
