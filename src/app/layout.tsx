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
  title: "NOU - Software para Inventarios",
  description:
    "NOU - Software para Inventarios. Gestiona tu inventario, ventas, clientes y más desde un solo lugar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${inter.variable} ${geistMono.variable} ${youngSerif.variable} antialiased min-h-screen bg-background text-foreground`}
      >
        <div className="flex min-h-screen flex-col bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">
          <AppShell>{children}</AppShell>
        </div>
      </body>
    </html>
  );
}
