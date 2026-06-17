## 現在の production 環境

- Worker URL: `https://fumufumu-frontend.fumufumu.workers.dev`
- backend (`fumufumu-worker`) を **Service Binding 経由** で同一 origin として扱う構成（ADR 008 §4.6 / PR #128）。`worker.ts` の custom worker が `/api/*` を `env.BACKEND.fetch(...)` に振り分け、それ以外を OpenNext (Next.js) でレンダリングする。
- Cloudflare account / Worker 名 / Service Binding (`services` セクション) 等は git ignored の `wrangler.local.jsonc` で管理（リポジトリには `wrangler.local.jsonc.example` のみ）。
- Cloudflare plan: Free。

本書中の `<frontend-production-url>` プレースホルダーは上記 URL を指す（custom domain 移行時に置き換える）。

## コマンド集

- ローカル開発起動: `pnpm dev`
- lint: `pnpm lint`（biome）
- format: `pnpm format`（biome、書き込みあり）
- ユニットテスト: `pnpm test` / `pnpm test:watch`
- Next.js ビルド: `pnpm build`
- Cloudflare 用ビルド (OpenNext 経由): `pnpm build:cf`
- 手動デプロイ: `DEPLOY_APPROVED=1 pnpm deploy:cf`

`pnpm deploy:cf` は内部で `build:cf` → `wrangler deploy` を順に実行する。`DEPLOY_APPROVED=1` を実行時に明示しない場合は誤実行防止 guard で中断する。

## デプロイ runbook (production)

frontend の本番 deploy は GitHub Actions に内包せず、手動で独立実行する（ADR 008 / 計画書 07）。実行対象 Worker は `--config` で指定した設定ファイル内の `name` で決定する。

### 事前準備

```bash
cd apps/fumufumu-frontend
cp wrangler.local.jsonc.example wrangler.local.jsonc
# wrangler.local.jsonc に account_id / name / services (Service Binding) を設定
cp .env.production.local.example .env.production.local
# .env.production.local の NEXT_PUBLIC_API_URL を frontend Worker の絶対 URL に設定
```

`.env.production.local` の用途と命名理由は当該テンプレートのコメントを参照（Next.js の env loading 順の都合で `.local` 系を使う）。`NEXT_PUBLIC_*` は build 時に client side bundle へ inline されるため、Cloudflare 側の `vars` / secrets ではなくここで解決する。

必要に応じて設定ファイルを切り替える:

```bash
# デフォルト: wrangler.local.jsonc
export WRANGLER_DEPLOY_CONFIG=wrangler.local.jsonc

# 例: CI で生成した設定ファイルを使う場合
export WRANGLER_DEPLOY_CONFIG=wrangler.ci.jsonc
```

### 実行

```bash
DEPLOY_APPROVED=1 pnpm deploy:cf
```

成功時の主な確認ポイント:

- `Worker saved in .open-next/worker.js` が出ていること（OpenNext bundle が生成済み）
- `Uploaded fumufumu-frontend (...)` が出ていること（wrangler の upload 完了）
- `Deployed fumufumu-frontend triggers (...)` が出ていること
- 末尾に `https://<frontend-production-url>` と `Current Version ID: ...` が表示されること
- `env.BACKEND (fumufumu-worker)` が Bindings に列挙されていること（Service Binding 維持）

### 適用後確認（例）

```bash
# 未認証 = LP / 公開ページが 200 で返る
curl -fS -I https://<frontend-production-url>/

# SSR 経由の API proxy 動作（バックエンドが reachable か）
curl -fS -I https://<frontend-production-url>/api/health || true
```

ログイン後の SSR 経路の動作確認はブラウザで `/consultations` 等を開いて行う（Cookie が必要なため）。

## 環境変数

### local development (`.env.local`)

`.env.local.example` をコピーして使う:

- `NEXT_PUBLIC_API_URL`: local backend の URL（既定 `http://localhost:8787`）
- `USE_MOCK_API`: モック API 切り替え用フラグ（既定 `false`）

### production build (`.env.production.local`)

`.env.production.local.example` をコピーして使う:

- `NEXT_PUBLIC_API_URL`: **frontend Worker 自身の絶対 URL**（Service Binding 経由で同一 origin になるため）

「同一 origin なら相対パスでよいのでは」と思いがちだが、SSR (Cloudflare Workers) は相対パスの fetch を受け付けず Worker が crash する。client side では同一 origin なので CORS は発生しない。詳細は `worker.ts` / `lib/api/client.ts` のコメントを参照。

### Cloudflare 側 vars / secrets

frontend Worker では現状 `vars` / `secrets` は使用していない（`NEXT_PUBLIC_*` は build 時 inline）。将来サーバー側の機密が必要になったら `wrangler secret put` で管理する。

## 補足

- pnpm 10 以降は `pnpm deploy` が pnpm 内蔵のモノレポ deploy コマンドと衝突するため、frontend では明示的に `pnpm deploy:cf` script 名にしている（衝突回避）。
- `WRANGLER_DEPLOY_CONFIG` が未設定の場合、`pnpm deploy:cf` は `wrangler.local.jsonc` を参照する。
- OpenNext のビルド成果物 (`.open-next/`) は git ignored。`pnpm build:cf` で都度生成される。
- `worker.ts` (custom worker) は OpenNext の generated worker をラップして `/api/*` を Service Binding に振り分けるためのもの。詳細は同ファイル冒頭のコメントを参照。

## 関連ドキュメント

- ADR: [`docs/design/adr/008-frontend-deployment-platform-and-split-cicd.md`](../../docs/design/adr/008-frontend-deployment-platform-and-split-cicd.md)
- 計画書: [`docs/projects/07-cicd-and-deployment.md`](../../docs/projects/07-cicd-and-deployment.md)
- backend 側 runbook: [`apps/fumufumu-backend/README.md`](../fumufumu-backend/README.md)
