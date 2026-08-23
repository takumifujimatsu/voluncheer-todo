# 議事録サイト側：実装してほしいこと

このドキュメントは、**Google ドキュメント API を通じてドキュメントが追加されたタイミングで、組織のタスク・資料アプリの「資料」一覧に 1 件を自動登録する**ための仕様です。サーバー側（API Route、サーバーアクション、バックエンドジョブ、Drive 連携のワーカーなど）に実装してください。**ブラウザに API キーを出さないでください。**

---

## やること（要点）

1. **環境変数**（サーバー専用）に次を用意する。値は運用者から渡される想定です。
   - `RESOURCE_IMPORT_URL` … 下記の固定 URL
   - `RESOURCE_IMPORT_API_KEY` … 共有された秘密の API キー（リポジトリやクライアントに含めない）
2. **Google ドキュメント API で新規ドキュメントの作成が完了したあと**（または `files.create` / コピー作成のレスポンスを受け取った直後など、あなたのフローで「ドキュメントが追加された」と判定できるタイミング）に、**サーバー上だけで** その URL へ `POST` する。
3. リクエスト本文は JSON。少なくとも **`title`** と **`department`** は必須。Google ドキュメントの **`url`** には `https://docs.google.com/document/d/...` 形式のリンクを入れる（取得方法は Drive API / Docs API のメタデータに任せる）。
4. 失敗時はログに残し、必要ならリトライやアラートを検討する（仕様は任せる）。

---

## エンドポイント（固定）

```text
https://apiresourceimport-ebcur3ofwa-uc.a.run.app
```

`RESOURCE_IMPORT_URL` には上記をそのまま設定してよいです。

---

## 認証

どちらか一方のヘッダーで API キーを送る。

- `Authorization: Bearer <RESOURCE_IMPORT_API_KEY>`
- または `X-API-Key: <RESOURCE_IMPORT_API_KEY>`

---

## HTTP

| 項目 | 値 |
|------|-----|
| メソッド | `POST` のみ |
| `Content-Type` | `application/json` |

## JSON ボディ

| フィールド | 必須 | 説明 |
|------------|------|------|
| `title` | はい | 資料として表示するタイトル（例: Google ドキュメントのタイトル） |
| `department` | はい | 下記リストのいずれかと**完全一致**する文字列 |
| `type` | いいえ | 既定 `document`。`canva` / `document` / `spreadsheet` / `form` / `drive` / `pdf` / `other` |
| `description` | いいえ | 説明 |
| `url` | いいえ | Google ドキュメントの URL（`https://docs.google.com/document/d/...`）。省略時は相手側で `#` 扱い |
| `internalAccess` | いいえ | 既定 `view`。`none` / `view` / `edit` |
| `externalAccess` | いいえ | 既定 `none`。`none` / `view` / `edit` |
| `folderId` | いいえ | 特定フォルダに入れる場合のみ、事前に共有された Firestore のフォルダ ID。通常は省略でよい |

### `department` に使える値（この一覧から選ぶ）

`全体` / `執行役員` / `営業部` / `広報部` / `デザイン部` / `オペレーション部` / `企画部` / `総務部` / `開発部` / `経理部`

フォルダやファイル名、メタデータなどから部署を決め、その値をこのいずれかにマッピングする。

## 成功時のレスポンス（HTTP 201）

```json
{ "ok": true, "id": "<作成された資料のID>" }
```

## エラー目安

- `401` … API キー不正・未設定
- `400` … JSON 不正、必須不足、`department` が許可リスト外など
- `503` … 先側の設定不備

---

## 呼び出し例

### curl

```bash
curl -sS -X POST "$RESOURCE_IMPORT_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $RESOURCE_IMPORT_API_KEY" \
  -d '{
    "title": "2025-03-21 企画部 定例議事録",
    "department": "企画部",
    "type": "document",
    "description": "Google ドキュメント作成時に自動登録",
    "url": "https://docs.google.com/document/d/xxxxxxxx/edit"
  }'
```

### Node.js（`fetch`）

```javascript
const url = process.env.RESOURCE_IMPORT_URL;
const apiKey = process.env.RESOURCE_IMPORT_API_KEY;

const res = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    title: "Google ドキュメントのタイトル",
    department: "企画部",
    type: "document",
    description: "",
    url: "https://docs.google.com/document/d/.../edit",
  }),
});

if (!res.ok) {
  const errText = await res.text();
  throw new Error(`import failed: ${res.status} ${errText}`);
}

const data = await res.json();
// data.id が作成された資料の ID
```

Next.js などでは **Route Handler や Server Action などサーバーだけが実行する場所**に上記と同等の処理を置き、`NEXT_PUBLIC_*` にはキーを渡さないこと。

---

## 注意

- この POST が成功すると、組織側の通知（例: Discord）が飛ぶことがあります。
- CORS はブラウザ直叩き用ではない想定です。**必ずサーバーから呼ぶこと。**
