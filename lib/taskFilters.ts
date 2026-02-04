import { Timestamp } from "firebase/firestore";
import type { Task } from "@/types/task";
import { ASSIGNEE_EVERYONE_UID } from "@/types/task";

export const COMPLETED_FILTER_STORAGE_KEY = "voluncheer-completed-filter";
export type CompletedFilter = "all" | "incomplete" | "complete";

export const SORT_STORAGE_KEY = "voluncheer-sort";
export type TaskSort = "created" | "dueAsc" | "dueDesc" | "myTasksFirst";

export const MY_TASKS_ONLY_STORAGE_KEY = "voluncheer-my-tasks-only";

export function getDueTime(due: unknown): number {
  if (due == null) return 0;
  if (due instanceof Timestamp) return due.toDate().getTime();
  return 0;
}

export type ApplyFiltersOptions = {
  completedFilter: CompletedFilter;
  sort: TaskSort;
  myTasksOnly: boolean;
  currentUserUid?: string | null;
};

/** 表示・自分のタスクのみ・並び替えを適用したタスク配列を返す */
export function applyTaskFiltersAndSort(
  tasks: Task[],
  options: ApplyFiltersOptions
): Task[] {
  const { completedFilter, sort, myTasksOnly, currentUserUid } = options;

  let result = tasks;

  if (myTasksOnly && currentUserUid) {
    result = result.filter(
      (t) =>
        t.assigneeUid === currentUserUid || t.assigneeUid === ASSIGNEE_EVERYONE_UID
    );
  }

  if (completedFilter === "incomplete") {
    result = result.filter((t) => t.status !== "done");
  } else if (completedFilter === "complete") {
    result = result.filter((t) => t.status === "done");
  }

  if (sort === "myTasksFirst" && currentUserUid) {
    const mine: Task[] = [];
    const others: Task[] = [];
    result.forEach((t) => {
      if (t.assigneeUid === currentUserUid || t.assigneeUid === ASSIGNEE_EVERYONE_UID) {
        mine.push(t);
      } else {
        others.push(t);
      }
    });
    result = [...mine, ...others];
  } else {
    result = [...result].sort((a, b) => {
      if (sort === "created") return 0;
      const ta = getDueTime(a.dueDate);
      const tb = getDueTime(b.dueDate);
      if (sort === "dueAsc") {
        if (ta === 0 && tb === 0) return 0;
        if (ta === 0) return 1;
        if (tb === 0) return -1;
        return ta - tb;
      }
      if (sort === "dueDesc") {
        if (ta === 0 && tb === 0) return 0;
        if (ta === 0) return -1;
        if (tb === 0) return 1;
        return tb - ta;
      }
      return 0;
    });
  }

  return result;
}
