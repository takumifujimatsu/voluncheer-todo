"use client";

import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { applyTaskFiltersAndSort } from "@/lib/taskFilters";
import type { Task, TaskStatus } from "@/types/task";
import { DEPARTMENTS, ASSIGNEE_EVERYONE_UID } from "@/types/task";
import { useTaskFilters } from "@/hooks/useTaskFilters";
import { ChevronLeft, ChevronRight, Plus, Calendar } from "lucide-react";
import { AddTaskModal, type Member } from "./AddTaskModal";
import { TaskDetailModal } from "./TaskDetailModal";
import { FilterSortBar } from "./FilterSortBar";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

function getWeekStart(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getWeekDays(weekStart: Date): Date[] {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    days.push(d);
  }
  return days;
}

/** ローカル日付の YYYY-MM-DD（タイムゾーンずれを防ぐ） */
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

function isToday(d: Date): boolean {
  const today = new Date();
  return toYMD(d) === toYMD(today);
}

export type CalendarViewProps = {
  selectedDepartments: string[];
  currentUserUid?: string | null;
};

export function CalendarView({ selectedDepartments, currentUserUid }: CalendarViewProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addModalDefaultDate, setAddModalDefaultDate] = useState("");
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

  const byDepartment =
    selectedDepartments.length === 0
      ? tasks
      : tasks.filter(
          (t) =>
            t.departments.some((d) => selectedDepartments.includes(d)) ||
            t.departments.includes("全体")
        );

  const filtered = applyTaskFiltersAndSort(byDepartment, {
    completedFilter,
    sort,
    myTasksOnly,
    currentUserUid,
  });

  const tasksWithDue = filtered.filter((t) => getTaskDueYMD(t.dueDate) != null);
  const tasksWithoutDue = filtered.filter((t) => getTaskDueYMD(t.dueDate) == null);

  const weekDays = getWeekDays(weekStart);

  const goPrevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };

  const goNextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };

  const goToday = () => {
    setWeekStart(getWeekStart(new Date()));
  };

  const defaultDepartments = selectedDepartments.length === 0 ? [] : [...selectedDepartments];

  const openAddModal = (dateStr?: string) => {
    setAddModalDefaultDate(dateStr ?? "");
    setAddModalOpen(true);
  };

  const addTask = async (params: {
    title: string;
    assigneeUid: string;
    assigneeName: string;
    dueDate: string;
    departments: string[];
    status: TaskStatus;
    memo: string;
  }) => {
    const depts =
      params.departments.length > 0 ? params.departments : [DEPARTMENTS[0]];
    const due = params.dueDate || addModalDefaultDate;
    await addDoc(collection(getDb(), "tasks"), {
      title: params.title,
      departments: depts,
      status: params.status,
      assigneeUid: params.assigneeUid || null,
      assigneeName: params.assigneeName || null,
      dueDate: due ? Timestamp.fromDate(new Date(due)) : null,
      memo: params.memo || null,
      createdAt: serverTimestamp(),
    });
    setAddModalOpen(false);
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
    await deleteDoc(doc(getDb(), "tasks", taskId));
    setEditModalTask(null);
  };

  const monthYearLabel = `${weekStart.getFullYear()}年${weekStart.getMonth() + 1}月`;

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
      <AddTaskModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        defaultStatus="todo"
        defaultDepartments={defaultDepartments}
        defaultDueDate={addModalDefaultDate || undefined}
        members={members}
        onSubmit={addTask}
      />
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
        <button
          type="button"
          onClick={() => openAddModal()}
          className="inline-flex items-center gap-2 rounded-lg bg-[#2EABE3] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#2590c4]"
        >
          <Plus className="h-4 w-4" />
          タスクを追加
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrevWeek}
            className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
            aria-label="前の週"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            今日
          </button>
          <button
            type="button"
            onClick={goNextWeek}
            className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
            aria-label="次の週"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <span className="min-w-[120px] text-center text-sm font-semibold text-slate-800">
            {monthYearLabel}
          </span>
        </div>
      </div>

      {/* スマホ: 縦に7日 / パソコン: 横に7日 */}
      <div className="grid grid-cols-1 gap-px rounded-xl border border-slate-200 bg-slate-200 overflow-hidden dark:border-slate-700 dark:bg-slate-700 md:grid-cols-7">
        {weekDays.map((day) => {
          const ymd = toYMD(day);
          const dayTasks = tasksWithDue.filter((t) => getTaskDueYMD(t.dueDate) === ymd);
          return (
            <div
              key={ymd}
              className={`flex min-h-[140px] flex-col bg-white dark:bg-slate-800 ${
                isToday(day) ? "ring-2 ring-[#2EABE3] ring-inset" : ""
              }`}
            >
              <div className="flex flex-col items-center border-b border-slate-100 p-2 dark:border-slate-700">
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                  {WEEKDAY_LABELS[day.getDay()]}
                </span>
                <span
                  className={`text-lg font-semibold ${
                    isToday(day) ? "text-[#2EABE3]" : "text-slate-800 dark:text-slate-100"
                  }`}
                >
                  {day.getDate()}
                </span>
              </div>
              <div className="flex flex-1 flex-col overflow-y-auto p-2">
                <button
                  type="button"
                  onClick={() => openAddModal(ymd)}
                  className="mb-1 flex w-full shrink-0 items-center gap-1 rounded-lg border border-dashed border-slate-200 py-1.5 pl-2 text-xs text-slate-400 transition hover:border-[#2EABE3] hover:text-[#2EABE3] dark:border-slate-600 dark:text-slate-500"
                >
                  <Plus className="h-3.5 w-3.5" />
                  タスクを追加
                </button>
                <div className="flex-1 space-y-1">
                  {dayTasks.map((task) => {
                    const isDone = task.status === "done";
                    const isMine = currentUserUid && (task.assigneeUid === currentUserUid || task.assigneeUid === ASSIGNEE_EVERYONE_UID);
                    return (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => setEditModalTask(task)}
                      className={`w-full rounded-lg border px-2 py-1.5 text-left text-xs transition hover:shadow-sm ${
                        isMine
                          ? "border-blue-300 bg-blue-50/80 dark:border-blue-600 dark:bg-blue-900/40"
                          : "border-slate-200 bg-slate-50/80 dark:border-slate-600 dark:bg-slate-700/80"
                      } ${isDone ? "opacity-70 line-through" : ""}`}
                      >
                        <span className="block truncate font-medium text-slate-800 dark:text-slate-100">
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
              </div>
            </div>
          );
        })}
      </div>

      {tasksWithoutDue.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
            <Calendar className="h-4 w-4 text-slate-400" />
            日付なしのタスク（{tasksWithoutDue.length}件）
          </h3>
          <ul className="space-y-2">
            {tasksWithoutDue.map((task) => {
              const isDone = task.status === "done";
              const isMine = currentUserUid && (task.assigneeUid === currentUserUid || task.assigneeUid === ASSIGNEE_EVERYONE_UID);
              return (
                <li key={task.id}>
                  <button
                    type="button"
                    onClick={() => setEditModalTask(task)}
                    className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition hover:shadow-sm ${
                      isMine
                        ? "border-blue-300 bg-blue-50/80 dark:border-blue-600 dark:bg-blue-900/40"
                        : "border-slate-200 bg-slate-50/80 dark:border-slate-600 dark:bg-slate-700/80"
                    } ${isDone ? "opacity-70 line-through" : ""}`}
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
