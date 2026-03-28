## コマンド集
- curl http://127.0.0.1:8787/
- ローカルタグ一覧: `pnpm tags:list`
- ローカルタグ追加: `pnpm tags:add キャリア 人間関係 技術`
- 手動デプロイ: `WRANGLER_DEPLOY_CONFIG=wrangler.local.jsonc pnpm deploy`

## D1 migration runbook (production)

本番の D1 migration は backend deploy に内包せず、手動で独立実行する。
実行対象 DB は `--config` で指定したファイル内の D1 binding (`DB`) で決定する。
また、機微な識別子を `wrangler.jsonc` に置かない運用のため、migration 実行時は `--config` を使う。

### 事前準備

```bash
cd apps/fumufumu-backend
cp wrangler.local.jsonc.example wrangler.local.jsonc
# wrangler.local.jsonc に account_id / name / database_name / database_id を設定
```

必要に応じて設定ファイルを切り替える:

```bash
# デフォルト: wrangler.local.jsonc
export WRANGLER_D1_CONFIG=wrangler.local.jsonc

# 例: CI で生成した設定ファイルを使う場合
export WRANGLER_D1_CONFIG=wrangler.ci.jsonc
```

deploy 実行時は deploy 用 config を明示する:

```bash
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

- `WRANGLER_D1_CONFIG` が未設定の場合、`wrangler.local.jsonc` を参照する。
- deploy の対象 Worker は `WRANGLER_DEPLOY_CONFIG` で指定した設定ファイル内の `name` で決定する。
- `WRANGLER_DEPLOY_CONFIG` が未設定の場合、`pnpm deploy` は `wrangler.local.jsonc` を参照する。
- ローカル適用は `pnpm local:migration` を使う。
- 将来、同一 config のまま複数 DB を切り替えて実行する要件が出た場合は、`D1_DATABASE_NAME` のような env 引数方式へ戻す。
