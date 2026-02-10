export default function ActivityFeedPage() {
  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-emerald-50">
          Actividades
        </h1>
        <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
          Un muro tipo red social donde ves lo que está pasando en tu negocio:
          ventas, pedidos, ingresos de mercancía y cierres de caja.
        </p>
      </header>

      {/* Feed estilo red social */}
      <section className="space-y-3">
        {/* Actividad 1 - Venta realizada */}
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <div className="flex gap-3">
            {/* Avatar del usuario */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[12px] font-bold text-white dark:bg-slate-700">
              A
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-slate-900 dark:text-slate-50">
                      @ana
                    </span>
                    <span className="text-[12px] text-slate-500 dark:text-slate-400">
                      hace 5 minutos
                    </span>
                  </div>
                  <p className="mt-1 text-[14px] text-slate-700 dark:text-slate-300">
                    Acabo de realizar una venta física por{" "}
                    <span className="font-bold">$18.700</span> a{" "}
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      @carlos_gomez
                    </span>
                  </p>
                  <div className="mt-2 flex items-center gap-4">
                    <button className="group flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
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
                          d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                        />
                      </svg>
                      <span>3</span>
                    </button>
                    <button className="group flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
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
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                      <span>2 comentarios</span>
                    </button>
                  </div>
                  {/* Comentarios */}
                  <div className="mt-3 space-y-2 border-t border-slate-200 pt-3 dark:border-slate-800">
                    <div className="flex gap-2">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-300 text-[10px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                        L
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[12px] font-bold text-slate-900 dark:text-slate-50">
                            @luis
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            hace 2 minutos
                          </span>
                        </div>
                        <p className="mt-0.5 text-[13px] text-slate-600 dark:text-slate-400">
                          ¡Excelente!{" "}
                          <span className="font-bold text-blue-600 dark:text-blue-400">
                            @ana
                          </span>{" "}
                          sigue así 💪
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-300 text-[10px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                        C
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[12px] font-bold text-slate-900 dark:text-slate-50">
                            @carlos_gomez
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            hace 1 minuto
                          </span>
                        </div>
                        <p className="mt-0.5 text-[13px] text-slate-600 dark:text-slate-400">
                          Gracias{" "}
                          <span className="font-bold text-blue-600 dark:text-blue-400">
                            @ana
                          </span>{" "}
                          por el servicio rápido!
                        </p>
                      </div>
                    </div>
                    {/* Input para comentar */}
                    <div className="mt-2 flex gap-2">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-300 text-[10px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                        U
                      </div>
                      <input
                        type="text"
                        placeholder="Escribe un comentario..."
                        className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[12px] outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-700 dark:bg-slate-800 dark:placeholder:text-slate-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actividad 2 - Pedido creado */}
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white">
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-slate-900 dark:text-slate-50">
                      Sistema
                    </span>
                    <span className="text-[12px] text-slate-500 dark:text-slate-400">
                      hace 15 minutos
                    </span>
                  </div>
                  <p className="mt-1 text-[14px] text-slate-700 dark:text-slate-300">
                    Pedido <span className="font-bold">#1023</span> creado automáticamente para{" "}
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      @maria_lopez
                    </span>
                    . Total: <span className="font-bold">$32.500</span>
                  </p>
                  <div className="mt-2 flex items-center gap-4">
                    <button className="group flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
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
                          d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                        />
                      </svg>
                      <span>1</span>
                    </button>
                    <button className="group flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
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
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                      <span>Comentar</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actividad 3 - Entrada de mercancía */}
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[12px] font-bold text-white dark:bg-slate-700">
              L
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-slate-900 dark:text-slate-50">
                      @luis
                    </span>
                    <span className="text-[12px] text-slate-500 dark:text-slate-400">
                      hace 2 horas
                    </span>
                  </div>
                  <p className="mt-1 text-[14px] text-slate-700 dark:text-slate-300">
                    Registré entrada de{" "}
                    <span className="font-bold">+20 unidades</span> de{" "}
                    <span className="font-bold">Aceite 1L</span>.{" "}
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      @ana
                    </span>{" "}
                    revisa el inventario cuando puedas
                  </p>
                  <div className="mt-2 flex items-center gap-4">
                    <button className="group flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
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
                          d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                        />
                      </svg>
                      <span>5</span>
                    </button>
                    <button className="group flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
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
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                      <span>1 comentario</span>
                    </button>
                  </div>
                  {/* Comentario */}
                  <div className="mt-3 space-y-2 border-t border-slate-200 pt-3 dark:border-slate-800">
                    <div className="flex gap-2">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-300 text-[10px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                        A
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[12px] font-bold text-slate-900 dark:text-slate-50">
                            @ana
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            hace 1 hora
                          </span>
                        </div>
                        <p className="mt-0.5 text-[13px] text-slate-600 dark:text-slate-400">
                          Perfecto{" "}
                          <span className="font-bold text-blue-600 dark:text-blue-400">
                            @luis
                          </span>
                          , ya revisé y está todo correcto ✅
                        </p>
                      </div>
                    </div>
                    {/* Input para comentar */}
                    <div className="mt-2 flex gap-2">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-300 text-[10px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                        U
                      </div>
                      <input
                        type="text"
                        placeholder="Escribe un comentario..."
                        className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[12px] outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-700 dark:bg-slate-800 dark:placeholder:text-slate-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actividad 4 - Cliente nuevo */}
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500 text-white">
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
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-slate-900 dark:text-slate-50">
                      Sistema
                    </span>
                    <span className="text-[12px] text-slate-500 dark:text-slate-400">
                      hace 3 horas
                    </span>
                  </div>
                  <p className="mt-1 text-[14px] text-slate-700 dark:text-slate-300">
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      @juan_perez
                    </span>{" "}
                    fue registrado como nuevo cliente durante una venta realizada por{" "}
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      @luis
                    </span>
                  </p>
                  <div className="mt-2 flex items-center gap-4">
                    <button className="group flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
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
                          d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                        />
                      </svg>
                      <span>2</span>
                    </button>
                    <button className="group flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
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
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                      <span>Comentar</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actividad 5 - Pedido entregado */}
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[12px] font-bold text-white dark:bg-slate-700">
              L
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-slate-900 dark:text-slate-50">
                      @luis
                    </span>
                    <span className="text-[12px] text-slate-500 dark:text-slate-400">
                      hace 4 horas
                    </span>
                  </div>
                  <p className="mt-1 text-[14px] text-slate-700 dark:text-slate-300">
                    Pedido <span className="font-bold">#1022</span> entregado a{" "}
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      @ana_martinez
                    </span>
                    . Todo correcto! 🎉
                  </p>
                  <div className="mt-2 flex items-center gap-4">
                    <button className="group flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
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
                          d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                        />
                      </svg>
                      <span>8</span>
                    </button>
                    <button className="group flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
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
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                      <span>3 comentarios</span>
                    </button>
                  </div>
                  {/* Comentarios */}
                  <div className="mt-3 space-y-2 border-t border-slate-200 pt-3 dark:border-slate-800">
                    <div className="flex gap-2">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-300 text-[10px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                        A
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[12px] font-bold text-slate-900 dark:text-slate-50">
                            @ana
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            hace 3 horas
                          </span>
                        </div>
                        <p className="mt-0.5 text-[13px] text-slate-600 dark:text-slate-400">
                          Excelente trabajo{" "}
                          <span className="font-bold text-blue-600 dark:text-blue-400">
                            @luis
                          </span>
                          !
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-300 text-[10px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                        M
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[12px] font-bold text-slate-900 dark:text-slate-50">
                            @maria_lopez
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            hace 2 horas
                          </span>
                        </div>
                        <p className="mt-0.5 text-[13px] text-slate-600 dark:text-slate-400">
                          Muy rápido el servicio{" "}
                          <span className="font-bold text-blue-600 dark:text-blue-400">
                            @luis
                          </span>
                          , gracias!
                        </p>
                      </div>
                    </div>
                    {/* Input para comentar */}
                    <div className="mt-2 flex gap-2">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-300 text-[10px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                        U
                      </div>
                      <input
                        type="text"
                        placeholder="Escribe un comentario..."
                        className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[12px] outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-700 dark:bg-slate-800 dark:placeholder:text-slate-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actividad 6 - Stock ajustado */}
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[12px] font-bold text-white dark:bg-slate-700">
              A
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-slate-900 dark:text-slate-50">
                      @ana
                    </span>
                    <span className="text-[12px] text-slate-500 dark:text-slate-400">
                      hace 5 horas
                    </span>
                  </div>
                  <p className="mt-1 text-[14px] text-slate-700 dark:text-slate-300">
                    Ajusté el stock de{" "}
                    <span className="font-bold">Coca-Cola 1.5L</span> a{" "}
                    <span className="font-bold">8 unidades</span>.{" "}
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      @luis
                    </span>{" "}
                    necesitamos reabastecer pronto
                  </p>
                  <div className="mt-2 flex items-center gap-4">
                    <button className="group flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
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
                          d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                        />
                      </svg>
                      <span>4</span>
                    </button>
                    <button className="group flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
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
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                      <span>Comentar</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actividad 7 - Venta con domicilio */}
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[12px] font-bold text-white dark:bg-slate-700">
              L
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-slate-900 dark:text-slate-50">
                      @luis
                    </span>
                    <span className="text-[12px] text-slate-500 dark:text-slate-400">
                      hace 6 horas
                    </span>
                  </div>
                  <p className="mt-1 text-[14px] text-slate-700 dark:text-slate-300">
                    Realicé una venta a domicilio por{" "}
                    <span className="font-bold">$46.000</span> a{" "}
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      @juan_perez
                    </span>
                    . Pedido ya en camino 🚚
                  </p>
                  <div className="mt-2 flex items-center gap-4">
                    <button className="group flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
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
                          d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                        />
                      </svg>
                      <span>6</span>
                    </button>
                    <button className="group flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
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
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                      <span>Comentar</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
