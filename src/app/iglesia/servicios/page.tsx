"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import ConfirmDeleteModal from "@/app/components/ConfirmDeleteModal";
import { logActivity } from "@/lib/activities";
import Breadcrumb from "@/app/components/Breadcrumb";

const inputClass =
  "h-10 w-full rounded-lg border border-slate-300 bg-white px-4 text-[14px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200";

const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;
const DAY_NAMES_FULL = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] as const;
const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"] as const;

/** ISO day of week 1=Mon .. 7=Sun */
function getIsoDayOfWeek(year: number, month: number, day: number): number {
  const d = new Date(year, month, day).getDay();
  return d === 0 ? 7 : d;
}

/** Monday of the week containing d (local time) */
function getMonday(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

const PRESET_COLORS = [
  "#EC4899", // pink
  "#F43F5E", // rose
  "#F97316", // orange
  "#EAB308", // yellow
  "#22C55E", // green
  "#06B6D4", // cyan
  "#8B5CF6", // violet
  "#6366F1", // indigo
] as const;

type ChurchService = { id: string; name: string; display_order: number; color: string | null };

type ScheduleRow = {
  id: string;
  church_service_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string | null;
  church_services: { name: string; color: string | null } | null;
};

function formatTime(t: string) {
  if (!t) return "";
  const parts = t.split(":");
  const h = parts[0] ?? "0";
  const m = parts[1] ?? "0";
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
}

function formatTimeRange(start: string, end: string | null) {
  const s = formatTime(start);
  if (!end) return s;
  return `${s} – ${formatTime(end)}`;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "decimal", minimumFractionDigits: 0 }).format(value);
}

type DaySaleRow = {
  id: string;
  invoice_number: string;
  total: number;
  created_at: string;
  customers: { name: string } | null;
  church_services: { name: string } | null;
  income_types: { name: string } | null;
};

