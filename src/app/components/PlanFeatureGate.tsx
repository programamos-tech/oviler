"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { normalizePlanType, type PlanId } from "@/lib/plan-catalog";
import { planHasModule, type PlanGatedModule } from "@/lib/plan-features";
import { bernabePlanUpgradeWhatsAppUrl } from "@/lib/programamos-contact";

type Props = {
  gatedModule: PlanGatedModule;
  title: string;
  description: string;
  children: React.ReactNode;
};

export default function PlanFeatureGate({ gatedModule, title, description, children }: Props) {
  const [planId, setPlanId] = useState<PlanId | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) {
        setLoading(false);
        return;
      }
      const { data: u } = await supabase.from("users").select("organization_id").eq("id", user.id).single();
      const oid = (u as { organization_id?: string | null })?.organization_id;
      if (!oid || cancelled) {
        setLoading(false);
        return;
      }
      const { data: org } = await supabase.from("organizations").select("plan_type").eq("id", oid).maybeSingle();
      if (cancelled) return;
      setPlanId(normalizePlanType((org as { plan_type?: string })?.plan_type ?? "free"));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className="min-h-[40vh] animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800/80" aria-busy="true" />;
  }

  const allowed = planId != null && planHasModule(planId, gatedModule);
  if (allowed) return <>{children}</>;

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:py-14">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color:var(--shell-sidebar)]/12 text-[color:var(--shell-sidebar)] dark:bg-white/10 dark:text-zinc-200">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">{title}</h1>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-600 dark:text-slate-400">{description}</p>
            <a
              href={bernabePlanUpgradeWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--shell-sidebar)] px-4 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)] sm:w-auto"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.883 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Adquirir plan Estándar o Pro
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
