"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy, type Unsubscribe } from "firebase/firestore";
import { Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Task, TaskStatus } from "@/types/task";
import { DEPARTMENTS } from "@/types/task";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";

export type AnalysisViewProps = {
  selectedDepartments: string[];
};

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getTaskDueYMD(due: unknown): string | null {
  if (due == null) return null;
  if (due instanceof Timestamp) {
    return toYMD(due.toDate());
  }
  return null;
}

function getCreatedAtYMD(createdAt: unknown): string | null {
  if (createdAt == null) return null;
  if (createdAt instanceof Timestamp) {
    return toYMD(createdAt.toDate());
  }
  return null;
}

export function AnalysisView({ selectedDepartments }: AnalysisViewProps) {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, "tasks"),
      orderBy("createdAt", "desc")
    );
    const unsub: Unsubscribe = onSnapshot(q, (snap) => {
      const list: Task[] = snap.docs.map((d) => {
        const data = d.data();
        const rawDepts = data.departments ?? data.department;
        const departments = Array.isArray(rawDepts)
          ? rawDepts
          : rawDepts ? [rawDepts as string] : [];
        return {
          id: d.id,
          title: data.title ?? "",
          departments,
          status: (data.status as TaskStatus) ?? "todo",
          createdAt: data.createdAt,
          assigneeUid: data.assigneeUid ?? null,
          assigneeName: data.assigneeName ?? null,
          dueDate: data.dueDate ?? null,
          memo: data.memo ?? null,
          nextTaskId: data.nextTaskId ?? null,
        };
      });
      setTasks(list);
    });
    return () => unsub();
  }, []);

  const byDepartment =
    selectedDepartments.length === 0
      ? tasks
      : tasks.filter(
          (t) =>
            t.departments.some((d) => selectedDepartments.includes(d)) ||
            t.departments.includes("全体")
        );

  const todayStr = toYMD(new Date());
  const completed = byDepartment.filter((t) => t.status === "done");
  const uncompleted = byDepartment.filter((t) => t.status === "todo" || t.status === "doing");
  const overdue = byDepartment.filter((t) => {
    if (t.status === "done") return false;
    const dueStr = getTaskDueYMD(t.dueDate);
    if (!dueStr) return false;
    return dueStr < todayStr;
  });
  const total = byDepartment.length;

  const filterLabel =
    selectedDepartments.length === 0
      ? "フィルターなし"
      : `${selectedDepartments.length}個のフィルター`;

  const summaryCards = [
    { label: "完了したタスクの合計", value: completed.length, sub: filterLabel },
    { label: "未完了のタスクの合計", value: uncompleted.length, sub: filterLabel },
    { label: "期限超過のタスクの合計", value: overdue.length, sub: filterLabel },
    { label: "タスクの合計", value: total, sub: selectedDepartments.length === 0 ? "フィルターなし" : filterLabel },
  ];

  const deptsToShow = selectedDepartments.length === 0 ? [...DEPARTMENTS] : selectedDepartments;
  const uncompletedByDept = deptsToShow.map((dept) => ({
    name: dept.length > 8 ? dept.slice(0, 7) + "…" : dept,
    fullName: dept,
    count: uncompleted.filter((t) => t.departments.includes(dept)).length,
  }));

  const statusPieData = [
    { name: "完了", value: completed.length, color: "#2EABE3" },
    { name: "未完了", value: uncompleted.length, color: "#22c55e" },
  ].filter((d) => d.value > 0);

  const assigneeLabel = (t: Task) =>
    (t.assigneeName && t.assigneeName.trim() ? t.assigneeName.trim() : "未割り当て") as string;
  const assigneeCounts = new Map<string, number>();
  uncompleted.forEach((t) => {
    const label = assigneeLabel(t);
    assigneeCounts.set(label, (assigneeCounts.get(label) ?? 0) + 1);
  });
  const uncompletedByAssignee = Array.from(assigneeCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const last7Days: { date: string; label: string; 新規: number }[] = [];
  const createdCountByDay = new Map<string, number>();
  byDepartment.forEach((t) => {
    const ymd = getCreatedAtYMD(t.createdAt);
    if (ymd) createdCountByDay.set(ymd, (createdCountByDay.get(ymd) ?? 0) + 1);
  });
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ymd = toYMD(d);
    const count = createdCountByDay.get(ymd) ?? 0;
    last7Days.push({
      date: ymd,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      新規: count,
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {card.label}
            </p>
            <p className="mt-1 text-3xl font-bold text-slate-800 dark:text-slate-100">
              {card.value}
            </p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              = {card.sub}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
            未完了のタスクの合計（セクション別）
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={uncompletedByDept} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-600" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "currentColor" }}
                  className="text-slate-500 dark:text-slate-400"
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "currentColor" }}
                  className="text-slate-500 dark:text-slate-400"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--tw-bg-opacity, 1)",
                    border: "1px solid rgb(226 232 240)",
                    borderRadius: "0.5rem",
                  }}
                  formatter={(value: number, _name: string, props: { payload: { fullName: string } }) => [
                    value,
                    props.payload.fullName,
                  ]}
                  labelFormatter={() => "タスク数"}
                />
                <Bar dataKey="count" fill="#2EABE3" radius={[4, 4, 0, 0]} name="タスク" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            = {selectedDepartments.length === 0 ? "フィルターなし" : `${selectedDepartments.length}個のフィルター`}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
            タスクの合計（完了ステータス別）
          </h3>
          <div className="flex h-64 items-center justify-center">
            {statusPieData.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">データがありません</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }) => `${name} ${value}`}
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip formatter={(value: number) => [value, "件"]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            = {selectedDepartments.length === 0 ? "フィルターなし" : `${selectedDepartments.length}個のフィルター`}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
            今後のタスクの合計（担当者別）
          </h3>
          <div className="h-64">
            {uncompletedByAssignee.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">データがありません</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={uncompletedByAssignee}
                  layout="vertical"
                  margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-600" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [value, "件"]} />
                  <Bar dataKey="count" fill="#2EABE3" radius={[0, 4, 4, 0]} name="タスク" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            = {selectedDepartments.length === 0 ? "フィルターなし" : `${selectedDepartments.length}個のフィルター`}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
            タスク作成の推移（直近7日間）
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={last7Days} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-600" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "currentColor" }}
                  className="text-slate-500 dark:text-slate-400"
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="新規"
                  stackId="1"
                  stroke="#2EABE3"
                  fill="#2EABE3"
                  fillOpacity={0.4}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            = {selectedDepartments.length === 0 ? "フィルターなし" : `${selectedDepartments.length}個のフィルター`}
          </p>
        </div>
      </div>
    </div>
  );
}
