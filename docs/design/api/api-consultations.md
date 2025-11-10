# Consultations API 設計書

## 1. メタ情報

- **ドキュメントバージョン**: v1.0
- **対象ドメイン**: Consultations
- **認証方法**: Bearer Token (JWT)
- **共通データ形式**: JSON (UTF-8)

## 2. 個別API定義

### 📝 相談のリスト取得

#### GET /consultations

相談の一覧を取得します。

- **認証:** 必須
- **タグ:** consultations, list

#### パス/クエリパラメータ (Parameters)

```text
# パラメータ名: 位置/型 (必須/任意) # 説明
userId: Query/integer (任意) # 特定ユーザーの相談のみを取得。
draft: Query/boolean (任意) # 下書き状態で絞り込み。true: 下書きのみ、false: 公開済みのみ。
solved: Query/boolean (任意) # 解決状態で絞り込み。true: 解決済み、false: 未解決。
```

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
        "name": "taro yamada",
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

```text
# HTTP Status: エラーコード # 説明
400: INVALID_INPUT # パラメータの形式や制約違反。
401: UNAUTHORIZED # 認証エラー。
404: NOT_FOUND # リソースが見つからない。
500: INTERNAL_SERVER_ERROR # サーバーエラー。
```

-----

