import PlanFeatureGate from "@/app/components/PlanFeatureGate";

export default function CreditosLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlanFeatureGate
      gatedModule="customer_credits"
      title="Créditos a clientes"
      description="El módulo de créditos y cobros está disponible desde el plan Estándar."
    >
      {children}
    </PlanFeatureGate>
  );
}
