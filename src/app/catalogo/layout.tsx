import PlanFeatureGate from "@/app/components/PlanFeatureGate";

export default function CatalogoLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlanFeatureGate
      gatedModule="catalog_web"
      title="Catálogo"
      description="El catálogo público y su configuración están incluidos desde el plan Estándar. Con Lite puedes usar ventas, clientes e inventario en el panel."
    >
      {children}
    </PlanFeatureGate>
  );
}
