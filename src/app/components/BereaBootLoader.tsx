"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { BereaAuthLogo } from "@/app/(auth)/login/BereaAuthLogo";
import { BEREA_SESSION_READY_EVENT } from "./SessionProvider";

const AUTH_PATHS = ["/login", "/registro", "/onboarding"];

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
  const gates = useRef({ doc: false, session: false, startedAt: 0 });
  const progressRef = useRef(0);

  useEffect(() => {
    if (!isPageReload() || shouldSkipBootLoader(pathname)) return;

    gates.current = { doc: false, session: false, startedAt: performance.now() };
    progressRef.current = 0;
    setActive(true);
    setExiting(false);
    setProgress(0);

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
        window.setTimeout(() => setActive(false), 520);
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
        <BereaAuthLogo />
        <div className="berea-boot-progress">
          <div className="berea-boot-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <p className="berea-boot-caption">Cargando tu espacio de trabajo…</p>
      </div>
    </div>
  );
}
