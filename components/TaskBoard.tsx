"use client";

import { useEffect, useRef, useState } from "react";
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
import { db } from "@/lib/firebase";
import { applyTaskFiltersAndSort } from "@/lib/taskFilters";
import type { CompletedFilter, TaskSort } from "@/lib/taskFilters";
import type { Task, TaskStatus } from "@/types/task";
import { DEPARTMENTS, ASSIGNEE_EVERYONE_UID } from "@/types/task";
import {
  Check,
  Circle,
  Trash2,
  Plus,
  Calendar,
  User,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { AddTaskModal, type Member } from "./AddTaskModal";
import { TaskDetailModal } from "./TaskDetailModal";
import { FilterSortBar } from "./FilterSortBar";

const STATUSES: { key: TaskStatus; label: string; bg: string }[] = [
  {
    key: "todo",
    label: "To Do",
    bg: "bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-600",
  },
  {
    key: "done",
    label: "Done",
    bg: "bg-[#2EABE3]/10 border-[#2EABE3]/40 dark:bg-[#2EABE3]/20 dark:border-[#2EABE3]/50",
  },
];

function formatDueDateRelative(due: unknown): string | null {
  if (due == null) return null;
  let date: Date;
  if (due instanceof Timestamp) {
    date = due.toDate();
  } else {
    return null;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffMs = dueDay.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "今日";
  if (diffDays === 1) return "明日";
  if (diffDays === -1) return "昨日";
  if (diffDays > 1) return `あと${diffDays}日`;
  if (diffDays < -1) return `${-diffDays}日過ぎています`;
  return null;
}

export type TaskBoardProps = {
  selectedDepartments: string[];
  /** ログイン中のユーザー uid。担当タスクを目立たせるために使用 */
  currentUserUid?: string | null;
  /** 表示（すべて/未完了/完了）。URL と同期する場合は親から渡す */
  completedFilter?: CompletedFilter;
  onCompletedFilterChange?: (v: CompletedFilter) => void;
  sort?: TaskSort;
  onSortChange?: (v: TaskSort) => void;
  myTasksOnly?: boolean;
  onMyTasksOnlyChange?: (v: boolean) => void;
};

export function TaskBoard({
  selectedDepartments,
  currentUserUid,
  completedFilter: completedFilterProp,
  onCompletedFilterChange,
  sort: sortProp,
  onSortChange,
  myTasksOnly: myTasksOnlyProp,
  onMyTasksOnlyChange,
}: TaskBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStatus, setModalStatus] = useState<TaskStatus>("todo");
  const [editModalTask, setEditModalTask] = useState<Task | null>(null);
  const justDraggedRef = useRef(false);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  /** 部署ごとの開閉（閉じている部署の名前を保持。To Do / Done 共通） */
  const [collapsedDepartments, setCollapsedDepartments] = useState<Set<string>>(
    new Set(),
  );
  const toggleDepartmentCollapse = (department: string) => {
    setCollapsedDepartments((prev) => {
      const next = new Set(prev);
      if (next.has(department)) next.delete(department);
      else next.add(department);
      return next;
    });
  };
  const completedFilter = completedFilterProp ?? "all";
  const setCompletedFilter = onCompletedFilterChange ?? (() => {});
  const sort = sortProp ?? "created";
  const setSort = onSortChange ?? (() => {});
  const myTasksOnly = myTasksOnlyProp ?? false;
  const setMyTasksOnly = onMyTasksOnlyChange ?? (() => {});

  useEffect(() => {
    const q = query(collection(db, "tasks"), orderBy("createdAt", "desc"));
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
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      const list: Member[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          uid: d.id,
          name: (data.name as string) ?? "",
          displayName: data.displayName ?? "",
          email: data.email ?? "",
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
            t.departments.includes("全体"),
        );

  const filtered = applyTaskFiltersAndSort(byDepartment, {
    completedFilter,
    sort,
    myTasksOnly,
    currentUserUid,
  });

  /** タスクを部署ごとにグループ化。担当部署が複数あるタスクは該当する部署セクションそれぞれに表示 */
  function groupTasksByDisplayDepartment(
    taskList: Task[],
    _statusKey: "todo" | "done",
  ): { department: string; tasks: Task[] }[] {
    const deptsToShow =
      selectedDepartments.length === 0
        ? [...DEPARTMENTS]
        : selectedDepartments.length >= 2
          ? selectedDepartments
          : [];
    if (deptsToShow.length === 0) return [];
    return deptsToShow
      .map((department) => ({
        department,
        tasks: taskList.filter((t) => t.departments.includes(department)),
      }))
      .filter((g) => g.tasks.length > 0);
  }

  const defaultDepartments =
    selectedDepartments.length === 0 ? [] : [...selectedDepartments];

  const openAddModal = (status: TaskStatus) => {
    setModalStatus(status);
    setModalOpen(true);
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
    await addDoc(collection(db, "tasks"), {
      title: params.title,
      departments: depts,
      status: params.status,
      assigneeUid: params.assigneeUid || null,
      assigneeName: params.assigneeName || null,
      dueDate: params.dueDate
        ? Timestamp.fromDate(new Date(params.dueDate))
        : null,
      memo: params.memo || null,
      createdAt: serverTimestamp(),
    });
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
    },
  ) => {
    const depts =
      params.departments.length > 0 ? params.departments : [DEPARTMENTS[0]];
    await updateDoc(doc(db, "tasks", taskId), {
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
  };

  const toggleDone = async (id: string, currentStatus: TaskStatus) => {
    const next = currentStatus === "done" ? "todo" : "done";
    await updateDoc(doc(db, "tasks", id), { status: next });
  };

  const updateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    await updateDoc(doc(db, "tasks", taskId), { status: newStatus });
  };

  const handleColumnDragOver = (e: React.DragEvent, columnKey: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(columnKey);
  };

  const handleColumnDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleColumnDrop = async (
    e: React.DragEvent,
    columnKey: TaskStatus,
  ) => {
    e.preventDefault();
    setDragOverColumn(null);
    const raw = e.dataTransfer.getData("application/x-task-id");
    if (!raw) return;
    try {
      const { taskId, currentStatus } = JSON.parse(raw) as {
        taskId: string;
        currentStatus: TaskStatus;
      };
      const targetStatus: TaskStatus = columnKey === "done" ? "done" : "todo";
      const isTodoColumn = columnKey === "todo";
      const currentlyDone = currentStatus === "done";
      if (isTodoColumn && currentlyDone) {
        await updateTaskStatus(taskId, "todo");
      } else if (!isTodoColumn && !currentlyDone) {
        await updateTaskStatus(taskId, "done");
      }
    } catch {
      // ignore invalid data
    }
  };

  const removeTask = async (id: string) => {
    await deleteDoc(doc(db, "tasks", id));
  };

  return (
    <div className="space-y-6">
      <AddTaskModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultStatus={modalStatus}
        defaultDepartments={defaultDepartments}
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

      <div className="grid gap-4 md:grid-cols-2">
        {STATUSES.map(({ key, label, bg }) => {
          const columnTasks =
            key === "todo"
              ? filtered.filter(
                  (t) => t.status === "todo" || t.status === "doing",
                )
              : filtered.filter((t) => t.status === key);
          const grouped = groupTasksByDisplayDepartment(columnTasks, key);
          const showByDepartment =
            (selectedDepartments.length === 0 ||
              selectedDepartments.length >= 2) &&
            grouped.length > 0;
          const isDropTarget = dragOverColumn === key;
          return (
            <div
              key={key}
              className={`rounded-xl border-2 p-4 shadow-sm transition-colors ${
                isDropTarget
                  ? "border-[#2EABE3] bg-[#2EABE3]/10 dark:bg-[#2EABE3]/20"
                  : bg
              }`}
              onDragOver={(e) => handleColumnDragOver(e, key)}
              onDragLeave={handleColumnDragLeave}
              onDrop={(e) => handleColumnDrop(e, key)}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                  {label}
                </h3>
                <button
                  type="button"
                  onClick={() => openAddModal(key)}
                  className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-[#2EABE3] dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 dark:hover:text-[#2EABE3]"
                >
                  <Plus className="h-4 w-4" />
                  追加
                </button>
              </div>
              {showByDepartment ? (
                <div className="space-y-3">
                  {grouped.map(({ department, tasks }) => {
                    const isCollapsed = collapsedDepartments.has(department);
                    return (
                      <div
                        key={department}
                        className="rounded-lg border border-slate-200 bg-white/80 dark:border-slate-600 dark:bg-slate-700/50"
                      >
                        <button
                          type="button"
                          onClick={() => toggleDepartmentCollapse(department)}
                          className="flex w-full items-center gap-2 rounded-t-lg border-b border-slate-200 bg-slate-100/80 px-3 py-2.5 text-left transition hover:bg-slate-200/80 dark:border-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600"
                          aria-expanded={!isCollapsed}
                          aria-label={
                            isCollapsed
                              ? `${department}を開く`
                              : `${department}を閉じる`
                          }
                        >
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center text-slate-500 dark:text-slate-400">
                            {isCollapsed ? (
                              <ChevronRight className="h-5 w-5" aria-hidden />
                            ) : (
                              <ChevronDown className="h-5 w-5" aria-hidden />
                            )}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {department}
                          </span>
                          <span className="shrink-0 rounded-full bg-slate-300/80 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-500 dark:text-slate-200">
                            {tasks.length}件
                          </span>
                        </button>
                        {!isCollapsed && (
                          <div className="p-2">
                            <ul className="space-y-2">
                              {tasks.map((task) => {
                                const isDone = task.status === "done";
                                const isMine =
                                  currentUserUid &&
                                  (task.assigneeUid === currentUserUid ||
                                    task.assigneeUid === ASSIGNEE_EVERYONE_UID);
                                return (
                                  <li
                                    key={task.id}
                                    role="button"
                                    tabIndex={0}
                                    draggable
                                    onDragStart={(e) => {
                                      justDraggedRef.current = false;
                                      e.dataTransfer.setData(
                                        "application/x-task-id",
                                        JSON.stringify({
                                          taskId: task.id,
                                          currentStatus: task.status,
                                        }),
                                      );
                                      e.dataTransfer.effectAllowed = "move";
                                    }}
                                    onDragEnd={() => {
                                      justDraggedRef.current = true;
                                    }}
                                    onClick={() => {
                                      if (justDraggedRef.current) {
                                        justDraggedRef.current = false;
                                        return;
                                      }
                                      setEditModalTask(task);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        setEditModalTask(task);
                                      }
                                    }}
                                    className={`group flex cursor-grab active:cursor-grabbing flex-col gap-1 rounded-lg border-2 p-3 shadow-sm transition hover:shadow-md ${
                                      isMine
                                        ? "border-blue-400 bg-blue-50/60 dark:border-blue-500 dark:bg-blue-900/30"
                                        : "border-white bg-white dark:border-slate-600 dark:bg-slate-700"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleDone(task.id, task.status);
                                        }}
                                        className="shrink-0 rounded p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-[#2EABE3] dark:hover:bg-slate-600 dark:hover:text-[#2EABE3]"
                                        aria-label={
                                          isDone ? "未完了に戻す" : "完了にする"
                                        }
                                      >
                                        {isDone ? (
                                          <Check
                                            className="h-5 w-5 text-[#2EABE3]"
                                            aria-hidden
                                          />
                                        ) : (
                                          <Circle
                                            className="h-5 w-5"
                                            aria-hidden
                                          />
                                        )}
                                      </button>
                                      <span
                                        className={`min-w-0 flex-1 truncate text-sm font-medium ${
                                          isDone
                                            ? "text-slate-500 line-through dark:text-slate-400"
                                            : "text-slate-800 dark:text-slate-100"
                                        }`}
                                      >
                                        {task.title}
                                      </span>
                                      <div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            removeTask(task.id);
                                          }}
                                          className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                                          aria-label="削除"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </div>
                                    {(task.assigneeName ||
                                      formatDueDateRelative(task.dueDate) ||
                                      task.departments.length > 0) && (
                                      <div className="ml-7 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                                        {task.departments.length > 0 && (
                                          <span>
                                            部署: {task.departments.join("、")}
                                          </span>
                                        )}
                                        {task.assigneeName && (
                                          <span>
                                            担当: {task.assigneeName}
                                            {isMine && (
                                              <span className="ml-2 inline-flex items-center gap-1.5 rounded-lg border border-blue-200/60 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800 shadow-sm">
                                                <User
                                                  className="h-3.5 w-3.5 shrink-0 text-blue-600"
                                                  aria-hidden
                                                />
                                                <span className="tracking-tight">
                                                  自分
                                                </span>
                                              </span>
                                            )}
                                          </span>
                                        )}
                                        {formatDueDateRelative(task.dueDate) &&
                                          (() => {
                                            const dueLabel =
                                              formatDueDateRelative(
                                                task.dueDate,
                                              )!;
                                            const isOverdue =
                                              dueLabel.includes(
                                                "過ぎています",
                                              ) || dueLabel === "昨日";
                                            const isToday = dueLabel === "今日";
                                            const isTomorrow =
                                              dueLabel === "明日";
                                            return (
                                              <span
                                                className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-semibold shadow-sm ${
                                                  isOverdue
                                                    ? "border-amber-200/60 bg-amber-50 text-amber-800"
                                                    : isToday || isTomorrow
                                                      ? "border-[#2EABE3]/50 bg-[#2EABE3]/15 text-[#1a6b94]"
                                                      : "border-[#2EABE3]/30 bg-[#2EABE3]/10 text-[#1a6b94]"
                                                }`}
                                              >
                                                <Calendar
                                                  className={`h-4 w-4 shrink-0 ${
                                                    isOverdue
                                                      ? "text-amber-600"
                                                      : "text-[#2EABE3]"
                                                  }`}
                                                  aria-hidden
                                                />
                                                <span className="tracking-tight">
                                                  {dueLabel}
                                                </span>
                                                {isOverdue && (
                                                  <span className="ml-0.5 text-[10px] font-medium opacity-90">
                                                    期限切れ
                                                  </span>
                                                )}
                                              </span>
                                            );
                                          })()}
                                      </div>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <ul className="space-y-2">
                  {columnTasks.map((task) => {
                    const isDone = task.status === "done";
                    const isMine =
                      currentUserUid &&
                      (task.assigneeUid === currentUserUid ||
                        task.assigneeUid === ASSIGNEE_EVERYONE_UID);
                    return (
                      <li
                        key={task.id}
                        role="button"
                        tabIndex={0}
                        draggable
                        onDragStart={(e) => {
                          justDraggedRef.current = false;
                          e.dataTransfer.setData(
                            "application/x-task-id",
                            JSON.stringify({
                              taskId: task.id,
                              currentStatus: task.status,
                            }),
                          );
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragEnd={() => {
                          justDraggedRef.current = true;
                        }}
                        onClick={() => {
                          if (justDraggedRef.current) {
                            justDraggedRef.current = false;
                            return;
                          }
                          setEditModalTask(task);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setEditModalTask(task);
                          }
                        }}
                        className={`group flex cursor-grab active:cursor-grabbing flex-col gap-1 rounded-lg border-2 p-3 shadow-sm transition hover:shadow-md ${
                          isMine
                            ? "border-blue-400 bg-blue-50/60 dark:border-blue-500 dark:bg-blue-900/30"
                            : "border-white bg-white dark:border-slate-600 dark:bg-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleDone(task.id, task.status);
                            }}
                            className="shrink-0 rounded p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-[#2EABE3] dark:hover:bg-slate-600 dark:hover:text-[#2EABE3]"
                            aria-label={isDone ? "未完了に戻す" : "完了にする"}
                          >
                            {isDone ? (
                              <Check
                                className="h-5 w-5 text-[#2EABE3]"
                                aria-hidden
                              />
                            ) : (
                              <Circle className="h-5 w-5" aria-hidden />
                            )}
                          </button>
                          <span
                            className={`min-w-0 flex-1 truncate text-sm font-medium ${
                              isDone
                                ? "text-slate-500 line-through dark:text-slate-400"
                                : "text-slate-800 dark:text-slate-100"
                            }`}
                          >
                            {task.title}
                          </span>
                          <div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeTask(task.id);
                              }}
                              className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                              aria-label="削除"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        {(task.assigneeName ||
                          formatDueDateRelative(task.dueDate) ||
                          task.departments.length > 0) && (
                          <div className="ml-7 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                            {task.departments.length > 0 && (
                              <span>部署: {task.departments.join("、")}</span>
                            )}
                            {task.assigneeName && (
                              <span>
                                担当: {task.assigneeName}
                                {isMine && (
                                  <span className="ml-2 inline-flex items-center gap-1.5 rounded-lg border border-blue-200/60 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800 shadow-sm">
                                    <User
                                      className="h-3.5 w-3.5 shrink-0 text-blue-600"
                                      aria-hidden
                                    />
                                    <span className="tracking-tight">自分</span>
                                  </span>
                                )}
                              </span>
                            )}
                            {formatDueDateRelative(task.dueDate) &&
                              (() => {
                                const label = formatDueDateRelative(
                                  task.dueDate,
                                )!;
                                const isOverdue =
                                  label.includes("過ぎています") ||
                                  label === "昨日";
                                const isToday = label === "今日";
                                const isTomorrow = label === "明日";
                                return (
                                  <span
                                    className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-semibold shadow-sm ${
                                      isOverdue
                                        ? "border-amber-200/60 bg-amber-50 text-amber-800"
                                        : isToday || isTomorrow
                                          ? "border-[#2EABE3]/50 bg-[#2EABE3]/15 text-[#1a6b94]"
                                          : "border-[#2EABE3]/30 bg-[#2EABE3]/10 text-[#1a6b94]"
                                    }`}
                                  >
                                    <Calendar
                                      className={`h-4 w-4 shrink-0 ${
                                        isOverdue
                                          ? "text-amber-600"
                                          : "text-[#2EABE3]"
                                      }`}
                                      aria-hidden
                                    />
                                    <span className="tracking-tight">
                                      {label}
                                    </span>
                                    {isOverdue && (
                                      <span className="ml-0.5 text-[10px] font-medium opacity-90">
                                        期限切れ
                                      </span>
                                    )}
                                  </span>
                                );
                              })()}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
