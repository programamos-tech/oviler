"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BereaAuthLogo } from "./BereaAuthLogo";
import { LoginBrandPanel } from "./LoginBrandPanel";

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
        "Tu cuenta no está vinculada a ninguna organización. Si ya tenías una cuenta, pide al administrador que te asigne acceso. Si no, crea una cuenta nueva con el botón «Crear cuenta»."
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
            " Si no tienes cuenta, usa «Crear cuenta»."
          );
          setLoading(false);
          return;
        }

        if (!userData?.organization_id) {
          await supabase.auth.signOut();
          setError(
            "Tu cuenta no está vinculada a ninguna organización (organization_id vacío en la tabla users). " +
            "Pide al administrador que vincule tu cuenta a una organización, o crea una cuenta nueva con «Crear cuenta»."
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
    <div className="berea-auth-page">
      <div className="berea-auth-layout">
        <main className="berea-auth-main">
          <div className="berea-auth-card">
            <BereaAuthLogo href="/" />

            <header className="berea-auth-card-header">
              <h1>Bienvenido de nuevo</h1>
              <p>Ingresa a tu cuenta para continuar</p>
            </header>

            <form onSubmit={handleSubmit} className="berea-auth-form">
              {error ? <div className="berea-auth-error">{error}</div> : null}

              <div className="berea-auth-field">
                <label htmlFor="email" className="berea-auth-label">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="tu@correo.com"
                  className="berea-auth-input"
                  required
                  disabled={loading}
                  autoComplete="email"
                />
              </div>

              <div className="berea-auth-field">
                <div className="berea-auth-field-row">
                  <label htmlFor="password" className="berea-auth-label mb-0">
                    Contraseña
                  </label>
                  <Link href="#" className="berea-auth-link">
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="berea-auth-input pr-11"
                    required
                    disabled={loading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-[var(--berea-ink-subtle)] transition-colors hover:text-[var(--berea-ink)]"
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

              <button type="submit" disabled={loading} className="berea-auth-btn-primary">
                {loading ? "Iniciando sesión…" : "Iniciar sesión"}
              </button>

              <div className="berea-auth-register-block">
                <div className="berea-auth-divider" aria-hidden>
                  o
                </div>
                <Link href="/registro" className="berea-auth-btn-secondary">
                  Crear cuenta
                </Link>
                <p className="berea-auth-register-hint">
                  Prueba Berea Comercios gratis: inventario, ventas y clientes en minutos.
                </p>
              </div>
            </form>

            <p className="berea-auth-footer">
              ¿Primera vez en Berea?{" "}
              <Link href="/registro" className="berea-auth-link-accent hover:underline">
                Regístrate aquí
              </Link>
            </p>
          </div>
        </main>

        <aside className="berea-auth-aside">
          <LoginBrandPanel />
        </aside>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="berea-auth-page flex min-h-screen items-center justify-center text-[var(--berea-ink-muted)]">
          Cargando…
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
