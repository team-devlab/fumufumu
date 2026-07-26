// Data層: ユーザーデータアクセス
import { authMappings, users } from "@/db/schema/user";
import type { DbInstance } from "@/index";
import { and, eq, inArray, isNull, ne, or } from "drizzle-orm";
import { NotFoundError } from "@/errors/AppError";
import {
	authUsers,
	authSessions,
	authAccounts,
	authVerifications,
} from "@/db/schema/auth";
import { consultations } from "@/db/schema/consultations";
import { advices } from "@/db/schema/advices";
import { contentChecks } from "@/db/schema/content-checks";

/**
 * 退会時の投稿の扱いを分類した結果（退会プレビューと退会本処理で共有する単一の真実源）。
 * id 群は本処理の db.batch が使い、counts はプレビュー表示が使う。
 */
export type WithdrawalContentPlan = {
	deleteConsultationIds: number[];
	anonymizeConsultationIds: number[];
	deleteAdviceIds: number[];
	anonymizeAdviceIds: number[];
	// 削除される相談に載る全アドバイス（他者含む・cascade で消える）の id。content_checks 明示削除用。
	contentCheckAdviceIds: number[];
	counts: {
		delete: { consultations: number; advices: number; total: number };
		anonymize: { consultations: number; advices: number; total: number };
	};
};

export class UserRepository {
	constructor(private db: DbInstance) {}

	/**
	 * IDでユーザーを取得する
	 * 
	 * @param id - ユーザーID
	 * @returns ユーザー情報
	 * @throws {NotFoundError} ユーザーが見つからない場合
	 */
	async findFirstById(id: number) {
		const user = await this.db.query.users.findFirst({
			where: eq(users.id, id),
			columns: {
				id: true,
				name: true,
				disabled: true,
				role: true,
				createdAt: true,
				updatedAt: true,
			},
		});

		if (!user) {
			throw new NotFoundError(`ユーザーが見つかりません: id=${id}`);
		}

		return user;
	}

	/**
	 * 通知送信に必要な宛先情報（メールアドレス・表示名）を取得する
	 *
	 * @param appUserId - 業務DBのユーザーID (users.id)
	 * @returns 宛先情報
	 * @throws {NotFoundError} 宛先情報が見つからない場合
	 */
	async findNotificationRecipientByAppUserId(
		appUserId: number,
	): Promise<{ email: string; name: string }> {
		const [row] = await this.db
			.select({
				email: authUsers.email,
				name: users.name,
			})
			.from(authMappings)
			.innerJoin(authUsers, eq(authMappings.authUserId, authUsers.id))
			.innerJoin(users, eq(authMappings.appUserId, users.id))
			.where(eq(authMappings.appUserId, appUserId))
			.limit(1);

		if (!row?.email || !row?.name) {
			throw new NotFoundError(
				`通知先情報の取得に失敗しました: appUserId=${appUserId}`,
			);
		}

		return {
			email: row.email,
			name: row.name,
		};
	}

	/**
	 * 退会に必要な本人の認証側情報（authUserId・登録メール）を appUserId から引く。
	 *
	 * @throws {NotFoundError} 対応表・認証ユーザーが見つからない場合
	 */
	async getWithdrawalIdentity(
		appUserId: number,
	): Promise<{ authUserId: string; email: string }> {
		const [row] = await this.db
			.select({
				authUserId: authMappings.authUserId,
				email: authUsers.email,
			})
			.from(authMappings)
			.innerJoin(authUsers, eq(authMappings.authUserId, authUsers.id))
			.where(eq(authMappings.appUserId, appUserId))
			.limit(1);

		if (!row) {
			throw new NotFoundError(
				`退会対象のユーザーが見つかりません: appUserId=${appUserId}`,
			);
		}

		return row;
	}

