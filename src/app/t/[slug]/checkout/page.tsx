"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { loadCart, clearCart, type CartLine } from "@/app/components/catalog/catalog-cart-storage";
import { catalogFocusRing } from "@/app/components/catalog/catalog-ui-classes";

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);
}

/** Mismas clases que ventas/nueva para inputs */
const field =
  "h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] text-slate-800 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";

const fieldLocked =
  "cursor-not-allowed bg-slate-100 text-slate-700 dark:bg-slate-800/70 dark:text-slate-200";

const fieldArea =
  "min-h-[100px] w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-[14px] text-slate-800 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";

const btnSecondary =
  "inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700";

type Addr = {
  id: string;
  label: string;
  address: string;
  reference_point: string | null;
  is_default: boolean;
  display_order: number;
};

/** Tarjeta tipo panel: borde gris neutro (sin tinte azul del ring slate). */
const cardShell =
  "rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-[rgb(52_52_60)] dark:bg-slate-900";

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className={cardShell}>
      <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">{title}</p>
      {subtitle && <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">{subtitle}</p>}
      <div className="mt-3 space-y-4">{children}</div>
    </div>
  );
}

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const slug = (params?.slug as string) ?? "";

  const [cart, setCart] = useState<CartLine[]>([]);
  const [branchName, setBranchName] = useState("");
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [names, setNames] = useState<Record<string, string>>({});

  const [name, setName] = useState("");
  const [cedula, setCedula] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  /** Costo de envío definido por la tienda (API catálogo). */
  const [catalogDeliveryFeeCop, setCatalogDeliveryFeeCop] = useState(0);

  const [addresses, setAddresses] = useState<Addr[]>([]);
  const [addrId, setAddrId] = useState<string | "new">("new");
  const [addrLabel, setAddrLabel] = useState("Casa");
  const [addrText, setAddrText] = useState("");
  const [addrRef, setAddrRef] = useState("");

  const [loadingCedula, setLoadingCedula] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Datos de contacto cargados por Buscar: no editables hasta cambiar la cédula. */
  const [contactLocked, setContactLocked] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const lines = loadCart(slug);
    setCart(lines);
    if (lines.length === 0) {
      router.replace(`/t/${encodeURIComponent(slug)}`);
      return;
    }
    (async () => {
      const res = await fetch(`/api/catalog/${encodeURIComponent(slug)}`);
      const json = await res.json();
      if (!res.ok) return;
      setBranchName(json.branch?.name ?? "");
      setCatalogDeliveryFeeCop(Math.max(0, Math.floor(Number(json.branch?.catalog_delivery_fee_cop) || 0)));
      const pmap: Record<string, number> = {};
      const nmap: Record<string, string> = {};
      for (const p of json.products ?? []) {
        pmap[p.id] = p.unit_price;
        nmap[p.id] = p.name;
      }
      setPrices(pmap);
      setNames(nmap);
    })();
  }, [slug, router]);

  function handleCedulaChange(value: string) {
    setCedula(value);
    if (!contactLocked) return;
    setContactLocked(false);
    setName("");
    setPhone("");
    setEmail("");
    setAddresses([]);
    setAddrId("new");
    setAddrLabel("Casa");
    setAddrText("");
    setAddrRef("");
  }

  async function lookupCedula() {
    const c = cedula.trim();
    if (c.length < 5) return;
    setLoadingCedula(true);
    setError(null);
    try {
      const res = await fetch(`/api/catalog/${encodeURIComponent(slug)}/customer?cedula=${encodeURIComponent(c)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error");
      if (json.customer) {
        setName(json.customer.name ?? "");
        setPhone(json.customer.phone ?? "");
        setEmail(json.customer.email ?? "");
        setContactLocked(true);
        const addrs = (json.addresses ?? []) as Addr[];
        setAddresses(addrs);
        const def = addrs.find((a) => a.is_default) ?? addrs[0];
        if (def) {
          setAddrId(def.id);
        } else {
          setAddrId("new");
        }
      } else {
        setContactLocked(false);
        setAddresses([]);
        setAddrId("new");
      }
    } catch (e) {
      setContactLocked(false);
      setError(e instanceof Error ? e.message : "No se pudo buscar la cédula");
    } finally {
      setLoadingCedula(false);
    }
  }

  const subtotal = cart.reduce((s, l) => s + (prices[l.product_id] ?? 0) * l.quantity, 0);
  const fee = catalogDeliveryFeeCop;
  const total = subtotal + fee;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !cedula.trim() || !phone.trim()) {
      setError("Completa nombre, cédula y teléfono.");
      return;
    }
    if (addrId === "new" && !addrText.trim()) {
      setError("Indica la dirección de entrega.");
      return;
    }
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        items: cart,
        customer_name: name.trim(),
        cedula: cedula.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
      };
      if (addrId !== "new") body.delivery_address_id = addrId;
      else {
        body.address_label = addrLabel.trim() || "Entrega";
        body.address = addrText.trim();
        body.reference_point = addrRef.trim() || null;
      }
      const res = await fetch(`/api/catalog/${encodeURIComponent(slug)}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo crear el pedido");
      clearCart(slug);
      router.push(`/t/pedido/${json.tracking_token}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSubmitting(false);
    }
  }

  const labelClass = "block text-[12px] font-medium text-slate-500 dark:text-slate-400";

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-4 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="space-y-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-emerald-50">Finalizar pedido</h1>
            {branchName && (
              <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">{branchName}</p>
            )}
            <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
              Datos de contacto y entrega a la izquierda; resumen y confirmación a la derecha.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push(`/t/${encodeURIComponent(slug)}`)}
            className={`self-start text-sm font-medium text-slate-600 hover:text-ov-pink dark:text-slate-400 dark:hover:text-ov-pink ${catalogFocusRing} rounded-lg`}
          >
            ← Volver al catálogo
          </button>
        </div>
      </header>

      <form onSubmit={handleSubmit}>
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.2fr)]">
          {/* Columna izquierda: datos (como Cliente + Envío en nueva venta) */}
          <div className="space-y-4">
            <SectionCard title="Datos de contacto" subtitle="Para coordinar la entrega y el comprobante.">
              <div>
                <label className={`${labelClass} mb-1`}>Cédula</label>
                <div className="flex min-w-0 gap-2">
                  <input
                    className={`${field} min-w-0 flex-1`}
                    value={cedula}
                    onChange={(e) => handleCedulaChange(e.target.value)}
                    onBlur={() => void lookupCedula()}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => void lookupCedula()}
                    disabled={loadingCedula}
                    className={`${btnSecondary} ${catalogFocusRing}`}
                  >
                    {loadingCedula ? "…" : "Buscar"}
                  </button>
                </div>
                <p className="mt-1.5 text-[12px] text-slate-500 dark:text-slate-400">
                  Si ya compraste antes, podemos cargar tu dirección.
                </p>
              </div>
              {contactLocked && (
                <p className="text-[12px] text-slate-500 dark:text-slate-400">
                  Los datos cargados no se pueden editar aquí. Cambia la cédula si necesitas otro perfil.
                </p>
              )}
              <div>
                <label className={`${labelClass} mb-1`}>Nombre completo</label>
                <input
                  className={`${field} ${contactLocked ? fieldLocked : ""}`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  readOnly={contactLocked}
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={`${labelClass} mb-1`}>Teléfono</label>
                  <input
                    className={`${field} ${contactLocked ? fieldLocked : ""}`}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    readOnly={contactLocked}
                    required
                  />
                </div>
                <div>
                  <label className={`${labelClass} mb-1`}>
                    Correo <span className="font-normal text-slate-400">(opcional)</span>
                  </label>
                  <input
                    type="email"
                    className={`${field} ${contactLocked ? fieldLocked : ""}`}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    readOnly={contactLocked}
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Entrega" subtitle="Envío y dirección donde recibes el pedido.">
              <div>
                <p className={`${labelClass} mb-1`}>Costo de envío</p>
                <div
                  className={`${field} flex items-center justify-between gap-2 ${fieldLocked}`}
                  aria-readonly="true"
                >
                  <span className="tabular-nums text-slate-800 dark:text-slate-100">{formatMoney(fee)}</span>
                </div>
                <p className="mt-1.5 text-[12px] text-slate-500 dark:text-slate-400">
                  Lo define la tienda; no puedes cambiarlo aquí.
                </p>
              </div>

              {addresses.length > 0 && (
                <div>
                  <label className={`${labelClass} mb-1`}>Dirección guardada</label>
                  <select
                    className={field}
                    value={addrId}
                    onChange={(e) => setAddrId(e.target.value as string | "new")}
                  >
                    {addresses.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label}: {a.address}
                      </option>
                    ))}
                    <option value="new">Nueva dirección</option>
                  </select>
                </div>
              )}

              {(addrId === "new" || addresses.length === 0) && (
                <>
                  <div>
                    <label className={`${labelClass} mb-1`}>Etiqueta</label>
                    <input
                      className={field}
                      value={addrLabel}
                      onChange={(e) => setAddrLabel(e.target.value)}
                      placeholder="Casa, oficina…"
                    />
                  </div>
                  <div>
                    <label className={`${labelClass} mb-1`}>Dirección completa</label>
                    <textarea
                      className={fieldArea}
                      value={addrText}
                      onChange={(e) => setAddrText(e.target.value)}
                      required={addrId === "new" || addresses.length === 0}
                    />
                  </div>
                  <div>
                    <label className={`${labelClass} mb-1`}>
                      Referencia <span className="font-normal text-slate-400">(opcional)</span>
                    </label>
                    <input className={field} value={addrRef} onChange={(e) => setAddrRef(e.target.value)} />
                  </div>
                </>
              )}
            </SectionCard>
          </div>

          {/* Columna derecha: Resumen (igual bloque que en nueva venta) */}
          <div className="space-y-4">
            <div className={cardShell}>
              <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">Resumen</p>
              <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">Revisa montos antes de confirmar.</p>

              <ul className="mt-3 space-y-2 border-b border-slate-200 pb-3 dark:border-slate-800">
                {cart.map((l) => (
                  <li key={l.product_id} className="flex items-start justify-between gap-3 text-[14px]">
                    <span className="min-w-0 break-words text-slate-800 dark:text-slate-200">
                      {names[l.product_id] ?? l.product_id}{" "}
                      <span className="font-normal text-slate-500 dark:text-slate-400">× {l.quantity}</span>
                    </span>
                    <span className="shrink-0 font-medium tabular-nums text-slate-900 dark:text-slate-50">
                      {formatMoney((prices[l.product_id] ?? 0) * l.quantity)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-[14px]">
                  <span className="text-slate-600 dark:text-slate-400">Subtotal</span>
                  <span className="font-medium text-slate-900 dark:text-slate-50">{formatMoney(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-[14px]">
                  <span className="text-slate-600 dark:text-slate-400">Envío</span>
                  <span className="font-medium text-slate-900 dark:text-slate-50">{formatMoney(fee)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Total
                  </span>
                  <span className="text-base font-bold text-slate-900 dark:text-slate-50">{formatMoney(total)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-4 w-full rounded-lg bg-ov-pink py-3 text-[15px] font-bold text-white shadow-sm transition-colors hover:bg-ov-pink-hover disabled:pointer-events-none disabled:opacity-50 dark:bg-ov-pink dark:hover:bg-ov-pink-hover"
                aria-busy={submitting}
              >
                {submitting ? "Creando pedido…" : "Confirmar pedido"}
              </button>

              {error && (
                <div
                  className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[14px] font-medium text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200"
                  role="alert"
                >
                  {error}
                </div>
              )}
            </div>
          </div>
        </section>
      </form>
    </div>
  );
}
