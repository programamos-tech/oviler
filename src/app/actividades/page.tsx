"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Avatar from "boring-avatars";

type Activity = {
  id: string;
  organization_id: string;
  branch_id: string | null;
  user_id: string | null;
  actor_type: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  summary: string;
  metadata: Record<string, unknown>;
  created_at: string;
  users: { name: string; avatar_url?: string | null } | null;
};

type BranchOption = { id: string; name: string };

type ActivityComment = {
  id: string;
  activity_id: string;
  user_id: string;
  body: string;
  created_at: string;
  users: { name: string; avatar_url?: string | null } | null;
};

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const sec = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (sec < 60) return "hace un momento";
  const min = Math.floor(sec / 60);
  if (min < 60) return `hace ${min} ${min === 1 ? "minuto" : "minutos"}`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} ${h === 1 ? "hora" : "horas"}`;
  const day = Math.floor(h / 24);
  if (day < 30) return `hace ${day} ${day === 1 ? "día" : "días"}`;
  const month = Math.floor(day / 30);
  return `hace ${month} ${month === 1 ? "mes" : "meses"}`;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

function initial(name: string | null): string {
  if (!name || !name.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
  return name.slice(0, 2).toUpperCase();
}

function getAvatarVariant(avatarUrl?: string | null): "beam" | "marble" | "pixel" {
  if (!avatarUrl?.startsWith("avatar:")) return "beam";
  const variant = avatarUrl.replace("avatar:", "");
  if (variant === "beam" || variant === "marble" || variant === "pixel") return variant;
  return "beam";
}

function getActivityTypeIcon(activity: { entity_type: string; action: string }): { icon: string; label: string } {
  if (activity.entity_type === "customer") return { icon: "person", label: "Cliente" };
  if (activity.entity_type === "category") return { icon: "category", label: "Categoría" };
  if (activity.entity_type === "product") {
    return { icon: "inventory_2", label: activity.action === "stock_adjusted" ? "Inventario" : "Producto" };
  }
  if (activity.entity_type === "sale") return { icon: "shopping_cart", label: "Venta" };
  return { icon: "info", label: "Actividad" };
}

const SALE_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  preparing: "En alistamiento",
  packing: "En alistamiento",
  on_the_way: "Despachado",
  completed: "Completada",
  delivered: "Finalizado",
  cancelled: "Anulada",
};

const FEED_PAGE_SIZE = 20;

export default function ActivityFeedPage() {
  const searchParams = useSearchParams();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [currentBranch, setCurrentBranch] = useState<BranchOption | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [branchFilterId, setBranchFilterId] = useState<string | null>(null);
  const [commentsByActivity, setCommentsByActivity] = useState<Record<string, ActivityComment[]>>({});
  const [likesCount, setLikesCount] = useState<Record<string, number>>({});
  const [likedByMe, setLikedByMe] = useState<Record<string, boolean>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const activityRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [highlightedActivityId, setHighlightedActivityId] = useState<string | null>(null);

  const mapActivities = (activitiesData: unknown[]) =>
    (activitiesData as Array<{
      id: string;
      organization_id: string;
      branch_id: string | null;
      user_id: string | null;
      actor_type: string;
      action: string;
      entity_type: string;
      entity_id: string | null;
      summary: string;
      metadata: Record<string, unknown>;
      created_at: string;
      users: { name: string; avatar_url?: string | null }[] | { name: string; avatar_url?: string | null } | null;
    }>).map((a) => ({
      ...a,
      users: Array.isArray(a.users) ? (a.users[0] || null) : a.users,
    })) as Activity[];

  const mergeActivityMeta = useCallback(async (ids: string[], userId: string, replace: boolean) => {
    if (ids.length === 0) return;
    const supabase = createClient();
    const [commentsRes, likesRes] = await Promise.all([
      supabase
        .from("activity_comments")
        .select("id, activity_id, user_id, body, created_at, users!user_id(name, avatar_url)")
        .in("activity_id", ids)
        .order("created_at", { ascending: true }),
      supabase.from("activity_likes").select("activity_id, user_id").in("activity_id", ids),
    ]);

    const comments = ((commentsRes.data ?? []) as Array<{
      id: string;
      activity_id: string;
      user_id: string;
      body: string;
      created_at: string;
      users: { name: string; avatar_url?: string | null }[] | { name: string; avatar_url?: string | null } | null;
    }>).map((c) => ({
      ...c,
      users: Array.isArray(c.users) ? (c.users[0] || null) : c.users,
    })) as ActivityComment[];
    const byActivity: Record<string, ActivityComment[]> = {};
    for (const c of comments) {
      if (!byActivity[c.activity_id]) byActivity[c.activity_id] = [];
      byActivity[c.activity_id].push(c);
    }
    setCommentsByActivity((prev) => (replace ? byActivity : { ...prev, ...byActivity }));

    const likes = likesRes.data ?? [];
    const count: Record<string, number> = {};
    const byMe: Record<string, boolean> = {};
    for (const l of likes as { activity_id: string; user_id: string }[]) {
      count[l.activity_id] = (count[l.activity_id] ?? 0) + 1;
      if (l.user_id === userId) byMe[l.activity_id] = true;
    }
    setLikesCount((prev) => (replace ? count : { ...prev, ...count }));
    setLikedByMe((prev) => (replace ? byMe : { ...prev, ...byMe }));
  }, []);

  const loadFeed = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    setCurrentUserId(user.id);
    const { data: userRow } = await supabase.from("users").select("organization_id").eq("id", user.id).single();
    if (!userRow?.organization_id) {
      setLoading(false);
      return;
    }

    const { data: ub } = await supabase.from("user_branches").select("branch_id").eq("user_id", user.id).limit(1).single();
    const currentBranchId = ub?.branch_id ?? null;
    setOrganizationId(userRow.organization_id);
    setBranchFilterId(currentBranchId);
    if (currentBranchId) {
      const { data: branchRow } = await supabase.from("branches").select("id, name").eq("id", currentBranchId).single();
      if (branchRow) setCurrentBranch(branchRow as BranchOption);
    } else {
      setCurrentBranch(null);
    }

    let q = supabase
      .from("activities")
      .select("id, organization_id, branch_id, user_id, actor_type, action, entity_type, entity_id, summary, metadata, created_at, users!user_id(name, avatar_url)")
      .eq("organization_id", userRow.organization_id)
      .order("created_at", { ascending: false })
      .range(0, FEED_PAGE_SIZE - 1);

    if (currentBranchId) {
      q = q.eq("branch_id", currentBranchId);
    } else {
      q = q.is("branch_id", null);
    }

    const { data: activitiesData, error: activitiesError } = await q;
    if (activitiesError && typeof console !== "undefined" && console.error) {
      console.error("[Actividades] Error al cargar:", activitiesError.message);
    }

    const list = mapActivities(activitiesData ?? []);
    setActivities(list);
    setOffset(list.length);
    setHasMore(list.length === FEED_PAGE_SIZE);
    const ids = list.map((a) => a.id);
    if (ids.length === 0) {
      setCommentsByActivity({});
      setLikesCount({});
      setLikedByMe({});
      setLoading(false);
      return;
    }
    await mergeActivityMeta(ids, user.id, true);
    setLoading(false);
  }, [mergeActivityMeta]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const loadMoreActivities = useCallback(async () => {
    if (loading || loadingMore || !hasMore || !organizationId) return;
    setLoadingMore(true);
    const supabase = createClient();
    let q = supabase
      .from("activities")
      .select("id, organization_id, branch_id, user_id, actor_type, action, entity_type, entity_id, summary, metadata, created_at, users!user_id(name, avatar_url)")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .range(offset, offset + FEED_PAGE_SIZE - 1);

    if (branchFilterId) {
      q = q.eq("branch_id", branchFilterId);
    } else {
      q = q.is("branch_id", null);
    }

    const { data } = await q;
    const batch = mapActivities(data ?? []);
    setActivities((prev) => [...prev, ...batch.filter((b) => !prev.some((p) => p.id === b.id))]);
    setOffset((prev) => prev + batch.length);
    setHasMore(batch.length === FEED_PAGE_SIZE);
    if (currentUserId && batch.length > 0) {
      await mergeActivityMeta(batch.map((b) => b.id), currentUserId, false);
    }
    setLoadingMore(false);
  }, [branchFilterId, currentUserId, hasMore, loading, loadingMore, mergeActivityMeta, offset, organizationId]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMoreActivities();
        }
      },
      { rootMargin: "180px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMoreActivities]);

  useEffect(() => {
    const targetActivityId = searchParams.get("activity");
    const targetCommentId = searchParams.get("comment");
    if (!targetActivityId || activities.length === 0) return;
    const exists = activities.some((a) => a.id === targetActivityId);
    if (!exists) return;
    if (targetCommentId) {
      setExpandedComments((prev) => ({ ...prev, [targetActivityId]: true }));
    }
    const el = activityRefs.current[targetActivityId];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedActivityId(targetActivityId);
    const t = window.setTimeout(() => setHighlightedActivityId((prev) => (prev === targetActivityId ? null : prev)), 2400);
    return () => window.clearTimeout(t);
  }, [activities, searchParams]);

  const toggleLike = async (activityId: string) => {
    if (!currentUserId) return;
    const supabase = createClient();
    const isLiked = likedByMe[activityId];
    if (isLiked) {
      await supabase.from("activity_likes").delete().eq("activity_id", activityId).eq("user_id", currentUserId);
      setLikedByMe((prev) => ({ ...prev, [activityId]: false }));
      setLikesCount((prev) => ({ ...prev, [activityId]: Math.max(0, (prev[activityId] ?? 1) - 1) }));
    } else {
      await supabase.from("activity_likes").insert({ activity_id: activityId, user_id: currentUserId });
      setLikedByMe((prev) => ({ ...prev, [activityId]: true }));
      setLikesCount((prev) => ({ ...prev, [activityId]: (prev[activityId] ?? 0) + 1 }));
    }
  };

  const submitComment = async (activityId: string) => {
    const body = (commentDraft[activityId] ?? "").trim();
    if (!body || !currentUserId) return;
    setSubmittingComment(activityId);
    const supabase = createClient();
    const { data: newComment } = await supabase
      .from("activity_comments")
      .insert({ activity_id: activityId, user_id: currentUserId, body })
      .select("id, activity_id, user_id, body, created_at, users!user_id(name, avatar_url)")
      .single();
    setSubmittingComment(null);
    setCommentDraft((prev) => ({ ...prev, [activityId]: "" }));
    if (newComment) {
      const comment = newComment as unknown as ActivityComment;
      setCommentsByActivity((prev) => ({
        ...prev,
        [activityId]: [...(prev[activityId] ?? []), comment],
      }));
    }
  };

  const actorName = (a: Activity) => (a.actor_type === "system" ? "Sistema" : a.users?.name ?? "Usuario");
  const isSystem = (a: Activity) => a.actor_type === "system";

  if (loading) {
    return (
      <div className="space-y-4 max-w-[1600px] mx-auto">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-emerald-50">Actividades</h1>
          <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
            Cargando el muro…
          </p>
        </header>
        <div className="flex min-h-[200px] items-center justify-center rounded-xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800">
          <p className="text-[14px] text-slate-500 dark:text-slate-400">Cargando actividades…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <header className="mx-auto max-w-3xl px-4 py-3 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Qué está pasando hoy
        </h1>
        <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-300">
          Actividad reciente de tu sucursal.
        </p>
        {!currentBranch && !loading && (
          <p className="text-[13px] text-amber-600 dark:text-amber-400">
            No tienes sucursal asignada. Asigna una en tu perfil para ver actividades.
          </p>
        )}
      </header>

      <section className="mx-auto max-w-3xl px-1 py-1">
        {activities.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-[15px] font-medium text-slate-700 dark:text-slate-300">
              Aún no hay actividades
            </p>
            <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
              Las acciones en esta sucursal (crear/editar productos, ajustar stock, crear categorías) aparecerán aquí.
            </p>
          </div>
        ) : (
          <>
          <div className="space-y-2">
            {activities.map((a) => {
            const comments = commentsByActivity[a.id] ?? [];
            const likesNum = likesCount[a.id] ?? 0;
            const liked = !!likedByMe[a.id];
            const expanded = expandedComments[a.id] ?? false;
            const typeIcon = getActivityTypeIcon(a);
            return (
              <div
                key={a.id}
                ref={(el) => {
                  activityRefs.current[a.id] = el;
                }}
                className={`px-4 py-4 sm:px-5 transition-colors ${
                  highlightedActivityId === a.id ? "rounded-lg bg-ov-pink/10 dark:bg-ov-pink/20" : ""
                }`}
              >
                <div className="flex gap-3">
                  <div
                    className={`relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-[12px] font-bold text-white ${
                      isSystem(a) ? "bg-orange-500" : "bg-slate-900 dark:bg-slate-700"
                    }`}
                  >
                    {isSystem(a) ? (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    ) : a.users?.avatar_url && !a.users.avatar_url.startsWith("avatar:") ? (
                      <img
                        src={a.users.avatar_url}
                        alt=""
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = "flex";
                        }}
                      />
                    ) : null}
                    {!isSystem(a) && (
                      a.users?.avatar_url?.startsWith("avatar:") || !a.users?.avatar_url ? (
                        <div className="rounded-full">
                          <Avatar
                            size={30}
                            name={`${actorName(a)}-${getAvatarVariant(a.users?.avatar_url)}`}
                            variant={getAvatarVariant(a.users?.avatar_url)}
                            colors={["#FF7F50", "#FFA07A", "#FFB300", "#00BFA5", "#5C6BC0"]}
                          />
                        </div>
                      ) : (
                        <span className={a.users?.avatar_url ? "hidden absolute inset-0 items-center justify-center" : ""} style={a.users?.avatar_url ? { display: "none" } : undefined}>
                          {initial(actorName(a))}
                        </span>
                      )
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-bold text-slate-900 dark:text-slate-50">
                        {actorName(a)}
                      </span>
                      <span className="text-[12px] text-slate-500 dark:text-slate-400">
                        {formatTime(a.created_at)} · {timeAgo(a.created_at)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-start gap-2">
                      <span
                        className="mt-0.5 shrink-0 text-slate-400 dark:text-slate-500"
                        title={typeIcon.label}
                      >
                        <span className="material-symbols-outlined text-[14px]" aria-hidden>
                          {typeIcon.icon}
                        </span>
                      </span>
                      <div className="min-w-0 flex-1">
                    {a.action === "stock_adjusted" && a.metadata && typeof a.metadata.productName === "string" ? (
                      <p className="text-[14px] text-slate-700 dark:text-slate-300">
                        {a.metadata.movementType === "entrada" ? "Registró entrada:" : "Ajustó stock:"}{" "}
                        <span className="font-bold text-slate-900 dark:text-slate-100">{String(a.metadata.productName)}</span>
                        {(() => {
                          const sku = typeof a.metadata.sku === "string" ? a.metadata.sku : null;
                          return sku ? (
                            <>
                              {" "}
                              <span className="font-bold text-slate-800 dark:text-slate-200">({sku})</span>
                            </>
                          ) : null;
                        })()}
                        {" — estaba "}
                        <span className="font-bold">{Number(a.metadata.previousQuantity)}</span>
                        {", quedó en "}
                        <span className="font-bold">{Number(a.metadata.newQuantity)}</span>
                        {" "}
                        <span className="font-bold">{Number(a.metadata.delta) >= 0 ? `(+${Number(a.metadata.delta)})` : `(${Number(a.metadata.delta)})`}</span>
                      </p>
                    ) : (a.action === "product_updated" || a.action === "product_created") && a.metadata && typeof a.metadata.name === "string" ? (
                      <p className="text-[14px] text-slate-700 dark:text-slate-300">
                        {a.action === "product_created"
                          ? <>Creó el producto <span className="font-bold text-slate-900 dark:text-slate-100">{String(a.metadata.name)}</span></>
                          : (() => {
                              const name = String(a.metadata.name);
                              const idx = a.summary.indexOf(name);
                              if (idx === -1) return <>{a.summary}</>;
                              return <>{a.summary.slice(0, idx)}<span className="font-bold text-slate-900 dark:text-slate-100">{name}</span>{a.summary.slice(idx + name.length)}</>;
                            })()}
                      </p>
                    ) : a.action === "category_created" && a.metadata && typeof a.metadata.name === "string" ? (
                      <p className="text-[14px] text-slate-700 dark:text-slate-300">
                        Creó la categoría <span className="font-bold text-slate-900 dark:text-slate-100">{String(a.metadata.name)}</span>
                      </p>
                    ) : a.action === "customer_created" && a.metadata && typeof a.metadata.name === "string" ? (
                      <div className="space-y-1">
                        <p className="text-[14px] text-slate-700 dark:text-slate-300">
                          Creó el cliente <span className="font-bold text-slate-900 dark:text-slate-100">{String(a.metadata.name)}</span>
                        </p>
                        {(a.metadata.email || a.metadata.phone || a.metadata.cedula || a.metadata.addressesSummary) ? (
                          <p className="text-[12px] text-slate-500 dark:text-slate-400">
                            {[
                              a.metadata.email && `Correo: ${String(a.metadata.email)}`,
                              a.metadata.phone && `Tel: ${String(a.metadata.phone)}`,
                              a.metadata.cedula && `Cédula: ${String(a.metadata.cedula)}`,
                              a.metadata.addressesSummary && String(a.metadata.addressesSummary),
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        ) : null}
                      </div>
                    ) : a.action === "customer_updated" && a.metadata && typeof a.metadata.name === "string" ? (
                      <div className="space-y-1">
                        <p className="text-[14px] text-slate-700 dark:text-slate-300">
                          Editó el cliente <span className="font-bold text-slate-900 dark:text-slate-100">{String(a.metadata.name)}</span>
                        </p>
                        {Array.isArray(a.metadata.changes) && (a.metadata.changes as { label?: string; from?: string; to?: string }[]).length > 0 ? (
                          <ul className="list-inside list-disc space-y-0.5 text-[12px] text-slate-500 dark:text-slate-400">
                            {(a.metadata.changes as { label?: string; from?: string; to?: string }[]).map((c, i) => (
                              <li key={i}>
                                <span className="font-medium text-slate-600 dark:text-slate-300">{c.label ?? "Campo"}:</span>{" "}
                                <span className="line-through">{c.from || "—"}</span>
                                {" → "}
                                <span className="font-medium text-slate-800 dark:text-slate-200">{c.to || "—"}</span>
                              </li>
                            ))}
                          </ul>
                        ) : a.metadata.changesSummary ? (
                          <p className="text-[12px] text-slate-500 dark:text-slate-400">Cambió: {String(a.metadata.changesSummary)}</p>
                        ) : null}
                      </div>
                    ) : a.action === "sale_created" && a.metadata && typeof a.metadata.invoice_number === "string" ? (
                      <div className="space-y-1">
                        <p className="text-[14px] text-slate-700 dark:text-slate-300">
                          Creó la venta <span className="font-bold text-slate-900 dark:text-slate-100">{String(a.metadata.invoice_number)}</span>
                          {a.metadata.customer_name ? (
                            <span className="text-slate-600 dark:text-slate-400"> — {String(a.metadata.customer_name)}</span>
                          ) : null}
                          {typeof a.metadata.total === "number" ? (
                            <span className="text-[12px] text-slate-500 dark:text-slate-400"> · ${Number(a.metadata.total).toLocaleString("es-CO")}</span>
                          ) : null}
                        </p>
                        {Array.isArray(a.metadata.items) && (a.metadata.items as { name?: string; quantity?: number; reference?: string | null }[]).length > 0 ? (
                          <ul className="space-y-0.5 text-[12px] text-slate-500 dark:text-slate-400">
                            {(a.metadata.items as { name?: string; quantity?: number; reference?: string | null }[]).map((it, idx) => (
                              <li key={idx}>
                                <span className="font-medium text-slate-600 dark:text-slate-300">{it.name ?? "Producto"}</span>
                                {it.reference ? (
                                  <span className="text-slate-500 dark:text-slate-500"> ({it.reference})</span>
                                ) : null}
                                {" · "}
                                <span className="font-medium text-slate-700 dark:text-slate-300">{Number(it.quantity) || 0} und</span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ) : a.action === "sale_status_updated" && a.metadata && typeof a.metadata.invoice_number === "string" ? (
                      <p className="text-[14px] text-slate-700 dark:text-slate-300">
                        Cambió estado: <span className="font-bold text-slate-900 dark:text-slate-100">{String(a.metadata.invoice_number)}</span>
                        {" → "}
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {SALE_STATUS_LABELS[String(a.metadata.newStatus)] ?? String(a.metadata.newStatus)}
                        </span>
                      </p>
                    ) : a.action === "sale_cancelled" && a.metadata && typeof a.metadata.invoice_number === "string" ? (
                      <p className="text-[14px] text-slate-700 dark:text-slate-300">
                        {a.summary.includes(String(a.metadata.invoice_number))
                          ? a.summary.replace(String(a.metadata.invoice_number), "")
                          : a.summary}
                        <span className="font-bold text-slate-900 dark:text-slate-100">{String(a.metadata.invoice_number)}</span>
                        {a.metadata.reason ? (
                          <span className="text-[12px] text-slate-500 dark:text-slate-400"> — {String(a.metadata.reason)}</span>
                        ) : null}
                      </p>
                    ) : (
                      <p className="text-[14px] text-slate-700 dark:text-slate-300">{a.summary}</p>
                    )}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => toggleLike(a.id)}
                        className={`group flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${
                          liked ? "text-ov-pink dark:text-ov-pink-muted" : "text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        <svg
                          className="h-4 w-4"
                          fill={liked ? "currentColor" : "none"}
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                          />
                        </svg>
                        <span>{likesNum}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpandedComments((prev) => ({ ...prev, [a.id]: !prev[a.id] }))}
                        className="group flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                          />
                        </svg>
                        <span>{comments.length} comentario{comments.length !== 1 ? "s" : ""}</span>
                      </button>
                    </div>
                    {expanded && (
                      <div className="mt-3 space-y-2">
                        {comments.map((c) => (
                          <div key={c.id} className="flex gap-2">
                            <div className="relative flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-300 text-[10px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                              {c.users?.avatar_url && !c.users.avatar_url.startsWith("avatar:") ? (
                                <>
                                  <img
                                    src={c.users.avatar_url}
                                    alt=""
                                    className="h-full w-full object-cover"
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                      e.currentTarget.style.display = "none";
                                      const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                      if (fallback) fallback.style.display = "flex";
                                    }}
                                  />
                                  <span className="absolute inset-0 hidden items-center justify-center" style={{ display: "none" }}>
                                    {initial(c.users?.name ?? null)}
                                  </span>
                                </>
                              ) : c.users?.avatar_url?.startsWith("avatar:") || !c.users?.avatar_url ? (
                                <div className="rounded-full">
                                  <Avatar
                                    size={22}
                                    name={`${c.users?.name ?? "usuario"}-${getAvatarVariant(c.users?.avatar_url)}`}
                                    variant={getAvatarVariant(c.users?.avatar_url)}
                                    colors={["#FF7F50", "#FFA07A", "#FFB300", "#00BFA5", "#5C6BC0"]}
                                  />
                                </div>
                              ) : (
                                <span>{initial(c.users?.name ?? null)}</span>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[12px] font-bold text-slate-900 dark:text-slate-50">
                                  {c.users?.name ?? "Usuario"}
                                </span>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                  {timeAgo(c.created_at)}
                                </span>
                              </div>
                              <p className="mt-0.5 text-[13px] text-slate-600 dark:text-slate-400">{c.body}</p>
                            </div>
                          </div>
                        ))}
                        {currentUserId && (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <input
                              type="text"
                              placeholder="Escribe un comentario..."
                              value={commentDraft[a.id] ?? ""}
                              onChange={(e) => setCommentDraft((prev) => ({ ...prev, [a.id]: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  submitComment(a.id);
                                }
                              }}
                              className="max-w-[260px] rounded-lg border border-slate-300 bg-transparent px-3 py-1.5 text-[12px] outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-700 dark:placeholder:text-slate-500"
                            />
                            <button
                              type="button"
                              disabled={submittingComment === a.id || !(commentDraft[a.id] ?? "").trim()}
                              onClick={() => submitComment(a.id)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ov-pink transition-colors hover:bg-slate-100 hover:text-ov-pink-hover disabled:opacity-50 dark:text-ov-pink-muted dark:hover:bg-slate-800 dark:hover:text-ov-pink"
                              aria-label="Publicar comentario"
                            >
                              {submittingComment === a.id ? (
                                "…"
                              ) : (
                                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M16.862 3.487a2.1 2.1 0 112.97 2.97L8.91 17.378 5 18.3l.922-3.91L16.862 3.487z"
                                  />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13v5a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h5" />
                                </svg>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          </div>
          <div ref={loadMoreRef} className="py-3 text-center text-[12px] text-slate-500 dark:text-slate-400">
            {loadingMore ? "Cargando más actividad..." : hasMore ? "Desliza para ver más" : "No hay más actividad por mostrar"}
          </div>
          </>
        )}
      </section>
    </div>
  );
}
