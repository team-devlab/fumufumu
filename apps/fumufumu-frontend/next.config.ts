import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;

// OpenNext for Cloudflare の dev bindings を解決するため、開発時に呼び出す。
// 本番ビルド側の挙動には影響しない。
// 参考: https://opennext.js.org/cloudflare/get-started
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();
