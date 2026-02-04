"use client";

import { useEffect, useState } from "react";
import { X, Trash2 } from "lucide-react";
import type { Task, TaskStatus } from "@/types/task";
import { DEPARTMENTS, ASSIGNEE_EVERYONE_UID, ASSIGNEE_EVERYONE_LABEL } from "@/types/task";
import { Timestamp } from "firebase/firestore";
import type { Member } from "./AddTaskModal";
import { memberDisplayName } from "./AddTaskModal";

export type TaskDetailModalProps = {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  /** 次のタスクのドロップダウン用（現在のタスクを除く） */
  tasksForNext?: Task[];
  onSave: (
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
  ) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  doing: "Doing",
  done: "Done",
};

const FADE_DURATION_MS = 200;

function dueToInputValue(due: unknown): string {
  if (due == null) return "";
  if (due instanceof Timestamp) {
    const d = due.toDate();
    return d.toISOString().slice(0, 10);
  }
  return "";
}

export function TaskDetailModal({
  task,
  isOpen,
  onClose,
  members,
  tasksForNext = [],
  onSave,
  onDelete,
}: TaskDetailModalProps) {
  const [title, setTitle] = useState("");
  const [assigneeUid, setAssigneeUid] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [memo, setMemo] = useState("");
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [nextTaskId, setNextTaskId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen && task) {
      setTitle(task.title ?? "");
      setAssigneeUid(task.assigneeUid ?? "");
      setDueDate(dueToInputValue(task.dueDate));
      setMemo((task.memo as string) ?? "");
      setSelectedDepartments(task.departments?.length ? [...task.departments] : []);
      setStatus(task.status ?? "todo");
      setNextTaskId(task.nextTaskId ?? "");
      setExiting(false);
      setVisible(false);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(id);
    }
  }, [isOpen, task]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  const handleClose = () => {
    setExiting(true);
    setTimeout(() => onClose(), FADE_DURATION_MS);
  };

  const toggleDepartment = (dept: string) => {
    setSelectedDepartments((prev) =>
      prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;
    const t = title.trim();
    if (!t) return;
    const member = assigneeUid && assigneeUid !== ASSIGNEE_EVERYONE_UID
      ? members.find((m) => m.uid === assigneeUid)
      : null;
    const assigneeName =
      assigneeUid === ASSIGNEE_EVERYONE_UID
        ? ASSIGNEE_EVERYONE_LABEL
        : member
          ? memberDisplayName(member)
          : "";
    const depts = selectedDepartments.length > 0 ? selectedDepartments : [DEPARTMENTS[0]];
    setSubmitting(true);
    try {
      await onSave(task.id, {
        title: t,
        assigneeUid: assigneeUid || "",
        assigneeName,
        dueDate,
        departments: depts,
        status,
        memo: memo.trim(),
        nextTaskId: nextTaskId || null,
      });
      handleClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    if (!confirm("このタスクを削除しますか？")) return;
    setDeleting(true);
    try {
      await onDelete(task.id);
      handleClose();
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen || !task) return null;

  const overlayVisible = visible && !exiting;
  const dialogVisible = visible && !exiting;

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-black/50 transition-opacity duration-200 ${
          overlayVisible ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden
        onClick={handleClose}
      />
      <div
        className={`fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-full max-w-md md:max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl transition-all duration-200 scrollbar-hide dark:border-slate-600 dark:bg-slate-800 ${
          dialogVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="task-detail-title" className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            タスクを編集
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            aria-label="閉じる"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="edit-task-title" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              タスク名
            </label>
            <input
              id="edit-task-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#2EABE3] focus:ring-2 focus:ring-[#2EABE3]/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              required
            />
          </div>

          <div>
            <label htmlFor="edit-task-status" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              ステータス
            </label>
            <select
              id="edit-task-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#2EABE3] focus:ring-2 focus:ring-[#2EABE3]/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            >
              <option value="todo">To Do</option>
              <option value="done">Done</option>
            </select>
          </div>

          <div>
            <label htmlFor="edit-task-assignee" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              担当者
            </label>
            <select
              id="edit-task-assignee"
              value={assigneeUid}
              onChange={(e) => setAssigneeUid(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#2EABE3] focus:ring-2 focus:ring-[#2EABE3]/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            >
              <option value="">未割り当て</option>
              <option value={ASSIGNEE_EVERYONE_UID}>{ASSIGNEE_EVERYONE_LABEL}</option>
              {members.map((m) => (
                <option key={m.uid} value={m.uid}>
                  {memberDisplayName(m)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="edit-task-due" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              期限
            </label>
            <input
              id="edit-task-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#2EABE3] focus:ring-2 focus:ring-[#2EABE3]/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
          </div>

          <div>
            <label htmlFor="edit-task-next" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              次のタスク（流れの接続）
            </label>
            <select
              id="edit-task-next"
              value={nextTaskId}
              onChange={(e) => setNextTaskId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#2EABE3] focus:ring-2 focus:ring-[#2EABE3]/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            >
              <option value="">なし</option>
              {tasksForNext
                .filter((t) => t.id !== task?.id)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label htmlFor="edit-task-memo" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              メモ
            </label>
            <textarea
              id="edit-task-memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={3}
              className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#2EABE3] focus:ring-2 focus:ring-[#2EABE3]/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
          </div>

          <div>
            <span className="mb-2 block text-sm font-medium text-slate-900 dark:text-slate-100">
              担当部署（複数選択可）
            </span>
            <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-600">
              {DEPARTMENTS.map((dept) => (
                <label
                  key={dept}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 transition has-[:checked]:border-[#2EABE3] has-[:checked]:bg-[#2EABE3]/10 has-[:checked]:text-[#1a6b94] dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:has-[:checked]:bg-[#2EABE3]/20 dark:has-[:checked]:text-slate-100"
                >
                  <input
                    type="checkbox"
                    checked={selectedDepartments.includes(dept)}
                    onChange={() => toggleDepartment(dept)}
                    className="h-4 w-4 rounded border-slate-300 text-[#2EABE3] focus:ring-[#2EABE3]"
                  />
                  {dept}
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-red-900/30"
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? "削除中…" : "削除"}
            </button>
            <div className="flex flex-1 gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={submitting || !title.trim()}
                className="flex-1 rounded-lg bg-[#2EABE3] py-2.5 text-sm font-medium text-white transition hover:bg-[#2590c4] disabled:opacity-50"
              >
                {submitting ? "保存中…" : "保存"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