	/**
	 * 退会時の投稿の扱いを分類する（ADR 013 §4.3 の非対称モデル）。
	 *
	 * 相談: 下書き・回答0の公開相談は削除、回答ありの公開相談は authorId を null 化。
	 * アドバイス: 本人の下書きは削除、公開は「残る相談上」なら null 化（消える相談上のものは相談削除で cascade）。
	 *
	 * 「回答あり」= その公開相談に、公開表示される他者の回答が1件以上あること:
	 *   公開表示 = content_check が approved、または旧データでチェック無し（一覧の公開可視ルールと同じ）。
	 *   他者の回答 = 非下書き・非hidden・authorId が本人以外（authorId が null＝既に退会した人の回答は他者として数える）。
	 *   → pending/rejected（未公開）だけの相談は「回答なし」として削除側になる。
	 */
	async getWithdrawalContentPlan(appUserId: number): Promise<WithdrawalContentPlan> {
		const ownConsultations = await this.db
			.select({ id: consultations.id, draft: consultations.draft })
			.from(consultations)
			.where(eq(consultations.authorId, appUserId));

		const draftConsultationIds = ownConsultations.filter((c) => c.draft).map((c) => c.id);
		const publishedConsultationIds = ownConsultations.filter((c) => !c.draft).map((c) => c.id);

		let answeredConsultationIds: number[] = [];
		if (publishedConsultationIds.length > 0) {
			const answered = await this.db
				.selectDistinct({ consultationId: advices.consultationId })
				.from(advices)
				.leftJoin(
					contentChecks,
					and(
						eq(contentChecks.targetType, "advice"),
						eq(contentChecks.targetId, advices.id),
					),
				)
				.where(
					and(
						inArray(advices.consultationId, publishedConsultationIds),
						eq(advices.draft, false),
						isNull(advices.hiddenAt),
						// 他者作（null=退会済みは他者として数える）
						or(isNull(advices.authorId), ne(advices.authorId, appUserId)),
						// 公開表示（approved または未チェック）。pending/rejected は除外。
						or(eq(contentChecks.status, "approved"), isNull(contentChecks.id)),
					),
				);
			answeredConsultationIds = answered.map((r) => r.consultationId);
		}
		const answeredSet = new Set(answeredConsultationIds);

		const anonymizeConsultationIds = publishedConsultationIds.filter((id) => answeredSet.has(id));
		const deleteConsultationIds = [
			...draftConsultationIds,
			...publishedConsultationIds.filter((id) => !answeredSet.has(id)),
		];
		const deleteConsultationSet = new Set(deleteConsultationIds);

		const ownAdvices = await this.db
			.select({
				id: advices.id,
				draft: advices.draft,
				consultationId: advices.consultationId,
			})
			.from(advices)
			.where(eq(advices.authorId, appUserId));

		const deleteAdviceIds = ownAdvices.filter((a) => a.draft).map((a) => a.id);
		const anonymizeAdviceIds = ownAdvices
			.filter((a) => !a.draft && !deleteConsultationSet.has(a.consultationId))
			.map((a) => a.id);
		// 消える相談に載る本人の公開アドバイスは cascade で消える。件数表示のため数える。
		const cascadeDeletedOwnAdviceCount = ownAdvices.filter(
			(a) => !a.draft && deleteConsultationSet.has(a.consultationId),
		).length;

		let contentCheckAdviceIds: number[] = [];
		if (deleteConsultationIds.length > 0) {
			const rows = await this.db
				.select({ id: advices.id })
				.from(advices)
				.where(inArray(advices.consultationId, deleteConsultationIds));
			contentCheckAdviceIds = rows.map((r) => r.id);
		}

		const consultationsDeleted = deleteConsultationIds.length;
		const consultationsAnonymized = anonymizeConsultationIds.length;
		const advicesDeleted = deleteAdviceIds.length + cascadeDeletedOwnAdviceCount;
		const advicesAnonymized = anonymizeAdviceIds.length;

		return {
			deleteConsultationIds,
			anonymizeConsultationIds,
			deleteAdviceIds,
			anonymizeAdviceIds,
			contentCheckAdviceIds,
			counts: {
				delete: {
					consultations: consultationsDeleted,
					advices: advicesDeleted,
					total: consultationsDeleted + advicesDeleted,
				},
				anonymize: {
					consultations: consultationsAnonymized,
					advices: advicesAnonymized,
					total: consultationsAnonymized + advicesAnonymized,
				},
			},
		};
	}

