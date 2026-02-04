"use client";

import { useEffect, useState, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { DEPARTMENTS, ALL_DEPARTMENTS_LABEL } from "@/types/task";

const STORAGE_KEY = "voluncheer-selected-departments";

export type DepartmentSelectorProps = {
  value: string[];
  onChange: (departments: string[]) => void;
  /** true のとき localStorage から初期値を読み込まない（URL を優先する場合に使用） */
  disableLocalStorageInit?: boolean;
};

export function DepartmentSelector({
  value,
  onChange,
  disableLocalStorageInit = false,
}: DepartmentSelectorProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (disableLocalStorageInit) {
      setMounted(true);
      return;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw != null) {
      try {
        const parsed = JSON.parse(raw) as unknown;
        const deptSet = new Set<string>(DEPARTMENTS);
        if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string" && deptSet.has(x))) {
          onChange(parsed);
        }
      } catch {
        const legacy = localStorage.getItem("voluncheer-selected-department");
        if (legacy === ALL_DEPARTMENTS_LABEL) {
          onChange([]);
        } else if (legacy && (DEPARTMENTS as readonly string[]).includes(legacy)) {
          onChange([legacy]);
        }
      }
    }
    setMounted(true);
  }, [onChange, disableLocalStorageInit]);

  useEffect(() => {
    if (!mounted || disableLocalStorageInit) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  }, [mounted, disableLocalStorageInit, value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const isAll = value.length === 0;
  const displayLabel = isAll ? ALL_DEPARTMENTS_LABEL : value.length === 1 ? value[0] : `${value.length}部署`;

  const handleAllChange = (checked: boolean) => {
    if (checked) {
      onChange([]);
    }
  };

  const handleDeptChange = (dept: string, checked: boolean) => {
    if (checked) {
      onChange([...value.filter((d) => d !== dept), dept].sort());
    } else {
      const next = value.filter((d) => d !== dept);
      onChange(next);
    }
  };

  return (
    <div className="relative inline-block w-full max-w-[100px] min-w-0 sm:w-auto sm:min-w-[120px] sm:max-w-[180px]" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white py-1.5 pl-2.5 pr-8 text-sm font-medium text-slate-800 shadow-sm outline-none transition focus:border-[#2EABE3] focus:ring-2 focus:ring-[#2EABE3]/20 sm:py-2.5 sm:pl-4 sm:pr-10 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
        aria-label="部署を選択"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown
          className={`pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition sm:right-3 ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open && (
        <div
          className="absolute left-0 top-full z-20 mt-1 max-h-80 w-full min-w-[220px] overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-800"
          role="listbox"
        >
          <label className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700">
            <input
              type="checkbox"
              checked={isAll}
              onChange={(e) => handleAllChange(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-[#2EABE3] focus:ring-[#2EABE3] dark:border-slate-500"
            />
            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{ALL_DEPARTMENTS_LABEL}</span>
          </label>
          <div className="border-t border-slate-100 dark:border-slate-700" />
          {DEPARTMENTS.map((dept) => (
            <label key={dept} className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700">
              <input
                type="checkbox"
                checked={!isAll && value.includes(dept)}
                onChange={(e) => handleDeptChange(dept, e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#2EABE3] focus:ring-[#2EABE3] dark:border-slate-500"
              />
              <span className="text-sm text-slate-800 dark:text-slate-200">{dept}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
