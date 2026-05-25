import { prefetchClientesList } from "@/lib/clientes-detail-cache";
import { prefetchCreditosList } from "@/lib/creditos-detail-cache";
import { prefetchGarantiasList } from "@/lib/garantias-detail-cache";
import { prefetchInventarioList } from "@/lib/inventario-detail-cache";
import { prefetchVentasList } from "@/lib/ventas-list-cache";

const prefetchedPaths = new Set<string>();

function prefetchKey(pathname: string, branchId: string) {
  return `${pathname}|${branchId}`;
}

/** Precarga el listado por defecto al pasar el cursor por el menú (datos + caché). */
export function prefetchModuleList(
  href: string,
  branchId: string | null | undefined,
  salesMode?: string
) {
  if (!branchId || typeof window === "undefined") return;

  const path = href.split("?")[0];
  const key = prefetchKey(path, branchId);
  if (prefetchedPaths.has(key)) return;
  prefetchedPaths.add(key);

  if (path === "/ventas" || path.startsWith("/ventas/")) {
    void prefetchVentasList(branchId, salesMode === "orders" ? "orders" : "sales");
    return;
  }
  if (path === "/inventario" || path.startsWith("/inventario/")) {
    void prefetchInventarioList(branchId);
    return;
  }
  if (path === "/clientes" || path.startsWith("/clientes/")) {
    void prefetchClientesList(branchId);
    return;
  }
  if (path === "/creditos" || path.startsWith("/creditos/")) {
    void prefetchCreditosList(branchId);
    return;
  }
  if (path === "/garantias" || path.startsWith("/garantias/")) {
    void prefetchGarantiasList(branchId);
  }
}

/** Precarga listados principales en segundo plano tras iniciar sesión. */
export function prefetchAllModuleLists(branchId: string, salesMode?: string) {
  if (typeof window === "undefined") return;

  const run = () => {
    void prefetchVentasList(branchId, salesMode === "orders" ? "orders" : "sales");
    void prefetchInventarioList(branchId);
    void prefetchClientesList(branchId);
    void prefetchCreditosList(branchId);
    void prefetchGarantiasList(branchId);
  };

  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(run, { timeout: 5000 });
  } else {
    window.setTimeout(run, 600);
  }
}
