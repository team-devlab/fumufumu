// OpenNext for Cloudflare の generated worker をラップする custom worker。
//
// 目的: `/api/*` のリクエストを Cloudflare Service Binding 経由で backend Worker
// (`fumufumu-worker`) に転送し、ブラウザから見て frontend と backend を同一 origin にする。
//
// 背景:
//   - `*.workers.dev` は Public Suffix List に登録されている (Cloudflare 提出)。
//   - そのため `Domain=fumufumu.workers.dev` のような親ドメイン指定 Cookie は
//     ブラウザに拒否され、frontend / backend が別サブドメインだと Cookie 共有できない。
//   - Custom domain 移行 (実装計画 07 の Step 10) で根本解決する想定だが、
//     ドメイン代を避けつつ機能完全動作させるため、Service Binding 経由の
//     同一 origin 化を中間解として採用する。
//
// 詳細: Issue #126 / ADR 008 / 実装計画 07 の Phase 1.5

// `.open-next/worker.ts` は `opennextjs-cloudflare build` で生成されるため、
// TypeScript compile 時点では存在しないことがある。
// @ts-expect-error generated at build time
import { default as openNextHandler } from "./.open-next/worker.js";

// Cloudflare の Fetcher 型を structural に定義する。
// @cloudflare/workers-types を `/// <reference />` で取り込むと、
// global の Response / Request 型が Next.js 側のコード (例: lib/api/client.ts の
// `response.json()` の戻り値型) と衝突するため、ここでは依存を持たず必要な構造だけ書く。
interface ServiceBinding {
  fetch(request: Request): Promise<Response>;
}

interface CFExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

interface Env {
  ASSETS: ServiceBinding;
  BACKEND: ServiceBinding;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: CFExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    // `/api/*` は Service Binding 経由で backend Worker に転送。
    // 同一 Cloudflare サーバー内通信のため latency ≈ 0、追加 request 課金もなし。
    if (url.pathname.startsWith("/api/")) {
      return env.BACKEND.fetch(request);
    }

    // それ以外 (Next.js のページ / static asset) は OpenNext の generated handler に委ねる。
    return openNextHandler.fetch(request, env, ctx);
  },
};
