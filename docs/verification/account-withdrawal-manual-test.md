# 退会機能 リリース前の確認手順

**作成日**: 2026-07-27
**対象**: 退会（アカウント削除・PII 消去）機能
**関連**: ADR 013（退会機能の設計方針）、issue #180

---

## 📋 この手順書の位置づけ

退会の振り分け・認証・CSRF・件数・原子性は、すでに自動テスト33件が毎コミット検証している
（`apps/fumufumu-backend/src/test/user-withdrawal*.test.ts` 28件、
`apps/fumufumu-frontend/src/features/user/components/WithdrawalSection.test.tsx` 5件）。
**それらは本書では扱わない。** 手で繰り返しても自動テストより確実にならず、書いた手順が古くなって
嘘になるだけである。

本書は**自動テストでは確認できない3点**に絞る。リリース前に1回実施する。

| 確認 | 自動テストで確認できない理由 |
|---|---|
| 確認1: 本番の D1 で退会が完了し、行が残らない | 自動テストは miniflare のエミュレーション上で動いており、本番の Cloudflare D1 ではない。ADR §5.3 の「D1 では `db.batch` が1つの原子的トランザクションになる」という前提が本番で崩れると、業務データは消えたのに認証情報（メール・パスワード）が残る形の PII 残存になる |
| 確認2: ブラウザを通した退会が最後まで動く | フロントのテストは API をモックしている。本物の cookie と、ブラウザが付ける本物の Origin ヘッダで通るかは未確認 |
| 確認3: 匿名化された投稿が「退会済みユーザー」と表示される | 退会後の画面を実際に開いて見た確認がない |

### 重要: 確認1は必ず本番の D1 に対して行う

**`--local` を付けた wrangler は miniflare のローカル SQLite を見ているだけで、自動テストと
同じエミュレーション環境である。** ローカルで流しても確認1の目的（本番の D1 で原子性が
効くかを見る）はまったく満たせない。手順の練習にはなるが、確認したことにはならない。

**確認1の範囲**: 本番で意図的に失敗を起こすことは安全にできないため、確認できるのは
「成功時に全テーブルから行が消えること」までである。失敗時のロールバックは自動テスト
（「原子性: 途中で FK 制約に阻まれると全ロールバックし、部分削除が起きない」）に委ねる。

**remote D1 への操作は実施者本人が行う。** 以下のコマンドは提案である。

---

## 🚀 事前準備

### 設定ファイル

次の3つは未コミット（`.gitignore` 対象）なので、無ければ `.example` から作る。

| ファイル | 無いと起きること |
|---|---|
| `apps/fumufumu-backend/wrangler.local.jsonc` | `pnpm dev` が中断する。コミット済みの `wrangler.jsonc` はデータベース名がプレースホルダーのため使えない |
| `apps/fumufumu-backend/.dev.vars` | `FRONTEND_URL` が空になり、**退会 API が常に 403** になる |
| `apps/fumufumu-frontend/.env.local` | `NEXT_PUBLIC_API_URL` が既定値になる |

remote D1 を見るときは、本番用の設定ファイルを `WRANGLER_D1_CONFIG` で指す。

### 確認する環境

確認1は本番、確認2と確認3は本番の画面で行う。使い捨てのアカウントを作って退会させるため、
実データには触れない。

ローカルで予行する場合は次で起動する。ただし前述のとおり、確認1はローカルでは成立しない。

```bash
pnpm --dir apps/fumufumu-backend dev
```

```bash
pnpm --dir apps/fumufumu-frontend dev
```

**フロントエンドを開く URL は `FRONTEND_URL` と完全に一致させる。** ポートが違う場合も、
`localhost` と `127.0.0.1` の違いでも、Origin 検証で 403 になる。

### アカウントを2つ作る

退会する本人と、その相談にアドバイスを書く別の利用者が必要。自分が書いたアドバイスは
「ほかの人からのアドバイス」に数えないため、1人では確認3を作れない。

本番ではサインアップ画面（`/signup`）から作る。ローカルで予行する場合は次でもよい。

```bash
curl -s -c /tmp/wd-target.txt -X POST http://127.0.0.1:8787/api/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"name":"退会確認用","email":"wd-target@example.com","password":"password123456"}'
```

```bash
curl -s -c /tmp/wd-other.txt -X POST http://127.0.0.1:8787/api/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"name":"アドバイス役","email":"wd-other@example.com","password":"password123456"}'
```

| 役割 | メールアドレス | app_user_id | auth_user_id |
|---|---|---|---|
| 退会する本人 | wd-target@example.com | | |
| アドバイス役 | wd-other@example.com | | |

**本番では画面から作るため id が返らない。** 確認1で使うので、退会する前に引いておく。

```bash
pnpm exec wrangler d1 execute DB --remote --config "$WRANGLER_D1_CONFIG" --command "SELECT au.id AS auth_user_id, am.app_user_id FROM auth_users au JOIN auth_mappings am ON am.auth_user_id = au.id WHERE au.email = 'wd-target@example.com';"
```

