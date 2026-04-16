"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import WorkspaceCharacterAvatar from "@/app/components/WorkspaceCharacterAvatar";
import { PERMISSION_OPTIONS, ROLE_DEFAULT_PERMISSIONS } from "@/lib/permissions";

const ROLES = [
  { id: "owner", name: "Dueño" },
  { id: "admin", name: "Administrador" },
  { id: "cashier", name: "Cajero" },
  { id: "delivery", name: "Inventario" },
];

const REQUIRED_PERMISSION = "activities.view";

function withRequiredPermissions(perms: string[]): string[] {
  return Array.from(new Set([...perms, REQUIRED_PERMISSION]));
}

function normalizeForUsername(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function suggestUsername(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  const first = normalizeForUsername(parts[0]!);
  const last = parts.length > 1 ? normalizeForUsername(parts[parts.length - 1]!) : first;
  if (!first) return last.slice(0, 8);
  return (first.charAt(0) + last).slice(0, 8);
}

export default function EditEmployeePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [nombre, setNombre] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [rol, setRol] = useState("cashier");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [avatarVariant, setAvatarVariant] = useState<"beam" | "marble" | "pixel">("beam");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(!!id);
  const [notFound, setNotFound] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser || cancelled) {
        setLoading(false);
        return;
      }
      const { data: me } = await supabase.from("users").select("organization_id").eq("id", authUser.id).single();
      if (!me?.organization_id || cancelled) {
        setLoading(false);
        return;
      }
      const { data: user, error } = await supabase
        .from("users")
        .select("id, name, email, role, status, avatar_url, permissions")
        .eq("id", id)
        .eq("organization_id", me.organization_id)
        .maybeSingle();
      if (cancelled) return;
      if (error || !user) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const u = user as { name: string; email: string; role: string; status: string | null; avatar_url?: string | null; permissions?: string[] | null };
      setNombre(u.name ?? "");
      setEmail((u.email ?? "").trim());
      setUsername(suggestUsername(u.name ?? ""));
      setRol(u.role && ROLES.some((r) => r.id === u.role) ? u.role : "cashier");
      setPermissions(withRequiredPermissions((u.permissions ?? ROLE_DEFAULT_PERMISSIONS[u.role] ?? ROLE_DEFAULT_PERMISSIONS.cashier) as string[]));
      setStatus((u.status === "inactive" ? "inactive" : "active") as "active" | "inactive");
      if (u.avatar_url?.startsWith("avatar:")) {
        const parsed = u.avatar_url.replace("avatar:", "");
        if (parsed === "beam" || parsed === "marble" || parsed === "pixel") {
          setAvatarVariant(parsed);
        }
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  const handleNombreChange = (fullName: string) => {
    setNombre(fullName);
    setUsername(suggestUsername(fullName));
  };

  const inputClass =
    "h-10 w-full rounded-xl border border-slate-200 bg-slate-50/90 px-4 text-[13px] font-medium text-slate-700 outline-none transition-[border-color,background-color,box-shadow] placeholder:text-slate-400 focus:border-slate-900/25 focus:bg-white focus:ring-2 focus:ring-slate-900/10 dark:border-zinc-700/50 dark:bg-zinc-950/60 dark:text-zinc-100 dark:[color-scheme:dark] dark:focus:border-zinc-500 dark:focus:bg-zinc-900 dark:focus:ring-0 dark:focus:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] dark:focus-visible:ring-1 dark:focus-visible:ring-zinc-500/30 dark:focus-visible:ring-offset-0 dark:focus-visible:ring-offset-transparent dark:placeholder:text-zinc-500";
  const labelClass = "mb-2 block text-[12px] font-semibold text-slate-700 dark:text-slate-300";
  const requiredMarkClass = "text-[color:var(--shell-sidebar)] dark:text-zinc-300";

  async function handleSave() {
    if (!id) return;
    const nameTrim = nombre.trim();
    if (!nameTrim) {
      alert("El nombre es obligatorio.");
      return;
    }
    const emailNorm = email.trim().toLowerCase();
    if (!emailNorm) {
      alert("El correo es obligatorio.");
      return;
    }
    setUploading(true);
    try {
      const res = await fetch("/api/admin/update-collaborator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          target_user_id: id,
          name: nameTrim,
          email: emailNorm,
          role: rol || "cashier",
          status,
          avatar_url: `avatar:${avatarVariant}`,
          permissions: withRequiredPermissions(permissions),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        alert(data.error ?? "No se pudieron guardar los cambios.");
        return;
      }
      router.push("/roles");
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto min-w-0 max-w-[1600px] space-y-8 font-sans text-[13px] font-normal leading-normal tracking-normal text-slate-800 antialiased dark:text-slate-100">
        <div className="min-h-[280px] animate-pulse rounded-2xl bg-white dark:bg-slate-900" aria-hidden />
      </div>
    );
  }
  if (notFound) {
    return (
      <div className="mx-auto min-w-0 max-w-[1600px] space-y-4 font-sans text-[13px] text-slate-800 antialiased dark:text-slate-100">
        <p className="text-[14px] font-medium text-slate-600 dark:text-slate-300">No se encontró el colaborador o no tienes permiso para editarlo.</p>
        <Link href="/roles" className="inline-flex items-center gap-2 text-[14px] font-medium text-[color:var(--shell-sidebar)] hover:underline dark:text-zinc-300">
          Volver a usuarios y roles
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto min-w-0 max-w-[1600px] space-y-8 font-sans text-[13px] font-normal leading-normal tracking-normal text-slate-800 antialiased dark:text-slate-100">
      <header className="min-w-0 rounded-2xl bg-white px-4 py-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-slate-900 dark:shadow-none sm:px-6 sm:py-6">
        <div className="mt-1 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-xl">
              Editar colaborador
            </h1>
            <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Actualiza datos, avatar o usuario del colaborador.
            </p>
          </div>
          <Link
            href="/roles"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-200"
            title="Volver a roles"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.2fr)]">
        <div className="space-y-4">
          <div className="rounded-3xl bg-white px-5 py-6 dark:bg-slate-900 sm:px-6 sm:py-7">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
              Datos del colaborador
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className={labelClass}>Avatar</label>
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <WorkspaceCharacterAvatar
                      seed={`${email.trim() || nombre.trim() || id || "colaborador"}-${avatarVariant}`}
                      size={128}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <select
                      value={avatarVariant}
                      onChange={(e) => setAvatarVariant(e.target.value as "beam" | "marble" | "pixel")}
                      className="h-10 rounded-xl border border-slate-200 bg-slate-50/90 px-3 text-[13px] font-medium text-slate-800 outline-none transition-[border-color,background-color,box-shadow] focus:border-slate-900/25 focus:bg-white focus:ring-2 focus:ring-slate-900/10 dark:border-zinc-700/50 dark:bg-zinc-950/60 dark:text-zinc-100 dark:[color-scheme:dark] dark:focus:border-zinc-500 dark:focus:bg-zinc-900 dark:focus:ring-0 dark:focus:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] dark:focus-visible:ring-1 dark:focus-visible:ring-zinc-500/30 dark:focus-visible:ring-offset-0 dark:focus-visible:ring-offset-transparent"
                    >
                      <option value="beam">Personaje A</option>
                      <option value="marble">Personaje B</option>
                      <option value="pixel">Personaje C</option>
                    </select>
                    <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
                      Personaje generado (DiceBear). Elige una variante; se guarda con la cuenta.
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <label className={labelClass}>Nombre completo <span className={requiredMarkClass}>*</span></label>
                <input
                  value={nombre}
                  onChange={(e) => handleNombreChange(e.target.value)}
                  placeholder="Ej. María López"
                  className={inputClass}
                  disabled={loading}
                />
              </div>
              <div>
                <label className={labelClass}>Usuario (acceso) <span className={requiredMarkClass}>*</span></label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ej. mlopez (solo referencia)"
                  className={inputClass}
                  disabled={loading}
                />
              </div>
              <div>
                <label className={labelClass}>Correo <span className={requiredMarkClass}>*</span></label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ej. maria@tienda.com"
                  className={inputClass}
                  disabled={loading}
                />
              </div>
              <div>
                <label className={labelClass}>Rol</label>
                <select value={rol} onChange={(e) => setRol(e.target.value)} className={inputClass} disabled={loading}>
                  <option value="">Seleccionar rol</option>
                  {ROLES.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white px-5 py-6 dark:bg-slate-900 sm:px-6 sm:py-7">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
              Resumen
            </p>
            <div className="mt-3 space-y-3 text-[13px]">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-3 dark:border-slate-800 dark:bg-slate-800/25">
                <p className="font-semibold text-slate-800 dark:text-slate-100">Colaborador</p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">{nombre || "—"}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-3 dark:border-slate-800 dark:bg-slate-800/25">
                <p className="font-semibold text-slate-800 dark:text-slate-100">Usuario</p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">{username ? `@${username}` : "—"}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-3 dark:border-slate-800 dark:bg-slate-800/25">
                <p className="font-semibold text-slate-800 dark:text-slate-100">Rol</p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  {ROLES.find((r) => r.id === rol)?.name ?? "—"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-3 dark:border-slate-800 dark:bg-slate-800/25">
                <p className="font-semibold text-slate-800 dark:text-slate-100">Estado</p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  {status === "active" ? "Activo" : "Inactivo"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl bg-white px-5 py-6 dark:bg-slate-900 sm:px-6 sm:py-7">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
                Permisos
              </p>
              <button
                type="button"
                onClick={() => setPermissions(withRequiredPermissions([...(ROLE_DEFAULT_PERMISSIONS[rol] ?? ROLE_DEFAULT_PERMISSIONS.cashier)]))}
                className="shrink-0 text-[12px] font-medium text-[color:var(--shell-sidebar)] hover:underline dark:text-zinc-300"
              >
                Restaurar por rol
              </button>
            </div>
            <div className="max-h-[min(60vh,520px)] overflow-y-auto rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
              {Array.from(new Set(PERMISSION_OPTIONS.map((p) => p.group))).map((group) => (
                <div key={group} className="mb-3 last:mb-0">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{group}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {PERMISSION_OPTIONS.filter((p) => p.group === group).map((perm) => {
                      const checked = permissions.includes(perm.key);
                      return (
                        <label key={perm.key} className="flex items-center gap-2 text-[13px] text-slate-700 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              setPermissions((prev) => {
                                if (perm.key === REQUIRED_PERMISSION && !e.target.checked) return prev;
                                return withRequiredPermissions(
                                  e.target.checked
                                    ? Array.from(new Set([...prev, perm.key]))
                                    : prev.filter((k) => k !== perm.key)
                                );
                              });
                            }}
                            disabled={perm.key === REQUIRED_PERMISSION}
                            className="h-4 w-4 shrink-0 rounded border-slate-300 text-[color:var(--shell-sidebar)] focus:ring-slate-400/50 dark:border-slate-600"
                          />
                          <span>{perm.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-white px-5 py-6 dark:bg-slate-900 sm:px-6 sm:py-7">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
              Estado de acceso
            </p>
            <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
              Activo puede iniciar sesión; inactivo no podrá entrar hasta que lo reactives.
            </p>
            <div
              className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-slate-100/90 p-1 dark:bg-slate-800/60"
              role="group"
              aria-label="Activar o desactivar colaborador"
            >
              <button
                type="button"
                onClick={() => setStatus("active")}
                disabled={loading}
                className={`rounded-lg px-3 py-2.5 text-center text-[13px] font-semibold transition-all ${
                  status === "active"
                    ? "bg-white text-emerald-800 shadow-[0_1px_2px_rgba(15,23,42,0.06)] dark:bg-slate-900 dark:text-emerald-300"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                Activo
              </button>
              <button
                type="button"
                onClick={() => setStatus("inactive")}
                disabled={loading}
                className={`rounded-lg px-3 py-2.5 text-center text-[13px] font-semibold transition-all ${
                  status === "inactive"
                    ? "bg-white text-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.06)] dark:bg-slate-900 dark:text-slate-200"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                Inactivo
              </button>
            </div>
          </div>

          <div className="rounded-3xl bg-white px-5 py-5 dark:bg-slate-900 sm:px-6 sm:py-6">
            <div className="space-y-3">
              <div className="text-[13px] font-medium text-slate-600 dark:text-slate-400">
                <p className="font-semibold text-slate-700 dark:text-slate-100">Paso final</p>
                <p className="mt-1">
                  Guarda los cambios para aplicar las modificaciones.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={uploading || loading}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--shell-sidebar)] px-4 text-[13px] font-medium text-white shadow-[0_1px_2px_rgba(15,23,42,0.12)] transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)] disabled:opacity-50"
              >
                {uploading ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
