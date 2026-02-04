This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## 環境変数

プロジェクトルートに `.env.local` を作成し、次の1行を書いてください。

```
NEXT_PUBLIC_FIREBASE_CONFIG=<下の「コピー用」の内容をそのまま貼り付け>
```

**コピー用（`NEXT_PUBLIC_FIREBASE_CONFIG=` の右辺に貼るデータ）:**

```
{"apiKey":"YOUR_API_KEY","authDomain":"YOUR_PROJECT.firebaseapp.com","projectId":"YOUR_PROJECT","storageBucket":"YOUR_PROJECT.firebasestorage.app","messagingSenderId":"YOUR_SENDER_ID","appId":"YOUR_APP_ID"}
```

- 上記ブロックをコピーし、`.env.local` では `NEXT_PUBLIC_FIREBASE_CONFIG=` の後ろに貼り付けてください。
- 別プロジェクトの場合は Firebase Console の値に差し替えてください。`.env.local` は Git にコミットされません。

### 本番（Vercel）で Google ログインを動かす

Vercel にデプロイしたあと、Google ログインが「ログインに失敗しました」になる場合は次を確認してください。

1. **Vercel の環境変数**  
   Project → Settings → Environment Variables に `NEXT_PUBLIC_FIREBASE_CONFIG` を設定し、**Redeploy** する。

2. **Firebase の認証ドメイン**  
   Firebase Console → **認証** → **設定**（歯車）→ **認証ドメイン** に、本番の URL を追加する。  
   例: `voluncheer-todo.vercel.app` やカスタムドメイン。

3. **Google Cloud の承認済みの JavaScript 生成元**  
   [Google Cloud Console](https://console.cloud.google.com/) → **API とサービス** → **認証情報** → 該当の **OAuth 2.0 クライアント ID** を開く。  
   **承認済みの JavaScript 生成元** に本番の URL を追加する。  
   例: `https://voluncheer-todo.vercel.app`

### Firestore ルール

認証済みユーザーのみ `tasks` を読み書きできるようにする例です。Firebase Console → Firestore Database → ルール で設定してください。

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /tasks/{taskId} {
      allow read, write: if request.auth != null;
    }
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
  }
}
```

---

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# voluncheer-todo
