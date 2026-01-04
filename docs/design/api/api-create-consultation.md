# Consultations API 設計書

## 1. メタ情報

- **対象ドメイン**: Consultations
- **共通データ形式**: JSON (UTF-8)
- **更新日**: 2026-01-01
- **更新内容**: 初版作成

## 2. 個別API定義

### 📝 create-consultation: 相談の作成

#### POST /api/consultations

相談を新規作成します。下書き保存と公開の両方に対応します。

- **認証:** ✅ 必須（authGuardミドルウェア）
- **バリデーション:** 未実装
- **タグ:** consultations, create

#### パス/クエリパラメータ (Parameters)

なし

#### リクエストボディ (Request Body)

```text
# フィールド名: 型 (必須/任意) # 説明
title: string (必須) # 相談タイトル（1〜100文字）
body: string (必須) # 相談本文（10〜10,000文字）
draft: boolean (任意) # 下書き状態フラグ。true: 下書き、false: 公開。デフォルト: false
```

**Request Example (JSON):**

```json
{
  "title": "エンジニアのキャリアパスについて",
  "body": "開発とマネジメント、どちらの道を選ぶべきか悩んでいます。それぞれのメリット・デメリットを教えてください。",
  "draft": false
}
```

**下書き保存の例:**

```json
{
  "title": "AWS環境構築について",
  "body": "まだ書きかけの内容です...",
  "draft": true
}
```

**サーバー側で自動生成・設定される項目:**
- `id`: 自動採番
- `authorId`: 認証情報（`c.get('appUserId')`）から自動取得
- `created_at` / `updated_at`: DB側で自動生成
- `hidden_at`: デフォルト`null`（モデレーターが非表示にするためのフィールド、作成時は常にnull）
- `solved_at`: デフォルト`null`（解決時に設定される）

#### レスポンス (Responses)

##### 🟢 201 Created

相談の作成に成功しました。

```text
# フィールド名: 型 # 説明
id: integer # 作成された相談のID
title: string # 相談タイトル
body_preview: string # 本文のプレビュー（最初の100文字）
draft: boolean # 下書き状態フラグ
hidden_at: datetime|null # 非公開日時（常にnull）
solved_at: datetime|null # 解決日時（常にnull）
created_at: string # 作成日時 (ISO 8601)
updated_at: string # 最終更新日時 (ISO 8601)
author: ref # Authorオブジェクト（作成者情報）
```

**Response Example (JSON):**

```json
{
  "id": 105,
  "title": "エンジニアのキャリアパスについて",
  "body_preview": "開発とマネジメント、どちらの道を選ぶべきか悩んでいます。それぞれのメリット・デメリットを教えてください。",
  "draft": false,
  "hidden_at": null,
  "solved_at": null,
  "created_at": "2026-01-01T10:00:00Z",
  "updated_at": "2026-01-01T10:00:00Z",
  "author": {
    "id": 12,
    "name": "taro yamada",
    "disabled": false
  }
}
```

##### 🔴 400 Bad Request

リクエストボディのバリデーションエラー。

**バリデーションルール:**
- `title`: 1〜100文字（必須）
- `body`: 10〜10,000文字（必須）
- `draft`: boolean型（任意、デフォルト: false）

**想定されるエラーケース:**
- `title`が空文字または未指定
- `title`が100文字を超過
- `body`が10文字未満または未指定
- `body`が10,000文字を超過
- `draft`がboolean以外の値


##### 🔴 401 Unauthorized

認証エラー。有効なセッションが存在しない、またはトークンが無効。

```json
{
  "error": "Unauthorized. Session invalid or missing."
}
```

##### 🔴 500 Internal Server Error

サーバーエラー。

```json
{
  "error": "Internal server error",
  "message": "Failed to create consultation"
}
```

---

## 3. 実装詳細

### アーキテクチャ

```
Controller (consultations.controller.ts)
  ↓ リクエストボディのバリデーション
  ↓ 認証ユーザーID取得 (c.get('appUserId'))
Service (consultation.service.ts)
  ↓ ビジネスロジック (body_preview生成など)
Repository (consultation.repository.ts)
  ↓ DB INSERT
DB (D1 Database)
```

### 主要な実装ポイント

#### 1. 認証ユーザーIDの取得

