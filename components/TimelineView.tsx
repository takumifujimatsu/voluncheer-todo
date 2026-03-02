"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { applyTaskFiltersAndSort } from "@/lib/taskFilters";
import type { Task, TaskStatus } from "@/types/task";
import { DEPARTMENTS, ASSIGNEE_EVERYONE_UID } from "@/types/task";
import { useTaskFilters } from "@/hooks/useTaskFilters";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TaskDetailModal } from "./TaskDetailModal";
import { FilterSortBar } from "./FilterSortBar";
import type { Member } from "./AddTaskModal";

const NUM_WEEKS = 12;
const NUM_DAYS_VIEW = 14; // 1日ごと表示で表示する日数（2週間）
const DAY_MS = 86400000;

const TIMELINE_GRANULARITY_STORAGE_KEY = "voluncheer-timeline-granularity";
export type TimelineGranularity = "week" | "day";

function getWeekStart(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getTaskDueTime(due: unknown): number | null {
  if (due == null) return null;
  if (due instanceof Timestamp) return due.toDate().getTime();
  return null;
}

function getWeekIndex(rangeStartMs: number, dueTimeMs: number): number {
  const diff = dueTimeMs - rangeStartMs;
  const dayIndex = Math.floor(diff / DAY_MS);
  return Math.floor(dayIndex / 7);
}

function formatWeekLabel(weekStart: Date): string {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  return `${weekStart.getMonth() + 1}/${weekStart.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`;
}

function formatMonthShort(d: Date): string {
  return `${d.getMonth() + 1}月`;
}

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

function formatDayLabel(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()} ${WEEKDAY_LABELS[d.getDay()]}`;
}

export type TimelineViewProps = {
  selectedDepartments: string[];
  currentUserUid?: string | null;
};

export function TimelineView({ selectedDepartments, currentUserUid }: TimelineViewProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [rangeStart, setRangeStart] = useState(() => getWeekStart(new Date()));
  const [granularity, setGranularity] = useState<TimelineGranularity>("week");
  const [editModalTask, setEditModalTask] = useState<Task | null>(null);
  const {
    completedFilter,
    setCompletedFilter,
    sort,
    setSort,
    myTasksOnly,
    setMyTasksOnly,
  } = useTaskFilters();

  useEffect(() => {
    const db = getDb();
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
          : rawDepts
            ? [rawDepts as string]
            : [];
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

  useEffect(() => {
    const stored = localStorage.getItem(TIMELINE_GRANULARITY_STORAGE_KEY);
    if (stored === "week" || stored === "day") setGranularity(stored);
  }, []);

  const handleGranularityChange = (value: TimelineGranularity) => {
    setGranularity(value);
    localStorage.setItem(TIMELINE_GRANULARITY_STORAGE_KEY, value);
  };

  useEffect(() => {
    const db = getDb();
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      const list: Member[] = snap.docs.map((d) => {
        const data = d.data();
        const rawDepts = data.departments ?? data.department;
        const departments = Array.isArray(rawDepts)
          ? rawDepts
          : typeof rawDepts === "string" && rawDepts.trim()
            ? [rawDepts]
            : [];
        return {
          uid: d.id,
          name: (data.name as string) ?? "",
          displayName: data.displayName ?? "",
          email: data.email ?? "",
          departments,
        };
      });
      setMembers(list);
    });
    return () => unsub();
  }, []);

  const rangeStartMs = rangeStart.getTime();
  const weekStarts: Date[] = [];
  for (let i = 0; i < NUM_WEEKS; i++) {
    const d = new Date(rangeStart);
    d.setDate(rangeStart.getDate() + i * 7);
    weekStarts.push(d);
  }

  const dayStarts: Date[] = [];
  for (let i = 0; i < NUM_DAYS_VIEW; i++) {
    const d = new Date(rangeStart);
    d.setDate(rangeStart.getDate() + i);
    d.setHours(0, 0, 0, 0);
    dayStarts.push(d);
  }

  const goPrev = () => {
    const d = new Date(rangeStart);
    d.setDate(d.getDate() - 7);
    setRangeStart(d);
  };

  const goNext = () => {
    const d = new Date(rangeStart);
    d.setDate(d.getDate() + 7);
    setRangeStart(d);
  };

  const goToday = () => {
    if (granularity === "week") {
      setRangeStart(getWeekStart(new Date()));
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setRangeStart(getWeekStart(today));
    }
  };

  const updateTask = async (
    taskId: string,
    params: {
      title: string;
      assigneeUid: string;
      assigneeName: string;
      dueDate: string;
      departments: string[];
      status: TaskStatus;
      memo: string;
      nextTaskId: string | null;
    }
  ) => {
    const { updateDoc, doc } = await import("firebase/firestore");
    const depts =
      params.departments.length > 0 ? params.departments : [DEPARTMENTS[0]];
    await updateDoc(doc(getDb(), "tasks", taskId), {
      title: params.title,
      departments: depts,
      status: params.status,
      assigneeUid: params.assigneeUid || null,
      assigneeName: params.assigneeName || null,
      dueDate: params.dueDate
        ? Timestamp.fromDate(new Date(params.dueDate))
        : null,
      memo: params.memo || null,
      nextTaskId: params.nextTaskId ?? null,
    });
    setEditModalTask(null);
  };

  const removeTask = async (taskId: string) => {
    const { deleteDoc, doc } = await import("firebase/firestore");
    await deleteDoc(doc(getDb(), "tasks", taskId));
    setEditModalTask(null);
  };

  const getTasksForDeptAndWeek = (dept: string, weekIndex: number) => {
    const weekStartMs = rangeStartMs + weekIndex * 7 * DAY_MS;
    const weekEndMs = weekStartMs + 7 * DAY_MS;
    return tasksWithDue.filter((task) => {
      if (!task.departments.includes(dept)) return false;
      const dueTime = getTaskDueTime(task.dueDate)!;
      return dueTime >= weekStartMs && dueTime < weekEndMs;
    });
  };

  const getTasksForDeptAndDay = (dept: string, dayIndex: number) => {
    const dayStartMs = rangeStartMs + dayIndex * DAY_MS;
    const dayEndMs = dayStartMs + DAY_MS;
    return tasksWithDue.filter((task) => {
      if (!task.departments.includes(dept)) return false;
      const dueTime = getTaskDueTime(task.dueDate)!;
      return dueTime >= dayStartMs && dueTime < dayEndMs;
    });
  };

  const byDepartment =
    selectedDepartments.length === 0
      ? tasks
      : tasks.filter(
          (t) =>
            t.departments.some((d) => selectedDepartments.includes(d)) ||
            t.departments.includes("全体")
        );

  const filteredForDept = applyTaskFiltersAndSort(byDepartment, {
    completedFilter,
    sort,
    myTasksOnly,
    currentUserUid,
  });

  const tasksWithDue = filteredForDept.filter((t) => getTaskDueTime(t.dueDate) != null);
  const tasksWithoutDue = filteredForDept.filter((t) => getTaskDueTime(t.dueDate) == null);

  const departmentsToShow =
    selectedDepartments.length === 0
      ? [...DEPARTMENTS]
      : selectedDepartments.includes("全体")
        ? [...selectedDepartments]
        : [...selectedDepartments, "全体"];

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [connectionLines, setConnectionLines] = useState<Array<{ from: { x: number; y: number }; to: { x: number; y: number } }>>([]);
  const [svgSize, setSvgSize] = useState({ width: 0, height: 0 });
  const filteredForDeptRef = useRef(filteredForDept);
  filteredForDeptRef.current = filteredForDept;
  const connectionsKey = filteredForDept
    .filter((t) => t.nextTaskId)
    .map((t) => `${t.id}-${t.nextTaskId}`)
    .sort()
    .join(",");

  useEffect(() => {
    const container = scrollContainerRef.current;
    const grid = gridRef.current;
    if (!container || !grid) return;

    const measure = () => {
      const containerRect = container.getBoundingClientRect();
      const tasks = filteredForDeptRef.current;
      const lines: Array<{ from: { x: number; y: number }; to: { x: number; y: number } }> = [];
      for (const task of tasks) {
        if (!task.nextTaskId) continue;
        const fromEl = grid.querySelector(`[data-taskid="${task.id}"]`);
        const toEl = grid.querySelector(`[data-taskid="${task.nextTaskId}"]`);
        if (!fromEl || !toEl) continue;
        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();
        const fromX = fromRect.left - containerRect.left + container.scrollLeft + fromRect.width / 2;
        const fromY = fromRect.bottom - containerRect.top + container.scrollTop;
        const toX = toRect.left - containerRect.left + container.scrollLeft + toRect.width / 2;
        const toY = toRect.top - containerRect.top + container.scrollTop;
        lines.push({ from: { x: fromX, y: fromY }, to: { x: toX, y: toY } });
      }
      const newW = grid.scrollWidth;
      const newH = grid.scrollHeight;
      setConnectionLines((prev) => {
        if (prev.length !== lines.length) return lines;
        const same = prev.every((p, i) => {
          const n = lines[i];
          return n && p.from.x === n.from.x && p.from.y === n.from.y && p.to.x === n.to.x && p.to.y === n.to.y;
        });
        return same ? prev : lines;
      });
      setSvgSize((prev) => (prev.width === newW && prev.height === newH ? prev : { width: newW, height: newH }));
    };

    measure();
    container.addEventListener("scroll", measure);
    const ro = new ResizeObserver(measure);
    ro.observe(grid);
    return () => {
      container.removeEventListener("scroll", measure);
      ro.disconnect();
    };
  }, [granularity, rangeStart, departmentsToShow, connectionsKey]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <FilterSortBar
          completedFilter={completedFilter}
          onCompletedFilterChange={setCompletedFilter}
          sort={sort}
          onSortChange={setSort}
          myTasksOnly={myTasksOnly}
          onMyTasksOnlyChange={setMyTasksOnly}
          currentUserUid={currentUserUid}
        />
      </div>
      <TaskDetailModal
        task={editModalTask}
        isOpen={!!editModalTask}
        onClose={() => setEditModalTask(null)}
        members={members}
        tasksForNext={tasks}
        onSave={updateTask}
        onDelete={removeTask}
      />

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400 sm:text-sm sm:normal-case sm:tracking-normal sm:text-slate-600 dark:text-slate-400">
              表示単位
            </span>
            <div className="flex rounded-lg border border-slate-200 bg-slate-50/80 p-0.5 dark:border-slate-600 dark:bg-slate-700/80">
              <button
                type="button"
                onClick={() => handleGranularityChange("week")}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition sm:px-3 sm:text-sm ${
                  granularity === "week"
                    ? "bg-white text-slate-800 shadow-sm dark:bg-slate-600 dark:text-slate-100"
                    : "text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                1週間ごと
              </button>
              <button
                type="button"
                onClick={() => handleGranularityChange("day")}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition sm:px-3 sm:text-sm ${
                  granularity === "day"
                    ? "bg-white text-slate-800 shadow-sm dark:bg-slate-600 dark:text-slate-100"
                    : "text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                1日ごと
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goPrev}
              className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              aria-label="前へ"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={goToday}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              今週
            </button>
            <button
              type="button"
              onClick={goNext}
              className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              aria-label="次へ"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {granularity === "week"
            ? `${formatMonthShort(rangeStart)} 〜 ${formatMonthShort(weekStarts[weekStarts.length - 1])}`
            : `${formatDayLabel(dayStarts[0])} 〜 ${formatDayLabel(dayStarts[dayStarts.length - 1])}`}
        </span>
      </div>

      <div ref={scrollContainerRef} className="relative overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {granularity === "week" ? (
          <div
            ref={gridRef}
            className="grid min-w-max"
            style={{
              gridTemplateColumns: `120px repeat(${NUM_WEEKS}, minmax(100px, 1fr))`,
              gridTemplateRows: `auto repeat(${departmentsToShow.length}, minmax(56px, auto))`,
            }}
          >
            <div className="col-span-1 row-span-1 border-b border-r border-slate-200 bg-slate-50 p-2 dark:border-slate-600 dark:bg-slate-700" />
            {weekStarts.map((week, wi) => (
              <div
                key={wi}
                className="border-b border-r border-slate-200 bg-slate-50 p-2 text-center text-xs font-medium text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
              >
                <div>W{Math.ceil((week.getDate() + 1) / 7)}</div>
                <div className="mt-0.5">{formatWeekLabel(week)}</div>
              </div>
            ))}
            {departmentsToShow.map((dept) => (
              <React.Fragment key={dept}>
                <div className="sticky left-0 z-10 border-b border-r border-slate-200 bg-white p-2 text-sm font-semibold text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
                  {dept}
                </div>
                {weekStarts.map((_, wi) => {
                  const cellTasks = getTasksForDeptAndWeek(dept, wi);
                  return (
                    <div
                      key={`${dept}-${wi}`}
                      className="flex flex-col gap-1 border-b border-r border-slate-100 bg-white p-1 dark:border-slate-600 dark:bg-slate-800"
                    >
                      {cellTasks.map((task) => {
                        const isMine = currentUserUid && (task.assigneeUid === currentUserUid || task.assigneeUid === ASSIGNEE_EVERYONE_UID);
                        const isDone = task.status === "done";
                        return (
                          <button
                            key={task.id}
                            type="button"
                            data-taskid={task.id}
                            onClick={() => setEditModalTask(task)}
                            className={`flex min-h-[44px] w-full flex-col items-start justify-center rounded border-l-4 px-2 py-1.5 text-left transition hover:shadow-sm ${
                              isMine
                                ? "border-l-blue-400 bg-blue-50/60 dark:border-l-blue-500 dark:bg-blue-900/30"
                                : "border-l-[#2EABE3] bg-[#2EABE3]/10 dark:border-l-[#2EABE3] dark:bg-[#2EABE3]/20"
                            } ${isDone ? "opacity-70" : ""}`}
                          >
                            <span className="block max-w-full truncate text-xs font-medium text-slate-800 dark:text-slate-100">
                              {task.title}
                            </span>
                            {task.assigneeName && (
                              <span className="mt-0.5 block truncate text-[10px] text-slate-500 dark:text-slate-400">
                                {task.assigneeName}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        ) : (
          <div
            ref={gridRef}
            className="grid min-w-max"
            style={{
              gridTemplateColumns: `120px repeat(${NUM_DAYS_VIEW}, minmax(72px, 1fr))`,
              gridTemplateRows: `auto repeat(${departmentsToShow.length}, minmax(56px, auto))`,
            }}
          >
            <div className="col-span-1 row-span-1 border-b border-r border-slate-200 bg-slate-50 p-2 dark:border-slate-600 dark:bg-slate-700" />
            {dayStarts.map((day, di) => (
              <div
                key={di}
                className="border-b border-r border-slate-200 bg-slate-50 p-1.5 text-center text-[10px] font-medium text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
              >
                {formatDayLabel(day)}
              </div>
            ))}
            {departmentsToShow.map((dept) => (
              <React.Fragment key={dept}>
                <div className="sticky left-0 z-10 border-b border-r border-slate-200 bg-white p-2 text-sm font-semibold text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
                  {dept}
                </div>
                {dayStarts.map((_, di) => {
                  const cellTasks = getTasksForDeptAndDay(dept, di);
                  return (
                    <div
                      key={`${dept}-${di}`}
                      className="flex flex-col gap-1 border-b border-r border-slate-100 bg-white p-1 dark:border-slate-600 dark:bg-slate-800"
                    >
                      {cellTasks.map((task) => {
                        const isMine = currentUserUid && (task.assigneeUid === currentUserUid || task.assigneeUid === ASSIGNEE_EVERYONE_UID);
                        const isDone = task.status === "done";
                        return (
                          <button
                            key={task.id}
                            type="button"
                            data-taskid={task.id}
                            onClick={() => setEditModalTask(task)}
                            className={`flex min-h-[44px] w-full flex-col items-start justify-center rounded border-l-4 px-1.5 py-1 text-left transition hover:shadow-sm ${
                              isMine
                                ? "border-l-blue-400 bg-blue-50/60 dark:border-l-blue-500 dark:bg-blue-900/30"
                                : "border-l-[#2EABE3] bg-[#2EABE3]/10 dark:border-l-[#2EABE3] dark:bg-[#2EABE3]/20"
                            } ${isDone ? "opacity-70" : ""}`}
                          >
                            <span className="block max-w-full truncate text-xs font-medium text-slate-800 dark:text-slate-100">
                              {task.title}
                            </span>
                            {task.assigneeName && (
                              <span className="mt-0.5 block truncate text-[10px] text-slate-500 dark:text-slate-400">
                                {task.assigneeName}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        )}
        {svgSize.width > 0 && svgSize.height > 0 && (
          <svg
            className="pointer-events-none absolute left-0 top-0 z-0"
            width={svgSize.width}
            height={svgSize.height}
            aria-hidden
          >
            <defs>
              <marker
                id="timeline-arrow"
                markerWidth="8"
                markerHeight="6"
                refX="7"
                refY="3"
                orient="auto"
              >
                <path d="M0 0 L8 3 L0 6 Z" fill="#2EABE3" />
              </marker>
            </defs>
            {connectionLines.map((line, i) => {
              const { from, to } = line;
              const dx = to.x - from.x;
              const dy = to.y - from.y;
              const midX = (from.x + to.x) / 2;
              const midY = (from.y + to.y) / 2;
              // 曲がり具合（距離に応じてスケール、角ばらないように）
              const bend = Math.min(56, Math.abs(dx) * 0.35 + 16, Math.abs(dy) * 0.35 + 16);
              // 直線を使わず、2本の3次ベジェで「下→横→上」を滑らかに
              const d =
                `M ${from.x} ${from.y} ` +
                `C ${from.x} ${from.y + bend} ${midX - bend} ${midY} ${midX} ${midY} ` +
                `C ${midX + bend} ${midY} ${to.x} ${to.y - bend} ${to.x} ${to.y}`;
              return (
                <path
                  key={i}
                  d={d}
                  fill="none"
                  stroke="#2EABE3"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  markerEnd="url(#timeline-arrow)"
                />
              );
            })}
          </svg>
        )}
      </div>

      {tasksWithoutDue.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-3 text-sm font-semibold text-slate-600 dark:text-slate-400">
            日付なしのタスク（{tasksWithoutDue.length}件）
          </h3>
          <ul className="space-y-2">
            {tasksWithoutDue.map((task) => {
              const isMine = currentUserUid && (task.assigneeUid === currentUserUid || task.assigneeUid === ASSIGNEE_EVERYONE_UID);
              return (
                <li key={task.id}>
                  <button
                    type="button"
                    onClick={() => setEditModalTask(task)}
                    className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition hover:shadow-sm ${
                      isMine ? "border-blue-400 bg-blue-50/60 dark:border-blue-500 dark:bg-blue-900/30" : "border-slate-200 bg-slate-50/80 dark:border-slate-600 dark:bg-slate-700/80"
                    }`}
                  >
                    <span className="flex-1 truncate font-medium text-slate-800 dark:text-slate-100">
                      {task.title}
                    </span>
                    {task.assigneeName && (
                      <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                        {task.assigneeName}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
