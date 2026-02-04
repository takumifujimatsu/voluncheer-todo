"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean; message: string };

/**
 * クライアントで未捕捉の例外をキャッチし、クラッシュの代わりに案内を表示する。
 */
export class ClientErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : String(error);
    return { hasError: true, message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ClientErrorBoundary:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 dark:bg-slate-900">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-600 dark:bg-slate-800">
            <h1 className="mb-2 text-center text-xl font-semibold text-slate-800 dark:text-slate-100">
              エラーが発生しました
            </h1>
            <p className="mb-4 text-center text-sm text-slate-600 dark:text-slate-400">
              クライアントで例外が発生しています。
            </p>
            <p className="mb-6 rounded-lg bg-slate-100 p-3 font-mono text-xs text-slate-700 dark:bg-slate-700 dark:text-slate-300">
              {this.state.message}
            </p>
            <p className="text-center text-xs text-slate-500 dark:text-slate-500">
              ブラウザの開発者ツール（コンソール）で詳細を確認できます。
              <br />
              NEXT_PUBLIC_FIREBASE_CONFIG が正しい JSON か確認してください。
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
