import type { Metadata } from "next";
import { Inter, Geist_Mono, Young_Serif } from "next/font/google";
import AppShell from "./components/AppShell";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const youngSerif = Young_Serif({
  variable: "--font-young-serif",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Bernabe Comercios — Gestiona tu negocio",
  description:
    "Inventario, ventas, clientes y créditos. Bernabe Comercios para tu negocio. Licencia con soporte.",
  icons: {
    icon: "/ceiling.png",
    apple: "/ceiling.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="overflow-x-hidden">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${inter.variable} ${geistMono.variable} ${youngSerif.variable} antialiased min-h-screen overflow-x-hidden bg-background text-foreground`}
      >
        <div className="flex min-h-screen min-w-0 max-w-full flex-col overflow-x-hidden bg-[rgb(var(--background))] text-slate-900 dark:bg-[rgb(var(--background))] dark:text-slate-100">
          <AppShell>{children}</AppShell>
        </div>
      </body>
    </html>
  );
}
