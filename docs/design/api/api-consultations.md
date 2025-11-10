# API設計ドラフト - 相談一覧取得API

## 概要

相談（consultations）の一覧を取得する。現時点ではページネーション・フィルタ無しで全件返却。

## エンドポイント

相談一覧取得API

### 相談一覧取得

* **メソッド:** `GET`
* **パス:** `/api/consultations`
* **クエリパラメータ:**
  - `userId` (integer, 任意): 特定ユーザーの相談のみを取得
  - `draft` (boolean, 任意): 下書き状態で絞り込み（`true`: 下書きのみ、`false`: 公開済みのみ）
  - `solved` (boolean, 任意): 解決状態で絞り込み（`true`: 解決済み、`false`: 未解決）
* **リクエストボディ:** なし

**クエリ例:**
- `/api/consultations` - 全件取得
- `/api/consultations?userId=12` - ユーザーID=12の相談一覧
- `/api/consultations?userId=12&draft=false` - ユーザーID=12の公開済み相談
- `/api/consultations?userId=12&solved=true` - ユーザーID=12の解決済み相談

---

## レスポンス

### 200 OK - 成功

```text
# フィールド名: 型 # 説明
meta: object # メタ情報
  total: integer # 全件数
data: array of ref # Consultationオブジェクトの配列（schemas.md参照）
```

#### Response Example (JSON)

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

### 400 Bad Request - リクエストが不正

### 401 Unauthorized - 認証エラー

### 404 Not Found - リソースが見つからない

### 500 Internal Server Error - サーバーエラー

