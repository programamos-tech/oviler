"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Branch = {
  id: string;
  name: string;
  nit: string | null;
  address: string | null;
  phone: string | null;
  responsable_iva: boolean;
  logo_url: string | null;
};

function BranchLogo({ logoUrl, branchName }: { logoUrl: string | null; branchName: string }) {
  const [failed, setFailed] = useState(false);
  const showImg = logoUrl && !failed;
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-lg font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
      {showImg ? (
        <img
          src={logoUrl}
          alt={`Logo ${branchName}`}
          className="h-full w-full object-contain p-1"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        "S"
      )}
    </div>
  );
}

export default function SucursalesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: userData } = await supabase
        .from("users")
        .select("organization_id")
        .eq("id", user.id)
        .single();
      if (!userData?.organization_id || cancelled) {
        setLoading(false);
        return;
      }
      const { data: rows, error } = await supabase
        .from("branches")
        .select("id, name, nit, address, phone, responsable_iva, logo_url")
        .eq("organization_id", userData.organization_id)
        .order("name");
      if (cancelled) return;
      if (!error && rows) setBranches(rows as Branch[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <header className="space-y-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-emerald-50">
              Sedes
            </h1>
            <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Cada sede tiene sus propios datos, numeración de ingresos y configuración.
            </p>
          </div>
          <Link
            href="/sucursales/nueva"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-ov-pink px-4 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-ov-pink-hover"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva sede
          </Link>
        </div>
      </header>

      {loading ? (
        <p className="text-[14px] text-slate-500 dark:text-slate-400">Cargando sedes…</p>
      ) : branches.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <p className="text-[15px] font-medium text-slate-600 dark:text-slate-300">Aún no hay sedes</p>
          <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
            Crea tu primera sede desde el onboarding o con el botón &quot;Nueva sede&quot;.
          </p>
          <Link
            href="/sucursales/nueva"
            className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-ov-pink px-4 text-[13px] font-medium text-white hover:bg-ov-pink-hover"
          >
            Nueva sede
          </Link>
        </div>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((suc) => (
            <Link
              key={suc.id}
              href={`/sucursales/configurar?branchId=${suc.id}`}
              className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition-shadow hover:ring-slate-300 dark:bg-slate-900 dark:ring-slate-800 dark:hover:ring-slate-700"
            >
              <div className="flex gap-4">
                <BranchLogo logoUrl={suc.logo_url} branchName={suc.name} />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold text-slate-900 dark:text-slate-50">
                    {suc.name}
                  </p>
                  <p className="mt-0.5 text-[12px] font-medium text-slate-500 dark:text-slate-400">
                    NIT {suc.nit ?? "—"}
                  </p>
                  <p className="mt-1 text-[12px] text-slate-600 dark:text-slate-300">
                    {suc.address ?? "—"}
                  </p>
                  <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
                    {suc.phone ?? "—"}
                  </p>
                  {suc.responsable_iva && (
                    <span className="mt-2 inline-block rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                      Responsable de IVA
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
