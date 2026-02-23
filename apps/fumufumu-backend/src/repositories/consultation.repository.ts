import { consultations } from "@/db/schema/consultations";
import { users } from "@/db/schema/user";
import { consultationTaggings, tags } from "@/db/schema/tags";
import type { DbInstance } from "@/index";
import { eq, and, isNull, isNotNull, inArray, type SQL, sql } from "drizzle-orm";
import type { ConsultationFilters, PaginationParams } from "@/types/consultation.types";
import { PAGINATION_CONFIG } from "@/types/consultation.types";
import { DatabaseError, ConflictError, NotFoundError } from "@/errors/AppError";
import { advices } from "@/db/schema/advices";
import { number } from "zod";


export class ConsultationRepository {
	constructor(private db: DbInstance) {}

	private async insertConsultation(data: {
		title: string;
		body: string;
		draft: boolean;
		authorId: number;
	}) {
		const [inserted] = await this.db
			.insert(consultations)
			.values({
				title: data.title,
				body: data.body,
				draft: data.draft,
				authorId: data.authorId,
			})
			.returning();

		if (!inserted) {
			throw new DatabaseError("相談の作成に失敗しました: insert操作がデータを返しませんでした");
		}

		return inserted;
	}

	private async validateAndInsertTaggings(consultationId: number, tagIds: number[]) {
		const uniqueTagIds = await this.validateTagIdsExist(tagIds);
		if (uniqueTagIds.length === 0) return;

		await this.db.insert(consultationTaggings).values(
			uniqueTagIds.map((tagId) => ({ consultationId, tagId })),
		);
	}

	async validateTagIdsExist(tagIds: number[]): Promise<number[]> {
		const uniqueTagIds = [...new Set(tagIds)];
		if (uniqueTagIds.length === 0) return uniqueTagIds;

		const existingTags = await this.db
			.select({ id: tags.id })
			.from(tags)
			.where(inArray(tags.id, uniqueTagIds));

		const existingTagIdSet = new Set(existingTags.map((tag) => tag.id));
		const missingTagIds = uniqueTagIds.filter((tagId) => !existingTagIdSet.has(tagId));

		if (missingTagIds.length > 0) {
			throw new ConflictError(`存在しないタグIDが含まれています: ${missingTagIds.join(", ")}`);
		}

		return uniqueTagIds;
	}

	private async findAuthorOrThrow(authorId: number) {
		const author = await this.db.query.users.findFirst({
			where: eq(users.id, authorId),
		});

		if (!author) {
			throw new NotFoundError(`指定されたユーザーが見つかりません: authorId=${authorId}`);
		}

		return author;
	}

	private async findVisibleConsultationOrThrow(consultationId: number) {
		const consultation = await this.db.query.consultations.findFirst({
			columns: { id: true },
			where: and(
				eq(consultations.id, consultationId),
				isNull(consultations.hiddenAt),
			),
		});

		if (!consultation) {
			throw new NotFoundError(`指定された相談(ID:${consultationId})は見つかりませんでした`);
		}

		return consultation;
	}

	/**
	 * フィルタ条件からWHERE句を構築する（findAll / count 共通）
	 */
	private buildWhereConditions(filters?: ConsultationFilters): SQL | undefined {
		const conditions: SQL[] = [];

		// NOTE: デフォルトで非表示(hiddenAt)の相談は除外する
        conditions.push(isNull(consultations.hiddenAt));

		if (filters?.userId !== undefined) {
            conditions.push(eq(consultations.authorId, filters.userId));
        }

		if (filters?.draft !== undefined) {
			conditions.push(eq(consultations.draft, filters.draft));
		}

		if (filters?.solved !== undefined) {
			conditions.push(
				filters.solved
					? isNotNull(consultations.solvedAt)
					: isNull(consultations.solvedAt)
			);
		}

		return conditions.length > 0 ? and(...conditions) : undefined;
	}

	async findFirstById(id: number) {
		const consultation = await this.db.query.consultations.findFirst({
			where: eq(consultations.id, id),
			with: {
				author: true,
				advices: {
					with: {
						author: true,
					},
					where: (advices, { and, eq, isNull }) => and(
                        eq(advices.draft, false),  // 下書きでない
                        isNull(advices.hiddenAt)    // 非表示でない
                    ),
					// 作成日時の古い順（昇順）
					orderBy: (advices, { asc }) => [asc(advices.createdAt)],
				},
			},
		});

		if (!consultation) {
			throw new NotFoundError(`相談が見つかりません: id=${id}`);
		}

		return consultation;
	}

