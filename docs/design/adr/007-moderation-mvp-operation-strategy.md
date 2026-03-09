# [ADR] 審査機能（Moderation）のMVP運用方針

* **Status**: Proposed
* **Date**: 2026-03-08

---

## 1. DB設計の方針

- 投稿作成時に、投稿本体と審査レコードを同時に作成する。
- 審査管理用に新規テーブル（例: `moderation_reviews`）を作成し、`pending/approved/rejected` を管理する。
- `moderation_reviews` は `consultation` と `advice` の両方を扱えるよう、`target_type` と `target_id` で対象を識別する。
- 承認・却下時は、審査レコードを更新し、その状態を公開可否の判定に利用する。

### NULL許容方針（MVP）

- `moderation_reviews`
  - `id`: `NOT NULL`
  - `target_type`: `NOT NULL`（`consultation/advice`）
  - `target_id`: `NOT NULL`
  - `status`: `NOT NULL`（`pending/approved/rejected`）
  - `reason`: `NULL` 許容（`rejected` の場合のみ必須）
  - `reviewed_at`: `NULL` 許容
  - `created_at`: `NOT NULL`
  - `updated_at`: `NOT NULL`

---

## 2. 画面有無

- MVPでは運営管理画面は作成しない。
- 運営管理画面は将来フェーズで追加する前提とする。

---

## 3. 画面無しにする理由

- MVP段階での開発コストを抑え、まず審査要件を最短で満たすため。
- 審査件数が少ない初期は、DB管理ツールや運営用API/CLIで運用可能なため。
- 管理画面のUI/権限管理/監査機能を先行実装するとリリースが遅延するため。

---

## 4. 将来的に、相談投稿が増えたときに画面ありにする

- `pending` 件数増加、誤操作リスク増加をトリガーに管理画面を追加する。

---

## 5. 画面無しの場合の実装と運営者フロー

### 実装（MVP）

- 運営用APIを用意する（例: `/admin/moderation/...`）。
- 主要API:
  - `GET /admin/moderation/consultations?status=pending`（未審査一覧取得）
  - `GET /admin/moderation/consultations/find?consultation_ids=101,205,999`（ID指定の複数相談取得）
  - `POST /admin/moderation/consultations/:consultationId/decision`（承認/却下実行）
- CLIまたはスクリプトから運営用APIを呼び出す。
- 一般ユーザーには `pending` の投稿詳細を返さず、「確認中」を表示する。

### 運営者フロー（MVP）

1. 未審査一覧を取得する。
2. 投稿本文・投稿者情報を確認する。
3. 承認または却下を実行する（却下時は理由を残す）。

### 投稿後導線（ユーザー側・MVP）

1. ユーザーが投稿ボタンを押す。
2. 投稿作成成功後、プロフィールの「相談」一覧画面へ遷移する。
3. プロフィールの相談一覧カードに `確認中` を表示する。（確認中のものは、他の一覧や詳細画面では表示されない。）
4. `pending` 状態のカードは相談詳細へ遷移不可にし、`運営が確認中です` 文言を表示する。
5. `approved` に更新後は、同カードから相談詳細へ遷移可能にする。（他の一覧画面でも表示される。）

### APIリクエスト/レスポンス（MVP）

#### 1) 未審査一覧取得

- Endpoint: `GET /admin/moderation/consultations?status=pending`
- Request:
  - Query:
    - `status`: `pending`（必須）
- Response:

```json
{
  "consultations": [
    {
      "id": 101,
      "status": "pending",
      "created_at": "2026-03-08T10:15:00Z"
    }
  ]
}
```

#### 2) ID指定の複数相談取得

- Endpoint: `GET /admin/moderation/consultations/find?consultation_ids=101,205,999`
- Request:
  - Query:
    - `consultation_ids`: カンマ区切りのID文字列（例: `101,205,999`）

- Response:

```json
{
  "consultations": [
    {
      "id": 101,
      "title": "相談タイトル",
      "content": "相談本文",
      "author_id": 12,
      "status": "pending",
      "created_at": "2026-03-08T10:15:00Z"
    },
    {
      "id": 205,
      "title": "別の相談タイトル",
      "content": "別の相談本文",
      "author_id": 33,
      "status": "pending",
      "created_at": "2026-03-08T11:00:00Z"
    }
  ],
  "not_found_ids": [999]
}
```

- 挙動:
  - `moderation_reviews.status = pending` の相談のみ `consultations` に含める
  - `approved/rejected` の相談IDは `not_found_ids` 側で返す
  - `consultation_ids` の件数増加によりURL長の制約が懸念される場合は、`POST /admin/moderation/consultations/find` への切り替えを行う

#### 3) 承認/却下実行

- Endpoint: `POST /admin/moderation/consultations/:consultationId/decision`
- Request:

```json
{
  "decision": "approved"
}
```

```json
{
  "decision": "rejected",
  "reason": "ガイドライン違反"
}
```

- バリデーション:
  - `decision = rejected` の場合、`reason` は必須
  - `decision = approved` の場合、`reason` は未指定可

- Response:

```json
{
  "success": true,
  "consultation_id": 101,
  "status": "approved",
  "reviewed_at": "2026-03-08T10:30:00Z"
}
```

---

## 6. 追加で必要なもの（このADRに追記推奨）

- 権限方針（MVP）:
  - `/admin/moderation/*` は Cloudflare Access で保護し、運営メンバーまたは Service Token のみアクセス可能にする。
  - 対象は以下3APIを含む運営用API全体とする。
    - `GET /admin/moderation/consultations?status=pending`
    - `GET /admin/moderation/consultations/find`
    - `POST /admin/moderation/consultations/:consultationId/decision`

## 今後検討事項
- 運用SLA: 例として「24時間以内に一次判定」など、審査期限を定義する。（後回し）
- 却下時のユーザー表示: 理由表示の有無と文言ポリシーを決める。（後回し）
- 判定基準: NG/要注意パターンの審査ガイドラインを別紙で定義する。（後回し）
