"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:ring-slate-500";
const labelClass = "mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300";

export default function RegistroPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = (formData.get("name") as string)?.trim() ?? "";
    const emailRaw = (formData.get("email") as string) ?? "";
    const email = emailRaw.trim().toLowerCase();
    const password = (formData.get("password") as string) ?? "";

    if (!email) {
      setError("El correo es obligatorio.");
      setLoading(false);
      return;
    }
    if (!password || password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      setLoading(false);
      return;
    }

    try {
      // 1. Crear usuario en Auth (API admin, sin enviar email, ya confirmado)
      const createUserRes = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const createUserData = await createUserRes.json().catch(() => ({}));

      if (!createUserRes.ok) {
        const msg = createUserData.error || "No se pudo crear la cuenta.";
        if (
          createUserRes.status === 409 ||
          String(msg).toLowerCase().includes("already") ||
          String(msg).toLowerCase().includes("ya existe")
        ) {
          setError("Este correo ya está registrado. Ve a Iniciar sesión o usa otro correo.");
        } else {
          setError(msg);
        }
        setLoading(false);
        return;
      }

      const userId = createUserData.user_id;
      if (!userId) {
        setError("Error al crear la cuenta. No se recibió el id de usuario.");
        setLoading(false);
        return;
      }

      // 2. Crear organización y registro en tabla users
      const orgRes = await fetch("/api/auth/create-organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, userId }),
      });
      const orgData = await orgRes.json().catch(() => ({}));

      if (!orgRes.ok) {
        setError(orgData.error || "Error al crear la organización. Intenta de nuevo.");
        setLoading(false);
        return;
      }

      // 3. Iniciar sesión en el navegador
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) {
        await new Promise((r) => setTimeout(r, 1500));
        const { error: retryErr } = await supabase.auth.signInWithPassword({ email, password });
        if (retryErr) {
          setError(
            "Cuenta creada pero no se pudo iniciar sesión automáticamente. Ve a Iniciar sesión e ingresa con tu correo y contraseña."
          );
          setLoading(false);
          return;
        }
      }

      await new Promise((r) => setTimeout(r, 200));
      window.location.href = "/onboarding";
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message === "Failed to fetch" || message.includes("fetch")) {
        setError(
          "No se pudo conectar. Revisa .env.local (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) y que el proyecto Supabase no esté pausado."
        );
      } else {
        setError(message || "Error inesperado. Intenta de nuevo.");
      }
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col lg:flex-row lg:items-stretch">
      {/* Izquierda: logo y descripción */}
      <div className="flex flex-col justify-center px-6 py-10 lg:w-1/2 lg:max-w-xl lg:pl-16 xl:pl-24">
        <Link href="/" className="flex items-center gap-1 font-logo text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
          <span className="material-symbols-outlined h-9 w-9 shrink-0 text-[36px] text-ov-pink sm:h-10 sm:w-10 sm:text-[40px]" aria-hidden>storefront</span>
          <span>NOU back office</span>
        </Link>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">
          Por NOU Technology. SaaS premium: implementación, capacitación y licencia anual. Si tienes problemas con el inventario, nosotros vamos.
        </p>
      </div>

      {/* Derecha: formulario */}
      <div className="flex flex-1 items-center justify-center px-4 py-8 lg:py-12 lg:pr-16 xl:pr-24">
        <div className="w-full max-w-[380px] rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 sm:p-8">
          <h2 className="mb-6 text-xl font-bold text-slate-900 dark:text-slate-50">Crear cuenta</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-[13px] text-red-700 dark:bg-red-900/20 dark:text-red-400">
                <p>{error}</p>
                {error.includes("Iniciar sesión") && (
                  <Link
                    href="/login"
                    className="mt-2 inline-block font-medium underline hover:no-underline"
                  >
                    Ir a Iniciar sesión
                  </Link>
                )}
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
