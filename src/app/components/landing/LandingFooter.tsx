import Link from "next/link";
import { BereaLandingLogo } from "@/app/components/landing/BereaLandingLogo";
import { ColombiaFlag } from "@/app/components/landing/ColombiaFlag";

const footerLinkClass = "berea-landing-link text-[13px]";

export function LandingFooter() {
  return (
    <footer className="berea-landing-section border-t pb-10 pt-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-md">
            <BereaLandingLogo href="/" />
            <p className="berea-landing-muted mt-4 text-[13px] leading-relaxed">
              Software de gestión para comercios: inventario, ventas, clientes y reportes en un solo lugar. Implementación y
              acompañamiento con el equipo Berea.
            </p>
            <p className="berea-landing-body mt-3 inline-flex items-center gap-2 text-[13px] font-medium">
              <svg
                className="h-4 w-4 shrink-0 text-[var(--landing-fg-subtle)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Sincelejo, Colombia</span>
              <ColombiaFlag className="inline-flex" title="Bandera de Colombia" />
            </p>
          </div>

          <nav aria-label="Enlaces del pie de página">
            <p className="berea-landing-eyebrow">Producto</p>
            <ul className="mt-3 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-x-8 sm:gap-y-2.5">
              <li>
                <Link href="/#vistas" className={footerLinkClass}>
                  Vistas del sistema
                </Link>
              </li>
              <li>
                <Link href="/#funcionalidades" className={footerLinkClass}>
                  Funcionalidades
                </Link>
              </li>
              <li>
                <Link href="/#implementacion" className={footerLinkClass}>
                  Implementación
                </Link>
              </li>
              <li>
                <Link href="/registro" className={footerLinkClass}>
                  Solicitar licencia
                </Link>
              </li>
              <li>
                <Link href="/login" className={footerLinkClass}>
                  Iniciar sesión
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="berea-landing-muted mt-12 flex flex-col items-center justify-between gap-3 border-t border-[var(--landing-border)] pt-8 sm:flex-row">
          <p className="text-center text-[12px] sm:text-left">
            © {new Date().getFullYear()} Berea Tecnología. Todos los derechos reservados.
          </p>
          <p className="max-w-sm text-center text-[12px] leading-relaxed sm:text-right">
            Desde Sincelejo, Colombia — licencias, implementación y soporte para comercios en todo el país.
          </p>
        </div>
      </div>
    </footer>
  );
}
