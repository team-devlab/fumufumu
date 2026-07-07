# ADR 012: 下書き再開（相談の編集・公開／アドバイスの編集）フローの状態保持方式

## ステータス

承認済み (Accepted) — 2026-07-05

## コンテキスト

Issue #166 で、プロフィールの下書き一覧から下書きを「再開（編集・公開）」する導線を追加する。対象は次の通り。

- **A: 相談の下書きの編集・公開**（本PRで完成）
- **B: アドバイスの下書きの編集**（下書きを保持したまま更新。本PRでは編集のみ）
- **C: アドバイスの下書き→公開**（backend 追補が必要。後続PR）

作成フローは ADR 001&002 で「2ページ（entry → confirm）+ Zustand」を採用済み。編集フローについても、**画面構成**と**フォーム状態の保持方式**を、作成との一貫性・保守性、リロード時の安全性、CLAUDE.md（`useEffect` 既定禁止）を踏まえて決める必要がある。

なお ADR 002 の「実装詳細方針 #3」は既に「編集機能は同じ確認画面フローを共有し、Store に初期値注入アクション（`setInitialData`）を実装する」ことを想定していた。本 ADR はこれを具体化し、一部を更新する。

また、データ保持方式には設計記録と実装の間に食い違いがある。ADR 001 は in-memory と決定していたが、実装ではその後 sessionStorage persist が採用された（コミット `05182c1`「相談投稿フォームの入力内容をリロード時に保持するよう修正」, 2026-02-07）。この変更は「リロード時の入力保持」を目的としたものだが ADR には反映されず、記録（in-memory）と実態（persist）が食い違ったままになっていた。本 ADR でこの実態を整理し、persist を正式な決定として追認する。

## 検討された選択肢

### 1. 画面構成

- **A案: 単一ページ + ページ内 confirm ステップ**（`/consultations/[id]/edit` のみ、step を state で切替）
- **B案: 2ページ**（`/consultations/[id]/edit` → `/consultations/[id]/edit/confirm`）※作成と同一

### 2. フォーム状態の保持方式

- **案1: 作成ストアを mode 化して再利用**（ADR 002#3 の当初案。`setInitialData` を追加し作成/編集で共有）
- **案2: 編集専用ストアを新設**（作成とは別の sessionStorage キー）
- **案3: local state（`useState`）+ `usePreventUnload`**（ストアを使わずページローカルで保持）

### 3. 永続化方式（ADR 001 との drift 整理）

- **in-memory**（ADR 001 の決定。Web Storage は却下されていた）
- **sessionStorage persist**（作成ストアの実装の現状。コミット `05182c1`（2026-02-07）で導入され、ADR 001 の記録と食い違っている）

## 決定事項

1. **画面構成は 2ページ（entry → confirm）を踏襲**（作成と同一）。最終形では公開＝確認ステップを持つため。
2. **フォーム状態は編集専用ストアを新設**（作成ストアと別キー）。→ ADR 002#3 の「共有ストア + `setInitialData`」を更新。
3. **永続化は sessionStorage persist を採用（追認）**。→ ADR 001 の「in-memory」決定を更新。
4. **サーバ取得の下書きの seed は rehydration 完了後に一度だけ**行う（`_hasHydrated` フラグ + `editingId` ガード）。`useEffect` を使わず render 時のガードで実施（ADR 003 の action-driven / no-useEffect を踏襲）。事故的な離脱・リロードは `usePreventUnload` で警告する。
5. **認可は server-side**。本人の下書きのみ取得・編集可能とし、本人以外・非下書きは 404（fail-closed）。
6. **最終形と本PRの範囲**: A は 2ページで完成（下書き保存＋公開）。B は最終形も 2ページ（公開=C）だが、本PRでは **entry のみ**実装（`updateDraftAdvice` で下書き更新）。confirm/公開ページは C で**無改造で差し込める**よう、B も同じ「seeded persist ストア」機構を採用する。
7. **タグ（ADR 006 関連）**: 編集画面で既存タグを復元するため、相談詳細レスポンスに `tags` を additive 追加する（backend。本PRで実施）。