### 相談とアドバイスを1組作る

**この順序で行う。** アドバイスは投稿チェックで**公開になった**相談にしか付けられず、
投稿チェック中でも公開見送りでも 404 になる。

1. タグの id を確認する。**公開する相談はタグが1個以上必須**で、0個だと 400
   （エラー文は汎用の「入力内容に誤りがあります」なので原因が分かりにくい）。

```bash
curl -s -b /tmp/wd-target.txt http://127.0.0.1:8787/api/tags | jq
```

0件なら追加する。`tags:add` は `.sqlite` を直接開く実装なので、**追加後に必ず
`GET /api/tags` で見えているか確かめる**（別のファイルに入ることがある）。

```bash
pnpm --dir apps/fumufumu-backend tags:add キャリア
```

2. 本人で公開の相談を作る（本文は10文字以上）。`tagIds` には手順1で見た id を入れる。

```bash
curl -s -b /tmp/wd-target.txt -X POST http://127.0.0.1:8787/api/consultations \
  -H 'Content-Type: application/json' \
  -d '{"title":"退会確認用の相談","body":"退会したあとの表示を確認するための相談です。","draft":false,"tagIds":[<タグのid>]}' | jq
```

3. その相談の投稿チェックを終わらせて公開にする。管理画面（`/admin`）からでもよい。

```bash
pnpm exec wrangler d1 execute DB --local --config wrangler.local.jsonc --command "UPDATE content_checks SET status='approved', checked_at=(cast(unixepoch('subsecond')*1000 as integer)), updated_at=(cast(unixepoch('subsecond')*1000 as integer)) WHERE target_type='consultation' AND target_id=<相談のid>;"
```

4. **アドバイス役**でその相談にアドバイスを書く。

```bash
curl -s -b /tmp/wd-other.txt -X POST http://127.0.0.1:8787/api/consultations/<相談のid>/advice \
  -H 'Content-Type: application/json' \
  -d '{"body":"退会確認用のアドバイスです。","draft":false}' | jq
```

5. そのアドバイスも公開にする（`target_type='advice'`）。公開になっていないと
   「表示されているほかの人のアドバイス」に数えられず、相談が削除側に回ってしまう。

作った id を控える。

| 種別 | id |
|---|---|
| 相談（アドバイス付き。匿名化して残る） | |
| アドバイス（アドバイス役が書いた。無傷で残る） | |

---

## 📝 確認項目

### ✅ 確認1: 本番の D1 で退会が完了し、行が残らない

#### 1-1. 退会前の行数を控える

```bash
pnpm exec wrangler d1 execute DB --remote --config "$WRANGLER_D1_CONFIG" --command "SELECT (SELECT COUNT(*) FROM users WHERE id=<app_user_id>) AS users, (SELECT COUNT(*) FROM auth_mappings WHERE app_user_id=<app_user_id>) AS mappings, (SELECT COUNT(*) FROM auth_users WHERE id='<auth_user_id>') AS auth_users, (SELECT COUNT(*) FROM auth_sessions WHERE user_id='<auth_user_id>') AS sessions, (SELECT COUNT(*) FROM auth_accounts WHERE user_id='<auth_user_id>') AS accounts;"
```

Cloudflare のダッシュボードの D1 コンソールから同じ SQL を流してもよい。

**期待結果:** すべて 1 以上

#### 1-2. 退会後に同じクエリを実行する

退会は確認2で画面から行う。実施後にもう一度上のクエリを流す。

**期待結果:** すべて `0`

**確認ポイント:**

- **一部だけ 0 で、一部が残っていたら重大**。`db.batch` の原子性が本番で効いていない。
  その場合はリリースを止めて調査する
- `--local` で流した場合、この確認は未達（自動テストと同じ環境を見ているだけ）
- `auth_verifications` は確認しない。現状この経路で行が作られず、何を見ても0件になるため
  （削除条件が実際には一致していない問題は issue #192）

---

### ✅ 確認2: ブラウザを通した退会が最後まで動く

ブラウザで `wd-target@example.com` にログインし、次を順に行う。

1. プロフィール画面（`/user`）に「退会する」があること
2. **別のタブで相談一覧（`/consultations`）を開いたままにしておく**（退会後に使う）
3. 「退会する」から `/user/withdrawal` に進み、削除件数と残る件数が表示されること
4. 「退会手続きへ進む」で確認画面が出て、メールアドレスの入力を求められること
5. メールアドレスを入力して「退会する」を押す

**期待結果:**

- 「退会が完了しました」のトーストが出る
- `/login?reason=withdrawn` に遷移し、ログイン画面に完了のバナーが出る
- 2で開いたままにしたタブを操作すると、ログイン画面に戻る

**確認ポイント:**

