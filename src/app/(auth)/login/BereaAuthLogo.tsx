import Link from "next/link";

/** Logo compacto en la tarjeta de login/registro (solo móvil; en desktop va al panel derecho). */
export function BereaAuthMobileLogo({ href = "/" }: { href?: string }) {
  const mark = (
    <img src="/logo-berea-house.png" alt="Berea House, tiendas de tecnología" decoding="async" />
  );

  if (!href) {
    return <span className="berea-auth-logo-mobile">{mark}</span>;
  }

  return (
    <Link href={href} className="berea-auth-logo-mobile" aria-label="Berea Tech — Ir al inicio">
      {mark}
    </Link>
  );
}

export function BereaAuthLogo({ href = "/" }: { href?: string }) {
  const mark = (
    <img src="/logo-berea-house.png" alt="Berea House" decoding="async" />
  );

  if (!href) {
    return <span className="berea-auth-logo">{mark}</span>;
  }

  return (
    <Link href={href} className="berea-auth-logo" aria-label="Berea Tech — Ir al inicio">
      {mark}
    </Link>
  );
}
