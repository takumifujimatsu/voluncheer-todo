"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  Cell,
} from "recharts";
import { getWeekLabel } from "@/lib/weekUtils";

const CHART_COLORS = [
  "#2EABE3", // メインカラー
  "#34d399",
  "#fbbf24",
  "#f472b6",
  "#a78bfa",
  "#38bdf8",
];

export type DeptAverageData = {
  department: string;
  average: number;
  count: number;
};

export type DashboardChartsProps = {
  /** 部署別平均スコア（今週） */
  deptAverages: DeptAverageData[];
  /** 週別スコア推移（部署ごと） */
  weeklyTrend: Record<string, string | number>[];
  selectedDepartment: string | null;
};

export function DashboardCharts({
  deptAverages,
  weeklyTrend,
  selectedDepartment,
}: DashboardChartsProps) {
  const deptKeys = [
    ...new Set([
      ...deptAverages.map((d) => d.department),
      ...weeklyTrend.flatMap((r) => Object.keys(r).filter((k) => k !== "weekKey" && typeof r[k] === "number")),
    ]),
  ];
  const deptColors = Object.fromEntries(
    deptKeys.map((d, i) => [d, CHART_COLORS[i % CHART_COLORS.length]])
  );

  const weeklyTrendFormatted = weeklyTrend.map((row) => ({
    ...row,
    weekLabel: getWeekLabel((row.weekKey as string) ?? ""),
  }));

  return (
    <div className="space-y-6">
      {/* 部署別平均スコア（今週） */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-600 dark:bg-slate-800">
        <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
          今週の部署別平均スコア
        </h3>
        <div className="h-48 sm:h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={deptAverages}
              margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-600" />
              <XAxis
                dataKey="department"
                tick={{ fontSize: 11, fill: "currentColor" }}
                className="text-slate-600 dark:text-slate-400"
              />
              <YAxis
                domain={[0, 10]}
                tick={{ fontSize: 11 }}
                className="text-slate-600 dark:text-slate-400"
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "0.75rem",
                  border: "1px solid rgb(226 232 240)",
                  backgroundColor: "white",
                }}
                formatter={(value: number | undefined) => [value != null ? `${value.toFixed(1)}点` : "—", "平均"]}
                labelFormatter={(label) => `${label} (${deptAverages.find((d) => d.department === label)?.count ?? 0}名)`}
              />
              <Bar dataKey="average" radius={[4, 4, 0, 0]} name="平均点">
                {deptAverages.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 週別スコア推移 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-600 dark:bg-slate-800">
        <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
          週別スコア推移
          {selectedDepartment && (
            <span className="ml-2 text-slate-500 dark:text-slate-400">
              — {selectedDepartment}
            </span>
          )}
        </h3>
        <div className="h-56 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={weeklyTrendFormatted}
              margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-600" />
              <XAxis
                dataKey="weekLabel"
                tick={{ fontSize: 10, fill: "currentColor" }}
                className="text-slate-600 dark:text-slate-400"
              />
              <YAxis
                domain={[0, 10]}
                tick={{ fontSize: 11 }}
                className="text-slate-600 dark:text-slate-400"
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "0.75rem",
                  border: "1px solid rgb(226 232 240)",
                  backgroundColor: "white",
                }}
                formatter={(value: number | undefined) => [value != null ? `${value}点` : "—", ""]}
              />
              <Legend />
              {Object.keys(deptColors)
                .filter((dept) => weeklyTrend.some((r) => r[dept] != null))
                .map((dept) => (
                  <Line
                    key={dept}
                    type="monotone"
                    dataKey={dept}
                    stroke={deptColors[dept]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

