"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { memberDisplayName, type Member } from "./AddTaskModal";
import { DEPARTMENTS } from "@/types/task";

const DEPT_ALL = "全体";

export type MemberDepartmentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  onSave: (memberUid: string, departments: string[]) => Promise<void>;
};

export function MemberDepartmentModal({
  isOpen,
  onClose,
  members,
  onSave,
}: MemberDepartmentModalProps) {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedDepts, setSelectedDepts] = useState<Set<string>>(new Set([DEPT_ALL]));
  const [submitting, setSubmitting] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedMember(null);
      setSelectedDepts(new Set([DEPT_ALL]));
      setExiting(false);
      setVisible(false);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(id);
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedMember) {
      const depts = selectedMember.departments ?? [];
      setSelectedDepts(new Set(depts.length > 0 ? depts : [DEPT_ALL]));
    }
  }, [selectedMember]);

  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  const handleClose = () => {
    setExiting(true);
    setVisible(false);
    setTimeout(onClose, 200);
  };

  const toggleDept = (dept: string) => {
    if (dept === DEPT_ALL) return;
    setSelectedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(dept)) next.delete(dept);
      else next.add(dept);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    const depts = Array.from(selectedDepts);
    if (!depts.includes(DEPT_ALL)) depts.unshift(DEPT_ALL);
    setSubmitting(true);
    try {
      await onSave(selectedMember.uid, depts);
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
        className={`fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl transition-all duration-200 scrollbar-hide dark:border-slate-600 dark:bg-slate-800 ${
          dialogVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-dept-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="member-dept-modal-title" className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            メンバー部署管理
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-2xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            aria-label="閉じる"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              メンバーを選択
            </label>
            <select
              value={selectedMember?.uid ?? ""}
              onChange={(e) => {
                const m = members.find((x) => x.uid === e.target.value);
                setSelectedMember(m ?? null);
              }}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-[#2EABE3] focus:ring-2 focus:ring-[#2EABE3]/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            >
              <option value="">選択してください</option>
              {members.map((m) => (
                <option key={m.uid} value={m.uid}>
                  {memberDisplayName(m)}
                </option>
              ))}
            </select>
          </div>

          {selectedMember && (
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                所属部署（複数選択可）
              </label>
              <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-600 dark:bg-slate-700/30">
                {(DEPARTMENTS as readonly string[]).map((dept) => (
                  <label
                    key={dept}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 transition ${
                      dept === DEPT_ALL
                        ? "cursor-not-allowed bg-slate-100 dark:bg-slate-600/50"
                        : "hover:bg-slate-100 dark:hover:bg-slate-600/30"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDepts.has(dept)}
                      disabled={dept === DEPT_ALL}
                      onChange={() => toggleDept(dept)}
                      className="h-4 w-4 rounded border-slate-300 text-[#2EABE3] focus:ring-[#2EABE3]"
                    />
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      {dept}
                      {dept === DEPT_ALL && (
                        <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">
                          （常に選択）
                        </span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting || !selectedMember}
              className="rounded-2xl bg-[#2EABE3] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#2590c4] disabled:opacity-50"
            >
              {submitting ? "保存中…" : "保存"}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
