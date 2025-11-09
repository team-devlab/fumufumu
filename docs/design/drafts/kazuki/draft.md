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