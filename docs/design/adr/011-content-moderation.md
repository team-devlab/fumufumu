# [ADR] 投稿モデレーション (hide/unhide) 機能の導入方針

* **Status**: Accepted
* **Date**: 2026-07-04

---

## 0. このADRで行った意思決定

### 比較した論点

1. モデレーション判定に content-check の `rejected` を流用するか、独立した hide 概念を追加するか
2. hide/unhide API を consultation / advice で分けるか統一するか
3. hide 理由 (reason) の保持方法 (テーブルカラム追加 / 汎用アクションテーブル / content_checks 流用)
4. 相談 hide 時に紐づく advice を cascade で処理するか
5. admin UI を content-check と統合するか分離するか

### 評価観点 (Decision Drivers)

- ADR 007 の content-check ワークフローと意味的に混じらないこと
- 監査ログ要件 (誰が / いつ / なぜ) を単一の仕組みでカバーできること
- 今回の advice filter 漏れバグと同型の再発リスクを最小化
- MVP 運用の現実的なコスト (schema 変更 / query 影響を過度に広げない)
- [ADR 010](./010-admin-permissions-mvp.md) の admin 認可方針 (`adminGuard`, 404 return) と整合すること

### 最終決定

- モデレーションは content-check とは別軸として扱い、既存の `hidden_at` カラムを toggle する形で soft delete を実現する
- API は `targetType` (`consultations` / `advices`) を path parameter に入れた統一 endpoint とする (`POST /api/admin/moderation/:targetType/:id/hide`)
- 監査ログを兼ねる `moderation_actions` テーブルを新設し、hide/unhide の履歴と reason をここに蓄積する (`hidden_reason` カラムはテーブル本体には追加しない)
- 相談 hide 時の cascade は既存の read guard 経由で自動対応 (追加 write 不要)
- admin UI は既存 content-check 画面に「投稿チェック待ち / 公開中 / 非表示中」のタブとして統合する

### 採用しなかった案

- **content-check の `rejected` 状態を運営 hide に流用**
  - 却下理由: 「投稿チェックで違反判定」と「運営が事後 hide」は意図が異なる。同じ status に混ぜると reject reason の意味が二重化し、監査観点で判別困難になる。
- **API を consultation / advice で分離する endpoint** (ADR 007 の content-check API に合わせる)
  - 却下理由: hide/unhide の入力は target + reason で共通。ADR 007 で分けた理由 (レスポンス項目 / judge 観点の違い) は本機能には当てはまらず、endpoint 冗長化のデメリットが上回る。
- **`consultations.hidden_reason` / `advices.hidden_reason` カラム追加**
  - 却下理由: 最新 reason は保持できるが、監査ログ (誰が / いつ / 履歴) を別テーブルに切ることになり整合性管理が煩雑。イベント (action) の追記として自然に扱える `moderation_actions.reason` で機能的に等価。
- **相談 hide 時に advice テーブルを cascade で更新する**
  - 却下理由: 既存の `assertConsultationReadableOrThrow` が親 hidden 時に子 API を 404 にするため、追加 write は無駄で誤操作リスクを増やすだけになる。
- **admin UI を content-check と分離**
  - 却下理由: 運営作業は同じ投稿を対象にした「approve → 事後 hide」「reject → 復活」のように状態を跨ぐ想定で、分離すると導線が跳ねてしまう。

---

## 1. 背景

現状、投稿されたコンテンツを非表示化する仕組みは [ADR 007](./007-content-check-mvp-operation-strategy.md) の content-check の `rejected` 状態のみで、これは公開前レビューの一部として位置付けられている。しかし運営視点では以下のニーズが存在する。

1. 承認済み投稿を事後的に「これは消したい」と判断した場合の非表示化
2. テスト用に本番へ作成した投稿の随時削除
3. 非表示にした投稿の履歴 (誰が / いつ / なぜ) を残す監査要件