- 403 が出たら、開いている URL が `FRONTEND_URL` と完全に一致しているか確認する
- 開発者ツールのネットワークタブで `DELETE /api/users/me` が 200 を返し、
  レスポンスに `Set-Cookie` が付いていること

---

### ✅ 確認3: 匿名化された投稿が「退会済みユーザー」と表示される

**アドバイス役（`wd-other@example.com`）でログインし直して**相談を開く。相談一覧・詳細は
認証が必要なので、ログアウト状態では確認できない。

- 一覧: `/consultations`
- 詳細: `/consultations/<相談のid>`

**期待結果:**

- 事前準備で控えた相談が一覧に残っている
- その相談の著者欄が **「退会済みユーザー」** と表示されている
- アドバイス役が書いたアドバイスが**無傷で残り、著者名も元のまま**表示されている
- 相談の本文が読める（本文は消さず著者名だけ伏せる設計のため）

データベース側も確認する。

```bash
pnpm exec wrangler d1 execute DB --remote --config "$WRANGLER_D1_CONFIG" --command "SELECT id, title, author_id FROM consultations WHERE id=<相談のid>;"
```

**期待結果:** 行が返り、`author_id` が `NULL` になっている

---

## 📊 確認項目チェックリスト

- [ ] 退会前に対象の行が存在することを、**本番の D1**（`--remote` か D1 コンソール）で確認した
- [ ] 退会後、`users` / `auth_mappings` / `auth_users` / `auth_sessions` / `auth_accounts`
      すべてで行が 0 になった（一部だけ残っていない）
- [ ] ブラウザから退会でき、完了のトーストとログイン画面のバナーが出た
- [ ] 退会前に開いたままのタブを操作すると、ログイン画面に戻った
- [ ] アドバイス役でログインして、相談の著者欄が「退会済みユーザー」と表示された
- [ ] アドバイス役のアドバイスが無傷で、著者名も元のまま表示された
- [ ] 相談の `author_id` が `NULL` になっていた

---

## 🐛 トラブルシューティング

### 退会 API が 403 になる

Origin 検証で弾かれている。原因は3つ。

- `apps/fumufumu-backend/.dev.vars` の `FRONTEND_URL` が未設定（空だと Origin 欠如と同じ扱い）
- フロントエンドが `FRONTEND_URL` と違うポートで起動している
- `localhost` と `127.0.0.1` を混在させている（ホスト名も完全一致が必要）

`curl` から叩く場合は `-H 'Origin: <FRONTEND_URL と同じ値>'` が必要。

### アドバイスの投稿が 404 になる

相談が公開になっていない。アドバイスは投稿チェックで公開になった相談にしか付けられず、
投稿チェック中でも公開見送りでも 404 のままになる。事前準備の3を先に行う。

### 相談の作成が 400 になる

公開する相談はタグが0個だと 400 になる（3個超も 400）。エラー文は汎用の
「入力内容に誤りがあります」なので、`tagIds` が入っているかを確認する。

### 相談の作成が 409 になる

`tagIds` に実在しないタグ id が入っている。メッセージに
「存在しないタグIDが含まれています: 1」のように id が出るので、`GET /api/tags` で
実在する id を確認する。

### どのデータベースを見ているかわからない

`.wrangler/state/v3/d1/miniflare-D1DatabaseObject/` に古い残骸の `.sqlite` が混ざっている。
`sqlite3` で直接開かず、必ず `wrangler d1 execute` を使う。
`pnpm tags:add` は `.sqlite` を直接開いて更新時刻が最新のものを選ぶ実装なので、
実行後は `GET /api/tags` か wrangler 越しに見えているか必ず確かめる。

### `pnpm seed` が反映されない

`apps/fumufumu-backend/scripts/seed.ts` はデータベースのファイルパスをベタ書きしており、
現在使われているファイルと異なる。テストデータは本書のとおり API か画面から作る。

---

## 📚 参考資料

- [ADR 013: 退会（アカウント削除・PII 消去）機能の設計方針](../design/adr/013-account-withdrawal-and-pii-erasure.md)（§5.3 が D1 の原子性の前提）
- [09. 退会（アカウント削除・PII 消去）実装計画](../projects/09-account-withdrawal-implementation.md)
- 自動テスト: `apps/fumufumu-backend/src/test/user-withdrawal*.test.ts`
- issue #192（`auth_verifications` の削除条件と完全性テストの問題）

---

## ✅ 実行結果記録

**実施日**: ____年__月__日
**実施者**: ____________
**実施環境**: ____________（確認1は本番の D1 でなければ未達）

| 確認 | 結果 | メモ |
|---|---|---|
| 確認1 本番の D1 で行が残らない | ⬜ | |
| 確認2 ブラウザを通した退会 | ⬜ | |
| 確認3 「退会済みユーザー」の表示 | ⬜ | |

**ステータス**: ⬜ 未実施
