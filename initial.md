あなたはNext.js (App Router), TypeScript, Tailwind CSS, Firebaseのエキスパートです。
以下の要件に基づいて、NPO法人内のタスク管理アプリケーションの実装コードを作成してください。
すでに `npx create-next-app@latest voluncheer-todo --typescript --tailwind --eslint` は実行済みです。

## 技術スタック
- Framework: Next.js 14+ (App Router)
- Language: TypeScript
- Styling: Tailwind CSS
- Backend/DB: Firebase v9+ (Firestore, Auth)
- Icons: lucide-react


// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration（Firebase Console で取得した値に置き換える）
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);



## アプリケーションの概要
9つの部署に分かれた組織内で、タスクを共有・管理するためのカンバンボード形式のアプリ。

## 必須機能要件

1. **部署フィルタリングと永続化 (最重要)**
   - ヘッダーに部署を選択するドロップダウンメニューを配置してください。
   - **部署リスト:** 執行役員, 営業部, 広報部, デザイン部, オペレーション部, 企画部, 総務部, 開発部, 経理部, 全体表示
   - ユーザーが選択した部署を `localStorage` に保存し、次回アクセス時に自動的にその部署が選択された状態で表示されるようにしてください（useEffectを使用）。
   - 「全体表示」以外が選択されているときは、その部署のタスクのみを表示してください。

2. **タスク管理 (Firestore)**
   - コレクション名: `tasks`
   - データ構造:
     - `id`: string
     - `title`: string (タスク名)
     - `department`: string (担当部署)
     - `status`: "todo" | "doing" | "done"
     - `createdAt`: serverTimestamp
   - カンバンボード形式（3カラム: ToDo, Doing, Done）で表示。
   - タスクの追加、ステータスのドラッグ&ドロップ（またはボタン移動）、削除ができること。

3. **認証 (Firebase Auth)**
   - Googleログイン機能を実装してください。
   - ログインしていないユーザーにはログイン画面を表示してください。

## 出力してほしいファイルと構成
以下のファイルの具体的なコードを提示してください。
1. `lib/firebase.ts` (Firebaseの初期化設定)
2. `types/task.ts` (TypeScriptの型定義)
3. `components/DepartmentSelector.tsx` (ローカルストレージ連携付きのプルダウン)
4. `components/TaskBoard.tsx` (カンバンボード本体)
5. `app/page.tsx` (メインページ・レイアウト統合)

## UIデザインの指示
- 清潔感のあるモダンなデザインにしてください。
- Tailwind CSSを使用し、レスポンシブ対応にしてください。
- 各カラム（ToDo/Doing/Done）は視認しやすいように色分けや背景色をつけてください。