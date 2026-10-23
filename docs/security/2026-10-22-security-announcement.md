# 2026年10月22日のセキュリティの告知の点検

- 作成日：2026-10-23
- 対象：main（`0329e07`）
- 調べたもの：リポジトリの実物（lock・設定・`node_modules` の中身・手元のビルドの出力）、npm の公開情報（`npm view`）、GitHub の勧告データベースと undici の勧告、GitHub の API で読んだリポジトリの設定と CI の記録

## 結論

- **本番の2つの Worker には、告知の対象の部品が入らない。** どちらも Cloudflare の workerd（Workers の実行環境）で動き、Node は動かない。undici も、本番の依存には入っていない。
- **告知の基準を満たしていないのは、開発・テスト・デプロイの道具の中の undici。** backend が 7.29.0 と 7.14.0、frontend が 7.24.8 で、どれも基準の 7.30.1 より古い。**さらに 7.29.1 より古いので、2026-09-29 に登録済みの勧告（high を含む）にも当たる。**
- **いま直せるのは一部だけ。** wrangler を 4.152.0 に上げると、backend と frontend の wrangler の分は 7.29.1 になる（2026-09-29 の分は閉じる）。告知の 7.30.1 を積んだ wrangler は、まだ公開されていない。テストの道具の分（7.14.0）は、道具の側が古い wrangler を固定している。
- **GitHub の脆弱性の通知が、実際には働いていない。** 設定は有効を返すのに、通知は過去も含めて0件で、依存の一覧（依存グラフ）にファイルが1つも載っていない。
- Python・PHP・curl・Apache httpd・OpenSSL を、このリポジトリは使っていない（該当するファイルが無い）。

## 告知の基準

| 対象 | 修正された版 |
| --- | --- |
| Node.js | 22.23.4・24.22.1・26.12.1。20 以前と 23 はサポートが終わっているので 24 へ移す |
| undici（Node の HTTP の部品） | 6.29.1・7.30.1・8.12.2 |
| Python の証明書の一覧（認証局 eMudhra の中間証明書の鍵が漏れた件） | certifi 2026.10.19、pip 26.2.2、uv 0.13.4 |
| PHP | 8.5.12・8.4.27・8.3.36・8.2.35 |
| curl・Apache httpd・OpenSSL | curl 8.23.0、httpd 2.4.69、OpenSSL 4.0.3・3.6.5・3.5.9 |

## どこで何が動くか

| 場面 | 動く場所 | Node・undici |
| --- | --- | --- |
| backend の本番 | Cloudflare Workers（Hono・D1・Better Auth。`nodejs_compat` で Node の API の一部を workerd が真似る） | Node は動かない。本番の依存（hono・better-auth・drizzle-orm・zod・`@hono/zod-validator`）に undici は無い |
| frontend の本番 | Cloudflare Workers（OpenNext で組んだ Next 16.2.6） | Node は動かない。下の「Next の同梱の undici」 |
| 手元のデプロイ | 各自の手元（`DEPLOY_APPROVED=1 pnpm run deploy`、`pnpm deploy:cf`） | 手元の Node と、wrangler の中の undici |
| backend の PR ごとの確認用デプロイ | GitHub Actions（`be-health-check-ci.yml`）。Cloudflare の API の鍵を使って、確認用の Worker を出して消す | runner に入っている Node 24 系と、lock の wrangler 4.125.0 |
| テスト | 手元と GitHub Actions（`be-test.yml`）。`@cloudflare/vitest-pool-workers` が workerd を手元で動かす | wrangler 4.53.0 と miniflare 4.20251202.1 |

## 項目ごとの判定

確度の「高」は実物（lock・設定・コード・CI の記録）を直接見たもの、「中」はそこからの推論。