## 決定の根拠

- **一貫性・保守性**: 「相談作成 / 相談編集 / アドバイス作成 / アドバイス編集」の四つを同一メンタルモデル（2ページ + persist ストア）に収束させる。編集固有の差分は「サーバ値の seed」のみに限定する。
- **リロード耐性**: persist により未保存編集を保持し、`usePreventUnload` で事故的離脱を警告する。下書き本体は常にサーバに保存済みで、失われるのは未保存差分のみ。
- **別ストアにする理由**: sessionStorage persist を前提に作成ストアを共有すると、作成中の下書きと編集中の内容が同一キーで混線する。別キーで分離して防ぐ（ADR 002#3 を更新する根拠）。
- **persist 追認の理由**: 実装は既にリロード保持のため sessionStorage persist を採用済み（コミット `05182c1`, 2026-02-07。ADR 001 の in-memory 決定とは未文書化のまま食い違っていた）。編集フローでもリロード耐性を要件とし、かつ作成と実装を揃えるため、in-memory に戻すのではなく persist を正式な決定として追認する。
- **no-useEffect**: CLAUDE.md および ADR 003 に従う。マウント時 `useEffect` リセットの副作用（Hydration / Strict Mode 二重実行）を避け、seed は `_hasHydrated` + `editingId` ガードで render 時に一度だけ行う。
- **最終形からの逆算**: 公開 (C) を見据え、B も 2ページ機構で設計する（本PRは entry のみ実装）。

## 結果 (Consequences)

### メリット

- 作成フローと統一された導線・表示部品（`ConsultationForm` / `ConsultationConfirm` 等）を再利用できる。
- リロード・戻る操作でも未保存編集を保持し、事故的消失を警告できる。
- 作成⇄編集の状態混線が起きない（別キー）。
- C（アドバイス公開）を無改造で追加できる構造になる。

### デメリット / リスク

- 編集ストアは作成にない追加ロジック（server seed + `_hasHydrated`）を持つ。→ seed の競合回避ロジックは共有ヘルパに集約し、相談・アドバイス編集での重複を抑える。
- ストアが増える（作成 / 編集 × 相談 / アドバイス）。
- sessionStorage persist の rehydration により初回に一瞬フォームが空になり得る。→ `_hasHydrated` ゲートで seed 完了までフォーム描画を遅延して回避する。

## 既存 ADR との関係

- **ADR 001（データ保持 = in-memory）を更新**: 実装はコミット `05182c1`（2026-02-07, リロード時の入力保持が目的）で既に sessionStorage persist へ移行済み。本 ADR でこれを追認する。
- **ADR 002 #3（共有ストア + `setInitialData`）を更新**: 編集は専用ストア新設に変更する（混線回避）。ただし「同じ確認画面フローを共有する」意図（2ページ構成・表示部品の再利用）は踏襲する。
- **ADR 003（action-driven reset / no-useEffect）を踏襲**する。
- **ADR 006（タグ設計）**: 編集での既存タグ復元のため、相談詳細レスポンスに `tags` を additive 追加する。

## スコープと実装配置

- ルート定数: `apps/fumufumu-frontend/src/config/routes.ts`（`EDIT` / `EDIT_CONFIRM`）
- 相談編集ストア: `apps/fumufumu-frontend/src/features/consultation/stores/useConsultationEditFormStore.ts`
- seed 共有ヘルパ: `apps/fumufumu-frontend/src/features/consultation/hooks/`（編集ページ実装時に導入）
- 相談編集ページ: `apps/fumufumu-frontend/src/app/(main)/consultations/[id]/edit/`（`page.tsx` と `confirm/page.tsx`）
- アドバイス編集（B。本PRは entry のみ）: `apps/fumufumu-frontend/src/app/(main)/advices/[id]/edit/`（`[id]` は adviceId）。編集ストアは相談編集と同じ seeded persist 機構を踏襲する。

## 追補 (2026-07-05): アドバイス下書き更新のキーは consultationId ではなく adviceId

