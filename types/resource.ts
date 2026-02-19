import { DEPARTMENTS } from "@/types/task";

/** 資料・データ管理室で扱う資料の種類 */
export type ResourceType =
  | "canva"
  | "document"
  | "spreadsheet"
  | "form"
  | "drive"
  | "pdf"
  | "other";

/** 内部（組織内）のアクセス: 不可 / 閲覧可能 / 編集可能 */
export type InternalAccess = "none" | "view" | "edit";

/** 外部のアクセス: 不可 / 閲覧可能 / 編集可能 */
export type ExternalAccess = "none" | "view" | "edit";

/** 資料（1件） */
export type Resource = {
  id: string;
  title: string;
  type: ResourceType;
  description: string;
  department: string;
  /** 内部: 閲覧可能 or 編集可能 */
  internalAccess: InternalAccess;
  /** 外部: 閲覧・編集不可 / 閲覧可能 / 編集可能 */
  externalAccess: ExternalAccess;
  url: string;
  updatedAt: string;
  /** 所属フォルダID。null はルート */
  folderId: string | null;
};

/** フォルダ（ツリーのノード）。部署ごとに独立したツリー */
export type ResourceFolder = {
  id: string;
  name: string;
  /** 所属部署（営業部・企画部など）。他部署には表示されない */
  department: string;
  /** 親フォルダID。null はその部署内のルート */
  parentId: string | null;
  createdAt: unknown;
};

/** 部署はタスクと同じ DEPARTMENTS を使用 */
export { DEPARTMENTS };

/** 資料室の部署フィルター用。「すべて」+ DEPARTMENTS */
export const LIBRARY_DEPARTMENT_FILTERS = [
  "すべて",
  ...(DEPARTMENTS as readonly string[]),
] as const;
