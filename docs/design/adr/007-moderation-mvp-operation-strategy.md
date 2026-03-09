# [ADR] 審査機能（Moderation）のMVP運用方針

* **Status**: Proposed
* **Date**: 2026-03-08

---

## 1. DB設計の方針

- 投稿作成時に、投稿本体と審査レコードを同時に作成する。
- 投稿本体（例: `consultations`）は `moderation_status` を持ち、初期値を `pending` とする。
- 審査管理用に新規テーブル（例: `moderation_reviews`）を作成し、`pending/approved/rejected` を管理する。
- 承認・却下時は、投稿本体の公開状態と審査レコードを同一トランザクションで更新する。

### NULL許容方針（MVP）

- `moderation_reviews`
  - `id`: `NOT NULL`
  - `consultation_id`: `NOT NULL`
  - `status`: `NOT NULL`（`pending/approved/rejected`）
  - `reason`: `NULL` 許容（`rejected` の場合のみ必須）
  - `decided_at`: `NULL` 許容
  - `created_at`: `NOT NULL`
  - `updated_at`: `NOT NULL`

- `consultations`
  - `moderation_status`: `NOT NULL`（初期値 `pending`）

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
  - `POST /admin/moderation/consultations/find`（ID指定の複数相談取得）
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
3. 一覧カードに `確認中` を表示する。
4. `pending` 状態のカードは相談詳細へ遷移不可にし、`運営が確認中です` 文言を表示する。
5. `approved` に更新後は、同カードから相談詳細へ遷移可能にする。

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
      "moderation_status": "pending",
      "created_at": "2026-03-08T10:15:00Z"
    }
  ]
}
```

#### 2) ID指定の複数相談取得

- Endpoint: `GET /admin/moderation/consultations/find`
- Request:

```json
{
  "consultation_ids": [101, 205, 999]
}
```

- Response:

```json
{
  "consultations": [
    {
      "id": 101,
      "title": "相談タイトル",
      "content": "相談本文",
      "author_id": 12,
      "moderation_status": "pending",
      "created_at": "2026-03-08T10:15:00Z"
    },
    {
      "id": 205,
      "title": "別の相談タイトル",
      "content": "別の相談本文",
      "author_id": 33,
      "moderation_status": "pending",
      "created_at": "2026-03-08T11:00:00Z"
    }
  ],
  "not_found_ids": [999]
}
```

- 挙動:
  - `moderation_status = pending` の相談のみ `consultations` に含める
  - `approved/rejected` の相談IDは `not_found_ids` 側で返す

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
  "moderation_status": "approved",
  "decided_at": "2026-03-08T10:30:00Z"
}
```

---

## 6. 追加で必要なもの（このADRに追記推奨）

- 権限方針（MVP）:
  - `/admin/moderation/*` は Cloudflare Access で保護し、運営メンバーまたは Service Token のみアクセス可能にする。
  - 対象は以下3APIを含む運営用API全体とする。
    - `GET /admin/moderation/consultations?status=pending`
    - `POST /admin/moderation/consultations/find`
    - `POST /admin/moderation/consultations/:consultationId/decision`

## 今後検討事項
- 運用SLA: 例として「24時間以内に一次判定」など、審査期限を定義する。（後回し）
- 却下時のユーザー表示: 理由表示の有無と文言ポリシーを決める。（後回し）
- 判定基準: NG/要注意パターンの審査ガイドラインを別紙で定義する。（後回し）
