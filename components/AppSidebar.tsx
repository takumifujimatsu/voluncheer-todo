"use client";

import { Sun, Moon, Monitor, LogOut, X, User } from "lucide-react";

export type AppSidebarProps = {
  userDisplayName: string;
  onProfileClick: () => void;
  theme: "light" | "dark" | "system";
  setTheme: (t: "light" | "dark" | "system") => void;
  onSignOut: () => void;
  /** モバイル用ドロワー時に閉じるコールバック（指定時は閉じるボタンを表示） */
  onClose?: () => void;
};

export function AppSidebar({
  userDisplayName,
  onProfileClick,
  theme,
  setTheme,
  onSignOut,
  onClose,
}: AppSidebarProps) {
  return (
    <aside className="flex h-full flex-col border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      {onClose && (
        <div className="flex items-center justify-between border-b border-slate-200 p-3 dark:border-slate-700 md:hidden">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">メニュー</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            aria-label="閉じる"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
      <nav className="flex flex-1 flex-col gap-1 p-3">
        <button
          type="button"
          onClick={onProfileClick}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
          title="プロフィールを開く"
        >
          <User className="h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" />
          <span className="min-w-0 truncate">{userDisplayName}</span>
        </button>

        <div className="my-2 border-t border-slate-200 dark:border-slate-700" />
        <p className="px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
          テーマ
        </p>
        <button
          type="button"
          onClick={() => setTheme("light")}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
            theme === "light"
              ? "bg-slate-100 font-medium text-slate-800 dark:bg-slate-700 dark:text-slate-100"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
          }`}
        >
          <Sun className="h-5 w-5 shrink-0" />
          ライト
        </button>
        <button
          type="button"
          onClick={() => setTheme("dark")}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
            theme === "dark"
              ? "bg-slate-100 font-medium text-slate-800 dark:bg-slate-700 dark:text-slate-100"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
          }`}
        >
          <Moon className="h-5 w-5 shrink-0" />
          ダーク
        </button>
        <button
          type="button"
          onClick={() => setTheme("system")}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
            theme === "system"
              ? "bg-slate-100 font-medium text-slate-800 dark:bg-slate-700 dark:text-slate-100"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
          }`}
        >
          <Monitor className="h-5 w-5 shrink-0" />
          システム
        </button>

        <div className="my-2 border-t border-slate-200 dark:border-slate-700" />
        <button
          type="button"
          onClick={onSignOut}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
          aria-label="ログアウト"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          ログアウト
        </button>
      </nav>
    </aside>
  );
}
