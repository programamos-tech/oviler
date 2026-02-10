"use client";

import Link from "next/link";
import { useState } from "react";

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
  const short = first.charAt(0) + last;
  return short.slice(0, 8);
}

export default function NewEmployeePage() {
  const [nombre, setNombre] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [rol, setRol] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

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

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-emerald-50">
              Nuevo empleado
            </h1>
            <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Registra un empleado: foto, nombre y usuario corto para acceso al sistema.
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
              Datos del empleado
            </p>
            <div className="mt-3 space-y-3">
              <div>
                <label className={labelClass}>Foto (opcional)</label>
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                    {photoPreview ? (
                      <img src={photoPreview} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[12px] font-medium text-slate-400">Sin foto</span>
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="block w-full text-[13px] text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-[13px] file:font-medium file:text-slate-700 dark:file:bg-slate-800 dark:file:text-slate-200"
                    />
                    <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
                      Se subirá al bucket al guardar.
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
                <label className={labelClass}>Rol</label>
                <select value={rol} onChange={(e) => setRol(e.target.value)} className={inputClass}>
                  <option value="">Seleccionar rol</option>
                  {ROLES.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
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
                <p className="font-bold text-slate-800 dark:text-slate-100">Empleado</p>
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
                  Al confirmar se creará el empleado y, si subiste foto, se guardará en el bucket.
                </p>
              </div>
              <button
                type="button"
                disabled={uploading}
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-900 dark:hover:bg-slate-800"
              >
                {uploading ? "Guardando…" : "Crear empleado"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
