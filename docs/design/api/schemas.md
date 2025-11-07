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
```

### Consultation
<!-- 一旦省略 -->

### ErrorResponse (共通エラー構造)

全APIで共通して利用されるエラーレスポンスの構造です。

```text
# フィールド名: 型 # 説明
error_code: string # エラーを一意に識別するコード。
message: string # 詳細なエラーメッセージ。
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
