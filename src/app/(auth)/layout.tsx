import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 flex-col">{children}</div>

      <footer className="mt-auto shrink-0 border-t border-slate-200 bg-slate-100 px-4 py-8 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-8 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
            <div className="flex flex-col gap-2">
              <Link
                href="/"
                className="flex items-center gap-1 font-logo text-lg font-bold text-slate-800 dark:text-slate-200"
              >
                <svg className="h-5 w-5 shrink-0 text-ov-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <span>NOU</span>
              </Link>
              <p className="max-w-xs text-[12px] font-sans text-slate-500 dark:text-slate-400">
                Software para Inventarios
              </p>
            </div>
            <nav className="flex flex-wrap gap-x-8 gap-y-4 sm:gap-x-10" aria-label="Enlaces legales y soporte">
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Legal
                </p>
                <ul className="space-y-1.5 text-[13px]">
                  <li>
                    <Link href="/politica-privacidad" className="text-slate-600 hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-slate-200">
                      Política de privacidad
                    </Link>
                  </li>
                  <li>
                    <Link href="/terminos" className="text-slate-600 hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-slate-200">
                      Términos de servicio
                    </Link>
                  </li>
                  <li>
                    <Link href="/cookies" className="text-slate-600 hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-slate-200">
                      Uso de cookies
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Soporte
                </p>
                <ul className="space-y-1.5 text-[13px]">
                  <li>
                    <Link href="/contacto" className="text-slate-600 hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-slate-200">
                      Contacto
                    </Link>
                  </li>
                  <li>
                    <Link href="/ayuda" className="text-slate-600 hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-slate-200">
                      Centro de ayuda
                    </Link>
                  </li>
                </ul>
              </div>
            </nav>
          </div>
          <div className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-800">
            <p className="text-[12px] text-slate-500 dark:text-slate-400">
              © {new Date().getFullYear()} NOU - Software para Inventarios. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
