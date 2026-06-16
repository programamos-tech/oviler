import Link from "next/link";

export function BereaAuthLogo({ href = "/" }: { href?: string }) {
  const mark = (
    <span className="berea-tech-logo-frame berea-tech-logo-frame--auth">
      <img src="/logo-berea-tech.png" alt="Berea Comercios" decoding="async" />
    </span>
  );

  if (!href) {
    return <span className="berea-auth-logo">{mark}</span>;
  }

  return (
    <Link href={href} className="berea-auth-logo" aria-label="Berea Comercios — Ir al inicio">
      {mark}
    </Link>
  );
}
