"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type IncomeTrendDay = {
  day: string;
  sales: number;
  previousSales?: number;
};

const LABEL_CURRENT = "Este periodo";
const LABEL_PREVIOUS = "Periodo anterior";

const COLOR_CURRENT = "#6b4f3b";
const COLOR_PREVIOUS = "#d2c4b5";

const Y_AXIS_WIDTH = 44;

function formatYAxisTick(value: number): string {
  if (value === 0) return "$0";
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return Number.isInteger(m) ? `$${m}M` : `$${m.toFixed(1)}M`;
  }
  if (value >= 1000) return `$${Math.round(value / 1000)}k`;
  return `$${Math.round(value).toLocaleString("es-CO")}`;
}

function computeYScale(max: number): { domain: [number, number]; ticks: number[] } {
  if (max <= 0) {
    return {
      domain: [0, 8_000_000],
      ticks: [0, 2_000_000, 4_000_000, 6_000_000, 8_000_000],
    };
  }
  const padded = max * 1.1;
  const stepCandidates = [100_000, 250_000, 500_000, 1_000_000, 2_000_000, 2_500_000, 5_000_000];
  let step = 2_000_000;
  for (const candidate of stepCandidates) {
    const divisions = Math.ceil(padded / candidate);
    if (divisions >= 2 && divisions <= 5) {
      step = candidate;
      break;
    }
  }
  const top = Math.max(step, Math.ceil(padded / step) * step);
  const ticks: number[] = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);
  return { domain: [0, top], ticks };
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
  comparePreviousWeek = true,
}: {
  days: IncomeTrendDay[];
  hideSensitiveInfo: boolean;
  comparePreviousWeek?: boolean;
}) {
  const isDark = useIsDarkClass();

  const chartData = useMemo(
    () =>
      days.map((d) => ({
        fecha: d.day,
        actual: d.sales,
        anterior: d.previousSales ?? 0,
      })),
    [days]
  );

  const showCompare = comparePreviousWeek && days.some((d) => d.previousSales !== undefined);

  const dataMax = useMemo(() => {
    let max = 0;
    for (const d of days) {
      max = Math.max(max, d.sales, showCompare ? (d.previousSales ?? 0) : 0);
    }
    return max;
  }, [days, showCompare]);

  const { domain, ticks } = useMemo(() => computeYScale(dataMax), [dataMax]);

  const gridStroke = isDark ? "rgba(148, 163, 184, 0.12)" : "rgba(44, 40, 36, 0.1)";
  const axisTick = isDark ? "#94a3b8" : "rgba(44, 40, 36, 0.42)";

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
      <div className="min-h-0 flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 6, right: 12, left: 0, bottom: 0 }}
          >
            <CartesianGrid stroke={gridStroke} vertical={false} />
            <XAxis
              dataKey="fecha"
              scale="point"
              padding={{ left: 24, right: 24 }}
              tick={{ fill: axisTick, fontSize: 11, fontWeight: 500 }}
              tickLine={false}
              axisLine={false}
              dy={6}
              interval={0}
            />
            <YAxis
              tick={{ fill: axisTick, fontSize: 11, fontWeight: 500 }}
              tickLine={false}
              axisLine={false}
              width={Y_AXIS_WIDTH}
              domain={domain}
              ticks={ticks}
              tickFormatter={(v) => (hideSensitiveInfo ? "***" : formatYAxisTick(Number(v)))}
            />
            <Tooltip
              formatter={(value: number | string, name: string) => {
                if (hideSensitiveInfo) {
                  return ["***", name === "actual" ? LABEL_CURRENT : LABEL_PREVIOUS];
                }
                const label = name === "actual" ? LABEL_CURRENT : LABEL_PREVIOUS;
                return [`$${Number(value).toLocaleString("es-CO")}`, label];
              }}
              labelFormatter={(_, payload) => {
                const row = payload?.[0]?.payload as { fecha?: string } | undefined;
                return row?.fecha ?? "";
              }}
              contentStyle={{
                background: isDark ? "rgba(15, 23, 42, 0.96)" : "rgba(255, 255, 255, 0.98)",
                border: isDark ? "rgba(51, 65, 85, 0.9)" : "rgba(44, 40, 36, 0.1)",
                borderRadius: 8,
                fontSize: 12,
                color: isDark ? "#f1f5f9" : "#2c2824",
                boxShadow: "0 4px 12px rgba(44, 40, 36, 0.08)",
              }}
              labelStyle={{ fontWeight: 600, marginBottom: 4, color: axisTick }}
              cursor={{ stroke: "rgba(44, 40, 36, 0.15)", strokeWidth: 1 }}
            />
            <Line
              type="monotone"
              dataKey="actual"
              name={LABEL_CURRENT}
              stroke={COLOR_CURRENT}
              strokeWidth={2}
              dot={{
                r: 4,
                fill: COLOR_CURRENT,
                stroke: COLOR_CURRENT,
                strokeWidth: 0,
              }}
              activeDot={{ r: 5, fill: COLOR_CURRENT, stroke: "#f9f7f2", strokeWidth: 2 }}
              isAnimationActive={false}
            />
            {showCompare ? (
              <Line
                type="monotone"
                dataKey="anterior"
                name={LABEL_PREVIOUS}
                stroke={COLOR_PREVIOUS}
                strokeWidth={2}
                strokeDasharray="6 5"
                dot={{
                  r: 4,
                  fill: COLOR_PREVIOUS,
                  stroke: COLOR_PREVIOUS,
                  strokeWidth: 0,
                }}
                activeDot={{ r: 5, fill: COLOR_PREVIOUS, stroke: "#f9f7f2", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {showCompare ? (
        <div className="mt-3 flex items-center justify-center gap-6 text-[12px] text-[var(--berea-ink-muted)]">
          <span className="inline-flex items-center gap-2">
            <svg width={24} height={2} aria-hidden>
              <line x1={0} y1={1} x2={24} y2={1} stroke={COLOR_CURRENT} strokeWidth={2} />
            </svg>
            {LABEL_CURRENT}
          </span>
          <span className="inline-flex items-center gap-2">
            <svg width={24} height={2} aria-hidden>
              <line
                x1={0}
                y1={1}
                x2={24}
                y2={1}
                stroke={COLOR_PREVIOUS}
                strokeWidth={2}
                strokeDasharray="5 4"
              />
            </svg>
            {LABEL_PREVIOUS}
          </span>
        </div>
      ) : null}
    </div>
  );
}
