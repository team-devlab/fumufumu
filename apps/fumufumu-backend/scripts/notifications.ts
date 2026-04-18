import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import type { DbInstance } from "@/index";
import { createNotificationService } from "@/services/service.factory";
import * as authSchema from "@/db/schema/auth";
import * as userSchema from "@/db/schema/user";
import * as consultationsSchema from "@/db/schema/consultations";
import * as advicesSchema from "@/db/schema/advices";
import * as tagsSchema from "@/db/schema/tags";
import * as contentChecksSchema from "@/db/schema/content-checks";

type NotificationCommand =
	| {
		kind: "send-approved-unnotified";
		limit: number;
	}
	| {
		kind: "resend";
		targetType: "consultation" | "advice";
		targetId: number;
	};

const DEFAULT_LIMIT = 100;
const D1_LOCAL_DB_DIR = ".wrangler/state/v3/d1/miniflare-D1DatabaseObject";
const DEFAULT_RESEND_TIMEOUT_MS = 8000;
const NOTIFICATIONS_ENV_FILE = ".env.notifications";

const schema = {
	...authSchema,
	...userSchema,
	...consultationsSchema,
	...advicesSchema,
	...tagsSchema,
	...contentChecksSchema,
};

/**
 * CLIの使い方と必要な環境変数を表示する。
 */
function printUsage() {
	console.log(`Usage:
  pnpm exec tsx scripts/notifications.ts send-approved-unnotified [--limit <number>]
  pnpm exec tsx scripts/notifications.ts resend --target-type <consultation|advice> --target-id <number>

Local env file (optional):
  ./${NOTIFICATIONS_ENV_FILE} (auto loaded when exists)

Required env:
  RESEND_API_KEY
  RESEND_FROM_EMAIL

Optional env:
  APP_BASE_URL
  RESEND_ENDPOINT
  RESEND_TIMEOUT_MS
`);
}

/**
 * クォート付きの環境変数値をプレーン文字列へ変換する。
 */
function unquoteEnvValue(value: string): string {
	if (
		(value.startsWith('"') && value.endsWith('"')) ||
		(value.startsWith("'") && value.endsWith("'"))
	) {
		return value.slice(1, -1);
	}
	return value;
}

/**
 * `.env.notifications` を読み込み、未設定の process.env に反映する。
 */
function loadNotificationsEnvFile() {
	const envPath = resolve(process.cwd(), NOTIFICATIONS_ENV_FILE);
	if (!existsSync(envPath)) {
		return;
	}

	const content = readFileSync(envPath, "utf8");
	for (const rawLine of content.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line || line.startsWith("#")) {
			continue;
		}

		const normalizedLine = line.startsWith("export ")
			? line.slice("export ".length).trim()
			: line;
		const equalIndex = normalizedLine.indexOf("=");
		if (equalIndex <= 0) {
			continue;
		}

		const key = normalizedLine.slice(0, equalIndex).trim();
		if (!key || process.env[key]?.trim()) {
			continue;
		}

		const rawValue = normalizedLine.slice(equalIndex + 1).trim();
		process.env[key] = unquoteEnvValue(rawValue);
	}
}

/**
 * 正の整数オプションを検証し、数値として返す。
 */
function parsePositiveInt(raw: string, optionName: string): number {
	const value = Number(raw);
	if (!Number.isInteger(value) || value <= 0) {
		throw new Error(`${optionName} は 1 以上の整数を指定してください: ${raw}`);
	}
	return value;
}

/**
 * `--option value` 形式の値を引数配列から取得する。
 */
function parseOptionValue(args: string[], optionName: string): string | undefined {
	const index = args.indexOf(optionName);
	if (index === -1) {
		return undefined;
	}
	const value = args[index + 1];
	if (!value || value.startsWith("--")) {
		throw new Error(`${optionName} の値が不足しています`);
	}
	return value;
}

/**
 * CLI引数を NotificationCommand 型へ解釈する。
 */
