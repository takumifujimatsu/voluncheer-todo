"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { TaskStatus } from "@/types/task";
import { DEPARTMENTS, ALL_DEPARTMENTS_LABEL, ASSIGNEE_EVERYONE_UID, ASSIGNEE_EVERYONE_LABEL } from "@/types/task";

export type Member = {
  uid: string;
  name: string;
  displayName: string;
  email: string;
};

/** 担当者として表示する名前（登録名 > Google表示名 > メール） */
export function memberDisplayName(m: Member): string {
  return (m.name || m.displayName || m.email || "").trim() || "（名前未設定）";
}

export type AddTaskModalProps = {
  isOpen: boolean;
  onClose: () => void;
  defaultStatus: TaskStatus;
  /** 開いている部署が特定のとき、その部署を先にチェックした状態にする */
  defaultDepartments: string[];
  /** カレンダーから開いたときなど、期限の初期値（YYYY-MM-DD） */
  defaultDueDate?: string;
  members: Member[];
  onSubmit: (params: {
    title: string;
    assigneeUid: string;
    assigneeName: string;
    dueDate: string;
    departments: string[];
    status: TaskStatus;
    memo: string;
  }) => Promise<void>;
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  doing: "Doing",
  done: "Done",
};

const FADE_DURATION_MS = 200;

export function AddTaskModal({
  isOpen,
  onClose,
  defaultStatus,
  defaultDepartments,
  defaultDueDate,
  members,
  onSubmit,
}: AddTaskModalProps) {
  const [title, setTitle] = useState("");
  const [assigneeUid, setAssigneeUid] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [memo, setMemo] = useState("");
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setSelectedDepartments([...defaultDepartments]);
      setAssigneeUid("");
      setDueDate(defaultDueDate ?? "");
      setMemo("");
      setExiting(false);
      setVisible(false);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(id);
    }
  }, [isOpen, defaultDepartments, defaultDueDate]);

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
    setTimeout(() => {
      onClose();
    }, FADE_DURATION_MS);
  };

  const toggleDepartment = (dept: string) => {
    setSelectedDepartments((prev) =>
      prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    const depts =
      selectedDepartments.length > 0 ? selectedDepartments : [DEPARTMENTS[0]];
    setSubmitting(true);
    try {
      await onSubmit({
        title: t,
        assigneeUid: assigneeUid || "",
        assigneeName,
        dueDate,
        departments: depts,
        status: defaultStatus,
        memo: memo.trim(),
      });
      handleClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

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
        aria-labelledby="add-task-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="add-task-title" className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {STATUS_LABELS[defaultStatus]} に追加
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
            <label
              htmlFor="task-title"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              タスク名
            </label>
            <input
              id="task-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="タスク名を入力"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:border-[#2EABE3] focus:ring-2 focus:ring-[#2EABE3]/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
              autoFocus
              required
            />
          </div>

          <div>
            <label
              htmlFor="task-assignee"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              担当者
            </label>
            <select
              id="task-assignee"
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
            <label
              htmlFor="task-due"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              期限（任意）
            </label>
            <input
              id="task-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#2EABE3] focus:ring-2 focus:ring-[#2EABE3]/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="task-memo"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              メモ（任意）
            </label>
            <textarea
              id="task-memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="メモを入力"
              rows={3}
              className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:border-[#2EABE3] focus:ring-2 focus:ring-[#2EABE3]/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
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
            {selectedDepartments.length === 0 && (
              <p className="mt-1 text-xs text-slate-500">
                1つ以上選択してください（未選択の場合は全体になります）
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
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
              {submitting ? "追加中…" : "追加"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
