あなたは熟練したNext.js (React) のフロントエンドエンジニアです。
現在開発中のNPO内部向け管理画面（Next.js App Router）に、新しい機能として「資料・データ管理室（Resource Library）」コンポーネントを追加したいです。

現在はGoogle Spread Sheetで管理しており、項目が多く視認性が悪いため、Webアプリとして直感的で検索しやすいUIに刷新したいと考えています。

以下の要件に従って、TypeScriptを使用したNext.jsのクライアントコンポーネント（`ResourceLibrary.tsx`）のコードを作成してください。

## 1. 技術スタック
- Framework: Next.js (App Router)
- Language: TypeScript
- Styling: Tailwind CSS (モダンでクリーンなUI)
- Icons: `lucide-react` (または `react-icons`)

## 2. データ構造 (Type Definition)
スプレッドシートの以下の列を、オブジェクトの型定義として表現してください。
- `id`: string
- `title`: string (資料名)
- `type`: 'canva' | 'document' | 'spreadsheet' | 'form' | 'drive' | 'other' (種類)
- `description`: string (内容や目的)
- `department`: string (管理部署 - 例: 'All', '広報', '人事', '開発', '会計')
- `accessLevel`: 'public' | 'admin_only' (アクセス権限)
- `url`: string (リンク先)
- `updatedAt`: string (最終更新日)

## 3. UI/UX要件
スプレッドシートの「行」ではなく、Webならではの「カードグリッド」レイアウトを採用してください。

### A. ヘッダーエリア (Control Panel)
1. **検索バー**:
   - `title` や `description` でリアルタイムフィルタリング。
   - アイコン付きの入力フォーム (`input`)。
2. **部署フィルター (Tabs/Pills)**:
   - `[すべて] [広報] [人事] ...` のようなタブUI。
   - 選択中のタブを視覚的に強調（bg-blue-600 text-white 等）。

### B. メインエリア (Resource Grid)
- **Grid Layout**: PCでは3列、タブレットでは2列、スマホでは1列のレスポンシブグリッド (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`)。
- **カードのデザイン**:
  - 白背景に淡いボーダーとシャドウ (`bg-white border rounded-lg shadow-sm hover:shadow-md transition`)。
  - **ヘッダー**: `type` に応じたアイコン (Lucide) と `department` バッジを配置。
    - Canva -> Image/Palette icon (Purple)
    - Spreadsheet -> Table icon (Green)
    - Document -> FileText icon (Blue)
  - **ボディ**: `title` を太字で強調。`description` を `line-clamp-2` で2行までに制限。
  - **フッター**: 「開く」ボタン。`target="_blank"` で外部タブで開く。
    - アイコン付きのボタン (`ExternalLink` icon)。

## 4. 機能要件
- `useState`, `useMemo` を使って、検索クエリと選択中の部署フィルターに基づいてリストをフィルタリングするロジックを実装してください。
- ダミーデータとして、NPOの実務でよくある「新歓イベント企画書(Docs)」「Instagram投稿テンプレート(Canva)」「2026年度予算案(Sheet)」などを10件程度含めてください。

## 出力
- コンポーネント単体で動作するように、必要な import 文を含めてください。
- コードはコピー＆ペーストで即座に確認できるようにしてください。