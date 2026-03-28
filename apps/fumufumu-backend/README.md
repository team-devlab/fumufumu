## コマンド集
- curl http://127.0.0.1:8787/
- ローカルタグ一覧: `pnpm tags:list`
- ローカルタグ追加: `pnpm tags:add キャリア 人間関係 技術`
- 手動デプロイ: `WORKER_NAME=<production_worker_name> pnpm deploy`

## D1 migration runbook (production)

本番の D1 migration は backend deploy に内包せず、手動で独立実行する。
実行時は binding 名ではなく `database_name` を使うため、`D1_DATABASE_NAME` を必須にする。
また、機微な識別子を `wrangler.jsonc` に置かない運用のため、migration 実行時は `--config` を使う。

### 事前準備

```bash
cd apps/fumufumu-backend
cp wrangler.local.jsonc.example wrangler.local.jsonc
# wrangler.local.jsonc に worker name / account_id / database_name / database_id を設定
export D1_DATABASE_NAME=<production_database_name>
```

必要に応じて設定ファイルを切り替える:

```bash
# デフォルト: wrangler.local.jsonc
export WRANGLER_D1_CONFIG=wrangler.local.jsonc

# 例: CI で生成した設定ファイルを使う場合
export WRANGLER_D1_CONFIG=wrangler.ci.jsonc
```

deploy 実行時は `WORKER_NAME` と deploy 用 config も明示する:

```bash
export WORKER_NAME=<production_worker_name>
export WRANGLER_DEPLOY_CONFIG=wrangler.local.jsonc
```

### 実行順序

1. 未適用 migration の確認

```bash
pnpm d1:migrations:list:remote
```

2. Time Travel 情報の確認（復旧用 bookmark の記録）

```bash
pnpm d1:time-travel:info
```

3. migration 適用

```bash
pnpm d1:migrations:apply:remote
```

4. 適用後確認（例）

```bash
curl -fS https://<backend-production-url>/health
```

### 補足

- `D1_DATABASE_NAME` が未設定の場合、migration 系スクリプトは実行を中断する。
- `WRANGLER_D1_CONFIG` が未設定の場合、`wrangler.local.jsonc` を参照する。
- `WORKER_NAME` が未設定の場合、`pnpm deploy` は実行を中断する。
- `WRANGLER_DEPLOY_CONFIG` が未設定の場合、`pnpm deploy` は `wrangler.local.jsonc` を参照する。
- ローカル適用は `pnpm local:migration` を使う。
