"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { BEREA_SESSION_READY_EVENT } from "./SessionProvider";

const AUTH_PATHS = ["/login", "/registro", "/onboarding"];
const STATUS_LINES = [
  "Iniciando Berea Comercios…",
  "Preparando tu sucursal…",
  "Sincronizando inventario…",
  "Cargando reportes…",
  "Casi listo…",
] as const;

function isPageReload(): boolean {
  if (typeof window === "undefined") return false;
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  return nav?.type === "reload";
}

function shouldSkipBootLoader(pathname: string): boolean {
  return pathname === "/t" || pathname.startsWith("/t/");
}

function needsSessionBoot(pathname: string): boolean {
  if (pathname === "/" || pathname === "/acceso-bloqueado") return false;
  if (AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return false;
  return true;
}

export default function BereaBootLoader() {
  const pathname = usePathname();
  const needSession = useMemo(() => needsSessionBoot(pathname), [pathname]);
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);
  const gates = useRef({ doc: false, session: false, startedAt: 0 });
  const progressRef = useRef(0);

  useEffect(() => {
    if (!isPageReload() || shouldSkipBootLoader(pathname)) return;

    gates.current = { doc: false, session: false, startedAt: performance.now() };
    progressRef.current = 0;
    setActive(true);
    setExiting(false);
    setProgress(0);
    setStatusIndex(0);

    const markDoc = () => {
      gates.current.doc = true;
    };
    if (document.readyState === "complete") markDoc();
    else window.addEventListener("load", markDoc, { once: true });

    const onSession = () => {
      gates.current.session = true;
    };
    window.addEventListener(BEREA_SESSION_READY_EVENT, onSession);

    let raf = 0;
    let done = false;

    const tick = () => {
      const elapsed = performance.now() - gates.current.startedAt;
      let target = 8 + Math.min(58, elapsed / 70);
      if (gates.current.doc) target = Math.max(target, needSession ? 90 : 100);
      if (needSession && gates.current.session) target = 100;
      else if (needSession && gates.current.doc) target = Math.max(target, 94);

      progressRef.current += (target - progressRef.current) * 0.14;
      const next = Math.min(100, progressRef.current);
      setProgress(next);

      const loaded =
        (needSession && gates.current.session) || (!needSession && gates.current.doc);
      const canFinish = elapsed >= 720 && (loaded || elapsed >= 14000);

      if (!done && canFinish) {
        done = true;
        progressRef.current = 100;
        setProgress(100);
        window.setTimeout(() => setExiting(true), 120);
        window.setTimeout(() => setActive(false), 620);
        return;
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("load", markDoc);
      window.removeEventListener(BEREA_SESSION_READY_EVENT, onSession);
    };
  }, [pathname, needSession]);

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => {
      setStatusIndex((i) => (i + 1) % STATUS_LINES.length);
    }, 1400);
    return () => clearInterval(id);
  }, [active]);

  if (!active) return null;

  const pct = Math.round(progress);

  return (
    <div
      className={`berea-boot-overlay${exiting ? " berea-boot-overlay--exit" : ""}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Cargando Berea Comercios"
    >
      <div className="berea-boot-panel">
        <div className="berea-boot-logo-wrap">
          <Image
            src="/logo-berea.2.png"
            alt=""
            width={72}
            height={72}
            className="berea-boot-logo"
            priority
          />
        </div>
        <p className="berea-boot-title">Berea Comercios</p>
        <p className="berea-boot-subtitle">Preparando tu espacio de trabajo</p>

        <div className="berea-boot-bar-frame">
          <div className="berea-boot-bar-track">
            <div className="berea-boot-bar-fill" style={{ width: `${pct}%` }} />
            <div className="berea-boot-bar-shine" style={{ left: `${Math.max(0, pct - 18)}%` }} />
          </div>
          <div className="berea-boot-bar-segments" aria-hidden>
            {Array.from({ length: 10 }).map((_, i) => (
              <span key={i} />
            ))}
          </div>
        </div>

        <div className="berea-boot-meta">
          <span className="berea-boot-pct">{pct}%</span>
          <span className="berea-boot-status" key={statusIndex}>
            {STATUS_LINES[statusIndex]}
          </span>
        </div>

        <p className="berea-boot-hint">Pulsa F5 para actualizar datos</p>
      </div>
    </div>
  );
}
