import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// OpenNext for Cloudflare の最小設定。
// キャッシュやキューを使う場合は incrementalCache / queue / tagCache を追加する。
// 参考: https://opennext.js.org/cloudflare/get-started
export default defineCloudflareConfig({});
