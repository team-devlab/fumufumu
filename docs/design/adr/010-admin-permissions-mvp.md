# [ADR] 管理画面（/admin）の権限制御 MVP 方針

* **Status**: Accepted
* **Date**: 2026-06-07

---

## 0. このADRで行った意思決定

### 比較した論点

1. ユーザーの権限を `is_admin` boolean で持つか、`role` enum で持つか
2. 権限の付与/剥奪をどの経路で行うか（DB 直 UPDATE / 管理者専用 API / 両方）
3. バックエンドの認可をどの粒度で掛けるか（機能別の辞書 / `/api/admin/*` 一律 / 個別ハンドラ）
4. フロントエンドで「一般ユーザーに見せない」をどう実装するか（layout guard / コンポーネント内 if 分岐 / middleware）

### 評価観点（Decision Drivers）

- 個人開発規模で運用負荷を増やさないこと
- 公開リポジトリであり、`/admin` 系 API のエンドポイントは誰でも grep できる前提で安全であること
- 将来 `moderator` のような中間ロールを追加しても、破壊的変更にならないこと
- フロントエンドの「admin 判定」が `if (isAdmin)` で各所に散らばらないこと
- 認可機構そのものの実装 bug が単一障害点にならないこと（権限付与 API のような攻撃面を必要以上に増やさない）

### 最終決定

- ユーザー権限は `users.role` enum (`'user' | 'admin'`) で管理する。初期値は `'user'`、`NOT NULL`、デフォルト制約あり
- 権限付与は **当面 DB 直 UPDATE（wrangler d1 execute）のみ** とし、権限変更 API は MVP では作らない
- バックエンドは `/api/admin/*` 配下に `adminGuard` middleware を必須化し、`role === 'admin'` 以外は 404 を返す（403 ではなく 404 にすることで admin API の存在を漏らさない）
- フロントエンドは `(main)/admin/layout.tsx` で server-side に role を検査し、admin でなければ `notFound()` を返す。UI 上の admin ナビ表示は、セッション由来の `role` を 1 箇所で参照する仕組みに集約する

### 採用しなかった案

- `users.is_admin` boolean
  - 却下理由: 将来 `moderator` 等を増やす際に「複数 boolean 列の組合せ」になり、状態の一意性が崩れる。enum なら 1 列で現在の権限が確定する。
- 権限変更 API を MVP から提供する
  - 却下理由: MVP 時点では role 付け替えの頻度が低く API を作る ROI が見合わない。一方で「権限を変更できる API」は最大級の攻撃面になり、その認可 bug は全権限崩壊につながる。MVP では作らない方が安全。
- 機能ごとの権限辞書（feature → required role のマップ）
  - 却下理由: MVP 時点では `admin` 1 種類しか無く、辞書を引くオーバーヘッドだけが残る。ロールが 2 種類以上になった時点で導入する。
- フロントエンドで Server Component / Client Component それぞれに `if (isAdmin)` を書く方式
  - 却下理由: 表示判定が各所に散らばり、漏れが必ず出る。layout 一段とナビ用フックの 1 箇所に閉じ込める。
- middleware (proxy.ts) で admin guard を掛ける方式
  - 却下理由: 当プロジェクトは ADR 008-frontend-deployment で Node Middleware を撤去済み。layout guard 方式に統一する。

---

## 1. 背景

`/admin` ページの雛形を追加した（feature/admin-permissions ブランチ）。この管理画面では以下を扱う想定:

- ユーザー一覧の管理（権限付与、垢 BAN 操作）
- 投稿チェック機能の管理（ADR 007 / ADR 009 で定義した consultation / advice の承認・却下と、承認時のメール送信）

現時点で問題なのは、バックエンドに既に存在する `/api/admin/content-check/*` 系のルートが `authGuard`（ログイン済みかどうか）しか掛かっていない点である。fumufumu は公開リポジトリのため、ルーティングは誰でも grep できる。**ログインさえしていれば curl で承認 API を叩ける状態** であり、ここを塞ぐのが今回の最優先課題となる。

