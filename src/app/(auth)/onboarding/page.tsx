"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import FreeTrialWelcomeModal from "@/app/components/FreeTrialWelcomeModal";
import { OvilerWordmark } from "@/app/components/OvilerWordmark";
import { PROGRAMAMOS_WA_LICENSE } from "@/lib/programamos-contact";
import { isTrialWelcomeDismissedThisSession, markTrialWelcomeDismissedThisSession } from "@/lib/trial-welcome-storage";
import { PLAN_CATALOG } from "@/lib/plan-catalog";
import { type OrgTrialFields, isFreeTrialActive, trialRemainingLabel } from "@/lib/trial-ux";

const TOTAL_STEPS = 3;

const inputClass =
  "h-10 w-full rounded-lg border border-zinc-600 bg-zinc-800/90 px-4 text-[14px] font-medium text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/30";
const labelClass = "mb-2 block text-[13px] font-bold text-zinc-300";

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [user, setUser] = useState<any>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFileName, setLogoFileName] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [resumen, setResumen] = useState({ nombre: "", nit: "", direccion: "", telefono: "" });
  const [orgTrial, setOrgTrial] = useState<OrgTrialFields | null>(null);
  const [trialModalOpen, setTrialModalOpen] = useState(false);
  const supabase = createClient();

  const trialActive = orgTrial != null && isFreeTrialActive(orgTrial);
  const trialEndsAt = orgTrial?.trial_ends_at ?? "";

  useEffect(() => {
    async function checkUser() {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        router.push("/login");
        return;
      }

      setUser(currentUser);

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("organization_id")
        .eq("id", currentUser.id)
        .single();

      if (userError || !userData) {
        router.push("/login?error=no_organization");
        return;
      }

      setOrganizationId(userData.organization_id);

      const { data: orgRow } = await supabase
        .from("organizations")
        .select("subscription_status, plan_type, trial_ends_at")
        .eq("id", userData.organization_id)
        .maybeSingle();
      setOrgTrial(orgRow as OrgTrialFields | null);

      const { data: branches, error: branchesError } = await supabase
        .from("branches")
        .select("id")
        .eq("organization_id", userData.organization_id);

      if (!branchesError && branches && branches.length > 0) {
        router.push("/dashboard");
      }
    }

    checkUser();
  }, [router, supabase]);

  useEffect(() => {
    if (!trialActive || !trialEndsAt || !organizationId) return;
    if (typeof window === "undefined") return;
    if (isTrialWelcomeDismissedThisSession(organizationId)) return;
    setTrialModalOpen(true);
  }, [trialActive, trialEndsAt, organizationId]);

  const canGoNext = () => {
    if (step === 2) {
      return resumen.nombre.trim().length > 0 && resumen.nit.trim().length > 0;
    }
    return step < TOTAL_STEPS;
  };

  const goNext = () => {
    setError(null);
    if (step === 2 && !canGoNext()) {
      setError("Indica el nombre de la sucursal y el NIT para continuar.");
      return;
    }
    if (step < TOTAL_STEPS) setStep((s) => s + 1);
  };

  const goBack = () => {
    setError(null);
    if (step > 1) setStep((s) => s - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !organizationId) return;

    setLoading(true);
    setError(null);

    const nombre = resumen.nombre.trim();
    const nit = resumen.nit.trim();
    const direccion = resumen.direccion.trim();
    const telefono = resumen.telefono.trim();

    try {
      let logoUrl: string | null = null;

      if (logoFile && logoFile.size > 0) {
        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        if (!allowedTypes.includes(logoFile.type)) {
          setError("Formato de imagen no permitido. Usa JPEG, PNG, WebP o GIF.");
          setLoading(false);
          return;
        }
        const maxSize = 5 * 1024 * 1024;
        if (logoFile.size > maxSize) {
          setError("El logo no debe superar 5 MB.");
          setLoading(false);
          return;
        }
        const fileExt = logoFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const filePath = `branches/${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("logos")
          .upload(filePath, logoFile, { upsert: false });

        if (uploadError) {
          setError(uploadError.message || "Error al subir el logo. Revisa que el bucket 'logos' exista.");
          setLoading(false);
          return;
        }
        const { data: urlData } = supabase.storage.from("logos").getPublicUrl(filePath);
        logoUrl = urlData.publicUrl;
      }

      const { data: branchData, error: branchError } = await supabase
        .from("branches")
        .insert({
          organization_id: organizationId,
          name: nombre,
          nit,
          address: direccion,
          phone: telefono,
          responsable_iva: false,
          logo_url: logoUrl,
        })
        .select()
        .single();

      if (branchError || !branchData) {
        setError(branchError?.message || "Error al crear la sucursal. Por favor intenta de nuevo.");
        setLoading(false);
        return;
      }

      const { error: userBranchError } = await supabase
        .from("user_branches")
        .insert({
          user_id: user.id,
          branch_id: branchData.id,
        });

      if (userBranchError) {
        setError("Error al vincular usuario a la sucursal. Por favor intenta de nuevo.");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Error inesperado. Por favor intenta de nuevo.");
      setLoading(false);
    }
  };

  const stepTitle =
    step === 1
      ? "Logo de tu sucursal"
      : step === 2
        ? "Datos de la sucursal"
        : "Revisa y crea tu sucursal";

  const stepHint =
    step === 1
      ? "Opcional: aparece en tickets y documentos. Puedes saltar este paso."
      : step === 2
        ? "Nombre y NIT son obligatorios; el resto ayuda en facturas y contacto."
        : "Si todo está correcto, confirma para entrar al panel.";

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-zinc-100">
      <main className="flex min-h-[100dvh] flex-col justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-3xl space-y-6">
          <Link
            href="/"
            className="inline-block w-fit outline-offset-4 focus-visible:rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-500"
          >
            <OvilerWordmark variant="onDark" className="text-[clamp(1.5rem,3.8vw,2.1rem)]" />
          </Link>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 text-[12px] font-medium uppercase tracking-wide text-zinc-500">
              <span>
                Paso {step} de {TOTAL_STEPS}
              </span>
              <span className="hidden text-right sm:inline">{stepTitle}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-zinc-100 transition-[width] duration-300 ease-out"
                style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
              />
            </div>
          </div>

          <header className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-50 sm:text-[1.65rem]">{stepTitle}</h1>
            <p className="text-[14px] leading-relaxed text-zinc-400">{stepHint}</p>
          </header>

          {error && (
            <div className="rounded-lg border border-red-900/50 bg-red-950/50 p-3 text-[13px] text-red-200">
              {error}
            </div>
          )}

          <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/80 p-5 shadow-xl ring-1 ring-white/5 backdrop-blur-sm sm:p-6">
            {step === 1 && (
              <div className="space-y-4">
                <p className="text-[13px] font-bold uppercase tracking-wide text-zinc-400">Archivo</p>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-zinc-600 bg-zinc-800/50">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Vista previa" className="h-full w-full object-contain" />
                    ) : (
                      <span className="text-[12px] font-medium text-zinc-500">Sin logo</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      disabled={loading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setLogoFile(file);
                          setLogoPreview(URL.createObjectURL(file));
                          setLogoFileName(file.name);
                        } else {
                          setLogoFile(null);
                          setLogoPreview(null);
                          setLogoFileName(null);
                        }
                      }}
                      className="block w-full text-[13px] text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-700 file:px-3 file:py-2 file:text-[13px] file:font-medium file:text-zinc-100"
                    />
                    <p className="mt-1 text-[11px] text-zinc-500">JPEG, PNG, WebP o GIF. Máx. 5 MB.</p>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <p className="text-[13px] font-bold uppercase tracking-wide text-zinc-400">Datos de la sucursal</p>
                <div className="space-y-3">
                  <div>
                    <label className={labelClass}>
                      Nombre de la sucursal <span className="text-ov-pink">*</span>
                    </label>
                    <input
                      name="nombre"
                      placeholder="Ej. Sucursal Norte"
                      className={inputClass}
                      required
                      disabled={loading}
                      value={resumen.nombre}
                      onChange={(e) => setResumen((r) => ({ ...r, nombre: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      NIT <span className="text-ov-pink">*</span>
                    </label>
                    <input
                      name="nit"
                      placeholder="Ej. 900.123.456-7"
                      className={inputClass}
                      required
                      disabled={loading}
                      value={resumen.nit}
                      onChange={(e) => setResumen((r) => ({ ...r, nit: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Dirección</label>
                    <input
                      name="direccion"
                      placeholder="Ej. Cra 15 # 80-10"
                      className={inputClass}
                      disabled={loading}
                      value={resumen.direccion}
                      onChange={(e) => setResumen((r) => ({ ...r, direccion: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Teléfono</label>
                    <input
                      name="telefono"
                      placeholder="Ej. 601 765 4321"
                      className={inputClass}
                      disabled={loading}
                      value={resumen.telefono}
                      onChange={(e) => setResumen((r) => ({ ...r, telefono: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <form onSubmit={handleSubmit} className="space-y-5">
                <p className="text-[13px] font-bold uppercase tracking-wide text-zinc-400">Resumen</p>
                <dl className="space-y-2 text-[14px]">
                  {resumen.nombre.trim() && (
                    <div className="flex justify-between gap-2">
                      <dt className="text-zinc-500">Nombre</dt>
                      <dd className="max-w-[65%] truncate font-medium text-zinc-100">{resumen.nombre}</dd>
                    </div>
                  )}
                  {resumen.nit.trim() && (
                    <div className="flex justify-between gap-2">
                      <dt className="text-zinc-500">NIT</dt>
                      <dd className="font-medium text-zinc-100">{resumen.nit}</dd>
                    </div>
                  )}
                  {resumen.direccion.trim() && (
                    <div className="flex justify-between gap-2">
                      <dt className="text-zinc-500">Dirección</dt>
                      <dd className="max-w-[65%] truncate font-medium text-zinc-100">{resumen.direccion}</dd>
                    </div>
                  )}
                  {resumen.telefono.trim() && (
                    <div className="flex justify-between gap-2">
                      <dt className="text-zinc-500">Teléfono</dt>
                      <dd className="font-medium text-zinc-100">{resumen.telefono}</dd>
                    </div>
                  )}
                  {logoFileName && (
                    <div className="flex justify-between gap-2">
                      <dt className="text-zinc-500">Logo</dt>
                      <dd className="max-w-[65%] truncate font-medium text-zinc-100">{logoFileName}</dd>
                    </div>
                  )}
                  {!logoFileName && (
                    <p className="text-[13px] text-zinc-500">Sin archivo de logo (puedes volver al paso 1).</p>
                  )}
                </dl>

                {trialActive && trialEndsAt ? (
                  <div className="rounded-xl border border-zinc-700/90 bg-zinc-950 p-4 shadow-inner">
                    <p className="text-[13px] font-bold text-zinc-100">
                      Plan Prueba gratis ({PLAN_CATALOG.free.trialDays ?? 15} días)
                    </p>
                    <p className="mt-2 text-[13px] leading-relaxed text-zinc-300">
                      Tu cuenta arranca en modo prueba con límites reducidos. Te quedan{" "}
                      <span className="font-bold tabular-nums text-zinc-50">{trialRemainingLabel(trialEndsAt)}</span> para
                      explorar Berea Comercios. Para pasar a Estándar o Pro, escribe a{" "}
                      <a
                        href={PROGRAMAMOS_WA_LICENSE}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-zinc-100 underline underline-offset-2 hover:no-underline"
                      >
                        programamos por WhatsApp
                      </a>
                      .
                    </p>
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-zinc-100 px-4 text-[14px] font-semibold text-zinc-900 shadow-sm transition-colors hover:bg-white disabled:opacity-70"
                >
                  {loading ? "Creando sucursal…" : "Crear sucursal"}
                </button>
              </form>
            )}
          </div>

          {step < 3 && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={goBack}
                disabled={step === 1 || loading}
                className="rounded-xl border border-zinc-600 bg-zinc-900/80 px-4 py-2.5 text-[14px] font-medium text-zinc-200 transition-colors hover:bg-zinc-800 disabled:opacity-40"
              >
                Atrás
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={loading || (step === 2 && !canGoNext())}
                className="rounded-xl bg-zinc-100 px-5 py-2.5 text-[14px] font-semibold text-zinc-900 shadow-sm transition-colors hover:bg-white disabled:opacity-50"
              >
                {step === 2 ? "Ver resumen" : "Siguiente"}
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="flex justify-start">
              <button
                type="button"
                onClick={goBack}
                disabled={loading}
                className="rounded-xl border border-zinc-600 bg-zinc-900/80 px-4 py-2.5 text-[14px] font-medium text-zinc-200 transition-colors hover:bg-zinc-800 disabled:opacity-40"
              >
                Atrás
              </button>
            </div>
          )}
        </div>
      </main>

      {trialActive && trialEndsAt && organizationId ? (
        <FreeTrialWelcomeModal
          open={trialModalOpen}
          trialEndsAt={trialEndsAt}
          onClose={() => {
            markTrialWelcomeDismissedThisSession(organizationId);
            setTrialModalOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
