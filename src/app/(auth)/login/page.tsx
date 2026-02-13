"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:ring-slate-500";
const labelClass = "mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = (formData.get("email") as string)?.trim().toLowerCase() ?? "";
    const password = (formData.get("password") as string) ?? "";

    if (!email || !password) {
      setError("Correo y contraseña son obligatorios.");
      setLoading(false);
      return;
    }

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        const msg = signInError.message || "Error al iniciar sesión";
        if (
          signInError.message?.toLowerCase().includes("email not confirmed") ||
          signInError.message?.toLowerCase().includes("email_not_confirmed")
        ) {
          setError(
            "Tu correo aún no está confirmado. Revisa tu bandeja o contacta al administrador para que confirme tu cuenta."
          );
        } else if (
          msg.toLowerCase().includes("invalid login credentials") ||
          msg.toLowerCase().includes("invalid_credentials")
        ) {
          setError(
            "Correo o contraseña incorrectos. Si acabas de crear la cuenta, usa exactamente el mismo correo y contraseña (el correo se guarda en minúsculas). Si no recuerdas la contraseña, usa «¿Olvidaste tu contraseña?»."
          );
        } else {
          setError(msg);
        }
        setLoading(false);
        return;
      }

      if (data.user) {
        const { data: userData } = await supabase
          .from("users")
          .select("organization_id")
          .eq("id", data.user.id)
          .single();

        let path = "/onboarding";
        if (userData?.organization_id) {
          const { data: branches } = await supabase
            .from("branches")
            .select("id")
            .eq("organization_id", userData.organization_id)
            .limit(1);
          if (branches?.length) path = "/dashboard";
        }
        window.location.href = path;
      }
    } catch (err) {
      setError("Error inesperado. Por favor intenta de nuevo.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col lg:flex-row lg:items-stretch">
      {/* Izquierda: logo y descripción */}
      <div className="flex flex-col justify-center px-6 py-10 lg:w-1/2 lg:max-w-xl lg:pl-16 xl:pl-24">
        <Link href="/" className="flex items-center gap-1.5 font-logo text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
          <svg className="h-8 w-8 shrink-0 text-slate-900 dark:text-slate-50 sm:h-10 sm:w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <span>NOU</span>
        </Link>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">
          Software para Inventarios. Gestiona tu inventario, ventas, clientes y más desde un solo lugar. Configura tu negocio en minutos.
        </p>
      </div>

      {/* Derecha: formulario */}
      <div className="flex flex-1 items-center justify-center px-4 py-8 lg:py-12 lg:pr-16 xl:pr-24">
        <div className="w-full max-w-[380px] rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 sm:p-8">
          <h2 className="mb-6 text-xl font-bold text-slate-900 dark:text-slate-50">Iniciar sesión</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-[13px] text-red-700 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="email" className={labelClass}>
                Correo
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="correo@ejemplo.com"
                className={inputClass}
                required
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="password" className={labelClass}>
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                className={inputClass}
                required
                disabled={loading}
              />
            </div>
            <div className="flex items-center justify-between">
              <Link
                href="#"
                className="text-[13px] font-medium text-ov-pink hover:underline dark:text-ov-pink-muted"
              >
                ¿Olvidaste tu contraseña?
              </Link>
              <Link
                href="/registro"
                className="text-[13px] font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Crear cuenta
              </Link>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="h-10 w-full rounded-lg bg-slate-900 px-4 text-[14px] font-medium text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-70 dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              {loading ? "Iniciando sesión..." : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
