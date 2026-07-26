import { env } from "cloudflare:test";
import { drizzle } from "drizzle-orm/d1";
import { beforeAll, describe, expect, it } from "vitest";
import * as advicesSchema from "@/db/schema/advices";
import * as authSchema from "@/db/schema/auth";
import * as consultationsSchema from "@/db/schema/consultations";
import * as contentChecksSchema from "@/db/schema/content-checks";
import * as moderationActionsSchema from "@/db/schema/moderation-actions";
import * as tagsSchema from "@/db/schema/tags";
import * as userSchema from "@/db/schema/user";
import { UserRepository } from "@/repositories/user.repository";
import { UserService } from "@/services/user.service";
import { ForbiddenError, NotFoundError, ValidationError } from "@/errors/AppError";
import { createAndLoginUser } from "./helpers/auth-helper";
import { setupIntegrationTest } from "./helpers/db-helper";

/**
 * 退会（アカウント削除・PII 消去）の Service / Repository 単体テスト。
 *
 * ここでは HTTP を介さず Service / Repository を直接呼び、退会の核となる挙動を検証する:
 * - 認証情報・PII・業務ユーザー行がすべて物理削除される（削除の網羅）
 * - type-to-confirm（登録メール一致）と管理者ロール拒否が削除前に効く（副作用ゼロ）
 * - 原子性: 途中で失敗しても db.batch が全ロールバックし、部分削除が起きない
 *
 * エンドポイント（認証・CSRF・cookie クリア・完全性）は別ファイルの API テストで扱う。
 */
describe("退会 Service / Repository 単体", () => {
	const schema = {
		...authSchema,
		...userSchema,
		...consultationsSchema,
		...advicesSchema,
		...tagsSchema,
		...contentChecksSchema,
		...moderationActionsSchema,
	};

	let repository: UserRepository;
	let service: UserService;

	const count = async (sql: string, ...binds: unknown[]): Promise<number> => {
		const row = (await env.DB.prepare(sql)
			.bind(...binds)
			.first()) as { c: number } | null;
		return Number(row?.c ?? 0);
	};

	// 当該ユーザーに紐づく認証/業務テーブルの残存行を数える。
	const countIdentityRows = async (user: {
		appUserId: number;
		authUserId: string;
		email: string;
	}) => ({
		users: await count("SELECT COUNT(*) AS c FROM users WHERE id = ?", user.appUserId),
		authMappings: await count(
			"SELECT COUNT(*) AS c FROM auth_mappings WHERE app_user_id = ?",
			user.appUserId,
		),
		authUsers: await count(
			"SELECT COUNT(*) AS c FROM auth_users WHERE id = ?",
			user.authUserId,
		),
		authSessions: await count(
			"SELECT COUNT(*) AS c FROM auth_sessions WHERE user_id = ?",
			user.authUserId,
		),
		authAccounts: await count(
			"SELECT COUNT(*) AS c FROM auth_accounts WHERE user_id = ?",
			user.authUserId,
		),
		authVerifications: await count(
			"SELECT COUNT(*) AS c FROM auth_verifications WHERE identifier = ?",
			user.email,
		),
	});

	beforeAll(async () => {
		await setupIntegrationTest();
		const db = drizzle(env.DB, { schema });
		repository = new UserRepository(db);
		service = new UserService(repository);
	});

	it("withdraw: 認証情報・PII・業務ユーザー行をすべて物理削除する", async () => {
		const user = await createAndLoginUser();

		const before = await countIdentityRows(user);
		expect(before.users).toBe(1);
		expect(before.authMappings).toBe(1);
		expect(before.authUsers).toBe(1);
		expect(before.authSessions).toBeGreaterThanOrEqual(1);
		expect(before.authAccounts).toBeGreaterThanOrEqual(1);

		await service.withdraw({
			appUserId: user.appUserId,
			role: "user",
			inputEmail: user.email,
		});

		const after = await countIdentityRows(user);
		expect(after.users).toBe(0);
		expect(after.authMappings).toBe(0);
		expect(after.authUsers).toBe(0);
		expect(after.authSessions).toBe(0);
		expect(after.authAccounts).toBe(0);
		expect(after.authVerifications).toBe(0);
	});

	it("withdraw: 入力メールが不一致なら ValidationError で何も削除しない", async () => {
		const user = await createAndLoginUser();

		await expect(
			service.withdraw({
				appUserId: user.appUserId,
				role: "user",
				inputEmail: `wrong-${user.email}`,
			}),
		).rejects.toBeInstanceOf(ValidationError);

		// 不一致時は削除前に弾くため、本人の行はそのまま残る。
		const after = await countIdentityRows(user);
		expect(after.users).toBe(1);
		expect(after.authUsers).toBe(1);
		expect(after.authMappings).toBe(1);
	});

	it("withdraw: 管理者ロールは ForbiddenError で拒否し、何も削除しない", async () => {
		const admin = await createAndLoginUser({ role: "admin" });

		await expect(
			service.withdraw({
				appUserId: admin.appUserId,
				role: "admin",
				inputEmail: admin.email,
			}),
		).rejects.toBeInstanceOf(ForbiddenError);

		const after = await countIdentityRows(admin);
		expect(after.users).toBe(1);
		expect(after.authUsers).toBe(1);
	});

	it("withdraw: メール照合は大文字小文字を区別しない（確認入力の取りこぼし防止）", async () => {
		const user = await createAndLoginUser();

		await service.withdraw({
			appUserId: user.appUserId,
			role: "user",
			inputEmail: user.email.toUpperCase(),
		});

		const after = await countIdentityRows(user);
		expect(after.users).toBe(0);
		expect(after.authUsers).toBe(0);
	});

	it("原子性: 途中で FK 制約に阻まれると全ロールバックし、部分削除が起きない", async () => {
		// 管理者経験者のように moderation_actions.admin_user_id から参照されるユーザーは、
		// users 行の削除が RESTRICT で失敗する。db.batch が全ロールバックし、
		// 認証側の PII も含めて 1 行も消えないこと（部分削除ゼロ）を検証する。
		const user = await createAndLoginUser();
		await env.DB.prepare(
			"INSERT INTO moderation_actions (target_type, target_id, action, admin_user_id) VALUES (?, ?, ?, ?)",
		)
			.bind("consultation", 1, "hide", user.appUserId)
			.run();

		const identity = await repository.getWithdrawalIdentity(user.appUserId);

		// Repository を直接呼び、Service の管理者拒否をすり抜けても原子性が守られることを見る。
		await expect(
			repository.deleteAccountAtomically({
				appUserId: user.appUserId,
				authUserId: identity.authUserId,
				email: identity.email,
			}),
		).rejects.toBeTruthy();

		const after = await countIdentityRows(user);
		expect(after.users).toBe(1);
		expect(after.authUsers).toBe(1);
		expect(after.authMappings).toBe(1);
		expect(after.authSessions).toBeGreaterThanOrEqual(1);
		expect(after.authAccounts).toBeGreaterThanOrEqual(1);
	});

	it("getWithdrawalIdentity: 本人の authUserId・登録メールを返す", async () => {
		const user = await createAndLoginUser();

		const identity = await repository.getWithdrawalIdentity(user.appUserId);
		expect(identity.authUserId).toBe(user.authUserId);
		expect(identity.email).toBe(user.email);
	});

	it("getWithdrawalIdentity: 存在しない appUserId は NotFoundError", async () => {
		await expect(
			repository.getWithdrawalIdentity(999_999_999),
		).rejects.toBeInstanceOf(NotFoundError);
	});
});
