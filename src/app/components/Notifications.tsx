"use client";

import { useState, useRef, useEffect } from "react";

interface Notification {
  id: string;
  type: "approval" | "request" | "warning" | "info";
  title: string;
  message: string;
  time: string;
  read: boolean;
  link?: string;
}

const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "approval",
    title: "Garantía aprobada",
    message: "La garantía #GAR-002 de Carlos Gómez ha sido aprobada",
    time: "Hace 5 minutos",
    read: false,
    link: "/garantias",
  },
  {
    id: "2",
    type: "request",
    title: "Nueva solicitud de garantía",
    message: "María López ha solicitado una garantía para Aceite 1L",
    time: "Hace 1 hora",
    read: false,
    link: "/garantias",
  },
  {
    id: "3",
    type: "warning",
    title: "Stock bajo",
    message: "El producto Coca-Cola 1.5L tiene menos de 10 unidades",
    time: "Hace 2 horas",
    read: false,
    link: "/inventario",
  },
  {
    id: "4",
    type: "approval",
    title: "Venta anulada",
    message: "La venta #VTA-1023 ha sido anulada por Juan Pérez",
    time: "Hace 3 horas",
    read: true,
    link: "/ventas",
  },
  {
    id: "5",
    type: "info",
    title: "Nuevo cliente registrado",
    message: "Ana Martínez se ha registrado como nuevo cliente",
    time: "Ayer",
    read: true,
    link: "/clientes",
  },
  {
    id: "6",
    type: "request",
    title: "Solicitud de ajuste de stock",
    message: "Se requiere aprobación para ajustar stock de Pan francés",
    time: "Ayer",
    read: true,
    link: "/inventario",
  },
];

export default function Notifications() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(mockNotifications);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

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
        <div className="absolute right-0 top-12 z-50 w-80 rounded-lg border-2 border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
            <h3 className="text-[15px] font-bold text-slate-900 dark:text-slate-50">
              Notificaciones
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[12px] font-medium text-ov-pink hover:text-ov-pink-hover dark:text-ov-pink-muted"
              >
                Marcar todas como leídas
              </button>
            )}
          </div>

          {/* Notifications list */}
          <div className="max-h-96 overflow-y-auto">
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
                    }}
                    className={`w-full px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${
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
                        <p className="mt-1 text-[12px] font-medium text-slate-600 dark:text-slate-400">
                          {notification.message}
                        </p>
                        <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-500">
                          {notification.time}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-slate-200 p-3 dark:border-slate-800">
              <button className="w-full rounded-lg bg-slate-100 px-4 py-2 text-[12px] font-bold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                Ver todas las notificaciones
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
