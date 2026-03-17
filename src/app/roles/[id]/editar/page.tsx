"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const ROLES = [
  { id: "owner", name: "Dueño" },
  { id: "admin", name: "Administrador" },
  { id: "cashier", name: "Cajero" },
  { id: "delivery", name: "Repartidor" },
];

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
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
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
        .select("id, name, email, role, status, avatar_url")
        .eq("id", id)
        .eq("organization_id", me.organization_id)
        .maybeSingle();
      if (cancelled) return;
      if (error || !user) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const u = user as { name: string; email: string; role: string; status: string | null; avatar_url?: string | null };
      setNombre(u.name ?? "");
      setEmail(u.email ?? "");
      setUsername(suggestUsername(u.name ?? ""));
      setRol(u.role && ROLES.some((r) => r.id === u.role) ? u.role : "cashier");
      setStatus((u.status === "inactive" ? "inactive" : "active") as "active" | "inactive");
      if (u.avatar_url) setPhotoPreview(u.avatar_url);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  const handleNombreChange = (fullName: string) => {
    setNombre(fullName);
    setUsername(suggestUsername(fullName));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    } else {
      setPhotoFile(null);
      setPhotoPreview(null);
    }
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
    let avatarUrl: string | null = null;

    if (photoFile) {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        setUploading(false);
        alert("Sesión expirada. Vuelve a iniciar sesión.");
        return;
      }
      const maxSize = 5 * 1024 * 1024;
      if (photoFile.size > maxSize) {
        setUploading(false);
        alert("La foto no debe superar 5 MB.");
        return;
      }
      const ext = photoFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${authUser.id}/${id}_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, photoFile, { upsert: true });
      if (uploadError) {
        setUploading(false);
        alert("Error al subir la foto: " + (uploadError.message ?? ""));
        return;
      }
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      avatarUrl = urlData.publicUrl;
    }

    const updatePayload: { name: string; email: string; role: string; status: string; updated_at: string; avatar_url?: string | null } = {
      name: nameTrim,
      email: email.trim(),
      role: rol || "cashier",
      status,
      updated_at: new Date().toISOString(),
    };
    if (avatarUrl !== undefined) updatePayload.avatar_url = avatarUrl;

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
              Actualiza datos, foto o usuario del colaborador.
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
                <label className={labelClass}>Foto</label>
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                    {photoPreview ? (
                      <img src={photoPreview} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[12px] font-medium text-slate-400">Actual</span>
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="block w-full text-[13px] text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-[13px] file:font-medium file:text-slate-700 dark:file:bg-slate-800 dark:file:text-slate-200"
                    />
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
                  placeholder="Ej. maria@iglesia.com"
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
