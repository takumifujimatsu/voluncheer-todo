"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import {
  Search,
  ExternalLink,
  FileText,
  Table,
  FormInput,
  FolderOpen,
  FileQuestion,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FolderPlus,
  FilePlus,
  Star,
  MoreVertical,
  FolderInput,
  Trash2,
  Pencil,
} from "lucide-react";
import type {
  Resource,
  ResourceType,
  ResourceFolder,
  InternalAccess,
  ExternalAccess,
} from "@/types/resource";
import { LIBRARY_DEPARTMENT_FILTERS } from "@/types/resource";
import { AddResourceModal } from "./AddResourceModal";
import { AddFolderModal } from "./AddFolderModal";
import type { Timestamp } from "firebase/firestore";

const RESOURCE_LIBRARY_DEPARTMENT_KEY = "voluncheer-resource-library-department";

function formatUpdatedAt(updatedAt: unknown): string {
  if (updatedAt == null) return "—";
  if (typeof (updatedAt as Timestamp)?.toDate === "function") {
    const d = (updatedAt as Timestamp).toDate();
    return d.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }
  return String(updatedAt);
}

const INTERNAL_ACCESS_LABELS: Record<InternalAccess, string> = {
  none: "不可",
  view: "閲覧可",
  edit: "編集可",
};
const EXTERNAL_ACCESS_LABELS: Record<ExternalAccess, string> = {
  none: "不可",
  view: "閲覧可",
  edit: "編集可",
};

const CANVA_ICON_URL = "/canva_icon.png";

function getTypeIcon(type: ResourceType): {
  Icon?: React.ComponentType<{ className?: string }>;
  color?: string;
  imageUrl?: string;
} {
  switch (type) {
    case "canva":
      return { imageUrl: CANVA_ICON_URL };
    case "spreadsheet":
      return { Icon: Table, color: "text-green-600 dark:text-green-400" };
    case "document":
      return { Icon: FileText, color: "text-blue-600 dark:text-blue-400" };
    case "form":
      return { Icon: FormInput, color: "text-amber-600 dark:text-amber-400" };
    case "drive":
      return { Icon: FolderOpen, color: "text-slate-600 dark:text-slate-400" };
    case "pdf":
      return { Icon: FileText, color: "text-red-600 dark:text-red-400" };
    default:
      return { Icon: FileQuestion, color: "text-slate-500 dark:text-slate-400" };
  }
}

/** フォルダ一覧から parentId でツリーを構築。ルートのみ返す（子は folder.children に再帰） */
function buildFolderTree(
  folders: ResourceFolder[],
  parentId: string | null,
): ResourceFolder[] {
  return folders
    .filter((f) => f.parentId === parentId)
    .sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      return aName.localeCompare(bName);
    });
}

/** フォルダとその子孫の id を収集（移動先から除外するため） */
function getFolderDescendantIds(
  folderId: string,
  all: ResourceFolder[],
): Set<string> {
  const ids = new Set<string>([folderId]);
  let added = true;
  while (added) {
    added = false;
    for (const f of all) {
      if (f.parentId && ids.has(f.parentId) && !ids.has(f.id)) {
        ids.add(f.id);
        added = true;
      }
    }
  }
  return ids;
}

type TreeNodeProps = {
  folder: ResourceFolder;
  allFolders: ResourceFolder[];
  expandedIds: Set<string>;
  selectedFolderId: string | null;
  onToggle: (id: string) => void;
  onSelect: (id: string | null) => void;
  onMenuClick: (folderId: string, rect: DOMRect) => void;
};

