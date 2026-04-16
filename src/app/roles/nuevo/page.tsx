"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { loadOrgPlanSnapshot, type OrgPlanSnapshot } from "@/lib/org-plan-snapshot";
import { BackLink, PlanLimitHeaderNote } from "@/app/components/PlanLimitNotice";
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
  const short = first.charAt(0) + last;
  return short.slice(0, 8);
}

/** Mensajes de Supabase/API en inglés → español para la UI */
function collaboratorErrorMessage(raw: string | undefined | null): string {
  if (raw == null || String(raw).trim() === "") return "No se pudo crear el colaborador.";
  const s = String(raw).trim();
  if (/A user with this email address has already been registered/i.test(s)) {
    return "Ya existe un usuario registrado con este correo electrónico.";
  }
  if (/User already registered|Email address.*already|already been registered|already exists|duplicate user/i.test(s)) {
    return "Este correo ya está registrado.";
  }
  return s;
}

export default function NewEmployeePage() {
  const [nombre, setNombre] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState("");
  const [permissions, setPermissions] = useState<string[]>(withRequiredPermissions([...(ROLE_DEFAULT_PERMISSIONS.cashier ?? [])]));
  const [avatarVariant, setAvatarVariant] = useState<"beam" | "marble" | "pixel">("beam");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planSnapshot, setPlanSnapshot] = useState<OrgPlanSnapshot | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [branchId, setBranchId] = useState("");

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser || cancelled) {
        setPlanLoading(false);
        return;
      }
      const { data: me } = await supabase.from("users").select("organization_id").eq("id", authUser.id).single();
      if (!me?.organization_id || cancelled) {
        setPlanLoading(false);
        return;
      }
      const [snap, branchesRes, myUb] = await Promise.all([
        loadOrgPlanSnapshot(supabase, me.organization_id),
        supabase.from("branches").select("id, name").eq("organization_id", me.organization_id).order("name"),
        supabase.from("user_branches").select("branch_id").eq("user_id", authUser.id).limit(1).maybeSingle(),
      ]);
      if (cancelled) return;
      setPlanSnapshot(snap);
      const list = (branchesRes.data ?? []) as { id: string; name: string }[];
      setBranches(list);
      const preferred = myUb.data?.branch_id;
      const initial =
        preferred && list.some((b) => b.id === preferred) ? preferred : list[0]?.id ?? "";
      setBranchId(initial);
      setPlanLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleNombreChange = (fullName: string) => {
    setNombre(fullName);
    setUsername(suggestUsername(fullName));
  };

  async function handleCreate() {
    if (planSnapshot && !planSnapshot.canCreateUser) return;
    const nameTrim = nombre.trim();
    if (!nameTrim) {
      setError("El nombre es obligatorio.");
      return;
    }
    if (!email.trim()) {
      setError("El correo es obligatorio.");
      return;
    }
    if (!password || password.length < 6) {
      setError("La contraseña inicial debe tener al menos 6 caracteres.");
      return;
    }
    if (!branchId || !branches.some((b) => b.id === branchId)) {
      setError("Selecciona la sucursal a la que quedará asignado el colaborador.");
      return;
    }
    const roleToUse = rol && ROLES.some((r) => r.id === rol) ? rol : "cashier";
    setError(null);
    setUploading(true);
    const supabase = createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      setUploading(false);
      setError("Sesión expirada. Vuelve a iniciar sesión.");
      return;
    }
    const { data: me } = await supabase.from("users").select("organization_id").eq("id", authUser.id).single();
    if (!me?.organization_id) {
      setUploading(false);
      setError("No se pudo obtener la organización.");
      return;
    }
    try {
      const createRes = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          name: nameTrim,
          organization_id: me.organization_id,
          branch_id: branchId,
        }),
      });
      const createData = await createRes.json().catch(() => ({}));
      if (!createRes.ok) {
        setError(collaboratorErrorMessage(createData.error));
        setUploading(false);
        return;
      }
      const newUserId = createData.user_id;
      if (!newUserId) {
        setError("Error al crear. No se recibió el id.");
        setUploading(false);
        return;
      }
      const updatePayload: { role: string; avatar_url: string; permissions: string[] } = {
        role: roleToUse,
        avatar_url: `avatar:${avatarVariant}`,
        permissions: withRequiredPermissions(permissions),
      };
      await supabase.from("users").update(updatePayload).eq("id", newUserId);
    } catch (err) {
      setError(collaboratorErrorMessage(err instanceof Error ? err.message : "Error inesperado"));
      setUploading(false);
      return;
    }
    setUploading(false);
    window.location.href = "/roles";
  }

  const inputClass =
    "h-10 w-full rounded-lg border border-slate-200 bg-slate-50/90 px-4 text-[14px] font-medium text-slate-800 outline-none transition-[border-color,background-color,box-shadow] placeholder:text-slate-400 focus:border-slate-900/25 focus:bg-white focus:ring-2 focus:ring-slate-900/10 dark:border-zinc-700/50 dark:bg-zinc-950/60 dark:text-zinc-100 dark:[color-scheme:dark] dark:focus:border-zinc-500 dark:focus:bg-zinc-900 dark:focus:ring-0 dark:focus:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] dark:focus-visible:ring-1 dark:focus-visible:ring-zinc-500/30 dark:focus-visible:ring-offset-0 dark:focus-visible:ring-offset-transparent dark:placeholder:text-zinc-500";
  const labelClass = "mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300";

  if (planLoading) {
    return (
      <div className="space-y-4">
        <p className="text-[14px] text-slate-600 dark:text-slate-400">Cargando…</p>
      </div>
    );
  }

  if (planSnapshot && !planSnapshot.canCreateUser) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <p className="text-[14px] text-slate-600 dark:text-slate-400">
          <BackLink href="/roles" label="← Volver a usuarios y roles" />
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-emerald-50">Nuevo colaborador</h1>
        <PlanLimitHeaderNote kind="users" planId={planSnapshot.planId} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-emerald-50">
              Nuevo colaborador
            </h1>
            <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Registra un colaborador: foto, nombre y usuario corto para acceso al sistema.
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
                    <WorkspaceCharacterAvatar
                      seed={`${email.trim() || nombre.trim() || "nuevo-colaborador"}-${avatarVariant}`}
                      size={160}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <select
                      value={avatarVariant}
                      onChange={(e) => setAvatarVariant(e.target.value as "beam" | "marble" | "pixel")}
                      className="h-10 rounded-lg border border-slate-200 bg-slate-50/90 px-3 text-[13px] font-medium text-slate-800 outline-none transition-[border-color,background-color,box-shadow] focus:border-slate-900/25 focus:bg-white focus:ring-2 focus:ring-slate-900/10 dark:border-zinc-700/50 dark:bg-zinc-950/60 dark:text-zinc-100 dark:[color-scheme:dark] dark:focus:border-zinc-500 dark:focus:bg-zinc-900 dark:focus:ring-0 dark:focus:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] dark:focus-visible:ring-1 dark:focus-visible:ring-zinc-500/30 dark:focus-visible:ring-offset-0 dark:focus-visible:ring-offset-transparent"
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
                <label className={labelClass}>Nombre completo <span className="text-ov-pink">*</span></label>
                <input
                  value={nombre}
                  onChange={(e) => handleNombreChange(e.target.value)}
                  placeholder="Ej. María López"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Usuario (acceso) <span className="text-ov-pink">*</span></label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ej. mlopez"
                  className={inputClass}
                />
                <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
                  Generado automáticamente desde el nombre. Corto y sin espacios.
                </p>
              </div>
              <div>
                <label className={labelClass}>Correo <span className="text-ov-pink">*</span></label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ej. maria@tienda.com"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Contraseña inicial <span className="text-ov-pink">*</span></label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className={inputClass}
                  minLength={6}
                  autoComplete="new-password"
                />
                <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
                  El colaborador podrá cambiarla al iniciar sesión.
                </p>
              </div>
              <div>
                <label className={labelClass}>Rol</label>
                <select
                  value={rol}
                  onChange={(e) => {
                    const nextRole = e.target.value;
                    setRol(nextRole);
                    const roleKey = nextRole && ROLES.some((r) => r.id === nextRole) ? nextRole : "cashier";
                    setPermissions(withRequiredPermissions([...(ROLE_DEFAULT_PERMISSIONS[roleKey] ?? ROLE_DEFAULT_PERMISSIONS.cashier)]));
                  }}
                  className={inputClass}
                >
                  <option value="">Seleccionar rol</option>
                  {ROLES.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>
                  Sucursal <span className="text-ov-pink">*</span>
                </label>
                {branches.length === 0 ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-2 text-[13px] font-medium text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                    No hay sucursales en la organización.{" "}
                    <Link href="/sucursales/nueva" className="font-semibold underline underline-offset-2">
                      Crea una sucursal
                    </Link>{" "}
                    antes de registrar colaboradores.
                  </p>
                ) : (
                  <>
                    <select
                      value={branchId}
                      onChange={(e) => setBranchId(e.target.value)}
                      className={inputClass}
                      required
                    >
                      <option value="">Seleccionar sucursal</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
                      El colaborador trabajará con datos de inventario, ventas y clientes de esta sucursal.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                Permisos
              </p>
              <button
                type="button"
                onClick={() => {
                  const roleKey = rol && ROLES.some((r) => r.id === rol) ? rol : "cashier";
                  setPermissions(withRequiredPermissions([...(ROLE_DEFAULT_PERMISSIONS[roleKey] ?? ROLE_DEFAULT_PERMISSIONS.cashier)]));
                }}
                className="shrink-0 text-[12px] font-medium text-ov-pink hover:underline"
              >
                Restaurar por rol
              </button>
            </div>
            <div className="max-h-[min(60vh,520px)] overflow-y-auto rounded-lg border border-slate-200 p-3 dark:border-slate-700">
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
                            className="h-4 w-4 shrink-0 rounded border-slate-300 text-ov-pink focus:ring-ov-pink/30 dark:border-slate-600"
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
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                <p className="font-bold text-slate-800 dark:text-slate-100">Sucursal</p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  {branches.find((b) => b.id === branchId)?.name ?? "—"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <div className="space-y-3">
              <div className="text-[13px] font-medium text-slate-600 dark:text-slate-400">
                <p className="font-bold text-slate-700 dark:text-slate-100">Paso final</p>
                <p className="mt-1">
                  Al confirmar se creará el colaborador.
                </p>
              </div>
              {error ? (
                <div
                  className="rounded-lg border border-red-200 bg-red-50 p-3 text-[13px] font-medium text-red-800 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-300"
                  role="alert"
                >
                  {error}
                </div>
              ) : null}
              <button
                type="button"
                onClick={handleCreate}
                disabled={uploading || branches.length === 0 || !branchId}
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-ov-pink px-4 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-ov-pink-hover disabled:opacity-50 dark:bg-ov-pink dark:hover:bg-ov-pink-hover"
              >
                {uploading ? "Guardando…" : "Crear colaborador"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