これらを ADR 007 の `rejected` で扱うと、「投稿チェックで違反判定した」の意味と混じって監査時に判別困難になる。そのため独立した「モデレーション (hide/unhide)」の概念を追加する。

---

## 2. DB 設計

### 2.1 既存 `hidden_at` を toggle する

`consultations` / `advices` テーブルには既に `hidden_at` (nullable timestamp) が存在し、public な read guard で filter されている。モデレーションはこれを toggle するだけで soft delete を実現する。

- テーブル本体への schema 変更は不要
- 既存の filter (`isNull(hidden_at)`) がそのまま効く
- hard delete (物理削除) は本 ADR では提供しない (§7 で見直し条件を記載)

### 2.2 監査ログ用テーブル `moderation_actions` を新設

```
moderation_actions
- id              INTEGER PRIMARY KEY AUTOINCREMENT
- target_type     TEXT NOT NULL       -- 'consultation' | 'advice'
- target_id       INTEGER NOT NULL
- action          TEXT NOT NULL       -- 'hide' | 'unhide'
- reason          TEXT                -- nullable, hide 時のみ意味を持つ
- admin_user_id   INTEGER NOT NULL    -- users.id への FK
- created_at      INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
- INDEX idx_moderation_actions_target (target_type, target_id, created_at DESC)
```

利点:

- hide/unhide の履歴が append-only で残る (レコードは削除しない)
- 「現在の hide reason」= 最新 `hide` action の reason で参照可能
- 「誰が / いつ」の監査 = テーブルそのもの
- 将来 `delete` などの action を追加する場合も同じ pattern で拡張できる

### 2.3 採用しなかった `hidden_reason` カラム追加案

`consultations.hidden_reason` / `advices.hidden_reason` を追加する案は却下。

- 最新 reason は取れるが、履歴が別テーブル (audit log) に分かれる → 整合性管理が煩雑になる
- unhide 後 rehide した際の reason 更新タイミングが本質的に「イベント (action) の追記」なので、テーブル設計としてもイベント側で持つ方が自然
- `moderation_actions.reason` の "最新 hide action の reason" 参照で機能的に等価

---

## 3. API 設計

### 3.1 endpoint

| Method | Path | Body | 概要 |
|---|---|---|---|
| POST | `/api/admin/moderation/:targetType/:id/hide` | `{ reason?: string, skipAuditLog?: boolean }` | 対象を hide (既に hidden なら reason だけ更新するかは実装判断、後述) |
| POST | `/api/admin/moderation/:targetType/:id/unhide` | `{ skipAuditLog?: boolean }` | 対象を unhide |
| GET | `/api/admin/moderation/:targetType/:id/history` | - | 対象の hide/unhide 履歴を新しい順で取得 (optional, Phase 1 では API のみ) |

- `:targetType` ∈ `{ consultations, advices }`
- `:id` は数値
- `skipAuditLog` の挙動は §3.6 参照

### 3.2 単一 API 統合の理由

ADR 007 の content-check API は consultation / advice を分割しているが、これは以下の理由による。

- レスポンス項目が異なる (相談は `title + body`、助言は `body` 中心 + 親相談情報)
- チェック観点が異なる (相談の妥当性 vs 助言としての適切性)

モデレーション API ではこれらが当てはまらない (hide/unhide の入力 / 挙動は target 共通)。従って `targetType` を path parameter に入れた統一 endpoint で十分。将来 target が増えた際 (image, comment 等) の拡張も path 追加で完結する。

### 3.3 既存 list API の `?includeHidden=true` 拡張

admin 権限時のみ受け付ける query parameter として以下を追加する。

- `GET /api/consultations?includeHidden=true`
- `GET /api/consultations/:id/advices?includeHidden=true`

新規 endpoint を切らずに既存 list を admin 用に拡張する形。認可 layer で `role !== 'admin'` の場合は `includeHidden` を無視する。

