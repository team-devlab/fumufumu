# [ADR] フロントエンド配備先の再選定とフロント/バック分離CI/CD方針

* **Status**: Proposed
* **Date**: 2026-03-20

---

## 0. このADRで行った意思決定

### 比較した論点

1. `apps/fumufumu-frontend` の本番配備先をどこにするか
   - Vercel / Cloudflare Workers / Netlify / Self-host / AWS Amplify
2. `apps/fumufumu-frontend` と `apps/fumufumu-backend` をどう独立デプロイにするか
   - ベンダーの Git 連携 / GitHub Actions
3. Preview Deploy を初期から入れるか
   - 初期導入する / Phase 2 で導入する
4. Next.js のバージョンを維持するか、下げるか
   - Next.js 16 維持 / Next.js 15 へダウングレード
5. 現行コードベースを変更してでも適合させるか
   - `proxy.ts` だけを置き換える / SSR を維持したまま認証方式を調整する / static export 可能な構成まで寄せる

### 評価観点（Decision Drivers）

- 商用化時の最低固定費
- チームでの見通しのよさ
  - メンバー権限
  - ダッシュボードでの把握
  - Preview / Rollback のしやすさ
- 現行実装との適合性
  - Next.js 16
  - App Router
  - `proxy.ts`
  - `cookies()` / `headers()`
  - Cookie ベース認証
- コード変更量と移行難易度
- トラフィック規模ごとのコストの伸び方
  - リクエスト
  - CPU/実行時間
  - 帯域
  - build 回数
- バックエンドが Cloudflare Workers であることによる運用上のメリット
- Next.js の将来アップグレード時のリスク

### 最終決定

- `apps/fumufumu-frontend` の本番配備先は Cloudflare Workers を採用する
- フロントエンドの Cloudflare 配備には `@opennextjs/cloudflare` を前提とする
- `apps/fumufumu-frontend` と `apps/fumufumu-backend` は GitHub Actions を分離し、path filter 付きで独立デプロイする
- Preview Deploy は初期段階では必須にしない。まずは PR 品質チェック + `main` への独立デプロイを優先する
- Vercel は本番の第一候補から外す。必要なら移行期間の一時的な退避先としてのみ残す
- 静的エクスポート前提の Cloudflare Pages 運用は採用しない
- AWS Amplify は「即除外」ではなく、`next@15` に下げる前提なら成立する条件付き候補と判断する
- ただし第一候補にはしない。理由は、Cloudflare 集約メリットと帯域コストの優位性が残るため

### 採用しなかった案

- Vercel を本番の第一候補として継続する案
  - 却下理由: 商用利用時に Hobby が使えず、チーム運用での固定費が上がる
- Netlify を本番の第一候補にする案
  - 却下理由: 技術的には有力だが、Cloudflare 集約のメリットを捨てる割にコスト優位が弱い
- Self-host を採用する案
  - 却下理由: いま必要な差分より運用責務の増加が大きい
- AWS Amplify を本番の第一候補にする案
  - 却下理由: `next@15` へ下げれば成立するが、Cloudflare 集約と大きめのトラフィック時コスト優位を捨てる決定打がない

---

## 背景

現行の `apps/fumufumu-frontend` は Next.js 16.0.7 の App Router 構成であり、単なる静的サイトではない。

リポジトリ上の確認結果:

- `apps/fumufumu-frontend/package.json`
  - `next: 16.0.7`
- `apps/fumufumu-frontend/src/proxy.ts`
  - `better-auth.session_token` を見て未認証時に `/login` へリダイレクトする
- `apps/fumufumu-frontend/src/lib/api/client.ts`
  - `credentials: "include"` で Cookie 送受信を前提にしている
  - サーバー側では `next/headers` を読んで 401 リダイレクト時の returnTo を復元している
- `apps/fumufumu-frontend/src/features/**/api/*.ts`
  - `cookies()` を使ってサーバー側から API に Cookie を転送している
- `apps/fumufumu-backend/src/auth.ts`
  - Better Auth の Cookie 属性に `sameSite: "none"` / `secure: true` を設定している
- `apps/fumufumu-backend/src/index.ts`
  - CORS 許可条件が `.vercel.app` と `localhost` 前提になっている
- `apps/fumufumu-frontend/src`
  - `import "server-only"` を使うファイルが 6 本ある
  - `next/headers` を使うファイルが 5 本ある
  - `page.tsx` は 12 本ある
  - `proxy.ts` の matcher は `/consultations/:path*` と `/user/:path*` に限定されている

つまり、今回の検討対象は「静的フロントの配備先」ではなく、「SSR / App Router / Proxy / Cookie 認証を含む Next.js アプリの配備先」である。

---

## 1. まず押さえるべき制約

### 1.1 静的エクスポート前提には寄せられない

Next.js の Self-Hosting ガイドでは、`Proxy` は静的エクスポートではサポートされないとされている。  
現行フロントエンドは `src/proxy.ts` を使って認証制御しているため、`output: "export"` に寄せる前提は合わない。

### 1.2 本質的な論点は SSR + Cookie 認証の運用先

このアプリでは以下が必須:

- App Router
- SSR
- `cookies()` / `headers()`
- Proxy / Middleware
- `credentials: "include"` による Cookie 認証

したがって、比較対象は「これらを安定運用できる配備先」に限る。

### 1.3 デプロイ先変更はドメイン設計変更でもある

今のバックエンドは Vercel オリジン前提の CORS になっているため、フロントエンドの配備先を変えるだけでは完了しない。

最低限、以下を同時に見直す必要がある。

- `NEXT_PUBLIC_API_URL`
- `BETTER_AUTH_URL`
- CORS 許可オリジン
- 本番 URL（初期は `workers.dev` でもよい。公開前に custom domain を追加可能）
- Cookie のスコープ設計

