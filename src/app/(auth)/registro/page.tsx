"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:ring-slate-500";
const labelClass = "mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300";

export default function RegistroPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      // 1. Crear usuario en Supabase Auth usando signUp normal
      // Si falla por rate limit, intentamos crear directamente con admin API
      let authData: { user: { id: string; email?: string | null } | null } | null = null;
      let signUpError: { code?: string; message?: string } | null = null;

      const signUpResult = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
          emailRedirectTo: undefined, // No enviar email de confirmación
        },
      });

      signUpError = signUpResult.error;
      authData = signUpResult.data;

      // Si hay error de rate limit, intentar crear usuario directamente con admin API
      if (signUpError && (signUpError.code === "over_email_send_rate_limit" || signUpError.message?.includes("email rate limit"))) {
        // Fallback: crear usuario directamente sin enviar email
        const fallbackRes = await fetch("/api/admin/create-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name }),
        });

        const fallbackData = await fallbackRes.json().catch(() => ({}));
        if (!fallbackRes.ok) {
          console.error("Fallback admin create-user failed:", fallbackData);
          setError(
            "Se ha alcanzado el límite de envío de emails. El sistema intentará crear tu cuenta automáticamente. Por favor intenta iniciar sesión en unos momentos."
          );
          setLoading(false);
          return;
        }

        // Si se creó con éxito, usar el user_id del fallback
        authData = { user: { id: fallbackData.user_id, email: fallbackData.email } };
        signUpError = null;
      }

      if (signUpError) {
        if (signUpError.code === "user_already_registered" || signUpError.message?.includes("already registered")) {
          setError(
            "Este correo ya está registrado. Por favor inicia sesión o intenta con otro correo."
          );
        } else {
          setError(signUpError.message || "Error al crear la cuenta");
        }
        setLoading(false);
        return;
      }

      if (!authData?.user) {
        setError("Error al crear la cuenta. Por favor intenta de nuevo.");
        setLoading(false);
        return;
      }

      // 2. Crear organización y usuario en la tabla (vía API con service_role, evita RLS)
      // Si el usuario fue creado con admin client, pasamos el userId
      const res = await fetch("/api/auth/create-organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name, 
          email,
          userId: authData.user.id // Pasar userId si fue creado con admin client
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Error al crear la organización. Por favor intenta de nuevo.");
        setLoading(false);
        return;
      }

      // 3. Redirigir a onboarding para crear la primera sucursal
      router.push("/onboarding");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message === "Failed to fetch" || message.includes("fetch")) {
        setError(
          "No se pudo conectar con el servidor. Revisa que la URL y la clave de Supabase en .env.local sean correctas y que tu proyecto no esté pausado (Dashboard de Supabase)."
        );
      } else {
        setError(message || "Error inesperado. Por favor intenta de nuevo.");
      }
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
          <h2 className="mb-6 text-xl font-bold text-slate-900 dark:text-slate-50">Crear cuenta</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-[13px] text-red-700 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="name" className={labelClass}>
                Nombre completo <span className="text-ov-pink">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="Tu nombre"
                className={inputClass}
                required
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="email" className={labelClass}>
                Correo <span className="text-ov-pink">*</span>
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
                Contraseña <span className="text-ov-pink">*</span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                className={inputClass}
                required
                minLength={6}
                disabled={loading}
              />
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              <p className="text-[12px]">
                Al crear una cuenta, aceptas nuestros términos de servicio y política de privacidad.
              </p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="h-10 w-full rounded-lg bg-slate-900 px-4 text-[14px] font-medium text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-70 dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              {loading ? "Creando cuenta..." : "Crear cuenta"}
            </button>
            <div className="text-center">
              <Link
                href="/login"
                className="text-[13px] font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              >
                ¿Ya tienes cuenta? Inicia sesión
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
