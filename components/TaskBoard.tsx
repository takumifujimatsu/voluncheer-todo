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
import { getDb } from "@/lib/firebase";
import { applyTaskFiltersAndSort, getDueTime } from "@/lib/taskFilters";
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
  Pencil,
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
  /** 右クリック／2本指タップで表示するコンテキストメニュー */
  const [contextMenu, setContextMenu] = useState<{
    task: Task;
    x: number;
    y: number;
  } | null>(null);
  /** 削除確認モーダルで表示するタスク（null のとき非表示） */
  const [deleteConfirmTask, setDeleteConfirmTask] = useState<Task | null>(null);
  const justDraggedRef = useRef(false);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
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
    const db = getDb();
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
    const db = getDb();
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
    await addDoc(collection(getDb(), "tasks"), {
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
  };

  const toggleDone = async (id: string, currentStatus: TaskStatus) => {
    const next = currentStatus === "done" ? "todo" : "done";
    await updateDoc(doc(getDb(), "tasks", id), { status: next });
  };

  const updateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    await updateDoc(doc(getDb(), "tasks", taskId), { status: newStatus });
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
    await deleteDoc(doc(getDb(), "tasks", id));
  };

  /** 削除確認モーダルの表示・フェードアウト用 */
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleteConfirmExiting, setDeleteConfirmExiting] = useState(false);
  const DELETE_CONFIRM_DURATION_MS = 200;

  useEffect(() => {
    if (deleteConfirmTask) {
      setDeleteConfirmExiting(false);
      setDeleteConfirmVisible(false);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setDeleteConfirmVisible(true));
      });
      return () => cancelAnimationFrame(id);
    } else {
      setDeleteConfirmVisible(false);
      setDeleteConfirmExiting(false);
    }
  }, [deleteConfirmTask]);

  /** コンテキストメニュー外クリックで閉じる */
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const handleClick = (e: MouseEvent) => {
      if (contextMenuRef.current?.contains(e.target as Node)) return;
      close();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("click", handleClick, true);
    window.addEventListener("contextmenu", close, true);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("click", handleClick, true);
      window.removeEventListener("contextmenu", close, true);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [contextMenu]);

  return (
    <div className="min-w-0 space-y-6">
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
        onDelete={async (id) => {
          const t = tasks.find((x) => x.id === id);
          if (t) {
            setEditModalTask(null);
            setDeleteConfirmTask(t);
          }
        }}
      />

      {/* 右クリック／2本指タップで表示するコンテキストメニュー */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-[100] min-w-[160px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-800"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
            onClick={() => {
              setEditModalTask(contextMenu.task);
              setContextMenu(null);
            }}
          >
            <Pencil className="h-4 w-4 shrink-0" aria-hidden />
            編集
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
            onClick={() => {
              setDeleteConfirmTask(contextMenu.task);
              setContextMenu(null);
            }}
          >
            <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
            削除
          </button>
        </div>
      )}

      {/* 削除確認モーダル（フェード・スケールのアニメーション付き） */}
      {deleteConfirmTask && (
        <>
          <div
            className={`fixed inset-0 z-[110] bg-black/50 transition-opacity duration-200 ${
              deleteConfirmVisible && !deleteConfirmExiting
                ? "opacity-100"
                : "opacity-0"
            }`}
            aria-hidden
            onClick={() => {
              setDeleteConfirmExiting(true);
              setTimeout(() => setDeleteConfirmTask(null), DELETE_CONFIRM_DURATION_MS);
            }}
          />
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 pointer-events-none"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-confirm-title"
          >
            <div
              className={`pointer-events-auto w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl transition-all duration-200 dark:border-slate-600 dark:bg-slate-800 ${
                deleteConfirmVisible && !deleteConfirmExiting
                  ? "scale-100 opacity-100"
                  : "scale-95 opacity-0"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <h2
                id="delete-confirm-title"
                className="text-lg font-semibold text-slate-800 dark:text-slate-100"
              >
                タスクを削除しますか？
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                「{deleteConfirmTask.title}」を削除すると元に戻せません。
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteConfirmExiting(true);
                    setTimeout(
                      () => setDeleteConfirmTask(null),
                      DELETE_CONFIRM_DURATION_MS,
                    );
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const id = deleteConfirmTask.id;
                    setDeleteConfirmExiting(true);
                    setTimeout(() => {
                      removeTask(id);
                      setDeleteConfirmTask(null);
                    }, DELETE_CONFIRM_DURATION_MS);
                  }}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  削除
                </button>
              </div>
            </div>
          </div>
        </>
      )}

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

      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        {STATUSES.map(({ key, label, bg }) => {
          let columnTasks =
            key === "todo"
              ? filtered.filter(
                  (t) => t.status === "todo" || t.status === "doing",
                )
              : filtered.filter((t) => t.status === key);
          // Done は期日が近い順（新しい順）で表示し、昔のタスクが下に溜まるようにする
          if (key === "done") {
            columnTasks = [...columnTasks].sort((a, b) => {
              const ta = getDueTime(a.dueDate);
              const tb = getDueTime(b.dueDate);
              if (ta === 0 && tb === 0) return 0;
              if (ta === 0) return 1;
              if (tb === 0) return -1;
              return tb - ta; // 期日が新しい順
            });
          }
          const grouped = groupTasksByDisplayDepartment(
            columnTasks,
            key as "todo" | "done",
          );
          const showByDepartment =
            (selectedDepartments.length === 0 ||
              selectedDepartments.length >= 2) &&
            grouped.length > 0;
          const isDropTarget = dragOverColumn === key;
          return (
            <div
              key={key}
              className={`min-w-0 rounded-xl border-2 p-4 shadow-sm transition-colors ${
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
                                    onContextMenu={(e) => {
                                      e.preventDefault();
                                      setContextMenu({
                                        task,
                                        x: e.clientX,
                                        y: e.clientY,
                                      });
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
                                    className={`group flex min-w-0 cursor-grab active:cursor-grabbing flex-col gap-1 rounded-lg border-2 p-3 shadow-sm transition hover:shadow-md ${
                                      isMine
                                        ? "border-blue-400 bg-blue-50/60 dark:border-blue-500 dark:bg-blue-900/30"
                                        : "border-white bg-white dark:border-slate-600 dark:bg-slate-700"
                                    }`}
                                  >
                                    <div className="flex min-w-0 items-center gap-2">
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
                                            setDeleteConfirmTask(task);
                                          }}
                                          className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                                          aria-label="削除"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </div>
                                    {(task.assigneeName ||
                                      (!isDone &&
                                        formatDueDateRelative(task.dueDate)) ||
                                      task.departments.length > 0) && (
                                      <div className="ml-7 min-w-0 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
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
                                        {!isDone &&
                                          formatDueDateRelative(task.dueDate) &&
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
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setContextMenu({
                            task,
                            x: e.clientX,
                            y: e.clientY,
                          });
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
                        className={`group flex min-w-0 cursor-grab active:cursor-grabbing flex-col gap-1 rounded-lg border-2 p-3 shadow-sm transition hover:shadow-md ${
                          isMine
                            ? "border-blue-400 bg-blue-50/60 dark:border-blue-500 dark:bg-blue-900/30"
                            : "border-white bg-white dark:border-slate-600 dark:bg-slate-700"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-2">
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
                                setDeleteConfirmTask(task);
                              }}
                              className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                              aria-label="削除"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        {(task.assigneeName ||
                          (!isDone &&
                            formatDueDateRelative(task.dueDate)) ||
                          task.departments.length > 0) && (
                          <div className="ml-7 min-w-0 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
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
                            {!isDone &&
                              formatDueDateRelative(task.dueDate) &&
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
