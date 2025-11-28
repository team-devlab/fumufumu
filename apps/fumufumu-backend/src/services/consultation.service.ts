// Business層: 相談ビジネスロジック
import type { ConsultationRepository } from "@/repositories/consultation.repository";
import type { ConsultationFilters } from "@/types/consultation.types";
import type { ConsultationResponse, ConsultationListResponse } from "@/types/consultation.response";

export class ConsultationService {
	constructor(private repository: ConsultationRepository) {}

	async listConsultations(filters?: ConsultationFilters): Promise<ConsultationListResponse> {
		const consultationList = await this.repository.findAll(filters);

		const responses: ConsultationResponse[] = consultationList.map((consultation) => ({
			id: consultation.id,
			title: consultation.title,
			body_preview: consultation.body.substring(0, 100),
			draft: consultation.draft,
			hidden_at: consultation.hiddenAt?.toISOString() ?? null,
			solved_at: consultation.solvedAt?.toISOString() ?? null,
			created_at: consultation.createdAt.toISOString(),
			updated_at: consultation.updatedAt.toISOString(),
			author: consultation.author ? {
				id: consultation.author.id,
				name: consultation.author.name,
				disabled: consultation.author.disabled,
			} : null
		}));

		return { 
			meta: { 
				total: responses.length
			}, 
			data: responses
		};
	}
}

