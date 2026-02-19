"use client";

import { Suspense, useState, useCallback, useEffect } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  doc,
  deleteDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { deleteUser } from "firebase/auth";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAppUrlState } from "@/hooks/useAppUrlState";
import { DepartmentSelector } from "@/components/DepartmentSelector";
import { AddTaskModal, type Member } from "@/components/AddTaskModal";
import { ProfileModal } from "@/components/ProfileModal";
import { TaskBoard } from "@/components/TaskBoard";
import { DoneByDepartmentView } from "@/components/DoneByDepartmentView";
import { CalendarView } from "@/components/CalendarView";
import { BoardView } from "@/components/BoardView";
import { TimelineView } from "@/components/TimelineView";
import { AnalysisView } from "@/components/AnalysisView";
import { ResourceLibrary } from "@/components/ResourceLibrary";
import { DEPARTMENTS } from "@/types/task";
import {
  Loader2,
  List,
  CalendarDays,
  LayoutGrid,
  GanttChart,
  BarChart2,
  Library,
  Menu,
  Plus,
  Eye,
  EyeOff,
  CheckSquare,
} from "lucide-react";
import { AppSidebar } from "@/components/AppSidebar";

/** メンバー用ゲートのシークレットパスワード。環境変数 NEXT_PUBLIC_MEMBER_GATE_PASSWORD で上書き可能 */
const MEMBER_GATE_PASSWORD =
  process.env.NEXT_PUBLIC_MEMBER_GATE_PASSWORD || "Happiness";

