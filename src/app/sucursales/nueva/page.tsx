"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { loadOrgPlanSnapshot, type OrgPlanSnapshot } from "@/lib/org-plan-snapshot";
import { BackLink, PlanLimitHeaderNote } from "@/app/components/PlanLimitNotice";

const inputClass =
  "h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200";
const labelClass = "mb-2 block text-[13px] font-bold text-slate-700 dark:text-slate-300";

export default function NuevaSucursalPage() {
  const router = useRouter();
  const [branchName, setBranchName] = useState("");
  const [nit, setNit] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [planSnapshot, setPlanSnapshot] = useState<OrgPlanSnapshot | null>(null);
  const [planLoading, setPlanLoading] = useState(true);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(logoFile);
    setLogoPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [logoFile]);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) {
        setPlanLoading(false);
        return;
      }
      const { data: userData } = await supabase.from("users").select("organization_id").eq("id", user.id).single();
      if (!userData?.organization_id || cancelled) {
        setPlanLoading(false);
        return;
      }
      const snap = await loadOrgPlanSnapshot(supabase, userData.organization_id);
      if (!cancelled) {
        setPlanSnapshot(snap);
        setPlanLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving || (planSnapshot && !planSnapshot.canCreateBranch)) return;
    setError(null);
    setSuccess(null);

    const nameTrim = branchName.trim();
    const nitTrim = nit.trim();
    if (!nameTrim || !nitTrim) {
      setError("Nombre de la sucursal y NIT son obligatorios.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Debes iniciar sesión para crear la sucursal.");
        setSaving(false);
        return;
      }

      const { data: userData } = await supabase
        .from("users")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (!userData?.organization_id) {
        setError("No se encontró tu organización.");
        setSaving(false);
        return;
      }

      let logoUrl: string | null = null;
      if (logoFile) {
        const fileExt = logoFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const filePath = `branches/${user.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("logos")
          .upload(filePath, logoFile, { upsert: false });
        if (uploadError) {
          setError(uploadError.message || "Error al subir el logo.");
          setSaving(false);
          return;
        }
        const { data: urlData } = supabase.storage.from("logos").getPublicUrl(filePath);
        logoUrl = urlData.publicUrl;
      }

      const { data: branchData, error: branchError } = await supabase
        .from("branches")
        .insert({
          organization_id: userData.organization_id,
          name: nameTrim,
          nit: nitTrim,
          address: address.trim() || null,
          phone: phone.trim() || null,
          responsable_iva: false,
          logo_url: logoUrl,
        })
        .select("id")
        .single();

      if (branchError || !branchData?.id) {
        setError(branchError?.message || "No se pudo crear la sucursal.");
        setSaving(false);
        return;
      }

      const { error: linkError } = await supabase.from("user_branches").upsert(
        {
          user_id: user.id,
          branch_id: branchData.id,
        },
        { onConflict: "user_id,branch_id" }
      );

      if (linkError) {
        setError(linkError.message || "Sucursal creada, pero no se pudo vincular al usuario.");
        setSaving(false);
        return;
      }

      setSuccess("Sucursal creada correctamente.");
      router.push(`/sucursales/configurar?branchId=${branchData.id}`);
      router.refresh();
    } catch {
      setError("Ocurrió un error inesperado creando la sucursal.");
    } finally {
      setSaving(false);
    }
  }

  if (planLoading) {
    return (
      <div className="space-y-4">
        <p className="text-[14px] text-slate-600 dark:text-slate-400">Cargando…</p>
      </div>
    );
  }

  if (planSnapshot && !planSnapshot.canCreateBranch) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <p className="text-[14px] text-slate-600 dark:text-slate-400">
          <BackLink href="/sucursales" label="← Volver a sucursales" />
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-emerald-50">Nueva sucursal</h1>
        <PlanLimitHeaderNote kind="branches" planId={planSnapshot.planId} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-emerald-50">
              Nueva sucursal
            </h1>
            <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Cada sucursal tendrá sus propios números de venta, inventario y configuración.
            </p>
          </div>
          <Link
            href="/sucursales"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            title="Volver a sucursales"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.2fr)]">
        <div className="space-y-4">
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Logo
            </p>
            <div className="mt-3 flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                {logoPreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoPreviewUrl} alt="Vista previa del logo" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[12px] font-medium text-slate-400">Sin logo</span>
                )}
              </div>
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                  disabled={saving}
                  className="block w-full text-[13px] text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-[13px] file:font-medium file:text-slate-700 dark:file:bg-slate-800 dark:file:text-slate-200"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Datos de la sucursal
            </p>
            <div className="mt-3 space-y-3">
              <div>
                <label className={labelClass}>Nombre de la sucursal <span className="text-ov-pink">*</span></label>
                <input
                  placeholder="Ej. Sucursal Norte"
                  className={inputClass}
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  disabled={saving}
                />
              </div>
              <div>
                <label className={labelClass}>NIT <span className="text-ov-pink">*</span></label>
                <input
                  placeholder="Ej. 900.123.456-7"
                  className={inputClass}
                  value={nit}
                  onChange={(e) => setNit(e.target.value)}
                  disabled={saving}
                />
              </div>
              <div>
                <label className={labelClass}>Dirección</label>
                <input
                  placeholder="Ej. Cra 15 # 80-10"
                  className={inputClass}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={saving}
                />
              </div>
              <div>
                <label className={labelClass}>Teléfono</label>
                <input
                  placeholder="Ej. 601 765 4321"
                  className={inputClass}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>
          </div>

        </div>

        <div className="space-y-4">
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Resumen
            </p>
            <p className="mt-3 text-[13px] text-slate-600 dark:text-slate-400">
              La nueva sucursal tendrá su propia numeración de ventas, inventario independiente y configuración propia.
            </p>
            {error && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] font-medium text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-300">
                {error}
              </p>
            )}
            {success && (
              <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-900/20 dark:text-emerald-300">
                {success}
              </p>
            )}
            <div className="mt-4 border-t border-slate-200 pt-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-ov-pink px-4 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-ov-pink-hover disabled:opacity-60 dark:bg-ov-pink dark:hover:bg-ov-pink-hover"
              >
                {saving ? "Creando sucursal…" : "Crear sucursal"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