### 1.4 `Proxy` 自体は置き換え可能だが、static export は別問題

Next.js 公式は、`middleware` / `proxy` への依存をできるだけ避け、必要なら layout や Server Component 側へ寄せることを推奨している。  
そのため、「現行で `proxy.ts` を使っていること」自体は絶対的なブロッカーではない。

現行コードベースの確認結果からは、`proxy.ts` を外すだけなら難易度はそこまで高くない。

- 認証ゲート対象は `/consultations/**` と `/user/**` の 2 系統だけ
- 認証判定は `better-auth.session_token` Cookie の有無で単純に行っている
- SSR 側のページ/コンポーネントでも `cookies()` を使って API へ Cookie を転送している

したがって、SSR を維持したままなら、少なくとも次のどちらかへ移行できる可能性が高い。

- `proxy.ts` をやめて、layout / page 側で `cookies()` を見てリダイレクトする
- Next.js 15 に下げて `middleware.ts` へ戻す

一方で、true static export に寄せる話は別である。  
static export にするなら、`proxy.ts` をやめるだけでは足りず、リクエスト時に Cookie を読む実装全体を外す必要がある。

この repo では少なくとも次が変更対象になる。

- `server-only` な API ラッパー 6 本
- `next/headers` を使うファイル 5 本
- SSR 前提でデータ取得している page / component 群

結論として、

- `Proxy` を外すだけなら `Low-Medium`
- static export 可能な形まで寄せるなら `Medium-High`

という整理が妥当である。

---

## 2. 候補比較

### 2.1 比較表

| 候補 | 商用コスト/料金感 | Next.js 適合性 | チーム運用 | Cloudflare 集約メリット | 主な懸念 | 判定 |
|---|---|---|---|---|---|---|
| Vercel | Hobby は非商用限定。Pro は $20/月 + 追加使用量、追加有料 seat は $20/月 | 最も強い。Next.js の第一候補 | 強い。Pro に team collaboration / free viewer seats / RBAC | 弱い。バックエンドだけ Cloudflare のまま残る | コスト上昇、ベンダー分散 | 不採用 |
| Cloudflare Workers | Standard は 10M req/月 + 30M CPU ms 込み。例示は月額 $5 起点。静的 asset は無料・無制限 | OpenNext 経由で Next.js 16 をサポート。App Router / SSR / Middleware 対応 | Roles/scope 管理あり。GitHub Actions 連携可能 | 強い。DNS / SSL / WAF / 請求 / 運用知識を集約できる | OpenNext 依存、Node Middleware 非対応、Worker サイズ制限 | 採用 |
| Netlify | Pro は $20/member/月。Reviewers は無料 | 主要 Next.js 機能を OpenNext で広くサポート | Deploy Preview と Reviewer 導線が強い | 弱い。別ベンダーになる | 価格優位が弱い、やはり adapter ベース | 次点 |
| Self-host | 使い方次第 | Next.js 自体は可能 | 自由度は高い | 中立 | reverse proxy / cache / rollout / 監視を自前で持つ | 不採用 |
| AWS Amplify | pay-per-seat なし。build $0.01/分、15GB 以降 $0.15/GB、SSR 50万 req/月まで無料 | 公式 doc 時点で Next.js 12-15。`next@15` 前提なら候補化可能 | AWS アカウント配下で人数課金なし | なし。運用基盤は分かれる | Next.js 15 へ pin / downgrade が必要、CloudWatch/IAM、帯域課金 | 条件付き候補 |

### 2.2 候補ごとの補足

#### Vercel

Vercel は依然として Next.js との相性が最も良い。  
一方で、公式の Fair Use Guidelines では Hobby は非商用利用に限定されており、商用利用には Pro 以上が必要である。

また、Pro の料金ページ上は以下が明記されている。

- Pro は `$20/mo + additional usage`
- 追加 paid seat は `$20 / month`
- Pro では `Team collaboration & free viewer seats`

したがって、「今は開発用途なので安いが、商用化のタイミングで固定費が跳ねる」という懸念は妥当である。

#### Cloudflare Workers

Cloudflare 公式ドキュメントでは Workers 上の Next.js は `@opennextjs/cloudflare` を前提に案内されている。  
OpenNext Cloudflare は Next.js 16 の minor/patch をサポートし、App Router / SSR / Middleware / ISR なども対象に含めている。

一方で、以下の制約は残る。

- Node Middleware は未サポート
- Worker size は Paid でも gzip 後 10 MB

ただし、現行コードを見る限り、`src/proxy.ts` は `NextRequest` / `NextResponse` ベースであり、Node Middleware 固有機能を使っている形跡はない。  
これはソース確認からの推定だが、現状機能は Cloudflare 側制約に引っかかりにくい。

#### Netlify

Netlify は「Next.js の主要機能を zero configuration でサポートし、OpenNext adapter を毎回の Next.js リリースで検証する」と明記しており、Vercel 以外ではかなり有力である。  
また、Reviewers が無料で、Preview ベースのチームレビュー導線はかなり強い。

一方で、Pro は `$20 per member / month` であり、Cloudflare に集約する設計メリットもない。  
「レビュー体験が最重要」であれば再浮上するが、今回のリポジトリの条件では第一候補にはしない。

#### Self-host

Next.js 公式は Self-host をサポートしているが、同時に reverse proxy、image optimization、cache、version skew などの責務を自分で持つ前提になる。  
今のフェーズでは、配備先の自由度よりも運用責務の増加が大きい。

#### AWS Amplify

