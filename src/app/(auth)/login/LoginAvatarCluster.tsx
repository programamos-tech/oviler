"use client";

import WorkspaceCharacterAvatar from "@/app/components/WorkspaceCharacterAvatar";

/** Seeds distintos → personajes distintos (mismo criterio que clientes/créditos en la app). */
const SATELLITE_SEEDS = [
  "oviler-login-sat-ventas",
  "oviler-login-sat-inventario",
  "oviler-login-sat-clientes",
  "oviler-login-sat-creditos",
  "oviler-login-sat-equipo",
  "oviler-login-sat-sucursal",
];

const CENTER_SEED = "bereacomercios-hub";

export function LoginAvatarCluster({ showCaption = true }: { showCaption?: boolean }) {
  const R = 108;
  const size = 52;
  const centerPx = 112;

  return (
    <div className="flex w-full max-w-[400px] flex-col items-center">
      <div
        className="relative rounded-[2rem] bg-zinc-800/60 p-10 shadow-inner ring-1 ring-white/5 backdrop-blur-sm"
        style={{ minHeight: 320, minWidth: 280 }}
      >
        <div
          className="relative mx-auto"
          style={{ width: R * 2 + size, height: R * 2 + size, maxWidth: "100%" }}
        >
          {/* Avatar central (misma lib que el resto del panel) */}
          <div
            className="absolute z-20 overflow-hidden rounded-full shadow-lg ring-4 ring-zinc-700/80"
            style={{
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: centerPx,
              height: centerPx,
            }}
            aria-hidden
          >
            <WorkspaceCharacterAvatar
              seed={CENTER_SEED}
              size={centerPx}
              className="h-full w-full object-cover !bg-transparent dark:!bg-transparent"
            />
          </div>

          {SATELLITE_SEEDS.map((seed, i) => {
            const rad = ((i * 60 - 90) * Math.PI) / 180;
            const x = Math.cos(rad) * R;
            const y = Math.sin(rad) * R;
            return (
              <div
                key={seed}
                className="absolute z-10 overflow-hidden rounded-full shadow-md ring-2 ring-white/15"
                style={{
                  width: size,
                  height: size,
                  left: `calc(50% + ${x}px - ${size / 2}px)`,
                  top: `calc(50% + ${y}px - ${size / 2}px)`,
                }}
                aria-hidden
              >
                <WorkspaceCharacterAvatar
                  seed={seed}
                  size={size}
                  className="h-full w-full object-cover !bg-transparent dark:!bg-transparent"
                />
              </div>
            );
          })}
        </div>
      </div>
      {showCaption ? (
        <>
          <h2 className="mt-10 max-w-sm text-center text-[1.35rem] font-bold leading-snug tracking-tight text-white sm:text-2xl">
            Tu equipo y tu negocio, organizados
          </h2>
          <p className="mt-3 max-w-sm text-center text-[15px] leading-relaxed text-zinc-400">
            Inventario, ventas y clientes en un solo lugar. Menos caos, más claridad en el día a día.
          </p>
        </>
      ) : null}
    </div>
  );
}
