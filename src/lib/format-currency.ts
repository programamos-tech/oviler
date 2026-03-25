/** COP con formato es-CO (catálogo web y vistas que compartan el mismo criterio). */
export function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}
