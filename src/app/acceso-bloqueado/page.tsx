"use client";

import { PROGRAMAMOS_WA_LICENSE } from "@/lib/programamos-contact";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function AccesoBloqueadoContent() {
  const sp = useSearchParams();
  const router = useRouter();
  const motivo = sp.get("motivo") ?? "trial";

  const isTrial = motivo === "trial";
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submitUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/unlock-license", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: code.trim() }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErr(json.error ?? "No se pudo validar la clave");
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setErr("Error de red. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
        {isTrial ? "Tu período de prueba terminó" : "Acceso suspendido"}
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">
        {isTrial
          ? "El tiempo de prueba en modo reducido ya venció. Para contratar o renovar, escríbenos por WhatsApp."
          : "La licencia de tu organización no está activa. Para adquirir o renovar, contacta a programamos por WhatsApp."}
      </p>

      <div
        className="mt-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.08] p-5 dark:border-emerald-500/25 dark:bg-emerald-950/30"
        role="region"
        aria-label="Contacto para licencia"
      >
        <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-emerald-800 dark:text-emerald-300">
          Adquirir o renovar licencia
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-700 dark:text-slate-300">
          Escribinos por WhatsApp y te ayudamos con planes Basic o Pro. Cuando acuerdes el pago, te enviaremos una{" "}
          <span className="font-semibold text-slate-900 dark:text-slate-100">clave de acceso</span> generada para{" "}
          <span className="font-semibold text-slate-900 dark:text-slate-100">esta cuenta</span> (tu organización en NOU): solo
          funciona con el usuario que ya pertenece a esa tienda.
        </p>
        <a
          href={PROGRAMAMOS_WA_LICENSE}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-[14px] font-semibold text-white shadow-sm transition-opacity hover:opacity-95"
        >
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.883 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          WhatsApp programamos
        </a>
      </div>

      <div
        className="mt-6 rounded-2xl border border-slate-200/90 bg-slate-50/80 p-5 dark:border-slate-700/90 dark:bg-slate-900/50"
        role="region"
        aria-label="Desbloqueo con clave"
      >
        <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
          ¿Ya tenés tu clave?
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-600 dark:text-slate-400">
          Si programamos te envió la clave tras registrar tu pago, ingrésala aquí.{" "}
          <span className="font-medium text-slate-800 dark:text-slate-200">Solo sirve para esta organización</span> y con la
          sesión con la que entraste; se puede usar una sola vez.
        </p>
        <form onSubmit={submitUnlock} className="mt-4 flex flex-col gap-3">
          <input
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="Ej. XXXX-XXXX-XXXX"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-mono text-[15px] tracking-wide text-slate-900 outline-none placeholder:text-slate-400 focus:border-ov-pink/50 focus:ring-2 focus:ring-ov-pink/25 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
          />
          {err ? (
            <p className="text-[13px] font-medium text-rose-600 dark:text-rose-400" role="alert">
              {err}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={busy || !code.trim()}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-ov-pink px-4 text-[14px] font-semibold text-white transition-colors hover:bg-ov-pink-hover disabled:opacity-50"
          >
            {busy ? "Validando…" : "Ingresar clave y continuar"}
          </button>
        </form>
      </div>

      <ul className="mt-8 list-inside list-disc space-y-2 text-[14px] text-slate-600 dark:text-slate-400">
        <li>
          <span className="font-semibold text-slate-800 dark:text-slate-200">Basic</span>: hasta 500 referencias, 3 usuarios; el resto sin tope práctico.
        </li>
        <li>
          <span className="font-semibold text-slate-800 dark:text-slate-200">Pro</span>: hasta 1000 referencias, 3 sucursales, 5 usuarios.
        </li>
      </ul>
      <p className="mt-6 text-[14px] text-slate-600 dark:text-slate-400">
        También por correo:{" "}
        <a href="mailto:hola@nou.app" className="font-medium text-ov-pink hover:underline dark:text-ov-pink-muted">
          hola@nou.app
        </a>
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/login"
          className="inline-flex h-10 items-center rounded-lg bg-ov-pink px-4 text-[14px] font-medium text-white hover:bg-ov-pink-hover"
        >
          Volver al inicio de sesión
        </Link>
        <Link
          href="/"
          className="inline-flex h-10 items-center rounded-lg border border-slate-300 px-4 text-[14px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Ir al sitio
        </Link>
      </div>
    </div>
  );
}

export default function AccesoBloqueadoPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-12">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
          <div className="mt-4 h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
        </div>
      }
    >
      <AccesoBloqueadoContent />
    </Suspense>
  );
}
