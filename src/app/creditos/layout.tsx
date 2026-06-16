import PlanFeatureGate from "@/app/components/PlanFeatureGate";
import { STORE_TECH_COPY } from "@/lib/store-tech-copy";

export default function CreditosLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlanFeatureGate
      gatedModule="customer_credits"
      title={STORE_TECH_COPY.creditos.title}
      description="El módulo de créditos y cobros está disponible desde el plan Estándar."
    >
      {children}
    </PlanFeatureGate>
  );
}
