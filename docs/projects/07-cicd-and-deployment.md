# 07. CICD と本番デプロイ基盤の構築

このドキュメントは、ADR 008（フロントエンド配備先の再選定とフロント/バック分離CI/CD方針）で決定した方針を、実装計画として落とし込んだものです。  
ADR 008 が「決定の根拠」を固定するのに対し、本ドキュメントは「進めながら更新する作業計画」を扱います。

---

## 1. 目的と前提

### 1.1 目的

- frontend を Cloudflare Workers へ移行し、本番運用できる状態にする
- D1 migration / backend deploy / frontend deploy を独立したレーンとして扱える状態にする
- 無料枠優先のフェーズでは、`main` への merge を即本番反映にせず、手動 deploy で運用する

### 1.2 ADR 008 から引き継ぐ前提

- frontend は Cloudflare Workers + `@opennextjs/cloudflare` で配備する
- 本番適用は 3 レーン分離（D1 migration / backend / frontend）
- D1 migration は backend deploy に内包しない
- production deploy の自動化（`main` push → 本番反映）は Phase 2 として後回し
- preview deploy は Phase 2 で Cloudflare 側に実装する（Vercel preview は使わない）
- 初期 URL は `workers.dev` 前提、custom domain は公開前に追加する

---

## 2. 完了済みステップ

### 2.1 ADR 008 の旧ロードマップ由来（リポジトリ初期段階）

| 内容 | 状態 | 根拠 |
| --- | --- | --- |
| frontend PR チェックを webpack 本線 + Turbopack 監視レーンに整理 | 完了 | `.github/workflows/fe-code-check.yml` |
| backend の CORS / Auth URL / Cookie を環境変数ベースに整理 | 完了（Phase 1a Step 1 で `VERCEL_TEAM_SLUG` 残骸を削除） | `apps/fumufumu-backend/src/index.ts`, `src/auth.ts` |
| D1 migration の手元 CLI 実行導線と production runbook | 完了 | `apps/fumufumu-backend/package.json`, `apps/fumufumu-backend/README.md` |

### 2.2 本計画書 Phase 1a の進捗

| Step | 内容 | 状態 |
| --- | --- | --- |
| Step 1 | backend Vercel 残骸削除 | ✅ 完了（PR #119）|
| Step 2a | Next.js 16.0.7 → 16.2.6 アップグレード（@opennextjs/cloudflare の peer dep 対応） | ✅ 完了（PR #120）|
| Step 2b | Cloudflare 向け OpenNext build 基盤 + proxy.ts 撤去 + (main)/layout.tsx の認証 guard 移植 | ✅ 完了（PR #121）|
| Step 3 | frontend をローカル CLI で workers.dev に手動 deploy | ✅ 完了 |
| Step 4 | production 環境値の確定 | ✅ 実質達成（Step 3 内で確定、runbook 整理は本 PR）|

### 2.3 動作確認の残課題

- signup / login の機能動作確認は backend が **Workers Free の 10ms CPU 制限** を超えるため未達 → Phase 1.5 で扱う（#123）
- LP / login ページ表示・未認証時の `/login` redirect は確認済み
- CORS / Cookie 認証の preflight は確認済み

### 2.4 進める過程で判明した周辺問題

- `/signup` ページの React Hydration mismatch エラー → Next.js 16.0.7 → 16.2.6 アップグレードで解消（#118 で追跡、close 可能）
- SSR 経由の 401 リダイレクト時の `returnTo` 復元 → proxy.ts 撤去で機能喪失、別 issue で取り戻す（#122）
- backend の機密情報が Cloudflare ダッシュボードに plaintext vars として保存されている → `wrangler secret put` への移行を別途検討（issue 未起票）

---

## 3. 進め方の組み替え

ADR 008 付録A は「workflow_dispatch ベースの手動 deploy」を Step 4〜8 に置いていた。  
本計画では、frontend の Cloudflare 移行（最大の不確実性）をローカル CLI 先行で潰すために、順序を以下に組み替える。