	/**
	 * 退会: 投稿の非対称処理と認証情報・PII・業務ユーザー行の削除を 1 つの db.batch で原子的に行う。
	 *
	 * - D1 は db.transaction() が使えないため db.batch を使う（原子的・途中失敗は全ロールバック）。ADR 013 §5.3。
	 * - 投稿は getWithdrawalContentPlan の分類に従う（下書き・回答0の相談を削除、回答ありの相談と本人の公開
	 *   アドバイスを null 化）。相談削除で advices/taggings は cascade されるが、content_checks は FK が無く
	 *   cascade されないため、削除される相談と cascade されるアドバイス分を明示削除して孤児化を防ぐ。
	 * - 認証側は子（セッション/アカウント/対応表）→親（users/auth_users）の順に削除。authorId の set null FK は
	 *   最終防御に残す（分類漏れがあっても users 削除時に匿名化側へ倒れ、消え過ぎない）。
	 * - moderation_actions.adminUserId は RESTRICT。実行者参照が残るユーザー（元管理者）は users 削除が失敗し
	 *   batch ごとロールバックする。現状は退会を管理者ロールに限り拒否して回避（Service 層。ADR 013 §6 の一時措置）。
	 */
	async deleteAccountAtomically(params: {
		appUserId: number;
		authUserId: string;
		email: string;
	}): Promise<void> {
		const { appUserId, authUserId, email } = params;
		const plan = await this.getWithdrawalContentPlan(appUserId);

		type BatchStatement = Parameters<DbInstance["batch"]>[0][number];
		const statements: BatchStatement[] = [];

		// 投稿（非対称処理）。空 id で inArray を撃たないよう、対象があるときだけ文を積む。
		if (plan.contentCheckAdviceIds.length > 0) {
			statements.push(
				this.db
					.delete(contentChecks)
					.where(
						and(
							eq(contentChecks.targetType, "advice"),
							inArray(contentChecks.targetId, plan.contentCheckAdviceIds),
						),
					),
			);
		}
		if (plan.deleteConsultationIds.length > 0) {
			statements.push(
				this.db
					.delete(contentChecks)
					.where(
						and(
							eq(contentChecks.targetType, "consultation"),
							inArray(contentChecks.targetId, plan.deleteConsultationIds),
						),
					),
			);
		}
		if (plan.deleteAdviceIds.length > 0) {
			statements.push(this.db.delete(advices).where(inArray(advices.id, plan.deleteAdviceIds)));
		}
		if (plan.anonymizeAdviceIds.length > 0) {
			statements.push(
				this.db.update(advices).set({ authorId: null }).where(inArray(advices.id, plan.anonymizeAdviceIds)),
			);
		}
		if (plan.deleteConsultationIds.length > 0) {
			statements.push(
				this.db.delete(consultations).where(inArray(consultations.id, plan.deleteConsultationIds)),
			);
		}
		if (plan.anonymizeConsultationIds.length > 0) {
			statements.push(
				this.db
					.update(consultations)
					.set({ authorId: null })
					.where(inArray(consultations.id, plan.anonymizeConsultationIds)),
			);
		}

		// 認証情報・PII・業務ユーザー行（PR1 と同じ。子→親の順）。
		statements.push(this.db.delete(authSessions).where(eq(authSessions.userId, authUserId)));
		statements.push(this.db.delete(authAccounts).where(eq(authAccounts.userId, authUserId)));
		statements.push(this.db.delete(authVerifications).where(eq(authVerifications.identifier, email)));
		statements.push(this.db.delete(authMappings).where(eq(authMappings.appUserId, appUserId)));
		statements.push(this.db.delete(users).where(eq(users.id, appUserId)));
		statements.push(this.db.delete(authUsers).where(eq(authUsers.id, authUserId)));

		await this.db.batch(statements as [BatchStatement, ...BatchStatement[]]);
	}

}
