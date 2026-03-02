"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { memberDisplayName, type Member } from "./AddTaskModal";

export type PeerBonusModalProps = {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  /** 初期選択の宛先（メンバーカードから開いた場合） */
  defaultToUid?: string;
  onSubmit: (params: { toUid: string; message: string }) => Promise<void>;
};

export function PeerBonusModal({
  isOpen,
  onClose,
  members,
  defaultToUid,
  onSubmit,
}: PeerBonusModalProps) {
  const [toUid, setToUid] = useState(defaultToUid ?? "");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setToUid(defaultToUid ?? "");
      setMessage("");
      setExiting(false);
      setVisible(false);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(id);
    }
  }, [isOpen, defaultToUid]);

  const handleClose = () => {
    setExiting(true);
    setVisible(false);
    setTimeout(onClose, 200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || !toUid) return;
    setSubmitting(true);
    try {
      await onSubmit({ toUid, message: trimmed });
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
        aria-labelledby="peerbonus-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="peerbonus-modal-title" className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            ありがとうを贈る
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
            <label htmlFor="peerbonus-to" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              宛先
            </label>
            <select
              id="peerbonus-to"
              value={toUid}
              onChange={(e) => setToUid(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#2EABE3] focus:ring-2 focus:ring-[#2EABE3]/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              required
            >
              <option value="">選択してください</option>
              {members.map((m) => (
                <option key={m.uid} value={m.uid}>
                  {memberDisplayName(m)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="peerbonus-message" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              感謝のメッセージ
            </label>
            <textarea
              id="peerbonus-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="感謝の気持ちを伝えましょう"
              rows={4}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:border-[#2EABE3] focus:ring-2 focus:ring-[#2EABE3]/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
              required
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting || !message.trim() || !toUid}
              className="rounded-2xl bg-[#2EABE3] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#2590c4] disabled:opacity-50"
            >
              {submitting ? "送信中…" : "送信"}
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