function HomeContent() {
  const {
    user,
    userProfile,
    loading,
    signInWithGoogle,
    signOut,
    saveUserName,
  } = useAuth();
  const { theme, setTheme, resolvedDark } = useTheme();
  const {
    view: viewMode,
    setView: setViewMode,
    departments: selectedDepartments,
    setDepartments: setSelectedDepartments,
    completedFilter,
    setCompletedFilter,
    sort,
    setSort,
    myTasksOnly,
    setMyTasksOnly,
  } = useAppUrlState();
  const [headerAddModalOpen, setHeaderAddModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarClosing, setSidebarClosing] = useState(false);
  const [sidebarReady, setSidebarReady] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [authError, setAuthError] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [nameSubmitting, setNameSubmitting] = useState(false);
  /** メンバー用ゲート: 正しいパスワードを入力したら true（sessionStorage で永続） */
  const [memberGatePassed, setMemberGatePassed] = useState(false);
  const [gatePasswordInput, setGatePasswordInput] = useState("");
  const [gatePasswordError, setGatePasswordError] = useState<string | null>(null);
  const [gatePasswordVisible, setGatePasswordVisible] = useState(false);
  /** リストビュー内のサブ表示: ボード（To Do/Done） or 完了（部署別） */
  const [listSubView, setListSubView] = useState<"board" | "doneByDept">("board");

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("voluncheer-member-gate") === "1") {
      setMemberGatePassed(true);
    }
  }, []);

  useEffect(() => {
    if (sidebarOpen) {
      setSidebarReady(false);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setSidebarReady(true));
      });
      return () => cancelAnimationFrame(id);
    } else {
      setSidebarReady(false);
    }
  }, [sidebarOpen]);

  const handleViewModeChange = setViewMode;

  const needsNameRegistration = user && !userProfile?.name?.trim();

  useEffect(() => {
    if (needsNameRegistration && user?.displayName) {
      setNameInput(user.displayName);
    }
  }, [needsNameRegistration, user?.displayName]);

  const handleDepartmentChange = useCallback(
    (d: string[]) => setSelectedDepartments(d),
    [setSelectedDepartments],
  );

  useEffect(() => {
    if (!user) return;
    const db = getDb();
    const unsub: Unsubscribe = onSnapshot(collection(db, "users"), (snap) => {
      const list: Member[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          uid: d.id,
          name: (data.name as string) ?? "",
          displayName: data.displayName ?? "",
          email: data.email ?? "",
        };
      });
      setMembers(list);
    });
    return () => unsub();
  }, [user]);

  const handleHeaderAddTask = async (params: {
    title: string;
    assigneeUid: string;
    assigneeName: string;
    dueDate: string;
    departments: string[];
    status: "todo" | "doing" | "done";
    memo: string;
  }) => {
    const depts =
      params.departments.length > 0 ? params.departments : [DEPARTMENTS[0]];
    await addDoc(collection(getDb(), "tasks"), {
      title: params.title,
      departments: depts,
      status: params.status,
      assigneeUid: params.assigneeUid || null,
      assigneeName: params.assigneeName || null,
      dueDate: params.dueDate
        ? Timestamp.fromDate(new Date(params.dueDate))
        : null,
      memo: params.memo || null,
      createdAt: serverTimestamp(),
    });
    setHeaderAddModalOpen(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-[#2EABE3]" aria-hidden />
      </div>
    );
  }

  const handleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      const code =
        err && typeof err === "object" && "code" in err
          ? (err as { code: string }).code
          : "";
      if (code === "auth/unauthorized-domain") {
        setAuthError(
          "このドメインは Firebase で許可されていません。Firebase Console → 認証 → 設定 → 認証ドメイン にこのサイトの URL を追加してください。",
        );
      } else if (code === "auth/popup-blocked") {
        setAuthError(
          "ポップアップがブロックされています。ブラウザの設定でポップアップを許可してください。",
        );
      } else {
        setAuthError(
          "ログインに失敗しました。しばらくしてからお試しください。",
        );
      }
    }
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = nameInput.trim();
    if (!name) return;
    setNameSubmitting(true);
    try {
      await saveUserName(name);
    } finally {
      setNameSubmitting(false);
    }
  };

  if (needsNameRegistration) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 dark:bg-slate-900">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-600 dark:bg-slate-800">
          <h1 className="mb-2 text-center text-xl font-semibold text-slate-800 dark:text-slate-100">
            名前を登録してください
          </h1>
          <p className="mb-6 text-center text-sm text-slate-500 dark:text-slate-400">
            このアプリでは表示名として使います。タスクの担当者にも表示されます。
          </p>
          <form onSubmit={handleSaveName} className="space-y-4">
            <div>
              <label
                htmlFor="user-name"
                className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                表示名
              </label>
              <input
                id="user-name"
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="例: 山田 太郎"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#2EABE3] focus:ring-2 focus:ring-[#2EABE3]/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
                required
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={nameSubmitting || !nameInput.trim()}
              className="w-full rounded-lg bg-[#2EABE3] py-2.5 text-sm font-medium text-white transition hover:bg-[#2590c4] disabled:opacity-50"
            >
              {nameSubmitting ? "登録中…" : "登録して始める"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!user) {
    const handleGateSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setGatePasswordError(null);
      if (gatePasswordInput.trim() === MEMBER_GATE_PASSWORD) {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("voluncheer-member-gate", "1");
        }
        setMemberGatePassed(true);
        setGatePasswordInput("");
      } else {
        setGatePasswordError("パスワードが違います");
      }
    };

    if (!memberGatePassed) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 dark:bg-slate-900">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-600 dark:bg-slate-800">
            <h1 className="mb-2 text-center text-xl font-semibold text-slate-800 dark:text-slate-100">
              ボランチア ToDo
            </h1>
            <p className="mb-6 text-center text-sm text-slate-500 dark:text-slate-400">
              メンバー用のシークレットパスワードを入力してください
            </p>
            {gatePasswordError && (
              <p
                className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
                role="alert"
              >
                {gatePasswordError}
              </p>
            )}
            <form onSubmit={handleGateSubmit} className="space-y-4">
              <div className="relative">
                <input
                  type={gatePasswordVisible ? "text" : "password"}
                  value={gatePasswordInput}
                  onChange={(e) => setGatePasswordInput(e.target.value)}
                  placeholder="シークレットパスワード"
                  className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-3 pr-10 text-sm text-slate-900 outline-none focus:border-[#2EABE3] focus:ring-2 focus:ring-[#2EABE3]/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
                  autoFocus
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setGatePasswordVisible((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-600 dark:hover:text-slate-200"
                  aria-label={gatePasswordVisible ? "パスワードを隠す" : "パスワードを表示"}
                >
                  {gatePasswordVisible ? (
                    <EyeOff className="h-5 w-5" aria-hidden />
                  ) : (
                    <Eye className="h-5 w-5" aria-hidden />
                  )}
                </button>
              </div>
              <button
                type="submit"
                disabled={!gatePasswordInput.trim()}
                className="w-full rounded-lg bg-[#2EABE3] py-2.5 text-sm font-medium text-white transition hover:bg-[#2590c4] disabled:opacity-50"
              >
                確認
              </button>
            </form>
          </div>
        </div>
      );
    }

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 dark:bg-slate-900">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-600 dark:bg-slate-800">
          <h1 className="mb-2 text-center text-xl font-semibold text-slate-800 dark:text-slate-100">
            ボランチア ToDo
          </h1>
          <p className="mb-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Google でログインしてタスクを管理しましょう
          </p>
          {authError && (
            <p
              className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
              role="alert"
            >
              {authError}
            </p>
          )}
          <button
            type="button"
            onClick={handleSignIn}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google でログイン
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <AddTaskModal
        isOpen={headerAddModalOpen}
        onClose={() => setHeaderAddModalOpen(false)}
        defaultStatus="todo"
        defaultDepartments={
          selectedDepartments.length === 0 ? [] : [...selectedDepartments]
        }
        members={members}
        onSubmit={handleHeaderAddTask}
      />
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        currentName={userProfile?.name ?? user?.displayName ?? ""}
        email={user?.email ?? null}
        members={members}
        onSaveName={saveUserName}
        onDeleteMember={
          user?.email === "fujimatsu.t@voluncheer.or.jp" && user
            ? async (uid) => {
                await deleteDoc(doc(getDb(), "users", uid));
                if (uid === user.uid) {
                  await deleteUser(user);
                }
              }
            : undefined
        }
      />
      {/* デスクトップ: 常時表示のサイドバー */}
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 overflow-y-auto border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 md:block">
        <AppSidebar
          userDisplayName={
            userProfile?.name ?? user.displayName ?? user.email ?? ""
          }
          onProfileClick={() => setProfileModalOpen(true)}
          theme={theme}
          setTheme={setTheme}
          onSignOut={signOut}
        />
      </aside>

      {/* モバイル: ドロワー（左からスライド） */}
      {(sidebarOpen || sidebarClosing) && (
        <>
          <div
            className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 md:hidden ${
              sidebarOpen && !sidebarClosing ? "opacity-100" : "opacity-0"
            }`}
            aria-hidden
            onClick={() => {
              setSidebarClosing(true);
              setSidebarOpen(false);
            }}
          />
          <div
            className={`fixed left-0 top-0 z-50 h-full w-72 max-w-[85vw] bg-white shadow-xl transition-transform duration-300 ease-out dark:bg-slate-800 md:hidden ${
              sidebarOpen && sidebarReady && !sidebarClosing
                ? "translate-x-0"
                : "-translate-x-full"
            }`}
            onTransitionEnd={() => {
              if (sidebarClosing) {
                setSidebarClosing(false);
              }
            }}
          >
            <AppSidebar
              userDisplayName={
                userProfile?.name ?? user.displayName ?? user.email ?? ""
              }
              onProfileClick={() => {
                setProfileModalOpen(true);
                setSidebarOpen(false);
                setSidebarClosing(false);
              }}
              theme={theme}
              setTheme={setTheme}
              onSignOut={() => {
                signOut();
                setSidebarOpen(false);
                setSidebarClosing(false);
              }}
              onClose={() => {
                setSidebarClosing(true);
                setSidebarOpen(false);
              }}
            />
          </div>
        </>
      )}

      <div className="min-w-0 flex-1 flex flex-col">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="mx-auto flex max-w-6xl items-center gap-2 px-2 py-2 sm:gap-3 sm:px-4 sm:py-2.5">
            <button
              type="button"
              onClick={() => {
                setSidebarOpen(true);
                setSidebarClosing(false);
              }}
              className="shrink-0 rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 md:hidden dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              aria-label="メニューを開く"
            >
              <Menu className="h-5 w-5" />
            </button>
            <img
              src="/tabIcon.png"
              alt=""
              className="h-6 w-6 shrink-0 rounded object-contain sm:h-7 sm:w-7"
              aria-hidden
            />
            <h1 className="shrink-0 text-base font-semibold text-slate-800 dark:text-slate-100 sm:text-lg">
              ボランチア ToDo
            </h1>
            <div className="flex min-w-0 flex-1 justify-end">
              <DepartmentSelector
                value={selectedDepartments}
                onChange={handleDepartmentChange}
                disableLocalStorageInit
              />
            </div>
          </div>
        </header>

        <main className="mx-auto min-w-0 w-full max-w-6xl flex-1 overflow-x-hidden px-3 pb-52 pt-4 sm:px-4 sm:pb-6 sm:pt-6">
          <div className="mb-6 flex overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm scrollbar-hide dark:border-slate-700 dark:bg-slate-800 sm:mb-4">
            <div className="flex min-w-max shrink-0 gap-0.5 sm:flex-1 sm:gap-0">
              <button
                type="button"
                onClick={() => handleViewModeChange("list")}
                className={`flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition sm:flex-1 sm:gap-2 sm:py-2.5 ${
                  viewMode === "list"
                    ? "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-100"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                }`}
              >
                <List className="h-4 w-4 shrink-0" />
                <span>リスト</span>
              </button>
              <button
                type="button"
                onClick={() => handleViewModeChange("calendar")}
                className={`flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition sm:flex-1 sm:gap-2 sm:py-2.5 ${
                  viewMode === "calendar"
                    ? "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-100"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                }`}
              >
                <CalendarDays className="h-4 w-4 shrink-0" />
                <span>カレンダー</span>
              </button>
              <button
                type="button"
                onClick={() => handleViewModeChange("board")}
                className={`flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition sm:flex-1 sm:gap-2 sm:py-2.5 ${
                  viewMode === "board"
                    ? "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-100"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                }`}
              >
                <LayoutGrid className="h-4 w-4 shrink-0" />
                <span>ボード</span>
              </button>
              <button
                type="button"
                onClick={() => handleViewModeChange("timeline")}
                className={`flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition sm:flex-1 sm:gap-2 sm:py-2.5 ${
                  viewMode === "timeline"
                    ? "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-100"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                }`}
              >
                <GanttChart className="h-4 w-4 shrink-0" />
                <span>タイムライン</span>
              </button>
              <button
                type="button"
                onClick={() => handleViewModeChange("analysis")}
                className={`flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition sm:flex-1 sm:gap-2 sm:py-2.5 ${
                  viewMode === "analysis"
                    ? "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-100"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                }`}
              >
                <BarChart2 className="h-4 w-4 shrink-0" />
                <span>分析</span>
              </button>
              <button
                type="button"
                onClick={() => handleViewModeChange("library")}
                className={`flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition sm:flex-1 sm:gap-2 sm:py-2.5 ${
                  viewMode === "library"
                    ? "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-100"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                }`}
              >
                <Library className="h-4 w-4 shrink-0" />
                <span>資料室</span>
              </button>
            </div>
          </div>
          <div className="h-4 shrink-0 sm:h-0" aria-hidden />
          {viewMode === "list" && (
            <div className="min-w-0">
              <div className="mb-4 flex min-w-0 gap-1 rounded-lg border border-slate-200 bg-slate-50/80 p-1 dark:border-slate-700 dark:bg-slate-800/80">
                <button
                  type="button"
                  onClick={() => setListSubView("board")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                    listSubView === "board"
                      ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                      : "text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  <LayoutGrid className="h-4 w-4 shrink-0" aria-hidden />
                  ボード
                </button>
                <button
                  type="button"
                  onClick={() => setListSubView("doneByDept")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                    listSubView === "doneByDept"
                      ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                      : "text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  <CheckSquare className="h-4 w-4 shrink-0" aria-hidden />
                  完了（部署別）
                </button>
              </div>
              {listSubView === "board" ? (
                <TaskBoard
                  selectedDepartments={selectedDepartments}
                  currentUserUid={user?.uid}
                  completedFilter={completedFilter}
                  onCompletedFilterChange={setCompletedFilter}
                  sort={sort}
                  onSortChange={setSort}
                  myTasksOnly={myTasksOnly}
                  onMyTasksOnlyChange={setMyTasksOnly}
                />
              ) : (
                <DoneByDepartmentView
                  selectedDepartments={selectedDepartments}
                  currentUserUid={user?.uid}
                />
              )}
            </div>
          )}
          {viewMode === "calendar" && (
            <CalendarView
              selectedDepartments={selectedDepartments}
              currentUserUid={user?.uid}
            />
          )}
          {viewMode === "board" && (
            <BoardView
              selectedDepartments={selectedDepartments}
              currentUserUid={user?.uid}
            />
          )}
          {viewMode === "timeline" && (
            <TimelineView
              selectedDepartments={selectedDepartments}
              currentUserUid={user?.uid}
            />
          )}
          {viewMode === "analysis" && (
            <AnalysisView selectedDepartments={selectedDepartments} />
          )}
          {viewMode === "library" && (
            <ResourceLibrary currentUserUid={user?.uid} />
          )}
        </main>

        {/* 画面右下のタスク追加ボタン */}
        <button
          type="button"
          onClick={() => setHeaderAddModalOpen(true)}
          className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#2EABE3] text-white shadow-lg transition hover:bg-[#2590c4] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#2EABE3] focus:ring-offset-2 dark:bg-[#2EABE3] dark:hover:bg-[#2590c4] dark:focus:ring-offset-slate-900"
          aria-label="タスクを追加"
          title="タスクを追加"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}

const PageFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
    <Loader2 className="h-8 w-8 animate-spin text-[#2EABE3]" aria-hidden />
  </div>
);

export default function Home() {
  return (
    <Suspense fallback={<PageFallback />}>
      <HomeContent />
    </Suspense>
  );
}
