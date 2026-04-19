import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

type NotificationApiCommand = {
	kind: "resend";
	targetType: "consultation" | "advice";
	targetId: number;
};

type ResendResponse = {
	sent: boolean;
	targetType: "consultation" | "advice";
	targetId: number;
	reason?: string;
};

const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_API_BASE_URL = "http://127.0.0.1:8787";
const DEV_VARS_FILE = ".dev.vars";

/**
 * CLIの使い方と必要な環境変数を表示する。
 */
function printUsage() {
	console.log(`Usage:
  pnpm exec tsx scripts/notifications-api.ts resend --target-type <consultation|advice> --target-id <number>

Required env:
  NOTIFICATION_INTERNAL_TOKEN

Optional env:
  NOTIFICATION_API_BASE_URL (default: ${DEFAULT_API_BASE_URL})
  NOTIFICATION_API_TIMEOUT_MS
  (auto load from ./${DEV_VARS_FILE} when exists)
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
 * `.dev.vars` を読み込み、未設定の process.env に反映する。
 */
function loadDevVarsFile() {
	const envPath = resolve(process.cwd(), DEV_VARS_FILE);
	if (!existsSync(envPath)) {
		return;
	}

	const content = readFileSync(envPath, "utf8");
	for (const rawLine of content.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line || line.startsWith("#")) {
			continue;
		}

		const equalIndex = line.indexOf("=");
		if (equalIndex <= 0) {
			continue;
		}

		const key = line.slice(0, equalIndex).trim();
		if (!key || process.env[key]?.trim()) {
			continue;
		}

		const rawValue = line.slice(equalIndex + 1).trim();
		process.env[key] = unquoteEnvValue(rawValue);
	}
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
 * CLI引数を NotificationApiCommand 型へ解釈する。
 */
function parseCommand(argv: string[]): NotificationApiCommand {
	const [command, ...args] = argv;

	if (!command || command === "help" || command === "--help") {
		printUsage();
		process.exit(0);
	}

	if (command !== "resend") {
		throw new Error(`未知のコマンドです: ${command}`);
	}

	if (args.includes("--help")) {
		printUsage();
		process.exit(0);
	}

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

/**
 * 必須環境変数を取得し、未設定時はエラーにする。
 */
function readRequiredEnv(name: "NOTIFICATION_INTERNAL_TOKEN"): string {
	const value = process.env[name]?.trim();
	if (!value) {
		throw new Error(`環境変数 ${name} は必須です`);
	}
	return value;
}

/**
 * 呼び出し先APIのベースURLを取得する。
 */
function readApiBaseUrl(): string {
	const value = process.env.NOTIFICATION_API_BASE_URL?.trim();
	if (!value) {
		return DEFAULT_API_BASE_URL;
	}
	return value;
}

/**
 * 呼び出し先URLを正規化して返す。
 */
function normalizeBaseUrl(value: string): string {
	return value.trim().replace(/\/+$/, "");
}

/**
 * API呼び出しタイムアウト値を環境変数から取得する。
 */
function readTimeoutMs(): number {
	const raw = process.env.NOTIFICATION_API_TIMEOUT_MS?.trim();
	if (!raw) {
		return DEFAULT_TIMEOUT_MS;
	}
	return parsePositiveInt(raw, "NOTIFICATION_API_TIMEOUT_MS");
}

/**
 * 内部通知APIへ再送リクエストを送り、結果を標準出力へ表示する。
 */
async function runResend(command: NotificationApiCommand) {
	const baseUrl = normalizeBaseUrl(readApiBaseUrl());
	const token = readRequiredEnv("NOTIFICATION_INTERNAL_TOKEN");
	const endpoint = `${baseUrl}/api/internal/notifications/resend`;
	const timeoutMs = readTimeoutMs();
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const response = await fetch(endpoint, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				targetType: command.targetType,
				targetId: command.targetId,
			}),
			signal: controller.signal,
		});

		if (!response.ok) {
			const body = await response.text();
			console.error(
				`notification api failed: status=${response.status}, endpoint=${endpoint}, body=${body}`,
			);
			process.exitCode = 1;
			return;
		}

		const result = (await response.json()) as ResendResponse;
		if (result.sent) {
			console.log(
				`resend completed: sent=true, targetType=${result.targetType}, targetId=${result.targetId}`,
			);
			return;
		}

		console.error(
			`resend completed: sent=false, targetType=${result.targetType}, targetId=${result.targetId}, reason=${result.reason}`,
		);
		process.exitCode = 1;
	} catch (error) {
		if (error instanceof DOMException && error.name === "AbortError") {
			console.error(`notification api timeout: timeoutMs=${timeoutMs}, endpoint=${endpoint}`);
			process.exitCode = 1;
			return;
		}

		const message = error instanceof Error ? error.message : String(error);
		console.error(`notification api request failed: ${message}`);
		process.exitCode = 1;
	} finally {
		clearTimeout(timeoutId);
	}
}

/**
 * エントリーポイント。引数解析とAPI実行を行う。
 */
async function main() {
	try {
		loadDevVarsFile();
		const command = parseCommand(process.argv.slice(2));
		await runResend(command);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(`❌ ${message}`);
		printUsage();
		process.exit(1);
	}
}

void main();
