export type TaskStatus = "todo" | "doing" | "done";

export type Task = {
  id: string;
  title: string;
  /** 担当部署（複数可）。旧データ互換で department 単体も読み取り可 */
  departments: string[];
  status: TaskStatus;
  createdAt: unknown; // Firestore serverTimestamp
  /** 担当者 uid */
  assigneeUid?: string | null;
  /** 担当者表示名 */
  assigneeName?: string | null;
  /** 期限（Firestore Timestamp） */
  dueDate?: unknown | null;
  /** メモ */
  memo?: string | null;
  /** 次のタスク（流れの接続）。タイムラインで線を描画する */
  nextTaskId?: string | null;
};

export const DEPARTMENTS = [
  "全体",
  "執行役員",
  "営業部",
  "広報部",
  "デザイン部",
  "オペレーション部",
  "企画部",
  "総務部",
  "開発部",
  "経理部",
] as const;

export const ALL_DEPARTMENTS_LABEL = "全体表示";

/** 担当者「全員」のときの assigneeUid（Firestore に保存する値） */
export const ASSIGNEE_EVERYONE_UID = "all";
/** 担当者「全員」の表示名 */
export const ASSIGNEE_EVERYONE_LABEL = "全員";
