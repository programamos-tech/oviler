"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { OvilerWordmark } from "@/app/components/OvilerWordmark";
import { LoginAvatarCluster } from "../login/LoginAvatarCluster";

const inputClass =
  "h-12 w-full rounded-xl border border-zinc-700/90 bg-zinc-900/80 px-4 text-[15px] font-medium text-zinc-100 outline-none transition-[border-color,box-shadow] placeholder:text-zinc-500 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/25";
const labelClass = "mb-2 block text-[13px] font-medium text-zinc-400";

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
      const createUserRes = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const createUserData = await createUserRes.json().catch(() => ({}));

      if (!createUserRes.ok) {
        const msg = createUserData.error || "No se pudo completar el registro.";
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
        setError("Error al completar el registro. No se recibió el id de usuario.");
        setLoading(false);
        return;
      }

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

      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) {
        await new Promise((r) => setTimeout(r, 1500));
        const { error: retryErr } = await supabase.auth.signInWithPassword({ email, password });
        if (retryErr) {
          setError(
            "El registro se completó pero no se pudo iniciar sesión automáticamente. Ve a Iniciar sesión e ingresa con tu correo y contraseña."
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
    <div className="flex min-h-screen flex-1 flex-col bg-zinc-950 lg:flex-row">
      <section className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-10 lg:w-1/2 lg:px-14 xl:px-20">
        <Link
          href="/"
          className="inline-block w-fit outline-offset-4 focus-visible:rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-500"
        >
          <OvilerWordmark
            variant="onDark"
            companyName="Berea"
            logoSrc="/laptop.png"
            className="text-[clamp(1.75rem,4vw,2.5rem)] font-bold"
          />
        </Link>

        <h1 className="mt-10 text-3xl font-semibold tracking-tight text-white sm:text-[2rem]">Solicitar licencia</h1>
        <p className="mt-2 max-w-md text-[15px] leading-relaxed text-zinc-400">
          Completa el formulario para activar tu licencia Berea Comercios y gestionar inventario y ventas desde un solo panel.
        </p>

        <form onSubmit={handleSubmit} className="mt-10 w-full max-w-md space-y-6">
          {error ? (
            <div className="rounded-xl border border-red-900/50 bg-red-950/50 px-4 py-3 text-[14px] leading-relaxed text-red-200">
              <p>{error}</p>
              {error.includes("Iniciar sesión") ? (
                <Link
                  href="/login"
                  className="mt-2 inline-block font-semibold text-red-100 underline underline-offset-2 hover:text-white"
                >
                  Ir a Iniciar sesión
                </Link>
              ) : null}
            </div>
          ) : null}

          <div>
            <label htmlFor="name" className={labelClass}>
              Nombre completo <span className="text-zinc-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Tu nombre"
              className={inputClass}
              required
              disabled={loading}
              autoComplete="name"
            />
          </div>

          <div>
            <label htmlFor="email" className={labelClass}>
              Correo electrónico <span className="text-zinc-500">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="correo@ejemplo.com"
              className={inputClass}
              required
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className={labelClass}>
              Contraseña <span className="text-zinc-500">*</span>
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
              autoComplete="new-password"
            />
          </div>

          <p className="text-[13px] leading-relaxed text-zinc-500">
            Al solicitar tu licencia, aceptas nuestros términos de servicio y política de privacidad.
          </p>

          <button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-xl bg-white px-4 text-[15px] font-bold text-zinc-900 shadow-sm transition-colors hover:bg-zinc-100 disabled:opacity-60"
          >
            {loading ? "Enviando solicitud…" : "Solicitar licencia"}
          </button>
        </form>

        <p className="mt-10 text-[15px] text-zinc-500">
          ¿Ya tienes acceso?{" "}
          <Link
            href="/login"
            className="text-[17px] font-semibold text-zinc-100 underline-offset-2 hover:text-white hover:underline sm:text-lg"
          >
            Iniciar sesión
          </Link>
        </p>
      </section>

      <section className="flex flex-1 flex-col items-center justify-center border-t border-zinc-800/80 px-6 py-14 lg:border-l lg:border-t-0 lg:py-12">
        <div className="origin-center scale-[0.88] sm:scale-100">
          <LoginAvatarCluster />
        </div>
      </section>
    </div>
  );
}
