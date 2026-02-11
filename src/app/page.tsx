import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col" style={{ backgroundImage: 'url(/pexels-kampus-7289718.jpg)', backgroundSize: 'cover', backgroundPosition: 'top center', backgroundAttachment: 'fixed' }}>
      {/* Overlay oscuro para legibilidad */}
      <div className="absolute inset-0 z-0 bg-slate-900/60" />
      
      {/* Navbar */}
      <nav className="relative sticky top-0 z-50 border-b border-white/20 bg-transparent">
        <div className="relative z-10 mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-1.5">
            <svg className="h-7 w-7 shrink-0 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <div className="flex flex-col">
              <span className="font-logo text-xl font-bold tracking-tight text-white leading-none">
                NOU
              </span>
              <span className="text-[9px] font-medium tracking-wide text-white/90 leading-tight">
                Software para Inventarios
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden inline-flex h-9 items-center justify-center rounded-lg px-4 text-[13px] font-medium text-white transition-colors hover:bg-white/20 sm:flex"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/login"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-ov-pink px-4 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-ov-pink-hover"
            >
              Solicitar demo
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-screen items-center overflow-hidden bg-transparent">
        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-32">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
            {/* Contenido izquierdo */}
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="font-logo text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
                  NOU
                </h1>
                <p className="text-xl font-semibold text-white sm:text-2xl">
                  ¿Sabes cuánto tienes en Inventario ahora?
                </p>
                <p className="text-xl font-semibold text-white sm:text-2xl">
                  Nou.
                </p>
              </div>
              <p className="max-w-xl text-lg leading-relaxed text-white/90 sm:text-xl">
                Con Nou sabes cuánto vendes y cuánto tienes en el Inventario siempre.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/login"
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-white px-6 text-[15px] font-medium text-slate-900 shadow-sm transition-colors hover:bg-white/90"
                >
                  Solicitar demo
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-white/30 bg-white/10 px-6 text-[15px] font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20"
                >
                  Iniciar sesión
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Footer profesional */}
      <footer className="relative z-10 border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
            {/* Logo y descripción */}
            <div className="col-span-2 sm:col-span-3 lg:col-span-2">
              <Link href="/" className="mb-4 flex items-center gap-1.5">
                <svg className="h-6 w-6 shrink-0 text-ov-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <div className="flex flex-col">
                  <span className="font-logo text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50 leading-none">
                    NOU
                  </span>
                  <span className="text-[10px] font-medium tracking-wide text-slate-500 dark:text-slate-400 leading-tight">
                    Software para Inventarios
                  </span>
                </div>
              </Link>
              <p className="mt-4 max-w-xs text-[14px] leading-relaxed text-slate-600 dark:text-slate-400">
                Gestiona tu inventario, ventas y despachos desde un solo lugar. Control total sobre tu negocio.
              </p>
            </div>

            {/* Producto */}
            <div>
              <h3 className="mb-4 text-[13px] font-bold uppercase tracking-wide text-slate-900 dark:text-slate-100">
                Producto
              </h3>
              <ul className="space-y-2.5 text-[14px]">
                <li>
                  <Link href="#features" className="text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200">
                    Características
                  </Link>
                </li>
                <li>
                  <Link href="#pricing" className="text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200">
                    Precios
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200">
                    Demo
                  </Link>
                </li>
              </ul>
            </div>

            {/* Empresa */}
            <div>
              <h3 className="mb-4 text-[13px] font-bold uppercase tracking-wide text-slate-900 dark:text-slate-100">
                Empresa
              </h3>
              <ul className="space-y-2.5 text-[14px]">
                <li>
                  <Link href="/contacto" className="text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200">
                    Contacto
                  </Link>
                </li>
                <li>
                  <Link href="/sobre-nosotros" className="text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200">
                    Sobre nosotros
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200">
                    Blog
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="mb-4 text-[13px] font-bold uppercase tracking-wide text-slate-900 dark:text-slate-100">
                Legal
              </h3>
              <ul className="space-y-2.5 text-[14px]">
                <li>
                  <Link href="/politica-privacidad" className="text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200">
                    Privacidad
                  </Link>
                </li>
                <li>
                  <Link href="/terminos" className="text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200">
                    Términos
                  </Link>
                </li>
                <li>
                  <Link href="/cookies" className="text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200">
                    Cookies
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Línea divisoria y copyright */}
          <div className="mt-12 border-t border-slate-200 pt-8 dark:border-slate-800">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <p className="text-[13px] text-slate-500 dark:text-slate-400">
                © {new Date().getFullYear()} NOW Sistemas - NOU Software para Inventarios. Todos los derechos reservados.
              </p>
              <div className="flex items-center gap-6">
                <Link href="#" className="text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">
                  <span className="sr-only">Twitter</span>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </Link>
                <Link href="#" className="text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">
                  <span className="sr-only">LinkedIn</span>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M19 0h-14a5 5 0 00-5 5v14a5 5 0 005 5h14a5 5 0 005-5v-14a5 5 0 00-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" />
                  </svg>
                </Link>
                <Link href="#" className="text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">
                  <span className="sr-only">GitHub</span>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
