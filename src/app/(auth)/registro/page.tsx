"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { BereaAuthLogo } from "../login/BereaAuthLogo";
import { LoginBrandPanel } from "../login/LoginBrandPanel";

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
    <div className="berea-auth-page">
      <div className="berea-auth-layout">
        <main className="berea-auth-main">
          <div className="berea-auth-card">
            <BereaAuthLogo href="/" />

            <header className="berea-auth-card-header">
              <h1>Crea tu cuenta</h1>
              <p>
                Regístrate gratis y prueba Berea Comercios: inventario, ventas, clientes y reportes en un solo panel.
              </p>
            </header>

            <form onSubmit={handleSubmit} className="berea-auth-form">
              {error ? (
                <div className="berea-auth-error">
                  <p>{error}</p>
                  {error.includes("Iniciar sesión") ? (
                    <Link href="/login" className="berea-auth-link-accent mt-2 inline-block hover:underline">
                      Ir a Iniciar sesión
                    </Link>
                  ) : null}
                </div>
              ) : null}

              <div className="berea-auth-field">
                <label htmlFor="name" className="berea-auth-label">
                  Nombre completo
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Tu nombre"
                  className="berea-auth-input"
                  required
                  disabled={loading}
                  autoComplete="name"
                />
              </div>

              <div className="berea-auth-field">
                <label htmlFor="email" className="berea-auth-label">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  className="berea-auth-input"
                  required
                  disabled={loading}
                  autoComplete="email"
                />
              </div>

              <div className="berea-auth-field">
                <label htmlFor="password" className="berea-auth-label">
                  Contraseña
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  className="berea-auth-input"
                  required
                  minLength={6}
                  disabled={loading}
                  autoComplete="new-password"
                />
              </div>

              <p className="text-[13px] leading-relaxed text-[var(--berea-ink-muted)]">
                Al crear tu cuenta, aceptas nuestros términos de servicio y política de privacidad.
              </p>

              <button type="submit" disabled={loading} className="berea-auth-btn-primary">
                {loading ? "Creando tu cuenta…" : "Crear cuenta"}
              </button>
            </form>

            <p className="berea-auth-footer">
              ¿Ya tienes acceso?{" "}
              <Link href="/login" className="berea-auth-link-accent hover:underline">
                Iniciar sesión
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
