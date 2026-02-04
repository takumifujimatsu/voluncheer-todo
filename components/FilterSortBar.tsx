"use client";

import type { CompletedFilter, TaskSort } from "@/lib/taskFilters";

export type FilterSortBarProps = {
  completedFilter: CompletedFilter;
  onCompletedFilterChange: (value: CompletedFilter) => void;
  sort: TaskSort;
  onSortChange: (value: TaskSort) => void;
  myTasksOnly: boolean;
  onMyTasksOnlyChange: (value: boolean) => void;
  currentUserUid?: string | null;
};

export function FilterSortBar({
  completedFilter,
  onCompletedFilterChange,
  sort,
  onSortChange,
  myTasksOnly,
  onMyTasksOnlyChange,
  currentUserUid,
}: FilterSortBarProps) {
  const displayOptions = [
    ["all", "すべて"],
    ["incomplete", "未完了"],
    ["complete", "完了"],
  ] as const;

  const sortOptions = [
    ["created", "追加順"],
    ["dueAsc", "期日が近い順"],
    ["dueDesc", "期日が遅い順"],
    ...(currentUserUid ? [["myTasksFirst", "自分のタスクを上に"] as const] : []),
  ] as const;

  const btnBase =
    "rounded-lg text-sm font-medium transition sm:rounded-md sm:px-3 sm:py-1.5 sm:text-sm";
  const btnActive =
    "bg-white text-slate-800 shadow-sm dark:bg-slate-600 dark:text-slate-100";
  const btnInactive =
    "text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200";

  return (
    <div className="space-y-4 sm:flex sm:flex-row sm:flex-wrap sm:items-center sm:gap-6 sm:space-y-0">
      {/* 表示 */}
      <section className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-600 dark:bg-slate-700/80 sm:flex-row sm:items-center sm:gap-3 sm:rounded-lg sm:border-0 sm:bg-transparent sm:p-0 dark:sm:bg-transparent">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 sm:text-sm sm:normal-case sm:tracking-normal sm:text-slate-600 dark:sm:text-slate-400">
          表示
        </p>
        <div className="grid grid-cols-3 gap-1.5 sm:flex sm:rounded-lg sm:border sm:border-slate-200 sm:bg-slate-50/80 sm:p-0.5 dark:sm:border-slate-600 dark:sm:bg-slate-700/80">
          {displayOptions.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => onCompletedFilterChange(value)}
              className={`${btnBase} py-2.5 sm:rounded-md sm:px-3 sm:py-1.5 ${completedFilter === value ? btnActive : btnInactive}`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {currentUserUid && (
        <>
          <div className="hidden shrink-0 border-l border-slate-200 sm:block sm:self-stretch dark:border-slate-600" aria-hidden />
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3 dark:border-slate-600 dark:bg-slate-700/80 sm:rounded-lg sm:py-2.5">
            <input
              type="checkbox"
              checked={myTasksOnly}
              onChange={(e) => onMyTasksOnlyChange(e.target.checked)}
              className="h-5 w-5 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-500"
            />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">自分のタスクのみ</span>
          </label>
        </>
      )}

      {/* 並び替え */}
      <section className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-600 dark:bg-slate-700/80 sm:flex-row sm:items-center sm:gap-3 sm:rounded-none sm:border-0 sm:border-l sm:border-slate-200 sm:bg-transparent sm:p-0 dark:sm:border-slate-600 dark:sm:bg-transparent">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 sm:text-sm sm:normal-case sm:tracking-normal sm:text-slate-600 dark:sm:text-slate-400">
          並び替え
        </p>
        <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:rounded-lg sm:border sm:border-slate-200 sm:bg-slate-50/80 sm:p-0.5 dark:sm:border-slate-600 dark:sm:bg-slate-700/80">
          {sortOptions.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => onSortChange(value)}
              className={`${btnBase} py-2.5 text-left sm:rounded-md sm:px-3 sm:py-1.5 sm:text-center ${
                sort === value ? btnActive : btnInactive
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