ここは再評価が必要だった論点である。  
結論から言うと、「Next.js 16 ではないから即除外」ではなく、「`next@15` に下げるなら十分候補になる」が正しい。

Amplify の公式ドキュメントでは、Amplify Hosting compute SSR provider が Next.js 12 から 15 をサポートしている。  
また、別の移行ガイドでは「現在サポートしているのは Next.js 15」と明記されている。

現行 frontend のコード確認結果からは、Next.js 15 へのダウングレード難易度は `Low-Medium` と見てよい。

- `params` / `searchParams` を Promise として扱う書き方はすでに採用している
- 目立つ Next.js 16 固有要素は `proxy.ts` への改名くらいで、Next.js 15 に戻すなら `middleware.ts` へ戻せばよい

また、少なくとも現時点では、次のような移行ハードルを上げやすい機能は見当たらない。

- `next/image`
- `Server Actions`
- `revalidateTag` / `revalidatePath`
- `after`
- Edge API Routes
- 画像やメディア主体の構成

ただし、第一候補にはしない。理由は次の通り。

- バックエンドが Cloudflare のままなので、運用基盤が分かれる
- Amplify は帯域課金の影響を受けやすい
- SSR 実行ログは CloudWatch Logs に流れ、IAM service role の考慮も必要になる
- 将来 Next.js 16+ へ上げたい時に、Amplify 側サポート待ちになる

したがって、Amplify は「条件付き候補」までは昇格するが、「第一候補」にはしない。

---

## 3. コード変更前提での移行難易度比較

「現行コードを変えてよい」という前提を入れると、選択肢は増える。  
ただし、変える対象が `Proxy` だけなのか、SSR 依存全体なのかで難易度が大きく変わる。

### 3.1 難易度比較表

| 案 | 主な変更点 | ローカル確認ベースの対象 | 難易度 | コメント |
|---|---|---|---|---|
| Next.js 16 のまま Cloudflare Workers | OpenNext 導入、wrangler 設定、CI 追加 | deploy 設定中心 | Low-Medium | アプリ本体の変更が最少 |
| Next.js 15 に下げて Amplify | `next` version 調整、`proxy.ts -> middleware.ts`、Amplify build 設定 | package + 認証導線 + CI | Low-Medium | 「Next を下げる」こと自体は十分現実的 |
| `Proxy` を廃止するが SSR は維持 | layout / page 側で Cookie 判定し redirect | 認証導線 2 系統 | Low-Medium | 公式の推奨方向に近い |
| static export 対応へ寄せる | `server-only` API 群除去、`next/headers` 依存排除、client fetch 化 | server-only 6 本、`next/headers` 5 本、SSR page 群 | Medium-High | 認証 UX とデータ取得方式の再設計が必要 |
| 完全 SPA 化して Vite/React へ寄せる | ルーティング・metadata・SSR 導線の全面整理 | frontend 全体 | High | 今回の目的には過剰 |

### 3.2 `next@15` へ下げる難易度

現行コードから見る限り、`next@15` へのダウングレードは十分あり得る。

- `params` / `searchParams` はすでに Promise 前提で書かれている
- `proxy.ts` は Next.js 16 での rename 影響を受けているだけで、Next.js 15 なら `middleware.ts` に戻せる
- React 19 系は維持可能
- `next.config.ts` に Next.js 16 専用の設定は入っていない

主なリスクは、内部 API への依存である。

- `next/dist/client/components/redirect-error` を直接 import している

この種の import は Next.js minor / major 変更の影響を受けやすいため、Amplify を採るかどうかに関係なく、将来的には公開 API へ寄せるか、少なくとも upgrade checklist に入れるべきである。

### 3.3 static export へ寄せる難易度

「Cloudflare Pages static」や「S3 配信だけで済ませる」ために static export へ寄せる案も理論上はある。  
ただしこの場合、やることは `Proxy` の撤去では終わらない。

必要になる変更:

- `cookies()` を使う server-side API 呼び出しを client-side fetch へ置き換える
- 未認証リダイレクトを client-side guard へ移す
- 画面初回表示時の loading / unauthorized flash を設計する
- API URL と Cookie の送受信を browser 主体に寄せる
- SSR 前提のページを static shell + client hydrate に再設計する

現行コードベースでは、これは「ちょっとした deploy 向け調整」ではなく、描画モデルと認証導線の変更である。  
したがって、配備先選定のためだけにやる変更としては重い。

---

## 4. 「バックエンドが Cloudflare だから frontend も揃える」メリットの実態

### 4.1 大きいメリット

- 請求先を Cloudflare に寄せられる
- DNS / SSL / WAF / Custom Domain / ログ閲覧先を集約できる
- チーム権限の考え方を Cloudflare 側に寄せられる
- フロント・バックとも GitHub Actions + Wrangler で揃えやすい

### 4.2 中くらいのメリット

- 将来、同じ zone 配下での routing を整理しやすい
- Service Bindings や router Worker を使った構成に発展させやすい
- Cloudflare の Preview / Rollback / Gradual Deploy の運用知識を一本化しやすい

### 4.3 過大評価しない方がよい点

- 「Cloudflare に揃えるだけで API 呼び出し性能が劇的に上がる」わけではない
  - 現行実装は `NEXT_PUBLIC_API_URL` に対する HTTP fetch であり、フロントとバックが同一基盤でも自動的に内部通信にはならない
- 「Cloudflare に揃えるだけで認証が簡単になる」わけでもない
  - 実際にはカスタムドメイン、CORS、Cookie 属性の整理が必要

結論として、Cloudflare に揃えるメリットはあるが、決定打は「性能」ではなく「コスト」と「運用集約」である。

---

## 5. なぜ Cloudflare Workers を採用するか

### 5.1 商用化時の固定費が小さい

