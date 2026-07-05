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
- アドバイス編集（B。本PRは entry のみ）: `apps/fumufumu-frontend/src/app/(main)/consultations/[id]/advice/` 配下。編集ストアは同じ seeded persist 機構で後続導入する。
