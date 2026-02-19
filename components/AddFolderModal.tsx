"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { ResourceFolder } from "@/types/resource";

export type AddFolderModalProps = {
  isOpen: boolean;
  onClose: () => void;
  folders: ResourceFolder[];
  defaultParentId: string | null;
  /** 指定時は名前変更モード（フォルダ名のみ編集） */
  editFolder?: ResourceFolder | null;
  onSubmit: (params: { name: string; parentId: string | null }) => Promise<void>;
};

const FADE_DURATION_MS = 200;

export function AddFolderModal({
  isOpen,
  onClose,
  folders,
  defaultParentId,
  editFolder,
  onSubmit,
}: AddFolderModalProps) {
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string | null>(defaultParentId);
  const [submitting, setSubmitting] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editFolder) {
        setName(editFolder.name);
        setParentId(editFolder.parentId);
      } else {
        setName("");
        setParentId(defaultParentId);
      }
      setExiting(false);
      setVisible(false);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(id);
    }
  }, [isOpen, defaultParentId, editFolder]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    setSubmitting(true);
    try {
      await onSubmit({ name: n, parentId });
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
        className={`fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl transition-all duration-200 dark:border-slate-600 dark:bg-slate-800 ${
          dialogVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-folder-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="add-folder-title"
            className="text-lg font-semibold text-slate-800 dark:text-slate-100"
          >
            {editFolder ? "フォルダ名を変更" : "フォルダを追加"}
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
              htmlFor="folder-name"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              フォルダ名
            </label>
            <input
              id="folder-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="フォルダ名を入力"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:border-[#2EABE3] focus:ring-2 focus:ring-[#2EABE3]/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
              autoFocus
              required
            />
          </div>

          {!editFolder && (
            <div>
              <label
                htmlFor="folder-parent"
                className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                親フォルダ
              </label>
              <select
                id="folder-parent"
                value={parentId ?? ""}
                onChange={(e) =>
                  setParentId(e.target.value === "" ? null : e.target.value)
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#2EABE3] focus:ring-2 focus:ring-[#2EABE3]/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              >
                <option value="">ルート（一番上）</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          )}

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
              disabled={submitting || !name.trim()}
              className="flex-1 rounded-lg bg-[#2EABE3] py-2.5 text-sm font-medium text-white transition hover:bg-[#2590c4] disabled:opacity-50"
            >
              {submitting
                ? editFolder
                  ? "変更中…"
                  : "追加中…"
                : editFolder
                  ? "変更"
                  : "追加"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