Vercel は Hobby で商用利用できない。  
Cloudflare Workers は公式 pricing 上、Standard が 10M リクエスト/月と 30M CPU ms を含み、例示料金は月額 $5 起点である。  
静的 asset リクエストが無料・無制限なのも、フロントエンド配備先として相性がよい。

### 5.2 現行コードは Cloudflare 適合性が比較的高い

現行コードの確認結果から、少なくとも今は以下を使っていない。

- `next/image`
- ISR / `revalidateTag` / `revalidatePath`
- Server Actions
- Node Middleware 固有 API

これは「現時点では」OpenNext 周辺の複雑性に当たりにくいことを意味する。  
将来の機能追加で事情が変わる可能性はあるが、現在のプロダクト段階では十分許容できる。

### 5.3 バックエンドと運用面を揃えやすい

このリポジトリのバックエンドはすでに Workers / Wrangler 前提である。  
フロントエンドも Cloudflare 側に寄せると、以下を揃えやすい。

- デプロイトークンの発行方針
- カスタムドメインの設定
- 環境ごとのシークレット投入
- ログ確認のオペレーション
- チーム内の運用手順

### 5.4 それでも Vercel ではなくてよい理由

Vercel は Next.js の安定性では最有力だが、このリポジトリで今欲しいのは「最新の Next.js 実験機能を最速で使うこと」ではない。  
今欲しいのは「独立デプロイ」「商用移行の費用整理」「運用集約」であり、この優先順位では Cloudflare が勝つ。

---

## 6. CI/CD 方針

### 6.1 原則

- frontend 変更で backend を再デプロイしない
- backend 変更で frontend を再デプロイしない
- デプロイ条件と secrets は GitHub Actions 側に明示し、repo 上で追跡可能にする

### 6.2 GitHub Actions を採用する理由

Cloudflare 側には Git integration / Workers Builds もあるが、初期方針としては GitHub Actions を採用する。

理由:

- すでに `.github/workflows` が運用されている
- path filter で monorepo 的に制御しやすい
- deploy 条件をコードレビューできる
- backend / frontend で対称な運用にしやすい
- 将来、別のデプロイ先に切り替える時も click ops 依存が少ない

### 6.3 初期構成（Phase 1）

#### Frontend

- PR:
  - `apps/fumufumu-frontend/**` 変更時のみ実行
  - `biome ci`
  - `vitest`
  - `next build`
  - 可能なら OpenNext build まで含め、Cloudflare 配備可能性を検証する
- `main` push:
  - frontend 専用 workflow で Cloudflare Workers へ deploy
- 手動:
  - `workflow_dispatch` で再配備できるようにする

#### Backend

- PR:
  - 既存のテスト workflow を backend path に限定して実行
- `main` push:
  - backend 専用 workflow で Worker deploy
- 手動:
  - `workflow_dispatch` で再配備できるようにする

### 6.4 Preview Deploy を Phase 2 に回す理由

Preview URL は便利だが、最初から入れると次の複雑性が増える。

- Preview ごとの環境変数
- Preview 用ドメインと Cookie/CORS
- Preview 環境のデータアクセス方針
- preview cleanup

今の優先度は「本番/ステージングを安全に独立デプロイできること」なので、最初は PR 品質チェックに留める。  
UI レビュー需要が高まったタイミングで、Cloudflare Workers Builds か GitHub Actions で preview を追加する。

---

## 7. デプロイ前に必ずやるべきこと

### 7.1 バックエンドの CORS 設定を Vercel 固定から外す

現状の `apps/fumufumu-backend/src/index.ts` では、CORS 許可オリジンが `.vercel.app` と `localhost` に強く寄っている。  
Cloudflare へ移すなら、少なくとも環境変数ベースの allowlist に切り替える必要がある。

### 7.2 認証 URL と API URL を環境ごとに切り替える

- frontend:
  - `NEXT_PUBLIC_API_URL`
- backend:
  - `BETTER_AUTH_URL`

これらは deploy target を変えると必ず変わるため、GitHub Actions と Cloudflare secrets/vars の境界を先に整理する。

### 7.3 初期は `workers.dev` で進め、custom domain は公開前に追加する

無料枠優先で進める間は、frontend / backend ともに Cloudflare の `workers.dev` URL を使ってよい。  
この段階では、custom domain を初期必須にしない。

初期実装で先に固めるべきこと:

- `workers.dev` ベースの `NEXT_PUBLIC_API_URL`
- `workers.dev` ベースの `BETTER_AUTH_URL`
- CORS allowlist

公開前に追加で決めること:

- `app.example.com`
- `api.example.com`
- 必要なら `COOKIE_DOMAIN`

つまり、custom domain は「初期CI/CDの前提条件」ではなく、「一般公開前の仕上げ」として扱う。

### 7.4 `COOKIE_DOMAIN` の扱いを明確化する

`Env` 型には `COOKIE_DOMAIN?` があるが、現時点では Better Auth 設定へ反映されていない。  
本番ドメイン設計と合わせて、必要なら実際の Cookie 設定へ組み込む。

### 7.5 frontend の build を CI で必須化する

現行の `fe-code-check.yml` は Biome と Vitest が中心で、`next build` が入っていない。  
配備先を見直すなら、PR 時点で build を落とせるようにするべきである。

### 7.6 Worker bundle size を監視する

Cloudflare Workers Paid の Worker size 上限は gzip 後 10 MB である。  
Next.js + OpenNext 構成では build artifact が膨らみやすいので、CI で dry-run size を確認する導線を用意する。

---

## 8. 今回の選定で重要だった、追加の視点

今回の比較で、当初の論点以外に特に重要だったのは次の観点である。

### 8.1 Auth / Cookie / CORS

