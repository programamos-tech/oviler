"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const INTERVAL_MS = 2 * 60 * 1000;

/**
 * Marca actividad del usuario (last_seen_at) mientras usa la app.
 * No hace nada si no hay sesión o si el usuario no tiene fila en `public.users`.
 */
export default function PresenceHeartbeat() {
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function tick() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session || cancelled) return;
      await supabase.rpc("touch_user_last_seen");
    }

    tick();
    const id = window.setInterval(tick, INTERVAL_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return null;
}
