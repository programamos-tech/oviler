"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

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
  users: { name: string } | null;
};

type BranchOption = { id: string; name: string };

type ActivityComment = {
  id: string;
  activity_id: string;
  user_id: string;
  body: string;
  created_at: string;
  users: { name: string } | null;
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

export default function ActivityFeedPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [currentBranch, setCurrentBranch] = useState<BranchOption | null>(null);
  const [commentsByActivity, setCommentsByActivity] = useState<Record<string, ActivityComment[]>>({});
  const [likesCount, setLikesCount] = useState<Record<string, number>>({});
  const [likedByMe, setLikedByMe] = useState<Record<string, boolean>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<string | null>(null);

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
    if (currentBranchId) {
      const { data: branchRow } = await supabase.from("branches").select("id, name").eq("id", currentBranchId).single();
      if (branchRow) setCurrentBranch(branchRow as BranchOption);
    } else {
      setCurrentBranch(null);
    }

    let q = supabase
      .from("activities")
      .select("id, organization_id, branch_id, user_id, actor_type, action, entity_type, entity_id, summary, metadata, created_at, users!user_id(name)")
      .eq("organization_id", userRow.organization_id)
      .order("created_at", { ascending: false })
      .limit(80);

    if (currentBranchId) {
      q = q.or(`branch_id.is.null,branch_id.eq.${currentBranchId}`);
    } else {
      q = q.is("branch_id", null);
    }

    const { data: activitiesData, error: activitiesError } = await q;
    if (activitiesError && typeof console !== "undefined" && console.error) {
      console.error("[Actividades] Error al cargar:", activitiesError.message);
    }

    const list = (activitiesData ?? []) as Activity[];
    setActivities(list);
    const ids = list.map((a) => a.id);
    if (ids.length === 0) {
      setCommentsByActivity({});
      setLikesCount({});
      setLikedByMe({});
      setLoading(false);
      return;
    }

    const [commentsRes, likesRes] = await Promise.all([
      supabase
        .from("activity_comments")
        .select("id, activity_id, user_id, body, created_at, users!user_id(name)")
        .in("activity_id", ids)
        .order("created_at", { ascending: true }),
      supabase.from("activity_likes").select("activity_id, user_id").in("activity_id", ids),
    ]);

    const comments = (commentsRes.data ?? []) as ActivityComment[];
    const byActivity: Record<string, ActivityComment[]> = {};
    for (const c of comments) {
      if (!byActivity[c.activity_id]) byActivity[c.activity_id] = [];
      byActivity[c.activity_id].push(c);
    }
    setCommentsByActivity(byActivity);

    const likes = likesRes.data ?? [];
    const count: Record<string, number> = {};
    const byMe: Record<string, boolean> = {};
    for (const l of likes as { activity_id: string; user_id: string }[]) {
      count[l.activity_id] = (count[l.activity_id] ?? 0) + 1;
      if (l.user_id === user.id) byMe[l.activity_id] = true;
    }
    setLikesCount(count);
    setLikedByMe(byMe);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

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
      .select("id, activity_id, user_id, body, created_at, users!user_id(name)")
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
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-emerald-50">
          Actividades
        </h1>
        <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
          Solo ves las actividades de tu sucursal. Se conservan los últimos 90 días.
        </p>
        {!currentBranch && !loading && (
          <p className="text-[13px] text-amber-600 dark:text-amber-400">
            No tienes sucursal asignada. Asigna una en tu perfil para ver actividades.
          </p>
        )}
      </header>

      <section className="space-y-3">
        {activities.length === 0 ? (
          <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[15px] font-medium text-slate-700 dark:text-slate-300">
              Aún no hay actividades
            </p>
            <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
              Las acciones en esta sucursal (crear/editar productos, ajustar stock, crear categorías) aparecerán aquí.
            </p>
          </div>
        ) : (
          activities.map((a) => {
            const comments = commentsByActivity[a.id] ?? [];
            const likesNum = likesCount[a.id] ?? 0;
            const liked = !!likedByMe[a.id];
            const expanded = expandedComments[a.id] ?? false;
            return (
              <div
                key={a.id}
                className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
              >
                <div className="flex gap-3">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white ${
                      isSystem(a) ? "bg-orange-500" : "bg-slate-900 dark:bg-slate-700"
                    }`}
                  >
                    {isSystem(a) ? (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    ) : (
                      initial(actorName(a))
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
                    {a.action === "stock_adjusted" && a.metadata && typeof a.metadata.productName === "string" ? (
                      <p className="mt-1 text-[14px] text-slate-700 dark:text-slate-300">
                        {a.metadata.movementType === "entrada" ? "Registró entrada:" : "Ajustó stock:"}{" "}
                        <span className="font-bold text-slate-900 dark:text-slate-100">{String(a.metadata.productName)}</span>
                        {a.metadata.sku && (
                          <>
                            {" "}
                            <span className="font-bold text-slate-800 dark:text-slate-200">({String(a.metadata.sku)})</span>
                          </>
                        )}
                        {" — estaba "}
                        <span className="font-bold">{Number(a.metadata.previousQuantity)}</span>
                        {", quedó en "}
                        <span className="font-bold">{Number(a.metadata.newQuantity)}</span>
                        {" "}
                        <span className="font-bold">{Number(a.metadata.delta) >= 0 ? `(+${Number(a.metadata.delta)})` : `(${Number(a.metadata.delta)})`}</span>
                      </p>
                    ) : (a.action === "product_updated" || a.action === "product_created") && a.metadata && typeof a.metadata.name === "string" ? (
                      <p className="mt-1 text-[14px] text-slate-700 dark:text-slate-300">
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
                      <p className="mt-1 text-[14px] text-slate-700 dark:text-slate-300">
                        Creó la categoría <span className="font-bold text-slate-900 dark:text-slate-100">{String(a.metadata.name)}</span>
                      </p>
                    ) : (
                      <p className="mt-1 text-[14px] text-slate-700 dark:text-slate-300">{a.summary}</p>
                    )}
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
                            d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
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
                      <div className="mt-3 space-y-2 border-t border-slate-200 pt-3 dark:border-slate-800">
                        {comments.map((c) => (
                          <div key={c.id} className="flex gap-2">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-300 text-[10px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                              {initial(c.users?.name ?? null)}
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
                              className="max-w-[220px] rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[12px] outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-700 dark:bg-slate-800 dark:placeholder:text-slate-500"
                            />
                            <button
                              type="button"
                              disabled={submittingComment === a.id || !(commentDraft[a.id] ?? "").trim()}
                              onClick={() => submitComment(a.id)}
                              className="rounded-lg bg-ov-pink px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-50"
                            >
                              {submittingComment === a.id ? "…" : "Enviar"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
