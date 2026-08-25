import Link from "next/link";

export function LoginBrandPanel() {
  return (
    <div className="berea-auth-aside-inner">
      <Link href="/" className="berea-auth-aside-logo" aria-label="Berea Tech — Ir al inicio">
        <img src="/logo-berea-house.png" alt="Berea House, tiendas de tecnología" decoding="async" />
      </Link>
      <h2>Tu equipo y tu negocio, organizados</h2>
      <p>Inventario, ventas y clientes en un solo lugar. Menos caos, más claridad en el día a día.</p>
      <ul className="berea-auth-aside-list">
        <li>
          <span className="berea-auth-aside-dot" aria-hidden />
          Control de inventario y ventas en tiempo real
        </li>
        <li>
          <span className="berea-auth-aside-dot" aria-hidden />
          Caja, créditos y egresos en un solo panel
        </li>
        <li>
          <span className="berea-auth-aside-dot" aria-hidden />
          Reportes claros para decidir con datos
        </li>
      </ul>
    </div>
  );
}
