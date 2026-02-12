"use client";

import Link from "next/link";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

const SEPARATOR = (
  <span className="shrink-0 text-slate-400 dark:text-slate-500" aria-hidden>
    /
  </span>
);

export default function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Navegación" className="flex flex-wrap items-center gap-1.5 text-[13px]">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && SEPARATOR}
            {item.href != null && !isLast ? (
              <Link
                href={item.href}
                className="font-medium text-slate-600 hover:text-ov-pink dark:text-slate-400 dark:hover:text-ov-pink"
              >
                {item.label}
              </Link>
            ) : (
              <span className="font-medium text-slate-800 dark:text-slate-200" aria-current={isLast ? "page" : undefined}>
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
