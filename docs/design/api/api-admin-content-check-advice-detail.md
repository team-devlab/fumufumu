# 運営向け未承認アドバイス詳細取得API 設計手順書

## 1. 目的
- 既存の `GET /api/admin/content-check/advices`（summary）で取得したアドバイスIDをもとに、運営画面で審査に必要な詳細情報（本文・投稿者など）を取得できるようにする。
- 相談側API（`view=summary/detail`）と揃えた設計にして、運用・実装の一貫性を確保する。

## 2. 対象範囲
- 追加対象: `GET /api/admin/content-check/advices?view=detail&ids=...`
- 今回は詳細取得までを対象とし、承認/却下APIは別タスクとする。
- クエリの受け渡し方法は、`/api/admin/content-check/consultations` と同一ルールに揃える。

## 3. エンドポイント仕様

### 3.1 Request
- Method: `GET`
- Path: `/api/admin/content-check/advices`
- Query:
  - `view`: `summary | detail`（省略時 `summary`）
  - `ids`: `view=detail` のとき必須、カンマ区切り正の整数
- 相談側との互換方針:
  - `view=summary` では `ids` 不要
  - `view=detail` では `ids` 必須
  - `ids` のバリデーションメッセージ/挙動（空文字・非数値・0以下）は相談側と同一

#### 例
- summary:
  - `/api/admin/content-check/advices`
- detail:
  - `/api/admin/content-check/advices?view=detail&ids=101,102,103`

### 3.2 Response

#### summary（既存互換）
```json
{
  "advices": [
    {
      "id": 101,
      "consultation_id": 55,
      "status": "pending",
      "created_at": "2026-03-20T08:00:00.000Z"
    }
  ]
}
```

#### detail（新規）
```json
{
  "advices": [
    {
      "id": 101,
      "consultation_id": 55,
      "body": "アドバイス本文",
      "author_id": 12,
      "status": "pending",
      "created_at": "2026-03-20T08:00:00.000Z"
    }
  ],
  "missing_ids": [103],
  "non_pending": [
    {
      "id": 102,
      "current_status": "approved"
    }
  ]
}
```

## 4. 実装手順

### Step 1. Validator追加
- `content-check.validator.ts` に advice用query schemaを追加。
- 相談側 `listConsultationContentChecksQuerySchema` と同等ルールを適用（可能なら共通化）。
  - `view` default `summary`
  - `view=detail` で `ids` 必須
  - `ids` は正の整数のカンマ区切り

### Step 2. Repository追加
- `content-check.repository.ts` に以下を追加。
  - `findAdviceChecksWithAdviceByIds(ids: number[])`
- 返却項目:
  - `targetId`（content_checks.target_id）
  - `status`（content_checks.status）
  - `id`（advices.id）
  - `consultationId`（advices.consultation_id）
  - `body`（advices.body）
  - `authorId`（advices.author_id）
  - `createdAt`（advices.created_at）
- Join条件:
  - `content_checks.target_type = 'advice'`
  - `content_checks.target_id = advices.id`

### Step 3. Service追加
- `consultation-content-check.service.ts` に以下を追加。
  - `findPendingAdvicesByIds(ids: number[])`
- 処理方針:
  - pending は `advices` 配列へ
  - pending以外は `non_pending` 配列へ `{ id, current_status }`
  - 見つからないIDは `missing_ids` へ
- 日付は既存形式に合わせて ISO 文字列化。

### Step 4. Controller分岐拡張
- `admin-content-check.controller.ts` の `/advices` ハンドラを `summary/detail` 分岐対応に変更。
  - `view=summary` -> 既存 `listPendingAdviceContentChecks()`
  - `view=detail` -> 新規 `findPendingAdvicesByIds(query.ids ?? [])`
- query validationを挟み、バリデーションエラー時は既存通り400。

### Step 5. テスト追加
- `content-check-advices.test.ts` を拡張。
- 最低限追加するケース:
  - `detail: ids指定でpending詳細とmissing/non_pendingを返す`
  - `detail: view=detail で ids未指定は400`
  - `detail: 認証なしは401`
- 既存 summary テストは後方互換確認として維持。

## 5. 受け入れ基準
- summaryのレスポンス互換性が維持される。
- detailで `ids` 指定時、pending / non-pending / missing が正しく分類される。
- 不正queryで400、未認証で401が返る。
- 追加テストがすべて成功する。

## 6. 実装時の注意点
- 相談側detailのレスポンス構造・命名規則（`missing_ids`, `non_pending`）と揃える。
- `id` の意味を統一する（`advices.id` を返し、`non_pending.id` は問い合わせ対象IDを返す）。
- 既存クライアント影響を避けるため、summaryレスポンスの項目は変更しない。

## 7. 次タスク（本手順書のスコープ外）
- 運営判定APIの追加:
  - `POST /api/admin/content-check/advices/:adviceId/decision`
  - `decision=approved|rejected`, `rejected` 時 `reason` 必須
