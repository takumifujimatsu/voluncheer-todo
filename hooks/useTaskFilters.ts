"use client";

import { useEffect, useState } from "react";
import {
  COMPLETED_FILTER_STORAGE_KEY,
  SORT_STORAGE_KEY,
  MY_TASKS_ONLY_STORAGE_KEY,
  type CompletedFilter,
  type TaskSort,
} from "@/lib/taskFilters";

export function useTaskFilters() {
  const [completedFilter, setCompletedFilter] = useState<CompletedFilter>("all");
  const [sort, setSort] = useState<TaskSort>("created");
  const [myTasksOnly, setMyTasksOnly] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(COMPLETED_FILTER_STORAGE_KEY);
    if (stored === "all" || stored === "incomplete" || stored === "complete") {
      setCompletedFilter(stored);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(SORT_STORAGE_KEY);
    if (stored === "created" || stored === "dueAsc" || stored === "dueDesc" || stored === "myTasksFirst") {
      setSort(stored);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(MY_TASKS_ONLY_STORAGE_KEY);
    setMyTasksOnly(stored === "true");
  }, []);

  const handleCompletedFilterChange = (value: CompletedFilter) => {
    setCompletedFilter(value);
    localStorage.setItem(COMPLETED_FILTER_STORAGE_KEY, value);
  };

  const handleSortChange = (value: TaskSort) => {
    setSort(value);
    localStorage.setItem(SORT_STORAGE_KEY, value);
  };

  const handleMyTasksOnlyChange = (value: boolean) => {
    setMyTasksOnly(value);
    localStorage.setItem(MY_TASKS_ONLY_STORAGE_KEY, value ? "true" : "false");
  };

  return {
    completedFilter,
    setCompletedFilter: handleCompletedFilterChange,
    sort,
    setSort: handleSortChange,
    myTasksOnly,
    setMyTasksOnly: handleMyTasksOnlyChange,
  };
}
