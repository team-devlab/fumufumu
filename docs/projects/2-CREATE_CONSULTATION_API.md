# 相談作成API実装

## 概要

相談（Consultations）の作成APIを実装します。下書き保存と公開の両方に対応します。

### 対象エンドポイント

```
POST /api/consultations
```

### 主な機能

- 相談の新規作成（公開 / 下書き）
- リクエストボディのバリデーション（zod）
- 認証ユーザーIDの自動設定
- 作成した相談の全情報を返却

### 前提条件

- 認証基盤が構築済み（authGuardミドルウェア）
- DBスキーマ（consultations, users）が定義済み

---

## アーキテクチャ設計

### 採用アーキテクチャ

**3層アーキテクチャ（3-Tier Architecture）**

```
Controller (consultations.controller.ts)
  ↓ リクエストボディのバリデーション
  ↓ 認証ユーザーID取得 (c.get('appUserId'))
Service (consultation.service.ts)
  ↓ ビジネスロジック
Repository (consultation.repository.ts)
  ↓ DB INSERT
DB (D1 Database)
```

### 既存ファイルとの関係

- **Repository層**: `consultation.repository.ts` に `create()` メソッドを追加
- **Service層**: `consultation.service.ts` に `createConsultation()` メソッドを追加
- **Controller層**: `consultations.controller.ts` に POST エンドポイントを追加
- **Validator層**: `consultation.validator.ts` に `createConsultationSchema` を追加

---

## 実装の流れ

### フェーズ1: バリデーションスキーマの作成 ✅

**ファイル**: `src/validators/consultation.validator.ts`

- [x] `createConsultationSchema` の実装
  - [x] `title`: 1〜100文字（必須）
  - [x] `body`: 10〜10,000文字（必須）
  - [x] `draft`: boolean型（任意、デフォルト: false）

**実装コード例:**

```typescript
import { z } from "zod";

export const createConsultationSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title must be at most 100 characters"),
  body: z.string().min(10, "Body must be at least 10 characters").max(10000, "Body must be at most 10,000 characters"),
  draft: z.boolean().optional().default(false),
});

export type CreateConsultationInput = z.infer<typeof createConsultationSchema>;
```

---

### フェーズ2: Repository層の実装 ✅

**ファイル**: `src/repositories/consultation.repository.ts`

- [x] `create()` メソッドの実装
  - [x] drizzle-orm の `insert()` を使用
  - [x] `.returning()` で作成されたレコードを取得
  - [x] author リレーションも取得

**実装コード例:**

```typescript
async create(data: {
  title: string;
  body: string;
  draft: boolean;
  authorId: number;
}) {
  const [inserted] = await this.db
    .insert(consultations)
    .values({
      title: data.title,
      body: data.body,
      draft: data.draft,
      authorId: data.authorId,
    })
    .returning();

  // リレーションを含めて取得
  return await this.db.query.consultations.findFirst({
    where: eq(consultations.id, inserted.id),
    with: {
      author: true,
    },
  });
}
```

---

### フェーズ3: Service層の実装 ✅

**ファイル**: `src/services/consultation.service.ts`

- [x] `createConsultation()` メソッドの実装
  - [x] Repository層の `create()` を呼び出し
  - [x] `body_preview` を生成（最初の100文字）
  - [x] レスポンス形式に整形

**実装コード例:**

```typescript
async createConsultation(
  data: { title: string; body: string; draft: boolean },
  authorId: number
): Promise<ConsultationResponse> {
  const created = await this.repository.create({
    ...data,
    authorId,
  });

  if (!created) {
    throw new Error("Failed to create consultation");
  }

  // レスポンス用に整形
  return {
    id: created.id,
    title: created.title,
    body_preview: created.body.substring(0, 100),
    draft: created.draft,
    hidden_at: created.hiddenAt?.toISOString() ?? null,
    solved_at: created.solvedAt?.toISOString() ?? null,
    created_at: created.createdAt.toISOString(),
    updated_at: created.updatedAt.toISOString(),
    author: created.author
      ? {
          id: created.author.id,
          name: created.author.name,
          disabled: created.author.disabled,
        }
      : null,
  };
}
```