加えて、`/admin` ページの追加に伴い「フロントエンドで admin 以外に画面を見せない」「画面の存在自体を露出させない」も同時に整える必要がある。

---

## 2. DB 設計（`is_admin` vs `role` の比較）

| 観点 | `is_admin` boolean | `role` enum (採用) |
|---|---|---|
| 列数 | 1 (現状) | 1 |
| 状態の一意性 | OK（true/false のみ） | OK（enum で一意） |
| 中間ロール追加時 | `is_moderator` 等の列追加 → 列の組合せ管理が必要 | 値を増やすだけ |
| 既存ユーザーへの移行 | デフォルト false で済む | デフォルト `'user'` で済む |
| クエリの素直さ | `WHERE is_admin = 1` | `WHERE role = 'admin'` |
| 「現在の権限」を 1 箇所で読める | ✗（複数列を見ないと分からない場合あり） | ✓ |

採用: `role` enum (`'user' | 'admin'`)。

- `users` テーブルに `role TEXT NOT NULL DEFAULT 'user'` を追加する
- アプリ側では `type UserRole = 'user' | 'admin'` を 1 箇所で定義し、DB / API / フロントで共有する
- 既存ユーザーは migration で全て `'user'` になる。初期管理者は migration 後に手動 UPDATE で付与する

将来 `moderator` を追加する場合は enum に値を増やすだけで済むため、テーブル schema 変更は不要になる（drizzle の enum 型定義の更新のみ）。

---

## 3. 権限付与/剥奪の経路

### 採用: DB 直 UPDATE のみ（MVP）

```sh
wrangler d1 execute <db> --remote \
  --command "UPDATE users SET role = 'admin' WHERE id = <id>"
```

理由:

- MVP 時点では role 付け替えの頻度が低く、API を作る ROI が見合わない（初期管理者の bootstrap と、稀に発生する追加付与のみを想定）
- 「権限を変更できる API」自体が最大級の攻撃面になる。その API の認可 bug = 全権限崩壊に直結する。MVP では作らない方が安全
- DB 直 UPDATE は wrangler 経由で実施するため、Cloudflare アカウントへのアクセス権を持つ運営メンバーに操作を限定できる

### MVP で `/admin` の「ユーザー管理」画面が扱う範囲

- 一覧表示（id, name, role, disabled, createdAt 程度）
- BAN フラグ (`users.disabled`) の切り替え ← これは API 化する（運営オペレーションで頻度が出る想定）
- **role の付け替えは UI から行わない**（DB 直のみ）

`disabled` の切り替えは「ユーザーをログイン不能にする / 投稿不能にする」操作であり、誤操作の影響範囲が `role` 変更より限定的なため API 化する。`role` 変更は権限の昇格そのものであり、影響範囲・攻撃面の観点から MVP では UI/API を切らない。

### 採用しなかった案

- 管理者 API による付与/剥奪
  - 上記の通り、攻撃面と MVP 時点の運用ニーズが釣り合わないため不採用。将来見直し条件は §6 に記載。

---

## 4. バックエンドの認可方針

### 採用: `/api/admin/*` 全体に `adminGuard` middleware を必須化する

実装方針:

- `authGuard` の後段に `adminGuard` を追加する
  - `authGuard` が確定させた `appUserId` を使って `users.role` を引く
  - `role !== 'admin'` の場合は `404 Not Found` を返す（403 ではなく 404）
- `/api/admin` 配下のルート登録時に必ず `authGuard, adminGuard` をセットで適用するルールにする
  - 既存の `admin-content-check.controller.ts` も同様に書き換える
  - 「admin 系ルートは `app.route('/admin/...', ...)` の段で middleware を強制」する形にして、個別ハンドラで掛け忘れが起きないようにする

### なぜ 403 ではなく 404 か

- 公開リポジトリのため、admin API のパスは grep で完全に把握できる前提
- 403 を返すと「このパスは存在し、権限不足である」ことが確定情報として相手に渡る
- 404 を返せば「そもそも admin API が存在するかどうか」の確証を与えない（実態は変わらないが、不要な情報を渡さない）
- 一般ユーザーが誤って踏むことは想定しないため、UX 上のデメリットも無い