| 項目 | 現在の状態 | 判定 | 推奨する対応 | 確度 |
| --- | --- | --- | --- | --- |
| undici（backend の wrangler） | 7.29.0（wrangler 4.125.0 の本体に埋め込まれたものと、miniflare 5.20260820.0-alpha が持ち込むもの） | 要対応 | wrangler を 4.152.0 に上げて 7.29.1 にする。7.30.1 を積んだ wrangler が出たら、もう一度上げる | 高 |
| undici（frontend の wrangler） | 7.24.8（wrangler 4.94.0 と miniflare 4.20260521.0） | 要対応 | 同上。いまの `@opennextjs/cloudflare` 1.19.11 は wrangler `^4.86.0` を求めるので、4.152.0 はその範囲に入る | 高 |
| undici（backend のテストの道具） | 7.14.0（`@cloudflare/vitest-pool-workers` 0.10.14 が wrangler 4.53.0 を固定） | 要対応（道具の側の更新待ち） | 最新の 0.23.0 も wrangler 4.124.0（undici 7.29.0）を固定し、しかも vitest 4.1 以上を求める。上げるなら vitest 3 → 4 の移行と合わせた別の作業になる | 高 |
| undici（Next の同梱） | Next 16.2.6 の `next/dist/compiled/@edge-runtime/primitives/load.js` に 6.21.0。Next が edge runtime（軽量な実行環境）を手元で模すための部品 | 対応不要 | 次に `pnpm build:cf` したときに、下の確かめ方で入っていないことを見直す | 中（2026-08-23 の手元のビルドの出力で、本番の入口 `.open-next/server-functions/default/handler.mjs` は `@edge-runtime/cookies` しか読まず、undici を含む部品を読まない） |
| 手元の Node | 版の指定ファイル（`.node-version`・`.nvmrc`）が無い。frontend の `engines` は `>=20.0.0` | 要対応（各自） | 24.22.1 以上にする。デプロイは手元から Cloudflare の API へつなぐので、ここが古いと漏れた証明書を信じてしまう。`engines` を `>=24` にそろえるのは任意 | 高 |
| CI の Node | 3つのワークフローとも `node-version: 24`。runner に入っている 24 系をそのまま使う（2026-08-23 の実行では 24.19.0） | 対応不要（見立て） | runner のイメージの更新で上がる。確認用デプロイは Cloudflare の API の鍵を使うので、確実にしたいなら `check-latest: true` を足す | 高（版）・中（判定） |
| GitHub の通知 | Dependabot alerts（依存の脆弱性が公表されたら知らせる仕組み）は API で有効を返すが、通知は過去も含め0件。依存グラフに載っているファイルも0件。直した版の PR を出す Dependabot security updates は無効。`.github/dependabot.yml` は無い | 要確認 | 設定の画面の「Advanced Security」で Dependency graph の状態を確かめる。7.14.0 は登録済みの high の勧告（GHSA-rfgv-xxqx-mfg5）に当たるのに、通知が来ていない | 高 |
| Python・PHP・curl・httpd・OpenSSL・Docker | 該当するファイルが無い | 対応不要 | — | 高 |

## 告知の undici の勧告が、ここで成り立つか

告知の基準（7.30.1）に関わる undici の勧告は8件ある。wrangler（4.125.0・4.94.0・4.53.0）と miniflare の中で undici のどの機能を使っているかを、`node_modules` の中のコードで検索して確かめた。

| 勧告 | 内容 | ここで成り立つか |
| --- | --- | --- |
| GHSA-2m5v-pch6-74hx（high） | 証明書の確かめ方を差し替える設定（`checkServerIdentity`）が、黙って捨てられる | 成り立たない。3つの wrangler のコードに `checkServerIdentity` が無い。miniflare にある3か所は、手元のデータベースの接続を中継する処理で、undici を通らない |
| GHSA-4w7w-5xrc-9h26（high） | 共有のキャッシュに、別のサイトの応答が混ざる | 成り立たない。キャッシュの仕組み（`interceptors.cache`）を呼んでいない |
| GHSA-qrxm-fqhp-jwvm（high）、GHSA-xjj6-f33q-929c（high）、中程度の4件（GHSA-4qv8-2p9j-2685・GHSA-f72v-6w45-q472・GHSA-9fm3-97px-rjf6・GHSA-55wc-3pg8-jfw6） | 悪意のあるサーバーの応答で、処理が落ちる・メモリを食う・中身の改ざんの確かめ（SRI）をすり抜ける | 悪意のあるサーバーにつないだときだけ。つなぐ先は Cloudflare の API と、手元で動く workerd。成り立っても、影響は手元の道具と CI に留まる |

確度：中。勧告の本文（undici の公式の勧告）と、コードの文字列の検索からの推論で、実際に攻撃を試してはいない。2026-09-29 に登録された勧告（7.29.1 で修正）は、wrangler を上げれば閉じるので、ここでは一つずつ当てていない。

**告知の勧告は、GitHub の勧告データベースにまだ載っていない**（npm の undici の登録は 2026-09-29 の分が最新）。通知が働くようになっても、載るまでは出ない。

## package.json の overrides を使わない理由

overrides（間接依存の版を、親の指定を越えて固定する設定）で undici を 7.30.1 にしても、**wrangler 自身の通信は直らない。** wrangler は undici のコードを本体（`wrangler-dist/cli.js`）に埋め込んでいるので、差し替わるのは miniflare が読む外側の undici だけである。しかも miniflare は undici の版を1つに固定しており、違う版を入れると壊れるおそれがある。

## この資料で調べていないもの

- Next.js そのものの脆弱性（frontend は 16.2.6）。今回の告知の対象ではない
- wrangler を 4.152.0 に上げたあとに、`pnpm dev`・テスト・`pnpm build:cf`・確認用デプロイが通るか

## 見直す条件

- **7.30.1 以上を積んだ wrangler が公開されたとき。** 次の2つで確かめる。どちらも 7.30.1 以上になったら、wrangler を上げる

  ```bash
  npm view wrangler@latest devDependencies.undici dependencies.miniflare
  npm view miniflare@<上で出た版> dependencies.undici
  ```

- **`@cloudflare/vitest-pool-workers` が新しい wrangler を使う版を出したとき**（`npm view @cloudflare/vitest-pool-workers@latest dependencies.wrangler`）
- **GitHub の通知が働くようになったとき。** 出てきた通知を、この資料の判定と突き合わせる
- **frontend を作り直したとき。** Next の同梱の undici が本番の入口から読まれていないかを、次で確かめる

  ```bash
  grep -o '[A-Za-z0-9/._@-]*edge-runtime[A-Za-z0-9/._@-]*' apps/fumufumu-frontend/.open-next/server-functions/default/handler.mjs | sort -u
  ```
