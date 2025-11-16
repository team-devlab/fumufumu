import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { users } from "../src/db/schema/user";
import { consultations } from "../src/db/schema/consultations";

const sqlite = new Database(".wrangler/state/v3/d1/miniflare-D1DatabaseObject/390251f9042a6eeca3249468e2dcce0fba1d1e8e4befe411979c8f7b0e66446b.sqlite");
const db = drizzle(sqlite);

async function seed() {
	console.log("🌱 Starting seed...");

	// 1. ユーザーデータの投入
	console.log("📝 Inserting users...");
	await db.insert(users).values([
		{
			name: "taro yamada",
			disabled: false,
		},
	]);

	const allUsers = await db.select().from(users);
	console.log(`✅ ${allUsers.length} users created`);

	// 2. 相談データの投入
	console.log("📝 Inserting consultations...");
	await db.insert(consultations).values([
		{
			title: "エンジニア職種：開発orマネジメント、どちらを目指すべき？",
			body: "キャリア設計で悩んでいます。将来的に自分がどちらの方向に進むべきか迷っています。開発のスペシャリストとして技術を極めるか、マネジメントの道に進むか、それぞれのメリット・デメリットを教えていただけないでしょうか。",
			draft: false,
			authorId: allUsers[0].id,
		},
		{
			title: "AWS環境構築におけるベストプラクティス",
			body: "ステージ環境と本番環境を分離した構成で悩んでいます。VPCの設計、セキュリティグループの設定、RDSのマルチAZ構成など、推奨される構成を教えてください。",
			draft: true,
			authorId: allUsers[0].id,
		},
		{
			title: "TypeScriptの型定義で困っています",
			body: "ジェネリクスを使った型定義がうまくいきません。複雑な型の組み合わせ方や、conditional typesの使い方について教えてください。",
			draft: false,
			solvedAt: new Date("2025-11-10T15:30:00Z"),
			authorId: allUsers[0].id,
		},
	]);

	const allConsultations = await db.select().from(consultations);
	console.log(`✅ ${allConsultations.length} consultations created`);

	console.log("\n🎉 Seed completed!");
	console.log("\n📊 Summary:");
	console.log(`  - Users: ${allUsers.length}`);
	console.log(`  - Consultations: ${allConsultations.length}`);
}

seed()
	.catch((error) => {
		console.error("❌ Seed failed:", error);
		process.exit(1);
	})
	.finally(() => {
		sqlite.close();
	});