	/**
	 * 相談一覧を取得する（RQB使用）
	 * 
	 * @param filters - フィルタ条件（オプショナル）
	 * @param filters.userId - 著者IDで絞り込み
	 * @param filters.draft - 下書き状態で絞り込み（true: 下書きのみ, false: 公開済みのみ）
	 * @param filters.solved - 解決状態で絞り込み（true: 解決済みのみ, false: 未解決のみ）
	 * @returns 相談データと著者情報の配列（authorは退会済みの場合null）
	 * @throws {Error} データベースクエリ実行エラー（上位層で処理）
	 */
	async findAll(filters?: ConsultationFilters, pagination?: PaginationParams) {
		const { page = PAGINATION_CONFIG.DEFAULT_PAGE, limit = PAGINATION_CONFIG.DEFAULT_LIMIT } = pagination || {};
		const offset = (page - 1) * limit;

		return await this.db.query.consultations.findMany({
			where: this.buildWhereConditions(filters),
			orderBy: (fields, { desc }) => [desc(fields.createdAt)],
			limit: limit,
			offset: offset,
			with: {
				author: true,
			},
		});
	}

	/**
	 * 相談の総件数を取得する（フィルタ適用後）
	 * @param filters - フィルタ条件（オプショナル）
	 * @returns 相談の総件数
	 */
	async count(filters?: ConsultationFilters): Promise<number> {
		// NOTE: DrizzleのRQBには専用のcount()メソッドが存在しないため、
		// Core APIを使用してCOUNT(*)クエリを実行しています。
		// この方法が最もパフォーマンスが良く、Drizzle公式の推奨パターンです。
		const result = await this.db
		.select({ count: sql<number>`count(*)` })
		.from(consultations)
		.where(this.buildWhereConditions(filters));
	
		return result[0]?.count || 0;
	}

	/**
	 * 相談を新規作成する
	 * 
	 * @param data - 作成する相談データ
	 * @param data.title - 相談タイトル
	 * @param data.body - 相談本文
	 * @param data.draft - 下書きフラグ（true: 下書き, false: 公開）
	 * @param data.authorId - 投稿者ID（認証ユーザー）
	 * @returns 作成された相談データ（authorリレーション含む）
	 * @throws {Error} データベースエラー、作成失敗時
	 */
	async create(data: {
		title: string;
		body: string;
		draft: boolean;
		authorId: number;
	}) {
		try {
			const inserted = await this.insertConsultation(data);
			const author = await this.findAuthorOrThrow(data.authorId);
			return {
				...inserted,
				author,
			};
		} catch (error) {
			// AppErrorの場合はそのまま再スロー
			if (error instanceof DatabaseError || error instanceof NotFoundError || error instanceof ConflictError) {
				throw error;
			}

			// D1/Drizzleのエラーを処理
			const errorMessage = (error as Error).message || String(error);
			
			// UNIQUE制約違反
			if (errorMessage.includes('UNIQUE constraint failed')) {
				throw new ConflictError("同じデータが既に存在します");
			}
			
			// FOREIGN KEY制約違反
			if (errorMessage.includes('FOREIGN KEY constraint failed')) {
				throw new ConflictError("指定されたユーザーが存在しません");
			}

			// その他のデータベースエラー
			throw new DatabaseError(`データベースエラーが発生しました: ${errorMessage}`);
		}
	}

	async attachTags(consultationId: number, tagIds: number[]) {
		try {
			await this.validateAndInsertTaggings(consultationId, tagIds);
		} catch (error) {
			if (error instanceof DatabaseError || error instanceof NotFoundError || error instanceof ConflictError) {
				throw error;
			}

			const errorMessage = (error as Error).message || String(error);
			if (errorMessage.includes("UNIQUE constraint failed")) {
				throw new ConflictError("同じタグ付けが既に存在します");
			}

			if (errorMessage.includes("FOREIGN KEY constraint failed")) {
				throw new ConflictError("指定されたタグまたは相談が存在しません");
			}

			throw new DatabaseError(`タグ付け処理でデータベースエラーが発生しました: ${errorMessage}`);
		}
	}

