## コマンド集
- curl http://127.0.0.1:8787/
- ローカルタグ一覧: `pnpm tags:list`
- ローカルタグ追加: `pnpm tags:add キャリア 人間関係 技術`

## D1 migration runbook (production)

本番の D1 migration は backend deploy に内包せず、手動で独立実行する。
実行時は binding 名ではなく `database_name` を使うため、`D1_DATABASE_NAME` を必須にする。

### 事前準備

```bash
cd apps/fumufumu-backend
export D1_DATABASE_NAME=<production_database_name>
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
- ローカル適用は `pnpm local:migration` を使う。
