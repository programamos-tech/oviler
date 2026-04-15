"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Breadcrumb from "@/app/components/Breadcrumb";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "h-9 w-full rounded-lg border border-slate-200 bg-slate-50/90 px-3 text-[13px] text-slate-800 outline-none focus:border-[color:var(--shell-sidebar)] focus:ring-2 focus:ring-slate-400/35 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-100 dark:focus:border-zinc-500";
const labelClass =
  "mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400";

export default function ConfiguracionCatalogoPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [catalogEnabled, setCatalogEnabled] = useState(false);
  const [catalogSlug, setCatalogSlug] = useState("");
  const [catalogDeliveryFeeCop, setCatalogDeliveryFeeCop] = useState(0);
  const [paymentNequi, setPaymentNequi] = useState("");
  const [paymentBancolombia, setPaymentBancolombia] = useState("");
  const [paymentLlave, setPaymentLlave] = useState("");
  const [publicOrigin, setPublicOrigin] = useState("");

  useEffect(() => {
    setPublicOrigin(typeof window !== "undefined" ? window.location.origin : "");
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) {
        setLoading(false);
        return;
      }

      const { data: ub } = await supabase.from("user_branches").select("branch_id").eq("user_id", user.id).limit(1).single();
      if (!ub?.branch_id || cancelled) {
        setLoading(false);
        setError("No encontramos una sucursal asociada a tu usuario.");
        return;
      }

      const { data: branch, error: branchError } = await supabase
        .from("branches")
        .select("id, catalog_enabled, catalog_slug, catalog_delivery_fee_cop, payment_nequi, payment_bancolombia, payment_llave")
        .eq("id", ub.branch_id)
        .single();

      if (branchError || !branch || cancelled) {
        setLoading(false);
        setError("No fue posible cargar la configuración del catálogo.");
        return;
      }

      const row = branch as {
        id: string;
        catalog_enabled?: boolean | null;
        catalog_slug?: string | null;
        catalog_delivery_fee_cop?: number | null;
        payment_nequi?: string | null;
        payment_bancolombia?: string | null;
        payment_llave?: string | null;
      };

      setBranchId(row.id);
      setCatalogEnabled(!!row.catalog_enabled);
      setCatalogSlug(row.catalog_slug ?? "");
      setCatalogDeliveryFeeCop(Number(row.catalog_delivery_fee_cop) || 0);
      setPaymentNequi(row.payment_nequi ?? "");
      setPaymentBancolombia(row.payment_bancolombia ?? "");
      setPaymentLlave(row.payment_llave ?? "");
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const sanitizedSlug = useMemo(
    () =>
      catalogSlug
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, ""),
    [catalogSlug]
  );

  async function handleSave() {
    if (!branchId || saving) return;
    setSaving(true);
    setError(null);
    setOk(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("branches")
      .update({
        catalog_enabled: catalogEnabled,
        catalog_slug: sanitizedSlug || null,
        catalog_delivery_fee_cop: Math.max(0, Math.floor(Number(catalogDeliveryFeeCop) || 0)),
        payment_nequi: paymentNequi.trim() || null,
        payment_bancolombia: paymentBancolombia.trim() || null,
        payment_llave: paymentLlave.trim() || null,
      })
      .eq("id", branchId);

    if (updateError) {
      setError(updateError.message || "No se pudo guardar la configuración.");
      setSaving(false);
      return;
    }
    setOk("Configuración del catálogo guardada.");
    setSaving(false);
  }

  return (
    <div className="mx-auto min-w-0 max-w-[1600px] space-y-8 font-sans text-[13px] font-normal leading-normal tracking-normal text-slate-800 antialiased dark:text-slate-100">
      <header className="min-w-0 rounded-2xl bg-white px-4 py-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-slate-900 dark:shadow-none sm:px-6 sm:py-6">
        <Breadcrumb items={[{ label: "Catálogo", href: "/catalogo" }, { label: "Configuración" }]} />
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-xl">
              Configuración del catálogo
            </h1>
            <p className="mt-1 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Define enlace público, costo de envío y datos de pago.
            </p>
          </div>
          <Link
            href="/catalogo"
            className="inline-flex h-9 items-center rounded-xl border border-slate-200 px-4 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Ver catálogo
          </Link>
        </div>
      </header>

      {loading ? (
        <div className="min-h-[320px] animate-pulse rounded-3xl bg-white dark:bg-slate-900" aria-hidden />
      ) : (
        <section className="rounded-3xl bg-white px-4 py-5 dark:bg-slate-900 sm:px-6 sm:py-6">
          <div className="space-y-5">
            <div>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={catalogEnabled}
                  onChange={(e) => setCatalogEnabled(e.target.checked)}
                  disabled={saving}
                  className="h-4 w-4 rounded border-slate-300 text-[color:var(--shell-sidebar)] focus:ring-slate-400/35"
                />
                <span className="text-[13px] font-medium text-slate-700 dark:text-slate-200">Activar catálogo público</span>
              </label>
            </div>

            <div>
              <label className={labelClass}>Enlace corto (slug)</label>
              <input
                value={catalogSlug}
                onChange={(e) => setCatalogSlug(e.target.value)}
                placeholder="mi-tienda"
                className={inputClass}
                disabled={saving}
              />
              {publicOrigin && sanitizedSlug && (
                <p className="mt-1.5 text-[12px] text-slate-500 dark:text-slate-400">
                  URL pública:{" "}
                  <span className="font-mono text-slate-700 dark:text-slate-300">{publicOrigin}/t/{sanitizedSlug}</span>
                </p>
              )}
            </div>

            <div>
              <label className={labelClass}>Envío catálogo web (COP)</label>
              <input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={catalogDeliveryFeeCop === 0 ? "" : catalogDeliveryFeeCop}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") {
                    setCatalogDeliveryFeeCop(0);
                    return;
                  }
                  setCatalogDeliveryFeeCop(Math.max(0, Math.floor(Number(raw) || 0)));
                }}
                className={inputClass}
                disabled={saving}
                placeholder="0"
              />
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/40 px-3 py-3 dark:border-slate-800 dark:bg-slate-800/25">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Datos de pago (catálogo web)
              </p>
              <div className="space-y-3">
                <div>
                  <label className={labelClass}>Nequi</label>
                  <input
                    value={paymentNequi}
                    onChange={(e) => setPaymentNequi(e.target.value)}
                    className={inputClass}
                    disabled={saving}
                    placeholder="Número o alias"
                  />
                </div>
                <div>
                  <label className={labelClass}>Bancolombia / cuenta</label>
                  <input
                    value={paymentBancolombia}
                    onChange={(e) => setPaymentBancolombia(e.target.value)}
                    className={inputClass}
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className={labelClass}>Llave u otro</label>
                  <input
                    value={paymentLlave}
                    onChange={(e) => setPaymentLlave(e.target.value)}
                    className={inputClass}
                    disabled={saving}
                  />
                </div>
              </div>
            </div>

            {error ? <p className="text-[13px] font-medium text-red-600 dark:text-red-400">{error}</p> : null}
            {ok ? <p className="text-[13px] font-medium text-[color:var(--shell-sidebar)] dark:text-zinc-300">{ok}</p> : null}

            <div className="pt-1">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !branchId}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-[color:var(--shell-sidebar)] px-4 text-[13px] font-medium text-white shadow-[0_1px_2px_rgba(15,23,42,0.12)] transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
