"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  type Unsubscribe,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import type { Task, TaskStatus } from "@/types/task";
import type { DoneLimit } from "@/lib/taskFilters";

type TasksContextValue = {
  tasks: Task[];
};

const TasksContext = createContext<TasksContextValue | undefined>(undefined);

function mapDocToTask(d: { id: string; data: () => Record<string, unknown> }): Task {
  const data = d.data();
  const rawDepts = data.departments ?? data.department;
  const departments = Array.isArray(rawDepts)
    ? rawDepts
    : rawDepts
      ? [rawDepts as string]
      : [];
  return {
    id: d.id,
    title: (data.title as string) ?? "",
    departments,
    status: (data.status as TaskStatus) ?? "todo",
    createdAt: data.createdAt,
    assigneeUid: (data.assigneeUid as string | null) ?? null,
    assigneeName: (data.assigneeName as string | null) ?? null,
    dueDate: data.dueDate ?? null,
    memo: (data.memo as string | null) ?? null,
    nextTaskId: (data.nextTaskId as string | null) ?? null,
  };
}

export function TasksProvider({
  children,
  doneLimit = "all",
}: {
  children: ReactNode;
  doneLimit?: DoneLimit;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    const db = getDb();
    const tasksRef = collection(db, "tasks");

    if (doneLimit === "all") {
      const q = query(tasksRef, orderBy("createdAt", "desc"));
      const unsub: Unsubscribe = onSnapshot(q, (snap) => {
        setTasks(snap.docs.map((d) => mapDocToTask(d)));
      });
      return () => unsub();
    }

    const limitNum = doneLimit as number;
    const qTodoDoing = query(
      tasksRef,
      where("status", "in", ["todo", "doing"]),
      orderBy("createdAt", "desc")
    );
    const qDone = query(
      tasksRef,
      where("status", "==", "done"),
      orderBy("createdAt", "desc"),
      limit(limitNum)
    );

    let todoDoingList: Task[] = [];
    let doneList: Task[] = [];

    const mergeAndSet = () => {
      setTasks([...todoDoingList, ...doneList]);
    };

    const unsub1 = onSnapshot(qTodoDoing, (snapTodo) => {
      todoDoingList = snapTodo.docs.map((d) => mapDocToTask(d));
      mergeAndSet();
    });

    const unsub2 = onSnapshot(qDone, (snapDone) => {
      doneList = snapDone.docs.map((d) => mapDocToTask(d));
      mergeAndSet();
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [doneLimit]);

  return (
    <TasksContext.Provider value={{ tasks }}>
      {children}
    </TasksContext.Provider>
  );
}

export function useTasks() {
  const ctx = useContext(TasksContext);
  if (ctx === undefined) {
    throw new Error("useTasks must be used within TasksProvider");
  }
  return ctx;
}