このリポジトリでは、配備先の違いがそのまま認証挙動に影響する。  
ここを曖昧にしたまま配備先だけ選んでも、後で必ず詰まる。

### 8.2 Preview と本番の切り分け

Preview URL は便利だが、認証付きアプリでは環境差分の扱いが難しい。  
最初は本番/staging を安定させ、その後に preview を足す順番が安全である。

### 8.3 Version skew / rollback

Next.js はデプロイをまたぐと client asset と server code のずれが出やすい。  
Vercel や Netlify はこの領域の体験が強いが、Cloudflare を採るなら rollback と smoke test を明示的に整える必要がある。

### 8.4 Next.js のバージョンアップ運用

Cloudflare では OpenNext の対応状況が重要になる。  
今後は Next.js の minor を上げる前に、Cloudflare/OpenNext 側のサポート状況確認を release checklist に入れるべきである。

### 8.5 チーム向けダッシュボードの見やすさ

これは料金表や feature matrix だけで断定できないため、以下は公式仕様と運用面からの推論である。

- Vercel / Netlify
  - deployment-centric な UI で、Preview / Review 導線は強い
  - 非インフラ寄りのチームでも扱いやすい
- Cloudflare
  - backend も Cloudflare にあるなら、Workers / domain / routing を同じ文脈で見られる
  - 一方で、frontend review UX は Vercel / Netlify ほど前面には出ていない
- AWS Amplify
  - pay-per-seat ではない点は強い
  - ただし、SSR 実行ログは CloudWatch、権限面は IAM service role も絡むため、見る場所が増えやすい

したがって、「デプロイの見やすさ / レビューしやすさ」を最優先するなら Vercel / Netlify が強い。  
「frontend と backend を同じ運用面で追いたい」なら Cloudflare が強い。  
「seat 課金を避けたい」なら Amplify に分がある。

---

## 9. 規模別コスト試算

### 9.1 前提

フロントエンド配備先のコストで効きやすいのは、アプリの「DB データ件数」そのものではなく、次の量である。

- リクエスト数
- SSR 実行時間 / CPU
- 配信帯域
- build / production deploy 回数

つまり、相談件数やユーザー件数が増えても、本文が短いテキスト中心ならコスト増は比較的緩やかで、画像や大きい bundle を配る構成だと一気に上がる。

以下では、比較しやすくするために前提を固定した。

- 1 paid maintainer seat が必要なプランは 1 人ぶんで計算
- production deploy は月 20 回
- 1 回の build は 3 分
- 1 ユーザーあたり 1 日 10 ページビュー
- 1 ページビュー = 1 dynamic request とみなす
- SSR 実行は平均 100ms、128MB メモリ相当
- Cloudflare / Vercel の CPU は平均 10ms/request と仮定
- 軽量ダッシュボード想定として、1 ページビューあたり転送量を 100KB と仮定

注記:

- これは公式料金表に、こちらの推定トラフィックモデルを当てた試算である
- 特に Vercel はリージョン別単価なので幅で示す
- Cloudflare は static asset が無料・無制限で、Workers の request/CPU 課金が中心
- backend の D1 データ量はこの表には含めていない

### 9.2 軽量ダッシュボード想定（100KB / pageview）

| シナリオ | 想定 DAU | 月間 pageview / dynamic request | 月間転送量 | Cloudflare Workers | AWS Amplify | Netlify Pro (1 member) | Vercel Pro (1 paid seat) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Small | 300 | 90,000 | 8.8 GB | 約 $5.00 | 約 $0.60 | 約 $20.00 | 約 $20.04 - $20.06 |
| Medium | 3,000 | 900,000 | 87.9 GB | 約 $5.00 | 約 $11.65 | 約 $20.00 | 約 $20.35 - $20.56 |
| Large | 30,000 | 9,000,000 | 878.9 GB | 約 $6.20 | 約 $132.74 | 約 $198.91 | 約 $28.33 - $30.37 |

読み方:

- Small では Amplify がかなり安い
  - seat 課金がなく、15GB までは転送無料だから
- Medium では Cloudflare が最安帯に入る
  - Amplify は帯域課金が効き始める
- Large では Cloudflare がかなり強い
  - egress 系の伸び方が小さいため

### 9.3 ページが重い場合の感度

もし平均転送量が 500KB / pageview 程度まで増えると、Large シナリオは概ね次の水準になる。

- Cloudflare Workers: 約 `$6.20`
- AWS Amplify: 約 `$660.08`
- Netlify Pro: 約 `$902.03`
- Vercel Pro: 約 `$533.91 - $1210.06`

この差が出る理由は、Cloudflare が static asset と egress に強く、Amplify / Netlify / Vercel は帯域コストの影響を受けやすいためである。

### 9.4 この試算から言えること

- 「低トラフィック・軽量ダッシュボード」なら Amplify は十分有力
- 「一般公開アプリとして伸びる可能性がある」「将来 bundle や画像が増える」なら Cloudflare が安全
- Vercel は技術的な安心感は高いが、コスト面では low traffic でも seat 固定費が先に立つ
- Netlify はレビュー導線に価値がある場合に意味が出るが、純コストだけで押し切るのはやや弱い

---

## 10. 結論

このリポジトリでは、frontend の本番配備先は Cloudflare Workers に寄せるのが最も現実的である。

理由は次の3点に集約される。

1. 商用化時の固定費を抑えやすい
2. backend と同じ運用基盤に寄せられる
3. 現行の frontend 実装は、いまのところ Cloudflare 側の既知制約に強く当たりにくい

ただし、これは「Cloudflare が Next.js の絶対的最適解」という意味ではない。  
今回の repo ではコスト・運用集約・現行機能セットの3条件で最もバランスが良い、という判断である。

