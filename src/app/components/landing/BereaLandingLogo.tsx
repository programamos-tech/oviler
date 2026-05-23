import Link from "next/link";

export function BereaLandingLogo({ href = "/" }: { href?: string }) {
  const mark = (
    <span className="berea-landing-logo-crop">
      <img src="/logo-berea.2.png" alt="Berea Comercios" className="berea-landing-logo-img" decoding="async" />
    </span>
  );

  if (!href) {
    return <span className="berea-landing-logo">{mark}</span>;
  }

  return (
    <Link href={href} className="berea-landing-logo" aria-label="Berea Comercios — Ir al inicio">
      {mark}
    </Link>
  );
}
