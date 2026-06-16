import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  toolbarExtra?: ReactNode;
};

export function LandingMockupFrame({ children, className = "", toolbarExtra }: Props) {
  return (
    <div className={`relative mx-auto w-full ${className}`}>
      <div className="berea-landing-mockup-shell">
        <div className="berea-landing-mockup-toolbar">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[rgba(247,242,238,0.2)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[rgba(247,242,238,0.2)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[rgba(247,242,238,0.2)]" />
          </div>
          {toolbarExtra ? (
            <div className="min-w-0 flex-1">{toolbarExtra}</div>
          ) : (
            <div
              className="mx-auto hidden h-6 max-w-[55%] flex-1 rounded-md bg-[rgba(247,242,238,0.08)] sm:block"
              aria-hidden
            />
          )}
        </div>
        <div className="p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
}
