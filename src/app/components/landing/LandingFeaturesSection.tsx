import Link from "next/link";
import type { ReactNode } from "react";

type Feature = {
  title: string;
  description: string;
  icon: ReactNode;
};

function IconChart() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19v-6m4 6V8m4 11v-8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}
function IconCart() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.5 1.5M17 13v4a2 2 0 01-2 2H9a2 2 0 01-2-2v-4m8 0V9a2 2 0 00-2-2H11" />
    </svg>
  );
}
function IconBox() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}
function IconCredit() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}
function IconShield() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}
function IconCash() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v2a2 2 0 002 2z" />
    </svg>
  );
}
function IconStore() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

const FEATURES: Feature[] = [
  {
    title: "Reportes e indicadores",
    description:
      "Resumen de ventas, ingresos por forma de pago y tendencias por período. Entra al panel y ve el pulso de tu negocio.",
    icon: <IconChart />,
  },
  {
    title: "Ventas y facturación",
    description:
      "Facturas en mostrador, pedidos con envío y ventas desde el catálogo en línea. Estados, pagos mixtos y seguimiento en un solo lugar.",
    icon: <IconCart />,
  },
  {
    title: "Inventario y productos",
    description:
      "Productos con SKU, categorías, stock por ubicación y movimientos. Ideal para tiendas que rotan inventario todos los días.",
    icon: <IconBox />,
  },
  {
    title: "Clientes",
    description:
      "Ficha por cliente, historial de compras y datos de contacto para fidelizar y dar soporte rápido.",
    icon: <IconUsers />,
  },
  {
    title: "Créditos y cobros",
    description:
      "Ventas a crédito con saldo pendiente, abonos y estados. Menos hojas de cálculo y más control en caja.",
    icon: <IconCredit />,
  },
  {
    title: "Garantías",
    description:
      "Registro de garantías ligado a la venta, con estados y trazabilidad para tu equipo y tus clientes.",
    icon: <IconShield />,
  },
  {
    title: "Egresos y flujo de caja",
    description:
      "Salidas de dinero clasificadas para ver no solo lo que entra, sino en qué se va el efectivo.",
    icon: <IconCash />,
  },
  {
    title: "Sucursal y equipo",
    description:
      "Datos de tu punto de venta, roles y permisos para que cada colaborador vea solo lo que necesita.",
    icon: <IconStore />,
  },
];

export function LandingFeaturesSection() {
  return (
    <section
      id="funcionalidades"
      className="relative border-t border-zinc-800/80 bg-zinc-950 py-16 sm:py-20 lg:py-24"
      aria-labelledby="landing-features-heading"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/25 to-transparent" aria-hidden />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Funcionalidades</p>
          <h2
            id="landing-features-heading"
            className="mt-3 font-logo text-2xl tracking-tight text-white sm:text-3xl lg:text-[2rem]"
          >
            Hecho para operar tu comercio{" "}
            <span className="bg-gradient-to-r from-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              de punta a punta
            </span>
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-zinc-400 sm:text-base">
            Módulos pensados para tiendas físicas y equipos que venden, despachan y cobran todos los días. Un solo sistema,
            roles claros y datos confiables.
          </p>
          <p className="mt-4">
            <Link
              href="/#vistas"
              className="text-[13px] font-medium text-emerald-400/95 underline-offset-2 hover:text-emerald-300 hover:underline"
            >
              Ver facturas, créditos y stock en acción
            </Link>
          </p>
        </div>

        <ul className="mt-12 grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {FEATURES.map((f) => (
            <li
              key={f.title}
              className="rounded-2xl border border-zinc-800/90 bg-zinc-900/35 p-5 shadow-sm ring-1 ring-white/[0.03] transition-[border-color,background-color] duration-200 hover:border-zinc-700/90 hover:bg-zinc-900/55"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300/95 ring-1 ring-emerald-500/20">
                {f.icon}
              </div>
              <h3 className="mt-4 text-[15px] font-semibold tracking-tight text-zinc-100">{f.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-zinc-500">{f.description}</p>
            </li>
          ))}
        </ul>

        <div className="mt-14 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
          <Link
            href="/registro"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-100 px-6 text-[14px] font-semibold text-zinc-900 transition-colors hover:bg-white"
          >
            Solicitar licencia
          </Link>
          <p className="text-center text-[13px] text-zinc-500">
            ¿Ya usas Berea?{" "}
            <Link href="/login" className="font-medium text-emerald-400/95 underline-offset-2 hover:text-emerald-300 hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