export default function ChurchServicesPage() {
  const [services, setServices] = useState<ChurchService[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showNewMeetingModal, setShowNewMeetingModal] = useState(false);
  const [newMeetingName, setNewMeetingName] = useState("");
  const [newMeetingDay, setNewMeetingDay] = useState(1);
  const [newMeetingStart, setNewMeetingStart] = useState("10:00");
  const [newMeetingEnd, setNewMeetingEnd] = useState("");
  const [newMeetingColor, setNewMeetingColor] = useState(PRESET_COLORS[0]);
  const [newMeetingSaving, setNewMeetingSaving] = useState(false);

  const [showAddTimeForm, setShowAddTimeForm] = useState(false);
  const [addTimeServiceId, setAddTimeServiceId] = useState("");
  const [addTimeDay, setAddTimeDay] = useState(1);
  const [addTimeStart, setAddTimeStart] = useState("10:00");
  const [addTimeEnd, setAddTimeEnd] = useState("");
  const [addTimeSaving, setAddTimeSaving] = useState(false);

  const [deleteScheduleTarget, setDeleteScheduleTarget] = useState<ScheduleRow | null>(null);
  const [deletingSchedule, setDeletingSchedule] = useState(false);

  const [branchId, setBranchId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [daySales, setDaySales] = useState<DaySaleRow[]>([]);
  const [daySalesLoading, setDaySalesLoading] = useState(false);

  const today = new Date();
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [viewDate, setViewDate] = useState(() => getMonday(new Date()));

  const loadServices = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: userRow } = await supabase.from("users").select("organization_id").eq("id", user.id).single();
    if (!userRow?.organization_id) return;
    const { data } = await supabase
      .from("church_services")
      .select("id, name, display_order, color")
      .eq("organization_id", userRow.organization_id)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });
    setServices((data ?? []) as ChurchService[]);
  }, []);

  const loadSchedules = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("church_service_schedules")
      .select("id, church_service_id, day_of_week, start_time, end_time, church_services(name, color)")
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });
    if (data) {
      const withService = data as (ScheduleRow & { church_services: { name: string; color: string | null }[] | { name: string; color: string | null } })[];
      setSchedules(
        withService.map((row) => ({
          ...row,
          church_services: Array.isArray(row.church_services) ? (row.church_services[0] || null) : row.church_services,
        }))
      );
    } else setSchedules([]);
    setSchedulesLoading(false);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: ub } = await supabase.from("user_branches").select("branch_id").eq("user_id", user.id).limit(1).single();
      if (ub?.branch_id && !cancelled) setBranchId(ub.branch_id);
      const { data: userRow } = await supabase.from("users").select("organization_id").eq("id", user.id).single();
      if (!userRow?.organization_id || cancelled) return;
      const { data } = await supabase
        .from("church_services")
        .select("id, name, display_order, color")
        .eq("organization_id", userRow.organization_id)
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });
      if (!cancelled) setServices((data ?? []) as ChurchService[]);

      const { data: sched } = await supabase
        .from("church_service_schedules")
        .select("id, church_service_id, day_of_week, start_time, end_time, church_services(name, color)")
        .order("day_of_week", { ascending: true })
        .order("start_time", { ascending: true });
      if (!cancelled && sched) {
        const withService = sched as (ScheduleRow & { church_services: { name: string; color: string | null }[] | { name: string; color: string | null } })[];
        setSchedules(
          withService.map((row) => ({
            ...row,
            church_services: Array.isArray(row.church_services) ? (row.church_services[0] || null) : row.church_services,
          }))
        );
      }
      if (!cancelled) setSchedulesLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedDay || !branchId) {
      setDaySales([]);
      return;
    }
    const y = selectedDay.getFullYear();
    const m = selectedDay.getMonth();
    const d = selectedDay.getDate();
    const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const start = new Date(y, m, d, 0, 0, 0, 0);
    const end = new Date(y, m, d, 23, 59, 59, 999);
    setDaySalesLoading(true);
    const supabase = createClient();
    const baseSelect = "id, invoice_number, total, created_at, customers(name), church_services(name), income_types(name)";
    const normalize = (data: unknown[] | null) => {
      if (!data) return [];
      return (data as (DaySaleRow & { customers: { name: string }[] | { name: string }; church_services: { name: string }[] | { name: string }; income_types: { name: string }[] | { name: string } })[]).map((s) => ({
        ...s,
        customers: Array.isArray(s.customers) ? (s.customers[0] || null) : s.customers,
        church_services: Array.isArray(s.church_services) ? (s.church_services[0] || null) : s.church_services,
        income_types: Array.isArray(s.income_types) ? (s.income_types[0] || null) : s.income_types,
      })) as DaySaleRow[];
    };
    Promise.all([
      supabase.from("sales").select(baseSelect).eq("branch_id", branchId).eq("sale_date", dateStr).neq("status", "cancelled").order("created_at", { ascending: true }),
      supabase.from("sales").select(baseSelect).eq("branch_id", branchId).is("sale_date", null).gte("created_at", start.toISOString()).lte("created_at", end.toISOString()).neq("status", "cancelled").order("created_at", { ascending: true }),
    ])
      .then(([byDate, byCreated]) => {
        const rowsByDate = normalize(byDate.data ?? []);
        const rowsByCreated = normalize(byCreated.data ?? []);
        const seen = new Set<string>();
        const merged: DaySaleRow[] = [];
        for (const row of rowsByDate) {
          if (!seen.has(row.id)) {
            seen.add(row.id);
            merged.push(row);
          }
        }
        for (const row of rowsByCreated) {
          if (!seen.has(row.id)) {
            seen.add(row.id);
            merged.push(row);
          }
        }
        merged.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        setDaySales(merged);
        setDaySalesLoading(false);
      })
      .catch(() => {
        setDaySales([]);
        setDaySalesLoading(false);
      });
  }, [selectedDay, branchId]);

  async function handleAddNewMeeting(e: React.FormEvent) {
    e.preventDefault();
    const name = newMeetingName.trim();
    if (!name) return;
    setError(null);
    setNewMeetingSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Debes iniciar sesión.");
      setNewMeetingSaving(false);
      return;
    }
    const { data: userRow } = await supabase.from("users").select("organization_id").eq("id", user.id).single();
    if (!userRow?.organization_id) {
      setError("No se encontró tu organización.");
      setNewMeetingSaving(false);
      return;
    }
    const nextOrder = services.length > 0 ? Math.max(...services.map((s) => s.display_order), 0) + 1 : 0;
    const { data: newService, error: insertError } = await supabase
      .from("church_services")
      .insert({
        organization_id: userRow.organization_id,
        name,
        display_order: nextOrder,
        color: newMeetingColor,
      })
      .select("id")
      .single();
    if (insertError) {
      setError(insertError.message.includes("unique") || insertError.message.includes("duplicate")
        ? "Ya existe una reunión con ese nombre."
        : insertError.message);
      setNewMeetingSaving(false);
      return;
    }
    if (!newService?.id) {
      setNewMeetingSaving(false);
      return;
    }
    const start = newMeetingStart.trim() ? `${newMeetingStart.trim().padStart(5, "0")}:00`.slice(0, 8) : "10:00:00";
    const end = newMeetingEnd.trim() ? `${newMeetingEnd.trim().padStart(5, "0")}:00`.slice(0, 8) : null;
    const { error: schedError } = await supabase.from("church_service_schedules").insert({
      church_service_id: newService.id,
      day_of_week: newMeetingDay,
      start_time: start,
      end_time: end,
    });
    if (schedError) {
      setError(schedError.message);
      setNewMeetingSaving(false);
      return;
    }
    try {
      await logActivity(supabase, {
        organizationId: userRow.organization_id,
        userId: user.id,
        action: "church_service_created",
        entityType: "church_service",
        entityId: newService.id,
        summary: `Creó la reunión ${name}`,
        metadata: { name, color: newMeetingColor },
      });
    } catch {
      // no bloquear
    }
    setNewMeetingName("");
    setNewMeetingDay(1);
    setNewMeetingStart("10:00");
    setNewMeetingEnd("");
    setNewMeetingColor(PRESET_COLORS[0]);
    setShowNewMeetingModal(false);
    await loadServices();
    await loadSchedules();
    setNewMeetingSaving(false);
  }

  async function handleAddTime(e: React.FormEvent) {
    e.preventDefault();
    if (!addTimeServiceId) return;
    setError(null);
    setAddTimeSaving(true);
    const supabase = createClient();
    const start = addTimeStart.trim() ? `${addTimeStart.trim().padStart(5, "0")}:00`.slice(0, 8) : "10:00:00";
    const end = addTimeEnd.trim() ? `${addTimeEnd.trim().padStart(5, "0")}:00`.slice(0, 8) : null;
    const { error: insertError } = await supabase.from("church_service_schedules").insert({
      church_service_id: addTimeServiceId,
      day_of_week: addTimeDay,
      start_time: start,
      end_time: end,
    });
    if (insertError) {
      setError(insertError.message);
      setAddTimeSaving(false);
      return;
    }
    await loadSchedules();
    setAddTimeServiceId("");
    setAddTimeDay(1);
    setAddTimeStart("10:00");
    setAddTimeEnd("");
    setShowAddTimeForm(false);
    setAddTimeSaving(false);
  }

  function openDeleteScheduleModal(schedule: ScheduleRow) {
    setDeleteScheduleTarget(schedule);
  }

  function closeDeleteScheduleModal() {
    if (!deletingSchedule) setDeleteScheduleTarget(null);
  }

  async function handleConfirmDeleteSchedule() {
    if (!deleteScheduleTarget) return;
    setDeletingSchedule(true);
    const supabase = createClient();
    await supabase.from("church_service_schedules").delete().eq("id", deleteScheduleTarget.id);
    setSchedules((prev) => prev.filter((s) => s.id !== deleteScheduleTarget.id));
    setDeleteScheduleTarget(null);
    setDeletingSchedule(false);
  }

  const schedulesByDay = (() => {
    const byDay: Record<number, ScheduleRow[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };
    schedules.forEach((s) => {
      if (s.day_of_week >= 1 && s.day_of_week <= 7) byDay[s.day_of_week].push(s);
    });
    [1, 2, 3, 4, 5, 6, 7].forEach((d) => byDay[d].sort((a, b) => String(a.start_time).localeCompare(String(b.start_time))));
    return byDay;
  })();

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const weekStart = viewMode === "week" ? viewDate : getMonday(viewDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOffset = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
  const totalCells = 42;
  const calendarCells = Array.from({ length: totalCells }, (_, i) => {
    const dayNum = i - firstDayOffset + 1;
    if (dayNum < 1 || dayNum > daysInMonth) return { dayNum: null, isoDay: null as number | null };
    return { dayNum, isoDay: getIsoDayOfWeek(viewYear, viewMonth, dayNum) };
  });

  const weekEnd = weekDays[6];
  const weekTitle =
    weekStart.getMonth() === weekEnd.getMonth()
      ? `${weekStart.getDate()} – ${weekEnd.getDate()} ${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getFullYear()}`
      : `${weekStart.getDate()} ${MONTH_NAMES[weekStart.getMonth()]} – ${weekEnd.getDate()} ${MONTH_NAMES[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`;

  return (
    <div className="flex min-h-[calc(100vh-11rem)] min-w-0 flex-col gap-4">
      <header className="shrink-0 space-y-2">
        <Breadcrumb items={[{ label: "Iglesia", href: "/iglesia/servicios" }, { label: "Servicios" }]} />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-emerald-50">
              Servicios y reuniones
            </h1>
            <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Configura las reuniones de la iglesia y asígnales un horario en el calendario. Al registrar ofrendas podrás asociar el ingreso a una reunión.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowNewMeetingModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-ov-pink px-4 py-3 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-ov-pink-hover"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Agregar nueva reunión
            </button>
            <Link
              href="/ventas"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              title="Volver a ingresos"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-[14px] font-medium text-red-800 dark:bg-red-900/30 dark:text-red-200" role="alert">
          {error}
        </div>
      )}

      {/* Calendario: semana o mes */}
      <section className="flex min-h-0 flex-1 flex-col rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setViewDate((v) => (viewMode === "week" ? addDays(v, -7) : addMonths(new Date(v.getFullYear(), v.getMonth(), 1), -1)))
              }
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              title={viewMode === "week" ? "Semana anterior" : "Mes anterior"}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="min-w-[200px] text-center text-lg font-bold text-slate-900 dark:text-slate-50">
              {viewMode === "week" ? weekTitle : `${MONTH_NAMES[viewMonth]} ${viewYear}`}
            </h2>
            <button
              type="button"
              onClick={() =>
                setViewDate((v) => (viewMode === "week" ? addDays(v, 7) : addMonths(new Date(v.getFullYear(), v.getMonth(), 1), 1)))
              }
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              title={viewMode === "week" ? "Semana siguiente" : "Mes siguiente"}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-800" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "week"}
                onClick={() => {
                  setViewMode("week");
                  setViewDate(getMonday(viewDate));
                }}
                className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  viewMode === "week" ? "bg-white text-slate-900 shadow dark:bg-slate-700 dark:text-slate-50" : "text-slate-600 dark:text-slate-400"
                }`}
              >
                Semana
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "month"}
                onClick={() => {
                  setViewMode("month");
                  setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth(), 1));
                }}
                className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  viewMode === "month" ? "bg-white text-slate-900 shadow dark:bg-slate-700 dark:text-slate-50" : "text-slate-600 dark:text-slate-400"
                }`}
              >
                Mes
              </button>
            </span>
            <button
              type="button"
              onClick={() =>
                viewMode === "week" ? setViewDate(getMonday(new Date())) : setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))
              }
              className="text-[13px] font-medium text-slate-600 hover:underline dark:text-slate-400 dark:hover:text-slate-200"
            >
              Hoy
            </button>
            {services.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setShowAddTimeForm((v) => !v);
                  if (!showAddTimeForm) setAddTimeServiceId(services[0]?.id ?? "");
                }}
                className="text-[13px] font-medium text-ov-pink hover:underline"
              >
                {showAddTimeForm ? "Cerrar" : "+ Agregar otro horario"}
              </button>
            )}
          </div>
        </div>

        {showAddTimeForm && services.length > 0 && (
          <form onSubmit={handleAddTime} className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="min-w-[180px]">
              <label className="mb-1 block text-[12px] font-medium text-slate-600 dark:text-slate-400">Reunión</label>
              <select
                value={addTimeServiceId}
                onChange={(e) => setAddTimeServiceId(e.target.value)}
                className={inputClass}
                required
              >
                <option value="">Seleccionar…</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="min-w-[140px]">
              <label className="mb-1 block text-[12px] font-medium text-slate-600 dark:text-slate-400">Día</label>
              <select value={addTimeDay} onChange={(e) => setAddTimeDay(Number(e.target.value))} className={inputClass}>
                {DAY_NAMES_FULL.map((name, i) => (
                  <option key={i} value={i + 1}>{name}</option>
                ))}
              </select>
            </div>
            <div className="min-w-[100px]">
              <label className="mb-1 block text-[12px] font-medium text-slate-600 dark:text-slate-400">Inicio</label>
              <input type="time" value={addTimeStart} onChange={(e) => setAddTimeStart(e.target.value)} className={inputClass} required />
            </div>
            <div className="min-w-[100px]">
              <label className="mb-1 block text-[12px] font-medium text-slate-600 dark:text-slate-400">Fin (opcional)</label>
              <input type="time" value={addTimeEnd} onChange={(e) => setAddTimeEnd(e.target.value)} className={inputClass} />
            </div>
            <button
              type="submit"
              disabled={addTimeSaving || !addTimeServiceId}
              className="h-10 rounded-lg bg-ov-pink px-4 text-[13px] font-medium text-white transition-colors hover:bg-ov-pink-hover disabled:opacity-50"
            >
              {addTimeSaving ? "Guardando…" : "Agregar horario"}
            </button>
          </form>
        )}

        {schedulesLoading ? (
          <p className="mt-4 text-[13px] text-slate-500">Cargando calendario…</p>
        ) : viewMode === "week" ? (
          <div className="mt-4 grid min-h-0 flex-1 grid-cols-7 grid-rows-[1fr] gap-2 sm:gap-3">
            {weekDays.map((day, i) => {
              const isoDay = i + 1;
              const daySchedules = schedulesByDay[isoDay];
              const isToday =
                day.getDate() === today.getDate() &&
                day.getMonth() === today.getMonth() &&
                day.getFullYear() === today.getFullYear();
              const isSelected =
                selectedDay &&
                day.getDate() === selectedDay.getDate() &&
                day.getMonth() === selectedDay.getMonth() &&
                day.getFullYear() === selectedDay.getFullYear();
              return (
                <div
                  key={i}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedDay(new Date(day.getFullYear(), day.getMonth(), day.getDate()))}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedDay(new Date(day.getFullYear(), day.getMonth(), day.getDate())); } }}
                  className={`min-h-[120px] flex flex-col rounded-lg border border-slate-200 bg-slate-50/50 p-2 dark:border-slate-700 dark:bg-slate-800/30 ${
                    isToday ? "ring-2 ring-ov-pink" : ""
                  } ${isSelected ? "ring-2 ring-ov-pink ring-offset-2 dark:ring-offset-slate-900" : ""} cursor-pointer`}
                >
                  <p className={`shrink-0 mb-2 text-center text-[12px] font-bold ${isToday ? "text-ov-pink" : "text-slate-600 dark:text-slate-400"}`}>
                    {DAY_NAMES[i]} {day.getDate()}
                  </p>
                  <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
                    {daySchedules.length === 0 ? (
                      <li className="text-[11px] text-slate-400 dark:text-slate-500">—</li>
                    ) : (
                      daySchedules.map((sched) => {
                        const color = sched.church_services?.color ?? "#94A3B8";
                        return (
                          <li
                            key={sched.id}
                            className="group flex items-start justify-between gap-1 rounded-lg bg-white py-1.5 pl-2 pr-1.5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700"
                            style={{ borderLeft: `3px solid ${color}` }}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[12px] font-medium text-slate-800 dark:text-slate-100">
                                {sched.church_services?.name ?? "—"}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {formatTimeRange(sched.start_time, sched.end_time)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDeleteScheduleModal(sched);
                              }}
                              className="shrink-0 rounded p-0.5 text-slate-400 opacity-0 transition-opacity hover:bg-slate-200 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-slate-700 dark:hover:text-red-400"
                              title="Quitar horario"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </li>
                        );
                      })
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 grid min-h-0 flex-1 grid-cols-7 content-start gap-px rounded-lg border border-slate-200 bg-slate-200 dark:border-slate-700 dark:bg-slate-700">
            {DAY_NAMES.map((name) => (
              <div
                key={name}
                className="bg-slate-100 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-400"
              >
                {name}
              </div>
            ))}
            {calendarCells.map((cell, i) => {
              const isToday =
                cell.dayNum != null &&
                viewYear === today.getFullYear() &&
                viewMonth === today.getMonth() &&
                cell.dayNum === today.getDate();
              const isSelected =
                cell.dayNum != null &&
                selectedDay &&
                viewYear === selectedDay.getFullYear() &&
                viewMonth === selectedDay.getMonth() &&
                cell.dayNum === selectedDay.getDate();
              const daySchedules = cell.isoDay != null ? schedulesByDay[cell.isoDay] : [];
              return (
                <div
                  key={i}
                  role={cell.dayNum != null ? "button" : undefined}
                  tabIndex={cell.dayNum != null ? 0 : undefined}
                  onClick={cell.dayNum != null ? () => setSelectedDay(new Date(viewYear, viewMonth, cell.dayNum!)) : undefined}
                  onKeyDown={
                    cell.dayNum != null
                      ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedDay(new Date(viewYear, viewMonth, cell.dayNum!)); } }
                      : undefined
                  }
                  className={`min-h-[88px] bg-white p-1.5 dark:bg-slate-900 ${
                    cell.dayNum == null ? "bg-slate-50 dark:bg-slate-800/50" : "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/80"
                  } ${isToday ? "ring-2 ring-inset ring-ov-pink" : ""} ${isSelected ? "ring-2 ring-inset ring-ov-pink ring-offset-1" : ""}`}
                >
                  {cell.dayNum != null ? (
                    <>
                      <p className={`mb-1 text-right text-[12px] font-semibold ${isToday ? "text-ov-pink" : "text-slate-600 dark:text-slate-400"}`}>
                        {cell.dayNum}
                      </p>
                      <ul className="space-y-1">
                        {daySchedules.length === 0 ? null : (
                          daySchedules.map((sched) => {
                            const color = sched.church_services?.color ?? "#94A3B8";
                            return (
                              <li
                                key={sched.id}
                                className="group flex items-start justify-between gap-0.5 rounded bg-white py-1 pl-1.5 pr-1 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700"
                                style={{ borderLeft: `3px solid ${color}` }}
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[11px] font-medium text-slate-800 dark:text-slate-100">
                                    {sched.church_services?.name ?? "—"}
                                  </p>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                    {formatTimeRange(sched.start_time, sched.end_time)}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openDeleteScheduleModal(sched);
                                  }}
                                  className="shrink-0 rounded p-0.5 text-slate-400 opacity-0 transition-opacity hover:bg-slate-200 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-slate-700 dark:hover:text-red-400"
                                  title="Quitar horario"
                                >
                                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </li>
                            );
                          })
                        )}
                      </ul>
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        {/* Ingresos del día (debajo del calendario) */}
        {selectedDay && (
          <div className="mt-4 shrink-0 rounded-lg border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="flex items-center justify-between gap-3">
              <h3 id="day-income-title" className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                Ingresos del {selectedDay.getDate()} {MONTH_NAMES[selectedDay.getMonth()]} {selectedDay.getFullYear()}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="text-[12px] font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
              >
                Cerrar
              </button>
            </div>
            <div className="mt-3">
              {daySalesLoading ? (
                <p className="text-[13px] text-slate-500">Cargando ingresos…</p>
              ) : daySales.length === 0 ? (
                <p className="text-[13px] text-slate-500 dark:text-slate-400">
                  No hay ingresos registrados este día. Comprueba que el registro sea de esta sede y que la fecha del registro coincida con este día.
                </p>
              ) : (
                <>
                  <ul className="space-y-2">
                    {daySales.map((sale) => (
                      <li key={sale.id}>
                        <Link
                          href={`/ventas/${sale.id}`}
                          className="block rounded-lg border border-slate-200 bg-white p-3 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                              Registro #{sale.invoice_number}
                            </span>
                            <span className="text-[13px] font-medium text-slate-700 dark:text-slate-200">
                              {formatMoney(sale.total)}
                            </span>
                          </div>
                          <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
                            {sale.customers?.name ?? sale.church_services?.name ?? sale.income_types?.name ?? "—"}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 border-t border-slate-200 pt-3 text-[14px] font-semibold text-slate-800 dark:border-slate-700 dark:text-slate-100">
                    Total: {formatMoney(daySales.reduce((sum, s) => sum + Number(s.total), 0))}
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Modal: Agregar nueva reunión */}
      {showNewMeetingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="new-meeting-title">
          <div className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/70" onClick={() => !newMeetingSaving && setShowNewMeetingModal(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 dark:ring-1 dark:ring-slate-800">
            <h2 id="new-meeting-title" className="text-lg font-bold text-slate-900 dark:text-slate-50">
              Agregar nueva reunión
            </h2>
            <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
              Nombre, día y hora de la reunión, y un color para identificarla en el calendario.
            </p>
            <form onSubmit={handleAddNewMeeting} className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-[12px] font-medium text-slate-600 dark:text-slate-400">Nombre</label>
                <input
                  type="text"
                  value={newMeetingName}
                  onChange={(e) => setNewMeetingName(e.target.value)}
                  placeholder="Ej. Culto dominical, Reunión de jóvenes"
                  className={inputClass}
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-slate-600 dark:text-slate-400">Día</label>
                <select
                  value={newMeetingDay}
                  onChange={(e) => setNewMeetingDay(Number(e.target.value))}
                  className={inputClass}
                >
                  {DAY_NAMES_FULL.map((name, i) => (
                    <option key={i} value={i + 1}>{name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-slate-600 dark:text-slate-400">Hora inicio</label>
                  <input
                    type="time"
                    value={newMeetingStart}
                    onChange={(e) => setNewMeetingStart(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-slate-600 dark:text-slate-400">Hora fin (opcional)</label>
                  <input type="time" value={newMeetingEnd} onChange={(e) => setNewMeetingEnd(e.target.value)} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-[12px] font-medium text-slate-600 dark:text-slate-400">Color</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setNewMeetingColor(hex)}
                      className={`h-9 w-9 rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
                        newMeetingColor === hex ? "ring-2 ring-slate-900 ring-offset-2 dark:ring-slate-100 dark:ring-offset-slate-900" : ""
                      }`}
                      style={{ backgroundColor: hex }}
                      title={hex}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => !newMeetingSaving && setShowNewMeetingModal(false)}
                  className="flex-1 rounded-lg border border-slate-300 py-2.5 text-[14px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={newMeetingSaving || !newMeetingName.trim()}
                  className="flex-1 rounded-lg bg-ov-pink py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-ov-pink-hover disabled:opacity-50"
                >
                  {newMeetingSaving ? "Guardando…" : "Crear reunión"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={!!deleteScheduleTarget}
        onClose={closeDeleteScheduleModal}
        title="Quitar horario"
        message={
          deleteScheduleTarget
            ? `¿Quitar "${deleteScheduleTarget.church_services?.name ?? ""}" del ${DAY_NAMES_FULL[(deleteScheduleTarget.day_of_week ?? 1) - 1]} a las ${formatTime(deleteScheduleTarget.start_time)}?`
            : ""
        }
        onConfirm={handleConfirmDeleteSchedule}
        loading={deletingSchedule}
        ariaTitle="Quitar horario del calendario"
      />
    </div>
  );
}
