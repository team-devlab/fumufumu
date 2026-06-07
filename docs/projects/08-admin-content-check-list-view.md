# 08. 管理画面 投稿チェック一覧（Admin Content Check List View）

このドキュメントは、ADR 010（管理画面 /admin の権限制御）と ADR 007（投稿チェック機能 MVP 運用）を前提に、`/admin` で投稿チェック対象（pending な相談・アドバイス）の一覧表示を実装するための作業計画である。

ADR 010 §1 で /admin の目的として「投稿チェック機能の一連の管理」を挙げているが、これは複数 PR に分割して進める。本ドキュメントは **第一弾「一覧表示のみ」** のスコープを扱う。

---

## 1. 目的と前提

### 1.1 目的

- 運営者 (`role === 'admin'`) が `/admin` 配下で、**承認待ち（pending）の相談・アドバイスを一覧で確認できる** 状態にする
- これにより「今承認すべき投稿がどれだけあるか」「投稿内容に問題が無いか目視で確認する」を運営フローに乗せられるようにする

### 1.2 前提（既に整備済み）

- ADR 010: `/admin` への role guard（フロント layout / バック adminGuard）が稼働中
- ADR 007: 投稿チェックの DB 設計（`content_checks` テーブル）と運用 API（`/api/admin/content-check/*`）が既に存在
- ADR 009: 承認時のメール送信導線が `ctx.waitUntil()` で実装済み（承認操作自体は本 PR スコープ外）
- 初期 admin ユーザーが付与済み（DB 直 UPDATE、ADR 010 §3）

### 1.3 本 PR のスコープ（明確に "一覧のみ"）

- pending な相談・アドバイスを admin が一覧で見られる
- 承認 / 却下の操作 UI、詳細遷移、ページング、編集機能は **本 PR では含めない**

---

## 2. ゴール（Done の定義）

- `/admin` を開くと「投稿チェック」タブ的なエリアが表示される
- 「相談 (pending)」「アドバイス (pending)」の 2 セクションが見える
- 各アイテムについて、運営が「承認すべきか」をある程度判断できる情報（タイトル / 本文 / 作成日時 / 投稿者識別子）が表示される
- pending が 0 件の場合は空状態を明示する
- 非 admin が叩いた場合は ADR 010 の guard により 404（既存挙動を維持）
- バックエンドへの変更なし、または極小（後述）

---

## 3. 既存 API の網羅調査

ユーザー要望「既存 API だけでこの画面の作成が可能かを網羅的に確かめる」に応えるため、関連 API を全列挙する。

### 3.1 利用可能なエンドポイント

すべて `authGuard → adminGuard` 適用済み（ADR 010）。

| Method | Path | 用途 | レスポンス概要 |
|---|---|---|---|
| GET | `/api/admin/content-check/consultations?view=summary` | pending 相談の **id 一覧** | `{ consultations: [{ id, status, created_at }] }` |
| GET | `/api/admin/content-check/consultations?view=detail&ids=1,2,3` | 指定 id の **詳細**（title / body / author_id） | `{ consultations: [{ id, title, body, author_id, status, created_at }], missing_ids, non_pending }` |
| POST | `/api/admin/content-check/consultations/:id/decision` | 相談の承認/却下 | （**本 PR では使わない**） |
| GET | `/api/admin/content-check/advices?view=summary` | pending アドバイスの **id 一覧** | `{ advices: [{ id, consultation_id, status, created_at }] }` |
| GET | `/api/admin/content-check/advices?view=detail&ids=1,2,3` | 指定 id の **詳細**（body / author_id / consultation_id） | `{ advices: [{ id, consultation_id, body, author_id, status, created_at }], missing_ids, non_pending }` |
| POST | `/api/admin/content-check/advices/:id/decision` | アドバイスの承認/却下 | （**本 PR では使わない**） |

### 3.2 利用パターン: 2-call (summary → detail)

「pending の全件を表示する」という本 PR の要件を、既存 API で満たすには次のフローになる：

1. `GET ...?view=summary` で **pending な全 id を取得**（作成順）
2. `GET ...?view=detail&ids=<summary で取った全 id>` で title / body / author_id を取得
3. UI に並べる

相談・アドバイスでそれぞれ 2 call、合計 4 call。pending 件数が少ない MVP では妥当。

> 単純な 1-call（summary が title / body まで返す）にしない理由は ADR 007 / 関連 PR で「summary は軽量、detail は明示的に id 指定」と分離する判断がされているため。本 PR ではその判断を踏襲する。

### 3.3 既存 API でカバーできること / できないこと

