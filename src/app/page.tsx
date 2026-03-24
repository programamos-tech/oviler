import Link from "next/link";

const COMPANY = "NOU Technology";
const PRODUCT = "NOU Tiendas";

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col" style={{ backgroundImage: "url(/pexels-kampus-7289718.jpg)", backgroundSize: "cover", backgroundPosition: "top center", backgroundAttachment: "fixed" }}>
      <div className="absolute inset-0 z-0 bg-platform-dark/70" />

      {/* Navbar */}
      <nav className="relative sticky top-0 z-50 border-b border-white/10 bg-platform-dark/85 backdrop-blur-sm">
        <div className="relative z-10 mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-0.5">
            <span className="material-symbols-outlined h-7 w-7 shrink-0 text-[28px] text-white" aria-hidden>storefront</span>
            <div className="flex flex-col">
              <span className="font-logo text-xl font-bold tracking-tight text-white leading-none">
                {PRODUCT}
              </span>
              <span className="text-[9px] font-medium tracking-wide text-white/90 leading-tight">
                por {COMPANY}
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden inline-flex h-9 items-center justify-center rounded-lg px-4 text-[13px] font-medium text-white transition-colors hover:bg-white/20 sm:flex">
              Iniciar sesión
            </Link>
            <Link href="/login" className="inline-flex h-9 items-center justify-center rounded-lg bg-ov-pink px-4 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-ov-pink-hover">
              Solicitar demo
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-screen items-center overflow-hidden bg-platform-dark/75 backdrop-blur-[2px]">
        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
        <div className="max-w-3xl">
          <p className="mb-3 text-[13px] font-medium uppercase tracking-wide text-white/75">
            Tiendas ocultas · ventas online y físicas
          </p>
          <h1 className="font-logo text-3xl font-bold leading-tight tracking-tight text-white drop-shadow-md sm:text-4xl md:text-5xl lg:text-6xl">
            Pedidos, inventario y equipo en un solo lugar.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/95 sm:text-lg">
            {PRODUCT}: gestiona tu operación sin vitrina — pedidos y ventas, stock, egresos y usuarios. Implementación, capacitación y <strong className="text-white">licencia anual</strong>.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/login" className="inline-flex h-12 items-center justify-center rounded-lg bg-white px-6 text-[15px] font-semibold text-slate-900 shadow-lg transition-colors hover:bg-white/95">
              Solicitar demo
            </Link>
            <Link href="#como-trabajamos" className="inline-flex h-12 items-center justify-center rounded-lg border-2 border-white/50 bg-white/10 px-6 text-[15px] font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20">
              Cómo trabajamos
            </Link>
          </div>
        </div>
        </div>
      </section>

      {/* Cómo trabajamos */}
      <section id="como-trabajamos" className="relative z-10 border-t border-white/10 bg-platform-dark py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-logo text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Cómo trabajamos
          </h2>
          <p className="mt-2 max-w-xl text-sm text-white/75 sm:text-base">
            Te acompañamos de la demo a la puesta en marcha con {PRODUCT}.
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { step: "1", title: "Conocemos tu flujo", desc: "Pedidos, bodega y tienda." },
              { step: "2", title: "Demo y pruebas", desc: "Ajustamos contigo." },
              { step: "3", title: "Implementación", desc: "Configuración, equipo y licencia anual." },
            ].map((item) => (
              <li key={item.step} className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-ov-pink/20 text-xs font-bold text-ov-pink">
                  {item.step}
                </span>
                <h3 className="mt-3 text-base font-semibold text-white">{item.title}</h3>
                <p className="mt-1 text-[13px] leading-snug text-white/75">{item.desc}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Producto */}
      <section id="producto" className="relative z-10 border-t border-white/10 bg-platform-dark py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-logo text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Qué incluye
          </h2>
          <p className="mt-2 max-w-xl text-sm text-white/75 sm:text-base">
            Ventas (web y tienda), inventario, clientes, egresos, caja, sucursales y permisos por rol.
          </p>
          <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
            {[
              "Pedidos y ventas · online y físico",
              "Inventario y bodega",
              "Egresos, caja y usuarios",
            ].map((line) => (
              <li key={line} className="flex gap-2 text-[15px] leading-snug text-white/90">
                <span className="material-symbols-outlined mt-0.5 shrink-0 text-[20px] text-ov-pink" aria-hidden>
                  check_circle
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="/login" className="inline-flex h-11 items-center justify-center rounded-lg bg-ov-pink px-6 text-[15px] font-medium text-white shadow-sm transition-colors hover:bg-ov-pink-hover">
                Solicitar demo
              </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-platform-dark">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
            <div className="col-span-2 sm:col-span-3 lg:col-span-2">
              <Link href="/" className="mb-4 flex items-center gap-1">
                <span className="material-symbols-outlined h-6 w-6 shrink-0 text-[24px] text-ov-pink" aria-hidden>storefront</span>
                <div className="flex flex-col">
                  <span className="font-logo text-lg font-bold tracking-tight text-white leading-none">
                    {PRODUCT}
                  </span>
                  <span className="text-[10px] font-medium tracking-wide text-slate-400 leading-tight">
                    por {COMPANY}
                  </span>
                </div>
              </Link>
              <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-slate-400">
                Gestión para tiendas ocultas: ventas, inventario y equipo. Licencia anual con soporte.
              </p>
            </div>
            <div>
              <h3 className="mb-4 text-[13px] font-bold uppercase tracking-wide text-white">
                Producto
              </h3>
              <ul className="space-y-2.5 text-[14px]">
                <li>
                  <a href="#como-trabajamos" className="text-slate-400 transition-colors hover:text-white">
                    Cómo trabajamos
                  </a>
                </li>
                <li>
                  <a href="#producto" className="text-slate-400 transition-colors hover:text-white">
                    {PRODUCT}
                  </a>
                </li>
                <li>
                  <Link href="/login" className="text-slate-400 transition-colors hover:text-white">
                    Solicitar demo
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="mb-4 text-[13px] font-bold uppercase tracking-wide text-white">
                Empresa
              </h3>
              <ul className="space-y-2.5 text-[14px]">
                <li>
                  <Link href="/contacto" className="text-slate-400 transition-colors hover:text-white">
                    Contacto
                  </Link>
                </li>
                <li>
                  <Link href="/sobre-nosotros" className="text-slate-400 transition-colors hover:text-white">
                    Sobre nosotros
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="mb-4 text-[13px] font-bold uppercase tracking-wide text-white">
                Legal
              </h3>
              <ul className="space-y-2.5 text-[14px]">
                <li>
                  <Link href="/politica-privacidad" className="text-slate-400 transition-colors hover:text-white">
                    Privacidad
                  </Link>
                </li>
                <li>
                  <Link href="/terminos" className="text-slate-400 transition-colors hover:text-white">
                    Términos
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-white/10 pt-8">
            <p className="text-center text-[13px] text-slate-400 sm:text-left">
              © {new Date().getFullYear()} {COMPANY}. {PRODUCT} — Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
