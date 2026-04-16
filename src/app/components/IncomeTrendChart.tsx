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

/** Fewer x-axis labels on narrow viewports so dates stay readable. */
function useChartLayout(): {
  /** recharts XAxis interval: 0 = all ticks, n = show every (n+1)th */
  xInterval: number;
  xTickFontSize: number;
  chartBottom: number;
  chartLeft: number;
  yAxisWidth: number;
  dotRadius: number;
} {
  const [layout, setLayout] = useState<"sm" | "md" | "lg">("sm");
  useEffect(() => {
    const mqMd = window.matchMedia("(min-width: 640px)");
    const mqLg = window.matchMedia("(min-width: 1024px)");
    const sync = () => {
      if (mqLg.matches) setLayout("lg");
      else if (mqMd.matches) setLayout("md");
      else setLayout("sm");
    };
    sync();
    mqMd.addEventListener("change", sync);
    mqLg.addEventListener("change", sync);
    return () => {
      mqMd.removeEventListener("change", sync);
      mqLg.removeEventListener("change", sync);
    };
  }, []);

  if (layout === "sm") {
    return {
      xInterval: 2,
      xTickFontSize: 9,
      chartBottom: 6,
      chartLeft: 0,
      yAxisWidth: 38,
      dotRadius: 3,
    };
  }
  if (layout === "md") {
    return {
      xInterval: 1,
      xTickFontSize: 10,
      chartBottom: 4,
      chartLeft: 2,
      yAxisWidth: 44,
      dotRadius: 3.5,
    };
  }
  return {
    xInterval: 0,
    xTickFontSize: 10,
    chartBottom: 2,
    chartLeft: 2,
    yAxisWidth: 48,
    dotRadius: 3.5,
  };
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
  const layout = useChartLayout();
  const total = useMemo(() => days.reduce((a, d) => a + d.sales, 0), [days]);
  const avg = days.length > 0 ? total / days.length : 0;
  const dataMax = useMemo(
    () => (days.length > 0 ? Math.max(...days.map((d) => d.sales), 0) : 0),
    [days]
  );
  const rawMax = Math.max(dataMax, avg, 0);
  /** All-zero series: single $0 tick. Otherwise avoid [0,~1] domains that duplicate $0/$1 after rounding. */
  const { yDomain, yTicks } = useMemo(() => {
    if (rawMax === 0) return { yDomain: [0, 1] as [number, number], yTicks: [0] as number[] };
    let top = rawMax * 1.08;
    if (top < 2) top = Math.max(2, Math.ceil(rawMax * 2));
    return { yDomain: [0, top] as [number, number], yTicks: undefined as number[] | undefined };
  }, [rawMax]);

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
          margin={{
            top: 12,
            right: layout.xInterval >= 2 ? 10 : 14,
            left: layout.chartLeft,
            bottom: layout.chartBottom + 22,
          }}
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
            tick={{
              fill: axisTick,
              fontSize: layout.xTickFontSize,
              fontWeight: 500,
            }}
            tickLine={false}
            axisLine={{ stroke: gridStroke }}
            interval={layout.xInterval}
            minTickGap={layout.xInterval >= 2 ? 28 : 12}
            tickMargin={6}
            height={layout.xInterval >= 2 ? 30 : 26}
          />
          <YAxis
            tick={{ fill: axisTick, fontSize: layout.xTickFontSize, fontWeight: 500 }}
            tickLine={false}
            axisLine={{ stroke: gridStroke }}
            width={layout.yAxisWidth}
            domain={yDomain}
            ticks={yTicks}
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
              r: layout.dotRadius,
              strokeWidth: 1.75,
              stroke: "var(--shell-sidebar, #0f172a)",
              fill: isDark ? "#0f172a" : "#ffffff",
            }}
            activeDot={{ r: layout.dotRadius + 1.75, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
