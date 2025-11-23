// Presentation層: 相談関連ルート
import { Hono } from "hono";
import type { Context } from "hono";
import { ConsultationRepository } from "@/repositories/consultation.repository";
import { ConsultationService } from "@/services/consultation.service";

export const consultationsRoute = new Hono();

export const listConsultations = async (c: Context) => {
	// クエリパラメータを取得
	const userId = c.req.query("userId");
	const draft = c.req.query("draft");
	const solved = c.req.query("solved");

	// フィルタオブジェクトを構築
	const filters = {
		userId: userId ? Number(userId) : undefined,
		draft: draft !== undefined ? draft === "true" : undefined,
		solved: solved !== undefined ? solved === "true" : undefined,
	};

	const db = c.get("db");
	const repository = new ConsultationRepository(db);
	const service = new ConsultationService(repository);
	const result = await service.listConsultaitons(filters);
	return c.json(result);
};

// ルーティング登録
consultationsRoute.get("/", listConsultations);


