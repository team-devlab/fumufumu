# Email Notification CLI 実装手順（MVP）

## 0. 目的

- まずコマンド実行方式（D案）で通知の送信・回復導線を成立させる
- 後続で承認APIに組み込めるよう、送信ロジックは共通化して実装する

---

## 1. 実装スコープ（今回）

1. `send-pending` コマンドの実装
2. `resend` コマンドの実装
3. 送信基盤（Repository / Service / MailClient）の共通化
4. 送信状態のDB管理（`notified_at`, `notify_last_error`）
5. 通知対象は `approved` のみ（`rejected` は対象外）

---

## 1.5 進捗チェック（2026-04-17時点）

- [x] Step 1. 送信状態管理カラム追加（`notified_at`, `notify_last_error`）
- [ ] Step 2. Repository追加・拡張
  - [x] 未通知対象のlimit取得（`listPendingApprovedForNotification`）
  - [x] 再送対象の単件取得（`target_type` + `target_id`）
  - [ ] 送信成功時更新（`notified_at` 更新 + `notify_last_error` クリア）
  - [ ] 送信失敗時更新（`notify_last_error` 更新）
- [ ] Step 3. MailClient実装
- [ ] Step 4. NotificationService実装
- [ ] Step 5. CLIエントリ実装
- [ ] Step 6. package.jsonスクリプト登録
- [ ] Step 7. 実行結果・運用ルール整備

---

## 2. 実装ステップ

### Step 1. 送信状態管理カラムを追加する

- `content_checks` に以下を追加する
  - `notified_at`（送信成功時刻）
  - `notify_last_error`（直近送信失敗理由）
- 未通知判定は以下を基準にする
  - `status = 'approved' AND notified_at IS NULL`

完了条件:
- migration適用後、上記カラムが参照・更新できる

### Step 2. Repositoryを追加・拡張する

必要メソッド:
1. 未通知対象をlimit付きで取得する
2. 再送対象を `target_type` + `target_id` で取得する
  - 取得時に `status = 'approved'` を必須条件にする
3. 送信成功時に `notified_at` を更新し、`notify_last_error` をクリアする
4. 送信失敗時に `notify_last_error` を更新する

完了条件:
- DB操作がCLIから直接書かれず、Repository経由で統一されている

### Step 3. MailClientを実装する

必要実装:
1. `MailClient` インターフェース定義
2. `ResendMailClient` 実装
3. エラーを実行可能なメッセージへ変換（ログ/保存用）

完了条件:
- CLIは `Resend` の具体API仕様を知らずに送信できる

### Step 4. NotificationServiceを実装する

責務:
1. 送信対象の組み立て
2. メール送信呼び出し
3. 成功/失敗の記録

公開メソッド例:
1. `sendPending(limit: number)`
2. `resend(targetType: "consultation" | "advice", targetId: number)`

完了条件:
- コマンド側はService呼び出しのみで処理できる

### Step 5. CLIエントリを実装する

作成ファイル:
- `scripts/notifications.ts`

引数解釈:
- `process.argv.slice(2)` を使用する
- 例:
  - `const [command, ...args] = process.argv.slice(2)`

コマンド分岐:
1. `send-pending`
2. `resend`

完了条件:
- 不正引数時はUsage表示 + `exit 1`
- 正常終了時は `exit 0`

### Step 6. package.jsonにスクリプトを登録する

登録内容:
1. `"notifications:send-pending": "tsx scripts/notifications.ts send-pending"`
2. `"notifications:resend": "tsx scripts/notifications.ts resend"`

実行例:
1. `pnpm notifications:send-pending -- --limit 100`
2. `pnpm notifications:resend -- --target-type consultation --target-id 123`
3. `pnpm notifications:resend -- --target-type advice --target-id 456`

補足:
- `--limit 100` は1回の実行で処理する最大件数

### Step 7. 実行結果と運用ルールを揃える

必要項目:
1. サマリ出力（成功件数/失敗件数）
2. 終了コード（成功=0、失敗を含む=1）
3. 多重実行の簡易ガード（重複起動抑止）

完了条件:
- 運用者が結果だけで次アクション（再送要否）を判断できる
- `pending` / `rejected` が送信対象に含まれない

---

## 3. 責務分担

1. CLI (`scripts/notifications.ts`)
- 引数解釈
- 実行開始
- 終了コード返却

2. Service
- 業務ロジック（対象判定、送信、結果記録）

3. Repository
- DBアクセス

4. MailClient
- Resend API呼び出し

---

## 4. 後続フェーズ（承認API統合）

CLI実装後に以下を実施する。

1. decision APIの判定更新後に通知Serviceを呼ぶ
2. `ctx.waitUntil(...)` で非同期化する
3. `fail-open` を維持する（通知失敗でAPI失敗にしない）
4. CLIで作った共通基盤（Service / Repository / MailClient）を再利用する
