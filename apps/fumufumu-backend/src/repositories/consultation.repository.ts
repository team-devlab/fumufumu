import { consultations } from "@/db/schema/consultations";
import { users } from "@/db/schema/user";
import type { DbInstance } from "@/index";
import { eq, and, isNull, isNotNull, type SQL } from "drizzle-orm";
import type { ConsultationFilters } from "@/types/consultation.types";

export class ConsultationRepository {
	constructor(private db: DbInstance) {}

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
	async findAll(filters?: ConsultationFilters) {
		const whereConditions: SQL[] = [];

		if (filters?.userId !== undefined) {
			whereConditions.push(eq(consultations.authorId, filters.userId));
		}

		if (filters?.draft !== undefined) {
			whereConditions.push(eq(consultations.draft, filters.draft));
		}

		if (filters?.solved !== undefined) {
			whereConditions.push(
				filters.solved
					? isNotNull(consultations.solvedAt)
					: isNull(consultations.solvedAt)
			);
		}

		return await this.db.query.consultations.findMany({
			where: whereConditions.length > 0 
				? and(...whereConditions) 
				: undefined,
			orderBy: (fields, { desc }) => [desc(fields.createdAt)],
			with: {
				author: true,
			},
		});
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
		// 1. 相談データをINSERT
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
			throw new Error("相談の作成に失敗しました: insert操作がデータを返しませんでした");
		}

		// 2. author情報を別クエリで取得
		const author = await this.db.query.users.findFirst({
			where: eq(users.id, data.authorId),
		});

		// 3. inserted データと author を合成して返す
		return {
			...inserted,
			author: author || null,
		};
	}
}

