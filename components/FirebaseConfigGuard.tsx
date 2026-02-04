"use client";

import type { ReactNode } from "react";

/**
 * NEXT_PUBLIC_FIREBASE_CONFIG が未設定のときはアプリを描画せず案内を表示する。
 * Vercel など本番で環境変数が未設定だとクライアントで例外になるのを防ぐ。
 */
export function FirebaseConfigGuard({ children }: { children: ReactNode }) {
  const config = process.env.NEXT_PUBLIC_FIREBASE_CONFIG;
  if (!config || typeof config !== "string" || config.trim() === "") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 dark:bg-slate-900">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-600 dark:bg-slate-800">
          <h1 className="mb-2 text-center text-xl font-semibold text-slate-800 dark:text-slate-100">
            設定が必要です
          </h1>
          <p className="mb-4 text-center text-sm text-slate-600 dark:text-slate-400">
            Firebase の環境変数が設定されていません。
          </p>
          <p className="mb-6 text-center text-sm text-slate-500 dark:text-slate-500">
            Vercel の <strong>Project → Settings → Environment Variables</strong> に
            <br />
            <code className="mt-2 inline-block rounded bg-slate-100 px-2 py-1 text-xs dark:bg-slate-700">
              NEXT_PUBLIC_FIREBASE_CONFIG
            </code>
            <br />
            を追加し、Firebase の Web アプリ設定（JSON）を設定してください。
          </p>
          <p className="text-center text-xs text-slate-400 dark:text-slate-500">
            設定後、再デプロイが必要です。
          </p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