もし今後、以下が強くなった場合は再評価する。

- 最新 Next.js 機能を即座に使いたい
- Preview URL 中心のデザイン/QA レビューを強く回したい
- OpenNext 由来の差分を極小化したい
- 低トラフィックのまま長く運用し、seat 課金を避けつつ `next@15` pin を受け入れられる

その場合の再有力候補は、要件に応じて AWS Amplify / Vercel / Netlify である。

---

## 参考資料

### 公式ドキュメント

- Vercel Pricing
  - https://vercel.com/pricing
- Vercel Hobby Plan
  - https://vercel.com/docs/plans/hobby
- Vercel Limits
  - https://vercel.com/docs/limits
- Vercel Functions Usage and Pricing
  - https://vercel.com/docs/functions/usage-and-pricing/
- Vercel Fair Use Guidelines
  - https://vercel.com/docs/limits/fair-use-guidelines
- Vercel RBAC
  - https://vercel.com/docs/rbac
- Cloudflare Workers Pricing
  - https://developers.cloudflare.com/workers/platform/pricing/
- Cloudflare Workers Limits
  - https://developers.cloudflare.com/workers/platform/limits/
- Cloudflare Workers GitHub Actions
  - https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/
- Cloudflare Workers Builds / Git integration
  - https://developers.cloudflare.com/workers/ci-cd/builds/
  - https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/
- Cloudflare Pages Git integration
  - https://developers.cloudflare.com/pages/configuration/git-integration/
- Cloudflare account member management
  - https://developers.cloudflare.com/fundamentals/manage-members/manage/
- OpenNext Cloudflare overview
  - https://opennext.js.org/cloudflare
- Next.js Version 15 Upgrade Guide
  - https://nextjs.org/docs/app/guides/upgrading/version-15
- Next.js Version 16 Upgrade Guide
  - https://nextjs.org/docs/app/guides/upgrading/version-16
- Next.js Proxy file convention
  - https://nextjs.org/docs/app/api-reference/file-conventions/proxy
- Next.js Self-Hosting
  - https://nextjs.org/docs/pages/guides/self-hosting
- Netlify Next.js overview
  - https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/
- Netlify pricing
  - https://www.netlify.com/pricing/
- Netlify team members / reviewers
  - https://docs.netlify.com/manage/accounts-and-billing/team-management/manage-team-members/
- AWS Amplify Next.js SSR deployment
  - https://docs.aws.amazon.com/amplify/latest/userguide/deploy-nextjs-app.html
- AWS Amplify Next.js 11 migration / current supported version note
  - https://docs.aws.amazon.com/amplify/latest/userguide/update-app-nextjs-version.html
- AWS Amplify SSR supported features
  - https://docs.aws.amazon.com/amplify/latest/userguide/ssr-supported-features.html
- AWS Amplify pricing
  - https://aws.amazon.com/amplify/pricing/

---

## 付録A. CI/CD実装ロードマップ（スモールステップ前提）

### A.1 このロードマップの前提

一度に多くのコードを変更せず、各ステップで「意味のある最小単位」の変更だけを入れる。  
この ADR では、次の原則で進める。

- 1コミットで責務を増やしすぎない
- deploy 設定とアプリ本体の修正を、できるだけ同じコミットに混ぜない
- まず `CIで落とせる状態` を作ってから、自動 deploy を有効化する
- 無料枠を優先する間は、常設 staging を持たず `manual production deploy` を基本にする
- 自動化は `PR checks` と `manual deploy` を先に整え、`main -> production` 自動化は後回しにする
- backend と frontend は独立 deploy にするが、同時に切り替えない

### A.2 実装前に先に決めること

ここが曖昧だと workflow を書いても結局止まるので、先に決める。

補足:

- `workflow_dispatch` は GitHub Actions の「手動実行」トリガーを指す
- GitHub の Actions 画面からボタンで workflow を起動する運用
- つまり「push で自動 deploy はしないが、必要なタイミングで deploy はできる」状態

1. 初期の本番 URL をどうするか
   - 推奨: 当面は `workers.dev`
2. 常設 staging を作るか
   - 推奨: 作らない
3. GitHub Environments を分けるか
   - 推奨: `backend-production`, `frontend-production`
4. Cloudflare API Token を frontend/backend で分けるか
   - 推奨: 分ける
5. backend の production deploy 条件
   - 推奨: 当面は `workflow_dispatch`
6. frontend の production deploy 条件
   - 推奨: 当面は `workflow_dispatch`

### A.3 手動セットアップ項目（commit しない作業）

リポジトリ外の作業なので commit には含めないが、早めに揃える。

- GitHub Environments の作成
- GitHub Secrets / Variables の作成
- Cloudflare 側の production Worker の作成
- Cloudflare 側の secrets / vars の投入
- 必要なら DNS 設定（custom domain を追加する段階で実施）

想定される主な値:

- GitHub Secrets
  - `CLOUDFLARE_ACCOUNT_ID`
  - `CLOUDFLARE_API_TOKEN_BACKEND`
  - `CLOUDFLARE_API_TOKEN_FRONTEND`
- backend 用 variables / secrets
  - `BETTER_AUTH_SECRET`
  - `BETTER_AUTH_URL`
  - `CORS_ALLOWED_ORIGINS`
  - `COOKIE_DOMAIN`
  - D1 関連設定
- frontend 用 variables / secrets
  - `NEXT_PUBLIC_API_URL`
  - Cloudflare deploy 対象名

### A.4 実装ステップ一覧

以下の順番を推奨する。  
各ステップは、それ単体でレビュー・動作確認・ロールバックがしやすい粒度にしている。