```typescript
// Controller層
const authorId = c.get('appUserId');  // authGuardミドルウェアが設定
```

`authGuard`ミドルウェアが認証情報から業務用ユーザーID（`appUserId`）をコンテキストに自動設定します。

#### 2. リクエストボディのバリデーション（zodで実装予定）

```typescript
// validators/consultation.validator.ts (予定)
export const createConsultationSchema = z.object({
  title: z.string().min(1).max(100),
  body: z.string().min(10).max(10000),
  draft: z.boolean().optional().default(false),
});
```

**バリデーション仕様:**
- `title`: 1〜100文字（空文字不可）
- `body`: 10〜10,000文字（最低10文字は必要）
- `draft`: boolean型、省略時は`false`（公開状態）

#### 3. Repository層でのINSERT

```typescript
// Repository層 (予定)
async create(data: { title, body, draft, authorId }) {
  return await this.db.insert(consultations).values({
    title: data.title,
    body: data.body,
    draft: data.draft,
    authorId: data.authorId,
    // created_at, updated_at は DB側で自動生成
    // hidden_at, solved_at はデフォルトでnull
  }).returning();
}
```

#### 4. Service層でのレスポンス整形

```typescript
// Service層 (予定)
async createConsultation(data, authorId) {
  const created = await this.repository.create({ ...data, authorId });
  
  // レスポンス用に整形 (body_preview生成など)
  return {
    id: created.id,
    title: created.title,
    body_preview: created.body.substring(0, 100),
    draft: created.draft,
    // ...
  };
}
```

### データフロー

1. **クライアント** → `{ title, body, draft }` を送信
2. **Controller** → バリデーション & `authorId`取得
3. **Service** → ビジネスロジック実行
4. **Repository** → DB INSERT
5. **Service** → `body_preview`生成 & レスポンス整形
6. **Controller** → 201 Created返却

---

## 4. 決定事項

### ✅ バリデーション制限値

**title の文字数制限:**
- 最小文字数: 1文字
- 最大文字数: 100文字

**body の文字数制限:**
- 最小文字数: 10文字（簡潔すぎる相談を防ぐ）
- 最大文字数: 10,000文字（コード例を含む技術相談にも対応可能）

**技術的背景:**
- SQLite TEXT型の制限: 約1GB（実質的に無制限）
- Cloudflare D1/Workers: メモリ制限128MB（10,000文字≈30KBは余裕）
- 実用上の妥当性: Stack Overflowは30,000文字、Qiitaは制限なし

### ✅ レスポンス設計

**作成した相談の全情報を返す仕様**

作成成功時（201 Created）は、作成した相談の完全なConsultationオブジェクトを返します。

**採用理由:**
- フロントエンドが作成後すぐに画面表示できる（追加のAPI呼び出し不要）
- ユーザー体験の向上（作成→即座に内容確認）
- list APIと同じ形式で統一性がある

### ✅ draftとhidden_atの仕様

**draft（下書きフラグ）:**
- デフォルト: `false`（公開状態）
- 相談作成時に`draft: true`を指定すると下書き保存
- 投稿者自身のみが閲覧可能な状態

**hidden_at（非表示日時）:**
- デフォルト: `null`（表示状態）
- **モデレーターが非表示にするためのフィールド**（治安維持目的）
- 相談作成APIでは常に`null`で作成される
- 後から別のAPI（モデレーション機能）で設定される想定
- `null`許容型（nullable）

**使い分け:**
- `draft=true`: 投稿者による下書き保存（未公開）
- `draft=false` + `hidden_at=null`: 通常の公開状態
- `draft=false` + `hidden_at!=null`: モデレーターにより非表示にされた状態

---

## 5. 今後の実装予定

### モデレーション機能（将来実装）

**hidden_at の更新API:**
- モデレーターが不適切な相談を非表示にする機能
- `PATCH /api/consultations/:id/hide` などのエンドポイント
- `hidden_at`に現在日時を設定

### 下書きの仕様補足

現在の相談作成API（POST /api/consultations）では：
- `draft: false`（デフォルト）で公開状態として作成
- `draft: true`を指定すると下書き保存

将来的に、下書きから公開への変更は更新API（PATCH）で対応する想定。

-----