function TreeNode({
  folder,
  allFolders,
  expandedIds,
  selectedFolderId,
  onToggle,
  onSelect,
  onMenuClick,
}: TreeNodeProps) {
  const children = buildFolderTree(allFolders, folder.id);
  const isExpanded = expandedIds.has(folder.id);
  const isSelected = selectedFolderId === folder.id;

  return (
    <div className="min-w-0">
      <div
        className={`flex items-center gap-0.5 rounded-lg px-2 py-1.5 text-sm transition ${
          isSelected
            ? "bg-[#2EABE3]/15 text-[#1a6b94] dark:bg-[#2EABE3]/25 dark:text-slate-100"
            : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
        }`}
      >
        <button
          type="button"
          onClick={() => onToggle(folder.id)}
          className="shrink-0 p-0.5 -m-0.5 rounded"
          aria-label={isExpanded ? "折りたたむ" : "展開する"}
        >
          {children.length > 0 ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )
          ) : (
            <span className="inline-block w-4" aria-hidden />
          )}
        </button>
        <button
          type="button"
          onClick={() => onSelect(folder.id)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <FolderOpen className="h-4 w-4 shrink-0 text-slate-500" />
          <span className="truncate">{folder.name}</span>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMenuClick(folder.id, e.currentTarget.getBoundingClientRect());
          }}
          className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-600 dark:hover:text-slate-200"
          aria-label="フォルダのメニュー"
          title="メニュー"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>
      {isExpanded && children.length > 0 && (
        <div className="ml-4 border-l border-slate-200 pl-1 dark:border-slate-600">
          {children.map((child) => (
            <TreeNode
              key={child.id}
              folder={child}
              allFolders={allFolders}
              expandedIds={expandedIds}
              selectedFolderId={selectedFolderId}
              onToggle={onToggle}
              onSelect={onSelect}
              onMenuClick={onMenuClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function getInitialDepartment(): string {
  if (typeof window === "undefined") return "すべて";
  const saved = localStorage.getItem(RESOURCE_LIBRARY_DEPARTMENT_KEY);
  if (saved && (LIBRARY_DEPARTMENT_FILTERS as readonly string[]).includes(saved))
    return saved;
  return "すべて";
}

export type ResourceLibraryProps = {
  /** ログイン中ユーザーの uid。お気に入りの取得・更新に使用 */
  currentUserUid?: string | null;
};

export function ResourceLibrary({ currentUserUid }: ResourceLibraryProps) {
  const [folders, setFolders] = useState<ResourceFolder[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("すべて");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(
    new Set(),
  );
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [addResourceOpen, setAddResourceOpen] = useState(false);
  const [addFolderOpen, setAddFolderOpen] = useState(false);
  const [openFolderMenu, setOpenFolderMenu] = useState<{
    id: string;
    rect: DOMRect;
  } | null>(null);
  const [openResourceMenu, setOpenResourceMenu] = useState<{
    id: string;
    rect: DOMRect;
  } | null>(null);
  const [deleteConfirmFolder, setDeleteConfirmFolder] =
    useState<ResourceFolder | null>(null);
  const [moveFolderTarget, setMoveFolderTarget] =
    useState<ResourceFolder | null>(null);
  const [renameFolderTarget, setRenameFolderTarget] =
    useState<ResourceFolder | null>(null);
  const [deleteConfirmResource, setDeleteConfirmResource] =
    useState<Resource | null>(null);
  const [moveResourceTarget, setMoveResourceTarget] =
    useState<Resource | null>(null);
  const [editResource, setEditResource] = useState<Resource | null>(null);
  /** 表示順（フォルダ・資料の並び）。users/{uid}/resourceLibraryOrder/{orderKey} の order フィールド */
  const [itemOrder, setItemOrder] = useState<string[]>([]);

  const isFirstSaveRef = useRef(true);

  /** 並び順を保存する Firestore の doc のキー（部署:フォルダID または 部署:root） */
  const orderKey = useMemo(
    () =>
      selectedDepartment === "すべて"
        ? null
        : `${selectedDepartment}:${selectedFolderId ?? "root"}`,
    [selectedDepartment, selectedFolderId],
  );

  useEffect(() => {
    if (!currentUserUid || !orderKey) {
      setItemOrder([]);
      return;
    }
    const db = getDb();
    const ref = doc(db, "users", currentUserUid, "resourceLibraryOrder", orderKey);
    const unsub = onSnapshot(ref, (snap) => {
      const data = snap.data();
      setItemOrder((data?.order as string[] | undefined) ?? []);
    });
    return () => unsub();
  }, [currentUserUid, orderKey]);

  useEffect(() => {
    setSelectedDepartment(getInitialDepartment());
  }, []);

  useEffect(() => {
    if (isFirstSaveRef.current) {
      isFirstSaveRef.current = false;
      return;
    }
    localStorage.setItem(RESOURCE_LIBRARY_DEPARTMENT_KEY, selectedDepartment);
  }, [selectedDepartment]);

  useEffect(() => {
    const db = getDb();
    const unsubF: Unsubscribe = onSnapshot(
      collection(db, "resourceFolders"),
      (snap) => {
        const list: ResourceFolder[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: (data.name as string) ?? "",
            department: (data.department as string) ?? "全体",
            parentId: (data.parentId as string | null) ?? null,
            createdAt: data.createdAt,
          };
        });
        setFolders(list);
      },
    );
    const unsubR: Unsubscribe = onSnapshot(
      collection(db, "resources"),
      (snap) => {
        const list: Resource[] = snap.docs.map((d) => {
          const data = d.data();
          const updatedAt = data.updatedAt;
          let internalAccess = data.internalAccess as InternalAccess | undefined;
          let externalAccess = data.externalAccess as ExternalAccess | undefined;
          if (internalAccess == null || externalAccess == null) {
            const legacy = data.accessLevel as "public" | "admin_only" | undefined;
            if (legacy === "public") {
              internalAccess = internalAccess ?? "edit";
              externalAccess = externalAccess ?? "view";
            } else {
              internalAccess = internalAccess ?? "edit";
              externalAccess = externalAccess ?? "none";
            }
          }
          return {
            id: d.id,
            title: (data.title as string) ?? "",
            type: (data.type as ResourceType) ?? "other",
            description: (data.description as string) ?? "",
            department: (data.department as string) ?? "",
            internalAccess,
            externalAccess,
            url: (data.url as string) ?? "",
            updatedAt: formatUpdatedAt(updatedAt),
            folderId: (data.folderId as string | null) ?? null,
          };
        });
        setResources(list);
      },
    );
    return () => {
      unsubF();
      unsubR();
    };
  }, []);

  useEffect(() => {
    if (!currentUserUid) {
      setFavoriteIds(new Set());
      return;
    }
    const db = getDb();
    const ref = collection(db, "users", currentUserUid, "resourceFavorites");
    const unsub = onSnapshot(ref, (snap) => {
      const ids = new Set(snap.docs.map((d) => d.id));
      setFavoriteIds(ids);
    });
    return () => unsub();
  }, [currentUserUid]);

  const toggleFavorite = async (resourceId: string) => {
    if (!currentUserUid) return;
    const db = getDb();
    const ref = doc(db, "users", currentUserUid, "resourceFavorites", resourceId);
    if (favoriteIds.has(resourceId)) {
      await deleteDoc(ref);
    } else {
      await setDoc(ref, { addedAt: serverTimestamp() });
    }
  };

  useEffect(() => {
    if (!openFolderMenu && !openResourceMenu) return;
    let removeListener: (() => void) | null = null;
    const t = setTimeout(() => {
      const onDocClick = () => {
        setOpenFolderMenu(null);
        setOpenResourceMenu(null);
      };
      document.addEventListener("mousedown", onDocClick);
      removeListener = () =>
        document.removeEventListener("mousedown", onDocClick);
    }, 0);
    return () => {
      clearTimeout(t);
      removeListener?.();
    };
  }, [openFolderMenu, openResourceMenu]);

  const toggleFolder = (id: string) => {
    setExpandedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteFolder = async (folder: ResourceFolder) => {
    const db = getDb();
    const batch = writeBatch(db);
    const folderRef = doc(db, "resourceFolders", folder.id);
    const resourcesInFolder = resources.filter((r) => r.folderId === folder.id);
    const childFolders = folders.filter((f) => f.parentId === folder.id);
    for (const r of resourcesInFolder) {
      batch.delete(doc(db, "resources", r.id));
    }
    for (const f of childFolders) {
      batch.update(doc(db, "resourceFolders", f.id), {
        parentId: folder.parentId,
      });
    }
    batch.delete(folderRef);
    await batch.commit();
    setDeleteConfirmFolder(null);
    if (selectedFolderId === folder.id) setSelectedFolderId(null);
  };

  const handleMoveFolder = async (folder: ResourceFolder, newParentId: string | null) => {
    const db = getDb();
    await updateDoc(doc(db, "resourceFolders", folder.id), {
      parentId: newParentId,
    });
    setMoveFolderTarget(null);
  };

  const handleDeleteResource = async (resource: Resource) => {
    const db = getDb();
    await deleteDoc(doc(db, "resources", resource.id));
    setDeleteConfirmResource(null);
  };

  const handleMoveResource = async (resource: Resource, newFolderId: string | null) => {
    const db = getDb();
    await updateDoc(doc(db, "resources", resource.id), {
      folderId: newFolderId,
      updatedAt: serverTimestamp(),
    });
    setMoveResourceTarget(null);
  };

  /** 選択中の部署のフォルダのみ（「すべて」のときは空） */
  const foldersForDepartment = useMemo(() => {
    if (selectedDepartment === "すべて") return [];
    return folders.filter((f) => f.department === selectedDepartment);
  }, [folders, selectedDepartment]);

  /** 選択中フォルダとその子孫フォルダの id 一覧（フォルダ表示時はこの中にある資料をすべて表示） */
  const selectedFolderAndDescendantIds = useMemo(() => {
    if (selectedFolderId === null || foldersForDepartment.length === 0)
      return null;
    return getFolderDescendantIds(selectedFolderId, foldersForDepartment);
  }, [selectedFolderId, foldersForDepartment]);

  const filteredResources = useMemo(() => {
    let list = resources;

    if (selectedDepartment !== "すべて") {
      list = list.filter((r) => r.department === selectedDepartment);
    }

    if (selectedFolderAndDescendantIds !== null) {
      list = list.filter((r) =>
        r.folderId !== null
          ? selectedFolderAndDescendantIds.has(r.folderId)
          : false,
      );
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q),
      );
    }

    return list;
  }, [
    resources,
    selectedFolderId,
    selectedFolderAndDescendantIds,
    selectedDepartment,
    searchQuery,
  ]);

  /** 選択中フォルダの直下の子フォルダ（資料エリアにカード表示する用） */
  const childFoldersInView = useMemo(() => {
    if (selectedFolderId === null) return [];
    return foldersForDepartment
      .filter((f) => f.parentId === selectedFolderId)
      .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  }, [selectedFolderId, foldersForDepartment]);

  const rootFolders = useMemo(
    () => buildFolderTree(foldersForDepartment, null),
    [foldersForDepartment],
  );

  const canAddFolder = selectedDepartment !== "すべて";

  /** 資料エリアに表示する件数（子フォルダ + 資料） */
  const totalItemsInView =
    childFoldersInView.length + filteredResources.length;

  /** 表示用の統合リスト（フォルダ＋資料）。保存された並び順を反映 */
  type ViewItem =
    | { type: "folder"; id: string; folder: ResourceFolder }
    | { type: "resource"; id: string; resource: Resource };
  const PREFIX_FOLDER = "f:";
  const PREFIX_RESOURCE = "r:";
  const itemsInOrder = useMemo((): ViewItem[] => {
    const folderItems: ViewItem[] = childFoldersInView.map((folder) => ({
      type: "folder",
      id: `${PREFIX_FOLDER}${folder.id}`,
      folder,
    }));
    const resourceItems: ViewItem[] = filteredResources.map((resource) => ({
      type: "resource",
      id: `${PREFIX_RESOURCE}${resource.id}`,
      resource,
    }));
    const all = [...folderItems, ...resourceItems];
    if (all.length === 0) return [];
    if (!currentUserUid || itemOrder.length === 0) {
      type FolderItem = Extract<ViewItem, { type: "folder" }>;
      type ResourceItem = Extract<ViewItem, { type: "resource" }>;
      return [
        ...(folderItems as FolderItem[]).sort((a, b) =>
          a.folder.name.toLowerCase().localeCompare(b.folder.name.toLowerCase()),
        ),
        ...(resourceItems as ResourceItem[]).sort((a, b) =>
          a.resource.title.toLowerCase().localeCompare(b.resource.title.toLowerCase()),
        ),
      ];
    }
    const orderSet = new Set(itemOrder);
    const byId = new Map<string, ViewItem>();
    for (const it of all) byId.set(it.id, it);
    const ordered: ViewItem[] = [];
    for (const id of itemOrder) {
      const it = byId.get(id);
      if (it) ordered.push(it);
    }
    const rest = all.filter((it) => !orderSet.has(it.id));
    const restFolders = rest.filter((x): x is ViewItem & { type: "folder" } => x.type === "folder");
    const restResources = rest.filter((x): x is ViewItem & { type: "resource" } => x.type === "resource");
    restFolders.sort((a, b) =>
      a.folder.name.toLowerCase().localeCompare(b.folder.name.toLowerCase()),
    );
    restResources.sort((a, b) =>
      a.resource.title.toLowerCase().localeCompare(b.resource.title.toLowerCase()),
    );
    return [...ordered, ...restFolders, ...restResources];
  }, [
    childFoldersInView,
    filteredResources,
    itemOrder,
    currentUserUid,
  ]);

  const saveItemOrder = async (newOrder: string[]) => {
    if (!currentUserUid || !orderKey) return;
    const db = getDb();
    const ref = doc(db, "users", currentUserUid, "resourceLibraryOrder", orderKey);
    await setDoc(ref, { order: newOrder });
  };

  const moveItem = (itemId: string, direction: "up" | "down") => {
    const currentIds = itemsInOrder.map((it) => it.id);
    const idx = currentIds.indexOf(itemId);
    if (idx < 0) return;
    const nextIdx = direction === "up" ? idx - 1 : idx + 1;
    if (nextIdx < 0 || nextIdx >= currentIds.length) return;
    const next = [...currentIds];
    [next[idx], next[nextIdx]] = [next[nextIdx], next[idx]];
    saveItemOrder(next);
  };

  const handleAddResource = async (params: {
    title: string;
    type: ResourceType;
    description: string;
    department: string;
    internalAccess: InternalAccess;
    externalAccess: ExternalAccess;
    url: string;
    folderId: string | null;
  }) => {
    const db = getDb();
    if (editResource) {
      await updateDoc(doc(db, "resources", editResource.id), {
        title: params.title,
        type: params.type,
        description: params.description,
        department: params.department,
        internalAccess: params.internalAccess,
        externalAccess: params.externalAccess,
        url: params.url || "#",
        folderId: params.folderId,
        updatedAt: serverTimestamp(),
      });
      setEditResource(null);
    } else {
      await addDoc(collection(db, "resources"), {
        title: params.title,
        type: params.type,
        description: params.description,
        department: params.department,
        internalAccess: params.internalAccess,
        externalAccess: params.externalAccess,
        url: params.url || "#",
        folderId: params.folderId,
        updatedAt: serverTimestamp(),
      });
      setAddResourceOpen(false);
    }
  };

  const handleAddFolder = async (params: {
    name: string;
    parentId: string | null;
  }) => {
    if (selectedDepartment === "すべて") return;
    const db = getDb();
    if (renameFolderTarget) {
      await updateDoc(doc(db, "resourceFolders", renameFolderTarget.id), {
        name: params.name.trim(),
      });
      setRenameFolderTarget(null);
      setAddFolderOpen(false);
    } else {
      await addDoc(collection(db, "resourceFolders"), {
        name: params.name.trim(),
        department: selectedDepartment,
        parentId: params.parentId,
        createdAt: serverTimestamp(),
      });
      setAddFolderOpen(false);
    }
  };

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* ツリーサイドバー（部署を選択したときだけその部署のフォルダを表示） */}
        <aside className="w-full shrink-0 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-600 dark:bg-slate-800 lg:w-56">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              フォルダ
            </span>
            {canAddFolder ? (
              <button
                type="button"
                onClick={() => setAddFolderOpen(true)}
                className="rounded p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                title={`${selectedDepartment}のフォルダを追加`}
                aria-label="フォルダを追加"
              >
                <FolderPlus className="h-4 w-4" />
              </button>
            ) : (
              <span
                className="rounded p-1.5 text-slate-400"
                title="部署を選択するとフォルダを追加できます"
              >
                <FolderPlus className="h-4 w-4" />
              </span>
            )}
          </div>
          {selectedDepartment === "すべて" ? (
            <p className="rounded-lg bg-slate-50 px-2 py-3 text-xs text-slate-500 dark:bg-slate-700/50 dark:text-slate-400">
              部署を選択すると、その部署のフォルダがここに表示されます。企画部のフォルダは営業部には表示されません。
            </p>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setSelectedFolderId(null)}
                className={`mb-1 w-full rounded-lg px-2 py-1.5 text-left text-sm transition ${
                  selectedFolderId === null
                    ? "bg-[#2EABE3]/15 font-medium text-[#1a6b94] dark:bg-[#2EABE3]/25 dark:text-slate-100"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {selectedDepartment}の資料すべて
              </button>
              {rootFolders.map((folder) => (
                <TreeNode
                  key={folder.id}
                  folder={folder}
                  allFolders={foldersForDepartment}
                  expandedIds={expandedFolderIds}
                  selectedFolderId={selectedFolderId}
                  onToggle={toggleFolder}
                  onSelect={setSelectedFolderId}
                  onMenuClick={(id, rect) => setOpenFolderMenu({ id, rect })}
                />
              ))}
            </>
          )}
        </aside>

        {/* メイン: 検索・部署・グリッド */}
        <div className="min-w-0 flex-1 space-y-4">
          <div className="space-y-4">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="資料名・内容で検索..."
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#2EABE3] focus:ring-2 focus:ring-[#2EABE3]/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                aria-label="検索"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {LIBRARY_DEPARTMENT_FILTERS.map((dept) => (
                <button
                  key={dept}
                  type="button"
                  onClick={() => setSelectedDepartment(dept)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    selectedDepartment === dept
                      ? "bg-[#2EABE3] text-white dark:bg-[#2EABE3] dark:text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {totalItemsInView} 件
            </span>
            <button
              type="button"
              onClick={() => setAddResourceOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#2EABE3] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#2590c4]"
            >
              <FilePlus className="h-4 w-4" />
              資料を追加
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {itemsInOrder.map((viewItem, index) => {
              const canMoveUp = !!currentUserUid && !!orderKey && index > 0;
              const canMoveDown = !!currentUserUid && !!orderKey && index < itemsInOrder.length - 1;
              const orderButtons = currentUserUid && orderKey && (
                <div className="flex shrink-0 flex-col gap-0.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    disabled={!canMoveUp}
                    onClick={() => moveItem(viewItem.id, "up")}
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                    title="上へ"
                    aria-label="上へ"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={!canMoveDown}
                    onClick={() => moveItem(viewItem.id, "down")}
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                    title="下へ"
                    aria-label="下へ"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              );
              if (viewItem.type === "folder") {
                const { folder } = viewItem;
                return (
                  <article
                    key={viewItem.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedFolderId(folder.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedFolderId(folder.id);
                      }
                    }}
                    className="flex cursor-pointer flex-col rounded-lg border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-slate-600 dark:bg-slate-800"
                    aria-label={`${folder.name}フォルダを開く`}
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 p-3 dark:border-slate-700">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        {orderButtons}
                        <span className="text-slate-600 dark:text-slate-400" aria-hidden>
                          <FolderOpen className="h-5 w-5 shrink-0" />
                        </span>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-600 dark:text-slate-200">
                        {folder.department}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-3">
                      <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                        {folder.name}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        フォルダ
                      </p>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-100 p-3 dark:border-slate-700">
                      <span className="inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        タップで開く
                      </span>
                    </div>
                  </article>
                );
              }
              const { resource } = viewItem;
              const typeIcon = getTypeIcon(resource.type);
              return (
                <article
                  key={viewItem.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (resource.url && resource.url !== "#") {
                      window.open(resource.url, "_blank", "noopener,noreferrer");
                    }
                  }}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && resource.url && resource.url !== "#") {
                      e.preventDefault();
                      window.open(resource.url, "_blank", "noopener,noreferrer");
                    }
                  }}
                  className="flex cursor-pointer flex-col rounded-lg border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-slate-600 dark:bg-slate-800"
                  aria-label={`${resource.title}を開く`}
                >
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 p-3 dark:border-slate-700">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      {orderButtons}
                      <span className={typeIcon.color ?? ""} aria-hidden>
                        {typeIcon.imageUrl ? (
                          <img
                            src={typeIcon.imageUrl}
                            alt=""
                            className="h-5 w-5 shrink-0 object-contain"
                            width={20}
                            height={20}
                          />
                        ) : (
                          typeIcon.Icon && (
                            <typeIcon.Icon className="h-5 w-5 shrink-0" />
                          )
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {currentUserUid && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(resource.id);
                          }}
                          className={`rounded p-1.5 transition ${
                            favoriteIds.has(resource.id)
                              ? "text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300"
                              : "text-slate-400 hover:text-amber-500 dark:text-slate-500 dark:hover:text-amber-400"
                          }`}
                          title={favoriteIds.has(resource.id) ? "お気に入りを解除" : "お気に入りに追加"}
                          aria-label={favoriteIds.has(resource.id) ? "お気に入りを解除" : "お気に入りに追加"}
                        >
                          <Star
                            className={`h-4 w-4 shrink-0 ${
                              favoriteIds.has(resource.id) ? "fill-current" : ""
                            }`}
                            aria-hidden
                          />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenResourceMenu({
                            id: resource.id,
                            rect: e.currentTarget.getBoundingClientRect(),
                          });
                        }}
                        className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-600 dark:hover:text-slate-200"
                        title="メニュー"
                        aria-label="資料のメニュー"
                      >
                        <MoreVertical className="h-4 w-4 shrink-0" />
                      </button>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-600 dark:text-slate-200">
                        {resource.department}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-3">
                    <div className="flex flex-wrap gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <span title="内部">内部: {INTERNAL_ACCESS_LABELS[resource.internalAccess]}</span>
                      <span aria-hidden>/</span>
                      <span title="外部">外部: {EXTERNAL_ACCESS_LABELS[resource.externalAccess]}</span>
                    </div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                      {resource.title}
                    </h3>
                    <p className="line-clamp-2 flex-1 text-sm text-slate-600 dark:text-slate-400">
                      {resource.description || "—"}
                    </p>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 p-3 dark:border-slate-700">
                    <span className="inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      タップで開く
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {resource.updatedAt}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>

          {totalItemsInView === 0 && (
            <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              条件に一致する資料はありません。フォルダを選ぶか「資料を追加」で登録してください。
            </p>
          )}
        </div>
      </div>

      <AddResourceModal
        isOpen={addResourceOpen || !!editResource}
        onClose={() => {
          setAddResourceOpen(false);
          setEditResource(null);
        }}
        folders={
          editResource
            ? folders.filter((f) => f.department === editResource.department)
            : foldersForDepartment
        }
        defaultFolderId={editResource?.folderId ?? selectedFolderId}
        defaultDepartment={
          editResource
            ? editResource.department
            : selectedDepartment === "すべて"
              ? undefined
              : selectedDepartment
        }
        editResource={editResource}
        onSubmit={handleAddResource}
      />
      <AddFolderModal
        isOpen={addFolderOpen}
        onClose={() => {
          setAddFolderOpen(false);
          setRenameFolderTarget(null);
        }}
        folders={foldersForDepartment}
        defaultParentId={renameFolderTarget?.parentId ?? selectedFolderId}
        editFolder={renameFolderTarget}
        onSubmit={handleAddFolder}
      />

      {/* フォルダメニュー（左クリックで表示） */}
      {openFolderMenu && (() => {
        const folder = folders.find((f) => f.id === openFolderMenu.id);
        if (!folder) return null;
        const { rect } = openFolderMenu;
        const openMoveModal = () => {
          setOpenFolderMenu(null);
          setMoveFolderTarget(folder);
        };
        const openDeleteModal = () => {
          setOpenFolderMenu(null);
          setDeleteConfirmFolder(folder);
        };
        return (
          <div
            className="fixed z-50 min-w-[140px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-800"
            style={{ left: rect.left, top: rect.bottom + 4 }}
            role="menu"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
              role="menuitem"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpenFolderMenu(null);
                setRenameFolderTarget(folder);
                setAddFolderOpen(true);
              }}
            >
              <Pencil className="h-4 w-4 shrink-0" />
              名前を変更
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
              role="menuitem"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openMoveModal();
              }}
            >
              <FolderInput className="h-4 w-4 shrink-0" />
              移動
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              role="menuitem"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openDeleteModal();
              }}
            >
              <Trash2 className="h-4 w-4 shrink-0" />
              削除
            </button>
          </div>
        );
      })()}

      {/* フォルダ削除確認モーダル */}
      {deleteConfirmFolder && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="folder-delete-title"
          onClick={() => setDeleteConfirmFolder(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-600 dark:bg-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="folder-delete-title" className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
              フォルダを削除
            </h3>
            <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
              「{deleteConfirmFolder.name}」を削除しますか？フォルダ内の資料もすべて削除され、子フォルダは一つ上に移動します。この操作は取り消せません。
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmFolder(null)}
                className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-700 dark:border-slate-600 dark:text-slate-200"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => handleDeleteFolder(deleteConfirmFolder)}
                className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700"
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* フォルダ移動先選択モーダル */}
      {moveFolderTarget && (() => {
        const excludeIds = getFolderDescendantIds(
          moveFolderTarget.id,
          foldersForDepartment,
        );
        const candidates = foldersForDepartment
          .filter((f) => !excludeIds.has(f.id))
          .sort((a, b) => a.name.localeCompare(b.name));
        return (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="folder-move-title"
            onClick={() => setMoveFolderTarget(null)}
          >
            <div
              className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-600 dark:bg-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 id="folder-move-title" className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-100">
                移動先を選択
              </h3>
              <p className="mb-2 text-sm text-slate-600 dark:text-slate-400">
                「{moveFolderTarget.name}」の新しい親フォルダを選んでください
              </p>
              <div className="max-h-60 space-y-1 overflow-y-auto">
                <button
                  type="button"
                  onClick={() =>
                    handleMoveFolder(moveFolderTarget, null)
                  }
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  （ルート）
                </button>
                {candidates.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleMoveFolder(moveFolderTarget, f.id)}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    {f.name}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setMoveFolderTarget(null)}
                className="mt-4 w-full rounded-lg border border-slate-200 py-2 text-sm font-medium dark:border-slate-600"
              >
                キャンセル
              </button>
            </div>
          </div>
        );
      })()}

      {/* 資料メニュー（左クリックで表示） */}
      {openResourceMenu && (() => {
        const resource = resources.find((r) => r.id === openResourceMenu.id);
        if (!resource) return null;
        const { rect } = openResourceMenu;
        const openEditModal = () => {
          setOpenResourceMenu(null);
          setEditResource(resource);
        };
        const openMoveModal = () => {
          setOpenResourceMenu(null);
          setMoveResourceTarget(resource);
        };
        const openDeleteModal = () => {
          setOpenResourceMenu(null);
          setDeleteConfirmResource(resource);
        };
        return (
          <div
            className="fixed z-50 min-w-[140px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-800"
            style={{ left: rect.left, top: rect.bottom + 4 }}
            role="menu"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
              role="menuitem"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openEditModal();
              }}
            >
              <Pencil className="h-4 w-4 shrink-0" />
              編集
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
              role="menuitem"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openMoveModal();
              }}
            >
              <FolderInput className="h-4 w-4 shrink-0" />
              移動
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              role="menuitem"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openDeleteModal();
              }}
            >
              <Trash2 className="h-4 w-4 shrink-0" />
              削除
            </button>
          </div>
        );
      })()}

      {/* 資料削除確認モーダル */}
      {deleteConfirmResource && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="resource-delete-title"
          onClick={() => setDeleteConfirmResource(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-600 dark:bg-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="resource-delete-title" className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
              資料を削除
            </h3>
            <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
              「{deleteConfirmResource.title}」を削除しますか？この操作は取り消せません。
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmResource(null)}
                className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-700 dark:border-slate-600 dark:text-slate-200"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => handleDeleteResource(deleteConfirmResource)}
                className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700"
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 資料移動先選択 */}
      {/* 資料移動先選択モーダル */}
      {moveResourceTarget && (() => {
        const deptFolders = folders
          .filter((f) => f.department === moveResourceTarget.department)
          .sort((a, b) => a.name.localeCompare(b.name));
        return (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="resource-move-title"
            onClick={() => setMoveResourceTarget(null)}
          >
            <div
              className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-600 dark:bg-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 id="resource-move-title" className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-100">
                移動先を選択
              </h3>
              <p className="mb-2 text-sm text-slate-600 dark:text-slate-400">
                「{moveResourceTarget.title}」を入れるフォルダを選んでください（{moveResourceTarget.department}）
              </p>
              <div className="max-h-60 space-y-1 overflow-y-auto">
                <button
                  type="button"
                  onClick={() =>
                    handleMoveResource(moveResourceTarget, null)
                  }
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  （ルート）
                </button>
                {deptFolders.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() =>
                      handleMoveResource(moveResourceTarget, f.id)
                    }
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    {f.name}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setMoveResourceTarget(null)}
                className="mt-4 w-full rounded-lg border border-slate-200 py-2 text-sm font-medium dark:border-slate-600"
              >
                キャンセル
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
