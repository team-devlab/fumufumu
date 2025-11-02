import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react'; // ReactのJSXを処理するために必要

export default defineConfig({
	plugins: [react()],
	test: {
		environment: 'jsdom', // DOM環境をシミュレート
		globals: true, // describe, it, expectなどをグローバルにする
		setupFiles: ['./vitest.setup.ts'], // 各テストファイルが実行される前にロードするファイル
		css: false, // CSSのインポートを無視
		// tsconfigのエイリアス @/* を設定（Next.jsと一致させる）
		alias: {
			'@/': new URL('./src/', import.meta.url).pathname,
		},
	},
});
