"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { OvilerWordmark } from "@/app/components/OvilerWordmark";
import { LoginAvatarCluster } from "./LoginAvatarCluster";

const inputClass =
  "h-12 w-full rounded-xl border border-zinc-700/90 bg-zinc-900/80 px-4 text-[15px] font-medium text-zinc-100 outline-none transition-[border-color,box-shadow] placeholder:text-zinc-500 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/25";
const labelClass = "mb-2 block text-[13px] font-medium text-zinc-400";

function LoginContent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const supabase = createClient();
  const searchParams = useSearchParams();

  useEffect(() => {
    const err = searchParams.get("error");
    if (err === "no_organization") {
      setError(
        "Tu cuenta no está vinculada a ninguna organización. Si ya tenías una cuenta, pide al administrador que en Supabase (tabla users) asigne tu organization_id. Si prefieres un registro nuevo, usa «Solicitar licencia»."
      );
    } else if (err === "inactive") {
      setError(
        "Tu cuenta está desactivada. No puedes iniciar sesión hasta que un administrador la reactive."
      );
    }
  }, [searchParams]);

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
            "Correo o contraseña incorrectos. Si acabas de completar tu registro, usa exactamente el mismo correo y contraseña (el correo se guarda en minúsculas). Si no recuerdas la contraseña, usa «¿Olvidaste tu contraseña?»."
          );
        } else {
          setError(msg);
        }
        setLoading(false);
        return;
      }

      if (data.user) {
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("organization_id, status")
          .eq("id", data.user.id)
          .single();

        if (userError) {
          await supabase.auth.signOut();
          const hint =
            userError.code === "PGRST116"
              ? " No hay fila en la tabla users con tu id de Auth. En Supabase verifica que auth.users (Authentication → Users) tenga el mismo id que la fila en Table Editor → users para tu correo."
              : ` Detalle: ${userError.message}`;
          setError(
            "Tu cuenta no está vinculada a ninguna organización." + hint +
            " Si prefieres un registro nuevo, usa «Solicitar licencia»."
          );
          setLoading(false);
          return;
        }

        if (!userData?.organization_id) {
          await supabase.auth.signOut();
          setError(
            "Tu cuenta no está vinculada a ninguna organización (organization_id vacío en la tabla users). " +
            "En Supabase asigna tu organization_id en la tabla users. Si prefieres un registro nuevo, usa «Solicitar licencia»."
          );
          setLoading(false);
          return;
        }

        if (userData.status === "inactive") {
          await supabase.auth.signOut();
          setError(
            "Tu cuenta está desactivada. No puedes iniciar sesión hasta que un administrador la reactive."
          );
          setLoading(false);
          return;
        }

        const { data: branches } = await supabase
          .from("branches")
          .select("id")
          .eq("organization_id", userData.organization_id)
          .limit(1);

        const path = branches?.length ? "/dashboard" : "/onboarding";
        window.location.href = path;
      }
    } catch {
      setError("Error inesperado. Por favor intenta de nuevo.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-zinc-950 lg:flex-row">
      {/* Columna formulario (izquierda) */}
      <section className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-10 lg:w-1/2 lg:px-14 xl:px-20">
        <Link
          href="/"
          className="inline-block w-fit outline-offset-4 focus-visible:rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-500"
        >
          <OvilerWordmark
            variant="onDark"
            companyName="Bernabé"
            className="text-[clamp(1.75rem,4vw,2.5rem)] font-bold"
          />
        </Link>

        <h1 className="mt-10 text-3xl font-semibold tracking-tight text-white sm:text-[2rem]">Bienvenido de nuevo</h1>
        <p className="mt-2 text-[15px] text-zinc-400">Ingresa a tu cuenta para continuar</p>

        <form onSubmit={handleSubmit} className="mt-10 w-full max-w-md space-y-6">
          {error ? (
            <div className="rounded-xl border border-red-900/50 bg-red-950/50 px-4 py-3 text-[14px] leading-relaxed text-red-200">
              {error}
            </div>
          ) : null}

          <div>
            <label htmlFor="email" className={labelClass}>
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="tu@correo.com"
              className={inputClass}
              required
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <label htmlFor="password" className="text-[13px] font-medium text-zinc-400">
                Contraseña
              </label>
              <Link href="#" className="text-[13px] font-medium text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className={`${inputClass} pr-11`}
                required
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-zinc-400 transition-colors hover:text-zinc-200"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-3-11-7 1.011-2.024 2.365-3.65 3.955-4.842m3.207-1.482A10.055 10.055 0 0112 5c5 0 9 3 11 7a11.58 11.58 0 01-1.674 2.533M15 12a3 3 0 11-6 0 3 3 0 016 0zm6 9L3 3"
                    />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-xl bg-white px-4 text-[15px] font-bold text-zinc-900 shadow-sm transition-colors hover:bg-zinc-100 disabled:opacity-60"
          >
            {loading ? "Iniciando sesión…" : "Iniciar sesión"}
          </button>
        </form>

        <p className="mt-10 text-[14px] text-zinc-500">
          ¿Necesitas una licencia?{" "}
          <Link href="/registro" className="font-semibold text-zinc-300 underline-offset-2 hover:text-white hover:underline">
            Solicitar licencia
          </Link>
        </p>
      </section>

      {/* Columna ilustración avatares (derecha) */}
      <section className="flex flex-1 flex-col items-center justify-center border-t border-zinc-800/80 px-6 py-14 lg:border-l lg:border-t-0 lg:py-12">
        <div className="origin-center scale-[0.88] sm:scale-100">
          <LoginAvatarCluster />
        </div>
      </section>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center bg-zinc-950 text-zinc-500">Cargando…</div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
