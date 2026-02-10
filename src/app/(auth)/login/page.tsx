"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const inputClass =
  "h-10 w-full rounded-lg bg-white px-4 text-[14px] text-slate-800 outline-none placeholder:text-slate-400 ring-1 ring-slate-200 transition-shadow focus:ring-2 focus:ring-slate-400 focus:ring-offset-0 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700 dark:placeholder:text-slate-500 dark:focus:ring-slate-500";
const labelClass = "mb-1.5 block text-[13px] font-medium text-slate-600 dark:text-slate-400";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    if (mode === "register") {
      // Simular registro → ir a onboarding
      await new Promise((r) => setTimeout(r, 400));
      router.push("/onboarding");
      return;
    }
    // Simular login → dashboard
    await new Promise((r) => setTimeout(r, 400));
    router.push("/");
    setLoading(false);
  };

  return (
    <div className="flex flex-1 flex-col lg:flex-row lg:items-stretch">
      {/* Izquierda: logo y descripción */}
      <div className="flex flex-col justify-center px-6 py-10 lg:w-1/2 lg:max-w-xl lg:pl-16 xl:pl-24">
        <Link href="/" className="font-logo text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
          Ovile<span className="text-ov-pink">r</span>
        </Link>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">
          Plataforma para gestionar ventas a domicilio, inventario por sucursal, garantías y cierres de caja. Configura tu negocio en minutos y empieza a vender.
        </p>
      </div>

      {/* Derecha: formulario */}
      <div className="flex flex-1 items-center justify-center px-4 py-8 lg:py-12 lg:pr-16 xl:pr-24">
        <div className="w-full max-w-[380px] rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 sm:p-8">
          <div className="mb-6 flex gap-1 rounded-lg bg-slate-100/80 p-0.5 dark:bg-slate-800/80">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 rounded-md py-2 text-[13px] font-medium transition-colors ${
                mode === "login"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-50"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 rounded-md py-2 text-[13px] font-medium transition-colors ${
                mode === "register"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-50"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              Registrarse
            </button>
          </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div>
              <label htmlFor="name" className={labelClass}>
                Nombre
              </label>
              <input
                id="name"
                type="text"
                placeholder="Tu nombre"
                className={inputClass}
                required
              />
            </div>
          )}
          <div>
            <label htmlFor="email" className={labelClass}>
              Correo
            </label>
            <input
              id="email"
              type="email"
              placeholder="correo@ejemplo.com"
              className={inputClass}
              required
            />
          </div>
          <div>
            <label htmlFor="password" className={labelClass}>
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              className={inputClass}
              required
            />
          </div>
          {mode === "login" && (
            <div className="text-right">
              <Link
                href="#"
                className="text-[13px] font-medium text-ov-pink hover:underline dark:text-ov-pink-muted"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="h-10 w-full rounded-lg bg-slate-900 px-4 text-[14px] font-medium text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-70 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            {loading ? "..." : mode === "login" ? "Entrar" : "Crear cuenta"}
          </button>
        </form>
        </div>
      </div>
    </div>
  );
}
