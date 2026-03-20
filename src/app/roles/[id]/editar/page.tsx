"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Avatar from "boring-avatars";
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
      setEmail(u.email ?? "");
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
    "h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200";
  const labelClass = "mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300";

  async function handleSave() {
    if (!id) return;
    const nameTrim = nombre.trim();
    if (!nameTrim) {
      alert("El nombre es obligatorio.");
      return;
    }
    if (!email.trim()) {
      alert("El correo es obligatorio.");
      return;
    }
    setUploading(true);
    const supabase = createClient();

    const updatePayload: { name: string; email: string; role: string; status: string; updated_at: string; avatar_url: string; permissions: string[] } = {
      name: nameTrim,
      email: email.trim(),
      role: rol || "cashier",
      status,
      updated_at: new Date().toISOString(),
      avatar_url: `avatar:${avatarVariant}`,
      permissions: withRequiredPermissions(permissions),
    };

    const { data: updated, error } = await supabase
      .from("users")
      .update(updatePayload)
      .eq("id", id)
      .select("id");
    setUploading(false);
    if (error) {
      alert("No se pudieron guardar los cambios: " + (error.message ?? ""));
      return;
    }
    if (!updated?.length) {
      alert("No se pudo actualizar (permisos o usuario no encontrado). Revisa que exista la política UPDATE en la tabla users.");
      return;
    }
    router.push("/roles");
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <p className="text-[14px] text-slate-500 dark:text-slate-400">Cargando colaborador…</p>
      </div>
    );
  }
  if (notFound) {
    return (
      <div className="space-y-4">
        <p className="text-[14px] text-slate-600 dark:text-slate-300">No se encontró el colaborador o no tienes permiso para editarlo.</p>
        <Link href="/roles" className="inline-flex items-center gap-2 text-[14px] font-medium text-ov-pink hover:underline">
          Volver a usuarios y roles
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-emerald-50">
              Editar colaborador
            </h1>
            <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Actualiza datos, avatar o usuario del colaborador.
            </p>
          </div>
          <Link
            href="/roles"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            title="Volver a roles"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.2fr)]">
        <div className="space-y-4">
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Datos del colaborador
            </p>
            <div className="mt-3 space-y-3">
              <div>
                <label className={labelClass}>Avatar</label>
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-50 dark:bg-slate-800">
                    <Avatar
                      size={76}
                      name={`${nombre.trim() || email.trim() || id || "colaborador"}-${avatarVariant}`}
                      variant={avatarVariant}
                      colors={["#FF7F50", "#FFA07A", "#FFB300", "#00BFA5", "#5C6BC0"]}
                    />
                  </div>
                  <div>
                    <select
                      value={avatarVariant}
                      onChange={(e) => setAvatarVariant(e.target.value as "beam" | "marble" | "pixel")}
                      className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <option value="beam">NOU Beam</option>
                      <option value="marble">NOU Marble</option>
                      <option value="pixel">NOU Pixel</option>
                    </select>
                    <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
                      Avatar automático con estilo de marca.
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <label className={labelClass}>Nombre completo <span className="text-ov-pink">*</span></label>
                <input
                  value={nombre}
                  onChange={(e) => handleNombreChange(e.target.value)}
                  placeholder="Ej. María López"
                  className={inputClass}
                  disabled={loading}
                />
              </div>
              <div>
                <label className={labelClass}>Usuario (acceso) <span className="text-ov-pink">*</span></label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ej. mlopez (solo referencia)"
                  className={inputClass}
                  disabled={loading}
                />
              </div>
              <div>
                <label className={labelClass}>Correo <span className="text-ov-pink">*</span></label>
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
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <label className={labelClass.replace("mb-2", "mb-0")}>Permisos</label>
                  <button
                    type="button"
                    onClick={() => setPermissions(withRequiredPermissions([...(ROLE_DEFAULT_PERMISSIONS[rol] ?? ROLE_DEFAULT_PERMISSIONS.cashier)]))}
                    className="text-[12px] font-medium text-ov-pink hover:underline"
                  >
                    Restaurar por rol
                  </button>
                </div>
                <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                  {Array.from(new Set(PERMISSION_OPTIONS.map((p) => p.group))).map((group) => (
                    <div key={group} className="mb-3 last:mb-0">
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{group}</p>
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
                                className="h-4 w-4 rounded border-slate-300 text-ov-pink focus:ring-ov-pink/30 dark:border-slate-600"
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
              <div>
                <label className={labelClass}>Estado</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as "active" | "inactive")} className={inputClass} disabled={loading}>
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Resumen
            </p>
            <div className="mt-3 space-y-3 text-[13px]">
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                <p className="font-bold text-slate-800 dark:text-slate-100">Colaborador</p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">{nombre || "—"}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                <p className="font-bold text-slate-800 dark:text-slate-100">Usuario</p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">{username ? `@${username}` : "—"}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                <p className="font-bold text-slate-800 dark:text-slate-100">Rol</p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  {ROLES.find((r) => r.id === rol)?.name ?? "—"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <div className="space-y-3">
              <div className="text-[13px] font-medium text-slate-600 dark:text-slate-400">
                <p className="font-bold text-slate-700 dark:text-slate-100">Paso final</p>
                <p className="mt-1">
                  Guarda los cambios para aplicar las modificaciones.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={uploading || loading}
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-ov-pink px-4 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-ov-pink-hover disabled:opacity-50 dark:bg-ov-pink dark:hover:bg-ov-pink-hover"
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
