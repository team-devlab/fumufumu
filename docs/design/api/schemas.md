# 📦 共通データスキーマ定義

このドキュメントは、メインのAPI設計書 (`api-xxx.md`) で複数のエンドポイントから参照される、共通のデータ構造を定義します。

## 共通オブジェクト

### User 

ユーザーアカウントの基本情報を示すオブジェクトです。

```text
# フィールド名: 型 # 説明
id: integer # ユーザーを一意に識別するID。
name: string # ユーザー名。
email: string # ユーザーのメールアドレス。
role: string # 権限レベル。 [member/admin]
created_at: string # 作成日時 (ISO 8601)。
updated_at: string # 最終更新日時 (ISO 8601)。
````

### Consultation
<!-- 一旦省略 -->

### InvalidParam (入力エラー詳細)

バリデーションエラー (HTTP 400) 時に、どのフィールドが無効であるかを示すオブジェクトです。

```text
# フィールド名: 型 # 説明
name: string # 問題のあるフィールド名 (例: "email", "password")。
reason: string # そのフィールドが無効である理由。
```

### ErrorResponse (共通エラー構造)

全APIで共通して利用されるエラーレスポンスの構造です。**RFC 9457 (Problem Details for HTTP APIs) に準拠**します。

```text
# フィールド名: 型 # 説明
title: string # エラーの簡潔なサマリー。 (例: "Bad Request" or "Payment Required")
status: integer # この問題を引き起こしたオリジナルのHTTPステータスコード。
detail: string # 問題の具体的な詳細な説明。開発者向けの情報を含める。
instance: string (任意) # 問題が発生したリクエストやリソースのURI。

# 独自拡張フィールド
invalid_params: array of ref (任意) # InvalidParamオブジェクトを参照。バリデーションエラー時に使用。
```

-----

## 2\. 共通メタデータ

APIレスポンスのリスト取得時などに使用される、共通のメタデータ構造です。

### PaginationMeta (ページネーションメタ情報)

```text
# フィールド名: 型 # 説明
total_count: integer # 検索条件に合致する全件数。
limit: integer # 1ページあたりの取得件数。
offset: integer # 現在のページが表示開始する位置。
```

```
```