function parseCommand(argv: string[]): NotificationCommand {
	const [command, ...args] = argv;

	if (!command || command === "help" || command === "--help") {
		printUsage();
		process.exit(0);
	}

	if (command === "send-approved-unnotified") {
		const rawLimit = parseOptionValue(args, "--limit");
		const limit = rawLimit ? parsePositiveInt(rawLimit, "--limit") : DEFAULT_LIMIT;
		return { kind: "send-approved-unnotified", limit };
	}

	if (command === "resend") {
		const targetTypeRaw = parseOptionValue(args, "--target-type");
		const targetIdRaw = parseOptionValue(args, "--target-id");

		if (!targetTypeRaw) {
			throw new Error("--target-type は必須です");
		}
		if (targetTypeRaw !== "consultation" && targetTypeRaw !== "advice") {
			throw new Error(`--target-type は consultation か advice を指定してください: ${targetTypeRaw}`);
		}
		if (!targetIdRaw) {
			throw new Error("--target-id は必須です");
		}

		return {
			kind: "resend",
			targetType: targetTypeRaw,
			targetId: parsePositiveInt(targetIdRaw, "--target-id"),
		};
	}

	throw new Error(`未知のコマンドです: ${command}`);
}

/**
 * ローカルD1の最新SQLiteファイルのパスを解決する。
 */
function resolveLocalDbPath() {
	const dbDir = resolve(process.cwd(), D1_LOCAL_DB_DIR);
	if (!existsSync(dbDir)) {
		throw new Error(
			`ローカルD1の保存先が見つかりません: ${dbDir}
先に backend を起動するか、migration を適用してください。`,
		);
	}

	const sqliteFiles = readdirSync(dbDir)
		.filter((fileName) => fileName.endsWith(".sqlite"))
		.map((fileName) => ({
			fullPath: join(dbDir, fileName),
			mtimeMs: statSync(join(dbDir, fileName)).mtimeMs,
		}))
		.sort((a, b) => b.mtimeMs - a.mtimeMs);

	if (sqliteFiles.length === 0) {
		throw new Error(
			`ローカルD1のSQLiteファイルが見つかりません: ${dbDir}
先に backend を起動するか、migration を適用してください。`,
		);
	}

	return sqliteFiles[0].fullPath;
}

/**
 * 必須環境変数を取得し、未設定時はエラーにする。
 */
function readRequiredEnv(name: string): string {
	const value = process.env[name]?.trim();
	if (!value) {
		throw new Error(`環境変数 ${name} は必須です`);
	}
	return value;
}

/**
 * 送信タイムアウト値を環境変数から取得する。
 */
function readOptionalTimeoutMs() {
	const raw = process.env.RESEND_TIMEOUT_MS?.trim();
	if (!raw) {
		return DEFAULT_RESEND_TIMEOUT_MS;
	}
	return parsePositiveInt(raw, "RESEND_TIMEOUT_MS");
}

/**
 * コマンド種別に応じて通知処理を実行し、結果を標準出力へ表示する。
 */
async function runCommand(command: NotificationCommand) {
	const localDbPath = resolveLocalDbPath();
	const sqlite = new Database(localDbPath);
	const db = drizzle(sqlite, { schema }) as unknown as DbInstance;

	try {
		const service = createNotificationService(db, {
			resendApiKey: readRequiredEnv("RESEND_API_KEY"),
			resendFrom: readRequiredEnv("RESEND_FROM_EMAIL"),
			appBaseUrl: process.env.APP_BASE_URL?.trim() || undefined,
			resendEndpoint: process.env.RESEND_ENDPOINT?.trim() || undefined,
			timeoutMs: readOptionalTimeoutMs(),
		});

		if (command.kind === "send-approved-unnotified") {
			const summary = await service.sendPending(command.limit);
			console.log(
				`send-approved-unnotified completed: target=${summary.targetCount}, attempted=${summary.attemptedCount}, sent=${summary.sentCount}, failed=${summary.failedCount}, failedTargetIds=[${summary.failedTargetIds.join(",")}]`,
			);
			if (summary.failedCount > 0) {
				process.exitCode = 1;
			}
			return;
		}

		const result = await service.resend(command.targetType, command.targetId);
		if (result.sent) {
			console.log(
				`resend completed: sent=true, targetType=${result.targetType}, targetId=${result.targetId}`,
			);
			return;
		}

		console.error(
			`resend failed: sent=false, targetType=${result.targetType}, targetId=${result.targetId}, reason=${result.reason}`,
		);
		process.exitCode = 1;
	} finally {
		sqlite.close();
	}
}

/**
 * エントリーポイント。環境読込・引数解析・実行を順に行う。
 */
async function main() {
	try {
		loadNotificationsEnvFile();
		const command = parseCommand(process.argv.slice(2));
		await runCommand(command);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(`❌ ${message}`);
		printUsage();
		process.exit(1);
	}
}

void main();
