import Link from "next/link";

export function BereaAuthLogo({ href = "/" }: { href?: string }) {
  const mark = (
    <span className="berea-auth-logo-crop">
      <img
        src="/logo-berea.2.png"
        alt="Berea Comercios"
        className="berea-auth-logo-img"
        decoding="async"
      />
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
