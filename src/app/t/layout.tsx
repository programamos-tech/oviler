import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Catálogo — Bernabe Comercios',
  description: 'Catálogo de productos',
}

export default function CatalogRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-nou-catalog-root
      className="min-h-screen bg-[rgb(var(--background))] text-[rgb(var(--foreground))] antialiased"
    >
      {children}
    </div>
  )
}
