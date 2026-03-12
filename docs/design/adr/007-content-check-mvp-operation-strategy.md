# [ADR] 投稿チェック機能（Content Check）のMVP運用方針

* **Status**: Proposed
* **Date**: 2026-03-08

---

## 0. このADRで行った意思決定

### 比較した論点

1. 投稿時に本体レコードを作るか（作る / 作らない）
2. 運営APIを1本化するか（共通reviews API）/ 分けるか（consultations API + advices API）
3. 用語を `moderation` にするか / `content-check` にするか
4. 判定APIの更新対象をどう一意化するか（`reviewId` 指定 / `target_type + target_id` 一意制約）

### 評価観点（Decision Drivers）

- MVPでの実装コストと移行コスト
- 相談/回答の仕様差分を扱いやすいか
- ユーザー向け文言のわかりやすさ
- 将来拡張時の破壊的変更リスク
- 判定APIの更新対象が曖昧にならないこと

### 最終決定

- 投稿時に本体レコードを作成し、`content_checks` を同時作成する
- 運営APIは `consultations` と `advices` を分割する
- 命名は `content-check`（ユーザー向け文言は `投稿チェック`）を採用する
- `content_checks` に `UNIQUE(target_type, target_id)` を設定し、判定対象を一意化する

### 採用しなかった案

- 投稿時に本体を作らず、承認時に本体作成する案
  - 却下理由: 承認時移送・再実行・整合性管理の実装が重く、MVPに不向き
- 運営APIを `reviews` 1本に統合する案
  - 却下理由: 相談/回答でレスポンスと運用観点が異なり、初期運用で複雑化しやすい
- 命名を `moderation` のままにする案
  - 却下理由: ユーザー向けの「投稿チェック」トーンとの乖離が大きい
- 判定APIを `reviewId` ベースにする案
  - 却下理由: 履歴管理が必要になる段階では有効だが、MVPでは過剰

---

## 背景（なぜ投稿チェック機能が必要になったか）

Fumufumuでは、相談（consultation）と回答（advice）をユーザーが即時投稿できるため、公開前に最低限の内容確認を行わないと、ガイドライン違反投稿や不適切な表現がそのまま表示されるリスクがある。  
MVP段階では、プロダクト価値の検証を優先しつつ、ユーザー体験と運用リスクのバランスを取る必要があった。

そのため本ADRでは、以下を満たす最小構成として投稿チェック機能を導入する。
- 投稿データは作成時に保持する（データ欠損を防ぐ）
- 公開可否は `content_checks` の状態で制御する（`pending/approved/rejected`）
- ユーザーには「投稿チェック中」として明示し、公開前データの露出を防ぐ
- 運営はAPI/CLIで判定可能にし、管理画面は後続フェーズで対応する

この方針により、MVPの開発速度を維持しながら、公開品質と運用安全性の最低ラインを確保する。

---

## 1. DB設計の方針

- 投稿作成時に、投稿本体と投稿チェックレコードを同時に作成する。
- 投稿チェック管理用に新規テーブル（例: `content_checks`）を作成し、`pending/approved/rejected` を管理する。
- `content_checks` は `consultation` と `advice` の両方を扱えるよう、`target_type` と `target_id` で対象を識別する。
- 承認・却下時は、投稿チェックレコードを更新し、その状態を公開可否の判定に利用する。

### 命名方針（`content` を採用する理由）

- `consultation` と `advice` を共通で表せる中立語として `content` を採用する。
- `moderation` よりユーザー向け文言との距離が近く、`投稿チェック` のトーンに整合する。
- 将来、対象が投稿本文以外（例: 画像やリンク）に拡張されても命名変更を最小化できる。

### 比較検討記録（作成する vs 作成しない）

| 観点 | 投稿時に本体を作成する（採用） | 投稿時に本体を作成しない（不採用） |
|---|---|---|
| 本文保持 | 本体テーブルで一元管理できる | 別テーブル/JSON保管が必要 |
| 公開制御 | `content_checks` を参照して `approved` のみ公開 | 本体未作成なので公開制御は単純だが承認時移送が必要 |
| 実装複雑性 | 中（一覧/詳細の表示条件に `join` or `exists` 追加） | 高（承認時INSERT、失敗時再実行、整合性管理） |
| 監査・追跡 | 作成時刻/更新履歴を本体で追いやすい | 保管先と本体の2系統管理になりやすい |
| Advice対応 | `consultation/advice` とも同一運用が可能 | 関連整合（どの相談への回答か）の扱いが複雑化 |

