import Link from "next/link";
import { customerFacingPlanName, upgradeMicroLine } from "@/lib/license-display";
import type { PlanId } from "@/lib/plan-catalog";
import {
  COMMERCIAL_LICENSE_TEL_HREF,
  commercialLicenseWhatsAppPrefill,
  commercialLicenseWhatsAppUrl,
} from "@/lib/programamos-contact";

type GateKind = "branches" | "users" | "products";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.883 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}

const licenseIconLinkClass =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-zinc-300/80 text-zinc-500 transition-colors hover:border-[color:var(--shell-sidebar)]/45 hover:bg-zinc-50 hover:text-[color:var(--shell-sidebar)] dark:border-zinc-600 dark:text-zinc-500 dark:hover:bg-white/10 dark:hover:text-zinc-300";

/**
 * Nota mínima para cabeceras: una línea + iconos WhatsApp / llamada.
 * Sustituye banners grandes cuando el CTA principal ya está “capado” por plan.
 */
export function PlanLimitHeaderNote({
  kind,
  planId,
  className = "",
}: {
  kind: GateKind;
  planId?: PlanId | string | null;
  className?: string;
}) {
  const planName = customerFacingPlanName(planId ?? undefined);
  const wa = commercialLicenseWhatsAppUrl(commercialLicenseWhatsAppPrefill(planName));
  const micro = upgradeMicroLine(kind);
  return (
    <div
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-snug text-zinc-500 dark:text-zinc-500 ${className}`}
    >
      <span className="min-w-0 max-w-[min(100%,26rem)]">{micro}</span>
      <span className="inline-flex shrink-0 items-center gap-1" aria-label="Contactar para ampliar plan">
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className={licenseIconLinkClass}
          title="WhatsApp"
          aria-label="WhatsApp"
        >
          <WhatsAppIcon className="h-3.5 w-3.5" />
        </a>
        <a href={COMMERCIAL_LICENSE_TEL_HREF} className={licenseIconLinkClass} title="Llamar" aria-label="Llamar">
          <PhoneIcon className="h-3.5 w-3.5" />
        </a>
      </span>
    </div>
  );
}

/** CTA principal cuando el plan no permite crear más: borde discontinuo, sin “botón sólido apagado”. */
export const PLAN_LIMIT_DISABLED_BUTTON_CLASS =
  "inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-dashed border-zinc-400/90 bg-transparent px-4 text-[13px] font-medium text-zinc-500 cursor-not-allowed dark:border-zinc-600 dark:text-zinc-400";

/** Volver atrás cuando la pantalla de creación está bloqueada. */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-slate-100"
    >
      {label}
    </Link>
  );
}