- Phase 1a: ローカル CLI から全レーン手動 deploy が通る状態を作る
- Phase 1b: 上記をそのまま GitHub Actions の workflow_dispatch ベースへ移植する
- Phase 2: smoke test / preview / custom domain / 自動 deploy

### 3.1 なぜローカル CLI 先行か

- backend と D1 migration はすでに手元 CLI で実行できる状態なので、追加コストは frontend 側だけで済む
- frontend の Cloudflare 移行を workflow 化する前にローカルで通すと、`workflow の問題` と `deploy 自体の問題` を切り分けやすくなる
- 認証 / CORS / Cookie が production 条件で動くことを、workflow を介さずに観測できる

---

## 4. 実装ステップ

### Phase 1a — ローカル CLI 手動 deploy

#### Step 1. backend の Vercel 残骸を削除する

主な変更対象:

- `apps/fumufumu-backend/src/index.ts`（`Env.VERCEL_TEAM_SLUG` 型と CORS 分岐）
- 必要なら `wrangler.local.jsonc.example` や `.dev.vars.example`

目的:

- backend を Cloudflare 配備前提のクリーンな状態にする
- ADR 008 Step 2 を完了扱いにできる状態にする

動作確認:

- 既存の backend テストが通ること
- `FRONTEND_URL` だけで CORS が意図通り動くこと

#### Step 2. frontend の Cloudflare 向け build 基盤を追加（ADR 008 旧 Step 7 相当）

主な変更対象:

- `apps/fumufumu-frontend/package.json`（`@opennextjs/cloudflare` 追加 / build script 追加）
- `apps/fumufumu-frontend/next.config.ts`
- `apps/fumufumu-frontend/wrangler.jsonc`（新規）
- 必要なら OpenNext 設定ファイル

目的:

- deploy 前に Cloudflare 向け build の成立だけを独立確認する
- OpenNext / Wrangler 由来の問題を、deploy 設定の問題と切り分ける

動作確認:

- ローカルで `next build` が通ること
- OpenNext の Cloudflare 向け build コマンドが通ること
- dry-run までで止めて、本番反映はしないこと

#### Step 3. frontend をローカル CLI で `workers.dev` に手動 deploy

主な変更対象:

- frontend の deploy 用 npm script（backend と対称な `DEPLOY_APPROVED=1` ガード付き）
- production 向けの仮 secret / var を手元設定で解決できる仕組み

目的:

- 「本番条件」の認証 / API 接続が動くことを手元で確認する
- workflow を書く前に、Cloudflare 配備自体を成立させる

動作確認:

- `workers.dev` URL で `/` と `/login` が表示できる
- 未ログインで保護ページへ行くと `/login` に遷移する
- ログイン後に backend API が動く

#### Step 4. production 環境値の確定（ADR 008 旧 Step 9 相当）

主な変更対象:

- backend の `FRONTEND_URL` / `BETTER_AUTH_URL` / `COOKIE_DOMAIN`
- frontend の `NEXT_PUBLIC_API_URL`
- 必要なら runbook 側の URL 例

目的:

- 当面は `workers.dev` 前提で production 値を確定する
- localhost と production の差分を最小化する

動作確認:

- production `workers.dev` URL で login / logout / protected route が通ること
- localhost と production の値を review できること

##### 達成状況

- backend / frontend の env vars（Cloudflare ダッシュボードの vars と frontend の `.env.production.local`）は Step 3 内で確定済み
- runbook（`apps/fumufumu-backend/README.md`）の URL 例を整理（本 PR）
- login / logout / protected route の機能動作確認は Phase 1.5 待ち（#123）

---

### Phase 1.5 — 認証関連の workers.dev 制約解決（緊急対応）

Phase 1a Step 3 の動作確認で、`workers.dev` 上に 2 つの認証関連の技術的制約が判明した：

1. Better Auth の password hashing が Workers Free の **10ms CPU 制限を超える**（signup / login が 503）
2. `workers.dev` サブドメイン間で **Cookie が共有できない**（`*.workers.dev` が Public Suffix List 登録のため）→ SSR 認証 guard が機能しない

