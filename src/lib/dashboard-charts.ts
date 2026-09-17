/**
 * Shared Recharts styling for dashboard analytics (tooltips, grids, labels).
 */
import type { CSSProperties } from "react";

export const dashboardChartTooltipStyle = {
  borderRadius: 14,
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--card) / 0.97)",
  backdropFilter: "blur(10px)",
  boxShadow: "0 12px 40px -12px hsl(0 0% 0% / 0.22)",
  padding: "10px 14px",
} as const;

export const dashboardChartWrapperStyle: CSSProperties = {
  outline: "none",
};

/** Softer grid lines that work in light/dark */
export const dashboardGridStroke = "hsl(var(--border) / 0.65)";

export function dashboardAxisTick(fill = "hsl(var(--muted-foreground))") {
  return { fontSize: 11, fill };
}

/**
 * Pie label: name + percent; hides tiny slices for readability.
 */
export function pieSliceLabel(entry: { name?: string; percent?: number }): string {
  const p = entry.percent ?? 0;
  if (p < 0.06) return "";
  const name = entry.name ?? "";
  return `${name} ${(p * 100).toFixed(0)}%`;
}

export const chartCardClass =
  "rounded-2xl border border-border/70 bg-gradient-to-b from-card via-card to-muted/25 shadow-sm overflow-hidden";

export const chartInnerClass = "rounded-xl bg-muted/20 border border-border/40 p-1";
