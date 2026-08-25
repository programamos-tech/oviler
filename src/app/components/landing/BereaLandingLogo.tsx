import Link from "next/link";

export function BereaLandingLogo({ href = "/" }: { href?: string }) {
  const mark = <img src="/logo-berea-tecnologia.png" alt="Berea Tecnología" decoding="async" />;

  if (!href) {
    return <span className="berea-landing-logo">{mark}</span>;
  }

  return (
    <Link href={href} className="berea-landing-logo" aria-label="Berea Tecnología — Ir al inicio">
      {mark}
    </Link>
  );
}