### 3.4 認可

[ADR 010](./010-admin-permissions-mvp.md) の `adminGuard` middleware を `/api/admin/moderation/*` に必須化する。既存の `/api/admin/content-check/*` と同じ middleware chain (`authGuard` → `adminGuard`)。

- `role !== 'admin'` の場合は **404 Not Found** を返す (admin API の存在を漏らさないため、ADR 010 の方針踏襲)

### 3.5 冪等性

- `hide` を既に hidden な対象に対して呼んだ場合の挙動: **`moderation_actions` に新規レコードを積み、`reason` を更新する** 方針とする (誤操作リスクよりも「reason だけ差し替えたい」運用ニーズを優先)
- `unhide` を既に unhidden な対象に対して呼んだ場合の挙動: **no-op**。`moderation_actions` にはレコードを積まない

### 3.6 `skipAuditLog` パラメータ

運用者 (admin) が本番に投入したテストデータを操作する際に、監査ログとして残す価値のないイベントを積まないための逃げ道。

- **default: `false`** — `moderation_actions` にレコードを積む (実データ操作の想定、監査観点で安全側)
- **`true`**: `hidden_at` の toggle だけ実施し、`moderation_actions` への write を **スキップ** する
  - 「最初から積まない」ため、後追いで削除する必要がない
  - テストデータ削除で target レコードごと消す運用にした場合でも、`moderation_actions` に dangling なレコードが残らない

管理画面の UI では、hide/unhide 操作の dialog に「テストデータ (監査ログを残さない)」チェックボックスを配置する想定。default は off (= `skipAuditLog: false`)。

---

## 4. Cascade 方針

### 4.1 相談 hide 時、紐づく advice をどうするか

**追加処理不要**。既存の `ConsultationService.assertConsultationReadableOrThrow` (`apps/fumufumu-backend/src/services/consultation.service.ts`) が以下を担保している。

- 相談詳細 API (`GET /:id`): 親 hidden かつ requestUserId が author でなければ 404
- 助言一覧 API (`GET /:id/advices`): 同上

つまり相談を hide すれば、助言一覧も自動的に到達不可になる。advice テーブルの `hidden_at` を追加で更新する必要はない。

### 4.2 unhide 時も同様

相談を unhide すれば、advice はそのまま公開状態に戻る (自身に対する hide がなければ)。cascade write を行っていないため、advice 個別の hide 状態が独立に保たれる。

### 4.3 テストで担保する挙動

- 相談 hide → 助言一覧 API が 404 (他者視点)
- 相談 hide → 相談詳細 API が 404 (他者視点)
- 相談 unhide → 助言一覧 API が 200 で advice を返す
- advice 個別に hide → 相談詳細内の advice 一覧から除外 (既存 filter)

---

## 5. UI 設計 (admin 画面統合)

### 5.1 既存 content-check 画面に統合

既存 `apps/fumufumu-frontend/src/features/admin-content-check/` を拡張し、以下のタブ構造とする。

| タブ | 対象 | 表示件数目安 | 主な操作 |
|---|---|---|---|
| 投稿チェック待ち (pending) | content_check.status = 'pending' | 流動的 (溜まりすぎたら別 alert) | approve / reject (既存) |
| 公開中 (approved) | content_check.status = 'approved' かつ hidden_at IS NULL | 蓄積型 | hide (+ reason 入力) |
| 非表示中 (hidden) | hidden_at IS NOT NULL | 蓄積型 | unhide (現在の hide 理由を併記) |

各タブで pagination (既存 `PendingConsultationList` / `PendingAdviceList` の pattern 踏襲)。

### 5.2 統合する理由

運営作業は同一投稿を対象に「approve → 事後 hide」「reject → 復活 (再 approve)」のように複数状態を跨ぐ想定。画面が分かれていると同じ投稿を探し直すコストが発生する。1 画面 + タブ切替なら target が同じままモードだけ切り替わる。