---

### フェーズ4: Controller層の実装 ✅

**ファイル**: `src/routes/consultations.controller.ts`

- [x] POST `/` エンドポイントの実装
  - [x] `zValidator` でバリデーション
  - [x] `c.get('appUserId')` で認証ユーザーID取得
  - [x] Service層の `createConsultation()` を呼び出し
  - [x] 201 Created を返却
  - [x] エラーハンドリング（500 Internal Server Error）

**実装コード例:**

```typescript
// 相談作成ハンドラ関数
export async function createConsultation(c: CreateConsultationContext) {
  try {
    const validatedBody = c.req.valid("json");
    const authorId = c.get("appUserId");

    const db = c.get("db");
    const repository = new ConsultationRepository(db);
    const service = new ConsultationService(repository);
    const result = await service.createConsultation(validatedBody, authorId);

    return c.json(result, 201);
  } catch (error) {
    console.error("[createConsultation] Failed to create consultation:", error);
    return c.json(
      {
        error: "Internal server error",
        message: "Failed to create consultation",
      },
      500
    );
  }
}

// ルーティング登録
consultationsRoute.post(
  "/",
  zValidator("json", createConsultationSchema),
  async (c) => {
    return createConsultation(c);
  }
);
```
---

### フェーズ5: 動作確認 ✅

- [x] ローカルサーバー起動（`pnpm dev`）
- [x] 認証トークンの取得
- [x] curlでAPIテスト
  - [x] 公開状態で作成
  - [x] 下書き状態で作成
  - [x] バリデーションエラーの確認
  - [x] 作成した相談がGET APIで取得できることを確認

**curlコマンド例:**

```bash
# 公開状態で作成
curl -X POST http://localhost:8787/api/consultations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "エンジニアのキャリアパスについて",
    "body": "開発とマネジメント、どちらの道を選ぶべきか悩んでいます。それぞれのメリット・デメリットを教えてください。",
    "draft": false
  }'

# 下書き保存
curl -X POST http://localhost:8787/api/consultations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "AWS環境構築について",
    "body": "まだ書きかけの内容です...",
    "draft": true
  }'

# バリデーションエラー（titleが空）
curl -X POST http://localhost:8787/api/consultations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "",
    "body": "本文のみ入力しました",
    "draft": false
  }'
```

---

## 実装チェックリスト

### 必須実装

- [x] バリデーションスキーマ作成
- [x] Repository層に `create()` メソッド追加
- [x] Service層に `createConsultation()` メソッド追加
- [x] Controller層に POST エンドポイント追加
- [x] エラーハンドリング実装

### ドキュメント

- [x] API設計書の更新（実装完了マーク）
- [x] 動作確認手順の記録

---

## 参考資料

- **API設計書**: `docs/design/api/api-create-consultation.md`
- **共通スキーマ**: `docs/design/api/schemas.md`
- **リスト取得API**: `docs/projects/LIST_CONSULTATIONS_API.md`
- **データベース基盤**: `docs/projects/1-SETUP_DATABASE_AND_AUTH.md`

---

## 技術的な注意点

### authorIdの取得

```typescript
const authorId = c.get('appUserId'); // authGuardミドルウェアが設定
```

`authGuard`ミドルウェアが認証情報から業務用ユーザーIDを自動設定しているため、Controller層で取得できます。

### body_previewの生成

```typescript
body_preview: created.body.substring(0, 100)
```

list APIと同じ仕様で、最初の100文字を切り出します。

### エラーレスポンス

- **400 Bad Request**: zodの自動エラーレスポンス
- **401 Unauthorized**: authGuardミドルウェアが自動返却
- **500 Internal Server Error**: try-catchで捕捉

---
