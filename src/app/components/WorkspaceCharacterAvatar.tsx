"use client";

import { useMemo } from "react";
import NiceAvatar, { genConfig } from "react-nice-avatar";

export type WorkspaceCharacterAvatarProps = {
  /** Valor estable (email, id…); el mismo seed siempre genera el mismo personaje. */
  seed: string;
  /** Lado del cuadrado en px. */
  size: number;
  className?: string;
  title?: string;
};

/**
 * Avatares ilustrados (react-nice-avatar / Micah), deterministas por seed.
 */
export default function WorkspaceCharacterAvatar({ seed, size, className, title }: WorkspaceCharacterAvatarProps) {
  const normalizedSeed = (seed || "usuario").trim() || "usuario";
  const config = useMemo(() => genConfig(normalizedSeed), [normalizedSeed]);
  const hasCustomClass = Boolean(className?.trim());

  return (
    <span
      title={title}
      className={`inline-flex overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800/80 ${hasCustomClass ? (className ?? "") : ""}`.trim()}
      style={hasCustomClass ? undefined : { width: size, height: size }}
      aria-hidden
    >
      <NiceAvatar
        {...config}
        shape="circle"
        className="block h-full w-full [&>div]:!h-full [&>div]:!w-full"
        style={hasCustomClass ? { width: "100%", height: "100%" } : { width: size, height: size }}
      />
    </span>
  );
}
