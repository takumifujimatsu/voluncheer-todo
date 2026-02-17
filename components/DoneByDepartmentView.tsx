"use client";

import { useEffect, useRef, useState } from "react";
import {
  collection,
  doc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { Timestamp } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { getDueTime } from "@/lib/taskFilters";
import type { Task, TaskStatus } from "@/types/task";
import { DEPARTMENTS, ASSIGNEE_EVERYONE_UID } from "@/types/task";
import { Check, ChevronDown, ChevronRight, Pencil, Trash2, User } from "lucide-react";
import type { Member } from "./AddTaskModal";
import { TaskDetailModal } from "./TaskDetailModal";

export type DoneByDepartmentViewProps = {
  selectedDepartments: string[];
  currentUserUid?: string | null;
};

function formatDueDateOnly(due: unknown): string {
  if (due == null) return "—";
  if (due instanceof Timestamp) {
    const d = due.toDate();
    return d.toISOString().slice(0, 10);
  }
  return "—";
}

export function DoneByDepartmentView({
  selectedDepartments,
  currentUserUid,
}: DoneByDepartmentViewProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [editModalTask, setEditModalTask] = useState<Task | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    task: Task;
    x: number;
    y: number;
  } | null>(null);
  const [deleteConfirmTask, setDeleteConfirmTask] = useState<Task | null>(null);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleteConfirmExiting, setDeleteConfirmExiting] = useState(false);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [collapsedDepartments, setCollapsedDepartments] = useState<Set<string>>(
    new Set(),
  );
  const DELETE_CONFIRM_DURATION_MS = 200;

  useEffect(() => {
    const db = getDb();
    const q = query(
      collection(db, "tasks"),
      orderBy("createdAt", "desc"),
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

  const doneTasks = byDepartment.filter((t) => t.status === "done");
  const deptsToShow =
    selectedDepartments.length === 0 ? [...DEPARTMENTS] : selectedDepartments;

  const grouped =
    deptsToShow.length > 0
      ? deptsToShow.map((department) => {
          const deptTasks = doneTasks
            .filter((t) => t.departments.includes(department))
            .sort((a, b) => {
              const ta = getDueTime(a.dueDate);
              const tb = getDueTime(b.dueDate);
              if (ta === 0 && tb === 0) return 0;
              if (ta === 0) return 1;
              if (tb === 0) return -1;
              return tb - ta;
            });
          return { department, tasks: deptTasks };
        })
      : [];

  const removeTask = async (id: string) => {
    await deleteDoc(doc(getDb(), "tasks", id));
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
    setEditModalTask(null);
  };

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

  const toggleDepartmentCollapse = (department: string) => {
    setCollapsedDepartments((prev) => {
      const next = new Set(prev);
      if (next.has(department)) next.delete(department);
      else next.add(department);
      return next;
    });
  };

  return (
    <div className="space-y-6">
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
              setTimeout(
                () => setDeleteConfirmTask(null),
                DELETE_CONFIRM_DURATION_MS,
              );
            }}
          />
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 pointer-events-none"
            role="dialog"
            aria-modal="true"
            aria-labelledby="done-delete-confirm-title"
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
                id="done-delete-confirm-title"
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
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
          完了タスク（部署別）
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          期日が新しい順に表示しています。
        </p>
      </div>

      <div className="space-y-3">
        {grouped.map(({ department, tasks: deptTasks }) => {
          const isCollapsed = collapsedDepartments.has(department);
          return (
            <div
              key={department}
              className="rounded-lg border border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-700/50"
            >
              <button
                type="button"
                onClick={() => toggleDepartmentCollapse(department)}
                className="flex w-full items-center gap-2 rounded-t-lg border-b border-slate-200 bg-slate-100/80 px-3 py-2.5 text-left transition hover:bg-slate-200/80 dark:border-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600"
                aria-expanded={!isCollapsed}
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
                <span className="shrink-0 rounded-full bg-slate-300/80 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-500 dark:text-slate-200">
                  {deptTasks.length}件
                </span>
              </button>
              {!isCollapsed && (
                <ul className="divide-y divide-slate-200 dark:divide-slate-600">
                  {deptTasks.length === 0 ? (
                    <li className="px-3 py-4 text-center text-sm text-slate-500 dark:text-slate-400">
                      この部署の完了タスクはありません
                    </li>
                  ) : (
                    deptTasks.map((task) => {
                      const isMine =
                        currentUserUid &&
                        (task.assigneeUid === currentUserUid ||
                          task.assigneeUid === ASSIGNEE_EVERYONE_UID);
                      return (
                        <li
                          key={task.id}
                          role="button"
                          tabIndex={0}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setContextMenu({
                              task,
                              x: e.clientX,
                              y: e.clientY,
                            });
                          }}
                          onClick={() => setEditModalTask(task)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setEditModalTask(task);
                            }
                          }}
                          className="flex cursor-pointer items-center gap-3 px-3 py-2.5 transition hover:bg-slate-50 dark:hover:bg-slate-600/50"
                        >
                          <Check
                            className="h-5 w-5 shrink-0 text-[#2EABE3]"
                            aria-hidden
                          />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700 line-through dark:text-slate-300">
                            {task.title}
                          </span>
                          {task.assigneeName && (
                            <span className="flex shrink-0 items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                              <User className="h-3.5 w-3.5" aria-hidden />
                              {task.assigneeName}
                              {isMine && (
                                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
                                  自分
                                </span>
                              )}
                            </span>
                          )}
                          <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                            {formatDueDateOnly(task.dueDate)}
                          </span>
                        </li>
                      );
                    })
                  )}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