### 5.3 検索・ソート

Phase 1 では default sort (`created_at DESC`) + pagination のみ。検索 / タグ絞込 / author 絞込 は Phase 2 送り (別 issue)。

---

## 6. 監査ログの参照

### 6.1 参照 API (optional, Phase 1)

- `GET /api/admin/moderation/:targetType/:id/history`
  - 特定 target の hide/unhide 履歴を新しい順に返す

Phase 1 では API のみ提供、UI は Phase 2 送り。

### 6.2 保持期間

`moderation_actions` に積まれたレコードは MVP では削除しない (append-only を運用方針とする)。将来的にログ量が問題になった段階で保持期間ポリシーを決める。

### 6.3 テストデータの扱い

運用者 (admin) が本番に投入したテストデータを操作する場合、そのデータへの hide/unhide 履歴は監査観点で価値がない。この状況は §3.6 の `skipAuditLog: true` を明示的に指定して **最初から積まない** ことで対処する。

- 事後に `moderation_actions` レコードを削除する運用は不要 (積まないため)
- テストデータ / 実データの識別機構はまだ無いため (§7 の見直し条件で `is_test_data` フラグ導入を予定)、現状は運用者が dialog のチェックボックスで意図的に判断する
- 「append-only」は本 ADR の運用方針であって DB 制約ではない (trigger 等で強制はしない)。ただし通常フローで DELETE が必要な状況は上記の仕組みで発生しない前提

---

## 7. トレードオフと今後の見直し条件

### 期待効果

- content-check と意味的に分離することで「なぜ hidden か」の判別が明快
- 監査ログが単一テーブルに集約され、hide 理由・実施者・実施時刻を一貫して追える
- API を統一 endpoint にすることで、将来 target が増える際の拡張コストを最小化
- 既存 `hidden_at` + read guard を活用するため、schema 変更範囲・query 影響が最小限

### トレードオフ

- `moderation_actions` テーブルが append-only で肥大化する。ログ量が本番運用で問題になった場合、保持期間ポリシー / パーティショニング / 別ストレージへの archive を検討する
- hard delete (target レコード物理削除) 機構は本 ADR では提供しない。本当に必要になった場合は別 ADR で追加を検討する
- `skipAuditLog: true` は監査ログを意図的にスキップする逃げ道であり、悪意ある admin が「隠蔽したい操作」に流用できる余地を残す。MVP では admin ロールを持つのが特定の少数の信頼できる人に限定される前提で許容する。role が細分化した際 (moderator 等) には `skipAuditLog` を許容する権限を絞る形で対応する
- 検索 / 絞込機能を Phase 2 送りとしたため、投稿数が数千件を超えた時点で運用にストレスが出る可能性 (Phase 2 で対応)
- 既存 list API に `?includeHidden` を足す方式は、他 role が増えた際 (moderator 等) に条件分岐が複雑化しやすい。ロール追加時は ADR 010 の見直しと合わせて再検討する

### 将来の見直し条件

- 「テストデータ」を独立管理したくなる → `is_test_data` フラグをテーブルに追加する別 ADR を切る
- 検索 / 絞込が必須化する → admin UI の list 拡張 ADR を切る
- 監査ログの量が問題になる → 保持期間ポリシー ADR を切る
- role が admin 以外に増える (moderator など) → ADR 010 の見直しと合わせて moderation の権限粒度を再定義
- hard delete が要件化する → 別 ADR で追加

---

## 8. 参照

- ADR 007: 投稿チェック機能 (`docs/design/adr/007-content-check-mvp-operation-strategy.md`)
- ADR 010: /admin の権限制御 (`docs/design/adr/010-admin-permissions-mvp.md`)
- 関連 issue: #158 (本 ADR の実装 issue)
- 関連 issue: #152 (advice filter 漏れバグ; 「read guard で cascade を自動吸収」の設計に至った背景)
