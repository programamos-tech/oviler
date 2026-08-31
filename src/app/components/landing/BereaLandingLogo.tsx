import Link from "next/link";

export function BereaLandingLogo({ href = "/" }: { href?: string }) {
  const mark = <img src="/logo-berea-tech.png" alt="Berea Tech" decoding="async" />;

  if (!href) {
    return <span className="berea-landing-logo">{mark}</span>;
  }

  return (
    <Link href={href} className="berea-landing-logo" aria-label="Berea Tech — Ir al inicio">
      {mark}
    </Link>
  );
}
