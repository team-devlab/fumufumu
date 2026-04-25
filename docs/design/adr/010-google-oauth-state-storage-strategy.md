# [ADR] Google OAuth 実装方針（Better Auth 標準フロー + emailVerified ゲート）

* **Status**: Accepted
* **Date**: 2026-04-21 (revised 2026-04-23)

---

## 0. このADRで行った意思決定

### 比較した論点

1. Google OAuth のコールバックとセッション発行を自前で実装するか、Better Auth 組み込みフローに任せるか
2. 既存メール/パスワードアカウントと同じメールで Google 認証された場合、どう扱うか
3. OAuth の一時状態や連携チケットの保存場所をどう設計するか

### 評価観点（Decision Drivers）

- Better Auth の標準機能を最大限活用してコード量を抑える
- 既存メール × Google 連携時のセキュリティを業界標準以上に保つ
- 未ログイン状態で「Googleでログイン」を押して既存アカウントと衝突したときの UX
- 実装・保守コストと、得られるセキュリティマージンの割り合い

### 最終決定

- Google OAuth の入口・コールバック・セッション発行はすべて **Better Auth 組み込みフロー（`/api/auth/sign-in/social` と `/api/auth/callback/:provider`）に委譲する**
- `accountLinking.enabled: true` を採用し、**既存メールとの紐づけは Better Auth の emailVerified ゲートに任せる**（`userInfo.emailVerified === true` のときのみ自動紐づけ）
- 自前 OAuth ハンドラ（`/oauth/google/start` / `/callback/google` / `/oauth/google/link/confirm`）は **削除**する
- 新規ユーザー作成時の業務層レコード（`users` / `authMappings`）生成は `databaseHooks.user.create.after` に集約する
- OAuth 一時状態や連携チケット用の独自保存領域は不要。Better Auth が内部で `authVerifications` を使う

### 採用しなかった案

- **専用テーブル2枚方式**（当初 PR の実装）
  - 却下理由: `authVerifications` と役割が重複し、テーブルを増やすメリットが薄い
- **`authVerifications` 相乗り + 自前 OAuth ハンドラ方式**（本 ADR 初版で採用していた案）
  - 却下理由: 詳細は「2.3 方針変更の経緯」参照。Better Auth の emailVerified ゲートで十分なセキュリティが確保できることが分かり、自前実装を維持する理由が消えた

---

## 1. 背景

Google OAuth 追加 PR では当初、以下の UX 要件を満たすために**自前の OAuth フロー**を実装していた:

> 未ログインの状態で「Googleでログイン」を押し、既存のメール/パスワードアカウントと同じメールアドレスだった場合、パスワード再入力を挟んで安全に Google 連携を確定したい。

この要件を Better Auth 組み込みフローで実装しようとすると、`accountLinking.enabled: false` 設定下では以下の制約があった:

- メール衝突時に Better Auth は `ACCOUNT_NOT_LINKED` エラーとして `errorCallbackURL` に 302 リダイレクトする
- その際、Google の `sub`（provider account id）が URL クエリに含まれず、アプリ層からは失われる
- `sub` が無いと `auth_accounts` への INSERT ができないため、後続の「パスワード再入力 → 連携確定」ステップが成立しない

そのため本 ADR 初版では「Better Auth 組み込み OAuth は採用不可」と判断し、自前ハンドラで `sub` を直接掌握する方針を採っていた。

---

## 2. 方針変更の経緯

### 2.1 気づき: emailVerified ゲートはパスワードリセットと同等のセキュリティ

再検討の過程で、`accountLinking.enabled: true` 設定下での Better Auth の挙動を Better Auth ソース（`api-CkmycQ2x.mjs:826` および `handleOAuthUserInfo`）で確認したところ、以下が判明した:

