"use client";

import { useEffect, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { memberDisplayName, type Member } from "./AddTaskModal";
import { getWeekLabel } from "@/lib/weekUtils";

export type FeedbackForWeek = {
  score: number;
  plusText: string;
  minusText: string;
};

export type OneOnOneFeedbackModalProps = {
  isOpen: boolean;
  onClose: () => void;
  member: Member;
  /** 週キー一覧（新しい順） */
  weekOptions: string[];
  /** 開いたときの週 */
  selectedWeekKey: string;
  /** 週ごとのフィードバック（未設定週はデフォルト値） */
  feedbackByWeek: Record<string, FeedbackForWeek>;
  onSubmit: (
    weekKey: string,
    params: { score: number; plusText: string; minusText: string }
  ) => Promise<void>;
};

export function OneOnOneFeedbackModal({
  isOpen,
  onClose,
  member,
  weekOptions,
  selectedWeekKey,
  feedbackByWeek,
  onSubmit,
}: OneOnOneFeedbackModalProps) {
  const [currentWeekKey, setCurrentWeekKey] = useState(selectedWeekKey);
  const [score, setScore] = useState(5);
  const [plusText, setPlusText] = useState("");
  const [minusText, setMinusText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [visible, setVisible] = useState(false);

  const loadWeekData = (weekKey: string) => {
    const data = feedbackByWeek[weekKey];
    setScore(data?.score ?? 5);
    setPlusText(data?.plusText ?? "");
    setMinusText(data?.minusText ?? "");
  };

  useEffect(() => {
    if (isOpen) {
      setCurrentWeekKey(selectedWeekKey);
      loadWeekData(selectedWeekKey);
      setExiting(false);
      setVisible(false);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(id);
    }
  }, [isOpen, selectedWeekKey]);

  useEffect(() => {
    if (isOpen) loadWeekData(currentWeekKey);
  }, [currentWeekKey, isOpen]);

  const handleClose = () => {
    setExiting(true);
    setVisible(false);
    setTimeout(onClose, 200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(currentWeekKey, {
        score,
        plusText: plusText.trim(),
        minusText: minusText.trim(),
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
        className={`fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl transition-all duration-200 scrollbar-hide dark:border-slate-600 dark:bg-slate-800 ${
          dialogVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="oneonone-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="oneonone-modal-title" className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            1on1フィードバック — {memberDisplayName(member)}
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

        {/* 週切り替え */}
        <div className="mb-4">
          <label htmlFor="oneonone-week" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            対象週
          </label>
          <div className="relative">
            <select
              id="oneonone-week"
              value={currentWeekKey}
              onChange={(e) => setCurrentWeekKey(e.target.value)}
              className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 pr-9 text-sm text-slate-900 outline-none focus:border-[#2EABE3] focus:ring-2 focus:ring-[#2EABE3]/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            >
              {weekOptions.map((wk) => (
                <option key={wk} value={wk}>
                  {getWeekLabel(wk)}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="oneonone-score" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              仕事の調子（10点満点）
            </label>
            <select
              id="oneonone-score"
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#2EABE3] focus:ring-2 focus:ring-[#2EABE3]/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <option key={n} value={n}>
                  {n}点
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="oneonone-plus" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              プラスだったこと
            </label>
            <textarea
              id="oneonone-plus"
              value={plusText}
              onChange={(e) => setPlusText(e.target.value)}
              placeholder="良かった点を入力"
              rows={3}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:border-[#2EABE3] focus:ring-2 focus:ring-[#2EABE3]/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
            />
          </div>
          <div>
            <label htmlFor="oneonone-minus" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              マイナスだったこと・課題
            </label>
            <textarea
              id="oneonone-minus"
              value={minusText}
              onChange={(e) => setMinusText(e.target.value)}
              placeholder="課題や改善点を入力"
              rows={3}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:border-[#2EABE3] focus:ring-2 focus:ring-[#2EABE3]/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
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
