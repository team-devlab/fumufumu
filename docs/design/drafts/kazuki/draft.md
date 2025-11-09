# API設計ドラフト - 相談一覧取得API

## 概要

相談（consultations）の一覧を取得する。現時点ではページネーション・フィルタ無しで全件返却。

## エンドポイント

相談一覧取得API

### 相談一覧取得

* **メソッド:** `GET`
* **パス:** `/api/v1/consultations`
* **クエリパラメータ:** なし（将来追加予定）
* **リクエストボディ:** なし

---

## レスポンス

### 200 OK - 成功

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
        "name": "Kazuki Toyoda",
        "auth_service_user_id": "github_12345",
        "disabled": false
      },
      "tags": [
        { "id": 1, "name": "キャリア" },
        { "id": 2, "name": "エンジニア" }
      ]
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
        "name": "Kazuki Toyoda",
        "auth_service_user_id": "github_12345",
        "disabled": false
      },
      "tags": [
        { "id": 5, "name": "AWS" },
        { "id": 6, "name": "インフラ" }
      ]
    }
  ]
}
```

#### data[i] の構造（インラインコメント付き）

```jsonc
{
  "id": 101,                               // consultations.id
  "title": "エンジニア職種：開発orマネジメント、どちらを目指すべき？",  // consultations.title
  "body_preview": "キャリア設計で悩んでいます。将来的に自分が...",      // consultations.body の抜粋
  "draft": false,                          // consultations.draft
  "hidden_at": null,                       // consultations.hidden_at
  "solved_at": null,                       // consultations.solved_at
  "created_at": "2025-11-01T09:00:00Z",   // consultations.created_at
  "updated_at": "2025-11-09T10:42:00Z",   // consultations.updated_at
  "author": {                              // users（投稿者）
    "id": 12,                              // users.id
    "name": "Kazuki Toyoda",               // users.name
    "auth_service_user_id": "github_12345", // users.auth_service_user_id
    "disabled": false                      // users.disabled
  },
  "tags": [                                // question_taggings 経由で tags を取得
    { "id": 1, "name": "キャリア" },
    { "id": 2, "name": "エンジニア" }
  ]
}
```

### 400 Bad Request - リクエストが不正

### 401 Unauthorized - 認証エラー

### 404 Not Found - リソースが見つからない

### 500 Internal Server Error - サーバーエラー

---

## ER図対応表

各レスポンスフィールドがどのテーブル・カラムに対応しているかを示します。

| JSONキー                        | 由来テーブル.カラム                 | 型             | 備考                    |
| ----------------------------- | -------------------------- | ------------- | --------------------- |
| `id`                          | consultations.id           | int           |                       |
| `title`                       | consultations.title        | string        |                       |
| `body_preview`                | consultations.body         | string        | 抜粋（サーバ側で生成）           |
| `draft`                       | consultations.draft        | boolean       |                       |
| `hidden_at`                   | consultations.hidden_at    | datetime\|null |                       |
| `solved_at`                   | consultations.solved_at    | datetime\|null |                       |
| `created_at`                  | consultations.created_at   | datetime      | ISO 8601（`Z`）         |
| `updated_at`                  | consultations.updated_at   | datetime      | ISO 8601（`Z`）         |
| `author.id`                   | users.id                   | int           | consultations.user_id |
| `author.name`                 | users.name                 | string        |                       |
| `author.auth_service_user_id` | users.auth_service_user_id | string        |                       |
| `author.disabled`             | users.disabled             | boolean       |                       |
| `tags[].id`                   | tags.id                    | int           | 中間：question_taggings  |
| `tags[].name`                 | tags.name                  | string        |                       |

---

## 追加メモ（最小で回すための指針）

* **認可ポリシー**: 当面は**公開済みのみ返却**にしておくと楽（`draft=true` は将来の認可導入時に活用）
* **`meta.total`**: 必須にしておくと"0件時UI"が作りやすい
* **将来の拡張（任意）**: 
  * `GET /api/v1/consultations?userId=...` などのフィルタ
  * `limit/offset` の追加によるページネーション
* **日付フォーマット**: **全APIで同一フォーマット**（`YYYY-MM-DDTHH:mm:ssZ`）に統一
