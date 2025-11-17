// Presentation層: 相談関連ルート
import { Hono } from "hono";
import type { Context } from "hono";
import { ConsultationRepository } from "@/repositories/consultation.repository";
import { ConsultationService } from "@/services/consultation.service";

export interface Env {
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
}

const app = new Hono<{ Bindings: Env }>()

/**
 * 相談一覧取得
 * GET /api/consultations
 *
 * 目的:
 * - 相談一覧を全件取得できる
 *
 * 処理内容:
 * 1. DBインスタンスを取得
 * 2. Repository・Serviceを生成
 * 3. ビジネスロジック実行
 * 4. JSONレスポンスで返す
 */
export const listConsultations = async (c: Context) => {
	const db = c.get("db");
	const repository = new ConsultationRepository(db);
	const service = new ConsultationService(repository);
	const result = await service.listConsultations();
	return c.json(result);
};

// ルーティング登録
app.get("/", listConsultations);


