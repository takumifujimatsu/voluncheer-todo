"use client";

import { useEffect, useState } from "react";
import { X, Trash2 } from "lucide-react";
import { memberDisplayName, type Member } from "./AddTaskModal";

const ALLOW_DELETE_MEMBERS_EMAIL = "fujimatsu.t@voluncheer.or.jp";

export type ProfileModalProps = {
  isOpen: boolean;
  onClose: () => void;
  /** 現在の表示名（Firestore の name または Google displayName） */
  currentName: string;
  /** 現在の所属部署（表示のみ、管理者が設定） */
  currentDepartments: string[];
  /** メールアドレス（変更不可・表示のみ） */
  email: string | null;
  members: Member[];
  onSaveProfile: (name: string) => Promise<void>;
  /** このメールでログインしている場合、メンバー一覧で各メンバーを削除できる */
  onDeleteMember?: (uid: string) => Promise<void>;
};

export function ProfileModal({
  isOpen,
  onClose,
  currentName,
  currentDepartments,
  email,
  members,
  onSaveProfile,
  onDeleteMember,
}: ProfileModalProps) {
  const [name, setName] = useState(currentName);
  const [submitting, setSubmitting] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [visible, setVisible] = useState(false);
  const [deletingUid, setDeletingUid] = useState<string | null>(null);

  const canDeleteMembers =
    email === ALLOW_DELETE_MEMBERS_EMAIL && typeof onDeleteMember === "function";

  useEffect(() => {
    if (isOpen) {
      setName(currentName);
      setExiting(false);
      setVisible(false);
      setDeletingUid(null);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(id);
    }
  }, [isOpen, currentName]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      await onSaveProfile(trimmed);
      handleClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMember = async (uid: string) => {
    if (!onDeleteMember) return;
    setDeletingUid(uid);
    try {
      await onDeleteMember(uid);
      setDeletingUid(null);
    } finally {
      setDeletingUid(null);
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
        aria-labelledby="profile-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="profile-modal-title" className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            プロフィール
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
            <label htmlFor="profile-name" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              表示名
            </label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="表示名を入力"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:border-[#2EABE3] focus:ring-2 focus:ring-[#2EABE3]/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              所属部署
            </label>
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-700/80 dark:text-slate-400">
              {currentDepartments.length > 0 ? currentDepartments.join("、") : "未設定"}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              部署は管理者が設定します
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              メールアドレス
            </label>
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-700/80 dark:text-slate-400">
              {email ?? "—"}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              メールアドレスは変更できません
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="rounded-lg bg-[#2EABE3] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#2590c4] disabled:opacity-50"
            >
              {submitting ? "保存中…" : "保存"}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              キャンセル
            </button>
          </div>
        </form>

        <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-600">
          <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
            メンバー一覧
          </h3>
          <ul className="max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/50 p-2 scrollbar-hide dark:border-slate-600 dark:bg-slate-700/50">
            {members.length === 0 ? (
              <li className="py-2 text-center text-sm text-slate-500 dark:text-slate-400">
                メンバーがいません
              </li>
            ) : (
              members.map((m) => (
                <li
                  key={m.uid}
                  className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm text-slate-800 dark:text-slate-200"
                >
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium">{memberDisplayName(m)}</span>
                    {m.departments?.length > 0 && (
                      <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">
                        （{m.departments.join("、")}）
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 truncate text-xs text-slate-500 dark:text-slate-400" title={m.email}>
                    {m.email}
                  </span>
                  {canDeleteMembers && (
                    <button
                      type="button"
                      onClick={() => window.confirm(`${memberDisplayName(m)} をメンバー一覧から削除しますか？`) && handleDeleteMember(m.uid)}
                      disabled={deletingUid !== null}
                      className="shrink-0 rounded p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 disabled:opacity-50"
                      aria-label={`${memberDisplayName(m)} を削除`}
                      title="メンバーを削除"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </>
  );
}
