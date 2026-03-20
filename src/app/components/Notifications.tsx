"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Notification {
  id: string;
  type: "approval" | "request" | "warning" | "info" | "like" | "comment";
  title: string;
  message: string;
  time: string;
  read: boolean;
  link?: string;
  activityId?: string;
  commentId?: string;
}

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const sec = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (sec < 60) return "Hace un momento";
  const min = Math.floor(sec / 60);
  if (min < 60) return `Hace ${min} ${min === 1 ? "minuto" : "minutos"}`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Hace ${h} ${h === 1 ? "hora" : "horas"}`;
  const day = Math.floor(h / 24);
  if (day < 30) return `Hace ${day} ${day === 1 ? "día" : "días"}`;
  const month = Math.floor(day / 30);
  return `Hace ${month} ${month === 1 ? "mes" : "meses"}`;
}

export default function Notifications() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const loadNotifications = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) return;

    const { data: myActivitiesRows } = await supabase
      .from("activities")
      .select("id, summary")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200);
    const myActivities = (myActivitiesRows ?? []) as Array<{ id: string; summary: string }>;
    const myActivityIds = myActivities.map((a) => a.id);
    const activitySummaryById = new Map(myActivities.map((a) => [a.id, a.summary]));

    const { data: myCommentsRows } = await supabase
      .from("activity_comments")
      .select("id, activity_id, body")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(300);
    const myComments = (myCommentsRows ?? []) as Array<{ id: string; activity_id: string; body: string }>;
    const myCommentIds = myComments.map((c) => c.id);
    const myCommentBodyById = new Map(myComments.map((c) => [c.id, c.body]));

    const [commentsOnMyPostsRes, likesOnMyPostsRes, likesOnMyCommentsRes] = await Promise.all([
      myActivityIds.length
        ? supabase
            .from("activity_comments")
            .select("id, activity_id, user_id, body, created_at")
            .in("activity_id", myActivityIds)
            .neq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(120)
        : Promise.resolve({ data: [] as unknown[] }),
      myActivityIds.length
        ? supabase
            .from("activity_likes")
            .select("activity_id, user_id, created_at")
            .in("activity_id", myActivityIds)
            .neq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(120)
        : Promise.resolve({ data: [] as unknown[] }),
      myCommentIds.length
        ? supabase
            .from("activity_comment_likes")
            .select("comment_id, user_id, created_at")
            .in("comment_id", myCommentIds)
            .neq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(120)
        : Promise.resolve({ data: [] as unknown[] }),
    ]);

    const commentsOnMyPosts = (commentsOnMyPostsRes.data ?? []) as Array<{
      id: string;
      activity_id: string;
      user_id: string;
      body: string;
      created_at: string;
    }>;
    const likesOnMyPosts = (likesOnMyPostsRes.data ?? []) as Array<{
      activity_id: string;
      user_id: string;
      created_at: string;
    }>;
    const likesOnMyComments = (likesOnMyCommentsRes.data ?? []) as Array<{
      comment_id: string;
      user_id: string;
      created_at: string;
    }>;

    const actorIds = Array.from(
      new Set(
        [
          ...commentsOnMyPosts.map((c) => c.user_id),
          ...likesOnMyPosts.map((l) => l.user_id),
          ...likesOnMyComments.map((l) => l.user_id),
        ].filter(Boolean)
      )
    );

    let usersById = new Map<string, string>();
    if (actorIds.length > 0) {
      const { data: actorUsers } = await supabase.from("users").select("id, name").in("id", actorIds);
      usersById = new Map(((actorUsers ?? []) as Array<{ id: string; name: string }>).map((u) => [u.id, u.name]));
    }

    const toShort = (text: string | undefined, max = 52) => {
      const t = String(text ?? "").trim();
      if (!t) return "tu publicación";
      return t.length > max ? `${t.slice(0, max)}...` : t;
    };

    const mapped: Array<Notification & { createdAt: string }> = [
      ...commentsOnMyPosts.map((c) => ({
        id: `comment:${c.id}`,
        type: "comment" as const,
        title: "Nuevo comentario en tu post",
        message: `${usersById.get(c.user_id) ?? "Alguien"} comentó: "${toShort(c.body, 44)}"`,
        time: timeAgo(c.created_at),
        read: false,
        link: `/actividades?activity=${c.activity_id}&comment=${c.id}`,
        activityId: c.activity_id,
        commentId: c.id,
        createdAt: c.created_at,
      })),
      ...likesOnMyPosts.map((l) => ({
        id: `like-post:${l.activity_id}:${l.user_id}:${l.created_at}`,
        type: "like" as const,
        title: "Le dieron like a tu post",
        message: `${usersById.get(l.user_id) ?? "Alguien"} reaccionó a: "${toShort(activitySummaryById.get(l.activity_id), 44)}"`,
        time: timeAgo(l.created_at),
        read: false,
        link: `/actividades?activity=${l.activity_id}`,
        activityId: l.activity_id,
        createdAt: l.created_at,
      })),
      ...likesOnMyComments.map((l) => ({
        id: `like-comment:${l.comment_id}:${l.user_id}:${l.created_at}`,
        type: "like" as const,
        title: "Le dieron like a tu comentario",
        message: `${usersById.get(l.user_id) ?? "Alguien"} reaccionó a tu comentario: "${toShort(myCommentBodyById.get(l.comment_id), 44)}"`,
        time: timeAgo(l.created_at),
        read: false,
        link: `/actividades?activity=${myComments.find((c) => c.id === l.comment_id)?.activity_id ?? ""}&comment=${l.comment_id}`,
        activityId: myComments.find((c) => c.id === l.comment_id)?.activity_id,
        commentId: l.comment_id,
        createdAt: l.created_at,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 40);

    setNotifications(mapped.map(({ createdAt, ...n }) => n));
  }, [supabase]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const markAsRead = (id: string) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "approval":
        return (
          <svg
            className="h-5 w-5 text-emerald-600 dark:text-emerald-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case "request":
        return (
          <svg
            className="h-5 w-5 text-blue-600 dark:text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        );
      case "warning":
        return (
          <svg
            className="h-5 w-5 text-amber-600 dark:text-amber-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        );
      case "info":
        return (
          <svg
            className="h-5 w-5 text-slate-600 dark:text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case "like":
        return (
          <svg
            className="h-5 w-5 text-ov-pink dark:text-ov-pink-muted"
            fill="none"
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
        );
      case "comment":
        return (
          <svg
            className="h-5 w-5 text-blue-600 dark:text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h8M8 14h5m-1 8l-4-3H5a2 2 0 01-2-2V7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-3l-4 3z"
            />
          </svg>
        );
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-900 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
        aria-label="Notificaciones"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ov-pink text-[10px] font-bold text-white shadow-lg">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed left-2 right-2 top-16 z-50 rounded-lg border-2 border-slate-200 bg-white shadow-2xl sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-80 dark:border-slate-800 dark:bg-slate-900">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
            <h3 className="text-[15px] font-bold text-slate-900 dark:text-slate-50">
              Notificaciones
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="whitespace-nowrap text-[11px] font-medium text-ov-pink hover:text-ov-pink-hover dark:text-ov-pink-muted"
              >
                Marcar todas como leídas
              </button>
            )}
          </div>

          {/* Notifications list */}
          <div className="max-h-[70vh] overflow-y-auto [scrollbar-width:none] sm:max-h-[30rem] [&::-webkit-scrollbar]:hidden">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                <p className="mt-2 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                  No hay notificaciones
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => {
                      markAsRead(notification.id);
                      setIsOpen(false);
                      if (notification.link) router.push(notification.link);
                    }}
                    className={`w-full px-4 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${
                      !notification.read ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="mt-0.5 shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`text-[13px] font-bold ${
                              !notification.read
                                ? "text-slate-900 dark:text-slate-50"
                                : "text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-ov-pink" />
                          )}
                        </div>
                          <p className="mt-0.5 text-[12px] font-medium text-slate-600 dark:text-slate-400">
                          {notification.message}
                        </p>
                        <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-500">
                          {notification.time}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
