import PlanFeatureGate from "@/app/components/PlanFeatureGate";

export default function ActividadesLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlanFeatureGate
      gatedModule="branch_activities"
      title="Actividades"
      description="El registro de actividades de sucursal está disponible desde el plan Estándar."
    >
      {children}
    </PlanFeatureGate>
  );
}
