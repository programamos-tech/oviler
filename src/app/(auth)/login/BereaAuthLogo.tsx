import Link from "next/link";

const LOGO_SRC = "/logo-berea-tecnologia.png";
const LOGO_ALT = "Berea Tecnología, desarrollo de software para tiendas de tecnología";

/** Logo compacto en la tarjeta de login/registro (solo móvil; en desktop va al panel derecho). */
export function BereaAuthMobileLogo({ href = "/" }: { href?: string }) {
  const mark = <img src={LOGO_SRC} alt={LOGO_ALT} decoding="async" />;

  if (!href) {
    return <span className="berea-auth-logo-mobile">{mark}</span>;
  }

  return (
    <Link href={href} className="berea-auth-logo-mobile" aria-label="Berea Tecnología — Ir al inicio">
      {mark}
    </Link>
  );
}

export function BereaAuthLogo({ href = "/" }: { href?: string }) {
  const mark = <img src={LOGO_SRC} alt="Berea Tecnología" decoding="async" />;

  if (!href) {
    return <span className="berea-auth-logo">{mark}</span>;
  }

  return (
    <Link href={href} className="berea-auth-logo" aria-label="Berea Tecnología — Ir al inicio">
      {mark}
    </Link>
  );
}
