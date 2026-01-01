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
title: string (必須) # 相談タイトル
body: string (必須) # 相談本文
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
- `hidden_at`: デフォルト`null`
- `solved_at`: デフォルト`null`

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

(TODO)

##### 🔴 401 Unauthorized

(TODO)

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
  title: z.string().min(1).max(100),  // TODO: 制限値を決定
  body: z.string().min(1).max(5000),  // TODO: 制限値を決定
  draft: z.boolean().optional().default(false),
});
```

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

## 4. 未決定事項・検討中の項目

### バリデーション制限値の決定

**title の文字数制限:**
- 最小文字数: 未決定（候補: 5文字以上）
- 最大文字数: 未決定（候補: 100文字以下）

**body の文字数制限:**
- 最小文字数: 未決定（候補: 10文字以上）
- 最大文字数: 未決定（候補: 5000文字以下）

### レスポンス設計の詳細化

現在は作成した相談の全情報（Consultationオブジェクト）を返す設計になっていますが、以下の選択肢も検討可能：

**選択肢A（現在の設計）: 全情報を返す**
- メリット: フロントエンドが作成後すぐに画面表示できる
- デメリット: レスポンスサイズが大きい

**選択肢B: IDのみ返す**
- メリット: レスポンスが軽量
- デメリット: 詳細表示には別途取得APIが必要

**選択肢C: IDと最小限の情報**
- 中間案

### hidden_at（非公開機能）の仕様

**検討事項:**
- `draft`（下書き）と`hidden_at`（非公開）の違いは何か？
- 相談作成時に`hidden_at`を設定する必要があるか？
- 現在の想定: 作成時は常に`null`（デフォルト）

**想定される使い分け:**
- `draft=true`: 作成者のみ閲覧可能（未公開）
- `draft=false` + `hidden_at=null`: 全員が閲覧可能（公開）
- `draft=false` + `hidden_at!=null`: 一度公開したが後で非公開にした

→ 作成APIでは`hidden_at`は常に`null`で問題ない可能性が高い

### エラーレスポンスの詳細化

400 Bad Request、401 Unauthorized、500 Internal Server Errorの具体的なレスポンス形式は実装時に決定。

-----

