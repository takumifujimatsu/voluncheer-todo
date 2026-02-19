"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DEPARTMENTS } from "@/types/task";
import type { CompletedFilter } from "@/lib/taskFilters";
import type { TaskSort } from "@/lib/taskFilters";

export type ViewMode =
  | "list"
  | "calendar"
  | "board"
  | "timeline"
  | "analysis"
  | "library";

const VIEW_VALUES: ViewMode[] = [
  "list",
  "calendar",
  "board",
  "timeline",
  "analysis",
  "library",
];
const DISPLAY_VALUES: CompletedFilter[] = ["all", "incomplete", "complete"];
const SORT_VALUES: TaskSort[] = [
  "created",
  "dueAsc",
  "dueDesc",
  "myTasksFirst",
];

const DEFAULT_VIEW: ViewMode = "list";
const DEFAULT_DISPLAY: CompletedFilter = "all";
const DEFAULT_MY_TASKS = false;
const DEFAULT_SORT: TaskSort = "created";

function parseView(s: string | null): ViewMode {
  if (s && VIEW_VALUES.includes(s as ViewMode)) return s as ViewMode;
  return DEFAULT_VIEW;
}

function parseDisplay(s: string | null): CompletedFilter {
  if (s && DISPLAY_VALUES.includes(s as CompletedFilter))
    return s as CompletedFilter;
  return DEFAULT_DISPLAY;
}

function parseMyTasks(s: string | null): boolean {
  if (s === "1" || s === "true") return true;
  if (s === "0" || s === "false") return false;
  return DEFAULT_MY_TASKS;
}

function parseSort(s: string | null): TaskSort {
  if (s && SORT_VALUES.includes(s as TaskSort)) return s as TaskSort;
  return DEFAULT_SORT;
}

function parseDepartments(params: URLSearchParams): string[] {
  const deptSet = new Set<string>(DEPARTMENTS as readonly string[]);
  const raw = params.getAll("dept");
  return raw.filter((d) => deptSet.has(d));
}

export type AppUrlState = {
  view: ViewMode;
  departments: string[];
  completedFilter: CompletedFilter;
  myTasksOnly: boolean;
  sort: TaskSort;
};

export function useAppUrlState(): AppUrlState & {
  setView: (v: ViewMode) => void;
  setDepartments: (d: string[]) => void;
  setCompletedFilter: (c: CompletedFilter) => void;
  setMyTasksOnly: (m: boolean) => void;
  setSort: (s: TaskSort) => void;
} {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const state = useMemo<AppUrlState>(() => {
    return {
      view: parseView(searchParams.get("view")),
      departments: parseDepartments(searchParams),
      completedFilter: parseDisplay(searchParams.get("display")),
      myTasksOnly: parseMyTasks(searchParams.get("myTasks")),
      sort: parseSort(searchParams.get("sort")),
    };
  }, [searchParams]);

  const setUrl = useCallback(
    (updates: Partial<AppUrlState>) => {
      const next = { ...state, ...updates };
      const params = new URLSearchParams();
      params.set("view", next.view);
      next.departments.forEach((d) => params.append("dept", d));
      params.set("display", next.completedFilter);
      params.set("myTasks", next.myTasksOnly ? "1" : "0");
      params.set("sort", next.sort);
      const q = params.toString();
      const url = q ? `${pathname}?${q}` : pathname;
      router.replace(url, { scroll: false });
    },
    [pathname, router, state],
  );

  const setView = useCallback(
    (view: ViewMode) => setUrl({ view }),
    [setUrl],
  );
  const setDepartments = useCallback(
    (departments: string[]) => setUrl({ departments }),
    [setUrl],
  );
  const setCompletedFilter = useCallback(
    (completedFilter: CompletedFilter) => setUrl({ completedFilter }),
    [setUrl],
  );
  const setMyTasksOnly = useCallback(
    (myTasksOnly: boolean) => setUrl({ myTasksOnly }),
    [setUrl],
  );
  const setSort = useCallback((sort: TaskSort) => setUrl({ sort }), [setUrl]);

  return {
    ...state,
    setView,
    setDepartments,
    setCompletedFilter,
    setMyTasksOnly,
    setSort,
  };
}
