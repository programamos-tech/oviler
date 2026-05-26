"use client";

import { useEffect, useState } from "react";
import { isSameLocalCalendarDay, startOfLocalCalendarDay } from "@/lib/calendar-day-bounds";

/** Fecha de hoy en calendario local; se actualiza al pasar medianoche o al volver a la pestaña. */
export function useLocalCalendarToday(): Date {
  const [today, setToday] = useState(() => startOfLocalCalendarDay());

  useEffect(() => {
    const sync = () => {
      const next = startOfLocalCalendarDay();
      setToday((prev) => (isSameLocalCalendarDay(prev, next) ? prev : next));
    };
    sync();
    const interval = window.setInterval(sync, 60_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") sync();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return today;
}
