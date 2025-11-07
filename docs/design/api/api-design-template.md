<!-- 
# 個別ドメインAPI設計書テンプレート (`api_[DOMAIN].md` 相当)

本テンプレートは、チームメンバーが新しいAPI（例：`api_advice.md`や`api_tag.md`）を作成する際に、**コピペして利用するための雛形**です。API設計時に記述していただけると嬉しい内容をまとめたものです。

## 📌 コピペのポイント

1.  ファイルの先頭でドメイン名を設定。
2.  基本的なCRUD（Create, Read, Update, Delete）の構造をコメントアウトで残しています。

！！必ずこれに従う必要はありません！！
場合により、設計書を書かずにAPIを実装しても一旦OKです。
-->
# [ドメイン名] API 設計書

## 1. メタ情報

- **ドキュメントバージョン**: v1
- **対象ドメイン**: [DOMAIN_NAME]
- **認証方法**: Bearer Token (JWT) 
- **共通データ形式**: JSON (UTF-8)

## 2. 個別API定義

### 👥 [ドメイン名] の作成

#### POST /[domain]
新しいリソースを作成します。

- **認証:** 必須 (適切な権限が必要)
- **タグ:** [domain], create

#### リクエストボディ (Request Body)

```text
# パラメータ名: 型 (必須/任意) # 説明 [制約]
field_a: string (必須) # 必須パラメータA。 [1〜50文字]
field_b: integer (任意) # 任意パラメータB。
````

##### **Request Example (JSON):**

```json
{
  "field_a": "example value",
  "field_b": 100
}
```

#### レスポンス (Responses)

##### 201 Created

```text
# フィールド名: 型 # 説明
id: integer # 作成されたID。
... # その他のフィールドはSCHEMAS.mdの[DOMAIN_NAME]オブジェクトを参照
```

##### 🔴 エラー応答

```text
# HTTP Status: エラーコード # 説明
400: INVALID_INPUT # パラメータの形式や制約違反。
401: UNAUTHORIZED # 認証エラー。
```

-----

### 🔎 [ドメイン名] の取得

#### GET /[domain]/{id}

指定されたIDのリソースを取得します。

  * **認証:** 必須
  * **タグ:** [domain], read

#### パス/クエリパラメータ (Parameters)

```text
# パラメータ名: 位置/型 (必須/任意) # 説明
id: Path/integer (必須) # 取得対象リソースのID。
```

#### レスポンス (Responses)

##### 🟢 200 OK

```text
# SCHEMAS.md の [DOMAIN_NAME] オブジェクトを参照
id: integer
...
```

-----

### 📝 [ドメイン名] のリスト取得（検索/ページネーション）

#### GET /[domain]

リソースのリストを取得します。

  * **認証:** 必須
  * **タグ:** [domain], list

#### パス/クエリパラメータ (Parameters)

```text
# パラメータ名: 位置/型 (必須/任意) # 説明
limit: Query/integer (任意) # PaginationMetaを参照。1ページあたりの件数。
offset: Query/integer (任意) # PaginationMetaを参照。開始位置。
search_query: Query/string (任意) # 検索文字列。
```

#### レスポンス (Responses)

##### 🟢 200 OK

```text
# フィールド名: 型 # 説明
meta: ref # PaginationMetaオブジェクトを参照
data: array of ref # [DOMAIN_NAME] オブジェクトの配列
```

-----

### 🛠️ [ドメイン名] の更新

#### PATCH /[domain]/{id}

リソースを部分的に更新します。

  * **認証:** 必須
  * **タグ:** [domain], update

#### リクエストボディ (Request Body)

```text
# 必須項目はなく、更新したいフィールドのみを送信します。
name: string (任意) # 更新する名前。
status: string (任意) # 更新するステータス。
```

-----

### 🗑️ [ドメイン名] の削除

#### DELETE /[domain]/{id}

リソースを削除します。

  * **認証:** 必須 (適切な権限が必要)
  * **タグ:** [domain], delete

#### レスポンス (Responses)

##### 🟢 204 No Content

本文なし。削除成功。

```
```