B の実装中、当初は「相談1件につき本人の下書きは1件」を前提に更新を `consultationId` で引き当てる設計（`PUT /api/consultations/:id/advice/draft`、`findFirstAdviceByConsultation(consultationId, authorId)`）だったが、実データで破綻することが判明した。

- `advices` に `(consultationId, authorId)` のユニーク制約は無く、`createAdvice` も重複を許すため、**同一ユーザーが同一相談に複数のアドバイス（公開・下書きの併存を含む）を持てる**。
- この状態では `consultationId+authorId` で下書きを一意に特定できず、公開済みを掴んで「公開されているため更新できません」で誤って弾いてしまう（手動スモークで 404 を確認）。

**決定**: 下書き更新は `adviceId` で一意に引き当てる。エンドポイントを `PUT /api/advices/:id/draft` に移し、フロントの編集ルート・下書きカードのリンクも adviceId 基準（`/advices/[id]/edit`）に統一する。フロントは下書き一覧(`GET /api/advices?draft=true`)から adviceId を既に保持しているため追加取得は不要。

**根拠**: 複数下書きが併存しても一意に編集でき、C（公開）も同じ adviceId キーで無改造に差し込める（最終形からの逆算）。「1相談1下書き」を不変条件として `createAdvice` 側で強制する案は create フロー変更・既存データ移行を伴うため本PRの範囲外とし、後続で検討する。

## 追補 (2026-07-07): アドバイス下書きの公開 (C)

C（アドバイス下書き→公開）を実装した。B の seeded persist ストア機構に確認/公開ページを無改造で差し込む方針（決定事項 #6）に従う。

**エンドポイント（additive / non-breaking）**: `PUT /api/advices/:id/publish` を新設する。既存の `PUT /api/advices/:id/draft`（下書き維持）は変更しない。公開を `/draft` の拡張ではなく別ルートに分離することで、各エンドポイントの前提（下書き維持 vs 公開昇格）を単純に保つ。本文（`{ body }`）を受け取り、確認画面で仕上げた（entry で未保存の）編集も公開へ反映する（相談公開 `PUT /api/consultations/:id` が全文を送るのと同型）。レスポンスは既存の `AdviceSavedResponse`（新 shape なし）。

**公開処理は atomic batch**: 本文更新・`draft:false` 化・審査待ち `content_check(target_type:'advice')` 作成・親相談 `updatedAt` 更新を単一 `db.batch`（atomic）で行う。`content_check` は `(target_type, target_id)` の一意制約に対し `onConflictDoUpdate` で冪等化する（相談公開 `update` の `queueContentCheck` と同型）。`createAdvice` 非下書き分岐の「別 insert + 補償削除」方式より失敗経路が少ないため、こちらを採用した。

**認可・fail-closed**: 引き当ては `adviceId + 本人 + draft=true` に厳密化し、read 後に公開へ変わっても公開済みを上書きしない。本人以外・存在しない・既に公開済みは 404。確認ルート（`/advices/[id]/edit/confirm`）にも entry と同じ本人下書き・親可視性のサーバ側ガードを敷き defense-in-depth とする。

**親相談の可視性ルール（未解決論点の決定）**: 公開は `createAdvice` と同じ `findVisibleConsultationOrThrow` で可視な親相談に限定する（`draft:false` かつ 非表示でない かつ approved/no-check）。親が非公開/非表示/未承認(pending)なら 404（fail-closed）。B の編集も親が `hidden`/`draft` なら 404 のままで整合させる。

- **別issueへ委譲**: 「親が非表示化した後、本人が自分の下書きに一切アクセスできない（編集も公開も 404、下書きカードのリンク先が 404）」という UX 課題は、公開可否とは別レイヤの問題として #175 で扱う。C の fail-closed は維持したまま、閲覧/編集の導線だけを後から緩める前提。

**確認画面のアクション**: A の相談確認画面に揃え、確認画面（2ページ目）からも「下書き保存」（`/draft`）と「公開」（`/publish`）の両方を行える。entry（編集）画面には「確認画面へ」導線を追加した（従来は「下書きを更新」のみ）。
