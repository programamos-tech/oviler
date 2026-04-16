"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import WorkspaceCharacterAvatar from "@/app/components/WorkspaceCharacterAvatar";
import { getAvatarVariant } from "@/app/components/app-nav-data";
import { workspaceRoleLabel } from "@/app/components/workspace-title";
import { workspaceFormInputClass } from "@/lib/workspace-field-classes";

const inputClass = workspaceFormInputClass;
const labelClass = "mb-2 block text-[12px] font-semibold text-slate-700 dark:text-slate-300";
const sectionTitleClass = "text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500";
const cardClass = "rounded-3xl bg-white px-5 py-6 dark:bg-slate-900 sm:px-6 sm:py-7";
const requiredMarkClass = "text-[color:var(--shell-sidebar)] dark:text-zinc-300";

type AvatarVariant = "beam" | "marble" | "pixel";

export default function CuentaPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const [avatarVariant, setAvatarVariant] = useState<AvatarVariant>("beam");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser || cancelled) {
        setLoading(false);
        return;
      }

      const { data: userRow } = await supabase
        .from("users")
        .select("name, email, role, avatar_url")
        .eq("id", authUser.id)
        .maybeSingle();

      if (cancelled) return;
      setName((userRow?.name ?? "").trim());
      setEmail((userRow?.email ?? authUser.email ?? "").trim());
      setRole((userRow?.role ?? null) as string | null);
      setAvatarVariant(getAvatarVariant(userRow?.avatar_url ?? null));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function handleSave() {
    setSaveSuccess(false);
    const nameTrim = name.trim();
    if (!nameTrim) return;
    setSaving(true);

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("users")
      .update({
        name: nameTrim,
        avatar_url: `avatar:${avatarVariant}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", authUser.id);

    setSaving(false);
    if (error) return;
    setSaveSuccess(true);
  }

  if (loading) {
    return (
      <div className="mx-auto min-w-0 max-w-[1600px] space-y-8 font-sans text-[13px] text-slate-800 antialiased dark:text-slate-100">
        <div className="min-h-[280px] animate-pulse rounded-2xl bg-white dark:bg-slate-900" aria-hidden />
      </div>
    );
  }

  return (
    <div className="mx-auto min-w-0 max-w-[1600px] space-y-8 font-sans text-[13px] font-normal leading-normal tracking-normal text-slate-800 antialiased dark:text-slate-100">
      <header className="min-w-0 rounded-2xl bg-white px-4 py-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-slate-900 dark:shadow-none sm:px-6 sm:py-6">
        <div className="mt-1 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-xl">
              Cuenta
            </h1>
            <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Actualiza tus datos, avatar y detalles del propietario.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-200"
            title="Volver"
            aria-label="Volver"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.2fr)]">
        <div className="space-y-4">
          <div className={cardClass}>
            <p className={sectionTitleClass}>Datos del propietario</p>
            <div className="mt-4 space-y-3">
              <div>
                <label className={labelClass}>Avatar</label>
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <WorkspaceCharacterAvatar
                      seed={`${email.trim() || name.trim() || "propietario"}-${avatarVariant}`}
                      size={128}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <select
                      value={avatarVariant}
                      onChange={(e) => setAvatarVariant(e.target.value as AvatarVariant)}
                      className="h-10 rounded-xl border border-slate-200 bg-slate-50/90 px-3 text-[13px] font-medium text-slate-700 outline-none focus:border-[color:var(--shell-sidebar)] focus:bg-white focus:ring-2 focus:ring-slate-400/35 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:focus:border-zinc-500"
                    >
                      <option value="beam">Personaje A</option>
                      <option value="marble">Personaje B</option>
                      <option value="pixel">Personaje C</option>
                    </select>
                    <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
                      Personaje generado (DiceBear). Elige una variante; se guarda con tu cuenta.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  Nombre completo <span className={requiredMarkClass}>*</span>
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Andrew"
                  className={inputClass}
                  disabled={saving}
                />
              </div>

              <div>
                <label className={labelClass}>Correo</label>
                <input value={email} className={inputClass} disabled readOnly />
                <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
                  El correo se gestiona desde autenticación. Si necesitas cambiarlo, pide soporte.
                </p>
              </div>

              <div>
                <label className={labelClass}>Rol</label>
                <input value={workspaceRoleLabel(role)} className={inputClass} disabled readOnly />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className={cardClass}>
            <p className={sectionTitleClass}>Resumen</p>
            <div className="mt-3 space-y-3 text-[13px]">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-3 dark:border-slate-800 dark:bg-slate-800/25">
                <p className="font-semibold text-slate-800 dark:text-slate-100">Propietario</p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">{name.trim() || "—"}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-3 dark:border-slate-800 dark:bg-slate-800/25">
                <p className="font-semibold text-slate-800 dark:text-slate-100">Correo</p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">{email.trim() || "—"}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-3 dark:border-slate-800 dark:bg-slate-800/25">
                <p className="font-semibold text-slate-800 dark:text-slate-100">Rol</p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">{workspaceRoleLabel(role)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white px-5 py-5 dark:bg-slate-900 sm:px-6 sm:py-6">
            <div className="space-y-3">
              <div className="text-[13px] font-medium text-slate-600 dark:text-slate-400">
                <p className="font-semibold text-slate-700 dark:text-slate-100">Paso final</p>
                <p className="mt-1">Guarda los cambios para aplicar las modificaciones.</p>
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--shell-sidebar)] px-4 text-[13px] font-medium text-white shadow-[0_1px_2px_rgba(15,23,42,0.12)] transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)] disabled:opacity-50"
              >
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
              {saveSuccess ? (
                <p className="text-center text-[13px] font-medium text-emerald-600 dark:text-emerald-400" role="status">
                  Cambios guardados correctamente.
                </p>
              ) : null}
              <p className="text-center text-[12px] text-slate-500 dark:text-slate-400">
                ¿Necesitas ajustar datos de la sucursal? Ve a{" "}
                <Link href="/sucursales" className="font-semibold text-[color:var(--shell-sidebar)] hover:underline dark:text-zinc-200">
                  Sucursales
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

