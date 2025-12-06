# Consultations API 設計書

## 1. メタ情報

- **ドキュメントバージョン**: v1.2
- **対象ドメイン**: Consultations
- **認証方法**: Bearer Token (JWT)
- **共通データ形式**: JSON (UTF-8)
- **更新日**: 2025-11-30
- **更新内容**: zodによるクエリパラメータバリデーション実装

## 2. 個別API定義

### 📝 list-consultations: 相談のリスト取得

#### GET /api/consultations

相談の一覧を取得します。

- **認証:** ✅ 必須（authGuardミドルウェアで実装済み）
- **バリデーション:** ✅ 実装済み（zod + @hono/zod-validator）
- **タグ:** consultations, list
- **エラーハンドリング:** ✅ 実装済み（400 Bad Request, 500 Internal Server Error対応）

#### パス/クエリパラメータ (Parameters)

```text
# パラメータ名: 位置/型 (必須/任意) # 説明
userId: Query/integer (任意) # 特定ユーザーの相談のみを取得。未指定時は全ユーザーの相談を返す。
draft: Query/boolean (任意) # 下書き状態で絞り込み。true: 下書きのみ、false: 公開済みのみ。
solved: Query/boolean (任意) # 解決状態で絞り込み。true: 解決済み、false: 未解決。
```

**パラメータの使用シーン:**
- **相談一覧画面**: パラメータなし → 全ユーザーの相談を取得
- **プロフィール画面**: `?userId={id}` → 指定ユーザーの相談のみ取得
- **下書き一覧**: `?userId={id}&draft=true` → ユーザーの下書きのみ取得

**クエリ例:**
- `/api/consultations` - 全件取得
- `/api/consultations?userId=12` - ユーザーID=12の相談一覧
- `/api/consultations?userId=12&draft=false` - ユーザーID=12の公開済み相談
- `/api/consultations?userId=12&solved=true` - ユーザーID=12の解決済み相談

#### レスポンス (Responses)

##### 🟢 200 OK

```text
# フィールド名: 型 # 説明
meta: object # メタ情報
  total: integer # 全件数
data: array of ref # Consultationオブジェクトの配列（schemas.md参照）
```

##### **Response Example (JSON):**

```json
{
  "meta": {
    "total": 2
  },
  "data": [
    {
      "id": 101,
      "title": "エンジニア職種：開発orマネジメント、どちらを目指すべき？",
      "body_preview": "キャリア設計で悩んでいます。将来的に自分が...",
      "draft": false,
      "hidden_at": null,
      "solved_at": null,
      "created_at": "2025-11-01T09:00:00Z",
      "updated_at": "2025-11-09T10:42:00Z",
      "author": {
        "id": 12,
        "name": "taro yamada",
        "auth_service_user_id": "github_12345",
        "disabled": false
      }
    },
    {
      "id": 102,
      "title": "AWS環境構築におけるベストプラクティス",
      "body_preview": "ステージ環境と本番環境を分離した構成で悩んでいます...",
      "draft": true,
      "hidden_at": null,
      "solved_at": null,
      "created_at": "2025-11-05T11:30:00Z",
      "updated_at": "2025-11-09T10:43:00Z",
      "author": {
        "id": 12,
        "name": "taro yamada",
        "auth_service_user_id": "github_12345",
        "disabled": false
      }
    },
    {
      "id": 103,
      "title": "退会済みユーザーの相談例",
      "body_preview": "著者が退会済みの場合、authorはnullになります...",
      "draft": false,
      "hidden_at": null,
      "solved_at": null,
      "created_at": "2025-10-15T14:20:00Z",
      "updated_at": "2025-10-20T16:30:00Z",
      "author": null
    }
  ]
}
```

##### 🔴 400 Bad Request

パラメータの形式や制約違反（✅ zod実装済み）。

**バリデーションルール:**
- `userId`: 正の整数のみ許可（文字列 → 数値に自動変換）
- `draft`: "true" または "false" の文字列のみ許可（文字列 → boolean に自動変換）
- `solved`: "true" または "false" の文字列のみ許可（文字列 → boolean に自動変換）

**zodエラーレスポンス例（userId が無効な場合）:**

```json
{
  "success": false,
  "error": {
    "issues": [
      {
        "validation": "regex",
        "code": "invalid_string",
        "message": "userId must be a positive integer",
        "path": [
          "userId"
        ]
      }
    ],
    "name": "ZodError"
  }
}
```