| 表示したい情報 | 既存 API でカバー | 備考 |
|---|---|---|
| pending な相談 / アドバイスの存在自体 | ✅ | summary で取れる |
| タイトル（相談） | ✅ | detail で取れる |
| 本文 | ✅ | detail で取れる |
| 作成日時 | ✅ | summary / detail どちらでも取れる |
| `author_id`（投稿者の識別子） | ✅ | detail で取れる |
| **投稿者の表示名（author.name）** | ❌ | API は `author_id` (number) しか返さない |
| **タグ情報（相談）** | ❌ | content-check API は tags を返さない |
| `consultation_id`（アドバイス所属の相談） | ✅ | summary / detail どちらでも取れる |
| **所属相談のタイトル**（アドバイス側） | ❌ | API は `consultation_id` しか返さない |
| 既に承認済み / 却下済みの履歴 | ❌ | content-check は **pending のみ** を返す（既存仕様） |

---

## 4. ギャップへの対処方針

§3.3 で「❌」となった項目について、本 PR でどう扱うかを決める。

### 4.1 投稿者の表示名 (author.name)

**方針: 暫定で `ユーザー#{author_id}` 表記とし、API 拡張は別 PR に切り出す。**

理由:

- 本 PR は「一覧のみ」のスコープ。author 表示の拡張で diff を増やしたくない
- author_id だけでも「同じ投稿者が複数 pending を持っている」程度の運用観察はできる
- 将来的な API 拡張（`view=detail` のレスポンスに `author: { id, name, disabled }` を含める）は、既存の `Author` 型と整合させる形で別 PR で実施する想定

### 4.2 タグ情報（相談）

**方針: 本 PR では表示しない。** 承認判断は title + body で十分行えるため。

将来「タグ別に pending を絞り込みたい」「承認時にタグを編集したい」要望が出たら別 PR で API 拡張する。

### 4.3 所属相談のタイトル（アドバイス側）

**方針: 本 PR では表示しない。** `consultation_id` のみ表示し、必要なら admin が `/consultations/<id>` を別タブで開いて確認する運用とする。

将来 admin の UX 改善で必要になったら、advice detail API に `consultation: { id, title }` を含める拡張を別 PR で。

### 4.4 既に承認済み / 却下済みの履歴

**方針: 本 PR スコープ外。** ADR 007 設計上、content-check 一覧は pending 限定。承認履歴を見たい要件は本機能の MVP に含まれない。

---

## 5. 設計判断

### 5.1 フロントエンドのディレクトリ配置

| 提案 | パス | 妥当性 |
|---|---|---|
| 採用 | `apps/fumufumu-frontend/src/features/admin-content-check/` | 「admin 専用機能」と明示でき、将来の admin 系機能（ユーザー管理等）と並列に置ける |
| 不採用 | `features/content-check/` | 既存の `features/consultation/` と概念が近すぎて混乱する。admin 専用文脈を消してしまう |
| 不採用 | `features/admin/content-check/` | ネストが深いだけで、現時点では admin 系が 1 機能しか無いので過剰 |

具体的なファイル構成：

```
src/features/admin-content-check/
├── api/
│   └── adminContentCheckApi.ts       # server-only / fetchPendingConsultationsApi / fetchPendingAdvicesApi
├── components/
│   ├── PendingConsultationList.tsx   # 相談 pending リスト
│   ├── PendingAdviceList.tsx         # アドバイス pending リスト
│   └── PendingItemCard.tsx           # 共通カード（タイトル無し版も流せる形）
└── types/
    └── index.ts                       # PendingConsultation, PendingAdvice 等
```

### 5.2 ページ構成

- `apps/fumufumu-frontend/src/app/(main)/admin/page.tsx` を書き換える
- 既存の「管理画面（仮）」プレースホルダを撤去
- Server Component で API を呼び、両リストを並べる
- CLAUDE.md ルール（`useEffect` 既定禁止）に整合させるため、データ取得は Server Component で完結

### 5.3 API 呼び出しの順序とエラーハンドリング

- `Promise.all([fetchSummaryConsultations(), fetchSummaryAdvices()])` で同時取得
- それぞれの summary 結果から id を抽出し、ids が 0 件でなければ detail を呼ぶ
- どちらかが失敗しても画面全体を白くせず、失敗セクションだけエラー表示
- いずれの API も 4xx / 5xx は ApiError を throw する既存 `apiClient` の挙動に乗る

### 5.4 表示しないことの明示

「タグが表示されていない」「投稿者名が author_id 表記」等は **UI 側に注意書きを置かない**。本 PR はスコープを絞った MVP であり、ノイズになる注釈を入れない方が運営者に混乱が少ない。代わりに本ドキュメントと PR description に明記する。

---

## 6. 実装ステップ（コミット境界）

スモールステップで進めるため、以下の単位でコミットを分ける。各ステップ完了時にレビューを受ける。

### Step 1: 型定義 + API client（server-only）

- `features/admin-content-check/types/index.ts` を作成
  - `PendingConsultationSummary` / `PendingConsultationDetail` 等
