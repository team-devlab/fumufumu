## コマンド集
- ローカル開発起動: `pnpm dev`
- Drizzle Studio 起動: `pnpm studio`
- curl http://127.0.0.1:8787/
- ローカルタグ一覧: `pnpm tags:list`
- ローカルタグ追加: `pnpm tags:add キャリア 人間関係 技術`
- 通知内部API（単体再送）: `POST /api/internal/notifications/resend`（Bearer認証）
- 手動デプロイ: `DEPLOY_APPROVED=1 WRANGLER_DEPLOY_CONFIG=wrangler.local.jsonc pnpm deploy`

`pnpm dev` はデフォルトで `wrangler.local.jsonc` を使う。
必要なら `WRANGLER_DEV_CONFIG` で dev 用 config を上書きできる。
`pnpm studio` も同じ優先順（`WRANGLER_DEV_CONFIG` → `WRANGLER_D1_CONFIG` → `wrangler.local.jsonc`）でローカルD1を解決する。

## Notification 内部API の環境変数

内部API (`POST /api/internal/notifications/resend`) は Worker 環境変数を使用する。

必須:
- `NOTIFICATION_INTERNAL_TOKEN`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

任意:
- `APP_BASE_URL`
- `RESEND_ENDPOINT`
- `RESEND_TIMEOUT_MS`

呼び出し例:

```bash
curl -X POST "https://<backend>/api/internal/notifications/resend" \
  -H "Authorization: Bearer ${NOTIFICATION_INTERNAL_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"targetType":"consultation","targetId":123}'
```

## Notification 内部API の Secrets 運用

### GitHub Actions / 本番実行環境
- 以下を Secrets に登録する
  - `RESEND_API_KEY`
  - `RESEND_FROM_EMAIL`
- 必要に応じて Variables または Secrets に登録する
  - `APP_BASE_URL`
  - `RESEND_ENDPOINT`
  - `RESEND_TIMEOUT_MS`

注意:
- APIキー文字列をリポジトリに直接書かない
- コマンド実行時は環境変数経由で注入する

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

deploy 実行時は deploy 用 config を明示し、`DEPLOY_APPROVED=1` は実行時のみ付与する:

```bash
export WRANGLER_DEPLOY_CONFIG=wrangler.local.jsonc
DEPLOY_APPROVED=1 pnpm deploy
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

障害時の復旧コマンド雛形（Step 2 の bookmark を利用）:

- 実行前チェック: 現状は書き込み停止機能が未実装のため、アクセスが少ない時間帯で実施する
- 実行前チェック: 影響範囲を共有し、復旧後の確認は気づいたチームメンバーが実施する

```bash
pnpm exec wrangler d1 time-travel restore DB --bookmark=<bookmark_from_step_2> --config "${WRANGLER_D1_CONFIG:-wrangler.local.jsonc}"
```

復旧後は Step 4 → Step 6 を再実行して状態確認する。

3. migration 適用

```bash
pnpm d1:migrations:apply:remote
```

4. 再確認（未適用 migration が 0 件であることを確認）

```bash
pnpm d1:migrations:list:remote
```

5. DB read/write スモーク確認（例）

前提: 恒常運用する専用 smoke ユーザーで実行し、Write で作成するデータには `[smoke]` プレフィックスを付ける（`<smoke_user_id>` を控えておく）。

```bash
COOKIE_FILE="$(mktemp)"
chmod 600 "$COOKIE_FILE"
trap 'rm -f "$COOKIE_FILE"' EXIT
SMOKE_USER_EMAIL="<smoke_user_email>"
read -rsp "Smoke user password: " SMOKE_USER_PASSWORD
echo

# 認証（Cookie取得）
printf '{"email":"%s","password":"%s"}' "$SMOKE_USER_EMAIL" "$SMOKE_USER_PASSWORD" \
  | curl -fS -c "$COOKIE_FILE" \
    -H 'content-type: application/json' \
    --data @- \
    https://<backend-production-url>/api/auth/signin
unset SMOKE_USER_PASSWORD

# Read: ユーザー情報取得
curl -fS -b "$COOKIE_FILE" \
  https://<backend-production-url>/api/users/me

# Write: 下書き相談作成
curl -fS -X POST -b "$COOKIE_FILE" \
  -H 'content-type: application/json' \
  -d '{"title":"[smoke] migration check","body":"this is migration smoke check body","draft":true}' \
  https://<backend-production-url>/api/consultations
```

6. 適用後確認（例）

```bash
curl -fS https://<backend-production-url>/health
```

### 補足

- `WRANGLER_D1_CONFIG` が未設定の場合、`wrangler.local.jsonc` を参照する。
- deploy の対象 Worker は `WRANGLER_DEPLOY_CONFIG` で指定した設定ファイル内の `name` で決定する。
- `DEPLOY_APPROVED=1` を実行時に明示しない場合、`pnpm deploy` は実行を中断する（誤実行防止）。
- `WRANGLER_DEPLOY_CONFIG` が未設定の場合、`pnpm deploy` は `wrangler.local.jsonc` を参照する。
- ローカル適用は `pnpm local:migration` を使う。
- smoke確認は専用ユーザーで実行し、`[smoke]` プレフィックスのデータを運用側で定期クリーンアップする。
- smokeデータの削除例: `pnpm exec wrangler d1 execute DB --remote --command "DELETE FROM consultations WHERE author_id = <smoke_user_id> AND title LIKE '[smoke]%';" --config "${WRANGLER_D1_CONFIG:-wrangler.local.jsonc}"`
- 将来、同一 config のまま複数 DB を切り替えて実行する要件が出た場合は、`D1_DATABASE_NAME` のような env 引数方式へ戻す。
