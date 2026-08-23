# fumufumu

エンジニア向けのキャリア相談プラットフォーム。悩みを匿名で投稿し、他の利用者からアドバイスをもらえる。投稿は公開前に運営が内容を確認する。

本番: <https://www.fumufumu.workers.dev>

## 構成

リポジトリは2つのアプリからなり、それぞれ独立してデプロイする。

| ディレクトリ | 内容 |
| :---- | :---- |
| `apps/fumufumu-frontend/` | 画面。Next.js（App Router）を OpenNext 経由で Cloudflare Workers に載せる。Tailwind CSS、Zustand |
| `apps/fumufumu-backend/` | API。Cloudflare Workers + Hono。データは D1（Drizzle ORM）、認証は Better Auth |

ブラウザから見て同一のドメインになるよう、フロントエンドの Worker が `/api/*` をバックエンドの Worker へ内部で転送している（経緯は `docs/design/adr/008-frontend-deployment-platform-and-split-cicd.md`）。

パッケージマネージャーは pnpm。リンターとフォーマッタは Biome（現在の対象はフロントエンドのみ）。

各ライブラリのバージョンは各アプリの `package.json` を参照する。README には書かない（更新のたびに古くなり、古い記述は書いていないより誤解を招くため）。

## ローカルで動かす

**フロントエンドとバックエンドの両方を起動する。** ログインや相談の読み書きはバックエンドを呼ぶため、フロントエンドだけではログイン画面から先に進めない。

### バックエンド（ポート 8787）

```bash
cd apps/fumufumu-backend
pnpm install
cp .dev.vars.example .dev.vars                        # 認証などの環境変数。実値を入れる
cp wrangler.local.jsonc.example wrangler.local.jsonc  # Cloudflare の account_id と D1 の設定
pnpm local:migration                                  # ローカルの D1 にテーブルを作る
pnpm dev
```

### フロントエンド（ポート 3000）

```bash
cd apps/fumufumu-frontend
pnpm install
cp .env.local.example .env.local
pnpm dev
```

<http://localhost:3000> を開く。

タグは相談の投稿に必須なので、ローカルの D1 が空のときは追加しておく。

```bash
cd apps/fumufumu-backend
pnpm tags:add キャリア 人間関係 健康 お金 学び
```

## テストと lint

```bash
cd apps/fumufumu-frontend && pnpm test    # 画面とロジックのテスト
cd apps/fumufumu-frontend && pnpm lint    # Biome。書き込みは pnpm format
cd apps/fumufumu-backend && pnpm test     # API のテスト（ローカルの Workers 実行環境を使う）
```

## ドキュメント

- `docs/README.md` — docs の案内と設計原則
- `docs/design/adr/` — 設計判断の記録。なぜその形にしたかはここにある
- `docs/projects/` — 進行中の計画
- `CLAUDE.md` — このリポジトリでコードを書くときの決まり（`useEffect` を避ける方針など）
- `apps/fumufumu-frontend/README.md` / `apps/fumufumu-backend/README.md` — デプロイ手順と環境変数
