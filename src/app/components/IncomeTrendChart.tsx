"use client";

import { useEffect, useId, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";

export type IncomeTrendDay = { day: string; sales: number };

function formatCompactCurrency(value: number): string {
  if (value === 0) return "$0";
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
  return `$${Math.round(value).toLocaleString("es-CO")}`;
}

function useIsDarkClass(): boolean {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const el = document.documentElement;
    const sync = () => setDark(el.classList.contains("dark"));
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);
  return dark;
}

export function IncomeTrendChart({
  days,
  hideSensitiveInfo,
}: {
  days: IncomeTrendDay[];
  hideSensitiveInfo: boolean;
}) {
  const isDark = useIsDarkClass();
  const gradId = useId().replace(/:/g, "");
  const chartData = useMemo(
    () => days.map((d) => ({ fecha: d.day, ingresos: d.sales })),
    [days]
  );
  const total = useMemo(() => days.reduce((a, d) => a + d.sales, 0), [days]);
  const avg = days.length > 0 ? total / days.length : 0;
  const dataMax = useMemo(
    () => (days.length > 0 ? Math.max(...days.map((d) => d.sales), 0) : 0),
    [days]
  );
  const yMax = useMemo(() => Math.max(dataMax, avg, 1) * 1.08, [dataMax, avg]);

  const gridStroke = isDark ? "rgba(148, 163, 184, 0.18)" : "rgba(148, 163, 184, 0.35)";
  const axisTick = isDark ? "#94a3b8" : "#64748b";
  const refStroke = isDark ? "rgba(161, 161, 170, 0.85)" : "rgba(100, 116, 139, 0.9)";
  const tooltipBg = isDark ? "rgba(15, 23, 42, 0.96)" : "rgba(255, 255, 255, 0.98)";
  const tooltipBorder = isDark ? "rgba(51, 65, 85, 0.9)" : "rgba(226, 232, 240, 1)";

  return (
    <div className="h-full w-full min-h-[200px] min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 14, left: 2, bottom: 2 }}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--shell-sidebar, #0f172a)" stopOpacity={isDark ? 0.35 : 0.22} />
              <stop offset="100%" stopColor="var(--shell-sidebar, #0f172a)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" stroke={gridStroke} vertical={false} />
          <XAxis
            dataKey="fecha"
            tick={{ fill: axisTick, fontSize: 10, fontWeight: 500 }}
            tickLine={false}
            axisLine={{ stroke: gridStroke }}
            interval={0}
            height={28}
          />
          <YAxis
            tick={{ fill: axisTick, fontSize: 10, fontWeight: 500 }}
            tickLine={false}
            axisLine={{ stroke: gridStroke }}
            width={48}
            domain={[0, yMax]}
            tickFormatter={(v) => (hideSensitiveInfo ? "***" : formatCompactCurrency(Number(v)))}
          />
          {!hideSensitiveInfo && avg > 0 ? (
            <ReferenceLine
              y={avg}
              stroke={refStroke}
              strokeDasharray="5 5"
              strokeWidth={1.5}
              label={{
                value: `Promedio ${formatCompactCurrency(Math.round(avg))}`,
                position: "insideTopRight",
                fill: axisTick,
                fontSize: 10,
                fontWeight: 600,
              }}
            />
          ) : null}
          <Tooltip
            formatter={(value: number | string) =>
              hideSensitiveInfo ? ["***", "Ingresos"] : [`$${Number(value).toLocaleString("es-CO")}`, "Ingresos"]
            }
            labelFormatter={(label) => String(label)}
            contentStyle={{
              background: tooltipBg,
              border: `1px solid ${tooltipBorder}`,
              borderRadius: 10,
              fontSize: 12,
              color: isDark ? "#f1f5f9" : "#0f172a",
            }}
            labelStyle={{ fontWeight: 700, marginBottom: 2 }}
          />
          <Area
            type="linear"
            dataKey="ingresos"
            name="Ingresos"
            stroke="var(--shell-sidebar, #0f172a)"
            strokeWidth={2.25}
            fill={`url(#${gradId})`}
            fillOpacity={1}
            dot={{
              r: 3.5,
              strokeWidth: 2,
              stroke: "var(--shell-sidebar, #0f172a)",
              fill: isDark ? "#0f172a" : "#ffffff",
            }}
            activeDot={{ r: 5, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