#### Step 1. frontend の PR チェックに `next build` を追加する

目的:

- deploy 前に build 崩れを PR で検知できるようにする
- Cloudflare へ寄せる前に、現行 frontend CI の信頼性を上げる

主な変更対象:

- `.github/workflows/fe-code-check.yml`

この単位で止める理由:

- deploy にはまだ触れず、純粋に品質ゲートだけを強化できる
- 以後の frontend 変更の安全性が上がる

動作確認:

- ローカルで `apps/fumufumu-frontend` にて `pnpm build`
- PR で frontend workflow が通ること

コミットメッセージ案:

```text
ci: frontend PRチェックに next build を追加

- frontend 配備前に Next.js の build 崩れを PR で検知するため
- Cloudflare 移行前に既存CIの信頼性を先に上げるため
```

#### Step 2. backend の CORS / Auth URL / Cookie 設定を環境変数ベースに寄せる

目的:

- Vercel 固定の前提を外し、配備先変更に耐える backend にする
- frontend の production 切り替えを backend 側で受けられるようにする

主な変更対象:

- `apps/fumufumu-backend/src/index.ts`
- `apps/fumufumu-backend/src/auth.ts`
- `apps/fumufumu-backend/.env.example`
- `apps/fumufumu-backend/wrangler.jsonc`
- 必要なら型定義ファイル

この単位で止める理由:

- deploy workflow と切り離して、純粋な設定整理としてレビューできる
- ここが不安定だと frontend 切り替え時の不具合調査が難しくなる

動作確認:

- backend テストが通ること
- `localhost` と想定 production origin で CORS が意図通りかを確認
- `BETTER_AUTH_URL` と Cookie 設定でログインが壊れていないこと

コミットメッセージ案:

```text
refactor: backend のデプロイ先依存設定を環境変数ベースに整理

- frontend 配備先を Vercel 固定から外せるようにするため
- CORS と Better Auth の本番設定を環境ごとに安全に切り替えられるようにするため
```

#### Step 3. backend の manual deploy workflow を追加する

目的:

- いきなり `main` 自動 deploy にせず、workflow と secrets の妥当性を確認する
- backend だけ先に独立 deploy できるようにする

主な変更対象:

- 新規 `.github/workflows/be-deploy-manual.yml` もしくは既存 workflow の整理

この単位で止める理由:

- auto deploy に進む前に、GitHub Actions と Cloudflare 認証だけを検証できる
- backend の deploy 成否とアプリコードの問題を分離できる

動作確認:

- `workflow_dispatch` で production 向け deploy が通ること
- deploy 後に `/health` が 200 を返すこと

コミットメッセージ案:

```text
ci: backend の手動デプロイworkflowを追加

- 本番自動化の前に GitHub Actions と Cloudflare 認証の疎通を確認するため
- backend を単体で安全にデプロイ検証できるようにするため
```

#### Step 4. backend の production deploy を当面は manual のまま運用する

目的:

- 無料枠優先の間は、production deploy のタイミングを明示的に制御できるようにする
- backend と frontend の deploy 分離を、まずは manual 運用で成立させる

主な変更対象:

- docs / runbook
- 必要なら既存 workflow 名や説明の整理

この単位で止める理由:

- 自動化を急がず、deploy 判断を手元で持てる
- 個人開発での誤反映リスクを下げられる

動作確認:

- backend の deploy 手順が runbook と一致していること
- manual deploy で再現性があること

コミットメッセージ案:

```text
docs: backend デプロイを manual 運用前提で整理

- 無料枠優先の間は本番反映タイミングを手動で制御するため
- 個人開発での誤デプロイを避けつつ独立配備を進めるため
```

#### Step 5. frontend の Cloudflare build 基盤だけを追加する

目的:

- deploy する前に、Cloudflare 向け build が成立するかを確認する
- OpenNext / Wrangler まわりの問題を deploy 問題と分離する

主な変更対象:

- `apps/fumufumu-frontend/package.json`
- `apps/fumufumu-frontend/next.config.ts`
- `apps/fumufumu-frontend/wrangler.jsonc` もしくは Cloudflare 向け設定ファイル
- 必要なら OpenNext 関連設定ファイル

この単位で止める理由:

- frontend の本番切り替え前に、build のみを独立して検証できる
- ここで失敗した場合、workflow やドメイン設定を疑わずに済む

動作確認:

- ローカルで `next build`
- Cloudflare 向け build コマンドが通ること
- 可能なら deploy なしの dry-run まで確認

コミットメッセージ案:

```text
build: frontend の Cloudflare 向け build 基盤を追加

- 本番デプロイ前に Cloudflare target の build 成否を独立確認するため
- OpenNext 由来の問題を deploy 設定と切り分けて検証するため
```

#### Step 6. frontend の manual deploy workflow を production 向けに追加する

目的:

- frontend の Cloudflare deploy を production へ手動反映できるようにする
- 自動化前に login / protected route / API 接続を本番同等条件で確認する

主な変更対象:

- 新規 `.github/workflows/fe-deploy-manual.yml`
- 必要なら frontend production 用の variables 参照

この単位で止める理由:

- production 自動 deploy に進む前に、手動反映で安全に運用できる
- frontend 側だけの Cloudflare 配備を独立して確認できる

動作確認:

- `workflow_dispatch` で production deploy が通ること
- production URL の `/` と `/login` が表示できること
- 未ログインで保護ページへ行くと login へ遷移すること
- ログイン後に API 連携が動くこと

コミットメッセージ案:

```text
ci: frontend の手動デプロイworkflowを追加

- 無料枠優先の間は本番反映を手動で制御するため
- 認証と API 接続を production 条件で安全に確認できるようにするため
```

