"use client";

import { useState } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useTasks } from "@/contexts/TasksContext";
import { applyTaskFiltersAndSort } from "@/lib/taskFilters";
import type { Task, TaskStatus } from "@/types/task";
import { DEPARTMENTS, ASSIGNEE_EVERYONE_UID } from "@/types/task";
import { useTaskFilters } from "@/hooks/useTaskFilters";
import { Check, Circle, Trash2, Plus, Calendar, User } from "lucide-react";
import { AddTaskModal, type Member } from "./AddTaskModal";
import { TaskDetailModal } from "./TaskDetailModal";
import { FilterSortBar } from "./FilterSortBar";

function formatDueDateRelative(due: unknown): string | null {
  if (due == null) return null;
  if (due instanceof Timestamp) {
    const date = due.toDate();
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
  }
  return null;
}

export type BoardViewProps = {
  selectedDepartments: string[];
  /** メンバー一覧（親から渡す。重複購読を避けるため） */
  members: Member[];
  currentUserUid?: string | null;
};

export function BoardView({ selectedDepartments, members, currentUserUid }: BoardViewProps) {
  const { tasks } = useTasks();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDefaultDepartment, setModalDefaultDepartment] = useState<string>("");
  const [editModalTask, setEditModalTask] = useState<Task | null>(null);
  const {
    completedFilter,
    setCompletedFilter,
    sort,
    setSort,
    myTasksOnly,
    setMyTasksOnly,
  } = useTaskFilters();

  const openAddModal = (department: string) => {
    setModalDefaultDepartment(department);
    setModalOpen(true);
  };

  const defaultDepartments = modalDefaultDepartment ? [modalDefaultDepartment] : [];

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
    setModalOpen(false);
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

  const toggleDone = async (id: string, currentStatus: TaskStatus) => {
    const next = currentStatus === "done" ? "todo" : "done";
    await updateDoc(doc(getDb(), "tasks", id), { status: next });
  };

  const removeTask = async (taskId: string) => {
    await deleteDoc(doc(getDb(), "tasks", taskId));
    setEditModalTask(null);
  };

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

  const departmentsToShow =
    selectedDepartments.length === 0
      ? [...DEPARTMENTS]
      : selectedDepartments.includes("全体")
        ? [...selectedDepartments]
        : [...selectedDepartments, "全体"];

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
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultStatus="todo"
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

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max gap-4">
          {departmentsToShow.map((dept) => {
            const columnTasks = filtered.filter((t) => t.departments.includes(dept));
            return (
              <div
                key={dept}
                className="flex w-72 shrink-0 flex-col rounded-xl border-2 border-slate-200 bg-slate-50/50 p-4 shadow-sm dark:border-slate-600 dark:bg-slate-800/80"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {dept}
                  </h3>
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-600 dark:text-slate-300">
                    {columnTasks.length}件
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => openAddModal(dept)}
                  className="mb-3 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 py-2 text-xs font-medium text-slate-500 transition hover:border-[#2EABE3] hover:text-[#2EABE3] dark:border-slate-600 dark:text-slate-400"
                >
                  <Plus className="h-4 w-4" />
                  タスクを追加
                </button>
                <ul className="space-y-2">
                  {columnTasks.map((task) => {
                    const isDone = task.status === "done";
                    const isMine = currentUserUid && (task.assigneeUid === currentUserUid || task.assigneeUid === ASSIGNEE_EVERYONE_UID);
                    return (
                      <li key={task.id}>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => setEditModalTask(task)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setEditModalTask(task);
                            }
                          }}
                          className={`group flex cursor-pointer flex-col gap-1 rounded-lg border-2 p-3 shadow-sm transition hover:shadow-md ${
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
                              className={`shrink-0 rounded p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-[#2EABE3] dark:hover:bg-slate-600 dark:hover:text-[#2EABE3] ${
                                isMine ? "dark:text-slate-200" : ""
                              }`}
                              aria-label={isDone ? "未完了に戻す" : "完了にする"}
                            >
                              {isDone ? (
                                <Check className="h-5 w-5 text-[#2EABE3]" aria-hidden />
                              ) : (
                                <Circle className="h-5 w-5" aria-hidden />
                              )}
                            </button>
                            <span
                              className={`min-w-0 flex-1 truncate text-sm font-medium ${
                                isDone ? "text-slate-500 line-through dark:text-slate-400" : "text-slate-800 dark:text-slate-100"
                              }`}
                            >
                              {task.title}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeTask(task.id);
                              }}
                              className={`shrink-0 rounded p-1 opacity-80 transition hover:bg-red-50 hover:text-red-600 hover:opacity-100 dark:hover:bg-red-900/30 dark:hover:text-red-400 ${
                                isMine
                                  ? "text-slate-600 dark:text-slate-200"
                                  : "text-slate-400 dark:text-slate-400"
                              }`}
                              aria-label="削除"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          {(task.assigneeName ||
                            formatDueDateRelative(task.dueDate)) && (
                            <div className="ml-7 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                              {task.assigneeName && (
                                <span className="inline-flex items-center gap-1">
                                  担当: {task.assigneeName}
                                  {isMine && (
                                    <span className="ml-2 inline-flex items-center gap-1.5 rounded-lg border border-blue-200/60 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800 shadow-sm">
                                      <User className="h-3.5 w-3.5 shrink-0 text-blue-600" aria-hidden />
                                      <span className="tracking-tight">自分</span>
                                    </span>
                                  )}
                                </span>
                              )}
                              {formatDueDateRelative(task.dueDate) && (
                                <span className="inline-flex items-center gap-1 rounded-lg border border-[#2EABE3]/30 bg-[#2EABE3]/10 px-2 py-0.5 font-semibold text-[#1a6b94] dark:border-[#2EABE3]/60 dark:bg-[#2EABE3]/25 dark:text-slate-100">
                                  <Calendar className="h-3 w-3 dark:text-[#2EABE3]" />
                                  {formatDueDateRelative(task.dueDate)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