**zodエラーレスポンス例（draft が無効な場合）:**

```json
{
  "success": false,
  "error": {
    "issues": [
      {
        "received": "invalid_value",
        "code": "invalid_enum_value",
        "options": [
          "true",
          "false"
        ],
        "path": [
          "draft"
        ],
        "message": "draft must be \"true\" or \"false\""
      }
    ],
    "name": "ZodError"
  }
}
```

##### 🔴 401 Unauthorized

認証エラー。

```json
{
  "title": "Unauthorized",
  "status": 401,
  "detail": "認証に失敗しました。有効なトークンを指定してください。"
}
```

##### 🔴 500 Internal Server Error

サーバーエラー（✅ 実装済み）。

**現在の実装:**
```json
{
  "error": "Internal server error",
  "message": "Failed to fetch consultations"
}
```

**将来的なRFC 9457準拠形式:**
```json
{
  "title": "Internal Server Error",
  "status": 500,
  "detail": "サーバー内部でエラーが発生しました。"
}
```

**エラーレスポンス形式:**
- すべてのエラーレスポンスは `ErrorResponse` オブジェクト（schemas.md参照）に準拠します。
- RFC 9457 (Problem Details for HTTP APIs) に準拠しています。

---

## 3. 実装詳細

### アーキテクチャ

```
Controller (consultations.controller.ts)
  ↓ クエリパラメータ解析
Service (consultation.service.ts)
  ↓ ビジネスロジック
Repository (consultation.repository.ts)
  ↓ RQB（Relational Query Builder）
DB (D1 Database)
```

### 主要な実装ポイント

#### 1. RQB（Relational Query Builder）の使用
```typescript
// Repository層
return await this.db.query.consultations.findMany({
  where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
  with: {
    author: true,  // リレーション取得
  },
});
```

**メリット**:
- SQLライクな記述より抽象度が高く、可読性が向上
- `findMany`というメソッド名で意図が明確
- リレーションを`with`で簡潔に記述

#### 2. 著者退会対応
```typescript
// Service層
author: consultation.author ? {
  id: consultation.author.id,
  name: consultation.author.name,
  disabled: consultation.author.disabled,
} : null  // 退会済みの場合はnull
```

**仕様**:
- 著者が退会済みの相談も取得可能
- `author`フィールドは`null`または`Author`オブジェクト
- フロントエンド側で「退会済みユーザー」として表示可能

#### 3. zodによるバリデーション（✅ 実装済み）
```typescript
// validators/consultation.validator.ts
export const listConsultationsQuerySchema = z.object({
  userId: z
    .string()
    .regex(/^\d+$/, { message: "userId must be a positive integer" })
    .transform(Number)
    .optional(),
  draft: z
    .enum(["true", "false"], {
      errorMap: () => ({ message: 'draft must be "true" or "false"' }),
    })
    .transform((val) => val === "true")
    .optional(),
  solved: z
    .enum(["true", "false"], {
      errorMap: () => ({ message: 'solved must be "true" or "false"' }),
    })
    .transform((val) => val === "true")
    .optional(),
});
```

**実装ポイント**:
- `@hono/zod-validator`を使用してミドルウェアとして適用
- クエリパラメータの型変換を自動実行（文字列 → 数値/boolean）
- バリデーションエラー時は自動的に400 Bad Requestを返却
- エラーメッセージはzodのデフォルト形式（`ZodError`）

#### 4. クエリパラメータのデフォルト動作
- `userId`未指定時: 全ユーザーの相談を取得（`undefined`）
- `draft`未指定時: 下書き・公開両方を取得
- `solved`未指定時: 解決済み・未解決両方を取得

**使用シーン**:
- **相談一覧画面**: パラメータなしで全件取得
- **プロフィール画面**: `?userId={id}`で特定ユーザーの相談のみ

---

## 4. 今後の拡張予定

### ✅ バリデーション（実装完了）
- ✅ zod + @hono/zod-validatorの導入
- ✅ クエリパラメータの型検証
- ✅ 無効なパラメータに対する400エラー

### ソート機能（将来）
- `sortBy`パラメータ（created_at, updated_at）
- `order`パラメータ（asc, desc）

### ページネーション（将来）
- `limit`パラメータ
- `offset`パラメータ
- `meta`にページネーション情報を追加

-----