	async replaceTags(consultationId: number, tagIds: number[]) {
		try {
			// 入れ替え前にタグ存在チェックを先に実施して、無効IDで既存タグを消さない
			const uniqueTagIds = [...new Set(tagIds)];
			if (uniqueTagIds.length > 0) {
				const existingTags = await this.db
					.select({ id: tags.id })
					.from(tags)
					.where(inArray(tags.id, uniqueTagIds));

				const existingTagIdSet = new Set(existingTags.map((tag) => tag.id));
				const missingTagIds = uniqueTagIds.filter((tagId) => !existingTagIdSet.has(tagId));
				if (missingTagIds.length > 0) {
					throw new ConflictError(`存在しないタグIDが含まれています: ${missingTagIds.join(", ")}`);
				}
			}

			await this.db
				.delete(consultationTaggings)
				.where(eq(consultationTaggings.consultationId, consultationId));

			if (uniqueTagIds.length > 0) {
				await this.db.insert(consultationTaggings).values(
					uniqueTagIds.map((tagId) => ({ consultationId, tagId })),
				);
			}
		} catch (error) {
			if (error instanceof DatabaseError || error instanceof ConflictError) {
				throw error;
			}

			const errorMessage = (error as Error).message || String(error);
			if (errorMessage.includes("UNIQUE constraint failed")) {
				throw new ConflictError("同じタグ付けが既に存在します");
			}

			if (errorMessage.includes("FOREIGN KEY constraint failed")) {
				throw new ConflictError("指定されたタグまたは相談が存在しません");
			}

			throw new DatabaseError(`タグ更新処理でデータベースエラーが発生しました: ${errorMessage}`);
		}
	}

	async deleteById(id: number) {
		await this.db.delete(consultations).where(eq(consultations.id, id));
	}

	/**
	 * 相談を更新する
	 * @param data - 更新する相談データ
	 * @param data.id - 更新する相談ID
	 * @param data.title - 相談タイトル
	 * @param data.body - 相談本文
	 * @param data.draft - 下書きフラグ（true: 下書き, false: 公開）
	 * @returns 更新された相談データ
	 * @throws {Error} データベースエラー、更新失敗時
	 */
	async update(data:
	{
		id: number;
		title: string;
		body: string;
		draft: boolean;
		authorId: number;
		tagIds?: number[];
		}) {
			try {
				let uniqueTagIds: number[] | undefined;
				if (data.tagIds !== undefined) {
					// 先にタグ存在チェックを行い、無効IDでは更新自体を実行しない
					uniqueTagIds = [...new Set(data.tagIds)];
				}

				if (uniqueTagIds && uniqueTagIds.length > 0) {
					const existingTags = await this.db
						.select({ id: tags.id })
						.from(tags)
						.where(inArray(tags.id, uniqueTagIds));

					const existingTagIdSet = new Set(existingTags.map((tag) => tag.id));
					const missingTagIds = uniqueTagIds.filter((tagId) => !existingTagIdSet.has(tagId));
					if (missingTagIds.length > 0) {
						throw new ConflictError(`存在しないタグIDが含まれています: ${missingTagIds.join(", ")}`);
					}
				}

				const updateQuery = this.db
					.update(consultations)
					.set({
						title: data.title,
						body: data.body,
						draft: data.draft,
					})
					.where(
						and(
							eq(consultations.id, data.id),
							eq(consultations.authorId, data.authorId),
						)
					)
					.returning();

				if (data.tagIds === undefined) {
					const [updated] = await updateQuery;

					if (!updated) {
						throw new DatabaseError(`相談の更新に失敗しました: id=${data.id}`);
					}

					return updated;
				}

				const deleteTaggingsQuery = this.db
					.delete(consultationTaggings)
					.where(eq(consultationTaggings.consultationId, data.id));

				const insertTaggingsQuery = uniqueTagIds && uniqueTagIds.length > 0
					? this.db.insert(consultationTaggings).values(
						uniqueTagIds.map((tagId) => ({ consultationId: data.id, tagId })),
					)
					: null;

				// 相談更新とタグ差し替えを同一バッチで実行し、途中失敗時の部分更新を防ぐ
				const statements = insertTaggingsQuery
					? [updateQuery, deleteTaggingsQuery, insertTaggingsQuery] as const
					: [updateQuery, deleteTaggingsQuery] as const;
				const [updateResult] = await this.db.batch(statements);

				const [updated] = updateResult;
				if (!updated) {
					throw new DatabaseError(`相談の更新に失敗しました: id=${data.id}`);
				}

				return updated;
			} catch (error) {
				if (error instanceof DatabaseError || error instanceof ConflictError) {
					throw error;
				}

				const errorMessage = (error as Error).message || String(error);
				if (errorMessage.includes("UNIQUE constraint failed")) {
					throw new ConflictError("同じタグ付けが既に存在します");
				}

				if (errorMessage.includes("FOREIGN KEY constraint failed")) {
					throw new ConflictError("指定されたタグまたは相談が存在しません");
				}

				throw new DatabaseError(`相談更新処理でデータベースエラーが発生しました: ${errorMessage}`);
			}
	}