- 自動紐づけは **無条件ではなく、OAuth プロバイダから `email_verified: true` が返っている場合のみ実行される**
- Google は `email_verified: true` を「そのメールアドレスを本人が所有していることを検証済み」という意味で返す（Gmail アドレスの所有者、または Google Workspace のドメイン検証済み、または外部メールの到達確認済み）
- つまり `email_verified: true` で自動紐づけされる攻撃経路は、「攻撃者がそのメールボックスにアクセスできる」状態に限られる
- この状態なら**既存のパスワードリセット機能でも同じく乗っ取り可能**であり、自動紐づけによって攻撃面は広がらない

結論として、emailVerified ゲート付きの自動紐づけは**業界標準（Auth0 / Clerk / Supabase Auth 等）のセキュリティ水準と同じ**であり、パスワード再入力という追加ステップは**過剰な保守的対応**だった。

### 2.2 方針転換による影響

自前フローを捨て Better Auth 標準に寄せることで以下の利点が得られる:

- `auth.routes.ts` の OAuth 関連約 500 行を削除
- `authVerifications` 相乗り用の helper モジュール約 120 行を削除
- 連携用の linkTicket 管理、複雑な3分岐ロジック、reason クエリ付きリダイレクト処理がすべて消える
- フロント側の linkTicket 受け渡し、リンク確定フォーム分岐なども不要
- 合計で約 1000 行のコード削減

UX 面の影響:
- 既存メールと同じ Google アカウントで初めて「Googleでログイン」を押したユーザーは、**パスワード再入力なしで即座にログイン・紐づけが完了する**
- これは Google ログインに慣れているユーザーにとってむしろ自然な挙動

セキュリティ面の影響:
- 前述の通り、パスワードリセットと同等のセキュリティ水準で変化なし

### 2.3 本 ADR 初版の分析との関係

本 ADR 初版（`authVerifications` 相乗り + 自前ハンドラ採用）の分析自体は、`accountLinking.enabled: false` を前提とした場合の判断として正しかった。ただし前提条件（`enabled: false` でなければならない）自体が過度に保守的だったという結論になり、今回は前提を `enabled: true` に見直した上で、自前ハンドラを不採用とした。

---

## 3. 採用案の実装方針

### 3.1 Better Auth 設定

- `account.accountLinking.enabled: true`
- `trustedProviders` は未指定（= `emailVerified: true` を条件にする）
- `socialProviders.google` に client id / secret を設定
- `databaseHooks.user.create.after` で業務層レコード（`users` / `authMappings`）を作成

### 3.2 エンドポイント構成

- `/api/auth/signup`, `/api/auth/signin`, `/api/auth/signout`: 既存 URL を維持。中身は Better Auth の `auth.api.signUpEmail` / `signInEmail` / `signOut` を呼ぶ薄いラッパとして簡素化
- `/api/auth/*` の上記以外のパス: `auth.handler(c.req.raw)` に委譲（catch-all）
  - これにより `/api/auth/sign-in/social`, `/api/auth/callback/:provider` が Better Auth によって処理される

### 3.3 フロントエンド

- Google ボタンは Better Auth 組み込みの `/api/auth/sign-in/social` に POST し、返却された URL へ遷移する
- linkTicket の受け渡しや連携確定フォームは不要
- エラーメッセージは `oauth_failed` / `oauth_cancelled` 等 Better Auth から返り得るものに限定

### 3.4 既知の limitation

- 業務層レコード（`users` / `authMappings`）の作成が `databaseHooks` で失敗した場合はエラーを再送出して認証フロー自体を失敗させる。`users` のみ作成済みだったケースではベストエフォートで rollback を試みるが、rollback 自体が失敗したときは運用での検知・補正が必要になる

---

## 4. 将来の見直し条件

- Better Auth で emailVerified ゲートの判定ロジックに重大な変更が入った場合
- Gmail / Google Workspace 以外の OAuth プロバイダで `email_verified` の信頼性が問題になった場合
- ドメイン再利用リスクを特別に警戒する業界要件が発生した場合

上記が発生した場合、自前 OAuth ハンドラ（旧案）または更に厳格な連携フローへの再移行を検討する。