- `features/admin-content-check/api/adminContentCheckApi.ts` を作成
  - `fetchPendingConsultationsApi()`: summary → detail の 2-call を内包
  - `fetchPendingAdvicesApi()`: 同上
- バックエンド変更なし
- 動作確認: 単独では UI が無いため、次ステップで併せて確認

### Step 2: 一覧 UI コンポーネント + page.tsx 書き換え

- `PendingConsultationList`, `PendingAdviceList`, `PendingItemCard` を実装
- `(main)/admin/page.tsx` を書き換え、Server Component で 2 つの fetch を実行し UI に流す
- 空状態 / エラー時 UI もこの Step に含める
- 動作確認: ローカル dev server で admin ログイン → /admin → 一覧表示

### Step 3: 追加 UI component の vitest テスト

当初は「frontend の component test 体制が無い」と認識していたが、実際には vitest + @testing-library/react + @testing-library/jest-dom (vitest entry) + jsdom が `apps/fumufumu-frontend` に既に揃っていた (Button.test.tsx が前例)。
そのため本 PR で追加した UI component に対するリグレッション防止テストを同梱する。

対象と粒度:

- `PendingItemCard.test.tsx`: title 有/無の分岐、authorId null / 数値の表示、meta slot の有無、created_at の日本語ロケール表示
- `PendingConsultationList.test.tsx`: success + items / success + empty / error の 3 状態の表示分岐、件数バッジの存在
- `PendingAdviceList.test.tsx`: 同上 + 所属相談 link が target="_blank" で出ているか

意図的に含めないテスト:

- `page.tsx` (Server Component): `Promise.allSettled` over server-only fetchers の組合せで、`next/headers` の `cookies()` mocking が fragile。E2E (将来の Playwright 等) に寄せるべき領域
- `adminContentCheckApi.ts` (server-only): 同上の理由。API contract は backend 統合テスト (admin-guard) でカバー済みのため重複を避ける

---

## 7. このPRで意図的に含めないこと

- 承認 / 却下の操作 UI（次の PR）
- 投稿チェック詳細ページへの遷移
- ページング（pending 件数が増えてきたら別 PR で導入）
- 投稿者の表示名取得（API 拡張を別 PR で）
- タグ情報の表示（同上）
- アドバイス側で所属相談タイトルを併記する（同上）
- 承認済み / 却下済みの履歴閲覧（MVP スコープ外）
- ヘッダーへの「管理画面」ナビゲーション追加（admin 自身は URL 直打ちで来る前提、UI 露出は ADR 010 §5 の方針に従って単独 PR で扱う）

---

## 8. 後続作業（次以降の PR 想定）

1. **承認 / 却下 UI** — `POST /api/admin/content-check/.../decision` を叩く form + 楽観的更新
2. **author 情報の API 拡張** — `view=detail` レスポンスに `author: { id, name, disabled }` を含める
3. **アドバイス側で所属相談タイトル併記** — advice detail API 拡張
4. **承認済み / 却下済みの履歴閲覧** — content-check API に history view 追加
5. **ページング** — pending 件数が運用に響く規模になってから

---

## 9. 確認したい点（実装着手前に user に確認）

以下の判断は本ドキュメントで暫定方針を置いているが、user 判断が必要：

1. **feature dir 名**: `features/admin-content-check/` で良いか？
2. **author 表示**: `ユーザー#{author_id}` 暫定で良いか？ それとも本 PR 内で API 拡張までやりたいか？
3. **タグ・所属相談タイトル**: 本 PR では出さない方針で良いか？
4. **承認待ち件数の数字表示**: 「相談 pending: 3 件」のような件数バッジを section header に出すか？（UI 実装コストは小、データは summary レスポンスから無料で取れる）
5. **タブ分けするか並列で表示するか**: 相談セクションとアドバイスセクションを **同一ページに縦並び** で出す案を採用しているが、Tab で切り替える形にしたい？

---

## 10. 関連

- ADR 007: [`docs/design/adr/007-content-check-mvp-operation-strategy.md`](../design/adr/007-content-check-mvp-operation-strategy.md) — content-check の DB 設計と運用方針
- ADR 009: [`docs/design/adr/009-email-notification-delivery-strategy-mvp.md`](../design/adr/009-email-notification-delivery-strategy-mvp.md) — 承認時メール送信
- ADR 010: [`docs/design/adr/010-admin-permissions-mvp.md`](../design/adr/010-admin-permissions-mvp.md) — /admin の権限制御
- 既存 API: [`apps/fumufumu-backend/src/routes/admin-content-check.controller.ts`](../../apps/fumufumu-backend/src/routes/admin-content-check.controller.ts)
- 既存 Service: [`apps/fumufumu-backend/src/services/consultation-content-check.service.ts`](../../apps/fumufumu-backend/src/services/consultation-content-check.service.ts)