Phase 1b の workflow 化に進む前に、この 2 つを解決して「機能的に動くアプリ」の状態を作る。

#### Step 4.5. backend 認証の CPU 時間制限を解消する ✅

Better Auth の `hash` option を Web Crypto API の PBKDF2 ベースに差し替え、Workers Free の 10ms CPU 制限内で signup / login が動作するようにした。

- 完了 PR: Phase 1.5 / Step 4.5 (#123 解決)
- iterations は 50,000（OWASP 推奨 600k には届かない妥協。Standard plan upgrade 時に引き上げる前提）
- 詳細: `apps/fumufumu-backend/src/lib/password-pbkdf2.ts`

#### Step 4.6. workers.dev の Cookie cross-domain 制約を解消する

`*.workers.dev` が Public Suffix List に登録されているため、`Domain=fumufumu.workers.dev` のような親ドメイン Cookie 共有は技術的に不可能。  
custom domain 移行（Step 10）が根本解決だが、ドメイン代を抑えつつ Phase 1b に進む状態を作るため、**Cloudflare Service Binding で同一 origin 化** する中間解を採用する。

主な変更対象:

- `apps/fumufumu-frontend/worker.ts`（新規 custom worker、`/api/*` を Service Binding 経由で backend に転送）
- `apps/fumufumu-frontend/wrangler.jsonc` / `wrangler.local.jsonc.example`（`main` を custom worker に変更、`services` 追加）
- `apps/fumufumu-frontend/.env.production.local.example`（`NEXT_PUBLIC_API_URL` を空文字に → 相対パスで同一 origin fetch）

目的:

- production の `workers.dev` 環境で signup / login / 保護ページが完全動作する
- ドメイン代を払わず Phase 1b に進める状態を作る
- ADR 008 Section 4.2 で「将来 Service Bindings や router Worker を使った構成に発展させやすい」と言及した発展形を前倒し採用

動作確認:

- production `workers.dev` URL で signup / login / 保護ページ access が成功する
- DevTools の Network タブで `/api/*` が **frontend と同じ origin** に飛んでいる（CORS preflight も不要）
- Cookie が frontend ドメインに保存されていて、SSR 認証 guard が機能する

custom domain 移行（Step 10）時の扱い:

- Service Binding の構造はそのまま残せる（`app.fumufumu.com` 配下で同 origin 提供する形に自然に発展可能）
- もしくは Service Binding を解除して `Domain=.fumufumu.com` の Cookie 共有に切り替える選択肢もある（custom domain なら PSL 制約を受けない）

参考:

- 関連 Issue: #123（CPU 制限、Step 4.5 で解決）/ #126（Cookie cross-domain、Step 4.6 で解決）
- ADR 008 Section 0 の最終決定（Service Binding 採用を明記）
- ADR 008 Section 4.2（発展形としての Service Bindings 言及）
- Cloudflare Service Bindings ドキュメント: https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/
- OpenNext Custom Worker パターン: https://opennext.js.org/cloudflare/howtos/custom-worker

---

### Phase 1b — GitHub Actions の workflow_dispatch 化

#### Step 5. D1 manual migration workflow を追加（ADR 008 旧 Step 4 相当）

主な変更対象:

- 新規 `.github/workflows/be-db-migrate-manual.yml`
- GitHub Environment（`backend-production`）と Variables / Secrets の参照

実行内容:

- `workflow_dispatch` で `wrangler d1 migrations list` → `wrangler d1 time-travel info` → `wrangler d1 migrations apply --remote` を順次実行
- 実行ログに対象 `database_name` を明示する

動作確認:

- `workflow_dispatch` で全ステップが通ること
- 失敗時に workflow が落ちること

#### Step 6. backend manual deploy workflow を追加（ADR 008 旧 Step 5 相当）

主な変更対象:

- 新規 `.github/workflows/be-deploy-manual.yml`
- GitHub Environment（`backend-production`）の参照

動作確認:

- `workflow_dispatch` で production deploy が通ること
- deploy 後に `/health` が 200 を返すこと

#### Step 7. frontend manual deploy workflow を追加（ADR 008 旧 Step 8 相当）

主な変更対象:

- 新規 `.github/workflows/fe-deploy-manual.yml`
- GitHub Environment（`frontend-production`）の参照

動作確認:

- `workflow_dispatch` で production deploy が通ること
- production URL で login / protected route / API 接続が壊れていないこと

---

### Phase 2 — 安定化と利便性追加

#### Step 8. smoke test と rollback runbook（ADR 008 旧 Step 11 相当）

- deploy 後の `/`, `/login`, 保護ページ redirect を smoke test として組み込む
- 失敗時の rollback 判断・手順を runbook に追加する

#### Step 9. Preview Deploy 導入（ADR 008 旧 Step 12 相当）

- Cloudflare 側で PR ごとに preview Worker を生成する
- Cookie / CORS / `BETTER_AUTH_URL` を preview URL でも壊さない設計を入れる
- cleanup を組み込む

#### Step 10. custom domain への cutover（ADR 008 旧 Step 13 相当）

- `workers.dev` から公開 URL（`app.example.com` / `api.example.com` 等）へ切り替え
- `BETTER_AUTH_URL` / `NEXT_PUBLIC_API_URL` / 必要なら `COOKIE_DOMAIN` を更新

#### Step 11. 自動 deploy 化の検討（ADR 008 旧 Step 10 相当）

- 運用が安定してから、`main` push → 本番反映の自動化を検討する
- preview deploy が回るようになっていれば、smoke + 自動化の段階に進める

---

## 5. 事前に決めること

ADR 008 A.2 を継承する。Phase 1a 着手前に確定させたい。

| 項目 | 推奨値 |
| --- | --- |
| 初期の本番 URL | `workers.dev` |
| 常設 staging | 作らない |
| GitHub Environments | `backend-production`, `frontend-production` の 2 つに分ける |
| Cloudflare API Token | frontend / backend で分けて発行する |
| D1 migration の production apply 条件 | 当面は `workflow_dispatch` |
| backend / frontend の production deploy 条件 | 当面は `workflow_dispatch` |

---

## 6. 手動セットアップ項目（commit しない作業）

ADR 008 A.3 を継承する。リポジトリ外作業のため commit には含めないが、Phase 1b 着手前までに揃える。

- GitHub Environments の作成
- GitHub Secrets / Variables の作成
- Cloudflare 側の production Worker の作成
- Cloudflare 側の secrets / vars の投入
- 必要なら DNS 設定（custom domain 追加時）

想定される主な値:

- GitHub Secrets
  - `CLOUDFLARE_ACCOUNT_ID`
  - `CLOUDFLARE_API_TOKEN_BACKEND`
  - `CLOUDFLARE_API_TOKEN_FRONTEND`
- backend 用 variables / secrets
  - `BETTER_AUTH_SECRET`
  - `BETTER_AUTH_URL`
  - `FRONTEND_URL`（カンマ区切り allowlist）
  - `COOKIE_DOMAIN`
  - `D1_DATABASE_NAME`
  - 必要なら `D1_DATABASE_ID`
- frontend 用 variables / secrets
  - `NEXT_PUBLIC_API_URL`
  - Cloudflare deploy 対象名

---

## 7. ADR 008 との関係

本計画は ADR 008 の決定（Cloudflare 採用 / 3 レーン分離 / 自動化後回し / preview は Phase 2）を変えるものではない。  
ADR 008 付録A で描かれていた「workflow_dispatch ベースの Step 順」を、ローカル CLI 先行に組み替えたうえで、進捗管理を本ファイルに寄せている。

- ADR 008: 方針の決定（変えない）
- 本ファイル: 計画と進捗（進めながら更新する）

進める過程で前提が変わった場合は、本ファイルを更新する。ADR 008 を改訂するのは、決定そのものを覆す判断が出たときに限る。