### 機能別の権限辞書を作らない理由

- 現状ロールは `user` / `admin` の 2 値のみ。辞書を引く構造を作っても、全エントリが「admin 必須」になる
- 将来 `moderator` を追加して「投稿チェックは moderator 以上、ユーザー BAN は admin のみ」のような分岐が必要になった段階で、`role → 許可エンドポイント` のマップを導入する
- それまでは「`/api/admin/*` は admin role 必須」の 1 ルールで管理する

---

## 5. フロントエンドの方針

### 採用: layout レベルでの server-side guard + セッション由来の `role` を 1 箇所で読む

実装方針:

1. **`(main)/admin/layout.tsx` を新設し、ここで role を検査する**
   - Server Component で session を取得 → `role !== 'admin'` なら `notFound()` を呼ぶ
   - これで `/admin/**` 配下は layout 一段で守られる。個別ページに guard を書かない
2. **ヘッダー等の admin ナビ表示も、セッション由来の `role` を 1 箇所で参照する**
   - 例: `useCurrentUserRole()` のような薄い hook、または Server Component で session から取った role を props で受け渡す
   - 各コンポーネントで `if (isAdmin)` を書かない。表示判定は 1 箇所に閉じる
3. **404 と整合させる**
   - admin でない人間が `/admin` を直打ちしても `notFound()` で 404 化される
   - これにより「admin 画面の存在自体」をフロントエンドからも露出させない

### CLAUDE.md の `useEffect` 禁止ルールとの整合

- role の取得・判定はすべて Server Component / server-side session lookup で完結させる
- クライアント側で fetch して role を判定する `useEffect` は使わない
- これは CLAUDE.md のフロントエンドルール（`useEffect` を既定で使わない）と自然に整合する

---

## 6. 期待効果とトレードオフ

### 期待効果

- 公開リポジトリ前提でも `/api/admin/*` を curl で直叩きされない（404 で存在も曖昧化）
- 権限変更 API という最大の攻撃面を MVP に持ち込まない
- フロントエンドの admin 判定が layout 1 段とナビ用の 1 箇所に閉じ、`if (isAdmin)` の散乱を回避
- `role` enum により、将来 `moderator` を増やしても schema 変更不要

### トレードオフ

- 初期管理者の付与は wrangler d1 execute での手動 UPDATE が必要（Cloudflare アカウントへのアクセス権を持つ運営メンバーのみ実行可）
- `/admin` UI から role の付け替えはできない（role 操作が必要なときは DB 直 UPDATE で対応する前提）
- 404 化により「admin 画面が存在しない」のか「権限不足で見えない」のか、開発者本人が見ても挙動から区別できない（ログでは区別可能にする）

---

## 7. 将来の見直し条件

- role の付与/剥奪頻度が増え、DB 直 UPDATE による運用がトイル化する
  - → 権限付与 API + 監査ログを導入し、`/admin` UI から role 操作可能にする
- 中間ロール（例: `moderator`）が必要になる
  - → `role` enum に値を追加し、「ロール → 許可エンドポイント」のマップを導入
- 監査要求が強くなる
  - → `role` 変更ログテーブル、または `users` の `role_updated_at` / `role_updated_by` 追加を検討
- 同時にロールが複数必要なユーザーが現れる
  - → `users.role` を `user_roles` 多対多テーブルへ移行（schema migration が発生する）

---

## 8. 参照

- ADR 007: `docs/design/adr/007-content-check-mvp-operation-strategy.md`（投稿チェック機能の MVP 運用）
- ADR 009: `docs/design/adr/009-email-notification-delivery-strategy-mvp.md`（承認時メール送信）
- ADR 008: `docs/design/adr/008-frontend-deployment-platform-and-split-cicd.md`（Node Middleware 撤去の経緯）
- CLAUDE.md: フロントエンドの `useEffect` 既定禁止ルール
