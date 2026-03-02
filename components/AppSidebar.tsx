"use client";

import { useState, useEffect, useRef } from "react";
import {
  Sun,
  Moon,
  Monitor,
  LogOut,
  X,
  User,
  Building2,
  Settings,
  List,
  CalendarDays,
  LayoutGrid,
  GanttChart,
  BarChart2,
  Library,
  LayoutDashboard,
} from "lucide-react";
import type { ViewMode } from "@/hooks/useAppUrlState";

const NAV_ITEMS: { view: ViewMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { view: "list", label: "リスト", icon: List },
  { view: "calendar", label: "カレンダー", icon: CalendarDays },
  { view: "board", label: "ボード", icon: LayoutGrid },
  { view: "timeline", label: "タイムライン", icon: GanttChart },
  { view: "analysis", label: "分析", icon: BarChart2 },
  { view: "library", label: "資料室", icon: Library },
  { view: "dashboard", label: "ダッシュボード", icon: LayoutDashboard },
];

export type AppSidebarProps = {
  userDisplayName: string;
  onProfileClick: () => void;
  theme: "light" | "dark" | "system";
  setTheme: (t: "light" | "dark" | "system") => void;
  onSignOut: () => void;
  /** モバイル用ドロワー時に閉じるコールバック（指定時は閉じるボタンを表示） */
  onClose?: () => void;
  /** メンバー部署管理（管理者のみ表示） */
  onDepartmentManageClick?: () => void;
  /** 現在のビュー */
  viewMode?: ViewMode;
  /** ビュー変更時（ナビクリック時、モバイルでは onClose も呼ぶ想定） */
  onViewChange?: (view: ViewMode) => void;
};

export function AppSidebar({
  userDisplayName,
  onProfileClick,
  theme,
  setTheme,
  onSignOut,
  onClose,
  onDepartmentManageClick,
  viewMode = "list",
  onViewChange,
}: AppSidebarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!settingsOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [settingsOpen]);

  const handleNavClick = (view: ViewMode) => {
    onViewChange?.(view);
    onClose?.();
  };

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
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {/* ユーザー名 + 設定アイコン */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onProfileClick}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
            title="プロフィールを開く"
          >
            <User className="h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" />
            <span className="min-w-0 truncate">{userDisplayName}</span>
          </button>
          <div className="relative shrink-0" ref={settingsRef}>
            <button
              type="button"
              onClick={() => setSettingsOpen((o) => !o)}
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              title="設定"
              aria-label="設定"
              aria-expanded={settingsOpen}
            >
              <Settings className="h-5 w-5" />
            </button>
            {settingsOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-xl border border-slate-200 bg-white py-2 shadow-lg dark:border-slate-600 dark:bg-slate-800">
                <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  設定
                </p>
                <p className="px-3 py-1 text-xs font-medium text-slate-500 dark:text-slate-400">テーマ</p>
                <button
                  type="button"
                  onClick={() => {
                    setTheme("light");
                    setSettingsOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition ${
                    theme === "light"
                      ? "bg-slate-100 font-medium text-slate-800 dark:bg-slate-700 dark:text-slate-100"
                      : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  <Sun className="h-4 w-4 shrink-0" />
                  ライト
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTheme("dark");
                    setSettingsOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition ${
                    theme === "dark"
                      ? "bg-slate-100 font-medium text-slate-800 dark:bg-slate-700 dark:text-slate-100"
                      : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  <Moon className="h-4 w-4 shrink-0" />
                  ダーク
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTheme("system");
                    setSettingsOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition ${
                    theme === "system"
                      ? "bg-slate-100 font-medium text-slate-800 dark:bg-slate-700 dark:text-slate-100"
                      : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  <Monitor className="h-4 w-4 shrink-0" />
                  システム
                </button>
                <div className="my-1 border-t border-slate-200 dark:border-slate-600" />
                <button
                  type="button"
                  onClick={() => {
                    onSignOut();
                    setSettingsOpen(false);
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                  aria-label="ログアウト"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  ログアウト
                </button>
              </div>
            )}
          </div>
        </div>

        {onDepartmentManageClick && (
          <button
            type="button"
            onClick={onDepartmentManageClick}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
            title="メンバー部署管理"
          >
            <Building2 className="h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" />
            <span>メンバー部署管理</span>
          </button>
        )}

        <div className="my-2 border-t border-slate-200 dark:border-slate-700" />

        {/* ナビゲーションタブ */}
        {onViewChange && (
          <>
            <p className="px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              表示
            </p>
            {NAV_ITEMS.map(({ view, label, icon: Icon }) => (
              <button
                key={view}
                type="button"
                onClick={() => handleNavClick(view)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                  viewMode === view
                    ? "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-100"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{label}</span>
              </button>
            ))}
          </>
        )}
      </nav>
    </aside>
  );
}