	/**
	 * 
	 * @param data - 作成する相談回答データ
	 * @param data.consultationId - 相談ID
	 * @param data.authorId - 回答者ID
	 * @param data.body - 回答本文
	 * @param data.draft - 下書きフラグ（true: 下書き, false: 公開）
	 * @returns 作成された相談回答データ（authorリレーション含む）
	 * @throws {Error} データベースエラー、作成失敗時
	 */
		async createAdvice(data: {
			consultationId: number;
			authorId: number;
			body: string;
			draft: boolean;
		}) {
		try {
			if (!data.draft) {
				await this.findVisibleConsultationOrThrow(data.consultationId);
			}

			const insertQuery = this.db
				.insert(advices)
				.values({
					body: data.body,
					authorId: data.authorId,
					draft: data.draft,
					consultationId: data.consultationId,
				})
				.returning();

			let insertedAdvice;

			if (data.draft) {
				// 下書きの時は親の相談更新日時は更新しない
				[insertedAdvice] = await insertQuery;
			} else {
				const [insertResult, updateResult] = await this.db.batch([
					insertQuery, // 定義済みの変数を再利用
					this.db
						.update(consultations)
						.set({ updatedAt: new Date() })
						.where(and(eq(consultations.id, data.consultationId), isNull(consultations.hiddenAt)))
						.returning({ id: consultations.id }),
				]);

				// 親が見つからない（または非表示）のチェック
				if (updateResult.length === 0) {
					throw new NotFoundError(`指定された相談(ID:${data.consultationId})は見つかりませんでした`);
				}
				insertedAdvice = insertResult[0];
			}

			if (!insertedAdvice) {
				throw new DatabaseError("相談回答の作成に失敗しました");
			}

			const author = await this.db.query.users.findFirst({
				where: eq(users.id, data.authorId),
			});
			if (!author) {
				throw new NotFoundError("指定されたユーザーが見つかりません");
			}

			return {
				...insertedAdvice,
				author,
			};
		} catch (error) {
			const errorString = error instanceof Error
				? `${error.message} ${String(error.cause)}`
				: String(error);

			if (errorString.includes("FOREIGN KEY constraint failed")) {
				throw new NotFoundError(`指定された相談(ID:${data.consultationId})は見つかりませんでした`);
			}

			if (error instanceof DatabaseError || error instanceof NotFoundError) {
				throw error;
			}

			throw new DatabaseError(`データベースエラーが発生しました: ${errorString}`);
		}
	}

	/**
	 * アドバイスの下書きを更新する
	 * 
	 * @param data - 更新する相談回答データ
	 * @param data.consultationId - 相談ID
	 * @param data.authorId - 回答者ID
	 * @param data.body - 回答本文
	 * @param data.draft - 下書きフラグ（true: 下書き, false: 公開）
	 * @returns 更新された相談回答データ
	 */
	async updateDraftAdvice(data: {
		consultationId: number;
		authorId: number;
		body: string;
		draft: boolean;
	}) {
		const [updated] = await this.db.update(advices)
			.set({
				body: data.body,
				draft: data.draft,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(advices.consultationId, data.consultationId),
					eq(advices.authorId, data.authorId),
				)
			)
			.returning();
		if (!updated) {
			throw new NotFoundError(`指定された相談回答(consultationId:${data.consultationId}, authorId:${data.authorId})は見つかりませんでした`);
		}

		return updated;
	}

	async findFirstAdviceByConsultation(consultationId: number, authorId: number) {
		const advice = await this.db.query.advices.findFirst({
			where: and(eq(advices.consultationId, consultationId), eq(advices.authorId, authorId)),
		});
		if (!advice) {
			throw new NotFoundError(`指定された相談回答(consultationId:${consultationId}, authorId:${authorId})は見つかりませんでした`);
		}
		return advice;
	}
}
