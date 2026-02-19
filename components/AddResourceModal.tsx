"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type {
  ResourceType,
  InternalAccess,
  ExternalAccess,
} from "@/types/resource";
import { DEPARTMENTS } from "@/types/resource";
import type { ResourceFolder, Resource } from "@/types/resource";

const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  canva: "Canva",
  document: "ドキュメント",
  spreadsheet: "スプレッドシート",
  form: "フォーム",
  drive: "ドライブ",
  pdf: "PDF",
  other: "その他",
};

const INTERNAL_ACCESS_LABELS: Record<InternalAccess, string> = {
  none: "閲覧・編集不可",
  view: "閲覧可能",
  edit: "編集可能",
};

const EXTERNAL_ACCESS_LABELS: Record<ExternalAccess, string> = {
  none: "閲覧・編集不可",
  view: "閲覧可能",
  edit: "編集可能",
};

export type AddResourceModalProps = {
  isOpen: boolean;
  onClose: () => void;
  folders: ResourceFolder[];
  defaultFolderId: string | null;
  /** 部署を選択中に開いた場合、資料の初期管理部署 */
  defaultDepartment?: string;
  /** 指定時は編集モード（既存データでフォームを初期化） */
  editResource?: Resource | null;
  onSubmit: (params: {
    title: string;
    type: ResourceType;
    description: string;
    department: string;
    internalAccess: InternalAccess;
    externalAccess: ExternalAccess;
    url: string;
    folderId: string | null;
  }) => Promise<void>;
};

const FADE_DURATION_MS = 200;

export function AddResourceModal({
  isOpen,
  onClose,
  folders,
  defaultFolderId,
  defaultDepartment,
  editResource,
  onSubmit,
}: AddResourceModalProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ResourceType>("document");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState<string>(DEPARTMENTS[0]);
  const [internalAccess, setInternalAccess] =
    useState<InternalAccess>("edit");
  const [externalAccess, setExternalAccess] =
    useState<ExternalAccess>("none");
  const [url, setUrl] = useState("");
  const [folderId, setFolderId] = useState<string | null>(defaultFolderId);
  const [submitting, setSubmitting] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [visible, setVisible] = useState(false);

  const isEditMode = !!editResource;

  useEffect(() => {
    if (isOpen) {
      if (editResource) {
        setTitle(editResource.title);
        setType(editResource.type);
        setDescription(editResource.description);
        setDepartment(
          (DEPARTMENTS as readonly string[]).includes(editResource.department)
            ? editResource.department
            : DEPARTMENTS[0],
        );
        setInternalAccess(editResource.internalAccess);
        setExternalAccess(editResource.externalAccess);
        setUrl(editResource.url === "#" ? "" : editResource.url);
        setFolderId(editResource.folderId);
      } else {
        setTitle("");
        setType("document");
        setDescription("");
        setDepartment(
          defaultDepartment && (DEPARTMENTS as readonly string[]).includes(defaultDepartment)
            ? defaultDepartment
            : DEPARTMENTS[0],
        );
        setInternalAccess("edit");
        setExternalAccess("none");
        setUrl("");
        setFolderId(defaultFolderId);
      }
      setExiting(false);
      setVisible(false);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(id);
    }
  }, [isOpen, defaultFolderId, defaultDepartment, editResource]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  const handleClose = () => {
    setExiting(true);
    setTimeout(() => onClose(), FADE_DURATION_MS);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    setSubmitting(true);
    try {
      await onSubmit({
        title: t,
        type,
        description: description.trim(),
        department,
        internalAccess,
        externalAccess,
        url: url.trim() || "#",
        folderId,
      });
      handleClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const overlayVisible = visible && !exiting;
  const dialogVisible = visible && !exiting;

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-black/50 transition-opacity duration-200 ${
          overlayVisible ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden
        onClick={handleClose}
      />
      <div
        className={`fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl transition-all duration-200 scrollbar-hide dark:border-slate-600 dark:bg-slate-800 ${
          dialogVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-resource-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="add-resource-title"
            className="text-lg font-semibold text-slate-800 dark:text-slate-100"
          >
            {isEditMode ? "資料を編集" : "資料を追加"}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            aria-label="閉じる"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="resource-title"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              資料名
            </label>
            <input
              id="resource-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="資料名を入力"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:border-[#2EABE3] focus:ring-2 focus:ring-[#2EABE3]/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
              autoFocus
              required
            />
          </div>

          <div>
            <label
              htmlFor="resource-type"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              種類
            </label>
            <select
              id="resource-type"
              value={type}
              onChange={(e) => setType(e.target.value as ResourceType)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#2EABE3] focus:ring-2 focus:ring-[#2EABE3]/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            >
              {(Object.keys(RESOURCE_TYPE_LABELS) as ResourceType[]).map(
                (k) => (
                  <option key={k} value={k}>
                    {RESOURCE_TYPE_LABELS[k]}
                  </option>
                ),
              )}
            </select>
          </div>

          <div>
            <label
              htmlFor="resource-description"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              内容・目的（任意）
            </label>
            <textarea
              id="resource-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="内容や目的を入力"
              rows={2}
              className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:border-[#2EABE3] focus:ring-2 focus:ring-[#2EABE3]/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
            />
          </div>

          <div>
            <label
              htmlFor="resource-department"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              管理部署
            </label>
            <select
              id="resource-department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#2EABE3] focus:ring-2 focus:ring-[#2EABE3]/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            >
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="resource-internal-access"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              内部（組織内）
            </label>
            <select
              id="resource-internal-access"
              value={internalAccess}
              onChange={(e) =>
                setInternalAccess(e.target.value as InternalAccess)
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#2EABE3] focus:ring-2 focus:ring-[#2EABE3]/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            >
              {(Object.keys(INTERNAL_ACCESS_LABELS) as InternalAccess[]).map(
                (k) => (
                  <option key={k} value={k}>
                    {INTERNAL_ACCESS_LABELS[k]}
                  </option>
                ),
              )}
            </select>
          </div>

          <div>
            <label
              htmlFor="resource-external-access"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              外部
            </label>
            <select
              id="resource-external-access"
              value={externalAccess}
              onChange={(e) =>
                setExternalAccess(e.target.value as ExternalAccess)
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#2EABE3] focus:ring-2 focus:ring-[#2EABE3]/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            >
              {(Object.keys(EXTERNAL_ACCESS_LABELS) as ExternalAccess[]).map(
                (k) => (
                  <option key={k} value={k}>
                    {EXTERNAL_ACCESS_LABELS[k]}
                  </option>
                ),
              )}
            </select>
          </div>

          <div>
            <label
              htmlFor="resource-url"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              リンク先URL
            </label>
            <input
              id="resource-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:border-[#2EABE3] focus:ring-2 focus:ring-[#2EABE3]/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
            />
          </div>

          <div>
            <label
              htmlFor="resource-folder"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              フォルダ
            </label>
            <select
              id="resource-folder"
              value={folderId ?? ""}
              onChange={(e) =>
                setFolderId(e.target.value === "" ? null : e.target.value)
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#2EABE3] focus:ring-2 focus:ring-[#2EABE3]/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            >
              <option value="">ルート（フォルダなし）</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="flex-1 rounded-lg bg-[#2EABE3] py-2.5 text-sm font-medium text-white transition hover:bg-[#2590c4] disabled:opacity-50"
            >
              {submitting ? (isEditMode ? "保存中…" : "追加中…") : (isEditMode ? "保存" : "追加")}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