#### Step 7. frontend / backend の production 環境値を確定し、実運用ドメイン前提へ寄せる

目的:

- 当面は `workers.dev` 前提で production 環境値を確定する
- localhost と production の差分を最小化する
- 将来 custom domain を追加するための切り替えポイントを明確にする

主な変更対象:

- backend の allowlist / auth URL / cookie domain 関連
- frontend の `NEXT_PUBLIC_API_URL`
- 必要なら docs / runbook

この単位で止める理由:

- 実際の運用 URL と secrets の話を deploy workflow から切り離せる
- 問題が起きた時に「deploy 設定の問題」か「環境値の問題」かを分けて見られる

動作確認:

- production `workers.dev` URL で login / logout / protected route が通ること
- production 用の値を review できること

コミットメッセージ案:

```text
chore: frontend と backend の本番向け環境値を整理

- 当面は workers.dev 前提で本番環境値を確定するため
- localhost と production の差分を減らして安全に反映するため
```

#### Step 8. production deploy の自動化は Phase 2 として見送る

目的:

- continuous delivery までは整えつつ、continuous deployment は後回しにする
- 無料枠優先と個人開発の運用負荷に合わせる

主な変更対象:

- docs / runbook
- 必要になった時点で workflow 追加

この単位で止める理由:

- main merge = 即本番反映 を避けられる
- 変更量と誤反映リスクを抑えられる

動作確認:

- manual deploy 運用で十分回ること
- 自動化が本当に必要なタイミングを判断できること

コミットメッセージ案:

```text
docs: 本番デプロイ自動化を Phase 2 扱いに整理

- 無料枠優先の間は continuous delivery までに留めるため
- 個人開発での本番反映を手動確認込みで進められるようにするため
```

#### Step 9. deploy 後 smoke test と失敗時の運用手順を追加する

目的:

- deploy 成功とアプリ正常を区別できるようにする
- rollback 判断を早くする

主な変更対象:

- workflow 内の post-deploy check
- 必要なら `docs/` 配下の runbook

この単位で止める理由:

- 本番 deploy 完成後に足すことで、必要な check が見えやすい
- 監視や rollback を deploy 本体と分けてレビューできる

動作確認:

- `/`, `/login`, 保護ページの redirect など最低限の smoke test が通ること
- 失敗時に workflow が落ちること

コミットメッセージ案:

```text
ci: デプロイ後の smoke test を追加

- デプロイ成功とアプリ正常を分けて確認できるようにするため
- 本番障害時の検知と切り戻し判断を早くするため
```

#### Step 10. Preview Deploy は Phase 2 として別途導入する

目的:

- 本番 manual deploy 運用が安定してから preview 導線を追加する
- 認証付きアプリの preview 複雑性を後回しにする

主な変更対象:

- preview 用 workflow
- preview 用 env / domain / cleanup

この単位で止める理由:

- 初期導入コストが高く、今すぐの必須要件ではない
- 先に本番安定を優先した方がよい

動作確認:

- PR ごとに preview URL が生成されること
- preview でも認証導線が破綻しないこと
- cleanup が回ること

コミットメッセージ案:

```text
ci: frontend preview デプロイを追加

- 本番運用が安定した後に UI レビュー導線を強化するため
- 認証付きアプリでも PR 単位で確認できるようにするため
```

#### Step 11. 一般公開前に custom domain を追加する

目的:

- `workers.dev` から公開用 URL へ切り替える
- auth / CORS / cookie を正式ドメイン前提に整える

主な変更対象:

- Cloudflare の custom domain 設定
- DNS 設定
- `BETTER_AUTH_URL`
- `NEXT_PUBLIC_API_URL`
- 必要なら `COOKIE_DOMAIN`

この単位で止める理由:

- 初期CI/CDと切り離して、公開前の仕上げとして扱える
- ドメイン起因の問題を本体の build / deploy 問題と分けて確認できる

動作確認:

- custom domain で `/`, `/login`, 保護ページが動くこと
- login / logout / session 維持が壊れていないこと
- 旧 `workers.dev` から新 URL への移行手順が明確であること

コミットメッセージ案:

```text
chore: 公開前の custom domain 切り替え手順を追加

- 初期実装は workers.dev で進めつつ公開前に正式URLへ移行するため
- auth と CORS を正式ドメイン前提で安全に整えるため
```

### A.5 実装順の要約

最短で安全に進めるなら、順番は次の通り。

1. `frontend build check`
2. `backend env refactor`
3. `backend manual deploy`
4. `backend manual runbook finalize`
5. `frontend cloudflare build`
6. `frontend manual deploy (production)`
7. `production env finalize`
8. `auto deploy defer`
9. `smoke test / rollback`
10. `preview deploy`
11. `custom domain cutover`

### A.6 この順番にしている理由

- backend はすでに Cloudflare 前提なので、先に deploy 分離を完成させやすい
- frontend は build 成立確認をした上で、無料枠優先の間は manual production deploy から始める方が安全
- 認証と CORS は deploy より前に整えないと、原因切り分けが難しくなる
- custom domain は公開前の仕上げとして後から足せる
- preview は便利だが、初期の本質課題ではない

### A.7 実装中に確認したいこと

次は実装前に確認したい。未確定なら、推奨値で進めるのがよい。

1. staging 環境は作る前提でよいか
   - 推奨: `no`
2. frontend / backend で GitHub Environment を分けるか
   - 推奨: `yes`
3. Cloudflare API Token は frontend / backend で分けるか
   - 推奨: `yes`
4. preview deploy は Phase 2 扱いでよいか
   - 推奨: `yes`
5. production deploy は当面 `workflow_dispatch` の manual 運用でよいか
   - 推奨: `yes`