採用理由:
- MVPでの運用・実装コストを抑えつつ、`consultation` と `advice` を同じモデルで扱えるため。
- 承認待ちデータを失わず、運営確認や監査ログの観点で扱いやすいため。

### NULL許容方針（MVP）

- `content_checks`
  - `id`: `NOT NULL`
  - `target_type`: `NOT NULL`（`consultation/advice`）
  - `target_id`: `NOT NULL`
  - `status`: `NOT NULL`（`pending/approved/rejected`）
  - `reason`: `NULL` 許容（`rejected` の場合のみ必須）
  - `checked_at`: `NULL` 許容
  - `created_at`: `NOT NULL`
  - `updated_at`: `NOT NULL`

### 一意制約方針（MVP）

- `content_checks` には `UNIQUE(target_type, target_id)` を設定する。
- 1投稿（相談/回答）につき投稿チェックレコードは1件のみとし、再チェック時は同一レコードを更新する。
- これにより `POST /admin/content-check/consultations/:consultationId/decision` および
  `POST /admin/content-check/advices/:adviceId/decision` の更新対象を一意に確定させる。

---

## 2. 画面有無

- MVPでは運営管理画面は作成しない。
- 運営管理画面は将来フェーズで追加する前提とする。

---

## 3. 画面無しにする理由

- MVP段階での開発コストを抑え、まず投稿チェック要件を最短で満たすため。
- チェック件数が少ない初期は、DB管理ツールや運営用API/CLIで運用可能なため。
- 管理画面のUI/権限管理/監査機能を先行実装するとリリースが遅延するため。

---

## 4. 将来的に、相談投稿が増えたときに画面ありにする

- `pending` 件数増加、誤操作リスク増加をトリガーに管理画面を追加する。

### API分割方針（consultations / advices）

- 運営用の投稿チェックAPIは `consultations` と `advices` を分けて提供する。
- 理由:
  - レスポンス項目が異なるため（相談は `title + body`、回答は `body` 中心、親相談情報の参照が必要）。
  - チェック観点が異なるため（相談本文の妥当性と、回答としての適切性は評価軸が異なる）。
  - 既存の `consultations` APIを壊さずに段階導入できるため（移行リスクを抑えられる）。
  - 内部実装（service/repository）は共通化しつつ、外部契約（endpoint）は用途別に明確化できるため。

---

## 5. 画面無しの場合の実装と運営者フロー

### 実装（MVP）

- 運営用APIを用意する（例: `/admin/content-check/...`）。
- 主要API:
  - `GET /admin/content-check/consultations?status=pending&view=summary`（未チェック一覧取得）
  - `GET /admin/content-check/consultations?ids=101,205,999&view=detail`（ID指定の複数相談取得）
  - `POST /admin/content-check/consultations/:consultationId/decision`（承認/却下実行）
  - `GET /admin/content-check/advices?status=pending`（未チェック一覧取得）
  - `GET /admin/content-check/advices/find?advice_ids=301,302,999`（ID指定の複数回答取得）
  - `POST /admin/content-check/advices/:adviceId/decision`（承認/却下実行）
- CLIまたはスクリプトから運営用APIを呼び出す。
- 一般ユーザーには `pending` の投稿詳細を返さず、「投稿チェック中」を表示する。

### 運営者フロー（MVP）

1. 未チェック一覧を取得する。
2. 投稿本文・投稿者情報を確認する。
3. 承認または却下を実行する（却下時は理由を残す）。

### 投稿後導線（ユーザー側・MVP）

1. ユーザーが投稿ボタンを押す。
2. 投稿作成成功後、プロフィールの「相談」一覧画面へ遷移する。
3. プロフィールの相談一覧カードに `投稿チェック中` を表示する。（投稿チェック中のものは、他の一覧や詳細画面では表示されない。）
4. `pending` 状態のカードは相談詳細へ遷移不可にし、`運営が投稿チェック中です` 文言を表示する。
5. `approved` に更新後は、同カードから相談詳細へ遷移可能にする。（他の一覧画面でも表示される。）

#### Advice投稿後導線（ユーザー側・MVP）

1. ユーザーが回答投稿ボタンを押す。
2. 投稿作成成功後、プロフィールの「アドバイス」一覧画面へ遷移する。
3. プロフィールのアドバイス一覧カードに `投稿チェック中` を表示する。（投稿チェック中のものは、他の一覧や相談詳細の回答一覧では表示されない。）
4. `pending` 状態のカードは回答詳細へ遷移不可にし、`運営が投稿チェック中です` 文言を表示する。
5. `approved` に更新後は、同カードから回答詳細へ遷移可能にする。（相談詳細の回答一覧にも表示される。）

### APIリクエスト/レスポンス（MVP）

#### 1) 未チェック一覧取得

- Endpoint: `GET /admin/content-check/consultations?status=pending`
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

- Endpoint: `GET /admin/content-check/consultations/find?consultation_ids=101,205,999`
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
      "body": "相談本文",
      "author_id": 12,
      "status": "pending",
      "created_at": "2026-03-08T10:15:00Z"
    },
    {
      "id": 205,
      "title": "別の相談タイトル",
      "body": "別の相談本文",
      "author_id": 33,
      "status": "pending",
      "created_at": "2026-03-08T11:00:00Z"
    }
  ],
  "not_found_ids": [999]
}
```

- 挙動:
  - `content_checks.status = pending` の相談のみ `consultations` に含める
  - `approved/rejected` の相談IDは `not_found_ids` 側で返す
  - `consultation_ids` の件数増加によりURL長の制約が懸念される場合は、`POST /admin/content-check/consultations/find` への切り替えを行う

#### 3) 承認/却下実行

- Endpoint: `POST /admin/content-check/consultations/:consultationId/decision`
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
  "checked_at": "2026-03-08T10:30:00Z"
}
```

#### 4) Advice未チェック一覧取得

- Endpoint: `GET /admin/content-check/advices?status=pending`
- Request:
  - Query:
    - `status`: `pending`（必須）
- Response:

```json
{
  "advices": [
    {
      "id": 301,
      "consultation_id": 101,
      "status": "pending",
      "created_at": "2026-03-08T10:15:00Z"
    }
  ]
}
```

#### 5) ID指定の複数Advice取得

- Endpoint: `GET /admin/content-check/advices/find?advice_ids=301,302,999`
- Request:
  - Query:
    - `advice_ids`: カンマ区切りのID文字列（例: `301,302,999`）

- Response:

```json
{
  "advices": [
    {
      "id": 301,
      "consultation_id": 101,
      "body": "回答本文",
      "author_id": 45,
      "status": "pending",
      "created_at": "2026-03-08T10:15:00Z"
    },
    {
      "id": 302,
      "consultation_id": 205,
      "body": "別の回答本文",
      "author_id": 46,
      "status": "pending",
      "created_at": "2026-03-08T11:00:00Z"
    }
  ],
  "not_found_ids": [999]
}
```

- 挙動:
  - `content_checks.status = pending` の回答のみ `advices` に含める
  - `approved/rejected` の回答IDは `not_found_ids` 側で返す
  - `advice_ids` の件数増加によりURL長の制約が懸念される場合は、`POST /admin/content-check/advices/find` への切り替えを行う

#### 6) Advice承認/却下実行

- Endpoint: `POST /admin/content-check/advices/:adviceId/decision`
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
  "advice_id": 301,
  "status": "approved",
  "checked_at": "2026-03-08T10:30:00Z"
}
```

---

## 6. 追加で必要なもの（このADRに追記推奨）

- 権限方針（MVP）:
  - `/admin/content-check/*` は Cloudflare Access で保護し、運営メンバーまたは Service Token のみアクセス可能にする。
  - 対象は以下6APIを含む運営用API全体とする。
    - `GET /admin/content-check/consultations?status=pending`
    - `GET /admin/content-check/consultations/find`
    - `POST /admin/content-check/consultations/:consultationId/decision`
    - `GET /admin/content-check/advices?status=pending`
    - `GET /admin/content-check/advices/find`
    - `POST /admin/content-check/advices/:adviceId/decision`

## 今後検討事項
- 運用SLA: 例として「24時間以内に一次判定」など、チェック期限を定義する。（後回し）
- 却下時のユーザー表示: 理由表示の有無と文言ポリシーを決める。（後回し）
- 判定基準: NG/要注意パターンのチェックガイドラインを別紙で定義する。（後回し）
